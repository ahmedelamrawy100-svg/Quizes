import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
const firebaseConfig = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = initializeApp(firebaseConfig); const db = getDatabase(app);
window.db = db; window.ref = ref; window.set = set; window.onValue = onValue; window.update = update; window.get = get; window.remove = remove; window.push = push;

let startTime = 0; 

function setupStars() {
    const container = document.getElementById('stars-bg');
    if(!container) return;
    for (let i = 0; i < 50; i++) { let star = document.createElement('div'); star.className = 'star'; star.style.left = Math.random() * 100 + '%'; star.style.top = Math.random() * 100 + '%'; let size = Math.random() * 3 + 1; star.style.width = size + 'px'; star.style.height = size + 'px'; star.style.animationDuration = (Math.random() * 3 + 2) + 's'; star.style.animationDelay = Math.random() * 2 + 's'; container.appendChild(star); }
    for (let i = 0; i < 20; i++) { let star = document.createElement('div'); star.className = 'falling-star'; star.style.left = Math.random() * 100 + '%'; star.style.top = '-10px'; let duration = Math.random() * 10 + 5; star.style.animationDuration = duration + 's'; star.style.animationDelay = Math.random() * 5 + 's'; container.appendChild(star); }
}

function showToastMessage(msg) {
    let container = document.getElementById('custom-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'custom-toast-container';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(container);
    }
    let toast = document.createElement('div');
    toast.style.cssText = 'background:#111; border-right:5px solid #ff3333; color:#fff; padding:15px 20px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.5); font-weight:bold; font-family:Cairo, sans-serif; display:flex; align-items:center; gap:8px; animation: slideIn 0.3s forwards; direction: rtl;';
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function speakText(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'ar-EG';
        utterance.rate = 1.0; utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function injectHelperStyles() {
    if (document.getElementById('quizHelperStyles')) return;
    const style = document.createElement('style');
    style.id = 'quizHelperStyles';
    style.innerText = `
        #quizHelperBtn { position: fixed; bottom: 20px; right: 20px; z-index: 1000; background: linear-gradient(135deg, #8b0000, #ff3333); color: #fff; border: 2px solid #fff; width: 60px; height: 60px; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 5px 20px rgba(255,51,51,0.6); font-weight: bold; transition: 0.3s; font-family: Cairo, sans-serif; }
        #quizHelperBtn:hover { transform: scale(1.1); box-shadow: 0 8px 30px rgba(255,51,51,0.9); }
        #quizHelperBtn.loading { opacity: 0.6; cursor: wait; }
        #quizHelperBtn .count-bubble { position: absolute; top: -5px; right: -5px; background: #ffd700; color: #000; border-radius: 50%; width: 22px; height: 22px; font-size: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; border: 2px solid #fff; }
        #quizHelperPanel { position: fixed; bottom: 90px; right: 20px; z-index: 1001; background: #111; border: 2px solid #ff3333; border-radius: 15px; padding: 15px; width: 280px; max-height: 70vh; overflow-y: auto; display: none; box-shadow: 0 10px 40px rgba(0,0,0,0.8); direction: rtl; font-family: Cairo, sans-serif; }
        #quizHelperPanel h3 { color: #ff3333; margin: 0 0 10px 0; font-size: 18px; text-align: center; border-bottom: 1px solid #333; padding-bottom: 8px; }
        #quizHelperPanel .helper-empty { color: #aaa; text-align: center; padding: 20px; font-size: 14px; }
        #quizHelperPanel .helper-empty a { color: #ffd700; text-decoration: underline; }
        #quizHelperPanel .helper-loading { color: #00bcd4; text-align: center; padding: 20px; font-size: 14px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .helper-spinner { width: 30px; height: 30px; border: 3px solid #333; border-top-color: #00bcd4; border-radius: 50%; animation: helperSpin 0.8s linear infinite; }
        @keyframes helperSpin { to { transform: rotate(360deg); } }
        .helper-item { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 10px; margin-bottom: 6px; background: #222; color: #fff; border: 1px solid #444; border-radius: 8px; cursor: pointer; font-family: Cairo, sans-serif; font-size: 14px; transition: 0.2s; text-align: right; }
        .helper-item:hover { background: #333; border-color: #ff3333; }
        .helper-item:disabled { opacity: 0.4; cursor: not-allowed; }
        .helper-item .h-left { display: flex; align-items: center; gap: 8px; }
        .helper-item .h-right { background: #ff0000; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: bold; }
        .helper-item.active-boost { border-color: #4caf50; background: rgba(76,175,80,0.15); }
        .helper-close { width: 100%; padding: 8px; margin-top: 5px; background: #333; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: Cairo, sans-serif; font-weight: bold; }
        .boost-indicator { position: fixed; top: 15px; left: 15px; z-index: 1000; background: rgba(0,0,0,0.85); border: 2px solid #ffd700; color: #ffd700; padding: 8px 15px; border-radius: 20px; font-family: Cairo, sans-serif; font-weight: bold; font-size: 13px; display: none; }
    `;
    document.head.appendChild(style);
}

window.initQuiz = function(config) {
    const { title, quizKey, quizData, hasParts, partsList } = config;
    let currentLang = localStorage.getItem('lang') || 'ar';
    let highestScore = 0; 
    let currentSaveKey = quizKey;
    let currentQuestions = []; let current = 0, score = 0, answered = false, timerInterval = null, timeLeft = 20;
    let isChallengeMode = false; let isSpeedrun = false; let myRoomCode = null; let myRole = null;
    let ghostTimes = []; let playerAnswers = [];
    
    // ✅ Shop helper state
    let userInventory = {};
    let inventoryLoaded = false;
    let inventoryLoadPromise = null;
    let secondChanceActive = false;
    let isFrozen = false;
    let currentFreezeTick = null;
    const activeBoosts = { double_xp: false, double_coins: false, double_lb: false, ghost_mode: false };
    const itemMeta = {
        freeze10: { icon: '⏱️', name: 'تجميد 10ث' },
        freeze20: { icon: '⏱️', name: 'تجميد 20ث' },
        add10: { icon: '➕', name: 'إضافة 10ث' },
        add30: { icon: '➕', name: 'إضافة 30ث' },
        stop_timer: { icon: '🛑', name: 'إيقاف العداد' },
        fifty: { icon: '✂️', name: '50/50' },
        skip: { icon: '⏭️', name: 'تخطي' },
        hint_half: { icon: '💡', name: 'تلميح' },
        reveal: { icon: '👁️', name: 'إظهار' },
        second_chance: { icon: '🎲', name: 'فرصة تانية' },
        double_xp: { icon: '✨', name: 'مضاعف XP' },
        double_coins: { icon: '💰', name: 'مضاعف كوينز' },
        double_lb: { icon: '🏆', name: 'مضاعف ليدربورد' },
        ghost_mode: { icon: '👻', name: 'وضع الشبح' }
    };
    const timeQuestionItems = ['freeze10','freeze20','add10','add30','stop_timer','fifty','skip','hint_half','reveal'];
    const boostItems = ['double_xp','double_coins','double_lb','ghost_mode'];
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomCodeFromUrl = urlParams.get('room');
    const roleFromUrl = urlParams.get('role');
    
    if (roomCodeFromUrl) {
        myRoomCode = roomCodeFromUrl;
        myRole = roleFromUrl || 'player2';
        isChallengeMode = true;
        localStorage.setItem('activeRoomCode', myRoomCode);
    }
    
    const currentUser = (localStorage.getItem('loggedInUser') || 'Unknown').trim();
    const sndCorrect = new Audio('sounds/click.wav'); 
    const sndWrong = new Audio('sounds/scare.wav'); 
    const sndTick = new Audio('sounds/click.wav');
    
    function playSound(sound) {
        if (sound) { sound.currentTime = 0; sound.play().catch(e => {}); }
    }

    if (localStorage.getItem('theme') === 'light') { document.body.classList.add('light-mode'); }
    setupStars();
    applyLangOnLoad();
    injectHelperStyles();

    // ============================================
    // ✅ تحميل المخزون — دالة موحدة مع Promise
    // ============================================
    function loadInventory(force = false) {
        // لو محمّل بالفعل ومش بنجبر إعادة تحميل
        if (!force && inventoryLoadPromise) return inventoryLoadPromise;
        if (currentUser === 'Unknown' || !window.db) {
            inventoryLoaded = true;
            return Promise.resolve({});
        }
        
        // تحديث زرار المساعدات لحالة التحميل (لو موجود)
        const btn = document.getElementById('quizHelperBtn');
        const bubble = document.getElementById('helperCountBubble');
        if (btn) btn.classList.add('loading');
        if (bubble) bubble.innerText = '...';
        renderHelperItems(); // لو البانل مفتوح، اعرض ⏳
        
        inventoryLoadPromise = window.get(window.ref(window.db, 'users_data/' + currentUser + '/inventory'))
            .then(snap => {
                userInventory = snap.exists() ? (snap.val() || {}) : {};
                inventoryLoaded = true;
                if (btn) btn.classList.remove('loading');
                renderHelperItems();
                return userInventory;
            })
            .catch(e => {
                console.warn('inventory load failed', e);
                inventoryLoaded = true;
                if (btn) btn.classList.remove('loading');
                return {};
            });
        return inventoryLoadPromise;
    }

    // ✅ أطلق التحميل فوراً (قبل ما اللعبة تبدأ)
    if (window.db && currentUser !== 'Unknown') {
        loadInventory();
    }

    function applyLangOnLoad() {
        document.body.dir = currentLang === 'en' ? 'ltr' : 'rtl';
        const langBtn = document.getElementById('langBtn');
        if (langBtn) langBtn.innerText = currentLang === 'ar' ? 'EN' : 'AR';
        document.querySelectorAll('[data-ar]').forEach(el => {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = currentLang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
            } else {
                el.innerText = currentLang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
            }
        });
    }

    window.toggleLanguage = function() {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('lang', currentLang);
        applyLangOnLoad();
        const playScreen = document.getElementById('playScreen');
        if (playScreen && playScreen.style.display === 'block' && currentQuestions.length > 0) {
            loadQuestion(); 
        }
    }

    window.toggleTheme = function() {
        const body = document.body; 
        body.classList.toggle('light-mode');
        localStorage.setItem('theme', body.classList.contains('light-mode') ? 'light' : 'dark');
    }

    // ============================
    // ✅ Helper UI Setup
    // ============================
    function setupHelperUI() {
        if (document.getElementById('quizHelperBtn')) return;
        const playScreen = document.getElementById('playScreen') || document.body;
        
        const btn = document.createElement('button');
        btn.id = 'quizHelperBtn';
        // ✅ الحالة الابتدائية حسب ما إذا كان المخزون محمّل
        const initialBubble = inventoryLoaded ? Object.keys(userInventory).filter(k => userInventory[k] > 0).length : '...';
        btn.innerHTML = `🎒<span class="count-bubble" id="helperCountBubble">${initialBubble}</span>`;
        if (!inventoryLoaded) btn.classList.add('loading');
        btn.title = currentLang === 'en' ? 'Assistants' : 'المساعدات';
        btn.onclick = toggleHelperPanel;
        playScreen.appendChild(btn);
        
        const panel = document.createElement('div');
        panel.id = 'quizHelperPanel';
        panel.innerHTML = `<h3>🎒 ${currentLang === 'en' ? 'Your Assistants' : 'مساعداتك'}</h3><div id="helperItemsList"></div><button class="helper-close" onclick="toggleHelperPanel()">${currentLang === 'en' ? 'Close' : 'إغلاق'}</button>`;
        playScreen.appendChild(panel);
        
        const indicator = document.createElement('div');
        indicator.id = 'boostIndicator';
        indicator.className = 'boost-indicator';
        document.body.appendChild(indicator);
    }
    
    window.toggleHelperPanel = function() {
        const panel = document.getElementById('quizHelperPanel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        if (panel.style.display === 'block') {
            // ✅ لو لسه محملش، حاول تاني لما تفتح البانل
            if (!inventoryLoaded) {
                loadInventory(true);
            }
            renderHelperItems();
        }
    };
    
    function renderHelperItems() {
        const list = document.getElementById('helperItemsList');
        const bubble = document.getElementById('helperCountBubble');
        if (!list) return;
        
        // ✅ حالة التحميل — بدل ما تقول "مفيش أدوات"
        if (!inventoryLoaded) {
            if (bubble) bubble.innerText = '...';
            list.innerHTML = `<div class="helper-loading"><div class="helper-spinner"></div><div>${currentLang === 'en' ? 'Loading inventory...' : 'جاري تحميل المخزون...'}</div></div>`;
            return;
        }
        
        const usable = Object.keys(itemMeta).filter(id => (userInventory[id] || 0) > 0);
        if (bubble) bubble.innerText = usable.length;
        
        if (usable.length === 0) {
            list.innerHTML = `<div class="helper-empty">${currentLang === 'en' ? 'No assistants available.<br>Buy some from the <a href="shop.html">Shop</a>!' : 'مفيش مساعدات متاحة.<br>اشتري من <a href="shop.html">المتجر</a>!'}</div>`;
            return;
        }
        
        list.innerHTML = '';
        usable.forEach(itemId => {
            const meta = itemMeta[itemId];
            const count = userInventory[itemId];
            const isBoost = boostItems.includes(itemId);
            const isActive = isBoost && activeBoosts[itemId];
            const isBlockedAfterAnswer = answered && timeQuestionItems.includes(itemId);
            
            const btn = document.createElement('button');
            btn.className = 'helper-item' + (isActive ? ' active-boost' : '');
            btn.disabled = isBlockedAfterAnswer;
            btn.innerHTML = `<span class="h-left">${meta.icon} ${meta.name}${isActive ? ' ✅' : ''}</span><span class="h-right">x${count}</span>`;
            btn.onclick = () => useItem(itemId);
            list.appendChild(btn);
        });
    }
    
    async function consumeItem(itemId) {
        if ((userInventory[itemId] || 0) <= 0) return false;
        userInventory[itemId]--;
        const updates = {};
        updates[`users_data/${currentUser}/inventory/${itemId}`] = userInventory[itemId] > 0 ? userInventory[itemId] : null;
        try {
            await window.update(window.ref(window.db), updates);
        } catch(e) { console.warn('inventory update failed', e); }
        renderHelperItems();
        return true;
    }
    
    // ============================
    // ✅ Item Effects (زي ما هي)
    // ============================
    function freezeTimer(seconds) {
        if (isFrozen) { showToastMessage('⏱️ العداد متجمد بالفعل!'); return; }
        isFrozen = true;
        clearInterval(timerInterval);
        timerInterval = null;
        const timerEl = document.getElementById('timer');
        let remaining = seconds;
        timerEl.innerText = `❄️ ${remaining}s`;
        timerEl.style.color = '#00bcd4';
        playSound(sndTick);
        currentFreezeTick = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                timerEl.innerText = `❄️ ${remaining}s`;
            } else {
                clearInterval(currentFreezeTick);
                currentFreezeTick = null;
                isFrozen = false;
                timerEl.innerText = `⏱️ ${timeLeft}`;
                timerEl.style.color = '';
                if (!answered && timeLeft > 0) timerInterval = setInterval(updateTimer, 1000);
            }
        }, 1000);
    }
    
    function addTime(seconds) {
        timeLeft += seconds;
        document.getElementById('timer').innerText = `⏱️ ${timeLeft}`;
        showToastMessage(`➕ +${seconds} ثانية!`);
    }
    
    function stopTimer() {
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        isFrozen = false;
        clearInterval(timerInterval);
        document.getElementById('timer').innerText = '🛑 متوقف';
        showToastMessage('🛑 العداد اتوقف للسؤال ده!');
    }
    
    function useFifty() {
        const q = currentQuestions[current];
        let activeLang = localStorage.getItem('lang') || 'ar';
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en;
        if (!opts) opts = q.options_en || q.options_ar;
        const correctText = opts[q.answer];
        const allOpts = Array.from(document.querySelectorAll('.option'));
        const wrongOpts = allOpts.filter(o => o.innerText !== correctText && !o.classList.contains('disabled'));
        wrongOpts.sort(() => Math.random() - 0.5);
        wrongOpts.slice(0, 2).forEach(o => { o.classList.add('disabled'); o.style.opacity = '0.25'; });
        showToastMessage('✂️ اتحذفت إجابتين غلط!');
    }
    
    function skipQuestion() {
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        isFrozen = false;
        clearInterval(timerInterval);
        answered = true;
        showToastMessage('⏭️ تم تخطي السؤال');
        setTimeout(() => { current++; if (current < currentQuestions.length) loadQuestion(); else showFinal(); }, 800);
    }
    
    function useHintHalf() {
        const q = currentQuestions[current];
        let activeLang = localStorage.getItem('lang') || 'ar';
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en;
        if (!opts) opts = q.options_en || q.options_ar;
        const correctText = opts[q.answer];
        const half = correctText.substring(0, Math.ceil(correctText.length / 2));
        showToastMessage(`💡 الإجابة بتبدأ بـ "${half}..."`);
    }
    
    function useReveal() {
        const q = currentQuestions[current];
        let activeLang = localStorage.getItem('lang') || 'ar';
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en;
        if (!opts) opts = q.options_en || q.options_ar;
        const correctText = opts[q.answer];
        document.querySelectorAll('.option').forEach(o => {
            if (o.innerText === correctText) {
                o.style.border = '3px solid #4caf50';
                o.style.boxShadow = '0 0 15px #4caf50';
            }
        });
        showToastMessage('👁️ الإجابة الصحيحة اتوضحت!');
    }
    
    function activateSecondChance() {
        if ((userInventory['second_chance'] || 0) <= 0) {
            showToastMessage('مفيش عندك فرص تانية!');
            return;
        }
        if (secondChanceActive) { showToastMessage('مفعلة بالفعل!'); return; }
        secondChanceActive = true;
        showToastMessage('🎲 لو غلطت في السؤال ده، عندك فرصة تانية!');
    }
    
    function activateDoubleXP() { activeBoosts.double_xp = true; showToastMessage('✨ XP هيتضاعف في الكويز ده!'); updateBoostIndicator(); }
    function activateDoubleCoins() { activeBoosts.double_coins = true; showToastMessage('💰 الكوينز هتتضاعف!'); updateBoostIndicator(); }
    function activateDoubleLB() { activeBoosts.double_lb = true; showToastMessage('🏆 نقاط الليدربورد هتتضاعف!'); updateBoostIndicator(); }
    function activateGhostMode() { activeBoosts.ghost_mode = true; showToastMessage('👻 وضع الشبح: اسمك مش هيظهر في الليدربورد!'); updateBoostIndicator(); }
    
    function updateBoostIndicator() {
        const indicator = document.getElementById('boostIndicator');
        if (!indicator) return;
        const actives = [];
        if (activeBoosts.double_xp) actives.push('✨x2');
        if (activeBoosts.double_coins) actives.push('💰x2');
        if (activeBoosts.double_lb) actives.push('🏆x2');
        if (activeBoosts.ghost_mode) actives.push('👻');
        if (actives.length > 0) { indicator.innerText = actives.join(' | '); indicator.style.display = 'block'; }
        else indicator.style.display = 'none';
    }
    
    // ✅ useItem — بيستنى التحميل بدل ما يقول "مش معاك"
    window.useItem = async function(itemId) {
        // ✅ لو المخزون لسه بيتحمل، استنى لحد ما يخلص (بدل "مش معاك")
        if (!inventoryLoaded) {
            showToastMessage(currentLang === 'en' ? '⏳ Loading inventory...' : '⏳ جاري تحميل المخزون...');
            await loadInventory();
        }
        
        // Guards
        if (answered && timeQuestionItems.includes(itemId)) {
            showToastMessage('⚠️ مينفعش تستخدم الأداة دي بعد ما جاوبت!');
            return;
        }
        if (isChallengeMode && ['double_xp','double_coins','double_lb'].includes(itemId)) {
            showToastMessage('⚠️ مضاعفات المكافآت مش بتشتغل في التحدي!');
            return;
        }
        if ((userInventory[itemId] || 0) <= 0) {
            showToastMessage('مفيش عندك من الأداة دي!');
            return;
        }
        
        // Second chance arms (no consume yet)
        if (itemId === 'second_chance') {
            activateSecondChance();
            window.toggleHelperPanel();
            return;
        }
        
        // Consume
        const consumed = await consumeItem(itemId);
        if (!consumed) return;
        
        switch(itemId) {
            case 'freeze10': freezeTimer(10); break;
            case 'freeze20': freezeTimer(20); break;
            case 'add10': addTime(10); break;
            case 'add30': addTime(30); break;
            case 'stop_timer': stopTimer(); break;
            case 'fifty': useFifty(); break;
            case 'skip': skipQuestion(); break;
            case 'hint_half': useHintHalf(); break;
            case 'reveal': useReveal(); break;
            case 'double_xp': activateDoubleXP(); break;
            case 'double_coins': activateDoubleCoins(); break;
            case 'double_lb': activateDoubleLB(); break;
            case 'ghost_mode': activateGhostMode(); break;
        }
        
        const panel = document.getElementById('quizHelperPanel');
        if (panel) panel.style.display = 'none';
    };
    
    // ============================
    // ✅ Challenge mode logic
    // ============================
    if (isChallengeMode && myRoomCode) {
        let challengeStarted = false;
        const roomListener = window.onValue(window.ref(window.db, 'rooms/' + myRoomCode), (snapshot) => {
            if (challengeStarted) return;
            const roomData = snapshot.val();
            if (!roomData) {
                if (!challengeStarted) {
                    alert(currentLang === 'en' ? "Room was closed. Redirecting..." : "الغرفة اتقفلت. جاري الرجوع...");
                    setTimeout(() => window.location.href = 'index.html', 2000);
                }
                return;
            }
            if (roomData.status === 'playing') {
                challengeStarted = true;
                setTimeout(() => startGame('challenge'), 300);
            }
        });
    }

    window.openChallengeModal = function() { 
        const modal = document.getElementById('challengeModal');
        if (modal) {
            modal.style.display = 'flex'; 
            document.getElementById('roomOptions').style.display = 'block'; 
            document.getElementById('waitingRoom').style.display = 'none'; 
        }
    }
    
    window.closeChallengeModal = function() { 
        const modal = document.getElementById('challengeModal');
        if (modal) modal.style.display = 'none'; 
        if (myRoomCode && myRole === 'player1') { 
            window.remove(window.ref(window.db, 'rooms/' + myRoomCode)); 
            localStorage.removeItem('activeRoomCode');
            myRoomCode = null; 
        } 
    }

    window.createRoom = function() { 
        const code = Math.random().toString(36).substring(2, 8).toUpperCase(); 
        myRoomCode = code; myRole = 'player1'; isChallengeMode = true; 
        localStorage.setItem('activeRoomCode', myRoomCode);
        document.getElementById('displayRoomCode').innerText = code; 
        document.getElementById('roomOptions').style.display = 'none'; 
        document.getElementById('waitingRoom').style.display = 'block'; 
        window.set(window.ref(window.db, 'rooms/' + code), { player1_score: null, player2_score: null, status: 'waiting', quizType: currentSaveKey, created_at: Date.now(), player1_name: currentUser }).then(() => { 
            window.onValue(window.ref(window.db, 'rooms/' + code), (snapshot) => { 
                const data = snapshot.val(); 
                if (data && data.status === 'playing' && myRole === 'player1' && !document.getElementById('playScreen').classList.contains('active-play')) { 
                    document.getElementById('challengeModal').style.display = 'none'; startGame('challenge'); 
                } 
            }); 
        }); 
    }
    
    window.joinRoom = function() { 
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase(); 
        if (!code) { alert(currentLang === 'en' ? "Enter room code first!" : "اكتب كود الغرفة الأول!"); return; } 
        myRole = 'player2'; myRoomCode = code; isChallengeMode = true; 
        localStorage.setItem('activeRoomCode', myRoomCode);
        window.get(window.ref(window.db, 'rooms/' + code)).then((snapshot) => { 
            if (snapshot.exists()) { 
                const data = snapshot.val(); 
                if (data.status === 'waiting') { 
                    window.update(window.ref(window.db, 'rooms/' + code), { status: 'playing', player2_name: currentUser }).then(() => { document.getElementById('challengeModal').style.display = 'none'; startGame('challenge'); }); 
                } else { alert(currentLang === 'en' ? "Room is full or game started." : "هذه الغرفة ممتلئة أو اللعبة بدأت بالفعل."); } 
            } else { alert(currentLang === 'en' ? "Invalid room code." : "كود الغرفة غير صحيح."); } 
        }); 
    }

    window.startRandomMatch = async function() {
        isChallengeMode = true;
        const roomsSnap = await window.get(window.ref(window.db, 'rooms'));
        if (roomsSnap.exists()) {
            const rooms = roomsSnap.val(); let foundRoom = null;
            for (let code in rooms) { if (rooms[code].status === 'waiting' && (rooms[code].quizType === currentSaveKey || rooms[code].quizType === quizKey)) { foundRoom = code; break; } }
            if (foundRoom) {
                myRoomCode = foundRoom; myRole = 'player2';
                localStorage.setItem('activeRoomCode', myRoomCode);
                await window.update(window.ref(window.db, 'rooms/' + myRoomCode), { status: 'playing', player2_name: currentUser });
                startGame('challenge');
            } else { createRandomRoom(); }
        } else { createRandomRoom(); }
    }

    async function createRandomRoom() {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase(); 
        myRoomCode = code; myRole = 'player1';
        localStorage.setItem('activeRoomCode', myRoomCode);
        await window.set(window.ref(window.db, 'rooms/' + code), { player1_score: null, player2_score: null, status: 'waiting', quizType: currentSaveKey, created_at: Date.now(), player1_name: currentUser });
        document.getElementById('challengeModal').style.display = 'flex'; document.getElementById('roomOptions').style.display = 'none'; document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('displayRoomCode').innerText = code;
        document.getElementById('waitingStatus').innerText = currentLang === 'en' ? "Waiting for a random player..." : "في انتظار لاعب عشوائي...";
        window.onValue(window.ref(window.db, 'rooms/' + code), (snapshot) => { 
            const data = snapshot.val(); 
            if (data && data.status === 'playing' && myRole === 'player1' && !document.getElementById('playScreen').classList.contains('active-play')) { 
                document.getElementById('challengeModal').style.display = 'none'; startGame('challenge'); 
            } 
        }); 
    }

    window.startGame = function(part) { 
        isSpeedrun = false; ghostTimes = []; playerAnswers = [];
        // ✅ Reset shop state
        activeBoosts.double_xp = false; activeBoosts.double_coins = false; activeBoosts.double_lb = false; activeBoosts.ghost_mode = false;
        secondChanceActive = false; isFrozen = false;
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        updateBoostIndicator();
        setupHelperUI();
        // ✅ لو المخزون لسه محملش، فعّله تاني (idempotent)
        if (!inventoryLoaded) loadInventory();
        renderHelperItems();
        
        if (part === 'challenge') { 
            let challengeQuestions = null;
            if (quizData.comprehensive && quizData.comprehensive.length > 0) { challengeQuestions = [...quizData.comprehensive]; } 
            else if (quizData.all && quizData.all.length > 0) { challengeQuestions = [...quizData.all]; } 
            else if (quizData.part1 && quizData.part1.length > 0) { challengeQuestions = [...quizData.part1]; } 
            else if (partsList) { for (let key in partsList) { if (partsList[key] && partsList[key].length > 0) { challengeQuestions = [...partsList[key]]; break; } } }
            if (!challengeQuestions || challengeQuestions.length === 0) { alert(currentLang === 'en' ? "Quiz data not found!" : "بيانات الكويز غير موجودة!"); return; }
            currentQuestions = challengeQuestions;
            isChallengeMode = true; document.getElementById('playScreen').classList.add('active-play'); 
        } 
        else if (part === 'all') { currentQuestions = [...(quizData.comprehensive || quizData.all || quizData.part1 || [])]; currentSaveKey = quizKey + '_all'; } 
        else if (partsList && partsList[part]) { currentQuestions = [...partsList[part]]; currentSaveKey = quizKey + '_' + part; }
        
        if (currentQuestions.length === 0) { alert(currentLang === 'en' ? "No questions available!" : "لا توجد أسئلة متاحة!"); return; }
        currentQuestions.sort(() => Math.random() - 0.5); highestScore = 0; 
        
        document.getElementById('selectionScreen').style.display = 'none'; document.getElementById('playScreen').style.display = 'block'; 
        const backBtn = document.getElementById('backBtn'); if (backBtn) backBtn.style.display = 'none'; 
        current = 0; score = 0; 
        
        speakText(currentLang === 'ar' ? "استعد.. اللعبة هتبدأ الآن!" : "Get ready.. The game is about to begin!", currentLang);
        loadQuestion(); 
    }
    
    window.startSpeedrun = function() { startGame('all'); isSpeedrun = true; startTime = Date.now(); }

    function loadQuestion() { 
        if (!currentQuestions || currentQuestions.length === 0) return;
        answered = false; timeLeft = isSpeedrun ? 5 : 20; 
        isFrozen = false;
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        
        let activeLang = localStorage.getItem('lang') || 'ar';
        const q = currentQuestions[current]; 
        let qText = activeLang === 'ar' ? q.q_ar : q.q_en; if (!qText) qText = q.q_en || q.q_ar; 
        document.getElementById('question').innerText = qText; 
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en; if (!opts) opts = q.options_en || q.options_ar; 
        const optEl = document.getElementById('options'); optEl.innerHTML = ''; 
        let optionsWithAnswers = opts.map((opt, index) => ({ text: opt, isCorrect: index === q.answer })); 
        optionsWithAnswers.sort(() => Math.random() - 0.5); 
        optionsWithAnswers.forEach((opt) => { 
            const div = document.createElement('div'); div.className = 'option'; div.innerText = opt.text; 
            div.onclick = () => checkAnswer(opt.isCorrect, div); optEl.appendChild(div); 
        if (localStorage.getItem('testerDevMode') === 'true') {
            optionsWithAnswers.forEach((opt, index) => {
                if (opt.isCorrect) {
                    const correctOpt = document.querySelectorAll('.option')[index];
                    if (correctOpt) {
                        correctOpt.style.border = '3px solid #4caf50';
                        correctOpt.style.boxShadow = '0 0 15px #4caf50';
                    }
                }
            });
        }
        }); 
        
        let scoreText = activeLang === 'en' ? `Question ${current + 1} of ${currentQuestions.length} | Score: ${score}` : `سؤال ${current + 1} من ${currentQuestions.length} | النقاط: ${score}`;
        if (activeBoosts.double_xp) scoreText += ' ✨x2';
        if (activeBoosts.double_coins) scoreText += ' 💰x2';
        if (activeBoosts.double_lb) scoreText += ' 🏆x2';
        document.getElementById('score').innerText = scoreText; 
        
        document.getElementById('next').style.display = 'none'; document.getElementById('progress').style.width = ((current) / currentQuestions.length * 100) + '%'; 
        
        document.getElementById('question').classList.add('cinematic-entrance');
        document.getElementById('options').classList.add('cinematic-entrance');

        clearInterval(timerInterval); timerInterval = setInterval(updateTimer, 1000); updateTimer(); 
        
        const panel = document.getElementById('quizHelperPanel');
        if (panel && panel.style.display === 'block') renderHelperItems();
    }

    function updateTimer() { 
        if (isFrozen) return;
        const timerEl = document.getElementById('timer'); timerEl.innerText = `⏱️ ${timeLeft}`; 
        
        let vignette = document.getElementById('redVignette');
        if (timeLeft <= 5 && !answered) {
            if (!vignette) { vignette = document.createElement('div'); vignette.id = 'redVignette'; vignette.className = 'red-vignette'; document.body.appendChild(vignette); }
        } else { if (vignette) vignette.remove(); }

        if (timeLeft <= 5) { timerEl.style.color = '#f44336'; playSound(sndTick); } else { timerEl.style.color = ''; } 
        if (timeLeft <= 0) { 
            clearInterval(timerInterval); 
            if (!answered) { 
                answered = true; document.querySelectorAll('.option').forEach(o => o.classList.add('disabled')); 
                let activeLang = localStorage.getItem('lang') || 'ar'; const q = currentQuestions[current]; let opts = activeLang === 'ar' ? q.options_ar : q.options_en; if (!opts) opts = q.options_en || q.options_ar; 
                document.querySelectorAll('.option').forEach(o => { if(o.innerText === opts[q.answer]) o.classList.add('correct'); }); 
                document.getElementById('next').style.display = 'inline-block'; 
                if (!isChallengeMode && !isSpeedrun) { ghostTimes.push(20); }
                playerAnswers.push(20); 
            } 
        } timeLeft--; 
    }

    function checkAnswer(isCorrect, el) { 
        if (answered) return;
        
        let activeLang = localStorage.getItem('lang') || 'ar'; 
        const q = currentQuestions[current]; 
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en; 
        if (!opts) opts = q.options_en || q.options_ar;
        
        if (!isCorrect && secondChanceActive) {
            if ((userInventory['second_chance'] || 0) > 0) {
                secondChanceActive = false;
                userInventory['second_chance']--;
                const updates = {};
                updates[`users_data/${currentUser}/inventory/second_chance`] = userInventory['second_chance'] > 0 ? userInventory['second_chance'] : null;
                window.update(window.ref(window.db), updates).catch(e => console.warn(e));
                renderHelperItems();
                
                document.querySelectorAll('.option').forEach(o => o.classList.remove('disabled'));
                el.classList.add('wrong');
                setTimeout(() => el.classList.remove('wrong'), 800);
                el.classList.add('disabled');
                showToastMessage('🎲 فرصة تانية! جرب تاني!');
                playSound(sndWrong);
                return;
            } else {
                secondChanceActive = false;
            }
        }
        
        answered = true; 
        clearInterval(timerInterval); 
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        isFrozen = false;
        
        let vignette = document.getElementById('redVignette');
        if (vignette) vignette.remove();

        const allOpts = document.querySelectorAll('.option'); allOpts.forEach(o => o.classList.add('disabled')); allOpts.forEach(o => { if(o.innerText === opts[q.answer]) o.classList.add('correct'); }); 
        
        let timeTaken = 20 - timeLeft;
        playerAnswers.push(timeTaken); 

        if (isCorrect) { 
            score += isSpeedrun ? 2 : 1; playSound(sndCorrect);
            const rect = el.getBoundingClientRect(); const x = (rect.left + rect.width / 2) / window.innerWidth; const y = (rect.top + rect.height / 2) / window.innerHeight;
            confetti({ particleCount: 30, spread: 60, origin: { x: x, y: y }, colors: ['#ffd700', '#ff3333', '#ffffff'], ticks: 100, gravity: 0.8, scalar: 0.8 });
        } else { 
            el.classList.add('wrong'); playSound(sndWrong); 
            
            document.getElementById('playScreen').classList.add('screen-glitch');
            document.getElementById('playScreen').classList.add('cinematic-glitch');
            setTimeout(() => { 
                document.getElementById('playScreen').classList.remove('screen-glitch'); 
                document.getElementById('playScreen').classList.remove('cinematic-glitch');
            }, 500);
        } 
        
        let scoreText = activeLang === 'en' ? `Question ${current + 1} of ${currentQuestions.length} | Score: ${score}` : `سؤال ${current + 1} من ${currentQuestions.length} | النقاط: ${score}`;
        if (activeBoosts.double_xp) scoreText += ' ✨x2';
        if (activeBoosts.double_coins) scoreText += ' 💰x2';
        if (activeBoosts.double_lb) scoreText += ' 🏆x2';
        document.getElementById('score').innerText = scoreText;
        
        document.getElementById('next').style.display = 'inline-block'; 
        if (!isChallengeMode && !isSpeedrun) { ghostTimes.push(20 - timeLeft); }
        if('speechSynthesis' in window) window.speechSynthesis.resume();
        
        renderHelperItems();
    }

    window.nextQuestion = function() { current++; if (current < currentQuestions.length) { loadQuestion(); } else { showFinal(); } }

    function getPlayerPersona(score, total, avgTime) {
        let persona = "", personaDesc = "";
        const isAr = (localStorage.getItem('lang') || 'ar') === 'ar';
        if (score >= (total * 0.8)) {
            if (avgTime <= 6) { persona = isAr ? "⚡ الأسطورة" : "⚡ The Legend"; personaDesc = isAr ? "بتجاوب بسرعة رهيبة ودقة عالية جداً. أنت عبقري!" : "You answer incredibly fast with high accuracy. You're a genius!"; }
            else { persona = isAr ? "🧠 المفكر الاستراتيجي" : "🧠 The Strategist"; personaDesc = isAr ? "بتاخد وقتك في التفكير وبتطلع دايماً صح. ذكاء خارق!" : "You take your time thinking and always get it right. Brilliant!"; }
        } else if (score >= (total * 0.5)) {
            if (avgTime <= 6) { persona = isAr ? "🔥 المتهور" : "🔥 The Reckless"; personaDesc = isAr ? "بتجاوب بسرعة جداً، لكن ساعات بتغلط بسبب التسرع. خد وقتك شوية!" : "You answer very fast, but sometimes make mistakes due to haste. Take your time!"; }
            else { persona = isAr ? "🎯 المتوازن" : "🎯 The Balanced"; personaDesc = isAr ? "أداءك حلو ومتوازن، محتاج شوية تدريب عشان تبقى أسطورة." : "Your performance is good and balanced, needs a little training to be a legend."; }
        } else {
            if (avgTime <= 6) { persona = isAr ? "🎲 المخاطر" : "🎲 The Gambler"; personaDesc = isAr ? "بتخمن بسرعة من غير ما تفكر كتير. جرب تقرا السؤال كويس!" : "You guess quickly without thinking much. Try reading the question well!"; }
            else { persona = isAr ? "🐢 المتأمل" : "🐢 The Contemplator"; personaDesc = isAr ? "بتاخد وقتك جداً في التفكير وبتغلط كتير. محتاج تراجع معلوماتك." : "You take a very long time thinking and make many mistakes. You need to review your info."; }
        }
        return { persona, personaDesc };
    }

    async function showFinal() {
        clearInterval(timerInterval); 
        if (currentFreezeTick) { clearInterval(currentFreezeTick); currentFreezeTick = null; }
        isFrozen = false;
        const helperBtn = document.getElementById('quizHelperBtn');
        const helperPanel = document.getElementById('quizHelperPanel');
        const boostInd = document.getElementById('boostIndicator');
        if (helperBtn) helperBtn.style.display = 'none';
        if (helperPanel) helperPanel.style.display = 'none';
        if (boostInd) boostInd.style.display = 'none';
        
        document.getElementById('progress').style.width = '100%'; 
        if (score > (currentQuestions.length / 2)) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
        
        let vignette = document.getElementById('redVignette');
        if (vignette) vignette.remove();

        let activeLang = localStorage.getItem('lang') || 'ar';

        if (isChallengeMode && myRoomCode) { 
            let updateData = {}; if (myRole === 'player1') updateData.player1_score = score; else updateData.player2_score = score; 
            window.update(window.ref(window.db, 'rooms/' + myRoomCode), updateData).then(() => { 
                document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#ff0000; font-size:30px; margin-bottom:15px;">${activeLang === 'en' ? 'Waiting for friend... ⏳' : 'في انتظار صديقك... ⏳'}</h2><p style="color:#aaa; font-size:18px;">${activeLang === 'en' ? 'Please wait for them to finish.' : 'رجاءً استنى لحد ما يخلص الكويز.'}</p></div>`; 
                document.getElementById('options').innerHTML = ''; document.getElementById('timer').style.display = 'none'; document.getElementById('score').innerText = ''; document.getElementById('next').style.display = 'none'; 
                window.onValue(window.ref(window.db, 'rooms/' + myRoomCode), (snapshot) => { 
                    const data = snapshot.val(); 
                    if (data && data.player1_score !== null && data.player2_score !== null) { 
                        const myScore = myRole === 'player1' ? data.player1_score : data.player2_score; const opScore = myRole === 'player1' ? data.player2_score : data.player1_score; 
                        let resultMsg = ""; 
                        if (myScore > opScore) resultMsg = activeLang === 'en' ? "🎉 You Won!" : "🎉 أنت الفائز!"; 
                        else if (myScore < opScore) resultMsg = activeLang === 'en' ? "😢 You Lost!" : "😢 خسرت التحدي!"; 
                        else resultMsg = activeLang === 'en' ? "🤝 Draw!" : "🤝 تعادل!"; 
                        document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#ff0000; font-size:36px;">${resultMsg}</h2><p style="color:var(--text-color); font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${myScore} | ${activeLang === 'en' ? 'Friend Score' : 'نتيجة صديقك'}: ${opScore}</p><button onclick="location.href='index.html'" style="margin-top:20px; padding:12px 30px; background:#8b0000; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px; font-weight:bold;">${activeLang === 'en' ? 'Back to Home' : 'العودة للرئيسية'}</button></div>`; 
                        const backBtn = document.getElementById('backBtn'); if (backBtn) backBtn.style.display = 'flex'; 
                        window.remove(window.ref(window.db, 'rooms/' + myRoomCode)); localStorage.removeItem('activeRoomCode');
                    } 
                }); 
            }); 
        } 
        else if (isChallengeMode && !myRoomCode) { setTimeout(() => { window.location.href = 'index.html'; }, 3000); } 
        else {
            let realHighScore = highestScore;
            if (localStorage.getItem(currentSaveKey) > realHighScore) { realHighScore = localStorage.getItem(currentSaveKey); }

            let avgTime = 0;
            if (playerAnswers.length > 0) {
                let sum = playerAnswers.reduce((a, b) => a + b, 0);
                avgTime = Math.round(sum / playerAnswers.length);
            }

            const { persona, personaDesc } = getPlayerPersona(score, currentQuestions.length, avgTime);
            
            let xpGain = score;
            let coinGain = 5;
            let lbScore = score;
            if (activeBoosts.double_xp) xpGain *= 2;
            if (activeBoosts.double_coins) coinGain *= 2;
            if (activeBoosts.double_lb) lbScore *= 2;
            
            let boostSummaryHtml = '';
            if (activeBoosts.double_xp || activeBoosts.double_coins || activeBoosts.double_lb || activeBoosts.ghost_mode) {
                let parts = [];
                if (activeBoosts.double_xp) parts.push(`✨ XP: +${xpGain} (x2)`);
                if (activeBoosts.double_coins) parts.push(`💰 ${activeLang === 'en' ? 'Coins' : 'كوينز'}: +${coinGain} (x2)`);
                if (activeBoosts.double_lb) parts.push(`🏆 ${activeLang === 'en' ? 'Leaderboard' : 'ليدربورد'}: +${lbScore} (x2)`);
                if (activeBoosts.ghost_mode) parts.push(`👻 ${activeLang === 'en' ? 'Name hidden' : 'الاسم مخفي'}`);
                boostSummaryHtml = `<div style="margin-top: 15px; padding: 12px; background: rgba(255,215,0,0.1); border: 1px solid #ffd700; border-radius: 10px;"><h4 style="color:#ffd700; margin-bottom:8px; font-size:16px;">⚡ ${activeLang === 'en' ? 'Boosts Applied' : 'التعزيزات المطبقة'}</h4>${parts.map(p=>`<p style="font-size:14px; color:#ddd; margin:4px 0;">${p}</p>`).join('')}</div>`;
            }

            document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;">
                <h2 style="color:#ff0000; font-size:36px;">${activeLang === 'en' ? 'Quiz Over! 🎬' : 'انتهى الكويز! 🎬'}</h2>
                <p style="color:var(--text-color); font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${score} / ${currentQuestions.length}</p>
                <p style="color:#ffcc00; font-size:18px; margin-top:10px; font-weight:bold;">${activeLang === 'en' ? 'High Score' : 'أعلى نتيجة'}: ${realHighScore}</p>
                
                <div style="margin-top: 20px; background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 15px; border: 2px dashed #00bcd4;">
                    <h3 style="color: #00bcd4; font-size: 26px; margin-bottom: 10px;">${persona}</h3>
                    <p style="font-size: 16px; color: #ddd;">${personaDesc}</p>
                    <p style="font-size: 14px; color: #aaa; margin-top: 10px;">(متوسط سرعة إجابتك: ${avgTime} ثانية)</p>
                </div>
                
                ${boostSummaryHtml}

                <div style="margin-top: 20px; border-top: 1px dashed #333; padding-top: 20px;">
                    <button onclick="window.startGhostQuiz()" style="padding:15px 30px; background:#0088cc; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px; font-weight:bold; width:100%; max-width:300px; margin: 0 auto; display:block; margin-bottom: 10px;">👻 ${activeLang === 'en' ? 'Play Against Your Ghost' : 'العب ضد شبحك'}</button>
                </div>

                <div class="share-container" style="margin-top: 10px;">
                    <div class="share-title">${activeLang === 'en' ? 'Share your result with friends!' : 'شارك نتيجتك مع أصحابك!'}</div>
                    <div class="share-buttons">
                        <button class="share-btn share-wa" onclick="shareResult('whatsapp')">📱 WhatsApp</button>
                        <button class="share-btn share-tg" onclick="shareResult('telegram')">✈️ Telegram</button>
                        <button class="share-btn share-fb" onclick="shareResult('facebook')">📘 Facebook</button>
                        <button class="share-btn share-tw" onclick="shareResult('twitter')">🐦 Twitter</button>
                    </div>
                </div>
                <button onclick="location.reload()" style="margin-top:20px; padding:12px 30px; background:#8b0000; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px; width:100%; max-width:250px; display:block; margin-left:auto; margin-right:auto;">${activeLang === 'en' ? 'Play Again' : 'العب تاني'}</button>
            </div>`;
            
            document.getElementById('options').innerHTML = ''; document.getElementById('timer').style.display = 'none';
            document.getElementById('score').innerText = ''; document.getElementById('next').style.display = 'none';
            const backBtn = document.getElementById('backBtn'); if (backBtn) backBtn.style.display = 'flex'; 

            if (window.db && currentUser !== 'Unknown') { 
                window.set(window.ref(window.db, 'scores/' + currentUser + '/' + currentSaveKey + '/' + Date.now()), { score: score, total: currentQuestions.length, time: new Date().toISOString() }); 
                
                if (!activeBoosts.ghost_mode) {
                    window.set(window.ref(window.db, 'leaderboard/' + currentUser + '/' + currentSaveKey + '/' + Date.now()), { score: lbScore, total: currentQuestions.length, time: new Date().toISOString() }); 
                }
                
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/xp')).then(snap => { 
                    let xp = snap.exists() ? snap.val() : 0; window.set(window.ref(window.db, 'users_data/' + currentUser + '/xp'), xp + xpGain); 
                }); 
                
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/coins')).then(coinSnap => {
                    let currentCoins = coinSnap.exists() ? coinSnap.val() : 0; window.set(window.ref(window.db, 'users_data/' + currentUser + '/coins'), currentCoins + coinGain);
                });

                window.push(window.ref(window.db, 'activity_feed'), { user: currentUser, action: "أنهى", detail: "كويز " + (quizKey.toUpperCase()) + " بنتيجة " + score, time: Date.now() });

                window.get(window.ref(window.db, 'users_data/' + currentUser + '/team')).then(teamSnap => {
                    if (teamSnap.exists()) {
                        const playerTeam = teamSnap.val();
                        window.get(window.ref(window.db, 'teams/' + playerTeam)).then(currentScoreSnap => {
                            let currentScore = currentScoreSnap.exists() ? currentScoreSnap.val() : 0;
                            window.set(window.ref(window.db, 'teams/' + playerTeam), currentScore + score);
                        });
                    }
                });

                window.push(window.ref(window.db, 'users_data/' + currentUser + '/history'), {
                    title: "أنهى كويز: " + quizKey.toUpperCase(), description: "بنتيجة " + score + " من " + currentQuestions.length, time: Date.now()
                });

                const today = new Date().toDateString();
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/lastPlay')).then(snap => {
                    let lastPlay = snap.exists() ? snap.val() : null; let currentStreak = 0;
                    window.get(window.ref(window.db, 'users_data/' + currentUser + '/streak')).then(s => { currentStreak = s.exists() ? s.val() : 0; });
                    if (lastPlay !== today) {
                        let yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                        if (lastPlay === yesterday.toDateString()) { currentStreak++; } else { currentStreak = 1; }
                        window.set(window.ref(window.db, 'users_data/' + currentUser + '/streak'), currentStreak);
                        window.set(window.ref(window.db, 'users_data/' + currentUser + '/lastPlay'), today);
                        let bonusXP = currentStreak * 5; 
                        window.get(window.ref(window.db, 'users_data/' + currentUser + '/xp')).then(xpSnap => {
                            let xp = xpSnap.exists() ? xpSnap.val() : 0; window.set(window.ref(window.db, 'users_data/' + currentUser + '/xp'), xp + bonusXP);
                            showToastMessage(`🔥 ستريك ${currentStreak} أيام! خدت ${bonusXP} XP مكافأة!`);
                        });
                    }
                });

                if (isSpeedrun) {
                    const totalTime = Math.floor((Date.now() - startTime) / 1000);
                    window.push(window.ref(window.db, 'speedrun_scores'), { user: currentUser, quiz: quizKey, score: score, total: currentQuestions.length, time: totalTime, date: Date.now() });
                    showToastMessage(`⏱️ أنهيت السبيد ران في ${totalTime} ثانية!`);
                }
                
                window.set(window.ref(window.db, 'users_data/' + currentUser + '/persona'), persona);
            }

            document.body.addEventListener('click', function playVoiceOnce() {
                speakText(activeLang === 'ar' ? `أنت ${persona.replace(/[^\u0600-\u06FF\s]/g, '')}. ${personaDesc}` : `You are ${persona}. ${personaDesc}`, activeLang);
                document.body.removeEventListener('click', playVoiceOnce);
            }, { once: true });
        }
    }

    window.shareResult = function(platform) { 
        const activeLang = localStorage.getItem('lang') || 'ar';
        const quizName = currentSaveKey.split('_')[0].toUpperCase(); 
        const text = activeLang === 'en' ? `I scored ${score}/${currentQuestions.length} on the ${quizName} quiz on Quiz Hub! Can you beat my score? 🏆` : `لقد حصلت على ${score}/${currentQuestions.length} في كويز ${quizName} على Quiz Hub! هل يمكنك التغلب علي؟ 🏆`; 
        const url = window.location.href; const encodedText = encodeURIComponent(text); const encodedUrl = encodeURIComponent(url); 
        if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank'); 
        else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank'); 
        else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank'); 
        else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank'); 
        else if (platform === 'native' && navigator.share) navigator.share({ title: 'Quiz Hub', text: text, url: url }).catch(console.error); 
        else alert(activeLang === 'en' ? "Sharing is not supported." : "المشاركة غير مدعومة."); 
    };

    window.startGhostQuiz = function() { 
        current = 0; let ghostScore = 0; let activeLang = localStorage.getItem('lang') || 'ar';
        const helperBtn = document.getElementById('quizHelperBtn');
        const helperPanel = document.getElementById('quizHelperPanel');
        if (helperBtn) helperBtn.style.display = 'none';
        if (helperPanel) helperPanel.style.display = 'none';
        
        document.getElementById('question').innerHTML = `<h2 style="color:var(--blue); text-align:center;">👻 ${activeLang === 'en' ? 'Ghost Mode' : 'وضع الشبح'}</h2><p style="text-align:center; color:#aaa;">${activeLang === 'en' ? 'Answer before your ghost!' : 'جاوب قبل الشبح بتاعك!'}</p>`;
        document.getElementById('options').innerHTML = ''; document.getElementById('next').style.display = 'none'; document.getElementById('score').innerText = ''; document.getElementById('backBtn').style.display = 'none'; document.getElementById('timer').style.display = 'none';
        let ghostInterval;
        function runGhost() {
            if (current >= currentQuestions.length) {
                clearInterval(ghostInterval);
                document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:var(--blue); font-size:36px;">👻 ${activeLang === 'en' ? 'Ghost Mode Over!' : 'انتهى وضع الشبح!'}</h2><p style="font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${ghostScore} / ${currentQuestions.length}</p><button onclick="location.reload()" style="margin-top:20px; padding:12px 30px; background:#0088cc; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px;">${activeLang === 'en' ? 'Play Again' : 'العب تاني'}</button></div>`;
                document.getElementById('options').innerHTML = ''; return;
            }
            let currentGhostTime = ghostTimes[current] !== undefined ? ghostTimes[current] : 20; if (currentGhostTime <= 0) currentGhostTime = 1;
            const q = currentQuestions[current]; let qText = activeLang === 'ar' ? q.q_ar : q.q_en; if (!qText) qText = q.q_en; let opts = activeLang === 'ar' ? q.options_ar : q.options_en; if (!opts) opts = q.options_en;
            document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><p style="font-size:14px; color:#aaa;">${activeLang === 'en' ? 'Ghost Time:' : 'وقت الشبح:'} <span id="ghostTimer" style="color:var(--blue); font-weight:bold;">${currentGhostTime}</span>s</p><h3 style="font-size:22px; margin:10px 0;">${qText}</h3></div>`;
            const optEl = document.getElementById('options'); optEl.innerHTML = ''; let optionsWithAnswers = opts.map((opt, index) => ({ text: opt, isCorrect: index === q.answer })); optionsWithAnswers.sort(() => Math.random() - 0.5); let answeredGhost = false;
            optionsWithAnswers.forEach((opt) => {
                const div = document.createElement('div'); div.className = 'option'; div.innerText = opt.text;
                div.onclick = () => {
                    if (answeredGhost) return; answeredGhost = true; clearInterval(ghostInterval);
                    if (opt.isCorrect) { ghostScore++; div.classList.add('correct'); confetti({ particleCount: 20, spread: 50, origin: { y: 0.6 } }); } else { div.classList.add('wrong'); document.getElementById('playScreen').classList.add('screen-glitch'); setTimeout(() => document.getElementById('playScreen').classList.remove('screen-glitch'), 400); }
                    document.querySelectorAll('.option').forEach(o => { if (o.innerText === opts[q.answer]) o.classList.add('correct'); });
                    setTimeout(() => { current++; runGhost(); }, 1500);
                };
                optEl.appendChild(div);
            });
            let timer = currentGhostTime;
            ghostInterval = setInterval(() => {
                timer--; const timerEl = document.getElementById('ghostTimer'); if (timerEl) timerEl.innerText = timer;
                if (timer <= 0) {
                    clearInterval(ghostInterval);
                    if (!answeredGhost) {
                        answeredGhost = true; document.querySelectorAll('.option').forEach(o => o.classList.add('disabled')); document.querySelectorAll('.option').forEach(o => { if (o.innerText === opts[q.answer]) o.classList.add('correct'); });
                        showToastMessage(`👻 ${activeLang === 'en' ? 'Ghost answered first!' : 'الشبح جاوب الأول!'}`);
                        setTimeout(() => { current++; runGhost(); }, 1500);
                    }
                }
            }, 1000);
        }
        setTimeout(runGhost, 1000);
    }
}