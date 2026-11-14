/* ════════════════════════════════════════════════════════════════════
   FEATURE: MOVIE IMPOSTER GAME v3 — مود لعبة الجاسوس الجماعي
   ════════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, push, onValue, currentUser, showToast, escapeHtml } from './firebase-shared.js';
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const me = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();

// ─── Header coins ───
const headerCoinsEl = document.getElementById('headerCoins');
if (headerCoinsEl && me) {
    onValue(ref(db, `users_data/${me}/coins`), (snap) => {
        headerCoinsEl.textContent = snap.val() || 0;
    });
}

const nameInput = document.getElementById('playerName');
if (nameInput) {
    nameInput.value = localStorage.getItem('imp_playerName') || localStorage.getItem('loggedInUser') || '';
}

const MOVIES = [
    { key: 'conjuring', title: 'The Conjuring', image: 'pic/The Conjuring.jpg' },
    { key: 'fnaf', title: 'FNAF', image: 'pic/FNAF.jpg' },
    { key: 'thenun', title: 'The Nun', image: 'pic/The Nun.jpg' },
    { key: 'annabelle', title: 'Annabelle', image: 'pic/Annabelle.jpg' },
    { key: 'traintobusan', title: 'Train to Busan', image: 'pic/busan.jpg' },
    { key: 'scream', title: 'Scream', image: 'pic/Scream.jpeg' },
    { key: 'squidgame', title: 'Squid Game', image: 'pic/Squid Game.jpg' },
    { key: 'spiderman', title: 'Spider-Man', image: 'pic/Spider-Man.jpeg' },
    { key: 'avengers', title: 'Avengers', image: 'pic/Avengers.jpeg' },
    { key: 'avatar', title: 'Avatar', image: 'pic/Avatar.jpeg' },
    { key: 'venom', title: 'Venom', image: 'pic/Venom.jpeg' },
    { key: 'birdsofprey', title: 'Birds of Prey', image: 'pic/Birds of Prey.jpeg' },
    { key: 'mazerunner', title: 'The Maze Runner', image: 'pic/Maze Runner.jpeg' },
    { key: 'rambo', title: 'Rambo', image: 'pic/Rambo.jpg' },
    { key: 'fall', title: 'Fall', image: 'pic/Fall.jpeg' },
    { key: 'wednesday', title: 'Wednesday', image: 'pic/Wednesday.jpg' },
    { key: 'knivesout', title: 'Knives Out', image: 'pic/Knives Out.jpeg' },
    { key: 'elharifa', title: 'الحريفة', image: 'pic/Harifa.jpeg' },
    { key: 'eleskandarany', title: 'الإسكندراني', image: 'pic/El Eskandarany.jpeg' },
    { key: 'elserb', title: 'السرب', image: 'pic/El Serb.jpeg' },
    { key: 'elaref', title: 'العارف', image: 'pic/El Aref.jpeg' },
    { key: 'elmamar', title: 'الممر', image: 'pic/El Mamar.jpeg' },
    { key: 'rocky', title: 'روكي الغلابة', image: 'pic/Rocky El Ghalaba.jpg' },
    { key: 'beitelruby', title: 'بيت الروبي', image: 'pic/Beit El Ruby.jpeg' },
    { key: 'meratyx', title: 'مراتي إكس', image: 'pic/Meraty X.jpg' },
    { key: 'meratywzegty', title: 'مراتي وزوجتي', image: 'pic/Meraty W Zegty.jpeg' },
    { key: 'nadielregal', title: 'نادي الرجال السري', image: 'pic/Nadi El Regal.jpg' },
    { key: 'shako', title: 'شقو', image: 'pic/Shako.jpeg' },
    { key: 'barshama', title: 'برشامة', image: 'pic/Barshama.jpeg' },
    { key: 'misterx', title: 'مستر إكس', image: 'pic/Mister X.jpeg' },
    { key: 'tag', title: 'تاج', image: 'pic/Tag.jpg' },
    { key: 'restart', title: 'ريستارت', image: 'pic/Restart.jpg' },
    { key: 'akhyfok', title: 'أخي فوق الشجرة', image: 'pic/Akhy Fok El Shagara.jpeg' },
    { key: 'fasel', title: 'فاصل من اللحظات اللذيذة', image: 'pic/Fasel.jpg' },
    { key: 'bahebak', title: 'بحبك', image: 'pic/Bahebak.jpg' },
    { key: 'ahmedwaahmed', title: 'أحمد وأحمد', image: 'pic/Ahmed Wa Ahmed.jpeg' }
];

const GENERIC_QUESTIONS = [
    { q: "إيه رأيك في أحداث الفيلم بشكل عام؟", type: "text" },
    { q: "مين أكتر شخصية عجبتك في الفيلم؟", type: "text" },
    { q: "إيه أصعب مشهد أو أكتر مشهد رعباً في الفيلم؟", type: "text" },
    { q: "لو تقدر تغير حاجة في الفيلم، هتغير إيه؟", type: "text" },
    { q: "الفيلم ده يستاهل تقييم كام من 10؟ وليه؟", type: "text" }
];

let roomCode = null;
let myRole = 'player';
let roomData = null;
let currentRound = 0;
let answeredCurrent = false;
let voted = false;
let chatUnsubscribe = null;
let roomUnsubscribe = null;
let selectedVoteTarget = null;
const botAnswerTimers = {};
const botVoteTimers = {};
const botsAnsweredRounds = new Set();
let rewardsClaimedThisSession = false;
let lastRenderedRound = -1;
let timerInterval = null;

const BOT_NAMES = ["أحمد", "سارة", "محمد", "ليلى", "علي", "نور", "يوسف", "هنا", "كريم", "مريم"];

function getBotName() {
    const used = new Set();
    const players = (roomData && roomData.players) || {};
    Object.values(players).forEach(p => { if (p.name) used.add(p.name); });
    for (const name of BOT_NAMES) { if (!used.has(name)) return name; }
    return "بوت " + Math.floor(Math.random() * 1000);
}

function isBot(uid) { return String(uid).startsWith('bot_'); }

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function esc(s) { return escapeHtml(s ?? ''); }

function clearBotTimers() {
    Object.values(botAnswerTimers).forEach(t => clearTimeout(t));
    Object.values(botVoteTimers).forEach(t => clearTimeout(t));
    Object.keys(botAnswerTimers).forEach(k => delete botAnswerTimers[k]);
    Object.keys(botVoteTimers).forEach(k => delete botVoteTimers[k]);
    if (timerInterval) clearInterval(timerInterval);
}

function findQuizData(movieKey) {
    if (typeof allQuizzesData === 'undefined' || !allQuizzesData) return null;
    if (allQuizzesData[movieKey]) return allQuizzesData[movieKey];
    const lower = String(movieKey).toLowerCase();
    for (const key of Object.keys(allQuizzesData)) {
        if (key.toLowerCase() === lower) return allQuizzesData[key];
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════
// ROOM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

window._createImposterRoom = async function() {
    const name = (document.getElementById('playerName').value || '').trim();
    if (!name) { showToast('الرجاء إدخال اسمك', 'error'); return; }
    if (!me) { showToast('سجل دخول الأول', 'error'); return; }
    localStorage.setItem('imp_playerName', name);

    const code = generateCode();
    roomCode = code;
    myRole = 'host';
    const now = Date.now();

    await set(ref(db, `imposter_rooms/${code}`), {
        code, host: me, createdAt: now, status: 'waiting',
        players: { [me]: { name, role: 'player', ready: false, joinedAt: now } },
        movie: null, round: 0, currentQuestion: null, roundEndTime: 0,
        answers: {}, votes: {}, imposterGuess: null, imposterUid: null, finalResult: null
    });
    showToast(`تم إنشاء الغرفة بالكود: ${code}`, 'success');
    _joinRoomByCode(code);
};

window._joinImposterRoom = function() {
    const code = document.getElementById('joinCode').value.trim().toUpperCase();
    const name = (document.getElementById('playerName').value || '').trim();
    if (!code) { showToast('الرجاء إدخال كود الغرفة', 'error'); return; }
    if (!name) { showToast('الرجاء إدخال اسمك', 'error'); return; }
    if (!me) { showToast('سجل دخول الأول', 'error'); return; }
    localStorage.setItem('imp_playerName', name);
    _joinRoomByCode(code);
};

window._joinRoomByCode = async function(code) {
    roomCode = code;
    const snap = await get(ref(db, `imposter_rooms/${code}`));
    if (!snap.exists()) { showToast('كود الغرفة غير صحيح', 'error'); return; }
    const data = snap.val();
    const players = data.players || {};

    if (players[me]) {
        const name = localStorage.getItem('imp_playerName') || players[me].name || 'لاعب';
        if (players[me].name !== name) await update(ref(db, `imposter_rooms/${code}/players/${me}/name`), name);
    } else {
        if (Object.keys(players).length >= 8) { showToast('الغرفة ممتلئة', 'error'); return; }
        const name = localStorage.getItem('imp_playerName') || 'لاعب';
        await update(ref(db, `imposter_rooms/${code}/players/${me}`), { name, role: 'player', ready: false, joinedAt: Date.now() });
    }
    showToast('انضممت إلى الغرفة بنجاح', 'success');
    _listenRoom(code);
};

window._refreshImposterRoom = function() { if (roomCode) _listenRoom(roomCode); };

function _listenRoom(code) {
    if (roomUnsubscribe) roomUnsubscribe();
    roomUnsubscribe = onValue(ref(db, `imposter_rooms/${code}`), (snap) => {
        const data = snap.val();
        if (!data) return;
        roomData = data;
        if (data.imposterUid) myRole = (data.imposterUid === me) ? 'imposter' : 'player';

        switch (data.status) {
            case 'waiting': renderWaitingScreen(data); break;
            case 'reveal':  showRevealScreen(data); break;
            case 'qna':     showQNAScreen(data); break;
            case 'voting':  showVotingScreen(data); break;
            case 'ended':   showResultScreen(data); break;
        }
    });
}

function renderWaitingScreen(data) {
    const codeEl = document.getElementById('roomCodeDisplay');
    const bigEl = document.getElementById('roomCodeBig');
    const listEl = document.getElementById('playersList');
    const startBtn = document.getElementById('startGameBtn');
    const addBotBtn = document.getElementById('addBotBtn');

    if (codeEl) codeEl.textContent = data.code;
    if (bigEl) bigEl.textContent = data.code;
    showScreen('waitingScreen');

    const players = data.players || {};
    listEl.innerHTML = Object.values(players).map(p => `
        <div class="player-item">
            <span>${esc(p.name)} ${p.isBot ? '🤖' : ''}</span>
            <span class="player-role role-player">لاعب</span>
        </div>
    `).join('');

    const count = Object.keys(players).length;
    const isHost = me === data.host;
    if (startBtn) startBtn.style.display = (isHost && count >= 4) ? 'flex' : 'none';
    if (addBotBtn) addBotBtn.style.display = (isHost && count < 8) ? 'flex' : 'none';
}

window._addBotToRoom = async function() {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const players = roomData.players || {};
    if (Object.keys(players).length >= 8) { showToast('الغرفة ممتلئة', 'error'); return; }

    const botUid = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const botName = getBotName();
    await update(ref(db, `imposter_rooms/${roomCode}/players/${botUid}`), {
        name: botName, role: 'player', ready: true, joinedAt: Date.now(), isBot: true
    });
    showToast(`تم إضافة البوت: ${botName}`, 'success');
};

window._startImposterGame = async function() {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const players = roomData.players || {};
    if (Object.keys(players).length < 4) { showToast('4 لاعبين على الأقل', 'error'); return; }

    const movie = MOVIES[Math.floor(Math.random() * MOVIES.length)];
    const uids = Object.keys(players);
    const imposterUid = uids[Math.floor(Math.random() * uids.length)];
    const newPlayers = {};
    for (const uid of uids) {
        newPlayers[uid] = { ...players[uid], role: uid === imposterUid ? 'imposter' : 'player' };
    }
    await update(ref(db, `imposter_rooms/${roomCode}`), {
        status: 'reveal', movie, imposterUid, round: 0,
        answers: {}, votes: {}, imposterGuess: null, finalResult: null, players: newPlayers
    });
    showToast('تم بدء اللعبة!', 'success');
};

function showRevealScreen(data) {
    showScreen('revealScreen');
    const content = document.getElementById('revealContent');
    const readyBtn = document.getElementById('revealReadyBtn');
    const isImposter = data.imposterUid === me;

    if (isImposter) {
        content.innerHTML = `
            <div class="imposter-card">
                <h2>🕵️ أنت الجاسوس!</h2>
                <p>حاول تخمين الفيلم دون أن ينكشف أمرك!</p>
                <p style="font-size:14px;margin-top:15px;color:#ffd700;">💡 هتحتاج تخمن الفيلم صح في مرحلة التصويت عشان تكسب</p>
            </div>
        `;
    } else {
        content.innerHTML = `
            <div class="movie-reveal">
                <img src="${esc(data.movie.image)}" alt="${esc(data.movie.title)}" class="movie-poster" onerror="this.style.display='none'">
                <div class="movie-title">${esc(data.movie.title)}</div>
                <p style="color:#aaa;margin-top:10px;">كل اللاعبين يعرفون الفيلم باستثناء الجاسوس!</p>
            </div>
        `;
    }
    if (readyBtn) {
        readyBtn.style.display = (me === data.host) ? 'inline-block' : 'none';
        readyBtn.textContent = '🎬 ابدأ الجولات';
    }
}

window._proceedToQNA = async function() {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const question = pickQuestionForRound(roomData.movie.key, 1);
    await update(ref(db, `imposter_rooms/${roomCode}`), {
        status: 'qna', round: 1, currentQuestion: question, answers: {},
        roundEndTime: Date.now() + 30000 // 30 ثانية
    });
};

function pickQuestionForRound(movieKey, round) {
    const quizData = findQuizData(movieKey);
    if (quizData) {
        const allQs = [];
        for (const partKey in quizData) {
            if (Array.isArray(quizData[partKey])) allQs.push(...quizData[partKey]);
        }
        if (allQs.length > 0) {
            const q = allQs[Math.floor(Math.random() * allQs.length)];
            return { q: q.q_ar || q.q, type: 'options', options: q.options_ar || [], answer: q.answer };
        }
    }
    const gq = GENERIC_QUESTIONS[Math.floor(Math.random() * GENERIC_QUESTIONS.length)];
    return { q: gq.q, type: 'text' };
}

function showQNAScreen(data) {
    showScreen('qnaScreen');
    const newRound = data.round || 1;
    const question = data.currentQuestion;

    if (newRound !== lastRenderedRound) {
        lastRenderedRound = newRound;
        currentRound = newRound;
        answeredCurrent = false;
        document.getElementById('roundBadge').textContent = `الجولة ${currentRound} / 3`;
        document.getElementById('nextRoundBtn').style.display = 'none';
        if (question) {
            document.getElementById('questionText').textContent = question.q;
            renderQuestionOptions(question);
        }
    }

    // Timer Logic
    if (timerInterval) clearInterval(timerInterval);
    if (data.roundEndTime) {
        timerInterval = setInterval(() => {
            const left = Math.max(0, Math.ceil((data.roundEndTime - Date.now()) / 1000));
            const tEl = document.getElementById('roundTimer');
            if (tEl) {
                tEl.textContent = `⏱️ ${left}`;
                tEl.style.color = left <= 5 ? '#ff0000' : '#ffd700';
            }
            if (left <= 0) {
                clearInterval(timerInterval);
                if (me === data.host) window._nextImposterRound(true); // true = auto advance
            }
        }, 1000);
    }

    const answers = data.answers || {};
    answeredCurrent = Object.values(answers).some(a => a.uid === me && a.round === currentRound);

    const nextBtn = document.getElementById('nextRoundBtn');
    if (me === data.host) {
        nextBtn.style.display = 'inline-block';
        nextBtn.textContent = (currentRound >= 3) ? '🗳️ انتقل للتصويت' : '➡️ الجولة التالية';
    } else {
        nextBtn.style.display = 'none';
    }

    initImposterChat(roomCode);

    if (!botsAnsweredRounds.has(newRound)) {
        botsAnsweredRounds.add(newRound);
        scheduleBotAnswers(data, newRound);
    }
}

function renderQuestionOptions(question) {
    const optionsArea = document.getElementById('optionsArea');
    if (!optionsArea) return;
    if (question.type === 'options' && Array.isArray(question.options) && question.options.length > 0) {
        optionsArea.innerHTML = '';
        question.options.forEach((opt, i) => {
            const d = document.createElement('div');
            d.className = 'option';
            d.textContent = opt;
            d.onclick = () => submitQNAAnswer(opt, i === question.answer);
            optionsArea.appendChild(d);
        });
    } else {
        optionsArea.innerHTML = `<p style="color:#aaa;text-align:center;padding:15px;">أجب في الدردشة أسفله ✍️</p>`;
    }
}

function getBotAnswer(question, movieTitle, isImposter) {
    if (isImposter) {
        const vague = ["لا أعرف", "ممكن", "هو ده", "أظن", "مش متأكد", "أعتقد", "مفيش فكرة"];
        return vague[Math.floor(Math.random() * vague.length)];
    } else {
        if (question.type === 'options' && question.options && question.options.length > 0) {
            if (Math.random() < 0.7 && question.answer !== undefined && question.options[question.answer]) {
                return question.options[question.answer]; // 70% صح
            } else {
                return question.options[Math.floor(Math.random() * question.options.length)]; // 30% غلط
            }
        } else {
            const generic = [`الفيلم بتاع ${movieTitle} جامد جداً`, "المشهد الأخير كان أحلى حاجة", "أنا بحب الممثل اللي فيه", "القصة تحفة"];
            return generic[Math.floor(Math.random() * generic.length)];
        }
    }
}

function scheduleBotAnswers(data, round) {
    const players = data.players || {};
    const bots = Object.entries(players).filter(([uid]) => isBot(uid));
    const question = data.currentQuestion;
    const movie = data.movie;
    const imposterUid = data.imposterUid;

    bots.forEach(([botUid]) => {
        const delay = 1500 + Math.random() * 4000; // من 1.5 لـ 5.5 ثانية (أسرع عشان الـ 30 ثانية)
        if (botAnswerTimers[botUid]) clearTimeout(botAnswerTimers[botUid]);

        botAnswerTimers[botUid] = setTimeout(async () => {
            if (!roomCode) return;
            const isBotImposter = (botUid === imposterUid);
            const ans = getBotAnswer(question, movie.title, isBotImposter);
            
            try {
                await push(ref(db, `imposter_rooms/${roomCode}/answers`), { uid: botUid, round, text: ans, isCorrect: false, time: Date.now() });
                await push(ref(db, `imposter_rooms/${roomCode}/chat`), { uid: botUid, text: ans, time: Date.now() });
            } catch (e) { console.warn(e); }
            delete botAnswerTimers[botUid];
        }, delay);
    });
}

async function submitQNAAnswer(text, isCorrect) {
    if (answeredCurrent || !roomCode) return;
    answeredCurrent = true;
    try {
        await push(ref(db, `imposter_rooms/${roomCode}/answers`), {
            uid: me, round: currentRound, text, isCorrect: !!isCorrect, time: Date.now()
        });
        await push(ref(db, `imposter_rooms/${roomCode}/chat`), { uid: me, text, time: Date.now() });
        showToast(isCorrect ? 'إجابة صحيحة! ✅' : 'تم تسجيل إجابتك', isCorrect ? 'success' : 'info');
    } catch (e) {
        answeredCurrent = false;
        showToast('فشل الإرسال', 'error');
    }
}

window._nextImposterRound = async function(auto = false) {
    if (!roomCode || !roomData || me !== roomData.host) return;
    
    // لو اتنادى أوتوماتيك بسبب الوقت، نتأكد إننا لسه في نفس الجولة
    if (auto && Date.now() < roomData.roundEndTime) return;

    const newRound = (roomData.round || 1) + 1;
    if (newRound > 3) {
        await update(ref(db, `imposter_rooms/${roomCode}`), { status: 'voting', roundEndTime: 0 });
        showToast('انتهت الجولات، انتقلنا إلى التصويت!', 'success');
        return;
    }
    const question = pickQuestionForRound(roomData.movie.key, newRound);
    await update(ref(db, `imposter_rooms/${roomCode}`), {
        round: newRound, currentQuestion: question, answers: {},
        roundEndTime: Date.now() + 30000
    });
};

function initImposterChat(code) {
    if (chatUnsubscribe) return;
    const chatRef = ref(db, `imposter_rooms/${code}/chat`);
    const box = document.getElementById('chatBox');
    if (!box) return;
    chatUnsubscribe = onValue(chatRef, (snap) => {
        const data = snap.val() || {};
        const msgs = Object.entries(data).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
        const players = roomData?.players || {};
        box.innerHTML = msgs.map(([id, m]) => {
            const isMine = (m.uid || '').toLowerCase() === me;
            const senderName = players[m.uid]?.name || (isBot(m.uid) ? '🤖 بوت' : m.uid);
            return `<div class="chat-msg ${isMine ? 'me' : 'them'}">${isMine ? '' : `<div style="font-size:10px;opacity:0.7;margin-bottom:2px;">${esc(senderName)}</div>`}${esc(m.text)}</div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
    });
}

window._sendImposterChat = function() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !roomCode) return;
    push(ref(db, `imposter_rooms/${roomCode}/chat`), { uid: me, text, time: Date.now() });
    input.value = '';
};

function showVotingScreen(data) {
    showScreen('votingScreen');
    const players = data.players || {};
    const container = document.getElementById('voteOptions');
    const submitBtn = document.getElementById('submitVoteBtn');
    const endBtn = document.getElementById('endGameBtn');

    const votes = data.votes || {};
    const myVote = Object.values(votes).find(v => v.voter === me);
    voted = !!myVote;

    container.innerHTML = Object.entries(players).map(([uid, p]) => {
        const isMine = uid === me;
        const isSelected = myVote && myVote.target === uid;
        return `
            <div class="vote-option ${isSelected ? 'selected' : ''}"
                 onclick="${isMine ? '' : `window._selectVote('${uid}', this)`}"
                 style="${isMine ? 'opacity:0.5;cursor:not-allowed;' : ''}">
                <div style="font-size:18px;font-weight:bold;margin-bottom:5px;">${esc(p.name)}${isMine ? ' (أنت)' : ''}</div>
                <div style="color:#888;font-size:13px;">${isBot(uid) ? '🤖 بوت' : 'لاعب'}</div>
            </div>
        `;
    }).join('');

    if (submitBtn) { submitBtn.style.display = voted ? 'none' : 'inline-block'; submitBtn.disabled = voted; }
    if (endBtn) endBtn.style.display = (me === data.host) ? 'inline-block' : 'none';

    if (data.imposterUid === me) showImposterGuessUI(data);

    if (!window._botsVoted) {
        window._botsVoted = true;
        scheduleBotVotes(data);
    }
}

function showImposterGuessUI(data) {
    if (document.getElementById('imposterGuessSection')) return;
    const votingContainer = document.querySelector('.voting-container');
    if (!votingContainer) return;

    const guess = data.imposterGuess || {};
    const hasGuessed = guess.uid === me;

    const div = document.createElement('div');
    div.id = 'imposterGuessSection';
    div.style.cssText = 'margin-top:20px;padding:20px;background:rgba(139,0,0,0.3);border:3px dashed #ffd700;border-radius:15px;';
    div.innerHTML = `
        <h3 style="color:#ffd700;margin-bottom:10px;font-size:20px;text-align:center;">🎬 خمّن الفيلم يا جاسوس!</h3>
        <p style="color:#ddd;font-size:14px;margin-bottom:15px;text-align:center;line-height:1.6;">لازم تخمن اسم الفيلم الصح قبل ما اللعبة تخلص.</p>
        <select id="imposterGuessSelect" ${hasGuessed ? 'disabled' : ''} style="width:100%;padding:15px;border-radius:10px;background:#000;color:#fff;border:2px solid #ffd700;font-family:Cairo;margin-bottom:10px;font-size:16px;">
            <option value="">-- اختار الفيلم --</option>
            ${MOVIES.map(m => `<option value="${m.key}" ${hasGuessed && guess.movieKey === m.key ? 'selected' : ''}>${m.title}</option>`).join('')}
        </select>
        <button onclick="window._submitImposterGuessFromUI()" ${hasGuessed ? 'disabled' : ''} style="width:100%;padding:15px;background:${hasGuessed ? '#555' : 'linear-gradient(135deg,#ffd700,#ff8c00)'};color:${hasGuessed ? '#aaa' : '#000'};border:none;border-radius:10px;font-family:Cairo;font-weight:900;cursor:${hasGuessed ? 'not-allowed' : 'pointer'};font-size:16px;">
            ${hasGuessed ? '✅ تم تسجيل تخمينك' : 'تأكيد التخمين'}
        </button>
    `;
    votingContainer.appendChild(div);
}

function scheduleBotVotes(data) {
    const players = data.players || {};
    const allPlayers = Object.entries(players);
    const bots = allPlayers.filter(([uid]) => isBot(uid));

    bots.forEach(([botUid]) => {
        const delay = 3000 + Math.random() * 5000;
        if (botVoteTimers[botUid]) clearTimeout(botVoteTimers[botUid]);
        botVoteTimers[botUid] = setTimeout(async () => {
            if (!roomCode) return;
            const targets = allPlayers.filter(([uid]) => uid !== botUid);
            if (targets.length === 0) return;
            const [targetUid, targetInfo] = targets[Math.floor(Math.random() * targets.length)];
            try {
                await push(ref(db, `imposter_rooms/${roomCode}/votes`), { voter: botUid, target: targetUid, targetName: targetInfo.name, time: Date.now() });
            } catch (e) { console.warn(e); }
            delete botVoteTimers[botUid];
        }, delay);
    });
}

window._selectVote = function(uid, el) {
    if (voted) return;
    selectedVoteTarget = uid;
    document.querySelectorAll('.vote-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    const btn = document.getElementById('submitVoteBtn');
    if (btn) btn.style.display = 'inline-block';
};

window._submitImposterVote = async function() {
    if (voted || !selectedVoteTarget || !roomCode) return;
    try {
        await push(ref(db, `imposter_rooms/${roomCode}/votes`), {
            voter: me, target: selectedVoteTarget, targetName: roomData?.players?.[selectedVoteTarget]?.name || '?', time: Date.now()
        });
        voted = true;
        showToast('تم تسجيل تصويتك', 'success');
        const btn = document.getElementById('submitVoteBtn');
        if (btn) { btn.disabled = true; btn.style.display = 'none'; }
    } catch (e) { showToast('فشل التصويت', 'error'); }
};

window._submitImposterGuessFromUI = async function() {
    const select = document.getElementById('imposterGuessSelect');
    const movieKey = select.value;
    if (!movieKey) return showToast('اختار فيلم الأول!', 'error');
    const ok = await window._submitImposterGuess(movieKey);
    if (ok) {
        select.disabled = true;
        const btn = document.querySelector('#imposterGuessSection button');
        btn.disabled = true;
        btn.textContent = '✅ تم تسجيل تخمينك';
        btn.style.background = '#555';
    }
};

window._submitImposterGuess = async function(movieKey) {
    if (!roomCode || !roomData || roomData.imposterUid !== me) return false;
    if (roomData.imposterGuess && roomData.imposterGuess.uid === me) return false;
    try {
        await update(ref(db, `imposter_rooms/${roomCode}/imposterGuess`), { uid: me, movieKey, time: Date.now() });
        showToast('تم تسجيل تخمينك', 'success');
        return true;
    } catch (e) { return false; }
};

window._endImposterGame = async function() {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const data = roomData;
    const imposterUid = data.imposterUid;
    const movie = data.movie;
    let imposterGuess = data.imposterGuess || {};

    if (isBot(imposterUid) && (!imposterGuess.uid || imposterGuess.uid !== imposterUid)) {
        if (Math.random() < 0.5) imposterGuess = { uid: imposterUid, movieKey: movie.key };
    }

    const votes = data.votes || {};
    const voteCounts = {};
    for (const v of Object.values(votes)) { if (v.target) voteCounts[v.target] = (voteCounts[v.target] || 0) + 1; }
    
    const maxVotes = Math.max(...Object.values(voteCounts), 0);
    const revealedUid = Object.entries(voteCounts).find(([, c]) => c === maxVotes && c > 0)?.[0] || null;
    const imposterExposed = revealedUid === imposterUid;
    const imposterGuessedCorrectly = imposterGuess.uid === imposterUid && imposterGuess.movieKey === movie.key;

    let winner;
    if (!imposterExposed && imposterGuessedCorrectly) winner = 'imposter';
    else if (imposterExposed) winner = 'players_exposed';
    else winner = 'players_failed_guess';

    await update(ref(db, `imposter_rooms/${roomCode}`), {
        status: 'ended',
        finalResult: {
            winner, imposterUid, imposterName: data.players?.[imposterUid]?.name || 'مجهول',
            imposterGuess, imposterExposed, imposterGuessedCorrectly,
            voteCounts, revealedUid, movieTitle: movie?.title || '—', computedAt: Date.now(),
            votesLog: votes // سجل التصويت
        }
    });
    showToast('تم إنهاء اللعبة', 'success');
};

async function showResultScreen(data) {
    if (!data.finalResult) return;
    showScreen('resultScreen');
    const result = data.finalResult;

    let winnerText = '';
    let reward = 0;

    if (result.winner === 'imposter') { winnerText = `🎉 الجاسوس ربح! ${result.imposterName}`; reward = 100; }
    else if (result.winner === 'players_exposed') { winnerText = `🕵️ تم كشف الجاسوس! اللاعبون ربحوا`; reward = 30; }
    else { winnerText = `😅 الجاسوس فشل في التخمين، اللاعبون ربحوا`; reward = 30; }

    document.getElementById('resultTitle').textContent = 'انتهت اللعبة!';
    document.getElementById('winnerBadge').textContent = winnerText;
    document.getElementById('coinsReward').textContent = `جائزة: ${reward} 🪙`;
    document.getElementById('finalMovieTitle').textContent = result.movieTitle;
    document.getElementById('finalImposterName').textContent = result.imposterName;

    const posterImg = document.getElementById('finalMoviePoster');
    if (data.movie && data.movie.image) { posterImg.src = data.movie.image; posterImg.style.display = 'block'; }

    // 📊 سجل التصويت (Voting Log)
    const votingLogEl = document.getElementById('votingLogContainer');
    if (votingLogEl && result.votesLog) {
        let logHtml = '<h4 style="color:#ffd700;margin:20px 0 10px;text-align:center;">🗳️ سجل التصويت</h4><div style="display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;">';
        const logs = Object.values(result.votesLog).sort((a,b) => a.time - b.time);
        logs.forEach(v => {
            const voterName = data.players[v.voter]?.name || '?';
            const targetName = data.players[v.target]?.name || '?';
            logHtml += `<div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;font-size:14px;">👤 <b style="color:#fff;">${esc(voterName)}</b> صوّت لـ <b style="color:#ffd700;">${esc(targetName)}</b></div>`;
        });
        logHtml += '</div>';
        votingLogEl.innerHTML = logHtml;
    } else if (votingLogEl) {
        votingLogEl.innerHTML = '';
    }

    if (rewardsClaimedThisSession) return;
    rewardsClaimedThisSession = true;

    try {
        const claimRef = ref(db, `imposter_rewards/${me}/${roomCode}`);
        const claimResult = await runTransaction(claimRef, (current) => {
            if (current !== null) return;
            return { reward, time: Date.now() };
        });
        if (!claimResult.committed) return;

        let shouldReward = false;
        if (result.winner === 'imposter' && result.imposterUid === me) shouldReward = true;
        else if (result.winner === 'players_exposed' && result.imposterUid !== me) {
            const myVote = Object.values(data.votes || {}).find(v => v.voter === me);
            if (myVote && myVote.target === result.imposterUid) shouldReward = true;
        } else if (result.winner === 'players_failed_guess' && result.imposterUid !== me) {
            shouldReward = true;
        }

        if (shouldReward && reward > 0) {
            await addCoins(me, reward);
            showToast(`🎉 مبروك! ربحت ${reward} عملة`, 'success');
        }
    } catch (e) {
        console.warn('Reward error:', e);
        rewardsClaimedThisSession = false;
    }
}

async function addCoins(uid, amount) {
    if (!uid || amount <= 0) return;
    await runTransaction(ref(db, `users_data/${uid}/coins`), (current) => (current || 0) + amount);
}

window.addEventListener('pagehide', () => {
    clearBotTimers();
    if (chatUnsubscribe) { try { chatUnsubscribe(); } catch(e){} }
    if (roomUnsubscribe) { try { roomUnsubscribe(); } catch(e){} }
});