// notifications.js

function setupNotifications() {
    const currentUser = localStorage.getItem('loggedInUser');
    if (!currentUser || currentUser === 'Unknown' || currentUser === 'زائر') return;

    // حفظ العنوان الأصلي للصفحة
    const originalTitle = document.title;
    let unreadCount = 0;

    // دالة تغيير عنوان التاب
    function updateTitle() {
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) 🔴 إشعار جديد - ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    // تصفير العداد لما تدوس على الشاشة
    window.addEventListener('focus', () => {
        unreadCount = 0;
        updateTitle();
    });

    // دالة إظهار الإشعار المنبثق (Toast)
    function showLiveToast(msg, color = '#ff0000') {
        const container = document.getElementById('toast-container');
        if (!container) return; // لو الصفحة مفيهاش مكان للتوست، منعملش حاجة

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderRightColor = color;
        toast.innerHTML = `<span>🔔</span> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    }

    // 1. مراقبة الرسايل الجديدة
    let lastMsgCount = -1;
    window.onValue(window.ref(window.db, 'messages/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastMsgCount !== -1 && count > lastMsgCount) {
            unreadCount++;
            updateTitle();
            showLiveToast(currentUser === 'ahmed' ? "📩 وصلك رسالة جديدة!" : "📩 وصلك رسالة جديدة!", '#0088cc');
        }
        lastMsgCount = count;
    });

    // 2. مراقبة طلبات الصداقة
    let lastReqCount = -1;
    window.onValue(window.ref(window.db, 'friend_requests/' + currentUser), (snap) => {
        const count = snap.exists() ? Object.keys(snap.val()).length : 0;
        if (lastReqCount !== -1 && count > lastReqCount) {
            unreadCount++;
            updateTitle();
            showLiveToast("👤 وصلك طلب صداقة جديد!", '#ffd700');
        }
        lastReqCount = count;
    });
}

// تشغيل الإشعارات لما الصفحة تحمل
window.addEventListener('load', () => {
    // بنستنى ثانية عشان نتأكد إن الفايربيز اتحملت
    setTimeout(setupNotifications, 1000);
});