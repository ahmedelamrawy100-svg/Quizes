function setupNotifications() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser || currentUser === 'Unknown' || currentUser === 'زائر') return;

    const toastContainer = document.getElementById('toast-container');
    function showToast(msg, color = '#ff0000') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderRightColor = color;
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

window.addEventListener('load', () => {
    setTimeout(setupNotifications, 1000);
});