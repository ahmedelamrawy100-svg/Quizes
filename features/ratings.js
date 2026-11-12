/* ═══════════════════════════════════════════════════════════════════
   FEATURE: WEBSITE & QUIZ RATINGS (BILINGUAL)
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, onValue, currentUser, isLoggedIn, showToast, escapeHtml } from '../firebase-shared.js';

const cache = {};
const unsubscribers = {};

// الترجمات الخاصة بالتقييمات
const T = {
  ar: {
    titleWebsite: '🌟 إيه رأيك في Quiz Hub ككل؟',
    subtitleWebsite: 'رأيك بيهمنا جداً عشان نطور الموقع!',
    titleQuiz: '🌟 قيّم الكويز ده',
    subtitleQuiz: 'شاركنا رأيك في الكويز',
    totalRatings: 'من إجمالي {count} تقييم',
    ratePrompt: 'إنت بتدي كام نجمة؟',
    placeholder: 'اكتب تعليقك أو اقتراحك لتطوير الموقع (اختياري)...',
    saveBtn: '💾 احفظ تقييمك',
    loginPrompt: 'سجل دخول الأول عشان تقدر تقيّم',
    reviewsTitle: '💬 آراء اللاعبين:',
    errLogin: 'سجل دخول الأول',
    errStars: 'اختر عدد النجوم الأول',
    success: '⭐ تم حفظ تقييمك بنجاح! شكراً ليك.',
    errGeneral: 'حدث خطأ، حاول تاني'
  },
  en: {
    titleWebsite: '🌟 How do you like Quiz Hub overall?',
    subtitleWebsite: 'Your feedback is very important to us!',
    titleQuiz: '🌟 Rate this quiz',
    subtitleQuiz: 'Share your opinion about the quiz',
    totalRatings: 'From {count} total ratings',
    ratePrompt: 'How many stars do you give?',
    placeholder: 'Write your comment or suggestion to improve the site (optional)...',
    saveBtn: '💾 Save your rating',
    loginPrompt: 'Log in first to rate',
    reviewsTitle: '💬 Players\' Reviews:',
    errLogin: 'Log in first',
    errStars: 'Choose number of stars first',
    success: '⭐ Rating saved successfully! Thank you.',
    errGeneral: 'An error occurred, please try again'
  }
};

const getT = () => T[localStorage.getItem('lang') || 'ar'];

export function initRatings(quizKey, container) {
  if (!container || !quizKey) return;
  if (unsubscribers[quizKey]) unsubscribers[quizKey]();

  // الاستماع للتقييمات من الداتابيز
  unsubscribers[quizKey] = onValue(ref(db, `ratings/${quizKey}`), snap => {
    cache[quizKey] = snap.val() || {};
    renderRatingsUI(quizKey, container);
  });
}

function renderRatingsUI(quizKey, container) {
  const t = getT();
  const data = cache[quizKey] || {};
  const entries = Object.entries(data);
  const total = entries.length;
  const avg = total > 0 ? (entries.reduce((sum, [, r]) => sum + (r.stars || 0), 0) / total).toFixed(1) : '0.0';
  const myRating = data[currentUser] || { stars: 0, comment: '' };

  const comments = entries
    .filter(([id, r]) => r.comment && r.comment.trim())
    .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
    .slice(0, 10);

  // لو التقييم للموقع الشامل
  const isWebsite = quizKey === 'website_overall';
  const titleText = isWebsite ? t.titleWebsite : t.titleQuiz;
  const subText = isWebsite ? t.subtitleWebsite : t.subtitleQuiz;
  
  // تنسيق النص بناءً على عدد التقييمات
  const totalRatingsText = t.totalRatings.replace('{count}', total);

  container.innerHTML = `
    <div class="rating-container" style="background:var(--card-bg); border:2px solid var(--border); border-radius:16px; padding:24px; box-shadow:0 10px 30px rgba(0,0,0,0.2);">
      
      <div style="text-align:center; margin-bottom:20px;">
        <h3 style="color:var(--gold); font-size:22px; margin-bottom:5px;">${titleText}</h3>
        <p style="color:#aaa; font-size:14px;">${subText}</p>
      </div>

      <div class="rating-summary" style="background:rgba(0,0,0,0.2); padding:15px; border-radius:12px; margin-bottom:20px; text-align:center;">
        <div class="rating-average" style="font-size:42px; font-weight:900; color:var(--gold); display:flex; justify-content:center; align-items:center; gap:10px;">
          <span>⭐</span><span>${avg}</span>
        </div>
        <div style="font-size:14px; color:#ccc; margin-top:5px;">${totalRatingsText}</div>
      </div>

      <div style="text-align:center; margin-bottom:10px; font-weight:bold; color:#fff;">${t.ratePrompt}</div>
      <div class="rating-stars" id="rating-stars-${quizKey}" style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">
        ${[1,2,3,4,5].map(i => `<span class="rating-star ${i <= myRating.stars ? 'active' : ''}" data-star="${i}" onclick="window._nfSetRating('${quizKey}', ${i})" style="font-size:40px; cursor:pointer; color:${i <= myRating.stars ? '#ffd700' : '#444'}; transition:0.2s;">★</span>`).join('')}
      </div>

      ${isLoggedIn() ? `
        <textarea class="rating-comment-input" id="rating-comment-${quizKey}" placeholder="${t.placeholder}" style="width:100%; padding:15px; border-radius:12px; background:rgba(0,0,0,0.2); border:1px solid var(--border); color:#fff; font-family:Cairo; font-size:14px; resize:vertical; min-height:80px; margin-bottom:15px; outline:none;">${escapeHtml(myRating.comment || '')}</textarea>
        
        <button class="rating-submit" onclick="window._nfSubmitRating('${quizKey}')" style="width:100%; padding:14px; background:linear-gradient(135deg, #ffd700, #ff8c00); color:#000; border:none; border-radius:12px; font-family:Cairo; font-weight:900; font-size:16px; cursor:pointer; transition:0.3s; box-shadow:0 4px 15px rgba(255,215,0,0.3);">
          ${t.saveBtn}
        </button>
      ` : `<div style="text-align:center; padding:15px; background:rgba(255,0,0,0.1); border:1px solid #ff0000; border-radius:10px; color:#ff6666; font-weight:bold;">${t.loginPrompt}</div>`}

      ${comments.length > 0 ? `
        <div style="margin-top:30px;">
          <h4 style="color:var(--gold); font-size:16px; margin-bottom:15px; border-bottom:1px solid #333; padding-bottom:10px;">${t.reviewsTitle}</h4>
          <div style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto; padding-left:5px;">
            ${comments.map(([uid, r]) => `
              <div class="rating-comment-item" style="background:rgba(255,255,255,0.03); border:1px solid #333; border-radius:12px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                  <div class="rating-comment-user" style="font-weight:bold; color:#00bcd4; font-size:14px;">👤 ${escapeHtml(uid)}</div>
                  <div class="rating-comment-stars" style="color:#ffd700; font-size:14px;">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
                </div>
                <div class="rating-comment-text" style="font-size:13px; color:#ddd; line-height:1.5;">${escapeHtml(r.comment)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  window._nfRatingStars = window._nfRatingStars || {};
  window._nfRatingStars[quizKey] = myRating.stars || 0;
}

window._nfSetRating = (quizKey, stars) => {
  if (!isLoggedIn()) return showToast(getT().errLogin, 'error');
  window._nfRatingStars = window._nfRatingStars || {};
  window._nfRatingStars[quizKey] = stars;
  
  const el = document.getElementById(`rating-stars-${quizKey}`);
  if (!el) return;
  el.querySelectorAll('.rating-star').forEach((s, i) => {
    if (i < stars) {
      s.classList.add('active');
      s.style.color = '#ffd700';
      s.style.transform = 'scale(1.2)';
    } else {
      s.classList.remove('active');
      s.style.color = '#444';
      s.style.transform = 'scale(1)';
    }
  });
};

window._nfSubmitRating = async (quizKey) => {
  const t = getT();
  if (!isLoggedIn()) return showToast(t.errLogin, 'error');
  const stars = (window._nfRatingStars || {})[quizKey] || 0;
  if (stars === 0) return showToast(t.errStars, 'error');

  const commentEl = document.getElementById(`rating-comment-${quizKey}`);
  const comment = (commentEl?.value || '').trim();

  try {
    await set(ref(db, `ratings/${quizKey}/${currentUser}`), {
      stars, comment, time: Date.now()
    });
    showToast(t.success, 'gold');
    if (window.confetti) window.confetti({ particleCount: 50, spread: 60 });
  } catch (error) {
    showToast(t.errGeneral, 'error');
  }
};

window.NFRatings = { initRatings };
console.log('✅ Ratings loaded');