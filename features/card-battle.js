/* ═══════════════════════════════════════════════════════════════════
   ⚔️ CARD BATTLE ARENA v2 — ساحة معارك البطاقات
   أوضاع اللعب: 🤖 بوت ذكي صعب + 🌐 لاعب حقيقي أونلاين (PvP)
   - الفائز بالمعركة (أونلاين): ياخد 300 عملة + 100 XP + بطاقات الخصم الـ3
   - الخسران (أونلاين): يخسر بطاقاته الـ3 اللي لعب بيها
   - تطوير البطاقات بالكوينز (cardLevels): كل تطوير +15 قوة (حد أقصى Lv.5)
   قاعدة البيانات:
   - users_data/{user}/cards/{cardId}      → عدد البطاقات
   - users_data/{user}/cardLevels/{cardId} → مستوى تطوير البطاقة
   - users_data/{user}/coins | xp
   - battles/{battleId}                    → غرف المعارك الأونلاين
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, remove, push, onValue, currentUser, isLoggedIn, showToast, escapeHtml, openModal } from '../firebase-shared.js';
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { RARITY as RARITY_BASE, CARDS, cardById, cardName as cardNameBase, cardPower, upCost, RARITY_ORDER, TOP_GLOW_FROM } from './cards-data.js';

// ═══════════════════════════════════════════════════════════════════
// 1. الترجمة (i18n)
// ═══════════════════════════════════════════════════════════════════
let lang = localStorage.getItem('lang') || 'ar';

const T = {
    ar: {
        title: "⚔️ ساحة معارك البطاقات", back: "⬅ رجوع", coins: "عملة",
        selectDesc: "🎮 كوّن فريقك: اختار 3 بطاقات — وطور بطاقاتك بالكوينز عشان قوتها تزيد!",
        teamLabel: "فريقك", needThree: "لازم تختار 3 بطاقات الأول",
        power: "الطاقة", round: "جولة", chooseCard: "اختار بطاقة تلعب بيها...",
        botName: "🤖 بوت الساحة الخارق", you: "أنت", vs: "ضد",
        modeBot: "🤖 العب ضد البوت", modePvp: "🌐 تحدَّ لاعب حقيقي",
        thinking: "🤖 البوت بيفكر...", oppPicking: "⏳ الخصم بيختار بطاقته...",
        youWinRound: "✅ كسبت الجولة!", botWinRound: "❌ الخصم كسب الجولة!", drawRound: "⚖️ طاقة متساوية — حسم العشوائية!",
        winMatch: "🏆 كسبت المعركة!", loseMatch: "💀 خسرت المعركة!",
        winDesc: "خدت 300 عملة + 100 XP!", loseDesc: "خدت 25 XP خبرة تعويضية... جرّب تاني!",
        winPvpDesc: "خدت 300 عملة + 100 XP + بطاقات الخصم الـ 3 🃏!",
        losePvpDesc: "بطاقاتك الـ 3 اللي لعبت بيها رحت للخصم! خدت 25 XP تعويض.",
        stealLine: "🃏 بطاقات الخصم اتضافات لمخزونك", loseCardsLine: "🃏 بطاقاتك الـ 3 رحت للخصم",
        playAgain: "🔄 معركة جديدة", loginFirst: "سجل دخول الأول عشان تقاتل 🪙",
        needCards: "محتاج 3 بطاقات على الأقل عشان تقاتل!", emptyInv: "مخزونك فاضي!",
        goBuy: "🎰 روح اشتري بطاقات من المزاد",
        botTaunt: ["🤖 فريقك ضعيف يا بطل...", "🤖 أنا اتحسنت.. وريني شطارتك!", "🤖 هيجي دمك قريب!", "🤖 بطاقاتي جاهزة للقتل!"],
        // التطوير
        upBtn: "⬆️ تطوير", upCostSuffix: "🪙", maxLv: "MAX", lvPrefix: "Lv.",
        upgraded: "⬆️ مبروك! البطاقة بقت Lv.", upFailed: "❌ مشكلة في التطوير",
        // الأونلاين
        openChallenges: "🌐 تحديات مفتوحة دلوقتي", joinBtn: "⚔️ انضم", createCh: "🚀 اعمل تحدٍ جديد",
        noChal: "مفيش تحديات مفتوحة دلوقتي. اعمل تحدٍ جديد واستنى لاعب ينضم ليك!",
        waiting: "⏳ في انتظار لاعب حقيقي يقبل التحدي...", waitHint: "التحدي بيتلغى تلقائياً بعد 10 دقايق",
        cancelCh: "🗑️ إلغاء التحدي", challengeCanceled: "التحدي اتلغى",
        forfeitBtn: "🏳️ استسلام", forfeitConfirm: "متأكد؟ استسلامك معناه إن بطاقاتك الـ 3 هتروح للخصم!",
        oppForfeit: "🏳️ خصمك استسلم — كسبت!",
        battleGone: "المعركة اتقفلت", joinedOk: "✅ انضممت للمعركة!"
    },
    en: {
        title: "⚔️ Card Battle Arena", back: "⬅ Back", coins: "Coins",
        selectDesc: "🎮 Build Your Team: Pick 3 cards — upgrade them with coins for more power!",
        teamLabel: "Your Team", needThree: "You must pick 3 cards first",
        power: "Power", round: "Round", chooseCard: "Choose a card to play...",
        botName: "🤖 Arena Master Bot", you: "You", vs: "vs",
        modeBot: "🤖 Play vs Bot", modePvp: "🌐 Challenge a Real Player",
        thinking: "🤖 Bot is thinking...", oppPicking: "⏳ Opponent is picking...",
        youWinRound: "✅ You won the round!", botWinRound: "❌ Opponent won the round!", drawRound: "⚖️ Equal power — luck decides!",
        winMatch: "🏆 You won the battle!", loseMatch: "💀 You lost the battle!",
        winDesc: "You got 300 coins + 100 XP!", loseDesc: "You got 25 XP as consolation... Try again!",
        winPvpDesc: "You got 300 coins + 100 XP + your opponent's 3 cards 🃏!",
        losePvpDesc: "Your 3 battle cards went to your opponent! You got 25 XP consolation.",
        stealLine: "🃏 Opponent's cards added to your inventory", loseCardsLine: "🃏 Your 3 cards went to your opponent",
        playAgain: "🔄 New Battle", loginFirst: "Please log in to battle 🪙",
        needCards: "You need at least 3 cards to battle!", emptyInv: "Your inventory is empty!",
        goBuy: "🎰 Go buy cards from the Auction",
        botTaunt: ["🤖 Weak team, hero...", "🤖 I got smarter.. show me!", "🤖 Your defeat is near!", "🤖 My cards are ready to kill!"],
        upBtn: "⬆️ Upgrade", upCostSuffix: "🪙", maxLv: "MAX", lvPrefix: "Lv.",
        upgraded: "⬆️ Congrats! Card is now Lv.", upFailed: "❌ Upgrade failed",
        openChallenges: "🌐 Open Challenges", joinBtn: "⚔️ Join", createCh: "🚀 Create New Challenge",
        noChal: "No open challenges right now. Create one and wait for a player to join!",
        waiting: "⏳ Waiting for a real player to accept...", waitHint: "Challenge auto-cancels after 10 minutes",
        cancelCh: "🗑️ Cancel Challenge", challengeCanceled: "Challenge canceled",
        forfeitBtn: "🏳️ Forfeit", forfeitConfirm: "Sure? Forfeiting means your 3 cards go to your opponent!",
        oppForfeit: "🏳️ Your opponent forfeited — you win!",
        battleGone: "Battle closed", joinedOk: "✅ You joined the battle!"
    }
};
const t = () => T[lang];

// ═══════════════════════════════════════════════════════════════════
// 2. البطاقات والندرة — من الوحدة المشتركة features/cards-data.js (98 بطاقة × 11 تير)
// ═══════════════════════════════════════════════════════════════════
const RARITY = RARITY_BASE;
const cardName = (c) => cardNameBase(c, lang);
const isTopTier = (rarity) => RARITY_ORDER.indexOf(rarity) >= TOP_GLOW_FROM; // من أسطوري وفوق → توهج

// ═══════════════════════════════════════════════════════════════════
// 3. نظام التطوير (Upgrade System) — التكلفة بتعلى مع التير
// ═══════════════════════════════════════════════════════════════════
const MAX_LV = 20;
const POWER_PER_LV = 15;

// ═══════════════════════════════════════════════════════════════════
// 4. متغيرات الحالة
// ═══════════════════════════════════════════════════════════════════
let myCards = {};
let cardLevels = {};            // مستويات تطوير بطاقاتي
let teamIds = [];               // اختيارات اللاعب
let mode = 'bot';               // 'bot' | 'pvp'
let playerHand = [];            // [{id, lvl}]
let botHand = [];               // [{id, lvl}]
let round = 0, playerScore = 0, botScore = 0;
let busy = false;

// PvP
let myBattleId = null;
let myBattleRef = null;         // دالة إلغاء الاشتراك
let myRole = null;              // 'p1' | 'p2'
let pvpAnim = { lastRound: 0, busy: false };
let openChallenges = {};

const WIN_COINS = 300, WIN_XP = 100, LOSE_XP = 25;

// ═══════════════════════════════════════════════════════════════════
// 5. الشاشات (البانر بيتخفي تلقائياً — إصلاح علوق "كسبت الجولة")
// ═══════════════════════════════════════════════════════════════════
function showScreen(id) {
    const banner = document.getElementById('roundBanner');
    if (banner) banner.classList.remove('show');
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════
// 6. شاشة اختيار الفريق + التطوير
// ═══════════════════════════════════════════════════════════════════
function renderSelect() {
    const grid = document.getElementById('selectGrid');
    const entries = Object.entries(myCards).filter(([, qty]) => qty > 0);

    if (entries.length === 0) {
        grid.innerHTML = `
            <div class="empty-box" style="grid-column:1/-1;">
                <div style="font-size:50px;">🎴</div>
                <p>${t().emptyInv}</p>
                <a href="auctions.html" class="btn-start" style="display:inline-block; text-decoration:none; width:auto; padding:12px 30px;">${t().goBuy}</a>
            </div>`;
        document.getElementById('teamBar').style.display = 'none';
        return;
    }

    grid.innerHTML = entries.map(([cardId, qty]) => {
        const card = cardById(cardId);
        if (!card) return '';
        const r = RARITY[card.rarity];
        const lvl = cardLevels[cardId] || 1;
        const pw = cardPower(card, lvl);
        const selected = teamIds.includes(cardId);
        const cost = upCost(card, lvl);
        return `
        <div class="battle-card ${selected ? 'selected' : ''}" onclick="window._toggleTeamSelect('${cardId}')">
            <div class="poster-wrap">
                <img src="${card.image}" alt="${escapeHtml(cardName(card))}" class="poster" loading="lazy">
                <span class="rarity-badge" style="background:${r.color}; ${card.rarity !== 'common' ? 'color:#fff;' : ''}">${lang === 'ar' ? r.label_ar : r.label_en}</span>
                <span class="qty-badge">x${qty}</span>
                ${isTopTier(card.rarity) ? '<span class="leg-glow"></span>' : ''}
            </div>
            <div class="bc-info">
                <div class="bc-name">${escapeHtml(cardName(card))}</div>
                <div class="bc-power">⚡ ${t().power}: <b style="color:${r.color}">${pw}</b> <span class="lv-tag">${t().lvPrefix}${lvl}</span></div>
                ${lvl < MAX_LV
                    ? `<button class="up-btn" onclick="event.stopPropagation(); window._upgradeCard('${cardId}')">${t().upBtn} (${cost} ${t().upCostSuffix})</button>`
                    : `<div class="lv-max">⭐ ${t().maxLv}</div>`}
                <div class="check-mark">${selected ? '✔' : ''}</div>
            </div>
        </div>`;
    }).join('');

    renderTeamBar();
}

function renderTeamBar() {
    const bar = document.getElementById('teamBar');
    const slots = [0, 1, 2].map(i => {
        const card = teamIds[i] ? cardById(teamIds[i]) : null;
        return card
            ? `<div class="team-slot filled"><img src="${card.image}" alt=""><span>${escapeHtml(cardName(card))}</span></div>`
            : `<div class="team-slot">${i + 1}️⃣</div>`;
    }).join('');

    const full = teamIds.length === 3;
    bar.innerHTML = `
        <div class="team-slots">${slots}</div>
        <div class="mode-btns">
            <button class="btn-start" ${full ? '' : 'disabled'} onclick="window._startBotBattle()">🤖 ${lang === 'ar' ? 'العب ضد البوت' : 'Play vs Bot'}</button>
            <button class="btn-pvp" ${full ? '' : 'disabled'} onclick="window._startPvp()">🌐 ${lang === 'ar' ? 'تحدَّ لاعب حقيقي' : 'Challenge a Real Player'}</button>
        </div>
        ${full ? '' : `<div class="hint">${t().needThree}</div>`}`;
    bar.style.display = 'flex';
}

window._toggleTeamSelect = (cardId) => {
    if (busy) return;
    const idx = teamIds.indexOf(cardId);
    if (idx >= 0) { teamIds.splice(idx, 1); renderSelect(); return; }
    if (teamIds.length >= 3) return showToast('⚠️ ' + t().needThree, 'info');
    // 🛡️ حماية: البطاقة لازم تكون مملوكة (يمنع بناء فريق من بطاقات مش في المخزون)
    if (!(Number(myCards[cardId]) > 0)) return;
    teamIds.push(cardId);
    renderSelect();
};

/* فلترة الفريق: بطاقات مملوكة فعلاً فقط */
const validTeamIds = () => teamIds.filter(id => Number(myCards[id]) > 0);

// ═══════════════════════════════════════════════════════════════════
// 7. تطوير البطاقة بالكوينز
// ═══════════════════════════════════════════════════════════════════
window._upgradeCard = async (cardId) => {
    const lvl = Number(cardLevels[cardId]) || 1;
    if (lvl >= MAX_LV) return;
    const cost = upCost(cardId, lvl);

    // خصم الكوينز مع التحقق من الرصيد (Number() عشان لو الرصيد مخزن كنص مش يتضخم)
    const coinRes = await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => {
        const balance = Number(curr) || 0;
        if (balance < cost) return; // abort
        return balance - cost;
    });
    if (!coinRes.committed) return showToast('💸 ' + (lang === 'ar' ? 'عملاتك مش كفاية!' : 'Not enough coins!'), 'error');

    // رفع المستوى
    const lvRes = await runTransaction(ref(db, `users_data/${currentUser}/cardLevels/${cardId}`), (curr) => Math.min(MAX_LV, (Number(curr) || 1) + 1));
    if (!lvRes.committed) {
        await runTransaction(ref(db, `users_data/${currentUser}/coins`), (c) => (c || 0) + cost);
        return showToast('❌ ' + t().upFailed, 'error');
    }
    const newLvl = lvRes.snapshot.val();
    showToast(`⬆️ ${t().upgraded} ${newLvl}! (+${(newLvl - 1) * POWER_PER_LV} ${t().power})`, 'success');
};

// ═══════════════════════════════════════════════════════════════════
// 8. وضع البوت — بوت أصعب بكتير 🔥
// ═══════════════════════════════════════════════════════════════════
window._startBotBattle = () => {
    if (teamIds.length < 3) return showToast('⚠️ ' + t().needThree, 'error');
    mode = 'bot';
    hideForfeit();

    playerHand = teamIds.map(id => ({ id, lvl: Number(cardLevels[id]) || 1 }));
    playerScore = 0; botScore = 0; round = 0; busy = false;

    // 🔥 فريق البوت بقى أقوى: التيرات العالية أوزانها أكبر
    const pool = [];
    CARDS.forEach(c => {
        const w = { common: 10, rare: 20, epic: 30, legendary: 40, mythic: 45, exotic: 50, immortal: 55, divine: 60, secret: 65, godly: 70, transcendent: 75 }[c.rarity];
        for (let i = 0; i < w; i++) pool.push(c.id);
    });
    const botPicks = new Set();
    while (botPicks.size < 3) botPicks.add(pool[Math.floor(Math.random() * pool.length)]);
    botHand = [...botPicks].map(id => ({ id, lvl: 1 }));

    const taunts = t().botTaunt;
    showToast(taunts[Math.floor(Math.random() * taunts.length)], 'info');

    setBattleNames(t().you, t().botName);
    showScreen('screen-battle');
    nextRound();
};

// 🧠 عقل البوت الأصعب: عشوائية 5% بس + بيحسم بالأقوى وقت اللزوم
function smartBotPick() {
    const sorted = [...botHand].sort((a, b) => cardPower(b.id, b.lvl) - cardPower(a.id, a.lvl));

    if (Math.random() < 0.05) return sorted[Math.floor(Math.random() * sorted.length)];

    // الجولة الحاسمة → أقوى بطاقة فوراً
    if (playerScore >= 1 || botScore >= 1) return sorted[0];

    // أول جولة → أقوى بطاقة (ضغط مبكر)
    if (round === 1) return sorted[0];

    // بعدها → قوة متوسطة مع حفظ الأقوى للحسم
    return sorted.length > 1 ? sorted[1] : sorted[0];
}

// ═══════════════════════════════════════════════════════════════════
// 9. جولات البوت
// ═══════════════════════════════════════════════════════════════════
function nextRound() {
    round++;
    busy = false;
    document.getElementById('roundNum').textContent = `${t().round} ${round}/3`;
    updateScoreboard();
    document.getElementById('promptText').textContent = t().chooseCard;
    renderBotHand();

    document.getElementById('botSlot').innerHTML = `<div class="slot-card mystery">❓</div>`;
    document.getElementById('playerSlot').innerHTML = `<div class="slot-card empty-slot">${lang === 'ar' ? 'اختر من يدك' : 'Pick from hand'}</div>`;
}

function renderBotHand() {
    const hand = document.getElementById('playerHand');
    hand.innerHTML = playerHand.map(({ id, lvl }) => {
        const card = cardById(id);
        const r = RARITY[card.rarity];
        const pw = cardPower(card, lvl);
        return `
        <div class="hand-card ${isTopTier(card.rarity) ? 'leg-glow' : ''}" onclick="window._playCard('${id}')">
            <img src="${card.image}" alt="${escapeHtml(cardName(card))}">
            <div class="hc-name">${escapeHtml(cardName(card))}</div>
            <div class="hc-power" style="color:${r.color}">⚡ ${pw}</div>
        </div>`;
    }).join('');
}

window._playCard = (cardId) => {
    if (busy) return;
    busy = true;

    const playerEntry = playerHand.find(h => h.id === cardId);
    const playerCard = cardById(cardId);
    const botEntry = smartBotPick();
    const botCard = cardById(botEntry.id);

    playerHand = playerHand.filter(h => h.id !== cardId);
    botHand = botHand.filter(h => h.id !== botEntry.id);

    document.getElementById('promptText').textContent = t().thinking;
    const playerSlot = document.getElementById('playerSlot');
    playerSlot.innerHTML = slotCardHtml(playerCard, playerEntry.lvl);
    playerSlot.querySelector('.slot-card').classList.add('fly-in');

    setTimeout(() => {
        const botSlot = document.getElementById('botSlot');
        botSlot.innerHTML = slotCardHtml(botCard, botEntry.lvl);
        botSlot.querySelector('.slot-card').classList.add('fly-in');

        setTimeout(() => clashAndJudge(playerCard, playerEntry.lvl, botCard, botEntry.lvl, (pWin, pPow, bPow) => {
            const banner = document.getElementById('roundBanner');
            let roundWinner;
            if (pPow > bPow) roundWinner = 'player';
            else if (bPow > pPow) roundWinner = 'bot';
            else roundWinner = Math.random() < 0.5 ? 'player' : 'bot';

            if (roundWinner === 'player') playerScore++;
            else botScore++;

            banner.textContent =
                pPow === bPow ? t().drawRound :
                roundWinner === 'player' ? `${t().youWinRound} (⚡${pPow} ${t().vs} ⚡${bPow})` :
                `${t().botWinRound} (⚡${bPow} ${t().vs} ⚡${pPow})`;
            banner.className = 'round-banner show ' + (roundWinner === 'player' ? 'win' : 'lose');
            updateScoreboard();

            setTimeout(() => {
                if (playerScore >= 2 || botScore >= 2 || round >= 3) endBotMatch();
                else nextRound();
            }, 1800);
        }), 550);
    }, 800);
};

// 💥 تأثير الارطدام المشترك (بوت + أونلاين)
function clashAndJudge(pCard, pLvl, bCard, bLvl, onJudge) {
    const arena = document.getElementById('arena');
    arena.classList.add('clashing');
    const impact = document.getElementById('impactFx');
    impact.classList.add('boom');

    setTimeout(() => {
        arena.classList.remove('clashing');
        impact.classList.remove('boom');
        const pcEl = document.querySelector('#playerSlot .slot-card');
        const bcEl = document.querySelector('#botSlot .slot-card');
        const pPow = cardPower(pCard, pLvl);
        const bPow = cardPower(bCard, bLvl);
        const pWin = pPow > bPow || (pPow === bPow && Math.random() < 0.5);
        (pWin ? pcEl : bcEl).classList.add('winner');
        (pWin ? bcEl : pcEl).classList.add('loser');
        onJudge(pWin, pPow, bPow);
    }, 550);
}

function slotCardHtml(card, lvl = 1) {
    const r = RARITY[card.rarity];
    return `
        <div class="slot-card ${isTopTier(card.rarity) ? 'leg-glow' : ''}">
            <img src="${card.image}" alt="${escapeHtml(cardName(card))}">
            <span class="rarity-badge" style="background:${r.color}; ${card.rarity !== 'common' ? 'color:#fff;' : ''}">${lang === 'ar' ? r.label_ar : r.label_en}</span>
            <div class="power-pop" style="color:${r.color}">⚡ ${cardPower(card, lvl)}</div>
        </div>`;
}

function updateScoreboard() {
    document.getElementById('pScore').textContent = '⭐'.repeat(playerScore) || '—';
    document.getElementById('bScore').textContent = '⭐'.repeat(botScore) || '—';
}

function setBattleNames(myName, oppName) {
    document.getElementById('pName').textContent = myName;
    document.getElementById('oppName').textContent = oppName;
}

function hideForfeit() {
    document.getElementById('forfeitBtn').style.display = 'none';
}
function showForfeit() {
    document.getElementById('forfeitBtn').style.display = 'inline-block';
}

async function endBotMatch() {
    const won = playerScore > botScore;
    showResultScreen(won, false);
    if (won) {
        await runTransaction(ref(db, `users_data/${currentUser}/coins`), (c) => (Number(c) || 0) + WIN_COINS);
        await runTransaction(ref(db, `users_data/${currentUser}/xp`), (x) => (Number(x) || 0) + WIN_XP);
        showToast(`🪙 +${WIN_COINS} | ✨ +${WIN_XP} XP`, 'success');
    } else {
        await runTransaction(ref(db, `users_data/${currentUser}/xp`), (x) => (Number(x) || 0) + LOSE_XP);
    }
}

// ═══════════════════════════════════════════════════════════════════
// 10. شاشة النتيجة (مشتركة)
// ═══════════════════════════════════════════════════════════════════
function showResultScreen(won, isPvp, forfeited = false) {
    const box = document.getElementById('resultBox');
    showScreen('screen-result');
    if (won && window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    const title = won ? t().winMatch : t().loseMatch;
    const cls = won ? 'win' : 'lose';
    const icon = won ? '🏆' : '💀';
    let desc = won ? (isPvp ? t().winPvpDesc : t().winDesc) : (isPvp ? t().losePvpDesc : t().loseDesc);
    if (forfeited && !won) desc = t().oppForfeit;
    const extra = isPvp ? (won ? `<div class="steal-line">🃏 ${t().stealLine}</div>` : `<div class="steal-line lose-line">🃏 ${t().loseCardsLine}</div>`) : '';
    const reward = won
        ? `<div class="reward-line">🪙 +${WIN_COINS} &nbsp;&nbsp; ✨ +${WIN_XP} XP</div>`
        : `<div class="reward-line dim">✨ +${LOSE_XP} XP</div>`;

    box.innerHTML = `
        <div class="result-icon">${icon}</div>
        <div class="result-title ${cls}">${title}</div>
        <div class="result-desc">${desc}</div>
        ${extra}
        ${reward}
        <button class="btn-start" onclick="window._resetBattle()">${t().playAgain}</button>`;
}

window._resetBattle = () => {
    cleanupPvp();
    showScreen('screen-select');
    renderSelect();
};

// ═══════════════════════════════════════════════════════════════════
// 11. 🌐 الأونلاين — إنشاء التحدي + اللوبي
// ═══════════════════════════════════════════════════════════════════
onValue(ref(db, 'battles'), (snap) => {
    openChallenges = snap.val() || {};
    // استعادة معركة بعد الـ refresh
    if (!myBattleRef && isLoggedIn()) {
        const mine = Object.entries(openChallenges).find(([id, b]) =>
            b && (b.p1 === currentUser || b.p2 === currentUser) && b.status !== 'done');
        if (mine) { myBattleId = mine[0]; subscribeBattle(myBattleId); }
    }
});

window._startPvp = () => {
    if (validTeamIds().length < 3) return showToast('⚠️ ' + t().needThree, 'error');
    mode = 'pvp';

    // 🛡️ لو أنا أصلاً في معركة شغالة — ارجعليها بدل ما أعمل/أنضم لتانية
    const mineActive = Object.entries(openChallenges).find(([id, b]) =>
        b && (b.p1 === currentUser || b.p2 === currentUser) && b.status === 'active');
    if (mineActive) {
        if (myBattleId !== mineActive[0] || !myBattleRef) { myBattleId = mineActive[0]; subscribeBattle(mineActive[0]); }
        return;
    }

    const fresh = Object.entries(openChallenges).filter(([id, b]) =>
        b && b.status === 'waiting' && b.p1 !== currentUser &&
        (Date.now() - (b.createdAt || 0) < 10 * 60 * 1000));

    if (fresh.length > 0) {
        const list = fresh.map(([id, b]) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#1a1a1a; border:1px solid #444; border-radius:10px; padding:12px 15px; margin-bottom:10px;">
                <span style="font-weight:900;">👤 ${escapeHtml(b.p1Name || b.p1)}</span>
                <button class="btn-pvp" style="padding:8px 20px;" onclick="window._joinBattle('${id}')">${t().joinBtn}</button>
            </div>`).join('');
        openModal(t().openChallenges, list + `
            <button class="btn-start" style="width:100%; margin-top:10px; background:linear-gradient(135deg,#2196f3,#0d47a1); color:#fff;" onclick="window._createChallenge()">${t().createCh}</button>
        `, '450px');
    } else {
        _createChallenge();
    }
};

/* 🧹 إلغاء تحدياتي الواقفة القديمة (عشان ميفضلش غرف ميتة بترجع بعد الـ refresh) */
async function removeMyStaleWaiting() {
    try {
        const snap = await get(ref(db, 'battles'));
        if (!snap.exists()) return;
        const updates = {};
        Object.entries(snap.val()).forEach(([id, b]) => {
            if (b && b.p1 === currentUser && b.status === 'waiting') updates[id] = null;
        });
        if (Object.keys(updates).length) await update(ref(db, 'battles'), updates);
    } catch (e) { /* تجاهل */ }
}

window._createChallenge = async () => {
    if (validTeamIds().length < 3) return showToast('⚠️ ' + t().needThree, 'error');
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    await removeMyStaleWaiting();
    const battleRef = push(ref(db, 'battles'));
    myBattleId = battleRef.key;
    const team = validTeamIds().map(id => ({ id, lvl: Number(cardLevels[id]) || 1 }));
    await set(battleRef, {
        p1: currentUser, p1Name: currentUser,
        team1: team, team2: null,
        pick1: null, pick2: null,
        s1: 0, s2: 0, round: 1,
        results: {},
        status: 'waiting', createdAt: Date.now()
    });
    subscribeBattle(myBattleId);
    document.getElementById('waitText').textContent = t().waiting;
    document.getElementById('waitHint').textContent = t().waitHint;
    showScreen('screen-wait');
};

window._cancelChallenge = async () => {
    if (myBattleId) {
        const snap = await get(ref(db, `battles/${myBattleId}`));
        if (snap.exists() && snap.val().status === 'waiting') await remove(ref(db, `battles/${myBattleId}`));
    }
    cleanupPvp();
    showScreen('screen-select');
    renderSelect();
    showToast('🗑️ ' + t().challengeCanceled, 'info');
};

window._joinBattle = async (id) => {
    if (validTeamIds().length < 3) return showToast('⚠️ ' + t().needThree, 'error');
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    await removeMyStaleWaiting(); // بتخلي تحديك الواقف قبل كده
    const team = validTeamIds().map(cid => ({ id: cid, lvl: Number(cardLevels[cid]) || 1 }));
    const res = await runTransaction(ref(db, `battles/${id}`), (b) => {
        if (!b || b.status !== 'waiting') return; // اتاخدت قبلي
        if (b.p1 === currentUser) return;         // مش ممكن تنضم لتحديك
        b.p2 = currentUser;
        b.p2Name = currentUser;
        b.team2 = team;
        b.status = 'active';
        return b;
    });
    if (!res.committed) return showToast('⚠️ ' + t().battleGone, 'error');

    myBattleId = id;
    subscribeBattle(id);
    showToast('⚔️ ' + t().joinedOk, 'success');
};

function cleanupPvp() {
    if (myBattleRef) { myBattleRef(); myBattleRef = null; }
    myBattleId = null;
    myRole = null;
    pvpAnim = { lastRound: 0, busy: false };
}

// ═══════════════════════════════════════════════════════════════════
// 12. 🌐 محرك المعركة الأونلاين (Live Sync)
// ═══════════════════════════════════════════════════════════════════
function subscribeBattle(id) {
    cleanupPvp();
    myBattleId = id;
    myBattleRef = onValue(ref(db, `battles/${id}`), (snap) => {
        const b = snap.val();
        if (!b) { // المعركة اتمسحت
            cleanupPvp();
            // لو لسه واقف على شاشة النتيجة — ماتطردش اللاعب ولا toast
            const onResult = document.querySelector('.screen.active')?.id === 'screen-result';
            if (!onResult) {
                showToast('⚠️ ' + t().battleGone, 'info');
                showScreen('screen-select');
                renderSelect();
            }
            return;
        }
        handlePvpState(b);
    });
}

function handlePvpState(b) {
    myRole = (b.p1 === currentUser) ? 'p1' : 'p2';
    const oppRole = myRole === 'p1' ? 'p2' : 'p1';

    // لو لسه في الانتظار (أنا المضيف)
    if (b.status === 'waiting') {
        document.getElementById('waitText').textContent = t().waiting;
        document.getElementById('waitHint').textContent = t().waitHint;
        showScreen('screen-wait');
        return;
    }

    mode = 'pvp';
    setBattleNames(t().you, (b[oppRole + 'Name'] || b[oppRole]));
    showForfeit();
    showScreen('screen-battle');
    document.getElementById('roundNum').textContent = `${t().round} ${b.round}/3`;
    playerScore = myRole === 'p1' ? (b.s1 || 0) : (b.s2 || 0);
    botScore = myRole === 'p1' ? (b.s2 || 0) : (b.s1 || 0);
    updateScoreboard();

    const lastKey = b.status === 'done' ? b.round : (b.round - 1);
    const result = b.results ? b.results[lastKey] : null;

    // نتيجة جديدة لم تُعرض بعد → أنيميشن الارطدام
    if (result && pvpAnim.lastRound < Number(lastKey) && !pvpAnim.busy) {
        pvpAnim.busy = true;
        pvpAnim.lastRound = Number(lastKey);
        animatePvpRound(result, b);
        return;
    }
    if (pvpAnim.busy) return;

    if (b.status === 'done') { finishPvp(b); return; }

    renderPvpTurn(b);
}

function animatePvpRound(result, b) {
    const myCardId = myRole === 'p1' ? result.c1 : result.c2;
    const oppCardId = myRole === 'p1' ? result.c2 : result.c1;
    const myLvl = findLvl(b, myRole, myCardId);
    const oppLvl = findLvl(b, myRole === 'p1' ? 'p2' : 'p1', oppCardId);

    document.getElementById('playerSlot').innerHTML = slotCardHtml(cardById(myCardId), myLvl);
    document.getElementById('botSlot').innerHTML = slotCardHtml(cardById(oppCardId), oppLvl);
    document.getElementById('playerHand').innerHTML = '';
    document.getElementById('promptText').textContent = '💥 ' + (lang === 'ar' ? 'ارطدمت!' : 'Clash!');
    document.querySelector('#playerSlot .slot-card').classList.add('fly-in');
    document.querySelector('#botSlot .slot-card').classList.add('fly-in');

    setTimeout(() => {
        clashAndJudge(cardById(myCardId), myLvl, cardById(oppCardId), oppLvl, (pWin, pPow, oPow) => {
            const iWon = result.w === myRole;
            const banner = document.getElementById('roundBanner');
            banner.textContent =
                result.tie ? t().drawRound :
                iWon ? `${t().youWinRound} (⚡${pPow} ${t().vs} ⚡${oPow})` :
                `${t().botWinRound} (⚡${oPow} ${t().vs} ⚡${pPow})`;
            banner.className = 'round-banner show ' + (iWon ? 'win' : 'lose');
        });

        setTimeout(() => {
            pvpAnim.busy = false;
            const fresh = openChallenges[myBattleId];
            if (fresh && fresh.status === 'done') finishPvp(fresh);
            else if (fresh) renderPvpTurn(fresh);
        }, 1900);
    }, 900);
}

function findLvl(b, role, cardId) {
    const team = role === 'p1' ? b.team1 : b.team2;
    const entry = (team || []).find(c => c.id === cardId);
    return entry ? (Number(entry.lvl) || 1) : 1;
}

function renderPvpTurn(b) {
    const myTeam = (myRole === 'p1' ? b.team1 : b.team2) || [];
    const used = Object.values(b.results || {}).map(r => myRole === 'p1' ? r.c1 : r.c2);
    const myPick = myRole === 'p1' ? b.pick1 : b.pick2;
    const oppPick = myRole === 'p1' ? b.pick2 : b.pick1;

    document.getElementById('roundNum').textContent = `${t().round} ${b.round}/3`;
    playerScore = myRole === 'p1' ? (b.s1 || 0) : (b.s2 || 0);
    botScore = myRole === 'p1' ? (b.s2 || 0) : (b.s1 || 0);
    updateScoreboard();

    const hand = myTeam.filter(c => !used.includes(c.id));
    const handEl = document.getElementById('playerHand');

    if (myPick) {
        // أنا اخترت — مستني الخصم
        handEl.innerHTML = '';
        const myLvl = findLvl(b, myRole, myPick);
        document.getElementById('playerSlot').innerHTML = slotCardHtml(cardById(myPick), myLvl);
        document.getElementById('playerSlot').querySelector('.slot-card').classList.add('fly-in');
        document.getElementById('botSlot').innerHTML = `<div class="slot-card mystery">❓</div>`;
        document.getElementById('promptText').textContent = t().oppPicking;
    } else {
        document.getElementById('playerSlot').innerHTML = `<div class="slot-card empty-slot">${lang === 'ar' ? 'اختر من يدك' : 'Pick from hand'}</div>`;
        document.getElementById('botSlot').innerHTML = `<div class="slot-card mystery">❓</div>`;
        document.getElementById('promptText').textContent = t().chooseCard;
        handEl.innerHTML = hand.map(({ id, lvl }) => {
            const card = cardById(id);
            const r = RARITY[card.rarity];
            return `
            <div class="hand-card ${isTopTier(card.rarity) ? 'leg-glow' : ''}" onclick="window._pvpPick('${id}')">
                <img src="${card.image}" alt="${escapeHtml(cardName(card))}">
                <div class="hc-name">${escapeHtml(cardName(card))}</div>
                <div class="hc-power" style="color:${r.color}">⚡ ${cardPower(card, lvl)}</div>
            </div>`;
        }).join('');
    }
}

// المزايدة (اختيار البطاقة) — والتحكيم بيحصل جوّه نفس الـ Transaction
window._pvpPick = (cardId) => {
    if (pvpAnim.busy || !myBattleId) return;
    const roleNum = myRole === 'p1' ? 1 : 2;

    runTransaction(ref(db, `battles/${myBattleId}`), (b) => {
        if (!b || b.status !== 'active') return;
        if (b['pick' + roleNum]) return; // اخترت قبل كده
        const used = Object.values(b.results || {}).map(r => roleNum === 1 ? r.c1 : r.c2);
        if (used.includes(cardId)) return;
        if (!(b['team' + roleNum] || []).some(c => c.id === cardId)) return;

        b['pick' + roleNum] = cardId;

        // ═══ التحكيم: الاتنين اختاروا → نحسب الجولة ═══
        const other = roleNum === 1 ? 2 : 1;
        if (b['pick' + other]) {
            const c1 = cardById(b.pick1), c2 = cardById(b.pick2);
            const lvl1 = (b.team1 || []).find(x => x.id === b.pick1)?.lvl || 1;
            const lvl2 = (b.team2 || []).find(x => x.id === b.pick2)?.lvl || 1;
            const pw1 = cardPower(c1, lvl1), pw2 = cardPower(c2, lvl2);

            let w;
            if (pw1 > pw2) w = 'p1';
            else if (pw2 > pw1) w = 'p2';
            // تعادل → حسم ثابت (اسم اللاعب) عشان العميلين يوصلوا لنفس النتيجة
            else w = String(b.p1Name || '').toLowerCase() <= String(b.p2Name || '').toLowerCase() ? 'p1' : 'p2';

            b.results = b.results || {};
            b.results[b.round] = { w, c1: b.pick1, c2: b.pick2, pw1, pw2, tie: pw1 === pw2 };
            b.s1 = (b.s1 || 0) + (w === 'p1' ? 1 : 0);
            b.s2 = (b.s2 || 0) + (w === 'p2' ? 1 : 0);

            if (b.s1 >= 2 || b.s2 >= 2 || b.round >= 3) {
                b.status = 'done';
                b.winner = b.s1 > b.s2 ? 'p1' : 'p2';
                b.round = b.round; // الجولة الأخيرة
            } else {
                b.round = b.round + 1;
                b.pick1 = null;
                b.pick2 = null;
            }
        }
        return b;
    });
};

// ═══════════════════════════════════════════════════════════════════
// 13. 🏆 حسم المعركة الأونلاين: مكافآت + سرقة بطاقات الخصم
// ═══════════════════════════════════════════════════════════════════
async function finishPvp(b) {
    hideForfeit();
    const iWon = b.winner === myRole;
    const forfeited = b.forfeit === myRole;
    showResultScreen(iWon, true, forfeited);

    // الحسم مرة واحدة بس (أول عميل يوصل بياخد المهمة)
    const claim = await runTransaction(ref(db, `battles/${myBattleId}/settled`), (curr) => {
        if (curr) return; // اتحسم قبل كده
        return true;
    });
    if (!claim.committed) return;

    const winnerRole = b.winner;
    const loserRole = winnerRole === 'p1' ? 'p2' : 'p1';
    const winnerUser = b[winnerRole];
    const loserUser = b[loserRole];
    if (!winnerUser || !loserUser) return;

    // 1. المكافآت (Number() يمنع تضخم الرصيد لو مخزن كنص)
    await runTransaction(ref(db, `users_data/${winnerUser}/coins`), (c) => (Number(c) || 0) + WIN_COINS);
    await runTransaction(ref(db, `users_data/${winnerUser}/xp`), (x) => (Number(x) || 0) + WIN_XP);
    await runTransaction(ref(db, `users_data/${loserUser}/xp`), (x) => (Number(x) || 0) + LOSE_XP);

    // 2. 🃏 سرقة البطاقات: بطاقات الخسران الـ 3 تروح للفائز
    const loserTeam = (loserRole === 'p1' ? b.team1 : b.team2) || [];
    for (const { id } of loserTeam) {
        const dec = await runTransaction(ref(db, `users_data/${loserUser}/cards/${id}`), (curr) => {
            const owned = Number(curr) || 0;
            if (owned <= 0) return; // مش مملوكه (مثلاً اتباع في المزاد) — نتجاهله
            return owned - 1;
        });
        if (dec.committed) {
            await runTransaction(ref(db, `users_data/${winnerUser}/cards/${id}`), (curr) => (Number(curr) || 0) + 1);
        }
    }

    // 3. تنبيهات
    if (winnerUser === currentUser) showToast(`🪙 +${WIN_COINS} | ✨ +${WIN_XP} XP | 🃏 بطاقات الخصم!`, 'success');

    // 4. مسح غرفة المعركة بعد شوية
    setTimeout(() => remove(ref(db, `battles/${myBattleId}`)).catch(() => {}), 5000);
}

window._forfeitPvp = () => {
    openModal(
        lang === 'ar' ? '🏳️ استسلام' : '🏳️ Forfeit',
        `<p style="color:#ccc; margin-bottom:15px;">${t().forfeitConfirm}</p>
         <div style="display:flex; gap:10px;">
            <button class="btn-pvp" style="flex:1; background:linear-gradient(135deg,#dc3545,#7f1d1d);" onclick="window._confirmForfeit()">✅ ${lang === 'ar' ? 'أيوه، استسلمت' : 'Yes, forfeit'}</button>
            <button class="btn-start" style="flex:1;" onclick="document.getElementById('nf-shared-modal').classList.remove('active')">❌ ${lang === 'ar' ? 'لأ، هكمّل' : 'No, continue'}</button>
         </div>`, '400px');
};

window._confirmForfeit = async () => {
    document.getElementById('nf-shared-modal')?.classList.remove('active');
    if (!myBattleId) return;
    await runTransaction(ref(db, `battles/${myBattleId}`), (b) => {
        if (!b || b.status !== 'active') return;
        b.status = 'done';
        b.winner = myRole === 'p1' ? 'p2' : 'p1';
        b.forfeit = myRole;
        return b;
    });
};

// ═══════════════════════════════════════════════════════════════════
// 14. تنظيف التحديات الميتة (أقدم من 10 دقايق ولسه في الانتظار)
// ═══════════════════════════════════════════════════════════════════
async function cleanupStaleChallenges() {
    try {
        const snap = await get(ref(db, 'battles'));
        if (!snap.exists()) return;
        const now = Date.now();
        for (const [id, b] of Object.entries(snap.val())) {
            if (b && b.status === 'waiting' && now - (b.createdAt || 0) > 10 * 60 * 1000) {
                await remove(ref(db, `battles/${id}`));
            }
        }
    } catch (e) { console.warn('cleanup:', e); }
}

// ═══════════════════════════════════════════════════════════════════
// 15. الترجمة والإقلاع
// ═══════════════════════════════════════════════════════════════════
function applyLang() {
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-ar]').forEach(el => { el.innerHTML = el.dataset[lang]; });
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.textContent = lang === 'ar' ? 'EN' : 'AR';
}

window.toggleBattleLang = () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', lang);
    applyLang();
    renderSelect();
};

applyLang();
cleanupStaleChallenges();

if (!isLoggedIn()) {
    document.getElementById('loginGate').style.display = 'flex';
    document.getElementById('battleApp').style.display = 'none';
} else {
    onValue(ref(db, `users_data/${currentUser}/cards`), (snap) => {
        myCards = snap.val() || {};
        renderSelect();
    });
    onValue(ref(db, `users_data/${currentUser}/cardLevels`), (snap) => {
        cardLevels = snap.val() || {};
        renderSelect();
    });
    onValue(ref(db, `users_data/${currentUser}/coins`), (snap) => {
        const el = document.getElementById('myCoins');
        if (el) el.textContent = (Number(snap.val()) || 0).toLocaleString('en-US');
    });
}
