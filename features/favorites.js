/* ═══════════════════════════════════════════════════════════════════
   FEATURE 1: FAVORITES (المفضلة)
   Node: favorites/{userId}/{quizKey} = { quizName, addedAt }
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

let cache = {};

export function initFavorites() {
  if (!CU) return;
  onValue(ref(db, `favorites/${CU}`), snap => {
    cache = snap.val() || {};
    document.querySelectorAll('[data-fav-quiz]').forEach(btn => {
      const key = btn.dataset.favQuiz;
      const active = !!cache[key];
      btn.classList.toggle('active', active);
      btn.innerHTML = active ? '❤️' : '🤍';
      btn.title = active ? 'إزالة من المفضلة' : 'إضافة للمفضلة';
    });
  });
}

export async function toggleFavorite(quizKey, quizName) {
  if (!CU) return { error: 'يجب تسجيل الدخول' };
  const isFav = !!cache[quizKey];
  if (isFav) {
    await remove(ref(db, `favorites/${CU}/${quizKey}`));
    return { added: false };
  } else {
    await set(ref(db, `favorites/${CU}/${quizKey}`), { quizName, addedAt: Date.now() });
    return { added: true };
  }
}

export function isFavorite(quizKey) { return !!cache[quizKey]; }
export function getFavorites() { return cache; }

export function renderFavoriteButton(container, quizKey, quizName) {
  if (!CU) return;
  const btn = document.createElement('button');
  btn.className = 'fav-btn';
  btn.dataset.favQuiz = quizKey;
  btn.innerHTML = cache[quizKey] ? '❤️' : '🤍';
  btn.title = cache[quizKey] ? 'إزالة من المفضلة' : 'إضافة للمفضلة';
  btn.onclick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await toggleFavorite(quizKey, quizName);
    if (result.error) return showToast(result.error, 'error');
    showToast(result.added ? '❤️ اتضاف للمفضلة' : '💔 اتشال من المفضلة', result.added ? 'gold' : 'info');
  };
  container.appendChild(btn);
}

export function renderFavoritesList(container, allQuizzes) {
  if (!CU) { container.innerHTML = '<p style="color:#aaa;">سجل دخول الأول</p>'; return; }
  const favs = Object.keys(cache);
  if (favs.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:30px; color:#aaa;">مفيش كويزات في المفضلة. اضغط 🤍 على أي كويز!</p>';
    return;
  }
  container.innerHTML = favs.map(key => {
    const data = allQuizzes.find(q => q.key === key) || { title: cache[key].quizName, href: '#' };
    return `
      <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--nf-surface); border:1px solid var(--nf-border); border-radius:10px; margin-bottom:8px;">
        <a href="${data.href}" style="color:var(--nf-gold); text-decoration:none; font-weight:bold;">${data.title}</a>
        <button class="nf-btn nf-btn-danger" onclick="window._removeFav('${key}', this)" style="padding:6px 12px; font-size:12px;">🗑️ إزالة</button>
      </div>
    `;
  }).join('');
}

window._removeFav = async (key, btn) => {
  await remove(ref(db, `favorites/${CU}/${key}`));
  btn.closest('.list-item').remove();
  showToast('🗑️ تم الحذف', 'info');
};

function showToast(msg, type = 'success') {
  const c = document.getElementById('nf-toast-container') || createToastContainer();
  const t = document.createElement('div');
  t.className = 'nf-toast ' + (type !== 'success' ? type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'nf-toast-container';
  c.className = 'nf-toast-container';
  document.body.appendChild(c);
  return c;
}

window.NFFavorites = { initFavorites, toggleFavorite, isFavorite, getFavorites, renderFavoriteButton, renderFavoritesList };