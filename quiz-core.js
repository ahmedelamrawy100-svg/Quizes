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

window.initQuiz = function(config) {
    const { title, quizKey, quizData, hasParts, partsList } = config;
    let currentLang = localStorage.getItem('lang') || 'ar';
    let highestScore = 0; 
    let currentSaveKey = quizKey;
    let currentQuestions = []; let current = 0, score = 0, answered = false, timerInterval = null, timeLeft = 20;
    let isChallengeMode = false; let isSpeedrun = false; let myRoomCode = null; let myRole = null;
    let ghostTimes = []; 
    
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
        
        setTimeout(() => {
            if (!challengeStarted) {
                window.get(window.ref(window.db, 'rooms/' + myRoomCode)).then(snap => {
                    if (!snap.exists() || snap.val().status !== 'playing') {
                        alert(currentLang === 'en' ? "Connection timeout. Redirecting..." : "انتهت مهلة الاتصال. جاري الرجوع...");
                        window.location.href = 'index.html';
                    }
                });
            }
        }, 60000);
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
        myRoomCode = code; 
        myRole = 'player1'; 
        isChallengeMode = true; 
        localStorage.setItem('activeRoomCode', myRoomCode);
        
        document.getElementById('displayRoomCode').innerText = code; 
        document.getElementById('roomOptions').style.display = 'none'; 
        document.getElementById('waitingRoom').style.display = 'block'; 
        
        window.set(window.ref(window.db, 'rooms/' + code), { 
            player1_score: null, 
            player2_score: null, 
            status: 'waiting', 
            quizType: currentSaveKey, 
            created_at: Date.now(),
            player1_name: currentUser
        }).then(() => { 
            window.onValue(window.ref(window.db, 'rooms/' + code), (snapshot) => { 
                const data = snapshot.val(); 
                if (data && data.status === 'playing' && myRole === 'player1' && !document.getElementById('playScreen').classList.contains('active-play')) { 
                    document.getElementById('challengeModal').style.display = 'none'; 
                    startGame('challenge'); 
                } 
            }); 
        }); 
    }
    
    window.joinRoom = function() { 
        const code = document.getElementById('roomCodeInput').value.trim().toUpperCase(); 
        if (!code) { 
            alert(currentLang === 'en' ? "Enter room code first!" : "اكتب كود الغرفة الأول!"); 
            return; 
        } 
        myRole = 'player2'; 
        myRoomCode = code; 
        isChallengeMode = true; 
        localStorage.setItem('activeRoomCode', myRoomCode);
        
        window.get(window.ref(window.db, 'rooms/' + code)).then((snapshot) => { 
            if (snapshot.exists()) { 
                const data = snapshot.val(); 
                if (data.status === 'waiting') { 
                    window.update(window.ref(window.db, 'rooms/' + code), { 
                        status: 'playing',
                        player2_name: currentUser
                    }).then(() => { 
                        document.getElementById('challengeModal').style.display = 'none'; 
                        startGame('challenge'); 
                    }); 
                } else { 
                    alert(currentLang === 'en' ? "Room is full or game started." : "هذه الغرفة ممتلئة أو اللعبة بدأت بالفعل."); 
                } 
            } else { 
                alert(currentLang === 'en' ? "Invalid room code." : "كود الغرفة غير صحيح."); 
            } 
        }); 
    }

    window.startRandomMatch = async function() {
        isChallengeMode = true;
        const roomsSnap = await window.get(window.ref(window.db, 'rooms'));
        if (roomsSnap.exists()) {
            const rooms = roomsSnap.val(); 
            let foundRoom = null;
            for (let code in rooms) { 
                if (rooms[code].status === 'waiting' && 
                    (rooms[code].quizType === currentSaveKey || rooms[code].quizType === quizKey)) { 
                    foundRoom = code; 
                    break; 
                } 
            }
            if (foundRoom) {
                myRoomCode = foundRoom; 
                myRole = 'player2';
                localStorage.setItem('activeRoomCode', myRoomCode);
                await window.update(window.ref(window.db, 'rooms/' + myRoomCode), { 
                    status: 'playing',
                    player2_name: currentUser
                });
                startGame('challenge');
            } else { 
                createRandomRoom(); 
            }
        } else { 
            createRandomRoom(); 
        }
    }

    async function createRandomRoom() {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase(); 
        myRoomCode = code; 
        myRole = 'player1';
        localStorage.setItem('activeRoomCode', myRoomCode);
        
        await window.set(window.ref(window.db, 'rooms/' + code), { 
            player1_score: null, 
            player2_score: null, 
            status: 'waiting', 
            quizType: currentSaveKey, 
            created_at: Date.now(),
            player1_name: currentUser
        });
        
        document.getElementById('challengeModal').style.display = 'flex'; 
        document.getElementById('roomOptions').style.display = 'none'; 
        document.getElementById('waitingRoom').style.display = 'block';
        document.getElementById('displayRoomCode').innerText = code;
        document.getElementById('waitingStatus').innerText = currentLang === 'en' ? "Waiting for a random player..." : "في انتظار لاعب عشوائي...";
        
        window.onValue(window.ref(window.db, 'rooms/' + code), (snapshot) => { 
            const data = snapshot.val(); 
            if (data && data.status === 'playing' && myRole === 'player1' && !document.getElementById('playScreen').classList.contains('active-play')) { 
                document.getElementById('challengeModal').style.display = 'none'; 
                startGame('challenge'); 
            } 
        }); 
    }

    window.startGame = function(part) { 
        isSpeedrun = false; 
        ghostTimes = []; 
        
        if (part === 'challenge') { 
            let challengeQuestions = null;
            if (quizData.comprehensive && quizData.comprehensive.length > 0) { challengeQuestions = [...quizData.comprehensive]; } 
            else if (quizData.all && quizData.all.length > 0) { challengeQuestions = [...quizData.all]; } 
            else if (quizData.part1 && quizData.part1.length > 0) { challengeQuestions = [...quizData.part1]; } 
            else if (partsList) { for (let key in partsList) { if (partsList[key] && partsList[key].length > 0) { challengeQuestions = [...partsList[key]]; break; } } }
            
            if (!challengeQuestions || challengeQuestions.length === 0) {
                alert(currentLang === 'en' ? "Quiz data not found!" : "بيانات الكويز غير موجودة!");
                return;
            }
            currentQuestions = challengeQuestions;
            isChallengeMode = true; 
            document.getElementById('playScreen').classList.add('active-play'); 
        } 
        else if (part === 'all') { 
            currentQuestions = [...(quizData.comprehensive || quizData.all || quizData.part1 || [])]; 
            currentSaveKey = quizKey + '_all'; 
        } 
        else if (partsList && partsList[part]) { 
            currentQuestions = [...partsList[part]]; 
            currentSaveKey = quizKey + '_' + part; 
        }
        
        if (currentQuestions.length === 0) {
            alert(currentLang === 'en' ? "No questions available!" : "لا توجد أسئلة متاحة!");
            return;
        }
        
        currentQuestions.sort(() => Math.random() - 0.5); 
        highestScore = 0; 
        document.getElementById('selectionScreen').style.display = 'none'; 
        document.getElementById('playScreen').style.display = 'block'; 
        const backBtn = document.getElementById('backBtn');
        if (backBtn) backBtn.style.display = 'none'; 
        current = 0; 
        score = 0; 
        loadQuestion(); 
    }
    
    window.startSpeedrun = function() { 
        startGame('all'); 
        isSpeedrun = true; 
        startTime = Date.now(); 
    }

    function loadQuestion() { 
        if (!currentQuestions || currentQuestions.length === 0) return;
        
        answered = false; 
        timeLeft = isSpeedrun ? 5 : 20; 
        
        let activeLang = localStorage.getItem('lang') || 'ar';
        const q = currentQuestions[current]; 
        
        let qText = activeLang === 'ar' ? q.q_ar : q.q_en; 
        if (!qText) qText = q.q_en || q.q_ar; 
        document.getElementById('question').innerText = qText; 
        
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en; 
        if (!opts) opts = q.options_en || q.options_ar; 
        
        const optEl = document.getElementById('options'); 
        optEl.innerHTML = ''; 
        let optionsWithAnswers = opts.map((opt, index) => ({ text: opt, isCorrect: index === q.answer })); 
        optionsWithAnswers.sort(() => Math.random() - 0.5); 
        
        optionsWithAnswers.forEach((opt) => { 
            const div = document.createElement('div'); 
            div.className = 'option'; 
            div.innerText = opt.text; 
            div.onclick = () => checkAnswer(opt.isCorrect, div); 
            optEl.appendChild(div); 
        }); 
        
        document.getElementById('score').innerText = activeLang === 'en' ? `Question ${current + 1} of ${currentQuestions.length} | Score: ${score}` : `سؤال ${current + 1} من ${currentQuestions.length} | النقاط: ${score}`; 
        document.getElementById('next').style.display = 'none'; 
        document.getElementById('progress').style.width = ((current) / currentQuestions.length * 100) + '%'; 
        
        clearInterval(timerInterval); 
        timerInterval = setInterval(updateTimer, 1000); 
        updateTimer(); 
    }

    function updateTimer() { 
        const timerEl = document.getElementById('timer'); 
        timerEl.innerText = `⏱️ ${timeLeft}`; 
        if (timeLeft <= 5) { timerEl.style.color = '#f44336'; playSound(sndTick); } else { timerEl.style.color = ''; } 
        if (timeLeft <= 0) { 
            clearInterval(timerInterval); 
            if (!answered) { 
                answered = true; 
                document.querySelectorAll('.option').forEach(o => o.classList.add('disabled')); 
                
                let activeLang = localStorage.getItem('lang') || 'ar';
                const q = currentQuestions[current]; 
                let opts = activeLang === 'ar' ? q.options_ar : q.options_en; 
                if (!opts) opts = q.options_en || q.options_ar; 
                document.querySelectorAll('.option').forEach(o => { if(o.innerText === opts[q.answer]) o.classList.add('correct'); }); 
                document.getElementById('next').style.display = 'inline-block'; 
                
                if (!isChallengeMode && !isSpeedrun) {
                    ghostTimes.push(20);
                }
            } 
        } 
        timeLeft--; 
    }

    function checkAnswer(isCorrect, el) { 
        if (answered) return; 
        answered = true; 
        clearInterval(timerInterval); 

        let activeLang = localStorage.getItem('lang') || 'ar';
        const q = currentQuestions[current]; 
        let opts = activeLang === 'ar' ? q.options_ar : q.options_en; 
        if (!opts) opts = q.options_en || q.options_ar; 
        
        const allOpts = document.querySelectorAll('.option'); 
        allOpts.forEach(o => o.classList.add('disabled')); 
        allOpts.forEach(o => { if(o.innerText === opts[q.answer]) o.classList.add('correct'); }); 
        
        if (isCorrect) { 
            score += isSpeedrun ? 2 : 1; 
            playSound(sndCorrect);
            const rect = el.getBoundingClientRect();
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;
            confetti({ particleCount: 30, spread: 60, origin: { x: x, y: y }, colors: ['#ffd700', '#ff3333', '#ffffff'], ticks: 100, gravity: 0.8, scalar: 0.8 });
        } 
        else { 
            el.classList.add('wrong'); 
            playSound(sndWrong); 
            document.getElementById('playScreen').classList.add('shake-animation'); 
            setTimeout(() => document.getElementById('playScreen').classList.remove('shake-animation'), 400); 
        } 
        
        document.getElementById('score').innerText = activeLang === 'en' ? `Question ${current + 1} of ${currentQuestions.length} | Score: ${score}` : `سؤال ${current + 1} من ${currentQuestions.length} | النقاط: ${score}`; 
        document.getElementById('next').style.display = 'inline-block'; 

        if (!isChallengeMode && !isSpeedrun) {
            ghostTimes.push(20 - timeLeft);
        }
    }

    window.nextQuestion = function() { current++; if (current < currentQuestions.length) { loadQuestion(); } else { showFinal(); } }

    async function showFinal() {
        clearInterval(timerInterval); 
        document.getElementById('progress').style.width = '100%'; 
        if (score > (currentQuestions.length / 2)) { confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }); }
        showToastMessage(`🎉 أنهيت الكويز! نتيجتك: ${score}`);

        let activeLang = localStorage.getItem('lang') || 'ar';

        if (isChallengeMode && myRoomCode) { 
            let updateData = {}; 
            if (myRole === 'player1') updateData.player1_score = score; 
            else updateData.player2_score = score; 
            
            window.update(window.ref(window.db, 'rooms/' + myRoomCode), updateData).then(() => { 
                document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#ff0000; font-size:30px; margin-bottom:15px;">${activeLang === 'en' ? 'Waiting for friend... ⏳' : 'في انتظار صديقك... ⏳'}</h2><p style="color:#aaa; font-size:18px;">${activeLang === 'en' ? 'Please wait for them to finish.' : 'رجاءً استنى لحد ما يخلص الكويز.'}</p></div>`; 
                document.getElementById('options').innerHTML = ''; 
                document.getElementById('timer').style.display = 'none'; 
                document.getElementById('score').innerText = ''; 
                document.getElementById('next').style.display = 'none'; 
                
                window.onValue(window.ref(window.db, 'rooms/' + myRoomCode), (snapshot) => { 
                    const data = snapshot.val(); 
                    if (data && data.player1_score !== null && data.player2_score !== null) { 
                        const myScore = myRole === 'player1' ? data.player1_score : data.player2_score; 
                        const opScore = myRole === 'player1' ? data.player2_score : data.player1_score; 
                        let resultMsg = ""; 
                        if (myScore > opScore) resultMsg = activeLang === 'en' ? "🎉 You Won!" : "🎉 أنت الفائز!"; 
                        else if (myScore < opScore) resultMsg = activeLang === 'en' ? "😢 You Lost!" : "😢 خسرت التحدي!"; 
                        else resultMsg = activeLang === 'en' ? "🤝 Draw!" : "🤝 تعادل!"; 
                        
                        document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:#ff0000; font-size:36px;">${resultMsg}</h2><p style="color:var(--text-color); font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${myScore} | ${activeLang === 'en' ? 'Friend Score' : 'نتيجة صديقك'}: ${opScore}</p><button onclick="location.href='index.html'" style="margin-top:20px; padding:12px 30px; background:#8b0000; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px; font-weight:bold;">${activeLang === 'en' ? 'Back to Home' : 'العودة للرئيسية'}</button></div>`; 
                        
                        const backBtn = document.getElementById('backBtn');
                        if (backBtn) backBtn.style.display = 'flex'; 
                        
                        window.remove(window.ref(window.db, 'rooms/' + myRoomCode)); 
                        localStorage.removeItem('activeRoomCode');
                    } 
                }); 
            }); 
        } 
        else if (isChallengeMode && !myRoomCode) { 
            setTimeout(() => { window.location.href = 'index.html'; }, 3000); 
        } 
        else {
            let realHighScore = highestScore;
            if (localStorage.getItem(currentSaveKey) > realHighScore) {
                realHighScore = localStorage.getItem(currentSaveKey);
            }

            document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;">
                <h2 style="color:#ff0000; font-size:36px;">${activeLang === 'en' ? 'Quiz Over! 🎬' : 'انتهى الكويز! 🎬'}</h2>
                <p style="color:var(--text-color); font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${score} / ${currentQuestions.length}</p>
                <p style="color:#ffcc00; font-size:18px; margin-top:10px; font-weight:bold;">${activeLang === 'en' ? 'High Score' : 'أعلى نتيجة'}: ${realHighScore}</p>
                
                <div style="margin-top: 30px; border-top: 1px dashed #333; padding-top: 20px;">
                    <h3 style="color:var(--blue); font-size: 24px;">👻 ${activeLang === 'en' ? 'Ghost Mode Unlocked!' : 'تم فتح وضع الشبح!'}</h3>
                    <p style="font-size: 16px; color: #aaa; margin-bottom: 15px;">${activeLang === 'en' ? 'Can you beat your own time and accuracy?' : 'هل يمكنك التغلب على سرعتك ودقتك السابقة؟'}</p>
                    <button onclick="window.startGhostQuiz()" style="padding:15px 30px; background:#0088cc; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px; font-weight:bold; width:100%; max-width:300px; margin: 0 auto; display:block;">👻 ${activeLang === 'en' ? 'Play Against Your Ghost' : 'العب ضد شبحك'}</button>
                </div>

                <div class="share-container" style="margin-top: 20px;">
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
            
            document.getElementById('options').innerHTML = ''; 
            document.getElementById('timer').style.display = 'none';
            document.getElementById('score').innerText = ''; 
            document.getElementById('next').style.display = 'none';
            const backBtn = document.getElementById('backBtn');
            if (backBtn) backBtn.style.display = 'flex'; 

            if (window.db && currentUser !== 'Unknown') { 
                window.set(window.ref(window.db, 'scores/' + currentUser + '/' + currentSaveKey + '/' + Date.now()), { score: score, total: currentQuestions.length, time: new Date().toISOString() }); 
                window.set(window.ref(window.db, 'leaderboard/' + currentUser + '/' + currentSaveKey + '/' + Date.now()), { score: score, total: currentQuestions.length, time: new Date().toISOString() }); 
                
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/xp')).then(snap => { 
                    let xp = snap.exists() ? snap.val() : 0; 
                    window.set(window.ref(window.db, 'users_data/' + currentUser + '/xp'), xp + score); 
                }); 
                
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/coins')).then(coinSnap => {
                    let currentCoins = coinSnap.exists() ? coinSnap.val() : 0;
                    window.set(window.ref(window.db, 'users_data/' + currentUser + '/coins'), currentCoins + 5);
                });

                window.push(window.ref(window.db, 'activity_feed'), {
                    user: currentUser, action: "أنهى", detail: "كويز " + (quizKey.toUpperCase()) + " بنتيجة " + score, time: Date.now()
                });

                // 👇 تسجيل نقاط التيم
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/team')).then(teamSnap => {
                    if (teamSnap.exists()) {
                        const playerTeam = teamSnap.val();
                        window.get(window.ref(window.db, 'teams/' + playerTeam)).then(currentScoreSnap => {
                            let currentScore = currentScoreSnap.exists() ? currentScoreSnap.val() : 0;
                            window.set(window.ref(window.db, 'teams/' + playerTeam), currentScore + score);
                        });
                    }
                });

                // 👇 تسجيل الحدث في الأرشيف الزمني
                window.push(window.ref(window.db, 'users_data/' + currentUser + '/history'), {
                    title: "أنهى كويز: " + quizKey.toUpperCase(),
                    description: "بنتيجة " + score + " من " + currentQuestions.length,
                    time: Date.now()
                });

                if (isSpeedrun) {
                    const totalTime = Math.floor((Date.now() - startTime) / 1000);
                    await window.push(window.ref(window.db, 'speedrun_scores'), {
                        user: currentUser, quiz: quizKey, score: score, total: currentQuestions.length, time: totalTime, date: Date.now()
                    });
                    showToastMessage(`⏱️ أنهيت السبيد ران في ${totalTime} ثانية!`);
                }

                const today = new Date().toDateString();
                window.get(window.ref(window.db, 'users_data/' + currentUser + '/last_play')).then(snap => {
                    let lastPlay = snap.exists() ? snap.val() : null;
                    let currentStreak = 0;
                    window.get(window.ref(window.db, 'users_data/' + currentUser + '/streak')).then(s => { currentStreak = s.exists() ? s.val() : 0; });

                    if (lastPlay !== today) {
                        let yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
                        if (lastPlay === yesterday.toDateString()) { currentStreak++; } else { currentStreak = 1; }
                        
                        window.set(window.ref(window.db, 'users_data/' + currentUser + '/streak'), currentStreak);
                        window.set(window.ref(window.db, 'users_data/' + currentUser + '/lastPlay'), today);
                        
                        let bonusXP = currentStreak * 5; 
                        window.get(window.ref(window.db, 'users_data/' + currentUser + '/xp')).then(xpSnap => {
                            let xp = xpSnap.exists() ? xpSnap.val() : 0;
                            window.set(window.ref(window.db, 'users_data/' + currentUser + '/xp'), xp + bonusXP);
                            showToastMessage(`🔥 ستريك ${currentStreak} أيام! خدت ${bonusXP} XP مكافأة!`);
                        });
                    }
                });
            }
        }
    }

    window.shareResult = function(platform) { 
        const activeLang = localStorage.getItem('lang') || 'ar';
        const quizName = currentSaveKey.split('_')[0].toUpperCase(); 
        const text = activeLang === 'en' ? `I scored ${score}/${currentQuestions.length} on the ${quizName} quiz on Quiz Hub! Can you beat my score? 🏆` : `لقد حصلت على ${score}/${currentQuestions.length} في كويز ${quizName} على Quiz Hub! هل يمكنك التغلب علي؟ 🏆`; 
        const url = window.location.href; 
        const encodedText = encodeURIComponent(text); 
        const encodedUrl = encodeURIComponent(url); 
        
        if (platform === 'whatsapp') window.open(`https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`, '_blank'); 
        else if (platform === 'telegram') window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank'); 
        else if (platform === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank'); 
        else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank'); 
        else if (platform === 'native' && navigator.share) navigator.share({ title: 'Quiz Hub', text: text, url: url }).catch(console.error); 
        else alert(activeLang === 'en' ? "Sharing is not supported." : "المشاركة غير مدعومة."); 
    };

    // ==========================================
    // دالة تشغيل "كويز الشبح"
    // ==========================================
    window.startGhostQuiz = function() {
        current = 0;
        let ghostScore = 0;
        let activeLang = localStorage.getItem('lang') || 'ar';
        
        document.getElementById('question').innerHTML = `<h2 style="color:var(--blue); text-align:center;">👻 ${activeLang === 'en' ? 'Ghost Mode' : 'وضع الشبح'}</h2><p style="text-align:center; color:#aaa;">${activeLang === 'en' ? 'Answer before your ghost!' : 'جاوب قبل الشبح بتاعك!'}</p>`;
        document.getElementById('options').innerHTML = '';
        document.getElementById('next').style.display = 'none';
        document.getElementById('score').innerText = '';
        document.getElementById('backBtn').style.display = 'none';
        document.getElementById('timer').style.display = 'none';
        
        let ghostInterval;
        
        function runGhost() {
            if (current >= currentQuestions.length) {
                clearInterval(ghostInterval);
                document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;"><h2 style="color:var(--blue); font-size:36px;">👻 ${activeLang === 'en' ? 'Ghost Mode Over!' : 'انتهى وضع الشبح!'}</h2><p style="font-size:22px;">${activeLang === 'en' ? 'Your Score' : 'نتيجتك'}: ${ghostScore} / ${currentQuestions.length}</p><button onclick="location.reload()" style="margin-top:20px; padding:12px 30px; background:#0088cc; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:18px;">${activeLang === 'en' ? 'Play Again' : 'العب تاني'}</button></div>`;
                document.getElementById('options').innerHTML = '';
                return;
            }

            let currentGhostTime = ghostTimes[current] !== undefined ? ghostTimes[current] : 20;
            if (currentGhostTime <= 0) currentGhostTime = 1;
            
            const q = currentQuestions[current];
            let qText = activeLang === 'ar' ? q.q_ar : q.q_en;
            if (!qText) qText = q.q_en;
            
            let opts = activeLang === 'ar' ? q.options_ar : q.options_en;
            if (!opts) opts = q.options_en;

            document.getElementById('question').innerHTML = `<div style="text-align:center; padding:20px;">
                <p style="font-size:14px; color:#aaa;">${activeLang === 'en' ? 'Ghost Time:' : 'وقت الشبح:'} <span id="ghostTimer" style="color:var(--blue); font-weight:bold;">${currentGhostTime}</span>s</p>
                <h3 style="font-size:22px; margin:10px 0;">${qText}</h3>
            </div>`;

            const optEl = document.getElementById('options');
            optEl.innerHTML = '';
            let optionsWithAnswers = opts.map((opt, index) => ({ text: opt, isCorrect: index === q.answer }));
            optionsWithAnswers.sort(() => Math.random() - 0.5);
            
            let answeredGhost = false;

            optionsWithAnswers.forEach((opt) => {
                const div = document.createElement('div');
                div.className = 'option';
                div.innerText = opt.text;
                div.onclick = () => {
                    if (answeredGhost) return;
                    answeredGhost = true;
                    clearInterval(ghostInterval);
                    
                    if (opt.isCorrect) {
                        ghostScore++;
                        div.classList.add('correct');
                        confetti({ particleCount: 20, spread: 50, origin: { y: 0.6 } });
                    } else {
                        div.classList.add('wrong');
                        document.getElementById('playScreen').classList.add('shake-animation');
                        setTimeout(() => document.getElementById('playScreen').classList.remove('shake-animation'), 400);
                    }
                    
                    document.querySelectorAll('.option').forEach(o => {
                        if (o.innerText === opts[q.answer]) o.classList.add('correct');
                    });
                    
                    setTimeout(() => {
                        current++;
                        runGhost();
                    }, 1500);
                };
                optEl.appendChild(div);
            });

            let timer = currentGhostTime;
            ghostInterval = setInterval(() => {
                timer--;
                const timerEl = document.getElementById('ghostTimer');
                if (timerEl) timerEl.innerText = timer;
                
                if (timer <= 0) {
                    clearInterval(ghostInterval);
                    if (!answeredGhost) {
                        answeredGhost = true;
                        document.querySelectorAll('.option').forEach(o => o.classList.add('disabled'));
                        document.querySelectorAll('.option').forEach(o => {
                            if (o.innerText === opts[q.answer]) o.classList.add('correct');
                        });
                        showToastMessage(`👻 ${activeLang === 'en' ? 'Ghost answered first!' : 'الشبح جاوب الأول!'}`);
                        
                        setTimeout(() => {
                            current++;
                            runGhost();
                        }, 1500);
                    }
                }
            }, 1000);
        }

        setTimeout(runGhost, 1000);
    }
}