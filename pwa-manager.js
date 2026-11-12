/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — PWA MANAGER
   - SW Registration
   - Install Prompt
   - Online/Offline Detection
   - Push Notifications
   - Update Handling
   ═══════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';
  
  const CURRENT_USER = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
  let swRegistration = null;
  let deferredPrompt = null;
  
  // ═══════════════════════════════════════════════════════════════════
  // 1. SERVICE WORKER REGISTRATION
  // ═══════════════════════════════════════════════════════════════════
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js', { scope: './' })
        .then(reg => {
          swRegistration = reg;
          console.log('[PWA] ✅ SW registered:', reg.scope);
          
          // Cache الـ essentials
          setTimeout(() => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'CACHE_ESSENTIALS' });
            }
          }, 3000);
          
          // Check updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateBanner();
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] ❌ SW registration failed:', err));
    });
    
    // Handle controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 2. INSTALL PROMPT
  // ═══════════════════════════════════════════════════════════════════
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] 📲 Install prompt ready');
    showInstallButton();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] ✅ App installed!');
    deferredPrompt = null;
    hideInstallButton();
    showToast('🎉 تم تثبيت التطبيق بنجاح!');
  });
  
  // ═══════════════════════════════════════════════════════════════════
  // 3. INSTALL BUTTON (يظهر في كل صفحة)
  // ═══════════════════════════════════════════════════════════════════
  function showInstallButton() {
    if (document.getElementById('pwa-install-btn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.innerHTML = '📲 ثبّت التطبيق';
    btn.onclick = promptInstall;
    btn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99998;
      padding: 14px 24px;
      background: linear-gradient(135deg, #ff0000, #8b0000);
      color: #fff;
      border: 2px solid #fff;
      border-radius: 50px;
      font-family: 'Cairo', sans-serif;
      font-weight: 900;
      font-size: 15px;
      cursor: pointer;
      box-shadow: 0 8px 25px rgba(255, 0, 0, 0.5);
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: pwaPulse 2s infinite;
    `;
    
    // إضافة الأنيميشن
    if (!document.getElementById('pwa-style')) {
      const style = document.createElement('style');
      style.id = 'pwa-style';
      style.textContent = `
        @keyframes pwaPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 25px rgba(255, 0, 0, 0.5); }
          50% { transform: scale(1.05); box-shadow: 0 12px 35px rgba(255, 0, 0, 0.8); }
        }
        #pwa-install-btn:hover {
          transform: scale(1.1) !important;
        }
        #pwa-install-btn.dismissed {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(btn);
    
    // Auto-hide بعد 30 ثانية لو المستخدم مادوسش
    setTimeout(() => {
      if (btn && !btn.classList.contains('dismissed')) {
        btn.style.opacity = '0.7';
        btn.innerHTML = '📲 ثبّت';
      }
    }, 30000);
  }
  
  function hideInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.remove();
  }
  
  async function promptInstall() {
    if (!deferredPrompt) {
      showToast('⚠️ التثبيت مش متاح — جرب من قائمة المتصفح', 'warn');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install choice:', outcome);
    
    if (outcome === 'accepted') {
      showToast('🎉 جاري تثبيت التطبيق...');
    }
    
    deferredPrompt = null;
    hideInstallButton();
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 4. UPDATE BANNER
  // ═══════════════════════════════════════════════════════════════════
  function showUpdateBanner() {
    if (document.getElementById('pwa-update-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.innerHTML = `
      <div style="
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        z-index: 99999; background: linear-gradient(135deg, #4caf50, #2e7d32);
        color: #fff; padding: 15px 25px; border-radius: 12px;
        font-family: 'Cairo'; font-weight: 900; font-size: 14px;
        box-shadow: 0 10px 30px rgba(76, 175, 80, 0.5);
        display: flex; align-items: center; gap: 15px;
        max-width: 90%; direction: rtl;
      ">
        <span>🔄 فيه إصدار جديد!</span>
        <button onclick="window.NFPWA.applyUpdate()" style="
          background: #fff; color: #2e7d32; border: none;
          padding: 8px 18px; border-radius: 8px; font-family: 'Cairo';
          font-weight: 900; cursor: pointer; font-size: 13px;
        ">تحديث الآن</button>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent; color: #fff; border: 1px solid #fff;
          width: 30px; height: 30px; border-radius: 50%;
          cursor: pointer; font-weight: 900; font-size: 14px;
        ">✖</button>
      </div>
    `;
    document.body.appendChild(banner);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 5. ONLINE / OFFLINE
  // ═══════════════════════════════════════════════════════════════════
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    
    let indicator = document.getElementById('pwa-online-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pwa-online-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        padding: 8px 20px;
        border-radius: 20px;
        font-family: 'Cairo', sans-serif;
        font-weight: 900;
        font-size: 13px;
        transition: all 0.3s;
        display: none;
      `;
      document.body.appendChild(indicator);
    }
    
    if (isOnline) {
      indicator.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      indicator.style.color = '#fff';
      indicator.style.border = '2px solid #fff';
      indicator.innerHTML = '✅ متصل بالإنترنت';
      indicator.style.display = 'block';
      setTimeout(() => indicator.style.display = 'none', 2500);
      
      // مزامنة النتائج المعلقة
      syncPendingScores();
    } else {
      indicator.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      indicator.style.color = '#000';
      indicator.style.border = '2px solid #fff';
      indicator.innerHTML = '📴 أوفلاين — الكويزات شغالة';
      indicator.style.display = 'block';
      // متخفيهاش لما يبقى أوفلاين
    }
  }
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // ═══════════════════════════════════════════════════════════════════
  // 6. SYNC PENDING SCORES
  // ═══════════════════════════════════════════════════════════════════
  async function syncPendingScores() {
    try {
      const pending = JSON.parse(localStorage.getItem('pending_scores') || '[]');
      if (pending.length === 0) return;
      
      console.log('[PWA] Syncing', pending.length, 'pending scores');
      
      const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getDatabase, ref, set } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
      
      const cfg = {
        apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
        authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
        databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
        projectId: "quiz-hub-app-f4cd0",
        storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
        messagingSenderId: "282772179392",
        appId: "1:282772179392:web:64646d757592b29ff3a025"
      };
      
      const app = getApps().length ? getApp() : initializeApp(cfg);
      const db = getDatabase(app);
      
      const remaining = [];
      for (const score of pending) {
        try {
          await set(ref(db, `scores/${score.user}/${score.quizKey}/${score.timestamp}`), {
            score: score.score, total: score.total, time: score.time
          });
          console.log('[PWA] ✅ Synced:', score.quizKey);
        } catch (e) {
          console.warn('[PWA] Sync failed, keeping for later:', e);
          remaining.push(score);
        }
      }
      
      localStorage.setItem('pending_scores', JSON.stringify(remaining));
      if (remaining.length === 0) {
        showToast('🔄 تمت مزامنة النتائج الأوفلاين');
      }
    } catch (e) {
      console.warn('[PWA] Sync error:', e);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 7. PUSH NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      return { error: 'المتصفح لا يدعم الإشعارات' };
    }
    
    if (Notification.permission === 'granted') {
      return { granted: true };
    }
    
    if (Notification.permission === 'denied') {
      return { error: 'الإشعارات مرفوضة — فعّلها من إعدادات المتصفح' };
    }
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await subscribeToPush();
      return { granted: true };
    }
    
    return { error: 'المستخدم رفض الإشعارات' };
  }
  
  async function subscribeToPush() {
    if (!swRegistration) {
      console.warn('[PWA] No SW registration');
      return;
    }
    
    try {
      // ⚠️ محتاج VAPID key من Firebase Console
      // Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
      const VAPID_PUBLIC_KEY = localStorage.getItem('vapid_key') || '';
      
      if (!VAPID_PUBLIC_KEY) {
        console.log('[PWA] No VAPID key — using local notifications only');
        return;
      }
      
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      console.log('[PWA] Push subscribed');
      
      // حفظ في Firebase
      if (CURRENT_USER) {
        const { initializeApp, getApps, getApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        const { getDatabase, ref, set } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
        
        const cfg = {
          apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
          authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
          databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
          projectId: "quiz-hub-app-f4cd0",
          storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
          messagingSenderId: "282772179392",
          appId: "1:282772179392:web:64646d757592b29ff3a025"
        };
        
        const app = getApps().length ? getApp() : initializeApp(cfg);
        const db = getDatabase(app);
        
        await set(ref(db, `push_subscriptions/${CURRENT_USER}`), subscription.toJSON());
        console.log('[PWA] ✅ Subscription saved');
      }
    } catch (e) {
      console.warn('[PWA] Push subscription failed:', e);
    }
  }
  
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 8. LOCAL NOTIFICATIONS (بدون VAPID)
  // ═══════════════════════════════════════════════════════════════════
  async function showLocalNotification(title, body, url, options = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    if (swRegistration) {
      return swRegistration.showNotification(title, {
        body: body,
        icon: './pic/Logo.png',
        badge: './pic/Logo.png',
        tag: options.tag || 'quizhub',
        data: { url: url || './index.html' },
        vibrate: [200, 100, 200],
        requireInteraction: options.requireInteraction || false,
        dir: 'rtl',
        lang: 'ar',
        ...options
      });
    } else {
      // Fallback
      new Notification(title, { body, icon: './pic/Logo.png' });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 9. WAR NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  async function notifyWarStart(kingdom1Name, kingdom2Name, endTime) {
    return showLocalNotification(
      '⚔️ حرب الأسبوع بدأت!',
      `${kingdom1Name} VS ${kingdom2Name} — انضم واكسب الجوايز!`,
      './world-map.html',
      { tag: 'war-start' }
    );
  }
  
  async function notifyWarEnd(winnerName) {
    return showLocalNotification(
      '🏆 انتهت حرب الأسبوع!',
      `الفايز: ${winnerName} — مبروك للمحاربين!`,
      './world-map.html',
      { tag: 'war-end', requireInteraction: true }
    );
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 10. CACHE STATUS
  // ═══════════════════════════════════════════════════════════════════
  function getCacheStatus() {
    return new Promise((resolve) => {
      if (!navigator.serviceWorker.controller) {
        resolve({ ready: false });
        return;
      }
      
      const handler = (e) => {
        if (e.data && e.data.type === 'CACHE_STATUS') {
          navigator.serviceWorker.removeEventListener('message', handler);
          resolve(e.data);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', handler);
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_STATUS' });
      
      setTimeout(() => resolve({ ready: false, timeout: true }), 2000);
    });
  }
  
  async function cacheAllQuizzes() {
    if (!navigator.serviceWorker.controller) {
      return { error: 'Service worker مش شغال' };
    }
    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_QUIZZES' });
    return { started: true };
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 11. TOAST HELPER
  // ═══════════════════════════════════════════════════════════════════
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 90px; left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 18, 32, 0.98);
      color: #fff; padding: 14px 24px;
      border-radius: 12px; border: 2px solid #10b981;
      font-family: 'Cairo'; font-weight: 900; font-size: 14px;
      z-index: 99999; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      animation: pwaToast 0.3s ease;
      max-width: 90%; text-align: center;
    `;
    
    if (!document.getElementById('pwa-toast-style')) {
      const s = document.createElement('style');
      s.id = 'pwa-toast-style';
      s.textContent = `@keyframes pwaToast { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }`;
      document.head.appendChild(s);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  
  // ═══════════════════════════════════════════════════════════════════
  // 12. PUBLIC API
  // ═══════════════════════════════════════════════════════════════════
  window.NFPWA = {
    install: promptInstall,
    isInstalled: () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
    isOnline: () => navigator.onLine,
    requestNotifications: requestNotificationPermission,
    notify: showLocalNotification,
    notifyWarStart: notifyWarStart,
    notifyWarEnd: notifyWarEnd,
    getCacheStatus: getCacheStatus,
    cacheAllQuizzes: cacheAllQuizzes,
    applyUpdate: () => {
      if (swRegistration && swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    },
    // Queue score when offline
    queueScore: (user, quizKey, score, total) => {
      const pending = JSON.parse(localStorage.getItem('pending_scores') || '[]');
      pending.push({
        user, quizKey, score, total,
        timestamp: Date.now(),
        time: new Date().toISOString()
      });
      localStorage.setItem('pending_scores', JSON.stringify(pending));
      console.log('[PWA] Score queued for sync');
    }
  };
  
  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  console.log('[PWA] ✅ Manager loaded');
  updateOnlineStatus();
  
})();