import { db, ref, get, set, currentUser, showToast } from '../firebase-shared.js';

export async function updateGhostLeaderboard(quizKey, score, time) {
  if (!currentUser) return;
  const snap = await get(ref(db, `ghost_leaderboard/${quizKey}`));
  const board = snap.val() || {};
  const myBest = board[currentUser];
  if (!myBest || score > myBest.score || (score === myBest.score && time < myBest.time)) {
    await set(ref(db, `ghost_leaderboard/${quizKey}/${currentUser}`), {
      score, time, date: Date.now()
    });
  }
}

export async function getChampionGhost(quizKey) {
  const snap = await get(ref(db, `ghost_leaderboard/${quizKey}`));
  const board = snap.val() || {};
  const entries = Object.entries(board).sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score;
    return a[1].time - b[1].time;
  });
  if (entries.length === 0) return null;
  return { username: entries[0][0], ...entries[0][1] };
}

export async function renderGhostModeSelector(quizKey, container) {
  const champion = await getChampionGhost(quizKey);
  const snap = await get(ref(db, `ghost_leaderboard/${quizKey}/${currentUser}`));
  const myBest = snap.val();
  
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0;">
      <button class="speedrun-btn" onclick="window._startGhostMode('self','${quizKey}')" 
        style="padding:15px;background:#0088cc;color:#fff;border:none;border-radius:10px;font-family:Cairo;font-weight:bold;cursor:pointer;">
        👻 العب ضد شبحك
        ${myBest ? `<br><small style="font-size:11px;opacity:0.8;">أفضل: ${myBest.score} في ${myBest.time}ث</small>` : ''}
      </button>
      <button class="speedrun-btn" onclick="window._startGhostMode('champion','${quizKey}')"
        style="padding:15px;background:linear-gradient(135deg,#ffd700,#ff8c00);color:#000;border:none;border-radius:10px;font-family:Cairo;font-weight:bold;cursor:pointer;"
        ${champion ? '' : 'disabled'}>
        👑 تحدي البطل
        ${champion ? `<br><small style="font-size:11px;opacity:0.9;">${champion.username} - ${champion.score} نقطة</small>` : '<br><small style="font-size:11px;opacity:0.8;">مفيش بطل بعد</small>'}
      </button>
    </div>
  `;
}

window._startGhostMode = async (mode, quizKey) => {
  let ghostData;
  if (mode === 'self') {
    const snap = await get(ref(db, `ghost_leaderboard/${quizKey}/${currentUser}`));
    ghostData = snap.val();
  } else {
    ghostData = await getChampionGhost(quizKey);
  }
  if (!ghostData) return showToast('مفيش بيانات شبح', 'error');
  localStorage.setItem('ghost_mode_data', JSON.stringify({ mode, ghost: ghostData, quizKey }));
  window.location.href = window.location.pathname + '?ghost=1';
};

window.NFGhostV2 = { updateGhostLeaderboard, getChampionGhost, renderGhostModeSelector };