/* ═══════════════════════════════════════════════════════════════════
   DAILY & WEEKLY QUESTS SYSTEM v2
   - Daily: 3 random quests, reset daily
   - Weekly: 3 fixed quests, reset Monday
   - Push notifications on complete
   - Difficulty sorting (easy/medium/hard)
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, onValue, currentUser, isLoggedIn, showToast } from '../firebase-shared.js';

// ═══ QUESTS with difficulty ═══
export const DAILY_QUESTS = [
  { id: 'play_3',           type: 'play_count',    target: 3,   icon: '🎮', difficulty: 'easy',   title: 'العب 3 كويزات',            titleEn: 'Play 3 quizzes',          reward: { coins: 50,  xp: 30 } },
  { id: 'unique_quizzes_3', type: 'unique_quizzes',target: 3,   icon: '🎯', difficulty: 'easy',   title: 'العب 3 كويزات مختلفة',      titleEn: 'Play 3 different quizzes', reward: { coins: 90,  xp: 60 } },
  { id: 'speedrun_2',       type: 'speedrun_count',target: 2,   icon: '⚡', difficulty: 'medium', title: 'العب 2 سبيد ران',           titleEn: 'Play 2 speedruns',        reward: { coins: 100, xp: 70 } },
  { id: 'play_5',           type: 'play_count',    target: 5,   icon: '🎮', difficulty: 'medium', title: 'العب 5 كويزات',            titleEn: 'Play 5 quizzes',          reward: { coins: 100, xp: 60 } },
  { id: 'coins_earned_100', type: 'coins_earned',  target: 100, icon: '🪙', difficulty: 'medium', title: 'اكسب 100 كوين من اللعب',   titleEn: 'Earn 100 coins',          reward: { coins: 50,  xp: 40 } },
  { id: 'fast_answers_10',  type: 'fast_answers',  target: 10,  icon: '💨', difficulty: 'medium', title: 'جاوب 10 إجابات سريعة',      titleEn: '10 fast answers',         reward: { coins: 100, xp: 60 } },
  { id: 'correct_20',       type: 'correct_count', target: 20,  icon: '✅', difficulty: 'medium', title: 'جاوب 20 صح',               titleEn: 'Get 20 correct',          reward: { coins: 80,  xp: 50 } },
  { id: 'perfect_1',        type: 'perfect_quiz',  target: 1,   icon: '💯', difficulty: 'hard',   title: 'كويز كامل بدون غلط',         titleEn: 'Get a perfect quiz',      reward: { coins: 120, xp: 80 } },
  { id: 'challenge_win_1',  type: 'challenge_win', target: 1,   icon: '⚔️', difficulty: 'hard',   title: 'اكسب تحدي صديق',            titleEn: 'Win a friend challenge',  reward: { coins: 150, xp: 100 } },
  { id: 'correct_50',       type: 'correct_count', target: 50,  icon: '✅', difficulty: 'hard',   title: 'جاوب 50 صح',               titleEn: 'Get 50 correct',          reward: { coins: 150, xp: 100 } },
];

export const WEEKLY_QUESTS = [
  { id: 'w_perfect_3',   type: 'perfect_quiz',  target: 3,   icon: '💎', difficulty: 'easy',   title: '3 كويزات كاملة',   titleEn: '3 perfect quizzes',  reward: { coins: 400, xp: 250 } },
  { id: 'w_play_20',     type: 'play_count',    target: 20,  icon: '🏆', difficulty: 'medium', title: 'العب 20 كويز',     titleEn: 'Play 20 quizzes',    reward: { coins: 500, xp: 300 } },
  { id: 'w_correct_200', type: 'correct_count', target: 200, icon: '🌟', difficulty: 'hard',   title: 'جاوب 200 صح',       titleEn: 'Get 200 correct',    reward: { coins: 600, xp: 400 } },
];

const DIFFICULTY_ORDER = { easy: 1, medium: 2, hard: 3 };

// ═══ HELPERS ═══
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getWeekKey() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + 1);
  const yearStart = new Date(Date.UTC(monday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((monday - yearStart) / 86400000) + 1) / 7);
  return `${monday.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function emptyStats() {
  return { play_count: 0, correct_count: 0, perfect_quiz: 0, speedrun_count: 0, unique_quizzes: [], coins_earned: 0, fast_answers: 0, challenge_win: 0 };
}
export function sortQuestsByDifficulty(questsObj) {
  const all = Object.entries(questsObj).map(([id, q]) => {
    const def = [...DAILY_QUESTS, ...WEEKLY_QUESTS].find(d => d.id === id);
    return { id, ...q, difficulty: def?.difficulty || 'medium' };
  });
  return all.sort((a, b) => (DIFFICULTY_ORDER[a.difficulty] || 2) - (DIFFICULTY_ORDER[b.difficulty] || 2));
}

// ═══ PUSH NOTIFICATION ═══
function notifyQuestComplete(questDef) {
  showToast(`🎯 مهمة مكتملة: ${questDef.title}!`, 'gold');
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('🎯 مهمة مكتملة!', {
        body: `كمّلت: ${questDef.title} — استلم جايزتك الآن!`,
        icon: '/pic/Logo.png',
        badge: '/pic/Logo.png',
        tag: 'quest_' + questDef.id
      });
    } catch (e) { console.warn('Browser notif failed:', e); }
  }
}

// ═══ DAILY ═══
export async function getTodayQuests() {
  if (!isLoggedIn()) return { error: 'login' };
  const todayKey = getTodayKey();
  const snap = await get(ref(db, `daily_quests/${currentUser}`));
  const data = snap.val() || {};

  if (data.date === todayKey && data.quests) {
    return { quests: data.quests, streak: data.streak || 0, date: todayKey };
  }

  const picked = shuffle(DAILY_QUESTS).slice(0, 3);
  const quests = {};
  picked.forEach(q => { quests[q.id] = { progress: 0, target: q.target, claimed: false }; });

  let newStreak = data.streak || 0;
  const lastDay = data.lastCompletedDay;
  if (lastDay) {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (lastDay !== yKey && lastDay !== todayKey) newStreak = 0;
  }

  await update(ref(db, `daily_quests/${currentUser}`), { date: todayKey, quests, streak: newStreak, generatedAt: Date.now() });
  await set(ref(db, `daily_quests_stats/${currentUser}/${todayKey}`), emptyStats());
  return { quests, streak: newStreak, date: todayKey, fresh: true };
}

// ═══ WEEKLY ═══
export async function getThisWeekQuests() {
  if (!isLoggedIn()) return { error: 'login' };
  const weekKey = getWeekKey();
  const snap = await get(ref(db, `weekly_quests/${currentUser}`));
  const data = snap.val() || {};

  if (data.weekKey === weekKey && data.quests) {
    return { quests: data.quests, weekKey };
  }

  const quests = {};
  WEEKLY_QUESTS.forEach(q => { quests[q.id] = { progress: 0, target: q.target, claimed: false }; });
  await update(ref(db, `weekly_quests/${currentUser}`), { weekKey, quests, generatedAt: Date.now() });
  await set(ref(db, `weekly_quests_stats/${currentUser}/${weekKey}`), emptyStats());
  return { quests, weekKey, fresh: true };
}

// ═══ TRACK (daily + weekly together) ═══
export async function trackProgress(type, amount = 1, meta = {}) {
  if (!isLoggedIn()) return;
  const todayKey = getTodayKey();
  const weekKey = getWeekKey();

  const dailyStatRef = ref(db, `daily_quests_stats/${currentUser}/${todayKey}`);
  const dailyStats = (await get(dailyStatRef)).val() || emptyStats();
  applyStat(dailyStats, type, amount, meta);
  await set(dailyStatRef, dailyStats);

  const weeklyStatRef = ref(db, `weekly_quests_stats/${currentUser}/${weekKey}`);
  const weeklyStats = (await get(weeklyStatRef)).val() || emptyStats();
  applyStat(weeklyStats, type, amount, meta);
  await set(weeklyStatRef, weeklyStats);

  await updateQuestProgress('daily_quests', dailyStats, type, amount);
  await updateQuestProgress('weekly_quests', weeklyStats, type, amount);
}

function applyStat(stats, type, amount, meta) {
  if (type === 'play_count')          stats.play_count    = (stats.play_count    || 0) + amount;
  else if (type === 'correct_count')  stats.correct_count = (stats.correct_count || 0) + amount;
  else if (type === 'perfect_quiz')   stats.perfect_quiz  = (stats.perfect_quiz  || 0) + amount;
  else if (type === 'speedrun_count') stats.speedrun_count= (stats.speedrun_count|| 0) + amount;
  else if (type === 'coins_earned')   stats.coins_earned  = (stats.coins_earned  || 0) + amount;
  else if (type === 'fast_answers')   stats.fast_answers  = (stats.fast_answers  || 0) + amount;
  else if (type === 'challenge_win')  stats.challenge_win = (stats.challenge_win || 0) + amount;
  else if (type === 'unique_quizzes' && meta.quizKey) {
    const uniq = new Set(stats.unique_quizzes || []);
    uniq.add(meta.quizKey);
    stats.unique_quizzes = [...uniq];
  }
}

async function updateQuestProgress(node, stats, type, amount) {
  const snap = await get(ref(db, `${node}/${currentUser}`));
  const data = snap.val() || {};
  if (!data.quests) return;

  const allDefs = [...DAILY_QUESTS, ...WEEKLY_QUESTS];
  const updates = {};
  Object.entries(data.quests).forEach(([questId, q]) => {
    if (q.claimed) return;
    const def = allDefs.find(d => d.id === questId);
    if (!def || def.type !== type) return;

    let newProgress = type === 'unique_quizzes'
      ? Math.min(q.target, (stats.unique_quizzes || []).length)
      : Math.min(q.target, q.progress + amount);

    if (newProgress !== q.progress) {
      updates[`${node}/${currentUser}/quests/${questId}/progress`] = newProgress;
      if (newProgress >= q.target) notifyQuestComplete(def);
    }
  });
  if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

// ═══ CLAIM ═══
async function claimReward(node, questId, defs) {
  if (!isLoggedIn()) return { error: 'login' };
  const snap = await get(ref(db, `${node}/${currentUser}/quests/${questId}`));
  if (!snap.exists()) return { error: 'not_found' };
  const q = snap.val();
  if (q.claimed) return { error: 'already_claimed' };
  if (q.progress < q.target) return { error: 'not_complete' };

  const def = defs.find(d => d.id === questId);
  if (!def) return { error: 'no_def' };

  const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
  const xpSnap = await get(ref(db, `users_data/${currentUser}/xp`));
  await update(ref(db, `users_data/${currentUser}`), {
    coins: (coinsSnap.val() || 0) + def.reward.coins,
    xp: (xpSnap.val() || 0) + def.reward.xp
  });
  await update(ref(db, `${node}/${currentUser}/quests/${questId}`), { claimed: true, claimedAt: Date.now() });

  if (node === 'daily_quests') await checkDailyStreak();
  return { success: true, reward: def.reward };
}

export async function claimQuestReward(questId) { return claimReward('daily_quests', questId, DAILY_QUESTS); }
export async function claimWeeklyReward(questId) { return claimReward('weekly_quests', questId, WEEKLY_QUESTS); }

async function checkDailyStreak() {
  const snap = await get(ref(db, `daily_quests/${currentUser}`));
  const data = snap.val() || {};
  const quests = data.quests || {};
  const allDone = Object.keys(quests).length > 0 && Object.values(quests).every(q => q.claimed);

  if (allDone && data.lastCompletedDay !== data.date) {
    const newStreak = (data.streak || 0) + 1;
    const bonusCoins = 50 + newStreak * 20;
    const bonusXP = 30 + newStreak * 10;
    const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
    const xpSnap = await get(ref(db, `users_data/${currentUser}/xp`));
    await update(ref(db, `users_data/${currentUser}`), {
      coins: (coinsSnap.val() || 0) + bonusCoins,
      xp: (xpSnap.val() || 0) + bonusXP
    });
    await update(ref(db, `daily_quests/${currentUser}`), { streak: newStreak, lastCompletedDay: data.date });
    showToast(`🔥 ستريك ${newStreak} أيام! +${bonusCoins}🪙 +${bonusXP}XP`, 'gold');
  }
}

// ═══ LISTENERS ═══
export function listenQuests(cb) {
  if (!isLoggedIn()) return () => {};
  return onValue(ref(db, `daily_quests/${currentUser}`), s => cb(s.val() || {}));
}
export function listenWeeklyQuests(cb) {
  if (!isLoggedIn()) return () => {};
  return onValue(ref(db, `weekly_quests/${currentUser}`), s => cb(s.val() || {}));
}

// ═══ TIMERS ═══
export function getTimeUntilReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow - now;
}
export function getTimeUntilWeekReset() {
  const now = new Date();
  const day = now.getDay() || 7;
  const daysUntilMonday = (8 - day) % 7 || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(0, 0, 0, 0);
  return monday - now;
}

window.NFDailyQuests = {
  getTodayQuests, getThisWeekQuests,
  trackProgress,
  claimQuestReward, claimWeeklyReward,
  listenQuests, listenWeeklyQuests,
  getTimeUntilReset, getTimeUntilWeekReset,
  sortQuestsByDifficulty, DIFFICULTY_ORDER,
  DAILY_QUESTS, WEEKLY_QUESTS
};
console.log('✅ Daily + Weekly Quests v2 loaded');