/* ═══════════════════════════════════════════════════════════════════
   🔨 LIVE CARD AUCTIONS — المزاد الحي للبطاقات النادرة
   قاعدة البيانات:
   - users_data/{user}/coins            → رصيد العملات
   - users_data/{user}/cards/{cardId}   → عدد البطاقات المملوكة
   - users_data/{user}/pack_granted     → هل أخذ الحزمة الترحيبية؟
   - auctions/{auctionId}               → المزادات النشطة/المحسومة
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, remove, push, onValue, currentUser, isLoggedIn, showToast, escapeHtml, openModal } from '../firebase-shared.js';
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ═══════════════════════════════════════════════════════════════════
// 1. الترجمة (i18n)
// ═══════════════════════════════════════════════════════════════════
let lang = localStorage.getItem('lang') || 'ar';

const T = {
    ar: {
        title: "🔨 المزاد الحي", coins: "عملة", back: "⬅ رجوع",
        tabAuctions: "🔨 المزادات النشطة", tabInventory: "🎴 مخزون بطاقاتي",
        currentPrice: "السعر الحالي", startPrice: "سعر البداية", topBidder: "أعلى مزايد",
        seller: "البائع", noBids: "لا مزايدات بعد", bidBtn: "🔨 زايد دلوقتي",
        myAuction: "🎬 مزادك", placeBid: "🔨 زايد", bidAmount: "مبلغ المزايدة",
        confirm: "تأكيد", cancel: "إلغاء", listBtn: "📤 اعرض في المزاد",
        listTitle: "📤 اعرض بطاقة في المزاد", startPriceLabel: "سعر البداية (عملة)",
        durationLabel: "مدة المزاد", d5: "⚡ 5 دقائق (تجربة سريعة)", d30: "🕐 30 دقيقة", d120: "⏰ ساعتين",
        timeLeft: "متبقي", ended: "انتهى", emptyAuctions: "مفيش مزادات نشطة دلوقتي... كن أول واحد يعرض بطاقة!",
        emptyCards: "مفيش بطاقات في مخزونك", loginFirst: "سجل دخول الأول عشان تلعب المزاد 🪙",
        welcomePack: "🎁 حزمة ترحيبية! خدت 3 بطاقات مجانية عشان تبدأ", minBidErr: "المبلغ لازم يكون أعلى من السعر الحالي",
        notEnough: "عملاتك مش كفاية!", bidPlaced: "🔨 زايدت بنجاح!", outbid: "حد تاني زايد أعلى منك قبل ما تأكيد، اترجعت عملاتك",
        bidOnOwn: "مش ممكن تزايد على مزادك!",
        listed: "📤 بطاقتك في المزاد دلوقتي! (اتخصمت من مخزونك حتى انتهاء المزاد)",
        youWon: "🏆 مبروك! كسبت البطاقة واتضافت لمخزونك",
        soldMsg: "💰 ات باعت بطاقتك! زودنا لك", toYourBalance: "عملة في رصيدك",
        returnedMsg: "↩️ مفيش حد زايد، بطاقتك رجعت لمخزونك", invalidCard: "البطاقة دي مش عندك!",
        buyBoxTitle: "🎰 محتاج بطاقات؟", buyBoxDesc: "اشترِ بطاقة عشوائية بالعملات — الفرص: عادي 45% / نادر 25% / ملحمي 13% / أسطوري 7% / خرافي 4% / إكسوتيك 2.5% / خالد 1.5% / إلهي 0.8% / سري 0.6% / جودلي 0.4% / ترانسندنت 0.2%",
        buyBtn: "🪙 اشترِ بطاقة عشوائية (2000 عملة)", boughtCard: "🎰 مبروك! كسبت بطاقة",
    },
    en: {
        title: "🔨 Live Auctions", coins: "Coins", back: "⬅ Back",
        tabAuctions: "🔨 Active Auctions", tabInventory: "🎴 My Cards",
        currentPrice: "Current Price", startPrice: "Start Price", topBidder: "Top Bidder",
        seller: "Seller", noBids: "No bids yet", bidBtn: "🔨 Bid Now",
        myAuction: "🎬 Your Auction", placeBid: "🔨 Bid", bidAmount: "Bid Amount",
        confirm: "Confirm", cancel: "Cancel", listBtn: "📤 List in Auction",
        listTitle: "📤 List a Card", startPriceLabel: "Start Price (coins)",
        durationLabel: "Auction Duration", d5: "⚡ 5 min (quick test)", d30: "🕐 30 min", d120: "⏰ 2 hours",
        timeLeft: "Time left", ended: "Ended", emptyAuctions: "No active auctions... be the first to list a card!",
        emptyCards: "No cards in your inventory", loginFirst: "Please log in to play the auction 🪙",
        welcomePack: "🎁 Welcome pack! You got 3 free cards to start", minBidErr: "Amount must be higher than the current price",
        notEnough: "Not enough coins!", bidPlaced: "🔨 Bid placed!", outbid: "Someone outbid you before confirm, coins refunded",
        bidOnOwn: "You can't bid on your own auction!",
        listed: "📤 Your card is in the auction! (deducted from inventory until it ends)",
        youWon: "🏆 Congrats! You won the card, added to your inventory",
        soldMsg: "💰 Your card sold! We added", toYourBalance: "to your balance",
        returnedMsg: "↩️ No bids, your card returned to your inventory", invalidCard: "You don't own this card!",
        buyBoxTitle: "🎰 Need cards?", buyBoxDesc: "Buy a random card with coins — Odds: Common 45% / Rare 25% / Epic 13% / Legendary 7% / Mythic 4% / Exotic 2.5% / Immortal 1.5% / Divine 0.8% / Secret 0.6% / Godly 0.4% / Transcendent 0.2%",
        buyBtn: "🪙 Buy a Random Card (2000 coins)", boughtCard: "🎰 Congrats! You got",
    }
};
const t = () => T[lang];

// ═══════════════════════════════════════════════════════════════════
// 2. البطاقات والندرة — من الوحدة المشتركة features/cards-data.js (98 بطاقة)
// ═══════════════════════════════════════════════════════════════════
import { RARITY as RARITY_BASE, CARDS, cardById, cardName as cardNameBase, cardPower, upCost, pickWeighted, randomCardId, WELCOME_ODDS } from './cards-data.js';

const RARITY = RARITY_BASE;
// غلاف بيستخدم لغة الصفحة الحالية (زي ما كانت بتشتغل قبل كده)
const cardName = (c) => cardNameBase(c, lang);

// ═══════════════════════════════════════════════════════════════════
// 3. متغيرات الحالة
// ═══════════════════════════════════════════════════════════════════
let auctionsState = {};
let myCardsState = {};
let activeTab = 'auctions';
let countdownTimer = null;
const DURATIONS = { d5: 5, d30: 30, d120: 120 }; // بالدقائق

// ═══════════════════════════════════════════════════════════════════
// 4. شاشة الدخول + الحزمة الترحيبية
// ═══════════════════════════════════════════════════════════════════
async function grantWelcomePackIfNeeded() {
    try {
        const flagSnap = await get(ref(db, `users_data/${currentUser}/pack_granted`));
        if (flagSnap.val()) return;

        const cardsSnap = await get(ref(db, `users_data/${currentUser}/cards`));
        if (cardsSnap.exists()) { await set(ref(db, `users_data/${currentUser}/pack_granted`), true); return; }

        // 3 بطاقات عشوائية بأوزان الحزمة الترحيبية (11 تير — WELCOME_ODDS)
        const gift = {};
        while (Object.keys(gift).length < 3) {
            const pick = pickWeighted(WELCOME_ODDS);
            gift[pick] = (gift[pick] || 0) + 1;
        }

        await set(ref(db, `users_data/${currentUser}/cards`), gift);
        await set(ref(db, `users_data/${currentUser}/pack_granted`), true);
        showToast('🎁 ' + t().welcomePack, 'success');
    } catch (e) {
        console.warn('Welcome pack error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 5. الاستماع الحي لقاعدة البيانات
// ═══════════════════════════════════════════════════════════════════
function startListeners() {
    onValue(ref(db, 'auctions'), (snap) => {
        auctionsState = snap.val() || {};
        render();
    });

    onValue(ref(db, `users_data/${currentUser}/cards`), (snap) => {
        myCardsState = snap.val() || {};
        render();
    });

    onValue(ref(db, `users_data/${currentUser}/coins`), (snap) => {
        const el = document.getElementById('myCoins');
        if (el) el.textContent = (Number(snap.val()) || 0).toLocaleString('en-US');
    });
}

// ═══════════════════════════════════════════════════════════════════
// 6. العداد التنازلي الحي
// ═══════════════════════════════════════════════════════════════════
function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        document.querySelectorAll('[data-ends]').forEach(el => {
            const id = el.dataset.id;
            const endsAt = Number(el.dataset.ends);
            const auction = auctionsState[id];
            const remaining = endsAt - Date.now();

            if (remaining <= 0) {
                el.textContent = '⏰ ' + t().ended;
                el.classList.add('expired');
                // حسم المزاد تلقائياً (أول شخص يشوفه يحسمه — الـ Transaction بيمنع التكرار)
                if (auction && auction.status === 'active') settleAuction(id, auction);
            } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                el.textContent = `⏳ ${t().timeLeft}: ${mins}د ${secs < 10 ? '0' : ''}${secs}ث`;
                if (remaining < 60000) el.classList.add('urgent'); // آخر دقيقة → أحمر
            }
        });
    }, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// 7. الرسم (Rendering)
// ═══════════════════════════════════════════════════════════════════
function rarityBadge(rarity) {
    const r = RARITY[rarity];
    return `<span class="rarity-badge r-${rarity}">${lang === 'ar' ? r.label_ar : r.label_en}</span>`;
}

function render() {
    if (activeTab === 'auctions') renderAuctions();
    else renderMyCards();
}

function renderAuctions() {
    const container = document.getElementById('auctionsContainer');
    if (!container) return;

    const active = Object.entries(auctionsState)
        .filter(([, a]) => a && a.status === 'active')
        .sort(([, a], [, b]) => a.endsAt - b.endsAt);

    if (active.length === 0) {
        container.innerHTML = `<div class="empty">🔇 ${t().emptyAuctions}</div>`;
        return;
    }

    container.innerHTML = active.map(([id, a]) => {
        const card = cardById(a.cardId);
        if (!card) return '';
        const isMine = a.seller === currentUser;
        const price = a.currentPrice || a.startPrice;
        return `
        <div class="auction-card ${isMine ? 'mine' : ''}">
            <div class="poster-wrap">
                <img src="${card.image}" alt="${escapeHtml(cardName(card))}" class="poster" loading="lazy">
                ${rarityBadge(card.rarity)}
            </div>
            <div class="auction-info">
                <div class="card-title">${escapeHtml(cardName(card))}</div>
                <div class="seller-line">👤 ${t().seller}: <b>${escapeHtml(a.sellerName || a.seller)}</b></div>
                <div class="price-line">🪙 ${t().currentPrice}: <b class="price">${price}</b></div>
                <div class="bidder-line">🎯 ${t().topBidder}: <b>${a.topBidderName ? escapeHtml(a.topBidderName) : `<span class="dim">${t().noBids}</span>`}</b></div>
                <div class="countdown ${remainingClass(a)}" data-ends="${a.endsAt}" data-id="${id}">⏳ ${t().timeLeft}...</div>
                ${isMine
                    ? `<button class="btn-mine" disabled>🎬 ${t().myAuction}</button>`
                    : `<button class="btn-bid" onclick="window._openBidModal('${id}')">🔨 ${t().placeBid}</button>`}
            </div>
        </div>`;
    }).join('');
}

function remainingClass(a) {
    return (a.endsAt - Date.now()) < 60000 ? 'urgent' : '';
}

function renderMyCards() {
    const container = document.getElementById('myCardsContainer');
    if (!container) return;

    const entries = Object.entries(myCardsState).filter(([, qty]) => qty > 0);
    const buyBox = `
        <div class="auction-card buy-box">
            <div class="auction-info" style="align-items:center; text-align:center; justify-content:center; gap:10px;">
                <div class="card-title">🎰 ${t().buyBoxTitle}</div>
                <div style="font-size:12.5px; color:#aaa;">${t().buyBoxDesc}</div>
                <button class="btn-bid" style="width:auto; padding:10px 25px;" onclick="window._buyRandomCard()">${t().buyBtn}</button>
            </div>
        </div>`;

    if (entries.length === 0) {
        container.innerHTML = buyBox + `<div class="empty">🎴 ${t().emptyCards}<br>💡 ${t().buyBoxDesc}</div>`;
        return;
    }

    container.innerHTML = buyBox + entries.map(([cardId, qty]) => {
        const card = cardById(cardId);
        if (!card) return '';
        return `
        <div class="auction-card">
            <div class="poster-wrap">
                <img src="${card.image}" alt="${escapeHtml(cardName(card))}" class="poster" loading="lazy">
                ${rarityBadge(card.rarity)}
                <span class="qty-badge">x${qty}</span>
            </div>
            <div class="auction-info">
                <div class="card-title">${escapeHtml(cardName(card))}</div>
                <button class="btn-bid" onclick="window._openListModal('${cardId}')">📤 ${t().listBtn}</button>
            </div>
        </div>`;
    }).join('');
}

// ═══════════════════════════════════════════════════════════════════
// 8. التبويبات
// ═══════════════════════════════════════════════════════════════════
window._switchAuctionTab = (tab, btn) => {
    activeTab = tab;
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('auctionsContainer').style.display = tab === 'auctions' ? 'grid' : 'none';
    document.getElementById('myCardsContainer').style.display = tab === 'auctions' ? 'none' : 'grid';
    render();
};

// ═══════════════════════════════════════════════════════════════════
// 9. عرض بطاقة في المزاد (Escrow: البطاقة تتحجز فوراً)
// ═══════════════════════════════════════════════════════════════════
window._openListModal = (cardId) => {
    const card = cardById(cardId);
    if (!card) return;
    openModal(t().listTitle + ' — ' + cardName(card), `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <label style="color:#aaa; font-size:14px;">🪙 ${t().startPriceLabel}</label>
            <input type="number" id="auctionStartPrice" value="50" min="10" style="padding:12px; border-radius:8px; border:1px solid #555; background:#000; color:#fff; font-family:Cairo; font-size:16px;">
            <label style="color:#aaa; font-size:14px;">⏰ ${t().durationLabel}</label>
            <select id="auctionDuration" style="padding:12px; border-radius:8px; border:1px solid #555; background:#000; color:#fff; font-family:Cairo; font-size:15px;">
                <option value="d5">${t().d5}</option>
                <option value="d30" selected>${t().d30}</option>
                <option value="d120">${t().d120}</option>
            </select>
            <button class="btn-bid" style="width:100%; margin-top:10px;" onclick="window._listCard('${cardId}')">✅ ${t().confirm}</button>
        </div>
    `);
};

window._listCard = async (cardId) => {
    const priceInput = document.getElementById('auctionStartPrice');
    const durInput = document.getElementById('auctionDuration');
    const startPrice = Math.max(10, parseInt(priceInput.value, 10) || 10);
    const minutes = DURATIONS[durInput.value] || 30;
    document.getElementById('nf-shared-modal')?.classList.remove('active');

    // 1. حجز البطاقة من المخزون (Escrow) — transaction بتمنع سرقتها مرتين
    const escrowRes = await runTransaction(ref(db, `users_data/${currentUser}/cards/${cardId}`), (curr) => {
        const owned = Number(curr) || 0;
        if (owned <= 0) return; // abort — مش مملوكه
        return owned - 1;
    });
    if (!escrowRes.committed) return showToast('❌ ' + t().invalidCard, 'error');

    // 2. إنشاء المزاد (لو فشل، بنرجع البطاقة لمخزونك عشان مفيش حاجة تضيع)
    try {
        const auctionRef = push(ref(db, 'auctions'));
        await set(auctionRef, {
            cardId,
            seller: currentUser,
            sellerName: currentUser,
            startPrice,
            currentPrice: startPrice,
            topBidder: null,
            topBidderName: null,
            createdAt: Date.now(),
            endsAt: Date.now() + minutes * 60000,
            status: 'active'
        });
    } catch (e) {
        await runTransaction(ref(db, `users_data/${currentUser}/cards/${cardId}`), (curr) => (Number(curr) || 0) + 1);
        return showToast('❌ حصلت مشكلة، البطاقة رجعت لمخزونك', 'error');
    }

    showToast('📤 ' + t().listed, 'success');
    // ارجع لتبويب المزادات عشان يشوفها
    if (activeTab !== 'auctions') {
        const btn = document.querySelector('.tab');
        window._switchAuctionTab('auctions', btn);
    }
};

// ═══════════════════════════════════════════════════════════════════
// 10. المزايدة اللحظية الآمنة (Coins → Auction → Refund)
// ═══════════════════════════════════════════════════════════════════
window._openBidModal = (auctionId) => {
    const a = auctionsState[auctionId];
    if (!a) return;
    const price = a.currentPrice || a.startPrice;
    openModal(t().placeBid + ' — ' + cardName(cardById(a.cardId) || {}), `
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="color:#aaa; font-size:14px;">🪙 ${t().currentPrice}: <b style="color:var(--gold)">${price}</b></div>
            <input type="number" id="bidAmountInput" value="${price + 10}" min="${price + 1}" style="padding:12px; border-radius:8px; border:1px solid #555; background:#000; color:#fff; font-family:Cairo; font-size:16px;">
            <button class="btn-bid" style="width:100%; margin-top:10px;" onclick="window._placeBid('${auctionId}')">✅ ${t().confirm}</button>
        </div>
    `);
};

window._placeBid = async (auctionId) => {
    const input = document.getElementById('bidAmountInput');
    const amount = parseInt(input.value, 10);
    document.getElementById('nf-shared-modal')?.classList.remove('active');

    const auction = auctionsState[auctionId];
    if (!auction || auction.status !== 'active') return;
    if (auction.seller === currentUser) return showToast('🚫 ' + t().bidOnOwn, 'error');

    const currentPrice = auction.currentPrice || auction.startPrice;
    if (!amount || amount <= currentPrice) return showToast('⚠️ ' + t().minBidErr, 'error');

    // ═══ الخطوة 1: التأكد إن الرصيد يكفي وخصم المبلغ (Transaction آمنة) ═══
    const coinRes = await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => {
        const balance = Number(curr) || 0;
        if (balance < amount) return; // abort — الرصيد مش كفاية
        return balance - amount;
    });
    if (!coinRes.committed) return showToast('💸 ' + t().notEnough, 'error');

    // ═══ الخطوة 2: تسجيل المزايدة على المزاد (Transaction بتفضل أحدث مزايدة) ═══
    let oldState = null;
    const bidRes = await runTransaction(ref(db, `auctions/${auctionId}`), (a) => {
        if (!a || a.status !== 'active' || Date.now() >= a.endsAt) return; // abort — انتهى
        if (a.seller === currentUser) return; // abort — مزادك مش هيتقبل
        if (amount <= (a.currentPrice || a.startPrice)) return; // abort — حد زايد أعلى قبلك
        oldState = a;
        return {
            ...a,
            currentPrice: amount,
            topBidder: currentUser,
            topBidderName: currentUser,
            bids: (a.bids || 0) + 1
        };
    });

    // ═══ الخطوة 3: لو المزايدة اترفض (حد سبقنا / المزاد انتهى) → نرجّع عملاتنا ═══
    if (!bidRes.committed) {
        await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => (Number(curr) || 0) + amount);
        showToast('↩️ ' + t().outbid, 'info');
        return;
    }

    // ═══ الخطوة 4: إرجاع المبلغ تلقائياً لأعلى مزايد سابق ═══
    if (oldState && oldState.topBidder && oldState.topBidder !== currentUser) {
        await runTransaction(ref(db, `users_data/${oldState.topBidder}/coins`), (curr) => (Number(curr) || 0) + (Number(oldState.currentPrice) || 0));
    }

    showToast('🔨 ' + t().bidPlaced, 'success');
};

// ═══════════════════════════════════════════════════════════════════
// 11. شراء بطاقة عشوائية بالعملات (لو مخزونك فضى)
// ═══════════════════════════════════════════════════════════════════
const RANDOM_CARD_COST = 2000;

window._buyRandomCard = async () => {
    // ═══ الخطوة 1: خصم الثمن من الرصيد (Transaction بتتحقق من الكفاية) ═══
    const coinRes = await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => {
        const balance = Number(curr) || 0;
        if (balance < RANDOM_CARD_COST) return; // abort — مش كفاية
        return balance - RANDOM_CARD_COST;
    });
    if (!coinRes.committed) return showToast('💸 ' + t().notEnough, 'error');

    // ═══ الخطوة 2: اختيار بطاقة عشوائية بأوزان الـ 11 تير (BUY_ODDS) ═══
    const won = cardById(randomCardId());
    const wonR = RARITY[won.rarity];

    // ═══ الخطوة 3: إضافة البطاقة للمخزون (لو فشل بنرجّع الفلوس) ═══
    try {
        await runTransaction(ref(db, `users_data/${currentUser}/cards/${won.id}`), (curr) => (Number(curr) || 0) + 1);
        showToast(`🎰 ${t().boughtCard} ${cardName(won)} [${lang === 'ar' ? wonR.label_ar : wonR.label_en}]!`, 'success');
    } catch (e) {
        await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => (Number(curr) || 0) + RANDOM_CARD_COST);
        showToast('❌ حصلت مشكلة واترجعت عملاتك', 'error');
    }
};

// ═══════════════════════════════════════════════════════════════════
// 12. الحسم التلقائي عند انتهاء الوقت
// ═══════════════════════════════════════════════════════════════════
async function settleAuction(auctionId, snapshot) {
    // ═══ الخطوة 1: حجز الحسم (أول واحد يوصل بيكسب حق الحسم — Transaction بتفضل الباقي) ═══
    const claimRes = await runTransaction(ref(db, `auctions/${auctionId}`), (a) => {
        if (!a || a.status !== 'active' || Date.now() < a.endsAt) return; // abort — محسوم قبل كده أو لسه الوقت
        return { ...a, status: a.topBidder ? 'settled' : 'returned', settledAt: Date.now() };
    });
    if (!claimRes.committed) return;

    const a = claimRes.snapshot.val();
    const card = cardById(a.cardId);
    const title = card ? cardName(card) : a.cardId;

    if (a.topBidder) {
        // ═══ البطاقة تتنقل للفائز + الفلوس للبائع ═══
        await runTransaction(ref(db, `users_data/${a.topBidder}/cards/${a.cardId}`), (curr) => (Number(curr) || 0) + 1);
        await runTransaction(ref(db, `users_data/${a.seller}/coins`), (curr) => (Number(curr) || 0) + (Number(a.currentPrice) || 0));

        if (a.topBidder === currentUser) showToast(`🏆 ${t().youWon} (${title})`, 'success');
        if (a.seller === currentUser) showToast(`💰 ${t().soldMsg} ${a.currentPrice} 🪙 ${t().toYourBalance} (${title})`, 'success');
    } else {
        // ═══ مفيش مزايدات → البطاقة ترجع للبائع ═══
        await runTransaction(ref(db, `users_data/${a.seller}/cards/${a.cardId}`), (curr) => (Number(curr) || 0) + 1);
        if (a.seller === currentUser) showToast('↩️ ' + t().returnedMsg + ` (${title})`, 'info');
    }

    // ═══ الخطوة 2: نسيب المزاد المحسوم 4 ثواني (عشان باقي العملاء يشوفوا النتيجة) وبعدين نمسحه ═══
    setTimeout(() => remove(ref(db, `auctions/${auctionId}`)).catch(() => {}), 4000);
}

// ═══════════════════════════════════════════════════════════════════
// 12. الترجمة والتهيئة
// ═══════════════════════════════════════════════════════════════════
function applyLang() {
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-ar]').forEach(el => {
        el.innerHTML = el.dataset[lang];
    });
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
}

window.toggleAuctionLang = () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', lang);
    applyLang();
    render();
};

// ═══════════════════════════════════════════════════════════════════
// 13. الإقلاع
// ═══════════════════════════════════════════════════════════════════
applyLang();

if (!isLoggedIn()) {
    document.getElementById('loginGate').style.display = 'flex';
    document.getElementById('auctionsApp').style.display = 'none';
} else {
    grantWelcomePackIfNeeded().then(startListeners);
    startCountdown();
}
