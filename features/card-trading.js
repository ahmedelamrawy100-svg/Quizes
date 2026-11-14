/* ═══════════════════════════════════════════════════════════════════
   🔄 CARD & ASSET TRADING — غرفة تبادل حية (ستايل Brawl Stars)
   ═══════════════════════════════════════════════════════════════════
   الفلو:
   1) تكتب اسم صاحبك → "ابدأ" → الغرفة تفتح فاضية (زي اللعبة)
   2) كل طرف يملا عرضه هو من زرار "+" (مودال اختيار من أصوله هو)
      — الشاشة مفيهاش غير اللي اتعلّم عليه، مش المخزون الكامل
   3) Accept من الطرفين → عدّاد 5 ثواني (للتراجع لو حد قبل بالغلط)
   4) Cancel من أي حد في أي وقت قبل التنفيذ → التبادل يتلغى للطرفين
   5) خلص العدّاد → التبادل ينفذ 🎉
   - كل تعديل يظهر للطرف التاني لحظياً (Firebase live)
   - العروض مش بتنتهي

   المسارات في الداتابيز:
   - card_trades/{tradeId} = {
       from, to,
       fromOffer: { cards, items, coins, themes },  ← اللي from علّم عليه (بيتحدث لحظياً)
       toOffer:   { cards, items, coins, themes },  ← اللي to علّم عليه (بيتحدث لحظياً)
       accFrom: bool, accTo: bool,                  ← Accept لكل طرف
       status: 'pending'|'accepted'|'cancelled', createdAt, respondedAt }
   ⚠️ RTDB بيمسح العناصر الفاضية — دايماً || {} / || []
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, push, onValue, currentUser, isLoggedIn, showToast, escapeHtml, openModal } from '../firebase-shared.js';
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { cardById, cardName as cardNameBase } from './cards-data.js';

const FINAL_COUNTDOWN = 5;      // ثواني بين موافقة الطرفين والتنفيذ
let lang = localStorage.getItem('lang') || 'ar';

const cardName = (c) => cardNameBase(c, lang);

/* كتالوج المساعدات (زي shop.html) */
const ITEMS = [
    { id: 'fifty',         icon: '🎲', name_ar: '50/50',        name_en: '50/50' },
    { id: 'shield',        icon: '🛡️', name_ar: 'درع',          name_en: 'Shield' },
    { id: 'freeze10',      icon: '❄️', name_ar: 'تجميد 10ث',    name_en: 'Freeze 10s' },
    { id: 'add30',         icon: '⏱️', name_ar: '+30ث',         name_en: '+30s' },
    { id: 'box_gold',      icon: '🟡', name_ar: 'صندوق ذهبي',   name_en: 'Gold Box' },
    { id: 'box_legendary', icon: '🔴', name_ar: 'صندوق أسطوري', name_en: 'Legendary Box' }
];
const itemName = (id) => {
    const it = ITEMS.find(x => x.id === id);
    return it ? (lang === 'ar' ? `${it.icon} ${it.name_ar}` : `${it.icon} ${it.name_en}`) : id;
};

/* كتالوج الثيمات (زي profile-themes.js) — الافتراضي مينفعش يتبادل */
const THEMES = [
    { id: 'neon',      icon: '💠', name_ar: 'نيون',    name_en: 'Neon' },
    { id: 'gold',      icon: '👑', name_ar: 'ذهبي',    name_en: 'Gold' },
    { id: 'ocean',     icon: '🌊', name_ar: 'محيط',    name_en: 'Ocean' },
    { id: 'forest',    icon: '🌲', name_ar: 'غابة',    name_en: 'Forest' },
    { id: 'sunset',    icon: '🌅', name_ar: 'غروب',    name_en: 'Sunset' },
    { id: 'blood',     icon: '🩸', name_ar: 'دم',      name_en: 'Blood' },
    { id: 'galaxy',    icon: '🌌', name_ar: 'مجرة',    name_en: 'Galaxy' },
    { id: 'legendary', icon: '💎', name_ar: 'أسطوري',  name_en: 'Legendary' }
];
const themeName = (id) => {
    const th = THEMES.find(x => x.id === id);
    return th ? (lang === 'ar' ? `${th.icon} ${th.name_ar}` : `${th.icon} ${th.name_en}`) : id;
};

// ═══════════════════════════════════════════════════════════════════
// 1. الترجمة (i18n)
// ═══════════════════════════════════════════════════════════════════
const T = {
    ar: {
        friendLabel: "🔄 ابدأ تبادل مع صاحبك", friendPh: "مثال: ahmed1",
        startBtn: "🚀 ابدأ",
        myOffer: "🎬 عرضك", hisOffer: "🎬 عرضه",
        pickHint: "دوس على أي حاجة تختارها — دوسة تانية عليها تحدد الكمية",
        editHint: "دوس على أي حاجة تعدل كميتها أو تشيلها",
        coinsPh: "0", coinsUnit: "كوينز",
        incoming: "📥 تبادلاتك النشطة",
        openBtn: "افتح", closeBtn: "تمام", backBtn: "⬅ رجوع",
        noneActive: "مفيش تبادلات نشطة — ابدأ واحد من فوق ⬆",
        noLogin: "سجل دخول الأول 🪙", noFriend: "اكتب اسم صاحبك الأول",
        selfTrade: "مينفعش تعمل تبادل مع نفسك 😅", friendNotFound: "❌ اللاعب ده مش موجود",
        myEmpty: "فضي — دوس + واختار",
        needSomething: "اختار حاجة واحدة على الأقل في عرضك الأول",
        emptyTrade: "مفيش حاجة تتتبادل!",
        qtyAll: "الكل",
        notOwned: "مش مملوكك أو مش متاح", startedOk: "✅ الغرفة جاهزة — اختار من + وابعت له!",
        acceptedToast: "🎉 التبادل تم بنجاح!", cancelledToast: "🗑️ التبادل اتلغى",
        stale: "⚠️ حصل تغيير في الملكية — التبادل اتلغى",
        themeOwnedMe: "⚠️ عندك الثيم ده أصلاً! مش هتنفع تستلمه",
        themeOwnedHim: "⚠️ صاحبك معاه الثيم ده أصلاً!",
        stWaitingHim: "⏳ في انتظاره...",
        listYou: "✅ انت وافقت", listHe: "✅ هو وافق", listTo: "📤 لـ", listHis: "عرضه:",
        stHeAccepted: "✅ هو وافق! دوس Accept",
        stCountdown: "🔥 التنفيذ خلال",
        stCountdownHint: "ثواني — لو وافقت بالغلط اعمل Cancel",
        stDone: "🎉 تم التبادل بنجاح!",
        stCancelled: "🗑️ التبادل اتلغى",
        acceptBtn: "Accept", cancelBtn: "Cancel",
        pickerTitle: "🧺 اختار من عندك", pickerCards: "🎴 كارتات", pickerItems: "🧰 مساعدات", pickerThemes: "🎨 ثيمات",
        pickerDone: "✅ تمام",
        qtyTitle: "🔢 الكمية", qtyMax: "الحد الأقصى", qtyRemove: "🗑️ شيله من العرض", qtyDone: "✅ تمام",
        notifNewTrade: "🔄 دعوة تبادل", notifNewTradeBody: "بدأ معك تبادل! افتح السوق وافتح الغرفة.",
        notifHeAccepted: "✅ Accepted", notifHeAcceptedBody: "وافق على التبادل! افتح الغرفة ودوس Accept.",
        notifDone: "🤝 تم التبادل!", notifDoneBody: "الاتنين وافقوا — كل الأصول اتبادلت!",
        notifCancelled: "🗑️ التبادل اتلغى", notifCancelledBody: "اتلغى التبادل."
    },
    en: {
        friendLabel: "🔄 Start a trade with a friend", friendPh: "e.g. ahmed1",
        startBtn: "🚀 Start",
        myOffer: "🎬 Your Offer", hisOffer: "🎬 Their Offer",
        pickHint: "Tap to pick — tap it again to set the quantity",
        editHint: "Tap any tile to change qty or remove it",
        coinsPh: "0", coinsUnit: "coins",
        incoming: "📥 Your active trades",
        openBtn: "Open", closeBtn: "Done", backBtn: "⬅ Back",
        noneActive: "No active trades — start one above ⬆",
        noLogin: "Please log in first 🪙", noFriend: "Enter your friend's name first",
        selfTrade: "You can't trade with yourself 😅", friendNotFound: "❌ Player not found",
        myEmpty: "Empty — tap + to pick",
        needSomething: "Pick at least one asset in your offer first",
        emptyTrade: "Nothing to trade!",
        qtyAll: "All",
        notOwned: "Not owned or unavailable", startedOk: "✅ Room ready — pick from + and send!",
        acceptedToast: "🎉 Trade completed!", cancelledToast: "🗑️ Trade cancelled",
        stale: "⚠️ Ownership changed — trade cancelled",
        themeOwnedMe: "⚠️ You already own this theme!",
        themeOwnedHim: "⚠️ Your friend already owns this theme!",
        stWaitingHim: "⏳ Waiting for him...",
        listYou: "✅ You accepted", listHe: "✅ He accepted", listTo: "📤 To", listHis: "His offer:",
        stHeAccepted: "✅ He accepted! Press Accept",
        stCountdown: "🔥 Executing in",
        stCountdownHint: "seconds — press Cancel if you accepted by mistake",
        stDone: "🎉 Trade completed!",
        stCancelled: "🗑️ Trade cancelled",
        acceptBtn: "Accept", cancelBtn: "Cancel",
        pickerTitle: "🧺 Pick from your assets", pickerCards: "🎴 Cards", pickerItems: "🧰 Power-ups", pickerThemes: "🎨 Themes",
        pickerDone: "✅ Done",
        qtyTitle: "🔢 Quantity", qtyMax: "Max", qtyRemove: "🗑️ Remove from offer", qtyDone: "✅ Done",
        notifNewTrade: "🔄 Trade invite", notifNewTradeBody: "started a trade with you! Open the market and open the room.",
        notifHeAccepted: "✅ Accepted", notifHeAcceptedBody: "accepted the trade! Open the room and press Accept.",
        notifDone: "🤝 Trade completed!", notifDoneBody: "Both accepted — all assets traded!",
        notifCancelled: "🗑️ Trade cancelled", notifCancelledBody: "The trade was cancelled."
    }
};
const t = () => T[lang] || T.ar;

// ═══════════════════════════════════════════════════════════════════
// 2. الحالة
// ═══════════════════════════════════════════════════════════════════
let allTrades = {};
let myAssets = {};        // أصولي أنا (اللي باختار منه في الـ +)
let pickedMine = emptyPick();  // عرضي الجاري تعديله (بيتحفظ في الداتابيز لحظياً)
let roomTarget = null;    // tradeId الغرفة المفتوحة
let execTimers = {};      // tradeId → timer التنفيذ بعد العدّاد
let countdownInt = null;  // interval رقم العدّاد
let tradesSubscribed = false;

function emptyPick() { return { cards: {}, items: {}, coins: 0, themes: [] }; }
function offerFromDb(o) {
    o = o || {};
    return { cards: { ...(o.cards || {}) }, items: { ...(o.items || {}) }, coins: Number(o.coins) || 0, themes: [...(o.themes || [])] };
}
function pickCount(p) {
    return Object.keys(p.cards || {}).length + Object.keys(p.items || {}).length
        + (p.themes || []).length + ((Number(p.coins) || 0) > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════════════════
// 3. الاشتراك الحي — أي تغيير يظهر للطرفين فوراً
// ═══════════════════════════════════════════════════════════════════
function subscribeTrades() {
    if (tradesSubscribed || !isLoggedIn()) return;
    tradesSubscribed = true;
    onValue(ref(db, 'card_trades'), snap => {
        allTrades = snap.val() || {};
        renderTrades();
        if (roomTarget) renderRoom(roomTarget);
    });
}

// ═══════════════════════════════════════════════════════════════════
// 4. بدء تبادل — بيفتح الغرفة فوراً (فاضية زي اللعبة)
// ═══════════════════════════════════════════════════════════════════
window._startTrade = async () => {
    if (!isLoggedIn()) return showToast(t().noLogin, 'error');
    const input = document.getElementById('tradeFriendInput');
    const name = (input.value || '').trim().toLowerCase();
    if (!name) return showToast(t().noFriend, 'error');
    if (name === currentUser) return showToast(t().selfTrade, 'error');

    const fSnap = await get(ref(db, `users_data/${name}`));
    if (!fSnap.exists()) return showToast(t().friendNotFound, 'error');

    const newRef = push(ref(db, 'card_trades'));
    const newTrade = {
        from: currentUser, to: name,
        fromOffer: emptyPick(),
        accFrom: false, accTo: false,
        status: 'pending', createdAt: Date.now()
    };
    await set(newRef, newTrade);
    if (window.triggerNotification) {
        window.triggerNotification(name, t().notifNewTrade, `${currentUser}: ${t().notifNewTradeBody}`, 'info');
    }
    showToast(t().startedOk, 'success');
    await loadMyAssets();
    pickedMine = emptyPick();
    roomTarget = newRef.key;
    allTrades[roomTarget] = newTrade; // نزرعها محلياً — onValue هيحدّثها خلال لحظات
    renderRoom(roomTarget);
    document.getElementById('tradeBuilder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

async function loadMyAssets() {
    const [myCards, myInv, myCoins, myThemes] = await Promise.all([
        get(ref(db, `users_data/${currentUser}/cards`)),
        get(ref(db, `users_data/${currentUser}/inventory`)),
        get(ref(db, `users_data/${currentUser}/coins`)),
        get(ref(db, `purchased_themes/${currentUser}`))
    ]);
    myAssets = { cards: myCards.val() || {}, items: myInv.val() || {}, coins: myCoins.val() || 0, themes: myThemes.val() || {} };
}

/* حفظ عرضي في الداتابيز — يظهر للطرف التاني لحظياً */
async function saveMyOffer() {
    if (!roomTarget) return;
    const tr = (allTrades || {})[roomTarget];
    if (!tr || tr.status !== 'pending') return;
    const field = tr.from === currentUser ? 'fromOffer' : 'toOffer';
    await update(ref(db, `card_trades/${roomTarget}`), { [field]: pickedMine });
}

// ═══════════════════════════════════════════════════════════════════
// 5. غرفة التبادل — فتح / إغلاق
// ═══════════════════════════════════════════════════════════════════
window._openRoom = async (tradeId) => {
    if (!isLoggedIn()) return showToast(t().noLogin, 'error');
    const tr = (allTrades || {})[tradeId];
    if (!tr || (tr.from !== currentUser && tr.to !== currentUser)) return;

    roomTarget = tradeId;
    pickedMine = offerFromDb(tr.from === currentUser ? tr.fromOffer : tr.toOffer);
    await loadMyAssets();
    lang = localStorage.getItem('lang') || 'ar';
    renderRoom(tradeId);
    document.getElementById('tradeBuilder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window._closeRoom = () => {
    roomTarget = null;
    pickedMine = emptyPick();
    clearCountdown();
    renderTradesListOnly();
};

function renderTradesListOnly() {
    const box = document.getElementById('tradeBuilder');
    if (box) box.innerHTML = '';
    renderTrades();
}

// ═══════════════════════════════════════════════════════════════════
// 6. تعديل عرضي داخل الغرفة — كل حاجة بتتحفظ لحظياً
// ═══════════════════════════════════════════════════════════════════
/* الكوينز — بنحفظ مع تأخير بسيط ومنع إعادة الرسم وانت بتكتب
   (كل حرف كان بيعمل re-render وبيضيّع التركيز على البوكس) */
let coinsSaveTimer = null;
let pendingRoomRender = null;
window._tradeCoins = (val) => {
    pickedMine.coins = Math.max(0, parseInt(val, 10) || 0);
    if (coinsSaveTimer) clearTimeout(coinsSaveTimer);
    coinsSaveTimer = setTimeout(() => { coinsSaveTimer = null; saveMyOffer(); }, 400);
};
window._tradeCoinsBlur = () => {
    if (coinsSaveTimer) { clearTimeout(coinsSaveTimer); coinsSaveTimer = null; }
    saveMyOffer();
    if (pendingRoomRender) { const id = pendingRoomRender; pendingRoomRender = null; renderRoom(id); }
};

/* دوس على تايلة في عرضي → عدّل الكمية أو شيلها
   fromPicker=true معناها اتفتح من جوه مودال الاختيار → نرجع له بعد الحفظ */
let qtyFromPicker = false;
window._editTile = (type, id, fromPicker) => {
    qtyFromPicker = !!fromPicker;
    const tr = (allTrades || {})[roomTarget];
    if (!tr || tr.status !== 'pending') return;
    const myAcc = tr.from === currentUser ? !!tr.accFrom : !!tr.accTo;
    if (myAcc) return; // عرضي مقفول بعد الموافقة

    const owned = type === 'cards' ? (Number(myAssets.cards[id]) || 0)
                : type === 'items' ? (Number(myAssets.items[id]) || 0)
                : 1;
    const label = type === 'cards' ? cardName(cardById(id) || {})
                : type === 'items' ? itemName(id) : themeName(id);

    // الثيمات: كليك = شيلها (مفيش كميات للثيمات)
    if (type === 'themes') {
        const i = pickedMine.themes.indexOf(id);
        if (i >= 0) { pickedMine.themes.splice(i, 1); saveMyOffer(); renderRoom(roomTarget); }
        return;
    }

    const cur = pickedMine[type][id] || 1;
    openModal(`${t().qtyTitle} — ${escapeHtml(label)}`, `
        <div style="text-align:center; font-size:13px; color:#888; margin-bottom:8px;">${t().qtyMax}: ${owned}</div>
        <div class="trade-qty-row">
            <button onclick="window._tileQtyStep(-1, ${owned})">−</button>
            <input type="number" id="tradeQtyInput" value="${cur}" min="1" max="${owned}">
            <button onclick="window._tileQtyStep(1, ${owned})">+</button>
            <button style="padding:6px 12px; font-size:13px; font-weight:900;" onclick="window._tileQtyMax(${owned})">${t().qtyAll}</button>
        </div>
        <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="btn-deny" style="flex:1; padding:10px; font-size:14px;" onclick="window._tileQtyRemove('${type}','${id}')">${t().qtyRemove}</button>
            <button class="btn-accept" style="flex:1; padding:10px; font-size:14px;" onclick="window._tileQtySave('${type}','${id}', ${owned})">${t().qtyDone}</button>
        </div>
    `, '340px');
};

window._tileQtyStep = (dir, owned) => {
    const input = document.getElementById('tradeQtyInput');
    if (!input) return;
    let v = (parseInt(input.value, 10) || 1) + dir;
    v = Math.min(owned, Math.max(1, v));
    input.value = v;
};

/* زرار "الكل" — يحط أقصى كمية مملوكة */
window._tileQtyMax = (owned) => {
    const input = document.getElementById('tradeQtyInput');
    if (input) input.value = Math.max(1, owned);
};

window._tileQtySave = async (type, id, owned) => {
    const input = document.getElementById('tradeQtyInput');
    let v = Math.min(owned, Math.max(1, parseInt(input.value, 10) || 1));
    pickedMine[type][id] = v;
    const backToPicker = qtyFromPicker;
    qtyFromPicker = false;
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    await saveMyOffer();
    if (backToPicker) { renderPickerModal(); if (roomTarget) renderRoom(roomTarget); }
    else if (roomTarget) renderRoom(roomTarget);
};

window._tileQtyRemove = async (type, id) => {
    delete pickedMine[type][id];
    const backToPicker = qtyFromPicker;
    qtyFromPicker = false;
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    await saveMyOffer();
    if (backToPicker) { renderPickerModal(); if (roomTarget) renderRoom(roomTarget); }
    else if (roomTarget) renderRoom(roomTarget);
};

// ═══════════════════════════════════════════════════════════════════
// 7. مودال الاختيار "+" — أصولي أنا (زي Brawl Stars)
// ═══════════════════════════════════════════════════════════════════
window._openTradePicker = () => {
    const tr = (allTrades || {})[roomTarget];
    if (!tr || tr.status !== 'pending') return;
    const myAcc = tr.from === currentUser ? !!tr.accFrom : !!tr.accTo;
    if (myAcc) return;
    renderPickerModal();
};

function renderPickerModal() {
    const cards = Object.entries(myAssets.cards || {}).filter(([, q]) => (Number(q) || 0) > 0);
    const items = Object.entries(myAssets.items || {}).filter(([, q]) => (Number(q) || 0) > 0).filter(([id]) => ITEMS.some(i => i.id === id));
    const themes = THEMES.filter(th => myAssets.themes[th.id]);

    const cardTile = ([id, q]) => `
        <div class="trade-tile ${pickedMine.cards[id] ? 'selected' : ''}" onclick="window._pickToggle('cards','${id}')">
            <img src="${cardById(id)?.image || ''}" alt="" loading="lazy">
            ${pickedMine.cards[id] ? `<span class="tq-sel">×${pickedMine.cards[id]}</span>` : ''}
            <span class="tq">×${Number(q)}</span>
            <span class="tname">${escapeHtml(cardName(cardById(id) || {}))}</span>
        </div>`;
    const chipTile = (type, id, label, icon) => `
        <div class="trade-tile asset ${type === 'themes' ? (pickedMine.themes.includes(id) ? 'selected' : '') : (pickedMine.items[id] ? 'selected' : '')}"
             onclick="window._pickToggle('${type}','${id}')" style="min-height:56px;">
            ${type === 'themes' && pickedMine.themes.includes(id) ? '<span class="tq-sel">✔</span>' : ''}
            ${type === 'items' && pickedMine.items[id] ? `<span class="tq-sel">×${pickedMine.items[id]}</span>` : ''}
            <span class="ticon">${icon}</span>
            <span>${escapeHtml(label)}</span>
        </div>`;

    openModal(t().pickerTitle, `
        <div class="trade-sec-label">${t().pickerCards}</div>
        <div class="trade-tiles" style="max-height:240px;">${cards.map(cardTile).join('') || `<div class="empty">${t().myEmpty}</div>`}</div>
        <div class="trade-sec-label" style="margin-top:10px;">${t().pickerItems}</div>
        <div class="trade-tiles" style="grid-template-columns:repeat(3, 1fr); max-height:150px;">${items.map(([id, q]) => chipTile('items', id, `${itemName(id)} ×${q}`, '')).join('') || '<div class="empty">—</div>'}</div>
        <div class="trade-sec-label" style="margin-top:10px;">${t().pickerThemes}</div>
        <div class="trade-tiles" style="grid-template-columns:repeat(3, 1fr); max-height:150px;">${themes.map(th => chipTile('themes', th.id, themeName(th.id), th.icon)).join('') || '<div class="empty">—</div>'}</div>
        <button class="btn-accept gold" style="width:100%; margin-top:12px;" onclick="window._closeTradePicker()">${t().pickerDone}</button>
    `, '560px');
}

/* اختيار/إلغاء حاجة من المودال — بيتحفظ لحظياً في الداتابيز */
window._pickToggle = async (type, id) => {
    if (type === 'themes') {
        const i = pickedMine.themes.indexOf(id);
        if (i >= 0) pickedMine.themes.splice(i, 1); else pickedMine.themes.push(id);
    } else {
        const owned = type === 'cards' ? (Number(myAssets.cards[id]) || 0) : (Number(myAssets.items[id]) || 0);
        if (owned < 1) return showToast(t().notOwned, 'error');
        if (pickedMine[type][id]) {
            // مختار خلاص → افتح محرر الكمية (وزرار الشيل موجود جواه)
            return window._editTile(type, id, true);
        }
        else pickedMine[type][id] = 1;
    }
    await saveMyOffer();
    if (document.getElementById('nf-shared-modal')?.classList.contains('active')) renderPickerModal();
    if (roomTarget) renderRoom(roomTarget);
};

window._closeTradePicker = () => {
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    if (roomTarget) renderRoom(roomTarget);
};

// ═══════════════════════════════════════════════════════════════════
// 8. Accept / Cancel — وعدّاد 5 ثواني قبل التنفيذ
// ═══════════════════════════════════════════════════════════════════
window._roomAccept = async (tradeId) => {
    const tr = (allTrades || {})[tradeId];
    if (!tr || tr.status !== 'pending') return;
    const iAmFrom = tr.from === currentUser;
    if (iAmFrom ? tr.accFrom : tr.accTo) return;

    // 💝 التبادل ممكن يكون من طرف واحد (هبة) — بس لو الاتنين فاضيين مفيش معنى
    const hisOffer = iAmFrom ? offerFromDb(tr.toOffer) : offerFromDb(tr.fromOffer);
    if (pickCount(pickedMine) === 0 && pickCount(hisOffer) === 0) return showToast(t().emptyTrade, 'error');

    // اللي أنا حاطه (لو حطيت) لازم يكون مملوك لي
    await loadMyAssets();
    if ((Number(pickedMine.coins) || 0) > (Number(myAssets.coins) || 0)) return showToast(t().notOwned, 'error');
    for (const [id, q] of Object.entries(pickedMine.cards || {})) {
        if ((Number(myAssets.cards[id]) || 0) < q) return showToast(t().notOwned, 'error');
    }
    for (const [id, q] of Object.entries(pickedMine.items || {})) {
        if ((Number(myAssets.items[id]) || 0) < q) return showToast(t().notOwned, 'error');
    }
    for (const tid of pickedMine.themes || []) {
        if (!myAssets.themes[tid]) return showToast(t().notOwned, 'error');
    }

    const upd = iAmFrom ? { accFrom: true } : { accTo: true };
    await update(ref(db, `card_trades/${tradeId}`), { [iAmFrom ? 'fromOffer' : 'toOffer']: pickedMine, ...upd });
    if (!iAmFrom && window.triggerNotification) {
        window.triggerNotification(tr.from, t().notifHeAccepted, `${currentUser}: ${t().notifHeAcceptedBody}`, 'success');
    }
};

/* Cancel — أي طرف في أي وقت قبل التنفيذ → يتلغى للطرفين */
window._roomCancel = async (tradeId) => {
    const tr = (allTrades || {})[tradeId];
    if (!tr || tr.status !== 'pending') return;
    if (tr.from !== currentUser && tr.to !== currentUser) return;
    await update(ref(db, `card_trades/${tradeId}`), { status: 'cancelled', respondedAt: Date.now() });
    if (execTimers[tradeId]) { clearTimeout(execTimers[tradeId]); delete execTimers[tradeId]; }
    if (window.triggerNotification) {
        const other = tr.from === currentUser ? tr.to : tr.from;
        window.triggerNotification(other, t().notifCancelled, `${currentUser}: ${t().notifCancelledBody}`, 'warning');
    }
    showToast(t().cancelledToast, 'info');
};

function clearCountdown() {
    if (countdownInt) { clearInterval(countdownInt); countdownInt = null; }
}

function scheduleExec(tradeId) {
    if (execTimers[tradeId]) return;
    execTimers[tradeId] = setTimeout(() => {
        delete execTimers[tradeId];
        window._executeTrade(tradeId);
    }, FINAL_COUNTDOWN * 1000);
}

/* التنفيذ بعد العدّاد — بقفل ضد التكرار + تحقق مزدوج + تراجع كامل */
window._executeTrade = async (tradeId) => {
    // 🔒 قفل: واحد بس ينفذ (لو التابات الاتنين عدّت العدّاد مع بعض)
    const lockRes = await runTransaction(ref(db, `card_trades/${tradeId}`), (tr) => {
        if (!tr || tr.status !== 'pending' || tr.lock) return tr;
        return { ...tr, lock: currentUser };
    });
    const tr = lockRes.snapshot.val();
    if (!tr || tr.lock !== currentUser || tr.status !== 'pending') return;

    const give = tr.fromOffer || {};   // من from → إلى to
    const want = tr.toOffer || {};     // من to → إلى from

    // ═══ تحقق مزدوج من الملكية وقت التنفيذ ═══
    const meData = (await get(ref(db, `users_data/${currentUser}`))).val() || {};
    const himName = tr.from === currentUser ? tr.to : tr.from;
    const himData = (await get(ref(db, `users_data/${himName}`))).val() || {};
    const myThemes = (await get(ref(db, `purchased_themes/${currentUser}`))).val() || {};
    const hisThemes = (await get(ref(db, `purchased_themes/${himName}`))).val() || {};

    const giver = tr.from === currentUser ? meData : himData;    // اللي هيدّي give
    const taker = tr.from === currentUser ? himData : meData;    // اللي هيستلم give
    const giverThemes = tr.from === currentUser ? myThemes : hisThemes;
    const takerThemes = tr.from === currentUser ? hisThemes : myThemes;
    const receiver = tr.from === currentUser ? himData : meData; // اللي هيدّي want
    const receiverThemes = tr.from === currentUser ? hisThemes : myThemes;

    const okGive = (Number(give.coins) || 0) <= (Number(giver.coins) || 0)
        && Object.entries(give.cards || {}).every(([id, q]) => (Number((giver.cards || {})[id]) || 0) >= q)
        && Object.entries(give.items || {}).every(([id, q]) => (Number((giver.inventory || {})[id]) || 0) >= q);
    const okWant = (Number(want.coins) || 0) <= (Number(receiver.coins) || 0)
        && Object.entries(want.cards || {}).every(([id, q]) => (Number((receiver.cards || {})[id]) || 0) >= q)
        && Object.entries(want.items || {}).every(([id, q]) => (Number((receiver.inventory || {})[id]) || 0) >= q);
    // 💝 طرف واحد ممكن يكون فاضي (هبة) — بس مش الاتنين
    if (pickCount(offerFromDb(give)) === 0 && pickCount(offerFromDb(want)) === 0) { await failTrade(tradeId, t().emptyTrade); return; }
    // 🎨 الثيم مينفعش يوصل حد عنده أصلاً
    for (const tid of give.themes || []) if (takerThemes[tid]) { await failTrade(tradeId, t().themeOwnedMe); return; }
    for (const tid of want.themes || []) if (receiverThemes[tid]) { await failTrade(tradeId, t().themeOwnedHim); return; }
    if (!okGive || !okWant) { await failTrade(tradeId, t().stale); return; }

    // ═══ التنفيذ مع تراجع كامل لو حصلت مشكلة ═══
    const fromPath = `users_data/${tr.from}`;
    const toPath = `users_data/${tr.to}`;
    const done = [];
    /* ⚠️ runTransaction ممنوع نرجّع undefined منه: أول استدعاء بييجي بالقيمة الـ cached
       (null غالباً) والـ return undefined بيقطع الـ transaction فوراً.
       الصح: نرجّع القيمة الجديدة دايماً (السيرفر بيعيد التنفيذ على القيمة الحقيقية)،
       وبعدها نتأكد إن النتيجة النهائية ≥ 0. */
    async function takeAsset(path, q, kind) {
        const dec = await runTransaction(ref(db, path), (c) => (Number(c) || 0) - q);
        if (!dec.committed || (Number(dec.snapshot.val()) || 0) < 0) throw new Error(kind);
        return dec;
    }
    try {
        // 1) كارتات from → to
        for (const [id, q] of Object.entries(give.cards || {})) {
            await takeAsset(`${fromPath}/cards/${id}`, q, 'card');
            done.push(() => runTransaction(ref(db, `${fromPath}/cards/${id}`), (c) => (Number(c) || 0) + q));
            await runTransaction(ref(db, `${toPath}/cards/${id}`), (c) => (Number(c) || 0) + q);
        }
        // 2) كارتات to → from
        for (const [id, q] of Object.entries(want.cards || {})) {
            await takeAsset(`${toPath}/cards/${id}`, q, 'card');
            done.push(() => runTransaction(ref(db, `${toPath}/cards/${id}`), (c) => (Number(c) || 0) + q));
            await runTransaction(ref(db, `${fromPath}/cards/${id}`), (c) => (Number(c) || 0) + q);
        }
        // 3) مساعدات
        for (const [id, q] of Object.entries(give.items || {})) {
            await takeAsset(`${fromPath}/inventory/${id}`, q, 'item');
            done.push(() => runTransaction(ref(db, `${fromPath}/inventory/${id}`), (c) => (Number(c) || 0) + q));
            await runTransaction(ref(db, `${toPath}/inventory/${id}`), (c) => (Number(c) || 0) + q);
        }
        for (const [id, q] of Object.entries(want.items || {})) {
            await takeAsset(`${toPath}/inventory/${id}`, q, 'item');
            done.push(() => runTransaction(ref(db, `${toPath}/inventory/${id}`), (c) => (Number(c) || 0) + q));
            await runTransaction(ref(db, `${fromPath}/inventory/${id}`), (c) => (Number(c) || 0) + q);
        }
        // 4) الفلوس
        if ((Number(give.coins) || 0) > 0) {
            await takeAsset(`${fromPath}/coins`, Number(give.coins), 'coins');
            done.push(() => runTransaction(ref(db, `${fromPath}/coins`), (c) => (Number(c) || 0) + Number(give.coins)));
            await runTransaction(ref(db, `${toPath}/coins`), (c) => (Number(c) || 0) + Number(give.coins));
        }
        if ((Number(want.coins) || 0) > 0) {
            await takeAsset(`${toPath}/coins`, Number(want.coins), 'coins');
            done.push(() => runTransaction(ref(db, `${toPath}/coins`), (c) => (Number(c) || 0) + Number(want.coins)));
            await runTransaction(ref(db, `${fromPath}/coins`), (c) => (Number(c) || 0) + Number(want.coins));
        }
        // 5) الثيمات (نقل ملكية)
        for (const tid of give.themes || []) {
            const meta = giverThemes[tid] || { boughtAt: Date.now() };
            await set(ref(db, `purchased_themes/${tr.to}/${tid}`), { boughtAt: Date.now(), price: meta.price || 0 });
            await set(ref(db, `purchased_themes/${tr.from}/${tid}`), null);
            done.push(() => set(ref(db, `purchased_themes/${tr.from}/${tid}`), meta));
        }
        for (const tid of want.themes || []) {
            const meta = receiverThemes[tid] || { boughtAt: Date.now() };
            await set(ref(db, `purchased_themes/${tr.from}/${tid}`), { boughtAt: Date.now(), price: meta.price || 0 });
            await set(ref(db, `purchased_themes/${tr.to}/${tid}`), null);
            done.push(() => set(ref(db, `purchased_themes/${tr.to}/${tid}`), meta));
        }
    } catch (e) {
        console.error('❌ TRADE EXEC ERROR:', e);
        for (const undo of done.reverse()) { try { await undo(); } catch (e2) { /* best effort */ } }
        await update(ref(db, `card_trades/${tradeId}`), { status: 'cancelled', respondedAt: Date.now() });
        showToast(t().stale, 'error');
        return;
    }

    // 🏁 القفل النهائي: لو حد عمل Cancel أثناء التنفيذ → نتراجع
    const fin = await runTransaction(ref(db, `card_trades/${tradeId}/status`), (s) => s === 'pending' ? 'accepted' : s);
    if (fin.snapshot.val() !== 'accepted') {
        for (const undo of done.reverse()) { try { await undo(); } catch (e2) { /* best effort */ } }
        return;
    }

    if (window.triggerNotification) {
        window.triggerNotification(himName, t().notifDone, `${currentUser}: ${t().notifDoneBody}`, 'success');
    }
    showToast(t().acceptedToast, 'success');
};

/* فشل التنفيذ (ملكية اتغيرت) → إلغاء + رسالة واضحة */
async function failTrade(tradeId, msg) {
    await update(ref(db, `card_trades/${tradeId}`), { status: 'cancelled', respondedAt: Date.now() });
    showToast(msg, 'error');
}

// ═══════════════════════════════════════════════════════════════════
// 9. الواجهة — الغرفة بستايل Brawl Stars
// ═══════════════════════════════════════════════════════════════════
/* تايلة في "عرضك" — قابلة للتعديل لو لسه موافقتش */
function myOfferTile(type, id, qty, editable) {
    const onclick = editable ? `window._editTile('${type}','${id}')` : '';
    const cur = editable ? 'pointer' : 'default';
    if (type === 'cards') {
        const card = cardById(id);
        if (!card) return '';
        return `
        <div class="trade-tile" style="cursor:${cur};" ${onclick ? `onclick="${onclick}"` : ''}>
            <img src="${card.image}" alt="" loading="lazy">
            <span class="tq">×${qty}</span>
            <span class="tname">${escapeHtml(cardName(card))}</span>
        </div>`;
    }
    const label = type === 'items' ? itemName(id) : themeName(id);
    const icon = type === 'items' ? '🧰' : '🎨';
    return `
    <div class="trade-tile asset" style="cursor:${cur};" ${onclick ? `onclick="${onclick}"` : ''}>
        <span class="ticon">${icon}</span>
        <span>${escapeHtml(label)} ×${qty}</span>
    </div>`;
}

/* بانل "عرضك" — الحاجات المختارة بس + تايلة + (زي الصورة) */
function myOfferPanel(tr, editable) {
    const tiles = [];
    for (const [id, q] of Object.entries(pickedMine.cards || {})) tiles.push(myOfferTile('cards', id, q, editable));
    for (const [id, q] of Object.entries(pickedMine.items || {})) tiles.push(myOfferTile('items', id, q, editable));
    for (const tid of pickedMine.themes || []) tiles.push(myOfferTile('themes', tid, 1, editable));
    if (editable) {
        tiles.push(`<div class="trade-tile plus" onclick="window._openTradePicker()">+</div>`);
    }
    const coinsInput = editable
        ? `<input type="number" id="trade-coins-input" min="0" value="${pickedMine.coins > 0 ? pickedMine.coins : ''}" placeholder="${t().coinsPh}" oninput="window._tradeCoins(this.value)" onblur="window._tradeCoinsBlur()">`
        : `<input type="number" value="${pickedMine.coins || 0}" disabled style="opacity:0.6;">`;

    return `
        <div class="trade-panel">
            <div class="trade-panel-title">${t().myOffer}</div>
            <div style="text-align:center; color:#94a3b8; font-size:11px; margin-bottom:8px;">${editable ? t().editHint : ''}</div>
            <div class="trade-tiles" id="trade-my-tiles">${tiles.join('') || `<div class="empty">${t().myEmpty}</div>`}</div>
            <div class="trade-coins-bar">
                <span class="cicon">🪙</span>
                ${coinsInput}
                <span style="color:#888; font-size:13px; font-weight:bold;">${t().coinsUnit}</span>
            </div>
        </div>`;
}

/* بانل "عرضه" — اللي هو اختاره بس + ختم Accepted لما يوافق */
function hisOfferPanel(tr) {
    const hisOffer = tr.from === currentUser ? tr.toOffer : tr.fromOffer;
    const hisAcc = tr.from === currentUser ? !!tr.accTo : !!tr.accFrom;
    const tiles = [];
    for (const [id, q] of Object.entries((hisOffer || {}).cards || {})) {
        const card = cardById(id);
        if (!card) continue;
        tiles.push(`
        <div class="trade-tile" style="cursor:default;">
            <img src="${card.image}" alt="" loading="lazy">
            <span class="tq">×${Number(q)}</span>
            <span class="tname">${escapeHtml(cardName(card))}</span>
        </div>`);
    }
    for (const [id, q] of Object.entries((hisOffer || {}).items || {})) {
        tiles.push(`
        <div class="trade-tile asset" style="cursor:default;">
            <span class="ticon">🧰</span>
            <span>${escapeHtml(itemName(id))} ×${Number(q)}</span>
        </div>`);
    }
    for (const tid of (hisOffer || {}).themes || []) {
        tiles.push(`
        <div class="trade-tile asset" style="cursor:default;">
            <span class="ticon">🎨</span>
            <span>${escapeHtml(themeName(tid))}</span>
        </div>`);
    }
    const hisName = tr.from === currentUser ? tr.to : tr.from;
    const coins = Number((hisOffer || {}).coins) || 0;

    return `
        <div class="trade-panel" style="border-color:#a855f7; position:relative; overflow:hidden;">
            <div class="trade-panel-title">${t().hisOffer}</div>
            <div style="text-align:center; color:#c4b5fd; font-weight:bold; margin-bottom:8px;">👤 ${escapeHtml(hisName)}</div>
            <div class="trade-tiles">${tiles.join('') || `<div class="empty">${t().stWaitingHim}</div>`}</div>
            <div class="trade-coins-bar" style="opacity:0.85;">
                <span class="cicon">🪙</span>
                <input type="number" value="${coins}" disabled style="opacity:0.7;">
                <span style="color:#888; font-size:13px; font-weight:bold;">${t().coinsUnit}</span>
            </div>
            ${hisAcc ? '<div class="trade-stamp">✅ Accepted</div>' : ''}
        </div>`;
}

/* ═══ الغرفة ═══ */
function renderRoom(tradeId) {
    const box = document.getElementById('tradeBuilder');
    if (!box) return;
    // 🚫 متترسمش وانت بتكتب في بوكس الكوينز — بنأجل الرسم لحد ما تخرج منه
    if (document.activeElement && document.activeElement.id === 'trade-coins-input') {
        pendingRoomRender = tradeId;
        return;
    }
    const tr = (allTrades || {})[tradeId];
    if (!tr || (tr.from !== currentUser && tr.to !== currentUser)) {
        roomTarget = null; clearCountdown(); renderTradesListOnly(); return;
    }
    const iAmFrom = tr.from === currentUser;
    const myAcc = iAmFrom ? !!tr.accFrom : !!tr.accTo;
    const hisAcc = iAmFrom ? !!tr.accTo : !!tr.accFrom;
    const bothAcc = myAcc && hisAcc;
    const pending = tr.status === 'pending';

    // مزامنة عرضي مع الداتابيز لو مش في وضع تعديل (مثلاً غيّر من تاب تاني)
    if (!pending) clearCountdown();

    let statusHtml = '';
    let actionsHtml = '';

    if (tr.status === 'accepted') {
        statusHtml = `<div class="trade-status done">${t().stDone}</div>`;
        actionsHtml = `<button class="btn-accept gold" onclick="window._closeRoom()">${t().closeBtn}</button>`;
    } else if (tr.status === 'cancelled') {
        statusHtml = `<div class="trade-status dead">${t().stCancelled}</div>`;
        actionsHtml = `<button class="btn-accept gold" onclick="window._closeRoom()">${t().closeBtn}</button>`;
    } else if (bothAcc) {
        // 🔥 الاتنين وافقوا — عدّاد 5 ثواني والتنفيذ
        scheduleExec(tradeId);
        statusHtml = `<div class="trade-status fire">${t().stCountdown} <span id="trade-count">${FINAL_COUNTDOWN}</span> ${t().stCountdownHint}</div>`;
        actionsHtml = `<button class="btn-deny" onclick="window._roomCancel('${tradeId}')">🚫 ${t().cancelBtn}</button>`;
        startCountdownDisplay();
    } else if (myAcc) {
        statusHtml = `<div class="trade-status wait">${t().stWaitingHim}</div>`;
        actionsHtml = `
            <button class="btn-deny" onclick="window._roomCancel('${tradeId}')">🚫 ${t().cancelBtn}</button>
            <button class="btn-deny" style="background:linear-gradient(180deg,#475569,#334155); border-color:#1e293b; box-shadow:0 4px 0 #1e293b;" onclick="window._closeRoom()">${t().backBtn}</button>`;
    } else {
        statusHtml = hisAcc
            ? `<div class="trade-status ready">${t().stHeAccepted}</div>`
            : `<div class="trade-status wait">${t().stWaitingHim}</div>`;
        actionsHtml = `
            <button class="btn-accept" onclick="window._roomAccept('${tradeId}')">✅ ${t().acceptBtn}</button>
            <button class="btn-deny" onclick="window._roomCancel('${tradeId}')">🚫 ${t().cancelBtn}</button>
            <button class="btn-deny" style="background:linear-gradient(180deg,#475569,#334155); border-color:#1e293b; box-shadow:0 4px 0 #1e293b;" onclick="window._closeRoom()">${t().backBtn}</button>`;
    }

    box.innerHTML = `
        <div class="trade-panel-title" style="font-size:22px; margin-bottom:10px;">🤝 ${escapeHtml(tr.from)} ↔ ${escapeHtml(tr.to)}</div>
        <div class="trade-cols">
            ${myOfferPanel(tr, pending && !myAcc)}
            ${hisOfferPanel(tr)}
        </div>
        ${statusHtml}
        <div class="trade-actions">${actionsHtml}</div>`;
}

/* عدّاد 5 ثواني المرئي */
function startCountdownDisplay() {
    clearCountdown();
    let n = FINAL_COUNTDOWN;
    countdownInt = setInterval(() => {
        n--;
        const el = document.getElementById('trade-count');
        if (el) el.textContent = Math.max(0, n);
        if (n <= 0 && countdownInt) { clearInterval(countdownInt); countdownInt = null; }
    }, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// 10. قايمة التبادلات النشطة
// ═══════════════════════════════════════════════════════════════════
function pickText(p) {
    const parts = [];
    for (const [id, q] of Object.entries(p.cards || {})) parts.push(`${q}× ${cardName(cardById(id) || {})}`);
    for (const [id, q] of Object.entries(p.items || {})) parts.push(`${q}× ${itemName(id)}`);
    if ((Number(p.coins) || 0) > 0) parts.push(`🪙 ${Number(p.coins)}`);
    for (const tid of p.themes || []) parts.push(themeName(tid));
    return parts.join(' + ') || '—';
}

function renderTrades() {
    const listEl = document.getElementById('tradesList');
    if (!listEl || !isLoggedIn()) return;

    const active = Object.entries(allTrades).filter(([, tr]) => tr && tr.status === 'pending'
        && (tr.from === currentUser || tr.to === currentUser));

    const tradeRow = (id, tr) => {
        const isIncoming = tr.to === currentUser;
        const myAcc = isIncoming ? !!tr.accTo : !!tr.accFrom;
        const hisAcc = isIncoming ? !!tr.accFrom : !!tr.accTo;
        const myOffer = isIncoming ? tr.fromOffer : tr.toOffer;
        const state = myAcc && hisAcc ? '🔥' : myAcc ? t().listYou : hisAcc ? t().listHe : '⏳';
        return `
        <div class="listing">
            <div class="listing-info">
                <div class="listing-title">${isIncoming
                    ? `👤 ${escapeHtml(tr.from)} — ${t().hisOffer.replace('🎬 ', '')}: ${escapeHtml(pickText(tr.fromOffer || {}))}`
                    : `${t().listTo} ${escapeHtml(tr.to)} — ${t().myOffer.replace('🎬 ', '')}: ${escapeHtml(pickText(tr.toOffer || {}))}`}</div>
                <div class="listing-seller">${state} — ${t().listHis} ${escapeHtml(pickText(myOffer || {}))}</div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn-accept" style="padding:10px 25px; font-size:15px;" onclick="window._openRoom('${id}')">${t().openBtn}</button>
                <button class="btn-deny" style="padding:10px 25px; font-size:15px;" onclick="window._roomCancel('${id}')">🚫 ${t().cancelBtn}</button>
            </div>
        </div>`;
    };

    listEl.innerHTML = active.length
        ? active.map(([id, tr]) => tradeRow(id, tr)).join('')
        : `<div class="empty">${t().noneActive}</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// 11. تشغيل الوحدة — بينادى لما تاب التبادل يتفتح
// ═══════════════════════════════════════════════════════════════════
window._openTradesTab = () => {
    lang = localStorage.getItem('lang') || 'ar';
    roomTarget = null;
    pickedMine = emptyPick();
    clearCountdown();
    subscribeTrades();
    renderTradesListOnly();
};

window.NFCardTrading = { subscribeTrades };
