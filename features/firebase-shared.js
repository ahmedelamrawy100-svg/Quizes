/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — SHARED FIREBASE INITIALIZER
   يمنع تكرار initialization ويعطي مرجع واحد للـ db
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
  authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
  databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
  projectId: "quiz-hub-app-f4cd0",
  storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
  messagingSenderId: "282772179392",
  appId: "1:282772179392:web:64646d757592b29ff3a025"
};

// Singleton pattern — آمن حتى لو أكتر من ملف استدعى
let app;
if (getApps().length > 0) {
  app = getApp();
} else {
  app = initializeApp(FIREBASE_CONFIG);
}

export const db = getDatabase(app);
export { ref, get, set, update, remove, push, onValue };

// Current user helper
export const currentUser = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
export const isLoggedIn = () => !!currentUser && currentUser !== 'زائر' && currentUser !== 'unknown';

// Toast helper (يستخدمه كل الملفات)
export function showToast(msg, type = 'success') {
  let container = document.getElementById('nf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'nf-toast-container';
    container.className = 'nf-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'nf-toast ' + (type !== 'success' ? type : '');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// Escape helper
export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Modal helper
export function openModal(title, htmlContent, maxWidth = '600px') {
  let modal = document.getElementById('nf-shared-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'nf-shared-modal';
    modal.className = 'nf-modal';
    modal.innerHTML = `
      <div class="nf-modal-box" style="max-width:${maxWidth};">
        <button class="nf-modal-close" onclick="document.getElementById('nf-shared-modal').classList.remove('active')">✖</button>
        <div class="nf-modal-title" id="nf-modal-title"></div>
        <div id="nf-modal-content"></div>
      </div>
    `;
    modal.addEventListener('click', e => { if (e.target.id === 'nf-shared-modal') modal.classList.remove('active'); });
    document.body.appendChild(modal);
  }
  modal.querySelector('.nf-modal-box').style.maxWidth = maxWidth;
  document.getElementById('nf-modal-title').textContent = title;
  document.getElementById('nf-modal-content').innerHTML = htmlContent;
  modal.classList.add('active');
}

export function closeModal() {
  const modal = document.getElementById('nf-shared-modal');
  if (modal) modal.classList.remove('active');
}x  