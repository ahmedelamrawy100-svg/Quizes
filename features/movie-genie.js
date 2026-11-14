import { db, ref, get, set, update, currentUser, isLoggedIn, showToast } from '../firebase-shared.js';
import { runTransaction, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ═══════════════════════════════════════════════════════════════════
// 1. الترجمة الكاملة (i18n)
// ═══════════════════════════════════════════════════════════════════
let currentLang = localStorage.getItem('lang') || 'ar';

const T = {
    ar: {
        back: "⬅ رجوع", coins: "عملة", title: "قارئ الأفلام",
        subtitle: "فكر في فيلم أو مسلسل من القائمة اللي تحت، وأنا هحاول أقرأ أفكارك!",
        startBtn: "✨ ابدأ التحدي", success: "🏆 قرأها بنجاح:", fail: "😈 هزمها اللاعبين:",
        yes: "نعم", probably: "على الأرجح", no: "لا", dontknow: "لا أعلم",
        thinking: "جاري التفكير...", revealTitle: "🕵️ أنا شايف إنك بتفكر في...",
        isItThis: "هل ده الفيلم اللي كان في دماغك؟", correct: "نعم، أصبت! 🎯", wrong: "لا، أخطأت! 😈",
        winTitle: "قرأت أفكارك!", winDesc: "أنا فعلاً قارئ أفلام محترف 😎<br>اتفضل خد <b>20 عملة</b> كمكافأة.",
        loseTitle: "أنت هزمتني!", loseDesc: "أفكارك معقدة جداً، مكنتش هعرف أوصلها.<br>خد <b>60 عملة</b> ووسام \"عصيّ على القراءة\".<br><br><b>عشان أتعلم، إيه الفيلم اللي كان في دماغك؟</b>",
        submitLearn: "📤 إرسال ومساعدة الجني", playAgain: "🔄 العب تاني", loginFirst: "سجل دخول الأول"
    },
    en: {
        back: "⬅ Back", coins: "Coins", title: "Movie Genie",
        subtitle: "Think of a movie from the list below, and I'll try to read your mind!",
        startBtn: "✨ Start Challenge", success: "🏆 Guessed correctly:", fail: "😈 Players defeated me:",
        yes: "Yes", probably: "Probably", no: "No", dontknow: "Don't Know",
        thinking: "Thinking...", revealTitle: "🕵️ I see you're thinking of...",
        isItThis: "Is this the movie in your mind?", correct: "Yes, correct! 🎯", wrong: "No, wrong! 😈",
        winTitle: "I read your mind!", winDesc: "I'm a pro movie genie 😎<br>Here are <b>20 coins</b> as a reward.",
        loseTitle: "You defeated me!", loseDesc: "Your mind is too complex.<br>Take <b>60 coins</b> and the \"Unreadable\" badge.<br><br><b>To learn, what was the movie?</b>",
        submitLearn: "📤 Submit & Help Genie", playAgain: "🔄 Play Again", loginFirst: "Please log in first"
    }
};
const t = () => T[currentLang];

// ═══════════════════════════════════════════════════════════════════
// 2. قاعدة بيانات الأفلام (36 فيلم مع Tags)
//    ⚠️ مهم جداً: كل فيلم لازم يكون بصمته (tags) مختلفة عن أي فيلم تاني،
//    ولو فيلمين لهم نفس الـ tags بالظبط الجني مش هيقدر يفرق بينهم أبداً.
// ═══════════════════════════════════════════════════════════════════
const MOVIES = [
    // ─── أفلام أجنبية ───
    { id: 'annabelle', title_ar: 'أنابيل', title_en: 'Annabelle', image: 'pic/Annabelle.jpg', tags: ['isHorror', 'hasMultipleParts', 'hasDolls'] },
    { id: 'conjuring', title_ar: 'الكونجورينج', title_en: 'The Conjuring', image: 'pic/The Conjuring.jpg', tags: ['isHorror', 'hasMultipleParts', 'isMystery'] },
    { id: 'thenun', title_ar: 'الراهبة', title_en: 'The Nun', image: 'pic/The Nun.jpg', tags: ['isHorror', 'hasMultipleParts', 'isReligious'] },
    { id: 'fnaf', title_ar: 'فايف نايتس', title_en: 'FNAF', image: 'pic/FNAF.jpg', tags: ['isHorror', 'hasMultipleParts', 'isSciFi', 'hasDeadlyGames', 'hasDolls', 'isOneLocation'] },
    { id: 'traintobusan', title_ar: 'قطار بوسان', title_en: 'Train to Busan', image: 'pic/busan.jpg', tags: ['isHorror', 'isAction', 'hasMultipleParts', 'isDrama', 'isKorean', 'hasZombies', 'isSurvival'] },
    { id: 'scream', title_ar: 'سكريم', title_en: 'Scream', image: 'pic/Scream.jpeg', tags: ['isHorror', 'hasMultipleParts', 'isMystery', 'isTeen', 'isWhodunit'] },
    { id: 'squidgame', title_ar: 'لعبة الحبار', title_en: 'Squid Game', image: 'pic/Squid Game.jpg', tags: ['isAction', 'hasMultipleParts', 'isSeries', 'isDrama', 'isKorean', 'isSurvival', 'hasDeadlyGames', 'isDystopian'] },
    { id: 'spiderman', title_ar: 'سبايدرمان', title_en: 'Spider-Man', image: 'pic/Spider-Man.jpeg', tags: ['hasSuperpowers', 'isAction', 'isComedy', 'hasMultipleParts', 'isSciFi', 'isTeen'] },
    { id: 'avengers', title_ar: 'المنتقمون', title_en: 'Avengers', image: 'pic/Avengers.jpeg', tags: ['hasSuperpowers', 'isAction', 'hasMultipleParts', 'isSciFi', 'isTeam'] },
    { id: 'avatar', title_ar: 'أفاتار', title_en: 'Avatar', image: 'pic/Avatar.jpeg', tags: ['isAction', 'hasMultipleParts', 'isSciFi', 'isAliens'] },
    { id: 'venom', title_ar: 'فينوم', title_en: 'Venom', image: 'pic/Venom.jpeg', tags: ['hasSuperpowers', 'isAction', 'isComedy', 'hasMultipleParts', 'isSciFi', 'isAntihero'] },
    { id: 'birdsofprey', title_ar: 'الطيور الجارحة', title_en: 'Birds of Prey', image: 'pic/Birds of Prey.jpeg', tags: ['hasSuperpowers', 'isAction', 'isComedy', 'isFemaleLead', 'isAntihero'] },
    { id: 'mazerunner', title_ar: 'المتاهة', title_en: 'The Maze Runner', image: 'pic/Maze Runner.jpeg', tags: ['isAction', 'hasMultipleParts', 'isSciFi', 'isMystery', 'isTeen', 'isSurvival', 'hasDeadlyGames', 'isDystopian'] },
    { id: 'rambo', title_ar: 'رامبو', title_en: 'Rambo', image: 'pic/Rambo.jpg', tags: ['isAction', 'hasMultipleParts', 'isWar', 'isOld'] },
    { id: 'fall', title_ar: 'السقوط', title_en: 'Fall', image: 'pic/Fall.jpeg', tags: ['isDrama', 'isRealistic', 'isSurvival', 'isOneLocation'] },
    { id: 'wednesday', title_ar: 'وينزداي', title_en: 'Wednesday', image: 'pic/Wednesday.jpg', tags: ['hasSuperpowers', 'isComedy', 'hasMultipleParts', 'isSeries', 'isMystery', 'isTeen', 'isWhodunit', 'isFemaleLead', 'isSchool', 'isAntihero'] },
    { id: 'knivesout', title_ar: 'مطارق', title_en: 'Knives Out', image: 'pic/Knives Out.jpeg', tags: ['isComedy', 'hasMultipleParts', 'isMystery', 'isWhodunit'] },
    // ─── أفلام مصرية ───
    { id: 'elharifa', title_ar: 'الحريفة', title_en: 'El Harifa', image: 'pic/Harifa.jpeg', tags: ['isEgyptian', 'isAction', 'isComedy', 'hasMultipleParts', 'isTeen', 'isFootball', 'isFriendship', 'isSchool'] },
    { id: 'eleskandarany', title_ar: 'الإسكندراني', title_en: 'El Eskandarany', image: 'pic/El Eskandarany.jpeg', tags: ['isEgyptian', 'hasMultipleParts', 'isDrama', 'isRealistic', 'isBoxing'] },
    { id: 'elserb', title_ar: 'السرب', title_en: 'El Serb', image: 'pic/El Serb.jpeg', tags: ['isEgyptian', 'isAction', 'hasMultipleParts', 'isDrama', 'isRealistic', 'isWar', 'isHistorical'] },
    { id: 'elaref', title_ar: 'العارف', title_en: 'El Aref', image: 'pic/El Aref.jpeg', tags: ['isEgyptian', 'isAction', 'hasMultipleParts', 'isMystery', 'isCrime'] },
    { id: 'elmamar', title_ar: 'الممر', title_en: 'El Mamar', image: 'pic/El Mamar.jpeg', tags: ['isEgyptian', 'isAction', 'hasMultipleParts', 'isDrama', 'isRealistic', 'isWar', 'isHistorical', 'isUnderground'] },
    { id: 'rocky', title_ar: 'روكي الغلابة', title_en: 'Rocky El Ghalaba', image: 'pic/Rocky El Ghalaba.jpg', tags: ['isEgyptian', 'isAction', 'isComedy', 'isBoxing'] },
    { id: 'beitelruby', title_ar: 'بيت الروبي', title_en: 'Beit El Ruby', image: 'pic/Beit El Ruby.jpeg', tags: ['isEgyptian', 'isComedy', 'isRealistic', 'isHistorical'] },
    { id: 'meratyx', title_ar: 'مراتي إكس', title_en: 'Meraty X', image: 'pic/Meraty X.jpg', tags: ['isEgyptian', 'isComedy', 'isMarriage'] },
    { id: 'meratywzegty', title_ar: 'مراتي وزوجتي', title_en: 'Meraty W Zegty', image: 'pic/Meraty W Zegty.jpeg', tags: ['isEgyptian', 'isComedy', 'isMarriage', 'isOld'] },
    { id: 'nadielregal', title_ar: 'نادي الرجال السري', title_en: 'Nadi El Regal', image: 'pic/Nadi El Regal.jpg', tags: ['isEgyptian', 'isComedy', 'isMarriage', 'isOneLocation'] },
    { id: 'shako', title_ar: 'شقو', title_en: 'Shako', image: 'pic/Shako.jpeg', tags: ['isEgyptian', 'isAction', 'isComedy', 'isGangster'] },
    { id: 'barshama', title_ar: 'برشامة', title_en: 'Barshama', image: 'pic/Barshama.jpeg', tags: ['isEgyptian', 'isComedy', 'isTeen', 'isSchool'] },
    { id: 'misterx', title_ar: 'مستر إكس', title_en: 'Mister X', image: 'pic/Mister X.jpeg', tags: ['isEgyptian', 'isComedy', 'isCrime'] },
    { id: 'tag', title_ar: 'تاج', title_en: 'Tag', image: 'pic/Tag.jpg', tags: ['isEgyptian', 'isAction', 'isComedy', 'isCrime', 'isGangster'] },
    { id: 'restart', title_ar: 'ريستارت', title_en: 'Restart', image: 'pic/Restart.jpg', tags: ['isEgyptian', 'isComedy', 'isFriendship', 'isTeam'] },
    { id: 'akhyfok', title_ar: 'أخي فوق الشجرة', title_en: 'Akhy Fok El Shagara', image: 'pic/Akhy Fok El Shagara.jpeg', tags: ['isEgyptian', 'isComedy', 'isFriendship', 'isOneLocation'] },
    { id: 'fasel', title_ar: 'فاصل من اللحظات اللذيذة', title_en: 'Fasel', image: 'pic/Fasel.jpg', tags: ['isEgyptian', 'isComedy', 'isOneLocation'] },
    { id: 'bahebak', title_ar: 'بحبك', title_en: 'Bahebak', image: 'pic/Bahebak.jpg', tags: ['isEgyptian', 'isComedy', 'isDrama', 'isTeen', 'isRomance', 'isSchool'] },
    { id: 'ahmedwaahmed', title_ar: 'أحمد وأحمد', title_en: 'Ahmed Wa Ahmed', image: 'pic/Ahmed Wa Ahmed.jpeg', tags: ['isEgyptian', 'isComedy', 'isFriendship'] },
];

// 🔍 تحقق تطويري: لو فيلمين بنفس البصمة، الجني مش هيعرف يفرق بينهم
// هيتحذر في الـ Console عشان تقدر تعدل الـ tags
(function checkDuplicateSignatures() {
    const seen = {};
    MOVIES.forEach(m => {
        const sig = [...m.tags].sort().join('|');
        if (seen[sig]) {
            console.warn(`🎬 Genie: الفيلمين "${seen[sig]}" و "${m.title_en}" لهم نفس الصفات بالظبط! عدّل الـ tags عشان الجني يقدر يفرق بينهم.`);
        } else {
            seen[sig] = m.title_en;
        }
    });
})();

// ═══════════════════════════════════════════════════════════════════
// 3. بنك الأسئلة (مترجم) — 33 سؤال
// ═══════════════════════════════════════════════════════════════════
const QUESTION_POOL = [
    { tag: "isEgyptian", ar: "هل العمل مصري؟", en: "Is the work Egyptian?" },
    { tag: "isHorror", ar: "هل العمل فيه رعب أو أشباح؟", en: "Is it a horror or ghost movie?" },
    { tag: "hasSuperpowers", ar: "هل البطل عنده قوى خارقة؟", en: "Does the hero have superpowers?" },
    { tag: "isAction", ar: "هل العمل فيه أكشن وقتال؟", en: "Is it an action/fighting movie?" },
    { tag: "isComedy", ar: "هل العمل كوميدي؟", en: "Is it a comedy?" },
    { tag: "hasMultipleParts", ar: "هل للعمل أجزاء تانية (سلسلة)؟", en: "Does it have sequels (a franchise)?" },
    { tag: "isSeries", ar: "هل العمل مسلسل وليس فيلم؟", en: "Is it a series, not a movie?" },
    { tag: "isSciFi", ar: "هل العمل خيال علمي (Sci-Fi) أو فضاء؟", en: "Is it Sci-Fi or space-related?" },
    { tag: "isMystery", ar: "هل العمل غموض أو تحقيق؟", en: "Is it a mystery/investigation?" },
    { tag: "isDrama", ar: "هل العمل دراما حزينة؟", en: "Is it a sad drama?" },
    { tag: "isRealistic", ar: "هل العمل بيصور أحداث واقعية أو تاريخية؟", en: "Is it based on a true story?" },
    { tag: "isTeen", ar: "هل أبطال العمل مراهقين أو طلاب؟", en: "Are the main characters teenagers/students?" },
    { tag: "isWar", ar: "هل العمل عن حرب أو جنود؟", en: "Is it about war or soldiers?" },
    { tag: "isKorean", ar: "هل العمل كوري؟", en: "Is it Korean?" },
    { tag: "hasZombies", ar: "هل فيه زومبي أو فيروس بيتنتشر؟", en: "Are there zombies or an outbreak?" },
    { tag: "isSurvival", ar: "هل فكرته عن النجاة والبقاء على قيد الحياة؟", en: "Is it about survival?" },
    { tag: "hasDeadlyGames", ar: "هل فيه ألعاب أو تحديات خطيرة؟", en: "Are there deadly games or challenges?" },
    { tag: "isWhodunit", ar: "هل فيه تحقيق على قاتل أو مجرم مجهول؟", en: "Is there a hunt for an unknown killer/criminal?" },
    { tag: "hasDolls", ar: "هل فيه دمية أو لعبة أطفال مرعبة؟", en: "Is there a scary doll or toy?" },
    { tag: "isFemaleLead", ar: "هل البطل الرئيسي أنثى؟", en: "Is the main lead female?" },
    { tag: "isAntihero", ar: "هل البطل شخصية مظلمة أو شريرة أكثر منها خير؟", en: "Is the hero more dark/villain-like than good?" },
    { tag: "isDystopian", ar: "هل العالم فيه نظام قاسي أو مستقبلي مزعج؟", en: "Is it set in a harsh/dystopian world?" },
    { tag: "isOneLocation", ar: "هل معظم الأحداث في مكان واحد؟", en: "Do most events happen in one place?" },
    { tag: "isOld", ar: "هل العمل قديم نسبياً (اتعرض قبل 2015)؟", en: "Is it relatively old (released before 2015)?" },
    { tag: "isReligious", ar: "هل فيه موضوع ديني أو راهبات وكنس؟", en: "Is there a religious theme (nuns, church)?" },
    { tag: "isAliens", ar: "هل فيه كائنات فضائية أو عالم تاني؟", en: "Are there aliens or another world?" },
    { tag: "isTeam", ar: "هل فيه فريق من الأبطال مش بطل واحد؟", en: "Is there a team of heroes, not one hero?" },
    { tag: "isBoxing", ar: "هل فيه ملاكمة أو مصارعة؟", en: "Is there boxing or wrestling?" },
    { tag: "isFootball", ar: "هل العمل عن كرة القدم؟", en: "Is it about football?" },
    { tag: "isMarriage", ar: "هل موضوعه الزواج أو الستات؟", en: "Is it about marriage or wives?" },
    { tag: "isFriendship", ar: "هل مبنية على صداقة أو أخ؟", en: "Is it built on friendship or a brother?" },
    { tag: "isSchool", ar: "هل أحداثه في مدرسة أو جامعة؟", en: "Is it set in a school or university?" },
    { tag: "isHistorical", ar: "هل أحداثه في فترة تاريخية قديمة؟", en: "Is it set in an old historical era?" },
    { tag: "isRomance", ar: "هل فيه قصة حب واضحة؟", en: "Is there a clear love story?" },
    { tag: "isCrime", ar: "هل فيه سرقة أو جرائم منظمة؟", en: "Is there theft or organized crime?" },
    { tag: "isGangster", ar: "هل فيه عصابات أو مافيا؟", en: "Are there gangs or mafia?" },
    { tag: "isUnderground", ar: "هل فيه نفق أو تسلل سرّي تحت الأرض؟", en: "Is there a tunnel or secret underground mission?" },
];

// ═══════════════════════════════════════════════════════════════════
// 4. متغيرات اللعبة والخوارزمية
// ═══════════════════════════════════════════════════════════════════
let probabilities = {};
let askedQuestions = new Set();
let currentQuestion = null;
let currentMovie = null;
let maxQuestions = 18; // بنك أسئلة كبير دلوقتي، نسمح بأسئلة أكتر قبل الكشف
let confidenceThreshold = 0.85; // 85% زي Akinator بالظبط

// ═══════════════════════════════════════════════════════════════════
// 5. التهيئة وعرض العملات والإحصائيات
// ═══════════════════════════════════════════════════════════════════
const coinsEl = document.getElementById('userCoins');
if (isLoggedIn() && coinsEl) {
    onValue(ref(db, `users_data/${currentUser}/coins`), (snap) => {
        coinsEl.textContent = snap.val() || 0;
    });
}

onValue(ref(db, 'genie_stats'), (snap) => {
    const data = snap.val() || { success: 0, fail: 0 };
    document.getElementById('statSuccess').textContent = data.success || 0;
    document.getElementById('statFail').textContent = data.fail || 0;
});

function renderMoviesCloud() {
    const cloud = document.getElementById('moviesCloud');
    if (!cloud) return;
    cloud.innerHTML = '';
    const shuffled = [...MOVIES].sort(() => Math.random() - 0.5);
    shuffled.forEach(m => {
        const span = document.createElement('span');
        span.className = 'movie-pill';
        span.textContent = currentLang === 'ar' ? m.title_ar : m.title_en;
        cloud.appendChild(span);
    });
}

// ═══════════════════════════════════════════════════════════════════
// 6. تطبيق الترجمة (UI Translation)
// ═══════════════════════════════════════════════════════════════════
window.toggleGenieLang = () => {
    currentLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', currentLang);
    applyGenieLang();
};

function applyGenieLang() {
    const tr = t();
    document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
    
    document.getElementById('langBtn').innerText = currentLang === 'ar' ? 'EN' : 'AR';
    document.getElementById('backBtn').innerText = tr.back;
    document.getElementById('lblCoins').innerText = tr.coins;
    document.getElementById('txtTitle').innerText = tr.title;
    document.getElementById('txtSubtitle').innerText = tr.subtitle;
    document.getElementById('btnStart').innerText = tr.startBtn;
    
    const succText = tr.success.replace(':', '');
    const failText = tr.fail.replace(':', '');
    document.getElementById('lblSuccess').innerHTML = `${succText}: <b id="statSuccess">${document.getElementById('statSuccess').innerText}</b>`;
    document.getElementById('lblFail').innerHTML = `${failText}: <b id="statFail">${document.getElementById('statFail').innerText}</b>`;

    document.getElementById('btnYes').innerText = tr.yes;
    document.getElementById('btnProb').innerText = tr.probably;
    document.getElementById('btnNo').innerText = tr.no;
    document.getElementById('btnDont').innerText = tr.dontknow;
    document.getElementById('txtRevealTitle').innerText = tr.revealTitle;
    document.getElementById('txtIsItThis').innerText = tr.isItThis;
    document.getElementById('btnCorrect').innerText = tr.correct;
    document.getElementById('btnWrong').innerText = tr.wrong;
    
    renderMoviesCloud();
}

// ═══════════════════════════════════════════════════════════════════
// 7. دوال التحكم في الشاشات
// ═══════════════════════════════════════════════════════════════════
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ═══════════════════════════════════════════════════════════════════
// 8. 🧠 الخوارزمية الاحتمالية (Bayesian + Entropy)
// ═══════════════════════════════════════════════════════════════════

window._startGenie = () => {
    probabilities = {};
    askedQuestions.clear();
    currentMovie = null;
    
    // 1. توزيع احتمالي مبدئي متساوي لكل فيلم
    const initialProb = 1 / MOVIES.length;
    MOVIES.forEach(m => probabilities[m.id] = initialProb);
    
    showScreen('screen-questions');
    updateConfidence();
    selectBestQuestion();
};

// ─── دوال مساعدة للخوارزمية ───
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// إنتروبيا توزيع الاحتمالات الحالي (كل ما تقل، كل ما نبقى أقرب للجواب)
function entropyOfDist(dist, sum) {
    if (sum <= 0) return 0;
    let h = 0;
    for (const id in dist) {
        const p = dist[id] / sum;
        if (p > 0) h -= p * Math.log2(p);
    }
    return h;
}

// اختيار أفضل سؤال بناءً على Information Gain الحقيقي
function selectBestQuestion() {
    // لو وصلنا الحد الأقصى من الأسئلة، أو فيلم واحد مسيطر بنسبة 85%، نكشف
    if (askedQuestions.size >= maxQuestions || getTopCandidate().prob >= confidenceThreshold) {
        revealResult();
        return;
    }

    // ⚠️ ترتيب عشوائي للأسئلة المتاحة — عشان اللعبة متبقاش بنفس ترتيب الأسئلة كل مرة
    const available = shuffleArray(QUESTION_POOL.filter(q => !askedQuestions.has(q.tag)));
    if (available.length === 0) {
        revealResult();
        return;
    }

    // الإنتروبيا الحالية لتوزيع الاحتمالات
    const currentEntropy = entropyOfDist(probabilities, 1);

    const candidates = [];

    available.forEach(q => {
        const hasTag = (movie) => movie.tags.includes(q.tag);

        // احتمال إن الجواب يكون "نعم"
        let pYes = 0;
        for (const movie of MOVIES) if (hasTag(movie)) pYes += probabilities[movie.id];

        // سؤال متأكد من إجابته = مش هيفيد (كل الفيلمات بنفس الإجابة)
        if (pYes <= 0.0001 || pYes >= 0.9999) return;

        // حساب الإنتروبيا المتوقعة بعد الإجابة على السؤال ده (Expected Entropy)
        let yesDist = {}, noDist = {}, sumYes = 0, sumNo = 0;
        for (const movie of MOVIES) {
            const p = probabilities[movie.id];
            if (hasTag(movie)) { yesDist[movie.id] = p; sumYes += p; }
            else { noDist[movie.id] = p; sumNo += p; }
        }

        const expected = pYes * entropyOfDist(yesDist, sumYes) + (1 - pYes) * entropyOfDist(noDist, sumNo);

        // Information Gain = الإنتروبيا الحالية − المتوقعة بعد السؤال
        const gain = currentEntropy - expected;

        if (gain > 0) candidates.push({ q, gain });
    });

    // لو مفيش أي سؤال بيفرق بين الفيلمات الباقية، نكشف النتيجة
    if (candidates.length === 0) {
        revealResult();
        return;
    }

    // نرتبهم تنازلياً ونعمل "قائمة مرشحين" من كل الأسئلة اللي مكسبها قريب من الأفضل
    // وبعدين نختار منهم عشوائياً — عشان اللعبة متبقاش بتسأل نفس الأسئلة بالظبط كل مرة
    candidates.sort((a, b) => b.gain - a.gain);
    const bestGain = candidates[0].gain;
    const finalists = candidates.filter(c => c.gain >= bestGain - 0.08);
    const chosen = finalists[Math.floor(Math.random() * finalists.length)];
    currentQuestion = chosen.q;
    askedQuestions.add(currentQuestion.tag);
    document.getElementById('questionText').textContent = currentLang === 'ar' ? currentQuestion.ar : currentQuestion.en;
    
    // إيقاف أنيميشن التفكير
    const ball = document.querySelector('.crystal-ball');
    ball.style.animation = 'floatBall 3s ease-in-out infinite, glowBall 2s alternate infinite';
}

// تحديث الواجهة بناءً على الاحتمالات
function updateConfidence() {
    const top = getTopCandidate();
    let confidence = Math.round(top.prob * 100);
    if (confidence > 95) confidence = 95; // بنسيب 5% لحد الكشف النهائي
    
    document.getElementById('confidenceBar').style.width = `${confidence}%`;
    document.getElementById('confidenceText').textContent = `${confidence}%`;
    
    const ball = document.querySelector('.crystal-ball');
    if (confidence > 70) {
        ball.style.animation = 'shakeBall 0.5s ease-in-out infinite, glowBall 0.5s alternate infinite';
    }
}

// استرجاع الفيلم الأعلى احتمالاً
// ⚠️ لو أكتر من فيلم متعادلين، نختار واحد منهم عشوائياً (بدل اختيار نفس الفيلم كل مرة)
function getTopCandidate() {
    let maxProb = -1;
    for (const id in probabilities) {
        if (probabilities[id] > maxProb) maxProb = probabilities[id];
    }
    const tied = Object.keys(probabilities).filter(id => probabilities[id] >= maxProb - 1e-9);
    const topId = tied[Math.floor(Math.random() * tied.length)];
    return { id: topId, prob: maxProb, movie: MOVIES.find(m => m.id === topId) };
}

// ═══════════════════════════════════════════════════════════════════
// 9. استقبال الإجابة وتحديث الاحتمالات (Bayesian Update)
// ═══════════════════════════════════════════════════════════════════
window._answerGenie = (fuzzyWeight) => {
    if (!currentQuestion) return;

    const tag = currentQuestion.tag;
    
    // 1. تحديث احتمالات كل فيلم
    for (const movie of MOVIES) {
        const hasTag = movie.tags.includes(tag);
        
        // معادلة بايز المبسطة (Likelihood)
        let likelihood;
        if (hasTag) {
            // لو الفيلم فيه الخاصية دي، احتمال إن اللاعب يقول "نعم" بيعتمد على الوزن
            likelihood = fuzzyWeight;
        } else {
            // لو الفيلم مفيهوش الخاصية دي، احتمال إن اللاعب يقول "نعم" = (1 - الوزن)
            likelihood = 1 - fuzzyWeight;
        }

        // تحديث الاحتمال المبدئي
        probabilities[movie.id] = probabilities[movie.id] * likelihood;
    }

    // 2. إعادة تطبيع الاحتمالات (عشان المجموع يبقى 100%)
    let sum = 0;
    for (const id in probabilities) sum += probabilities[id];
    if (sum > 0) {
        for (const id in probabilities) probabilities[id] /= sum;
    } else {
        // لو كله صفر لأي سبب، نرجع لتوزيع متساوي
        const init = 1 / MOVIES.length;
        for (const id in probabilities) probabilities[id] = init;
    }

    // 3. تحديث واجهة الثقة
    updateConfidence();

    // 4. اختيار السؤال التالي بعد تأخير بسيط للدراما
    document.getElementById('questionText').textContent = t().thinking;
    const ball = document.querySelector('.crystal-ball');
    ball.style.animation = 'shakeBall 0.5s ease-in-out infinite, glowBall 0.5s alternate infinite';
    
    setTimeout(selectBestQuestion, 600);
};

// ═══════════════════════════════════════════════════════════════════
// 10. الكشف النهائي
// ═══════════════════════════════════════════════════════════════════
function revealResult() {
    const top = getTopCandidate();
    // لو مفيش فيلم واضح، نختار الأعلى احتمالاً
    currentMovie = top.movie || MOVIES[0];
    
    document.getElementById('revealPoster').src = currentMovie.image;
    document.getElementById('revealTitle').textContent = currentLang === 'ar' ? currentMovie.title_ar : currentMovie.title_en;
    
    showScreen('screen-reveal');
    
    document.getElementById('confidenceBar').style.width = '100%';
    document.getElementById('confidenceText').textContent = '100%';
    if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

// ═══════════════════════════════════════════════════════════════════
// 11. النتيجة والمكافآت
// ═══════════════════════════════════════════════════════════════════
window._genieResult = async (isCorrect) => {
    const box = document.getElementById('resultBox');
    showScreen('screen-result');
    const tr = t();

    if (isCorrect) {
        if (window.confetti) confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        
        box.innerHTML = `
            <div class="result-icon">🎉</div>
            <div class="result-title" style="color:var(--green);">${tr.winTitle}</div>
            <div class="result-desc">${tr.winDesc}</div>
            <button class="action-btn start-btn" onclick="location.reload()">${tr.playAgain}</button>
        `;

        await runTransaction(ref(db, 'genie_stats/success'), (curr) => (curr || 0) + 1);
        if (isLoggedIn()) {
            await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => (curr || 0) + 20);
            showToast('🪙 +20 ' + tr.coins, 'success');
        }
    } else {
        box.innerHTML = `
            <div class="result-icon">😈</div>
            <div class="result-title" style="color:var(--gold);">${tr.loseTitle}</div>
            <div class="result-desc">${tr.loseDesc}</div>
            <input type="text" class="learn-input" id="actualMovieInput" placeholder="${currentLang === 'ar' ? 'اسم الفيلم...' : 'Movie name...'}">
            <button class="action-btn success" onclick="window._submitLearning()">${tr.submitLearn}</button>
        `;

        await runTransaction(ref(db, 'genie_stats/fail'), (curr) => (curr || 0) + 1);
        if (isLoggedIn()) {
            await runTransaction(ref(db, `users_data/${currentUser}/coins`), (curr) => (curr || 0) + 60);
            await set(ref(db, `badges/${currentUser}/😈 عصيّ على القراءة`), true);
            showToast('🪙 +60 ' + tr.coins, 'success');
        }
    }
};

window._submitLearning = async () => {
    const input = document.getElementById('actualMovieInput');
    const val = input.value.trim();
    if (!val) return showToast(currentLang === 'ar' ? 'اكتب اسم الفيلم الأول' : 'Enter movie name first', 'error');

    if (isLoggedIn()) {
        await set(ref(db, `genie_learning_data/${Date.now()}`), {
            guessed: currentMovie.id,
            actualMovie: val,
            user: currentUser,
            time: Date.now()
        });
        showToast(currentLang === 'ar' ? 'شكراً! الجني هيتعلم من الغلطة دي' : 'Thanks! Genie will learn from this', 'success');
    }
    setTimeout(() => location.reload(), 1500);
};

// تشغيل الترجمة عند التحميل
applyGenieLang();