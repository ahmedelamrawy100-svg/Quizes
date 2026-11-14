/* ════════════════════════════════════════════════════════════════════
   💣 PASS THE BOMB — القنبلة الموقوتة (لعبة جماعية 4-6 لاعبين)
   ════════════════════════════════════════════════════════════════════
   الفلو:
   1) المضيف يعمل غرفة بكود دعوة — اللاعبين ينضموا (4-6) — بوتات للمضيف
   2) كل جولة: النظام يحدد وقت انفجار سري عشوائي (20-45 ثانية) لا يُرى!
   3) القنبلة تلف بالدور — صاحبها يجاوب سؤال سينمائي سريع:
      صح → القنبلة تمرر فورًا لللي بعده ❌ غلط → يتجمد ثانيتين
   4) عند الانفجار: صاحب القنبلة يُقصى — أنيميشن انفجار + اهتزاز شاشة
   5) آخر لاعب يصمد يكسب 400 🪙 + 100 XP 💰

   الداتابيز: bomb_rooms/{code} = {
     code, host, status: 'waiting'|'playing'|'ended',
     players: { uid: { name, isBot, alive, frozenUntil, joinedAt } },
     round, order: [uids], turn, bombStartedAt, explodeAt,   ← سري!
     currentQuestion: { q, options[4], answer }, explosion, finalResult }
   سجل الجوائز: bomb_rewards/{code}/{uid} = { claimedBy }
   ════════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, push, onValue, currentUser, isLoggedIn, showToast, escapeHtml } from './firebase-shared.js';
import { runTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const me = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();

const MIN_PLAYERS = 4;
const MAX_PLAYERS = 6;
const FUSE_MIN = 20;          // أقل وقت انفجار (ثانية)
const FUSE_MAX = 45;          // أكبر وقت انفجار (ثانية)
const FREEZE_MS = 2000;       // عقوبة الإجابة الغلط
const PRIZE_COINS = 400;
const PRIZE_XP = 100;

/* ─── الترجمة ─── */
let lang = localStorage.getItem('lang') || 'ar';
const T = {
    ar: {
        enterName: "الرجاء إدخال اسمك", needLogin: "سجل دخول الأول", badCode: "كود الغرفة غير صحيح",
        joined: "انضممت إلى الغرفة 🎮", roomFull: "الغرفة ممتلئة (6 لاعبين كحد أقصى)", gameStarted: "اللعبة بدأت خلاص!",
        roomMade: (c) => `الغرفة جاهزة! الكود: ${c}`, botAdded: (n) => `تم إضافة البوت: ${n}`,
        needPlayers: (n) => `محتاجين ${n} لاعبين على الأقل — ضيف بوتات!`, litFuse: "🔥 الفتيلة اتشالت!",
        round: "الجولة", holderIs: "💣 القنبلة في يد", yourTurn: "إيدك فيها! جاوب صح عشان تمررها",
        answerCorrect: "✅ صح! القنبلة اتمررت", answerWrong: "❌ غلط! مجمّد ثانيتين ❄️",
        frozen: "❄️ إنت مجمّد — استنى ثانيتين", frozenLeft: (s) => `❄️ هتفك بعد ${s} ثانية`, spectate: "استعد... ممكن توصلك في أي لحظة 😱",
        boomAt: (n) => `💥 انفجرت في إيد ${n}!`, passedTo: (a, b) => `✅ ${a} مرر القنبلة لـ ${b}`,
        frozeSelf: (n) => `❄️ ${n} غلط ومجمّد`, bombPassHint: "جاوب صح = تمرير فوري",
        winnerIs: (n) => `🏆 ${n} هو الناجي الوحيد!`, youWin: (c, x) => `🎉 مبروك! كسبت ${c} 🪙 + ${x} XP!`,
        someoneWon: (n, c, x) => `🎉 ${n} كسب ${c} 🪙 + ${x} XP!`, eliminatedTitle: "💀 المسقطين:",
        roundOf: (r) => `الجولة ${r}`, eliminated: "خارج", hostOnly: "المضيف بس",
        soundOn: "🔊", soundOff: "🔇", playing: "بيلعب", bot: "🤖", waitingPlayers: "استنى باقي اللاعبين..."
    },
    en: {
        enterName: "Please enter your name", needLogin: "Please log in first", badCode: "Invalid room code",
        joined: "Joined the room 🎮", roomFull: "Room is full (6 players max)", gameStarted: "Game already started!",
        roomMade: (c) => `Room ready! Code: ${c}`, botAdded: (n) => `Bot added: ${n}`,
        needPlayers: (n) => `Need at least ${n} players — add bots!`, litFuse: "🔥 Fuse lit!",
        round: "Round", holderIs: "💣 Bomb is in", yourTurn: "You have it! Answer correctly to pass it",
        answerCorrect: "✅ Correct! Bomb passed", answerWrong: "❌ Wrong! Frozen for 2 seconds ❄️",
        frozen: "❄️ You're frozen — wait 2 seconds", frozenLeft: (s) => `❄️ unfreezes in ${s}s`, spectate: "Get ready... it could reach you any second 😱",
        boomAt: (n) => `💥 Blew up in ${n}'s hands!`, passedTo: (a, b) => `✅ ${a} passed the bomb to ${b}`,
        frozeSelf: (n) => `❄️ ${n} got it wrong and is frozen`, bombPassHint: "Correct answer = instant pass",
        winnerIs: (n) => `🏆 ${n} is the sole survivor!`, youWin: (c, x) => `🎉 Congrats! You won ${c} 🪙 + ${x} XP!`,
        someoneWon: (n, c, x) => `🎉 ${n} won ${c} 🪙 + ${x} XP!`, eliminatedTitle: "💀 Eliminated:",
        roundOf: (r) => `Round ${r}`, eliminated: "out", hostOnly: "Host only",
        soundOn: "🔊", soundOff: "🔇", playing: "playing", bot: "🤖", waitingPlayers: "Waiting for others..."
    }
};
const t = () => T[lang] || T.ar;

/* تطبيق الترجمة على العناصر الثابتة */
function applyBombLang() {
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.title = lang === 'en' ? '💣 Pass the Bomb - Plot Twist' : '💣 القنبلة الموقوتة - Plot Twist';
    document.querySelectorAll('[data-ar]').forEach(el => {
        const v = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = v; else el.innerText = v;
    });
    document.querySelectorAll('[data-ar-placeholder]').forEach(el => {
        el.placeholder = lang === 'en' ? el.getAttribute('data-en-placeholder') : el.getAttribute('data-ar-placeholder');
    });
}
applyBombLang();

/* ─── أفلام + تصنيفات للتحديات السريعة ─── */
const MOVIES = [
    { key: 'conjuring', ar: 'التعويذة', en: 'The Conjuring', cat: ['horror', 'foreign'] },
    { key: 'fnaf', ar: 'FNAF', en: 'FNAF', cat: ['horror', 'foreign'] },
    { key: 'thenun', ar: 'الراهبة', en: 'The Nun', cat: ['horror', 'foreign'] },
    { key: 'annabelle', ar: 'أنابل', en: 'Annabelle', cat: ['horror', 'foreign'] },
    { key: 'scream', ar: 'صرخة', en: 'Scream', cat: ['horror', 'foreign'] },
    { key: 'traintobusan', ar: 'قطار إلى بوسان', en: 'Train to Busan', cat: ['horror', 'foreign'] },
    { key: 'squidgame', ar: 'سباق الحبار', en: 'Squid Game', cat: ['foreign'] },
    { key: 'spiderman', ar: 'سبايدرمان', en: 'Spider-Man', cat: ['action', 'foreign'] },
    { key: 'avengers', ar: 'المنتقمون', en: 'Avengers', cat: ['action', 'foreign'] },
    { key: 'venom', ar: 'فينوم', en: 'Venom', cat: ['action', 'foreign'] },
    { key: 'birdsofprey', ar: 'طيور الريد', en: 'Birds of Prey', cat: ['action', 'foreign'] },
    { key: 'mazerunner', ar: 'عداء المتاهة', en: 'The Maze Runner', cat: ['action', 'foreign'] },
    { key: 'rambo', ar: 'رامبو', en: 'Rambo', cat: ['action', 'foreign'] },
    { key: 'fall', ar: 'سقوط', en: 'Fall', cat: ['foreign'] },
    { key: 'wednesday', ar: 'وينزداي', en: 'Wednesday', cat: ['foreign'] },
    { key: 'knivesout', ar: 'سكاكين مخفية', en: 'Knives Out', cat: ['foreign'] },
    { key: 'avatar', ar: 'أفاتار', en: 'Avatar', cat: ['foreign'] },
    { key: 'elharifa', ar: 'الحريفة', en: 'El Harifa', cat: ['egyptian'] },
    { key: 'eleskandarany', ar: 'الإسكندراني', en: 'El Eskandarany', cat: ['egyptian'] },
    { key: 'elserb', ar: 'السرب', en: 'El Serb', cat: ['egyptian'] },
    { key: 'elaref', ar: 'العارف', en: 'El Aref', cat: ['egyptian'] },
    { key: 'elmamar', ar: 'الممر', en: 'El Mamar', cat: ['egyptian'] },
    { key: 'rocky', ar: 'روكي الغلابة', en: 'Rocky El Ghalaba', cat: ['egyptian'] },
    { key: 'beitelruby', ar: 'بيت الروبي', en: 'Beit El Ruby', cat: ['egyptian'] },
    { key: 'meratyx', ar: 'مراتي إكس', en: 'Meraty X', cat: ['egyptian'] },
    { key: 'meratywzegty', ar: 'مراتي وزوجتي', en: 'Meraty W Zegty', cat: ['egyptian'] },
    { key: 'nadielregal', ar: 'نادي الرجال السري', en: 'Nadi El Regal', cat: ['egyptian'] },
    { key: 'shako', ar: 'شقو', en: 'Shako', cat: ['egyptian'] },
    { key: 'barshama', ar: 'برشامة', en: 'Barshama', cat: ['egyptian'] },
    { key: 'misterx', ar: 'مستر إكس', en: 'Mister X', cat: ['egyptian'] },
    { key: 'tag', ar: 'تاج', en: 'Tag', cat: ['egyptian'] },
    { key: 'restart', ar: 'ريستارت', en: 'Restart', cat: ['egyptian'] },
    { key: 'akhyfok', ar: 'أخي فوق الشجرة', en: 'Akhy Fok El Shagara', cat: ['egyptian'] },
    { key: 'fasel', ar: 'فاصل من اللحظات اللذيذة', en: 'Fasel', cat: ['egyptian'] },
    { key: 'bahebak', ar: 'بحبك', en: 'Bahebak', cat: ['egyptian'] },
    { key: 'ahmedwaahmed', ar: 'أحمد وأحمد', en: 'Ahmed Wa Ahmed', cat: ['egyptian'] }
];
/* ─── بنك أسئلة سينمائية واضحة ومتنوعة (جاهزة ومكتوبة بإتقان) ─── */
const MCQ_BANK = [
    // مين الممثل / البطل
    { q: { ar: 'مين الشخص البشري اللي بيلعب بطل فيلم FNAF؟', en: 'Who is the human hero of the FNAF movie?' },
      opts: [{ ar: 'مايك', en: 'Mike' }, { ar: 'فريدي', en: 'Freddy' }, { ar: 'بوني', en: 'Bonnie' }, { ar: 'فوكسي', en: 'Foxy' }] },
    { q: { ar: 'مين مثّل دور سبايدرمان في أفلام مارفل الأخيرة؟', en: 'Who plays Spider-Man in the recent Marvel movies?' },
      opts: [{ ar: 'توم هولاند', en: 'Tom Holland' }, { ar: 'توم هاردي', en: 'Tom Hardy' }, { ar: 'كريس إيفانز', en: 'Chris Evans' }, { ar: 'بندكت كامبرباتش', en: 'Benedict Cumberbatch' }] },
    { q: { ar: 'مين مثّل دور فينوم؟', en: 'Who plays Venom?' },
      opts: [{ ar: 'توم هاردي', en: 'Tom Hardy' }, { ar: 'توم هولاند', en: 'Tom Holland' }, { ar: 'رايان رينولدز', en: 'Ryan Reynolds' }, { ar: 'ويل سميث', en: 'Will Smith' }] },
    { q: { ar: 'مين مثّلت دور وينزداي في المسلسل؟', en: 'Who plays Wednesday in the series?' },
      opts: [{ ar: 'جينا أورتيجا', en: 'Jenna Ortega' }, { ar: 'زندايا', en: 'Zendaya' }, { ar: 'ميلي بوبي براون', en: 'Millie Bobby Brown' }, { ar: 'جينيفر لورانس', en: 'Jennifer Lawrence' }] },
    { q: { ar: 'مين المؤسس الفعلي لفريق المنتقمون في الأفلام؟', en: 'Who actually formed the Avengers team?' },
      opts: [{ ar: 'نيك فيوري', en: 'Nick Fury' }, { ar: 'توني ستارك', en: 'Tony Stark' }, { ar: 'كابتن أمريكا', en: 'Captain America' }, { ar: 'ثور', en: 'Thor' }] },
    { q: { ar: 'مين هو الشرير الأكبر في سلسلة المنتقمون؟', en: 'Who is the big villain of the Avengers saga?' },
      opts: [{ ar: 'ثانوس', en: 'Thanos' }, { ar: 'لوكي', en: 'Loki' }, { ar: 'أولترون', en: 'Ultron' }, { ar: 'زيمو', en: 'Zemo' }] },
    { q: { ar: 'فيلم "عداء المتاهة" — بطل الفيلم اسمه إيه؟', en: 'In The Maze Runner — what is the hero called?' },
      opts: [{ ar: 'توماس', en: 'Thomas' }, { ar: 'نيوت', en: 'Newt' }, { ar: 'مينهو', en: 'Minho' }, { ar: 'جالي', en: 'Gally' }] },
    { q: { ar: 'الكوكب اللي بنحدث في فيلم "أفاتار" اسمه إيه؟', en: "What's the planet in Avatar called?" },
      opts: [{ ar: 'باندورا', en: 'Pandora' }, { ar: 'مارس', en: 'Mars' }, { ar: 'تيتان', en: 'Titan' }, { ar: 'كريبتون', en: 'Krypton' }] },
    // الفيلم بيتكلم عن إيه / نوعه
    { q: { ar: 'فيلم "قطار إلى بوسان" بيتحكي عن إيه؟', en: 'What is Train to Busan about?' },
      opts: [{ ar: 'زومبي داخل قطار', en: 'Zombies on a train' }, { ar: 'سباق سيارات', en: 'A car race' }, { ar: 'سطو على بنك', en: 'A bank heist' }, { ar: 'رحلة بحرية', en: 'A sea voyage' }] },
    { q: { ar: 'مسلسل "سباق الحبار" إنتاج أي بلد؟', en: 'Which country produced Squid Game?' },
      opts: [{ ar: 'كوريا الجنوبية', en: 'South Korea' }, { ar: 'أمريكا', en: 'USA' }, { ar: 'اليابان', en: 'Japan' }, { ar: 'بريطانيا', en: 'UK' }] },
    { q: { ar: 'فيلم "التعويذة (The Conjuring)" بيتحكي عن إيه؟', en: 'What is The Conjuring about?' },
      opts: [{ ar: 'زوجين محققين في الأشباح', en: 'A couple investigating ghosts' }, { ar: 'قراصنة البحر', en: 'Sea pirates' }, { ar: 'سباق شوارع', en: 'Street racing' }, { ar: 'فريق كورة', en: 'A football team' }] },
    { q: { ar: 'الشيطان اللي جوه فيلم "الراهبة (The Nun)" اسمه إيه؟', en: "What's the demon in The Nun called?" },
      opts: [{ ar: 'فالاك', en: 'Valak' }, { ar: 'فريدي كروجر', en: 'Freddy Krueger' }, { ar: 'بينيوايز', en: 'Pennywise' }, { ar: 'مايكل مايرز', en: 'Michael Myers' }] },
    { q: { ar: 'شخصية "أنابل" لعبتها ظهرت أول مرة في أنهي سلسلة أفلام؟', en: 'Annabelle first appeared in which movie series?' },
      opts: [{ ar: 'التعويذة (The Conjuring)', en: 'The Conjuring' }, { ar: 'الماتريكس', en: 'The Matrix' }, { ar: 'سبايدرمان', en: 'Spider-Man' }, { ar: 'الحريفة', en: 'El Harifa' }] },
    { q: { ar: 'فيلم "سكاكين مخفية (Knives Out)" من نوع إيه؟', en: 'What genre is Knives Out?' },
      opts: [{ ar: 'غموض وجريمة', en: 'Mystery & crime' }, { ar: 'زومبي ورعب', en: 'Zombie horror' }, { ar: 'خيال علمي', en: 'Sci-fi' }, { ar: 'موسيقي رومانسي', en: 'Romantic musical' }] },
    { q: { ar: 'بطل فيلم "رامبو" كان جندي في أنهي حرب؟', en: 'Rambo was a soldier in which war?' },
      opts: [{ ar: 'حرب فيتنام', en: 'The Vietnam War' }, { ar: 'الحرب العالمية الثانية', en: 'WWII' }, { ar: 'حرب الخليج', en: 'The Gulf War' }, { ar: 'حرب كوريا', en: 'The Korean War' }] },
    { q: { ar: 'عيلة وينزداي في المسلسل اسمها إيه؟', en: "What is Wednesday's family called?" },
      opts: [{ ar: 'عيلة آدامز', en: 'The Addams family' }, { ar: 'عيلة أديسون', en: 'The Addisons' }, { ar: 'عيلة أندرسون', en: 'The Andersons' }, { ar: 'عيلة تاكر', en: 'The Tuckers' }] },
    { q: { ar: 'فيلم "سقوط (Fall)" بيتحكي عن إيه؟', en: 'What is the movie Fall about?' },
      opts: [{ ar: 'تسلق برج إرسال عالي جدًا', en: 'Climbing a giant radio tower' }, { ar: 'غواصة غرقانة', en: 'A sinking submarine' }, { ar: 'سطو على سفينة', en: 'A ship heist' }, { ar: 'سباق دراجات', en: 'A bike race' }] },
    // أفلام مصرية
    { q: { ar: 'فيلم "الممر" بيتحكي عن إيه؟', en: 'What is El Mamar about?' },
      opts: [{ ar: 'حرب الاستنزاف وقناة السويس', en: 'The War of Attrition & Suez Canal' }, { ar: 'زومبي في مصر', en: 'Zombies in Egypt' }, { ar: 'مطرب شعبي', en: 'A folk singer' }, { ar: 'سباق خيول', en: 'Horse racing' }] },
    { q: { ar: 'فيلم "الحريفة" بيتحكي عن إيه؟', en: 'What is El Harifa about?' },
      opts: [{ ar: 'كرة القدم', en: 'Football' }, { ar: 'زومبي', en: 'Zombies' }, { ar: 'سطو على بنك', en: 'A bank heist' }, { ar: 'أشباح', en: 'Ghosts' }] },
    { q: { ar: 'أنهي فيلم فيهم بطل اسمه "روكي الغلابة"؟', en: 'Which movie has a hero called Rocky El Ghalaba?' },
      opts: [{ ar: 'روكي الغلابة', en: 'Rocky El Ghalaba' }, { ar: 'الممر', en: 'El Mamar' }, { ar: 'السرب', en: 'El Serb' }, { ar: 'برشامة', en: 'Barshama' }] }
];

/* صياغات متنوعة لتحدي التصنيف */
const CATS = {
    horror: { ar: 'رعب', en: 'HORROR', emoji: '👻' },
    egyptian: { ar: 'مصري', en: 'EGYPTIAN', emoji: '🇪🇬' },
    action: { ar: 'أكشن', en: 'ACTION', emoji: '💥' },
    foreign: { ar: 'أجنبي (مش مصري)', en: 'FOREIGN (not Egyptian)', emoji: '🌍' }
};
const CH_TEMPLATES = [
    { ar: (c) => `أنهي فيلم فيهم فيلم ${c.ar}؟ ${c.emoji}`, en: (c) => `Which one is a ${c.en} movie? ${c.emoji}` },
    { ar: (c) => `دوس على فيلم ${c.ar} من الأفلام دي ${c.emoji}`, en: (c) => `Tap the ${c.en} movie among these ${c.emoji}` },
    { ar: (c) => `اختر فيلم ${c.ar} 👇 ${c.emoji}`, en: (c) => `Pick a ${c.en} movie 👇 ${c.emoji}` }
];

/* توليد سؤال سريع واضح: ~45% تحدي تصنيف + ~55% بنك الأسئلة السينمائية */
function generateQuestion() {
    if (Math.random() < 0.45) return makeChallenge();

    // بنك الأسئلة الجاهز — خلط الخيارات مع تتبع الإجابة الصحيحة
    const item = MCQ_BANK[Math.floor(Math.random() * MCQ_BANK.length)];
    const arr = item.opts.map((o, i) => ({ txt: lang === 'en' ? o.en : o.ar, ok: i === 0 }));
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return {
        kind: 'mcq',
        q: lang === 'en' ? item.q.en : item.q.ar,
        options: arr.map(a => a.txt),
        answer: arr.findIndex(a => a.ok)
    };
}

/* تحدي تصنيف: فيلم صح + 3 أفلام غلط من تصنيفات تانية بصياغة متنوعة */
function makeChallenge() {
    const catKey = Object.keys(CATS)[Math.floor(Math.random() * Object.keys(CATS).length)];
    const cat = CATS[catKey];
    const tpl = CH_TEMPLATES[Math.floor(Math.random() * CH_TEMPLATES.length)];
    const correctPool = MOVIES.filter(m => m.cat.includes(catKey));
    const wrongPool = MOVIES.filter(m => !m.cat.includes(catKey));
    const correct = correctPool[Math.floor(Math.random() * correctPool.length)];
    const wrongs = [];
    while (wrongs.length < 3 && wrongPool.length) {
        const w = wrongPool.splice(Math.floor(Math.random() * wrongPool.length), 1)[0];
        wrongs.push(w);
    }
    const opts = [{ ar: correct.ar, en: correct.en, ok: true }, ...wrongs.map(w => ({ ar: w.ar, en: w.en, ok: false }))];
    for (let i = opts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return {
        kind: 'challenge',
        q: lang === 'en' ? tpl.en(cat) : tpl.ar(cat),
        options: opts.map(o => lang === 'en' ? o.en : o.ar),
        answer: opts.findIndex(o => o.ok)
    };
}

/* ─── الحالة ─── */
let roomCode = null;
let roomData = null;
let roomUnsub = null;
let lastExplosionAt = 0;
let lastRenderedTurn = null;
let lastRenderedRound = 0;
let lastLogCount = 0;
let tickTimer = null;
let uiInterval = null;   // ⏱️ محدّث الواجهة الحي (توهج + فك تجميد)
let boomInterval = null;
let botTurnTimer = null;
let botTurnKey = null;
let soundOn = true;
let audioCtx = null;
let rewardsShown = false;

const BOT_NAMES = ["أحمد", "سارة", "محمد", "ليلى", "علي", "نور", "يوسف", "هنا", "كريم", "مريم"];
const isBot = (uid) => String(uid).startsWith('bot_');
const esc = (s) => escapeHtml(s ?? '');

/* ─── 🔊 الصوت (Web Audio — من غير ملفات) ─── */
function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* لا صوت */ } }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
window._toggleBombSound = () => {
    soundOn = !soundOn;
    const btn = document.getElementById('soundBtn');
    if (btn) btn.textContent = soundOn ? t().soundOn : t().soundOff;
};
function beep(freq, dur, vol) {
    if (!soundOn || !audioCtx) return;
    try {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* تجاهل */ }
}
function tickSound(intensity) {
    // تكتكة تزيد سرعة وحدة كل ما القرن يقرّب
    beep(500 + intensity * 800, 0.05, 0.03 + intensity * 0.06);
}
function boomSound() {
    if (!soundOn || !audioCtx) return;
    try {
        const bufferSize = audioCtx.sampleRate * 1.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        const src = audioCtx.createBufferSource(); src.buffer = buffer;
        const g = audioCtx.createGain(); g.gain.value = 0.5;
        src.connect(g); g.connect(audioCtx.destination); src.start();
    } catch (e) { /* تجاهل */ }
}

/* ─── كود الغرفة ─── */
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

const nameInput = document.getElementById('playerName');
if (nameInput) nameInput.value = localStorage.getItem('bomb_playerName') || localStorage.getItem('loggedInUser') || '';

/* ─── كوينز الهيدر ─── */
const headerCoinsEl = document.getElementById('headerCoins');
if (headerCoinsEl && me) {
    onValue(ref(db, `users_data/${me}/coins`), (snap) => { headerCoinsEl.textContent = snap.val() || 0; });
}

/* ═══════════════════════════════════════════════════════════════════
   إدارة الغرفة
   ═══════════════════════════════════════════════════════════════════ */
window._createBombRoom = async function () {
    const name = (document.getElementById('playerName').value || '').trim();
    if (!name) return showToast(t().enterName, 'error');
    if (!me) return showToast(t().needLogin, 'error');
    localStorage.setItem('bomb_playerName', name);
    ensureAudio();

    const code = generateCode();
    roomCode = code;
    await set(ref(db, `bomb_rooms/${code}`), {
        code, host: me, createdAt: Date.now(), status: 'waiting',
        players: { [me]: { name, isBot: false, alive: true, frozenUntil: 0, joinedAt: Date.now() } },
        round: 0, order: [], turn: null, bombStartedAt: 0, explodeAt: 0,
        currentQuestion: null, explosion: null, finalResult: null, log: {}
    });
    showToast(t().roomMade(code), 'success');
    listenRoom(code);
};

window._joinBombRoom = function () {
    const code = (document.getElementById('joinCode').value || '').trim().toUpperCase();
    const name = (document.getElementById('playerName').value || '').trim();
    if (!code) return showToast(t().badCode, 'error');
    if (!name) return showToast(t().enterName, 'error');
    if (!me) return showToast(t().needLogin, 'error');
    localStorage.setItem('bomb_playerName', name);
    ensureAudio();
    joinRoom(code);
};

async function joinRoom(code) {
    const snap = await get(ref(db, `bomb_rooms/${code}`));
    if (!snap.exists()) return showToast(t().badCode, 'error');
    const data = snap.val();
    if (data.status !== 'waiting') return showToast(t().gameStarted, 'error');
    const players = data.players || {};
    if (!players[me]) {
        if (Object.keys(players).length >= MAX_PLAYERS) return showToast(t().roomFull, 'error');
        await update(ref(db, `bomb_rooms/${code}/players/${me}`), {
            name: localStorage.getItem('bomb_playerName') || me, isBot: false, alive: true, frozenUntil: 0, joinedAt: Date.now()
        });
    }
    roomCode = code;
    showToast(t().joined, 'success');
    listenRoom(code);
}

function listenRoom(code) {
    if (roomUnsub) { try { roomUnsub(); } catch (e) { } }
    roomUnsub = onValue(ref(db, `bomb_rooms/${code}`), (snap) => {
        const data = snap.val();
        if (!data) return;
        roomData = data;
        const prevLang = lang;
        lang = localStorage.getItem('lang') || 'ar';
        if (lang !== prevLang) applyBombLang(); // لو اللغة اتغيرت من تبويب تاني، طبّقها فورًا

        // 🚫 زر الرجوع مختفي طول ما اللعبة شغالة — مفيش خروج في نص اللعب
        const backBtn = document.getElementById('bombBackBtn');
        if (backBtn) backBtn.style.display = data.status === 'playing' ? 'none' : '';

        // 💥 رصد انفجار جديد
        if (data.explosion && data.explosion.at && data.explosion.at !== lastExplosionAt) {
            lastExplosionAt = data.explosion.at;
            playExplosionFX(data.explosion);
        }

        switch (data.status) {
            case 'waiting': stopGameLoops(); renderWaiting(data); break;
            case 'playing': renderGame(data); break;
            case 'ended': stopGameLoops(); renderResult(data); break;
        }
    });
}

/* ─── شاشة الانتظار ─── */
function renderWaiting(data) {
    showScreen('waitingScreen');
    const codeEl = document.getElementById('roomCodeDisplay');
    const bigEl = document.getElementById('roomCodeBig');
    const listEl = document.getElementById('playersList');
    const startBtn = document.getElementById('startGameBtn');
    const addBotBtn = document.getElementById('addBotBtn');
    if (codeEl) codeEl.textContent = data.code;
    if (bigEl) bigEl.textContent = data.code;

    const players = data.players || {};
    listEl.innerHTML = Object.values(players).map(p => `
        <div class="player-item">
            <span>${esc(p.name)} ${p.isBot ? '🤖' : ''}</span>
            <span style="color:#4caf50;font-size:13px;">${t().playing}</span>
        </div>`).join('');

    const count = Object.keys(players).length;
    const isHost = me === data.host;
    if (startBtn) {
        startBtn.style.display = isHost ? 'flex' : 'none';
        startBtn.disabled = count < MIN_PLAYERS;
    }
    if (addBotBtn) addBotBtn.style.display = (isHost && count < MAX_PLAYERS) ? 'flex' : 'none';
}

window._addBombBot = async function () {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const players = roomData.players || {};
    if (Object.keys(players).length >= MAX_PLAYERS) return showToast(t().roomFull, 'error');
    const used = new Set(Object.values(players).map(p => p.name));
    const botName = BOT_NAMES.find(n => !used.has(n)) || ('🤖 ' + Math.floor(Math.random() * 1000));
    const botUid = 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    await update(ref(db, `bomb_rooms/${roomCode}/players/${botUid}`), {
        name: botName, isBot: true, alive: true, frozenUntil: 0, joinedAt: Date.now()
    });
    showToast(t().botAdded(botName), 'success');
};

window._startBombGame = async function () {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const players = roomData.players || {};
    if (Object.keys(players).length < MIN_PLAYERS) return showToast(t().needPlayers(MIN_PLAYERS), 'error');
    ensureAudio();
    await startRound(roomCode, players, 1, {});
    showToast(t().litFuse, 'success');
};

/* بدء جولة جديدة — الفتيلة السرية هنا 🔥 */
async function startRound(code, players, round, extra) {
    const alive = Object.keys(players).filter(uid => players[uid].alive !== false);
    const order = [...alive].sort(() => Math.random() - 0.5);
    const first = order[Math.floor(Math.random() * order.length)];
    const fuse = (FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN)) * 1000;
    const now = Date.now();
    const upd = {
        status: 'playing', round, order, turn: first,
        bombStartedAt: now, explodeAt: now + fuse,   // ⚠️ سري — مفيش عنصر UI بيعرضه
        currentQuestion: generateQuestion(),
        explosion: null, finalResult: null,
        ...extra
    };
    await update(ref(db, `bomb_rooms/${code}`), upd);
}

/* ═══════════════════════════════════════════════════════════════════
   شاشة اللعب — دائرة اللاعبين حوالين القنبلة
   ═══════════════════════════════════════════════════════════════════ */
function renderGame(data) {
    showScreen('gameScreen');
    const badge = document.getElementById('roundBadge');
    if (badge) badge.textContent = `${t().roundOf(data.round || 1)}`;

    const arena = document.getElementById('bombArena');
    const players = data.players || {};
    const oldSeats = arena.querySelectorAll('.seat');
    oldSeats.forEach(s => s.remove());

    const aliveUids = Object.keys(players).filter(uid => players[uid].alive !== false);
    const allUids = Object.keys(players);
    const n = allUids.length;
    allUids.forEach((uid, i) => {
        const p = players[uid];
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + 40 * Math.cos(angle);
        const y = 50 + 40 * Math.sin(angle);
        const frozen = Date.now() < (p.frozenUntil || 0);
        const seat = document.createElement('div');
        seat.dataset.uid = uid;
        seat.className = 'seat'
            + (uid === data.turn ? ' active' : '')
            + (frozen ? ' frozen' : '')
            + (p.alive === false ? ' dead' : '')
            + (uid === me ? ' me' : '');
        seat.style.left = x + '%';
        seat.style.top = y + '%';
        const initial = isBot(uid) ? '🤖' : (p.name || '?').charAt(0).toUpperCase();
        seat.innerHTML = `
            <div class="seat-avatar">${p.alive === false ? '💀' : esc(initial)}</div>
            <div class="seat-name">${esc(p.name || '?')}</div>`;
        arena.appendChild(seat);
    });

    // 🔥 القنبلة: كل ما الوقت يعدي بتتوهج أكتر (من غير ما نكشف الانفجار)
    updateBombGlow(data);

    renderHolderPanel(data);
    renderLog(data);
    startTickLoop(data);
    startUIInterval(); // ⏱️ محدّث واجهة حي: توهج القنبلة + فك التجميد بالثانية
    scheduleBotTurn(data);
    startBoomLoop(); // 💥 حلقة المضيف لتنفيذ الانفجار عند نهاية الفتيلة السرية
}

/* توهج القنبلة حسب شدة الوقت المنقضي — بيتحدث حي كل 200ms */
function updateBombGlow(data) {
    const bombEl = document.getElementById('bombCenter');
    if (!bombEl || !data || !data.bombStartedAt) return;
    const elapsed = (Date.now() - data.bombStartedAt) / 1000;
    const intensity = Math.min(1, Math.max(0, elapsed / FUSE_MAX)); // 0 → 1 على مدار أقصى فتيلة
    bombEl.classList.toggle('danger', intensity > 0.45);
    bombEl.classList.toggle('critical', intensity > 0.75);
    bombEl.style.animationDuration = (1.1 - intensity * 0.9) + 's';
}

/* ⏱️ محدّث الواجهة الحي — بيعالج مشكلة بقاء التجميد أكتر من ثانيتين:
   اللوحة بتترسم بس لما الـ snapshot يوصل، فمن غير المحدّث ده مفيش write
   وقت التجميد يعمل re-render واللوحة تفضل مجمّدة للأبد! */
function startUIInterval() {
    if (uiInterval) return;
    uiInterval = setInterval(() => {
        if (!roomData || roomData.status !== 'playing') return;
        updateBombGlow(roomData);
        const players = roomData.players || {};
        // كلاسات التجميد على الكراسي حي
        document.querySelectorAll('#bombArena .seat').forEach(seat => {
            const uid = seat.dataset.uid;
            if (!uid || !players[uid]) return;
            seat.classList.toggle('frozen', Date.now() < (players[uid].frozenUntil || 0));
        });
        // لوحة صاحب القنبلة: فك التجميد فورًا بعد الثانيتين + عدّاد مرئي
        const panel = document.getElementById('holderPanel');
        if (panel && roomData.turn === me) {
            const myFrozenUntil = (players[me] || {}).frozenUntil || 0;
            const frozen = Date.now() < myFrozenUntil;
            const state = panel.dataset.pstate || '';
            if (state === 'mine-frozen' && !frozen) {
                renderHolderPanel(roomData); // خلصت الثانيتين — ارجع السؤال فورًا
            } else if (state === 'mine-options' && frozen) {
                renderHolderPanel(roomData);
            } else if (state === 'mine-frozen' && frozen) {
                const cd = document.getElementById('frozenCountdown');
                if (cd) cd.textContent = t().frozenLeft(Math.max(1, Math.ceil((myFrozenUntil - Date.now()) / 1000)));
            }
        }
    }, 200);
}

/* لوحة صاحب القنبلة — سؤاله هو */
function renderHolderPanel(data) {
    const panel = document.getElementById('holderPanel');
    if (!panel) return;
    const players = data.players || {};
    const holder = data.turn;
    const holderP = players[holder] || {};
    const isMyTurn = holder === me;
    const frozen = Date.now() < (holderP.frozenUntil || 0);
    const q = data.currentQuestion;

    if (isMyTurn) {
        if (frozen || !q) {
            panel.dataset.pstate = 'mine-frozen';
            panel.innerHTML = `
                <div class="q-panel frozen">
                    <div class="q-title">${t().frozen}</div>
                    <div class="q-hint"><span id="frozenCountdown"></span></div>
                </div>`;
            // املا العدّاد فورًا بدل ما نستنى المحدّد
            const cd = document.getElementById('frozenCountdown');
            if (cd && frozen) cd.textContent = t().frozenLeft(Math.max(1, Math.ceil((holderP.frozenUntil - Date.now()) / 1000)));
        } else {
            panel.dataset.pstate = 'mine-options';
            panel.innerHTML = `
                <div class="q-panel">
                    <div class="q-hint">💣 ${t().yourTurn}</div>
                    <div class="q-title">${esc(q.q)}</div>
                    <div class="options-grid">
                        ${q.options.map((opt, i) => `<div class="option" onclick="window._bombAnswer(${i})">${esc(opt)}</div>`).join('')}
                    </div>
                </div>`;
        }
    } else {
        panel.dataset.pstate = 'spectate';
        panel.innerHTML = `
            <div class="spectate-box">
                <div class="big">${t().holderIs} <span style="color:var(--bomb-orange);">${esc(holderP.name || '?')}</span></div>
                <div style="color:#888;font-size:13px;margin-top:6px;">${t().spectate}</div>
            </div>`;
    }
}

window._bombAnswer = async function (idx) {
    if (!roomCode || !roomData || roomData.status !== 'playing') return;
    if (roomData.turn !== me) return;
    const myP = (roomData.players || {})[me] || {};
    if (Date.now() < (myP.frozenUntil || 0)) { showToast(t().frozen, 'error'); return; }
    const q = roomData.currentQuestion;
    if (!q) return;

    if (idx === q.answer) {
        beep(880, 0.12, 0.08);
        showToast(t().answerCorrect, 'success');
        await advanceTurn(roomCode, me, roomData);
    } else {
        beep(180, 0.25, 0.08);
        showToast(t().answerWrong, 'error');
        await update(ref(db, `bomb_rooms/${roomCode}/players/${me}`), { frozenUntil: Date.now() + FREEZE_MS });
        await pushLog({ kind: 'freeze', name: (roomData.players[me] || {}).name || me, at: Date.now() });
    }
};

/* تمرير القنبلة — transaction عشان مفيش تمرير مزدوج */
async function advanceTurn(code, passerUid, snapshot) {
    const roomRef = ref(db, `bomb_rooms/${code}`);
    const res = await runTransaction(roomRef, (room) => {
        if (!room || room.status !== 'playing' || room.turn !== passerUid) return room;
        const players = room.players || {};
        const order = room.order || [];
        const idx = order.indexOf(passerUid);
        let next = null;
        for (let i = 1; i <= order.length; i++) {
            const cand = order[(idx + i) % order.length];
            if (players[cand] && players[cand].alive !== false) { next = cand; break; }
        }
        if (!next) return room;
        const fromName = (players[passerUid] || {}).name || passerUid;
        const toName = (players[next] || {}).name || next;
        return {
            ...room,
            turn: next,
            turnStartedAt: Date.now(),
            currentQuestion: generateQuestion(),
            log: { ...(room.log || {}), [push(ref(db, `bomb_rooms/${code}/log`)).key]: { kind: 'pass', from: fromName, to: toName, at: Date.now() } }
        };
    });
    return res.committed;
}

/* سجل الأحداث — بيتجمع من roomData.log */
function renderLog(data) {
    const box = document.getElementById('bombLog');
    if (!box) return;
    const log = data.log || {};
    const entries = Object.values(log).sort((a, b) => (a.at || 0) - (b.at || 0));
    box.innerHTML = entries.slice(-12).map(e => {
        if (e.kind === 'pass') return `<div class="log-line">${t().passedTo(`<b>${esc(e.from)}</b>`, `<b>${esc(e.to)}</b>`)}</div>`;
        if (e.kind === 'freeze') return `<div class="log-line">${t().frozeSelf(`<b>${esc(e.name)}</b>`)}</div>`;
        if (e.kind === 'boom') return `<div class="log-line" style="color:#ff6b6b;">${t().boomAt(`<b>${esc(e.name)}</b>`)}</div>`;
        return '';
    }).join('');
    box.scrollTop = box.scrollHeight;
}

async function pushLog(entry) {
    if (!roomCode) return;
    try { await push(ref(db, `bomb_rooms/${roomCode}/log`), entry); } catch (e) { /* تجاهل */ }
}

/* ─── 🔥 حلقة التكتكة (الكل) ─── */
function startTickLoop(data) {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (data.status !== 'playing' || !data.bombStartedAt) return;
    const schedule = () => {
        const elapsed = (Date.now() - data.bombStartedAt) / 1000;
        const intensity = Math.min(1, Math.max(0, elapsed / FUSE_MAX));
        tickSound(intensity);
        const interval = Math.max(120, 900 - intensity * 780);
        tickTimer = setTimeout(schedule, interval);
    };
    schedule();
}

/* ─── 💥 المضيف بينفذ الانفجار لما الفتيلة توصل ─── */
function startBoomLoop() {
    if (boomInterval) return;
    boomInterval = setInterval(async () => {
        if (!roomCode || !roomData || roomData.status !== 'playing' || me !== roomData.host) return;
        if (Date.now() < (roomData.explodeAt || 0)) return;
        // 💥 الانفجار — transaction واحدة ذرية: إقصاء + جولة جديدة أو إنهاء
        const roomRef = ref(db, `bomb_rooms/${roomCode}`);
        await runTransaction(roomRef, (room) => {
            if (!room || room.status !== 'playing' || Date.now() < (room.explodeAt || 0)) return room;
            const players = { ...(room.players || {}) };
            const victim = room.turn;
            if (!victim || !players[victim]) return room;
            const victimName = players[victim].name || victim;
            players[victim] = { ...players[victim], alive: false };

            const explosion = { uid: victim, name: victimName, round: room.round, at: Date.now() };
            const log = { ...(room.log || {}), [Date.now() + '_' + victim]: { kind: 'boom', name: victimName, at: Date.now() } };
            const alive = Object.keys(players).filter(uid => players[uid].alive !== false);

            if (alive.length <= 1) {
                const winnerUid = alive[0] || null;
                return {
                    ...room, players, explosion, log, status: 'ended',
                    finalResult: { winnerUid, winnerName: winnerUid ? (players[winnerUid].name || winnerUid) : '—', at: Date.now() }
                };
            }
            // جولة جديدة للباقين
            const order = alive.sort(() => Math.random() - 0.5);
            const fuse = (FUSE_MIN + Math.random() * (FUSE_MAX - FUSE_MIN)) * 1000;
            const now = Date.now();
            return {
                ...room, players, explosion, log,
                round: (room.round || 1) + 1, order, turn: order[Math.floor(Math.random() * order.length)],
                bombStartedAt: now, explodeAt: now + fuse,
                currentQuestion: generateQuestion()
            };
        });
    }, 300);
}

/* ─── 💥 مؤثرات الانفجار (كل العملاء) ─── */
function playExplosionFX(ex) {
    boomSound();
    const overlay = document.getElementById('explosionOverlay');
    if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => overlay.classList.remove('active'), 1000);
    }
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 650);
    const victimName = ex.name || '?';
    showToast(ex.uid === me ? `💔 ${t().boomAt(victimName)}` : t().boomAt(victimName), 'error');
}

/* ─── 🤖 منطق البوتات (المضيف) — إجابة واقعية بعد 1.5-4 ثواني ─── */
function scheduleBotTurn(data) {
    if (me !== data.host || data.status !== 'playing') return;
    const holder = data.turn;
    if (!holder || !isBot(holder)) { if (botTurnTimer) { clearTimeout(botTurnTimer); botTurnTimer = null; botTurnKey = null; } return; }
    const key = `${data.round}_${holder}_${data.bombStartedAt}`;
    if (key === botTurnKey && botTurnTimer) return; // نفس الدور بالفعل مجدول
    if (botTurnTimer) clearTimeout(botTurnTimer);
    botTurnKey = key;
    botTurnTimer = setTimeout(async () => {
        botTurnTimer = null;
        if (!roomData || roomData.status !== 'playing' || roomData.turn !== holder) return;
        const q = roomData.currentQuestion;
        if (!q) return;
        const holderP = (roomData.players || {})[holder] || {};
        if (Date.now() < (holderP.frozenUntil || 0)) { scheduleBotTurn(roomData); return; } // لسه مجمّد

        const correct = Math.random() < 0.7; // 70% يجيب صح
        if (correct) {
            await advanceTurn(roomCode, holder, roomData);
        } else {
            await update(ref(db, `bomb_rooms/${roomCode}/players/${holder}`), { frozenUntil: Date.now() + FREEZE_MS });
            await pushLog({ kind: 'freeze', name: holderP.name || holder, at: Date.now() });
            // بعد الذوبان يحاول تاني
            setTimeout(() => { if (roomData && roomData.status === 'playing') scheduleBotTurn(roomData); }, FREEZE_MS + 300);
        }
    }, 1500 + Math.random() * 2500); // 1.5 → 4 ثواني
}

/* ═══════════════════════════════════════════════════════════════════
   شاشة النتيجة + الجوائز
   ═══════════════════════════════════════════════════════════════════ */
function renderResult(data) {
    showScreen('resultScreen');
    const result = data.finalResult || {};
    const winnerName = result.winnerName || '—';
    document.getElementById('winnerBadge').textContent = t().winnerIs(winnerName);

    const elimEl = document.getElementById('eliminatedList');
    const players = data.players || {};
    const eliminated = Object.values(players).filter(p => p.alive === false);
    elimEl.innerHTML = `<div style="color:var(--bomb-gold);font-weight:900;">${t().eliminatedTitle}</div>`
        + (eliminated.length ? eliminated.map(p => `<div class="elim-row">${esc(p.name)} ${p.isBot ? '🤖' : ''} — ${t().eliminated}</div>`).join('') : `<div class="elim-row">—</div>`);

    const newBtn = document.getElementById('newGameBtn');
    if (newBtn) newBtn.style.display = (me === data.host) ? 'flex' : 'none';

    // 🎉 كونفيتي للفائز
    if (result.winnerUid === me && typeof confetti === 'function') {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }

    claimRewards(data);
}

/* الجوائز — transaction تمنع التكرار (أي عميل ينفذها، واحد بس يفوز) */
async function claimRewards(data) {
    const result = data.finalResult || {};
    const winnerUid = result.winnerUid;
    if (!winnerUid || !roomCode) return;
    try {
        const claimRef = ref(db, `bomb_rewards/${roomCode}/${winnerUid}`);
        const claim = await runTransaction(claimRef, (cur) => {
            if (cur) return cur; // اتنادى قبل كده
            return { claimedBy: me, coins: PRIZE_COINS, xp: PRIZE_XP, at: Date.now() };
        });
        // نكمل بس لو صرنا نحن اللي مسجلين المطالبة
        const val = claim.snapshot.val();
        if (!claim.committed || !val || val.claimedBy !== me) return;

        await runTransaction(ref(db, `users_data/${winnerUid}/coins`), (c) => (Number(c) || 0) + PRIZE_COINS);
        await runTransaction(ref(db, `users_data/${winnerUid}/xp`), (x) => (Number(x) || 0) + PRIZE_XP);
        if (rewardsShown) return;
        rewardsShown = true;
        if (winnerUid === me) showToast(t().youWin(PRIZE_COINS, PRIZE_XP), 'success');
        else showToast(t().someoneWon(result.winnerName || winnerUid, PRIZE_COINS, PRIZE_XP), 'success');
    } catch (e) {
        console.warn('Bomb reward error:', e);
    }
}

/* جولة جديدة (المضيف) — إعادة تعيين اللاعبين */
window._newBombGame = async function () {
    if (!roomCode || !roomData || me !== roomData.host) return;
    const players = roomData.players || {};
    const reset = {};
    for (const uid of Object.keys(players)) reset[uid] = { ...players[uid], alive: true, frozenUntil: 0 };
    await update(ref(db, `bomb_rooms/${roomCode}`), {
        players: reset, status: 'waiting', round: 0, order: [], turn: null,
        bombStartedAt: 0, explodeAt: 0, currentQuestion: null, explosion: null, finalResult: null, log: null
    });
    rewardsShown = false;
    lastExplosionAt = 0;
};

/* ─── إيقاف الحلقات ─── */
function stopGameLoops() {
    if (tickTimer) { clearTimeout(tickTimer); tickTimer = null; }
    if (uiInterval) { clearInterval(uiInterval); uiInterval = null; }
    if (boomInterval) { clearInterval(boomInterval); boomInterval = null; }
    if (botTurnTimer) { clearTimeout(botTurnTimer); botTurnTimer = null; botTurnKey = null; }
}

window.addEventListener('pagehide', () => {
    stopGameLoops();
    if (roomUnsub) { try { roomUnsub(); } catch (e) { } }
    // لو استنى في الغرفة، شيل نفسه
    if (roomCode && roomData && roomData.status === 'waiting' && !isBot(me) && roomData.host !== me) {
        try { set(ref(db, `bomb_rooms/${roomCode}/players/${me}`), null); } catch (e) { }
    }
});
