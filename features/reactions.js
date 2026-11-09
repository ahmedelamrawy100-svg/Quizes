/* ═══════════════════════════════════════════════════════════════════
   FEATURE 9: EMOJI REACTIONS
   Node: reactions/{quizKey}/{emoji}/{userId} = true
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

export const REACTION_EMOJIS = ['❤️', '😂', '😮', '🔥', '👍', '🎯'];

const cache = {};

export function initReactions(quizKey, container) {
  if (!container) return;
  const unsub = onValue(ref(db, `reactions/${quizKey}`), snap => {
    cache[quizKey] = snap.val() || {};
    renderReactionsBar(quizKey, container);
  });
  return unsub;
}

function renderReactionsBar(quizKey, container) {
  const data = cache[quizKey] || {};
  const hasReacted = {};
  Object.keys(data).forEach(emoji => {
    hasReacted[emoji] = !!(data[emoji] && data[emoji][CU]);
  });

  container.innerHTML = REACTION_EMOJIS.map(emoji => {
    const count = data[emoji] ? Object.keys(data[emoji]).length : 0;
    const active = hasReacted[emoji];
    return `<button class="reaction-btn ${active ? 'active' : ''}" onclick="window._toggleReaction('${quizKey}', '${emoji}')">
      ${emoji} <span class="reaction-count">${count || ''}</span>
    </button>`;
  }).join('');
}

window._toggleReaction = async (quizKey, emoji) => {
  if (!CU) return showToast('سجل دخول الأول', 'error');
  const reactionRef = ref(db, `reactions/${quizKey}/${emoji}/${CU}`);
  const snap = await get(reactionRef);
  if (snap.exists()) {
    await remove(reactionRef);
  } else {
    await set(reactionRef, true);
  }
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

window.NFReactions = { initReactions, REACTION_EMOJIS };