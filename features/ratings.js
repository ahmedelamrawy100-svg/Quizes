/* ═══════════════════════════════════════════════════════════════════
   FEATURE 10: QUIZ RATINGS — FULLY WORKING
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, onValue, currentUser, isLoggedIn, showToast, escapeHtml } from './firebase-shared.js';

const cache = {};
const unsubscribers = {};

// ═══════════ INIT ═══════════
export function initRatings(quizKey, container) {
  if (!container || !quizKey) return;
  if (unsubscribers[quizKey]) unsubscribers[quizKey]();

  unsubscribers[quizKey] = onValue(ref(db, `ratings/${quizKey}`), snap => {
    cache[quizKey] = snap.val() || {};
    renderRatingsUI(quizKey, container);
  });
}

function renderRatingsUI(quizKey, container) {
  const data = cache[quizKey] || {};
  const entries = Object.entries(data);
  const total = entries.length;
  const avg = total > 0 ? (entries.reduce((sum, [, r]) => sum + (r.stars || 0), 0) / total).toFixed(1) : '0.0';
  const myRating = data[currentUser] || { stars: 0, comment: '' };

  const comments = entries
    .filter(([id, r]) => r.comment && r.comment.trim())
    .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
    .slice(0, 5);

  container.innerHTML = `
    <div class="rating-container">
      <div class="rating-summary">
        <div class="rating-average"><span>⭐</span><span>${avg}</span></div>
        <div style="font-size:13px; margin-top:4px;">من ${total} تقييم</div>
      </div>
      <div class="rating-stars" id="rating-stars-${quizKey}">
        ${[1,2,3,4,5].map(i => `<span class="rating-star ${i <= myRating.stars ? 'active' : ''}" data-star="${i}" onclick="window._nfSetRating('${quizKey}', ${i})">★</span>`).join('')}
      </div>
      ${isLoggedIn() ? `
        <textarea class="rating-comment-input" id="rating-comment-${quizKey}" placeholder="اكتب تعليقك (اختياري)...">${escapeHtml(myRating.comment || '')}</textarea>
        <button class="rating-submit" onclick="window._nfSubmitRating('${quizKey}')">💾 احفظ تقييمك</button>
      ` : '<p style="text-align:center; padding:15px; color:#aaa;">سجل دخول عشان تقيّم</p>'}
      ${comments.length > 0 ? `<div style="margin-top:20px;">
        <h4 style="color:var(--nf-gold); font-size:14px; margin-bottom:10px;">💬 آخر التعليقات:</h4>
        ${comments.map(([uid, r]) => `<div class="rating-comment-item">
          <div class="rating-comment-user">👤 ${escapeHtml(uid)}</div>
          <div class="rating-comment-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
          <div class="rating-comment-text">${escapeHtml(r.comment)}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>
  `;

  // Store current selection
  window._nfRatingStars = window._nfRatingStars || {};
  window._nfRatingStars[quizKey] = myRating.stars || 0;
}

// ═══════════ SET STARS ═══════════
window._nfSetRating = (quizKey, stars) => {
  if (!isLoggedIn()) return showToast('سجل دخول الأول', 'error');
  window._nfRatingStars = window._nfRatingStars || {};
  window._nfRatingStars[quizKey] = stars;
  const el = document.getElementById(`rating-stars-${quizKey}`);
  if (!el) return;
  el.querySelectorAll('.rating-star').forEach((s, i) => {
    s.classList.toggle('active', i < stars);
  });
};

// ═══════════ SUBMIT ═══════════
window._nfSubmitRating = async (quizKey) => {
  if (!isLoggedIn()) return showToast('سجل دخول الأول', 'error');
  const stars = (window._nfRatingStars || {})[quizKey] || 0;
  if (stars === 0) return showToast('اختر عدد النجوم الأول', 'error');

  const commentEl = document.getElementById(`rating-comment-${quizKey}`);
  const comment = (commentEl?.value || '').trim();

  await set(ref(db, `ratings/${quizKey}/${currentUser}`), {
    stars, comment, time: Date.now()
  });
  showToast('⭐ تم حفظ تقييمك!', 'gold');
};

// ═══════════ AUTO-INIT ═══════════
function autoAttachRatings() {
  setTimeout(() => {
    document.querySelectorAll('[data-ratings-quiz]').forEach(el => {
      const key = el.dataset.ratingsQuiz;
      if (key) initRatings(key, el);
    });
  }, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoAttachRatings);
} else {
  autoAttachRatings();
}

window.NFRatings = { initRatings };
console.log('✅ Ratings loaded');