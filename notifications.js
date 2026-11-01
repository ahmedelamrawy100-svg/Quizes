function setupNotifications() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser || currentUser === 'Unknown' || currentUser === 'زائر') return;

    // إنشاء حاوية الإشعارات لو مش موجودة
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:999999; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
        document.body.appendChild(toastContainer);
    }

    // دالة عرض الإشعارات بتصميم مباشر عشان ميتعارضش مع الـ CSS
    function showToast(msg, color = '#ff0000') {
        const toast = document.createElement('div');
        toast.style.cssText = `background:#111; border-right:5px solid ${color}; color:#fff; padding:15px 20px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.5); font-weight:bold; font-family:'Cairo', sans-serif; display:flex; align-items:center; gap:8px; animation: slideIn 0.3s forwards; direction:rtl; pointer-events:auto;`;
        toast.innerHTML = `<span>🔔</span> <span>${msg}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 5000);
    }

    // 1. الحظر
    window.onValue(window.ref(window.db, 'banned_users/' + currentUser), (snap) => {
        if (snap.exists()) {
            window.location.replace('banned.html'); 
        }
    });

    // 2. إشارة الطرد
    window.onValue(window.ref(window.db, 'kick_signals/' + currentUser), (snap) => {
        if (snap.exists()) {
            window.remove(window.ref(window.db, 'kick_signals/' + currentUser));
            window.location.replace('banned.html');
        }
    });

    // 3. تغيير عنوان التاب (Title)
    const originalTitle = document.title;
    let unreadCount = 0;

    function updateTabTitle() {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) 🔔 ` + originalTitle;
        } else {
            document.title = originalTitle;
        }
    }

    window.addEventListener('focus', () => {
        unreadCount = 0;
        updateTabTitle();
    });

    // 4. الرسايل
    let lastMsgCount = -1;
    window.onValue(window.ref(window.db, 'messages/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastMsgCount !== -1 && count > lastMsgCount) {
            unreadCount++;
            updateTabTitle();
            showToast("📩 وصلك رسالة جديدة!", '#0088cc');
        }
        lastMsgCount = count;
    });

    // 5. طلبات الصداقة
    let lastReqCount = -1;
    window.onValue(window.ref(window.db, 'friend_requests/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastReqCount !== -1 && count > lastReqCount) {
            unreadCount++;
            updateTabTitle();
            showToast("👤 وصلك طلب صداقة جديد!", '#ffd700');
        }
        lastReqCount = count;
    });

    // 6. التحذيرات
    let lastWarnText = "";
    window.onValue(window.ref(window.db, 'warnings/' + currentUser), (snap) => {
        if (snap.exists() && snap.val().text !== lastWarnText) {
            lastWarnText = snap.val().text;
            unreadCount++;
            updateTabTitle();
            showToast("⚠️ وصلك تحذير من الإدارة: " + lastWarnText, '#ff3333');
        }
    });

    // 7. تحديات الشات
    window.onValue(window.ref(window.db, 'challenge_notifications/' + currentUser), (snap) => {
        if (snap.exists()) {
            const challenges = snap.val();
            Object.keys(challenges).forEach(key => {
                const ch = challenges[key];
                showToast(`⚔️ ${ch.from} تحدك في كويز ${ch.quizName}!`, '#ffd700');
                window.remove(window.ref(window.db, 'challenge_notifications/' + currentUser + '/' + key));
            });
        }
    });
}

// حماية عشان ميتنفذش أكتر من مرة
if (!window.hasNotificationsSetup) {
    window.hasNotificationsSetup = true;
    window.addEventListener('load', () => { setTimeout(setupNotifications, 1500); });
}

// كود مسح الكاش التلقائي
(async function checkVersion() {
    try {
        if (typeof window.db === 'undefined') return;
        const snap = await window.get(window.ref(window.db, 'site_settings/version'));
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