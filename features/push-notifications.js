/* ═══════════════════════════════════════════════════════════════════
   FEATURE 14: PUSH NOTIFICATIONS
   - Uses browser Notification API + Service Worker
   - Node: user_notifications/{userId} = list of { title, body, time, read }
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

export async function requestPermission() {
  if (!('Notification' in window)) return { error: 'المتصفح مش بيدعم الإشعارات' };
  if (Notification.permission === 'granted') return { granted: true };
  if (Notification.permission === 'denied') return { error: 'الإشعارات مرفوضة من إعدادات المتصفح' };

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // سجل Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        localStorage.setItem('sw_registered', 'true');
      } catch (e) { console.warn('SW register failed:', e); }
    }
    localStorage.setItem('push_permission', 'granted');
    return { granted: true };
  }
  return { error: '❌ المستخدم رفض الإشعارات' };
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

// بث إشعار للاعب (يستخدم من admin/owner)
export async function sendPushNotification(targetUser, title, body, link) {
  const notifRef = push(ref(db, `user_notifications/${targetUser.toLowerCase()}`));
  await set(notifRef, {
    title, body, link: link || null, time: Date.now(), read: false, from: CU
  });
}

// عرض الإشعارات (drops down when new notification arrives)
export function initPushListener() {
  if (!CU) return;
  onValue(ref(db, `user_notifications/${CU}`), snap => {
    const data = snap.val() || {};
    const entries = Object.entries(data).filter(([, n]) => !n.read).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
    if (entries.length === 0) return;
    const [id, notif] = entries[entries.length - 1];

    // 1. Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      try {
        new Notification(notif.title || 'Quiz Hub', {
          body: notif.body || '',
          icon: '/pic/Logo.png',
          badge: '/pic/Logo.png',
          tag: id
        });
      } catch (e) { console.warn(e); }
    }

    // 2. Show in-app toast
    showPushToast(notif.title, notif.body, notif.link);

    // 3. Mark as read
    update(ref(db, `user_notifications/${CU}/${id}`), { read: true });
  });
}

function showPushToast(title, body, link) {
  const c = document.getElementById('nf-toast-container') || (() => {
    const cc = document.createElement('div');
    cc.id = 'nf-toast-container'; cc.className = 'nf-toast-container';
    document.body.appendChild(cc); return cc;
  })();
  const t = document.createElement('div');
  t.className = 'nf-toast gold';
  t.style.cursor = 'pointer';
  t.innerHTML = `<div style="font-weight:900;">🔔 ${title || ''}</div><div style="font-size:13px; margin-top:4px;">${body || ''}</div>`;
  if (link) t.onclick = () => window.location.href = link;
  c.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

export function renderPushPermissionBox(container) {
  if (!container) return;
  const status = getPermissionStatus();
  if (status === 'granted') {
    container.innerHTML = `<div class="push-permission-box">
      <h4>✅ الإشعارات مفعلة</h4>
      <p>هتستلم كل الإشعارات الجديدة على المتصفح</p>
    </div>`;
    return;
  }
  if (status === 'denied') {
    container.innerHTML = `<div class="push-permission-box">
      <h4>🚫 الإشعارات مرفوضة</h4>
      <p>افتح إعدادات المتصفح وسمح بالإشعارات للموقع</p>
    </div>`;
    return;
  }
  container.innerHTML = `<div class="push-permission-box">
    <h4>🔔 فعّل الإشعارات</h4>
    <p>عشان توصلك البادجات الجديدة والتحديات أول بأول</p>
    <button class="push-enable-btn" onclick="window._enablePush()">🔔 فعّل الآن</button>
  </div>`;
}

window._enablePush = async () => {
  const r = await requestPermission();
  if (r.error) return showToast(r.error, 'error');
  showToast('✅ الإشعارات مفعلة!', 'success');
  initPushListener();
  renderPushPermissionBox(document.getElementById('push-permission-container'));
};

function showToast(msg, type = 'success') {
  const c = document.getElementById('nf-toast-container') || (() => {
    const cc = document.createElement('div');
    cc.id = 'nf-toast-container'; cc.className = 'nf-toast-container';
    document.body.appendChild(cc); return cc;
  })();
  const t = document.createElement('div');
  t.className = 'nf-toast ' + (type !== 'success' ? type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

window.NFPush = { requestPermission, getPermissionStatus, sendPushNotification, initPushListener, renderPushPermissionBox };