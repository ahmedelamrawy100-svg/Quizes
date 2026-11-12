/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — UNIFIED NOTIFICATIONS ENGINE (v3)
   The ONLY file responsible for all notifications site-wide.
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get, set, remove, update, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = getApps().length ? getApp() : initializeApp(FB);
const db = getDatabase(app);

window.db = db; window.ref = ref; window.get = get; window.set = set;
window.remove = remove; window.update = update; window.push = push;

const CU = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
const TITLE_ORIGINAL = document.title;
let unreadCount = 0;

/* ─── 1. TOAST SYSTEM ─── */
function ensureToastContainer() {
  let c = document.getElementById('nf-toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'nf-toast-container';
    c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:10px;pointer-events:none;direction:rtl;max-width:calc(100vw - 40px);';
    document.body.appendChild(c);
  }
  return c;
}

export function showToast(title, message = '', type = 'info', duration = 4500) {
  const c = ensureToastContainer();
  const colors = { success: '#10b981', error: '#ef4444', info: '#00bcd4', warning: '#ff9800', gold: '#ffd700' };
  const borderColor = colors[type] || colors.info;

  const t = document.createElement('div');
  t.style.cssText = `background:#111; border-right:5px solid ${borderColor}; color:#fff; padding:14px 20px; border-radius:10px; box-shadow:0 8px 30px rgba(0,0,0,0.5); font-family:Cairo,sans-serif; min-width:250px; max-width:400px; pointer-events:auto; display:flex; flex-direction:column; gap:5px; animation:nfToastIn 0.3s ease-out;`;
  t.innerHTML = message
    ? `<div style="font-weight:900; font-size:14px; color:${borderColor};">${title}</div><div style="font-size:13px; line-height:1.4; color:#ddd;">${message}</div>`
    : `<div style="font-weight:bold; font-size:14px;">${title}</div>`;
  
  if (!document.getElementById('nf-toast-style')) {
    const s = document.createElement('style');
    s.id = 'nf-toast-style';
    s.textContent = `@keyframes nfToastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
    document.head.appendChild(s);
  }

  c.appendChild(t);
  setTimeout(() => {
    t.style.transition = '0.3s'; t.style.opacity = '0'; t.style.transform = 'translateX(100%)';
    setTimeout(() => t.remove(), 300);
  }, duration);
}
window.showToast = showToast;

/* ─── 2. PUSH NOTIFICATION TO A USER ─── */
export async function triggerNotification(targetUser, title, message, type = 'info', isGlobal = false) {
  if (!targetUser && !isGlobal) return;
  const payload = { title, message, type, time: Date.now(), read: false };
  try {
    if (isGlobal) await push(ref(db, 'global_notifications'), payload);
    else await push(ref(db, `user_notifications/${targetUser.toLowerCase()}`), payload);
  } catch (e) { console.warn('[notify] push failed', e); }
}
window.triggerNotification = triggerNotification;

/* ─── 3. BROWSER PUSH PERMISSION ─── */
export async function requestPushPermission() {
  if (!('Notification' in window)) return { error: 'Browser does not support notifications' };
  if (Notification.permission === 'granted') return { granted: true };
  if (Notification.permission === 'denied') return { error: 'Notifications are blocked in browser settings' };
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    if ('serviceWorker' in navigator) {
      try { await navigator.serviceWorker.register('/service-worker.js'); } catch(e) {}
    }
    localStorage.setItem('push_permission', 'granted');
    return { granted: true };
  }
  return { error: 'User declined notifications' };
}
window.requestPushPermission = requestPushPermission;

export function getPushPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
window.getPushPermission = getPushPermission;

export function renderPushPermissionBox(container) {
  if (!container) return;
  const status = getPushPermission();
  if (status === 'granted') {
    container.innerHTML = `<div style="background:rgba(16,185,129,0.1);border:2px solid #10b981;border-radius:14px;padding:20px;text-align:center;"><h4 style="color:#10b981;margin-bottom:8px;">✅ Notifications enabled</h4><p style="color:#aaa;font-size:13px;">You'll receive all new notifications in the browser</p></div>`;
    return;
  }
  if (status === 'denied') {
    container.innerHTML = `<div style="background:rgba(239,68,68,0.1);border:2px solid #ef4444;border-radius:14px;padding:20px;text-align:center;"><h4 style="color:#ef4444;margin-bottom:8px;">🚫 Notifications blocked</h4><p style="color:#aaa;font-size:13px;">Enable them from browser settings</p></div>`;
    return;
  }
  container.innerHTML = `<div style="background:rgba(168,85,247,0.1);border:2px solid #a855f7;border-radius:14px;padding:20px;text-align:center;"><h4 style="color:#a855f7;margin-bottom:10px;">🔔 Enable Notifications</h4><p style="color:#aaa;font-size:13px;margin-bottom:14px;">Get badges and challenges in real time</p><button onclick="window._enablePush()" style="padding:12px 24px;background:#a855f7;color:#fff;border:none;border-radius:8px;font-family:Cairo;font-weight:900;cursor:pointer;">🔔 Enable Now</button></div>`;
}
window.renderPushPermissionBox = renderPushPermissionBox;

window._enablePush = async () => {
  const r = await requestPushPermission();
  if (r.error) return showToast('❌', r.error, 'error');
  showToast('✅', 'Notifications enabled!', 'success');
  const box = document.getElementById('push-permission-container');
  if (box) renderPushPermissionBox(box);
};

/* ─── 4. TAB TITLE UNREAD BADGE ─── */
function updateTabTitle() {
  document.title = unreadCount > 0 ? `(${unreadCount}) 🔔 ${TITLE_ORIGINAL}` : TITLE_ORIGINAL;
}
window.addEventListener('focus', () => { unreadCount = 0; updateTabTitle(); });

/* ─── 5. LISTEN TO USER NOTIFICATIONS ─── */
function listenUserNotifications() {
  if (!CU || CU === 'unknown' || CU === 'زائر') return;
  
  let isFirst = true;
  onValue(ref(db, `user_notifications/${CU}`), (snap) => {
    const data = snap.val() || {};
    const unread = Object.entries(data).filter(([, n]) => !n.read);
    
    if (isFirst) {
      isFirst = false;
      const latest = unread[unread.length - 1];
      if (latest) {
        showToast(latest[1].title || '🔔 New notification', latest[1].message || '', latest[1].type || 'info');
        update(ref(db, `user_notifications/${CU}/${latest[0]}`), { read: true });
      }
      return;
    }
    
    unread.forEach(([id, n]) => {
      showToast(n.title || '🔔', n.message || '', n.type || 'info');
      if (Notification.permission === 'granted') {
        try {
          new Notification(n.title || 'Quiz Hub', { body: n.message || '', icon: '/pic/Logo.png', badge: '/pic/Logo.png', tag: id });
        } catch(e) {}
      }
      update(ref(db, `user_notifications/${CU}/${id}`), { read: true });
    });
  });

  let isGlobalFirst = true;
  onValue(ref(db, 'global_notifications'), (snap) => {
    if (isGlobalFirst) { isGlobalFirst = false; return; }
    const data = snap.val() || {};
    const keys = Object.keys(data);
    const latestId = keys[keys.length - 1];
    if (latestId) {
      const n = data[latestId];
      showToast(`📢 ${n.title || ''}`, n.message || '', n.type || 'warning');
    }
  });
}

/* ─── 6. CHALLENGE POPUP ─── */
function listenChallenges() {
  if (!CU) return;
  let popup = document.getElementById('challengePopup');
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'challengePopup';
    popup.style.cssText = `display:none; position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#111; border:2px solid #ff0000; border-radius:15px; padding:20px; z-index:9999999; text-align:center; color:#fff; font-family:'Cairo',sans-serif; box-shadow:0 0 30px rgba(255,0,0,0.5); width:90%; max-width:350px; direction:rtl;`;
    document.body.appendChild(popup);
  }

  onValue(ref(db, 'challenges'), (snapshot) => {
    const all = snapshot.val() || {};
    let mine = null, myKey = null;
    for (const userKey in all) {
      if (userKey.toLowerCase() === CU) {
        const uc = all[userKey];
        for (const key in uc) {
          if (uc[key].status === 'pending' && uc[key].roomCode) {
            mine = uc[key]; myKey = key; break;
          }
        }
        if (mine) break;
      }
    }
    if (!mine) { popup.style.display = 'none'; return; }
    popup.style.display = 'block';
    popup.innerHTML = `
      <h3 style="color:#ff0000; margin-bottom:10px;">⚔️ New Challenge!</h3>
      <p style="margin-bottom:15px; font-size:15px;">
        <b style="color:#ffd700;">${escapeHtml(mine.challenger)}</b> challenges you in:
        <br><b style="color:#00bcd4; font-size:17px;">${(mine.quiz||'').toUpperCase()}</b>
      </p>
      <div style="display:flex; gap:8px; justify-content:center;">
        <button onclick="window._acceptChallenge('${escapeHtml(mine.challenger)}','${mine.quiz}','${myKey}','${mine.roomCode}')" style="background:#10b981; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-family:'Cairo'; font-weight:bold; font-size:13px;">Accept ✅</button>
        <button onclick="window._rejectChallenge('${myKey}','${mine.roomCode}')" style="background:#ef4444; color:#fff; border:none; padding:10px 18px; border-radius:8px; cursor:pointer; font-family:'Cairo'; font-weight:bold; font-size:13px;">Reject ❌</button>
      </div>`;
  });
}

window._acceptChallenge = async (challenger, quiz, key, roomCode) => {
  try {
    const roomSnap = await get(ref(db, 'rooms/' + roomCode));
    if (!roomSnap.exists()) {
      await remove(ref(db, 'challenges/' + CU + '/' + key));
      document.getElementById('challengePopup').style.display = 'none';
      return showToast('❌', 'Room was closed', 'error');
    }
    localStorage.setItem('activeRoomCode', roomCode);
    await update(ref(db, 'rooms/' + roomCode), { status: 'playing', player2_name: CU });
    await remove(ref(db, 'challenges/' + CU + '/' + key));
    document.getElementById('challengePopup').style.display = 'none';
    const fileMap = { elharifa:'El Harifa Quiz', annabelle:'Annabelle Quiz', scream:'Scream Quiz', knivesout:'Knives Out Quiz', conjuring:'Conjuring Quiz', thenun:'The Nun Quiz', traintobusan:'Train to Busan Quiz', fnaf:'FNAF Quiz', squidgame:'Squid Game Quiz', spiderman:'Spider-Man Quiz', avengers:'Avengers Quiz', avatar:'Avatar Quiz', venom:'Venom Quiz', birdsofprey:'Birds of Prey Quiz', fall:'Fall Quiz', wednesday:'Wednesday Quiz' };
    const file = fileMap[(quiz||'').toLowerCase()] || fileMap[quiz] || quiz;
    window.location.href = `${file}.html?room=${roomCode}&role=player2`;
  } catch(e) { showToast('❌', 'Failed to accept challenge', 'error'); }
};

window._rejectChallenge = async (key, roomCode) => {
  try {
    await remove(ref(db, 'challenges/' + CU + '/' + key));
    if (roomCode) await remove(ref(db, 'rooms/' + roomCode));
    document.getElementById('challengePopup').style.display = 'none';
    showToast('🚫', 'Challenge rejected', 'info');
  } catch(e) {}
};

/* ─── 7. BAN / KICK LISTENERS ─── */
function listenBanKick() {
  if (!CU) return;
  onValue(ref(db, 'banned_users/' + CU), (snap) => {
    if (snap.exists()) {
      showToast('🚫', 'You have been banned — redirecting...', 'error', 1500);
      setTimeout(() => window.location.replace('banned.html'), 1200);
    }
  });
  onValue(ref(db, 'kick_signals/' + CU), (snap) => {
    if (snap.exists()) {
      set(ref(db, 'kick_signals/' + CU), null);
      showToast('👢', 'You were kicked from the site!', 'error', 1500);
      setTimeout(() => window.location.replace('banned.html'), 1200);
    }
  });
}

/* ─── 8. OLD MESSAGES / REQUESTS / WARNINGS ─── */
function listenOldNotifications() {
  if (!CU) return;

  let lastMsgCount = -1;
  onValue(ref(db, 'messages/' + CU), (snap) => {
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    if (lastMsgCount !== -1 && count > lastMsgCount) {
      unreadCount++; updateTabTitle();
      showToast('📩', 'New message in your inbox', 'info');
    }
    lastMsgCount = count;
  });

  let lastReqCount = -1;
  onValue(ref(db, 'friend_requests/' + CU), (snap) => {
    const count = snap.exists() ? Object.keys(snap.val()).length : 0;
    if (lastReqCount !== -1 && count > lastReqCount) {
      unreadCount++; updateTabTitle();
      showToast('👤', 'New friend request', 'warning');
    }
    lastReqCount = count;
  });

  let lastWarnText = '';
  onValue(ref(db, 'warnings/' + CU), (snap) => {
    if (snap.exists() && snap.val().text !== lastWarnText) {
      lastWarnText = snap.val().text;
      unreadCount++; updateTabTitle();
      showToast('⚠️', lastWarnText, 'error');
    }
  });
}

/* ─── 9. UTILS ─── */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

/* ─── 10. LEGACY COMPAT EXPORT ─── */
window.NFPush = {
  requestPermission: requestPushPermission,
  getPermissionStatus: getPushPermission,
  sendPushNotification: triggerNotification,
  renderPushPermissionBox: renderPushPermissionBox
};

/* ─── 11. INIT ─── */
if (!window.__nfNotifSetup) {
  window.__nfNotifSetup = true;
  window.addEventListener('load', () => {
    setTimeout(() => {
      listenBanKick();
      if (CU && CU !== 'unknown' && CU !== 'زائر') {
        listenOldNotifications();
        listenUserNotifications();
        listenChallenges();
      }
    }, 800);
  });
}

console.log('[notifications] ✅ Unified engine loaded v3');