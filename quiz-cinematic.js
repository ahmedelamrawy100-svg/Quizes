/* ═══════════════════════════════════════════════════════════════════
   CINEMATIC MODE — Phase layer above quiz-core.js
   بيستمع لـ custom events من quiz-core ومش بيتدخل في منطقه
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const STORAGE_KEY = 'nf_cinematic_mode';
  const isCinemaEnabled = () => localStorage.getItem(STORAGE_KEY) !== 'false';

  let isCinemaActive = isCinemaEnabled();
  let stats = {
    score: 0, total: 0, answers: [],
    maxStreak: 0, currentStreak: 0,
    worstQuestion: null, fastestAnswer: null
  };

  /* ─── Load CSS dynamically ─── */
  function injectCSS() {
    if (document.getElementById('nf-cinematic-css')) return;
    const link = document.createElement('link');
    link.id = 'nf-cinematic-css';
    link.rel = 'stylesheet';
    link.href = 'quiz-cinematic.css';
    document.head.appendChild(link);
  }

  /* ─── Build UI elements ─── */
  function injectUI() {
    if (document.querySelector('.cinema-letterbox')) return;

    const top = document.createElement('div');
    top.className = 'cinema-letterbox top';
    document.body.appendChild(top);

    const bottom = document.createElement('div');
    bottom.className = 'cinema-letterbox bottom';
    document.body.appendChild(bottom);

    const grain = document.createElement('div');
    grain.className = 'cinema-grain';
    document.body.appendChild(grain);

    const vignette = document.createElement('div');
    vignette.className = 'cinema-vignette';
    document.body.appendChild(vignette);

    const badge = document.createElement('div');
    badge.className = 'cinema-difficulty-badge';
    badge.id = 'cinemaDifficultyBadge';
    document.body.appendChild(badge);

    const toggle = document.createElement('button');
    toggle.className = 'cinema-toggle-btn';
    toggle.id = 'cinemaToggleBtn';
    toggle.innerHTML = isCinemaActive ? '🎬 سينمائي' : '🎬 عادي';
    if (!isCinemaActive) toggle.classList.add('off');
    toggle.onclick = toggleCinema;
    document.body.appendChild(toggle);
  }

  function toggleCinema() {
    isCinemaActive = !isCinemaActive;
    localStorage.setItem(STORAGE_KEY, isCinemaActive ? 'true' : 'false');
    document.body.classList.toggle('cinema-active', isCinemaActive);
    const toggle = document.getElementById('cinemaToggleBtn');
    if (toggle) {
      toggle.innerHTML = isCinemaActive ? '🎬 سينمائي' : '🎬 عادي';
      toggle.classList.toggle('off', !isCinemaActive);
    }
    if (!isCinemaActive) {
      const badge = document.getElementById('cinemaDifficultyBadge');
      if (badge) badge.classList.remove('show');
    }
  }

  function showToggle() {
    const toggle = document.getElementById('cinemaToggleBtn');
    if (toggle) toggle.style.display = 'flex';
  }

  /* ─── Difficulty ─── */
  function getDifficulty(question, index, total) {
    if (question && question.difficulty) return question.difficulty;
    const pct = total > 0 ? index / total : 0;
    if (pct < 0.3) return 'easy';
    if (pct < 0.7) return 'medium';
    return 'hard';
  }

  function applyDifficulty(diff) {
    const playScreen = document.getElementById('playScreen');
    if (playScreen) {
      playScreen.classList.remove('cinema-difficulty-easy', 'cinema-difficulty-medium', 'cinema-difficulty-hard');
      playScreen.classList.add('cinema-difficulty-' + diff);
    }
    if (!isCinemaActive) return;
    const badge = document.getElementById('cinemaDifficultyBadge');
    if (badge) {
      const labels = {
        easy:   { emoji: '🟢', text: 'سهل' },
        medium: { emoji: '🟡', text: 'متوسط' },
        hard:   { emoji: '🔴', text: 'صعب' }
      };
      badge.innerHTML = `${labels[diff].emoji} ${labels[diff].text}`;
      badge.classList.add('show');
    }
  }

  /* ─── Question Loaded ─── */
  function onQuestionLoaded(detail) {
    const { question, index, total } = detail;
    showToggle();
    document.body.classList.toggle('cinema-active', isCinemaActive);

    if (index === 0) {
      stats = {
        score: 0, total, answers: [],
        maxStreak: 0, currentStreak: 0,
        worstQuestion: null, fastestAnswer: null
      };
    }
    applyDifficulty(getDifficulty(question, index, total));

    if (!isCinemaActive) return;

    const qEl = document.getElementById('question');
    if (qEl) {
      qEl.classList.remove('cinema-question-in');
      void qEl.offsetWidth;
      qEl.classList.add('cinema-question-in');
    }
    const optEl = document.getElementById('options');
    if (optEl) {
      optEl.querySelectorAll('.option').forEach((opt, i) => {
        opt.classList.remove('cinema-option-in');
        opt.style.animationDelay = (i * 0.08) + 's';
        void opt.offsetWidth;
        opt.classList.add('cinema-option-in');
      });
    }
  }

  /* ─── Answer Result ─── */
  function onAnswerResult(detail) {
    const { isCorrect, timeTaken, questionIndex, element } = detail;
    stats.answers.push({ isCorrect, timeTaken, index: questionIndex });

    if (isCorrect) {
      stats.score++;
      stats.currentStreak++;
      if (stats.currentStreak > stats.maxStreak) stats.maxStreak = stats.currentStreak;

      if (!stats.fastestAnswer || timeTaken < stats.fastestAnswer.timeTaken) {
        const qText = (document.getElementById('question')?.innerText || '').substring(0, 80);
        stats.fastestAnswer = { timeTaken, index: questionIndex, text: qText };
      }
      if (isCinemaActive) triggerCorrect(element);
    } else {
      stats.currentStreak = 0;
      if (!stats.worstQuestion || timeTaken > stats.worstQuestion.timeTaken) {
        const qText = (document.getElementById('question')?.innerText || '').substring(0, 80);
        stats.worstQuestion = { timeTaken, index: questionIndex, text: qText };
      }
      if (isCinemaActive) triggerWrong();
    }
  }

  function triggerCorrect(element) {
    if (element && element.getBoundingClientRect) {
      const rect = element.getBoundingClientRect();
      const burst = document.createElement('div');
      burst.className = 'cinema-burst';
      burst.style.left = (rect.left + rect.width  / 2 - 50) + 'px';
      burst.style.top  = (rect.top  + rect.height / 2 - 50) + 'px';
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 900);

      if (element.classList) {
        element.classList.add('cinema-correct-pulse');
        setTimeout(() => element.classList.remove('cinema-correct-pulse'), 750);
      }
    }
    const playScreen = document.getElementById('playScreen');
    if (playScreen) {
      playScreen.classList.add('cinema-correct-mode');
      setTimeout(() => playScreen.classList.remove('cinema-correct-mode'), 1300);
    }
  }

  function triggerWrong() {
    const flash = document.createElement('div');
    flash.className = 'cinema-red-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 750);

    const playScreen = document.getElementById('playScreen');
    if (playScreen) {
      playScreen.classList.add('cinema-shake');
      setTimeout(() => playScreen.classList.remove('cinema-shake'), 650);
    }
  }

  /* ─── Quiz Complete ─── */
  function onQuizComplete(detail) {
    if (!isCinemaActive) return;
    const { score, total, isSpeedrun } = detail;
    const displayScore = isSpeedrun ? Math.floor(score / 2) : score;
    setTimeout(() => showHighlights(displayScore, total, isSpeedrun), 1200);
  }

  function showHighlights(score, total, isSpeedrun) {
    const pct = total > 0 ? (score / total) * 100 : 0;
    const stars = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
    const starsStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);

    const ratingLabels = {
      5: { text: 'أداء أسطوري!', color: '#ffd700' },
      4: { text: 'أداء ممتاز!',   color: '#4caf50' },
      3: { text: 'أداء جيد',      color: '#2196f3' },
      2: { text: 'محتاج تدريب',    color: '#ff9800' },
      1: { text: 'حاول تاني!',    color: '#f44336' }
    };
    const rating = ratingLabels[stars];

    let items = '';
    if (stats.fastestAnswer) {
      items += `
        <div class="cinema-highlight-item">
          <div class="cinema-highlight-label">⚡ أسرع إجابة</div>
          <div class="cinema-highlight-value">${stats.fastestAnswer.timeTaken} ثانية</div>
          <div class="cinema-highlight-sublabel">${escapeHtml(stats.fastestAnswer.text)}...</div>
        </div>`;
    }
    if (stats.maxStreak >= 3) {
      items += `
        <div class="cinema-highlight-item">
          <div class="cinema-highlight-label">🔥 أطول streak</div>
          <div class="cinema-highlight-value">${stats.maxStreak} إجابات متتالية صح</div>
        </div>`;
    }
    if (stats.worstQuestion) {
      items += `
        <div class="cinema-highlight-item">
          <div class="cinema-highlight-label">🎯 أصعب سؤال عليك</div>
          <div class="cinema-highlight-value">${stats.worstQuestion.timeTaken} ثانية</div>
          <div class="cinema-highlight-sublabel">${escapeHtml(stats.worstQuestion.text)}...</div>
        </div>`;
    }
    const avg = stats.answers.length
      ? Math.round(stats.answers.reduce((s, a) => s + a.timeTaken, 0) / stats.answers.length)
      : 0;
    items += `
      <div class="cinema-highlight-item">
        <div class="cinema-highlight-label">⏱️ متوسط سرعتك</div>
        <div class="cinema-highlight-value">${avg} ثانية / سؤال</div>
      </div>`;

    const speedrunBadge = isSpeedrun
      ? `<div style="display:inline-block;margin-top:8px;padding:4px 12px;background:linear-gradient(135deg,#ff9800,#ffd700);color:#000;border-radius:15px;font-weight:900;font-size:12px;">⚡ Speedrun Mode</div>`
      : '';

    const overlay = document.createElement('div');
    overlay.className = 'cinema-highlights';
    overlay.innerHTML = `
      <div class="cinema-highlights-inner">
        <div class="cinema-highlights-title">🎬 النهاية</div>
        <div style="text-align:center;margin-bottom:25px;">
          <div style="font-size:56px;color:${rating.color};text-shadow:0 0 30px ${rating.color}80;margin-bottom:8px;letter-spacing:8px;">
            ${starsStr}
          </div>
          <div style="font-size:22px;font-weight:900;color:${rating.color};margin-bottom:6px;">
            ${rating.text}
          </div>
          <div style="font-size:16px;color:#aaa;">
            نتيجتك: <strong style="color:#ffd700;">${score} / ${total}</strong>
          </div>
          ${speedrunBadge}
        </div>
        ${items}
        <button onclick="this.closest('.cinema-highlights').remove()"
                style="margin-top:20px;padding:12px 35px;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#000;border:none;border-radius:12px;font-family:Cairo,sans-serif;font-weight:900;font-size:16px;cursor:pointer;box-shadow:0 5px 20px rgba(255,215,0,0.3);">
          ✨ إغلاق
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 50);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ─── Events ─── */
  document.addEventListener('nf:question-loaded', e => onQuestionLoaded(e.detail));
  document.addEventListener('nf:answer-result',   e => onAnswerResult(e.detail));
  document.addEventListener('nf:quiz-complete',   e => onQuizComplete(e.detail));

  /* ─── Init ─── */
  function init() {
    injectCSS();
    injectUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.NFCinematic = {
    isEnabled: () => isCinemaActive,
    toggle: toggleCinema,
    getStats: () => ({ ...stats })
  };
})();