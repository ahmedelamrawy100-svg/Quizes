import { db, ref, get, onValue } from '../firebase-shared.js';

export function listenActiveSeason(callback) {
  return onValue(ref(db, 'seasonal_events'), snap => {
    const data = snap.val() || {};
    const now = Date.now();
    const active = Object.entries(data)
      .filter(([, e]) => e.active && now >= e.startAt && now <= e.endAt)
      .map(([id, e]) => ({ id, ...e }));
    callback(active);
  });
}

export function isQuizInSeason(quizKey, activeSeasons) {
  return activeSeasons.some(s => (s.quizzes || []).includes(quizKey));
}

export function getSeasonMultiplier(quizKey, activeSeasons) {
  const s = activeSeasons.find(s => (s.quizzes || []).includes(quizKey));
  return s ? (s.multiplier || 1) : 1;
}

export function renderSeasonalBanner(container, activeSeasons) {
  if (!container || activeSeasons.length === 0) {
    if (container) container.style.display = 'none';
    return;
  }
  const s = activeSeasons[0];
  const timeLeft = s.endAt - Date.now();
  const hours = Math.floor(timeLeft / 3600000);
  container.style.display = 'block';
  container.innerHTML = `
    <div style="background:linear-gradient(90deg,#ffd700,#ff8c00);padding:15px 25px;border-radius:12px;text-align:center;color:#000;font-weight:bold;box-shadow:0 0 25px rgba(255,215,0,0.5);animation:pulseSeason 2s infinite;">
      <div style="font-size:24px;">${s.icon || '🎉'} ${s.name}</div>
      <div style="font-size:13px;margin-top:5px;">×${s.multiplier || 2} كوينز و XP على: ${(s.quizzes || []).join(' - ')}</div>
      <div style="font-size:11px;margin-top:8px;">⏳ باقي ${hours} ساعة</div>
    </div>
    <style>@keyframes pulseSeason{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}</style>
  `;
}

window.NFSeasonal = { listenActiveSeason, isQuizInSeason, getSeasonMultiplier, renderSeasonalBanner };