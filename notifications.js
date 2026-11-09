import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get, set, remove, update, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// إعدادات فايربيز
const firebaseConfig = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
window.db = db; window.ref = ref;

// ==========================================
// 1. محرك الإشعارات الجديد (اللي بيتبعت من أي مكان)
// ==========================================
window.triggerNotification = async function(targetUser, title, message, type = 'info', isGlobal = false) {
    const time = Date.now();
    
    if (isGlobal) {
        await push(ref(db, 'global_notifications'), { title, message, type, time });
        return;
    }

    if (targetUser) {
        await push(ref(db, `notifications/${targetUser.toLowerCase()}`), { title, message, type, time, read: false });
        
        const currentUser = localStorage.getItem('loggedInUser');
        if (currentUser && currentUser.toLowerCase() === targetUser.toLowerCase()) {
            showToastNotif(title, message, type);
        }
    }
};

// ==========================================
// 2. دالة عرض الإشعارات (Toast) الموحدة
// ==========================================
function showToastNotif(title, message, type = 'info') {
    let container = document.getElementById('global-notif-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'global-notif-container';
        container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none; direction:rtl;';
        document.body.appendChild(container);
    }

    const colors = { success: '#4caf50', error: '#f44336', info: '#00bcd4', warning: '#ff9800' };
    const borderColor = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `background:#111; border-right:5px solid ${borderColor}; color:#fff; padding:15px 20px; border-radius:10px; box-shadow:0 5px 20px rgba(0,0,0,0.5); font-family:Cairo, sans-serif; min-width:250px; max-width:350px; pointer-events:auto; animation: slideInRight 0.3s ease-out; display:flex; flex-direction:column; gap:5px;`;
    
    if (message) {
        toast.innerHTML = `
            <div style="font-weight:900; font-size:15px; color:${borderColor};">${title}</div>
            <div style="font-size:13px; line-height:1.4; color:#ddd;">${message}</div>
        `;
    } else {
        toast.innerHTML = `<div style="font-weight:bold; font-size:14px;">${title}</div>`;
    }
    
    if (!document.getElementById('notif-anim-style')) {
        const style = document.createElement('style');
        style.id = 'notif-anim-style';
        style.innerHTML = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = '0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ==========================================
// 3. الاستماع للإشعارات من فايربيز
// ==========================================
function listenToNotifications() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser || currentUser === 'Unknown' || currentUser === 'زائر') return;

    // إشعارات شخصية
    const userNotifsRef = ref(db, `notifications/${currentUser.toLowerCase()}`);
    let isFirstLoad = true;

    onValue(userNotifsRef, (snapshot) => {
        if (isFirstLoad) { isFirstLoad = false; return; }
        const data = snapshot.val();
        if (!data) return;
        
        const keys = Object.keys(data);
        const latestKey = keys[keys.length - 1];
        const notif = data[latestKey];
        
        if (notif && !notif.read) {
            showToastNotif(notif.title, notif.message, notif.type);
        }
    });

    // إشعارات عامة
    const globalNotifsRef = ref(db, 'global_notifications');
    let isGlobalFirstLoad = true;
    onValue(globalNotifsRef, (snapshot) => {
        if (isGlobalFirstLoad) { isGlobalFirstLoad = false; return; }
        const data = snapshot.val();
        if (!data) return;
        const keys = Object.keys(data);
        const latestKey = keys[keys.length - 1];
        const notif = data[latestKey];
        
        if (notif) {
            showToastNotif(`📢 ${notif.title}`, notif.message, notif.type);
        }
    });
}

// ==========================================
// 4. النظام القديم (التحديات، الباند، الطرد، الرسائل)
// ==========================================
function setupNotifications() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser || currentUser === 'Unknown' || currentUser === 'زائر') return;

    onValue(ref(db, 'banned_users/' + currentUser), (snap) => { 
        if (snap.exists()) window.location.replace('banned.html'); 
    });
    
    onValue(ref(db, 'kick_signals/' + currentUser), (snap) => { 
        if (snap.exists()) { 
            set(ref(db, 'kick_signals/' + currentUser), null); 
            window.location.replace('banned.html'); 
        } 
    });

    let unreadCount = 0;
    const originalTitle = document.title;
    
    function updateTabTitle() { 
        if (unreadCount > 0) document.title = `(${unreadCount}) 🔔 ` + originalTitle; 
        else document.title = originalTitle; 
    }
    
    window.addEventListener('focus', () => { 
        unreadCount = 0; 
        updateTabTitle(); 
    });

    // رسائل جديدة
    let lastMsgCount = -1;
    onValue(ref(db, 'messages/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastMsgCount !== -1 && count > lastMsgCount) { 
            unreadCount++; 
            updateTabTitle(); 
            showToastNotif("📩 رسالة جديدة!", "وصلك رسالة جديدة في صندوق الوارد.", 'info'); 
        }
        lastMsgCount = count;
    });

    // طلبات صداقة
    let lastReqCount = -1;
    onValue(ref(db, 'friend_requests/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastReqCount !== -1 && count > lastReqCount) { 
            unreadCount++; 
            updateTabTitle(); 
            showToastNotif("👤 طلب صداقة جديد!", "وصلك طلب صداقة جديد.", 'warning'); 
        }
        lastReqCount = count;
    });

    // تحذيرات
    let lastWarnText = "";
    onValue(ref(db, 'warnings/' + currentUser), (snap) => {
        if (snap.exists() && snap.val().text !== lastWarnText) {
            lastWarnText = snap.val().text; 
            unreadCount++; 
            updateTabTitle(); 
            showToastNotif("⚠️ تحذير من الإدارة", lastWarnText, 'error');
        }
    });

    // التحديات
    let challengePopup = document.getElementById('challengePopup');
    if (!challengePopup) {
        challengePopup = document.createElement('div');
        challengePopup.id = 'challengePopup';
        challengePopup.style.cssText = `
            display: none; position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #111; border: 2px solid #ff0000; border-radius: 15px;
            padding: 20px; z-index: 9999999; text-align: center; color: #fff;
            font-family: 'Cairo', sans-serif; box-shadow: 0 0 30px rgba(255,0,0,0.5);
            width: 90%; max-width: 350px; animation: slideDown 0.3s ease-out; direction: rtl;
        `;
        const style = document.createElement('style');
        style.innerHTML = `@keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }`;
        document.head.appendChild(style);
        document.body.appendChild(challengePopup);
    }

    onValue(ref(db, 'challenges'), (snapshot) => {
        const allChallenges = snapshot.val();
        if (!allChallenges) { challengePopup.style.display = 'none'; return; }

        let myChallenge = null;
        let myChallengeKey = null;

        for (let userKey in allChallenges) {
            if (userKey.toLowerCase() === currentUser.toLowerCase()) {
                const userChallenges = allChallenges[userKey];
                const keys = Object.keys(userChallenges);
                for (let key of keys) {
                    if (userChallenges[key].status === 'pending' && userChallenges[key].roomCode) {
                        myChallenge = userChallenges[key];
                        myChallengeKey = key;
                        break;
                    }
                }
                if (myChallenge) break;
            }
        }

        if (myChallenge) {
            challengePopup.style.display = 'block';
            challengePopup.innerHTML = `
                <h3 style="color: #ff0000; margin-bottom: 10px;">⚔️ تحدي جديد!</h3>
                <p style="margin-bottom: 15px; font-size: 16px;">
                    اللاعب <b style="color: #ffd700;">${myChallenge.challenger}</b> بيتحداك في كويز:
                    <br><b style="color: #0088cc; font-size: 18px;">${myChallenge.quiz.toUpperCase()}</b>
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btnAcceptChallenge" style="background: #4caf50; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: bold;">قبول ✅</button>
                    <button id="btnRejectChallenge" style="background: #f44336; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: bold;">رفض ❌</button>
                </div>
            `;

            document.getElementById('btnAcceptChallenge').onclick = function() {
                window.acceptChallenge(myChallenge.challenger, myChallenge.quiz, myChallengeKey, myChallenge.roomCode);
            };
            document.getElementById('btnRejectChallenge').onclick = function() {
                window.rejectChallenge(myChallengeKey, myChallenge.roomCode);
            };
        } else {
            challengePopup.style.display = 'none';
        }
    });
}

// ==========================================
// 5. دوال التحدي (قبول/رفض)
// ==========================================
window.acceptChallenge = async function(challenger, quiz, challengeKey, roomCode) {
    const currentLang = localStorage.getItem('lang') || 'ar';
    try {
        const currentUser = localStorage.getItem('loggedInUser');
        
        if (!currentUser) {
            alert(currentLang === 'en' ? 'You must be logged in!' : 'لازم تسجل دخول الأول!');
            return;
        }
        
        if (!roomCode) { 
            alert(currentLang === 'en' ? "Error: Room code missing." : "خطأ: كود الغرفة غير موجود."); 
            await remove(ref(db, 'challenges/' + currentUser + '/' + challengeKey));
            document.getElementById('challengePopup').style.display = 'none';
            return; 
        }

        const roomSnap = await get(ref(db, 'rooms/' + roomCode));
        if (!roomSnap.exists()) {
            alert(currentLang === 'en' ? "Room expired." : "الغرفة انتهت صلاحيتها.");
            await remove(ref(db, 'challenges/' + currentUser + '/' + challengeKey));
            document.getElementById('challengePopup').style.display = 'none';
            return;
        }

        const roomData = roomSnap.val();
        if (roomData.status === 'playing') {
            alert(currentLang === 'en' ? "Someone else already joined." : "حد تاني انضم للغرفة دي بالفعل.");
            await remove(ref(db, 'challenges/' + currentUser + '/' + challengeKey));
            document.getElementById('challengePopup').style.display = 'none';
            return;
        }

        localStorage.setItem('activeRoomCode', roomCode);

        const roomRef = ref(db, 'rooms/' + roomCode);
        await set(roomRef, {
            ...roomData,
            status: 'playing',
            player2_name: currentUser
        });

        await remove(ref(db, 'challenges/' + currentUser + '/' + challengeKey));
        document.getElementById('challengePopup').style.display = 'none';

        const fileMap = { 'elharifa': 'El Harifa Quiz', 'annabelle': 'Annabelle Quiz', 'scream': 'Scream Quiz', 'knivesout': 'Knives Out Quiz', 'conjuring': 'Conjuring Quiz', 'thenun': 'The Nun Quiz', 'traintobusan': 'Train to Busan Quiz', 'fnaf': 'FNAF Quiz', 'squidgame': 'Squid Game Quiz', 'spiderman': 'Spider-Man Quiz', 'avengers': 'Avengers Quiz', 'avatar': 'Avatar Quiz', 'venom': 'Venom Quiz', 'birdsofprey': 'Birds of Prey Quiz', 'fall': 'Fall Quiz', 'wednesday': 'Wednesday Quiz' };
        const quizFileName = fileMap[quiz] || quiz;
        
        window.location.href = `${quizFileName}.html?room=${roomCode}&role=player2`;
        
    } catch (e) {
        alert("Error: " + e.message);
    }
};

window.rejectChallenge = async function(challengeKey, roomCode) {
    const currentLang = localStorage.getItem('lang') || 'ar';
    try {
        const currentUser = localStorage.getItem('loggedInUser');
        if (!currentUser) return;

        await remove(ref(db, 'challenges/' + currentUser + '/' + challengeKey));
        
        if (roomCode) {
            await remove(ref(db, 'rooms/' + roomCode));
        }
        
        document.getElementById('challengePopup').style.display = 'none';
        
    } catch (e) {
        alert("Error: " + e.message);
    }
};

// ==========================================
// 6. فحص إصدار الموقع (عشان التحديثات)
// ==========================================
(async function checkVersion() {
    try {
        const snap = await get(ref(db, 'site_settings/version'));
        if (snap.exists()) {
            const dbVersion = snap.val();
            const localVersion = localStorage.getItem('site_version');
            if (localVersion !== String(dbVersion)) {
                localStorage.setItem('site_version', dbVersion);
                if (localVersion !== null && localStorage.getItem('loggedInUser')) {
                    window.location.reload(true); 
                }
            }
        }
    } catch (e) {}
})();

// ==========================================
// 7. تشغيل كل حاجة أول ما الصفحة تحمل
// ==========================================
if (!window.hasNotificationsSetup) {
    window.hasNotificationsSetup = true;
    window.addEventListener('load', () => { 
        setTimeout(() => {
            setupNotifications();
            listenToNotifications();
        }, 1000); 
    });
}