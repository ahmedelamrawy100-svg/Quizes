/* ═══════════════════════════════════════════════════════════════════
   FEATURE 4: AUTO BADGES (شارات تلقائية)
   Node: unlocked_badges/{userId}/{badgeId} = { unlockedAt }
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

// تعريف البادجات — كل بادج ليه شرط
export const BADGE_DEFINITIONS = [
  { id: 'first_quiz',     icon: '👶', name: 'أول خطوة',   desc: 'أكملت أول كويز',        check: s => s.totalQuizzes >= 1 },
  { id: 'quiz_10',        icon: '🎯', name: 'مبتدئ',      desc: '10 كويزات مكتملة',      check: s => s.totalQuizzes >= 10 },
  { id: 'quiz_50',        icon: '🔥', name: 'محترف',      desc: '50 كويز مكتمل',         check: s => s.totalQuizzes >= 50 },
  { id: 'quiz_100',       icon: '🏆', name: 'أسطورة',     desc: '100 كويز مكتمل',        check: s => s.totalQuizzes >= 100 },
  { id: 'xp_100',         icon: '✨', name: 'مبتدئ XP',   desc: '100 XP',                check: s => s.xp >= 100 },
  { id: 'xp_1000',        icon: '💎', name: 'جامع XP',    desc: '1,000 XP',              check: s => s.xp >= 1000 },
  { id: 'xp_10000',       icon: '👑', name: 'إمبراطور',   desc: '10,000 XP',             check: s => s.xp >= 10000 },
  { id: 'streak_3',       icon: '🔥', name: 'مستمر',      desc: 'ستريك 3 أيام',          check: s => s.streak >= 3 },
  { id: 'streak_7',       icon: '🔥🔥', name: 'أسبوع كامل',desc: 'ستريك 7 أيام',        check: s => s.streak >= 7 },
  { id: 'streak_30',      icon: '🔥🔥🔥', name: 'شهر كامل',desc: 'ستريك 30 يوم',       check: s => s.streak >= 30 },
  { id: 'perfect_score',  icon: '💯', name: 'كامل العدد', desc: 'جاوبت كل الأسئلة صح',  check: s => s.lastScore > 0 && s.lastScore === s.lastTotal },
  { id: 'social_5',       icon: '🦋', name: 'اجتماعي',    desc: 'عندك 5 أصدقاء',        check: s => s.friendsCount >= 5 },
  { id: 'rich_1000',      icon: '💰', name: 'غني',        desc: '1,000 كوينز',           check: s => s.coins >= 1000 },
  { id: 'collector_10',   icon: '🏅', name: 'جامع',       desc: '10 بادجات',             check: s => s.badgesCount >= 10 },
  { id: 'all_rounder',    icon: '🌟', name: 'شامل',       desc: 'لعبت كل الكويزات',     check: s => s.uniqueQuizzes >= 16 },
];

let cache = {};
let statCache = {};

// جلب إحصائيات اللاعب من مختلف الـ nodes
async function loadPlayerStats() {
  const [userSnap, scoresSnap, friendsSnap, badgesSnap] = await Promise.all([
    get(ref(db, `users_data/${CU}`)),
    get(ref(db, 'scores/' + CU)),
    get(ref(db, `friends/${CU}`)),
    get(ref(db, `unlocked_badges/${CU}`))
  ]);

  const userData = userSnap.val() || {};
  const scores = scoresSnap.val() || {};
  const friends = friendsSnap.val() || {};
  const unlocked = badgesSnap.val() || {};

  let totalQuizzes = 0;
  const uniqueQuizSet = new Set();
  let lastScore = 0, lastTotal = 0, lastTime = 0;

  for (const quizKey in scores) {
    let quizBest = 0, quizBestTotal = 0;
    for (const attemptId in scores[quizKey]) {
      const a = scores[quizKey][attemptId];
      if ((a.time || 0) > lastTime) {
        lastTime = a.time || 0;
        lastScore = a.score || 0;
        lastTotal = a.total || 0;
      }
      if ((a.score || 0) > quizBest) { quizBest = a.score || 0; quizBestTotal = a.total || 0; }
    }
    if (quizBest > 0) { totalQuizzes++; uniqueQuizSet.add(quizKey); }
  }

  return {
    totalQuizzes,
    uniqueQuizzes: uniqueQuizSet.size,
    xp: userData.xp || 0,
    coins: userData.coins || 0,
    streak: userData.streak || 0,
    friendsCount: Object.keys(friends).length,
    badgesCount: Object.keys(unlocked).length,
    lastScore, lastTotal
  };
}

// الفحص الرئيسي — يشتغل بعد كل كويز وكل ما اللاعب يدخل الموقع
export async function checkAndUnlockBadges() {
  if (!CU) return [];
  try {
    statCache = await loadPlayerStats();
    const unlockedSnap = await get(ref(db, `unlocked_badges/${CU}`));
    const unlocked = unlockedSnap.val() || {};
    const newBadges = [];

    for (const badge of BADGE_DEFINITIONS) {
      if (unlocked[badge.id]) continue;
      if (badge.check(statCache)) {
        await set(ref(db, `unlocked_badges/${CU}/${badge.id}`), { unlockedAt: Date.now() });
        // كمان ضيفه في badges القديم عشان يظهر في البروفايل
        await set(ref(db, `badges/${CU}/${badge.icon} ${badge.name}`), true);
        newBadges.push(badge);
        showBadgeToast(badge);
      }
    }
    return newBadges;
  } catch (e) {
    console.error('Badge check error:', e);
    return [];
  }
}

function showBadgeToast(badge) {
  const t = document.createElement('div');
  t.className = 'badge-toast';
  t.innerHTML = `<span style="font-size:32px;">${badge.icon}</span><div><div style="font-size:13px;">🎉 بادج جديد!</div><div style="font-size:16px;">${badge.name}</div></div>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.5s'; setTimeout(() => t.remove(), 500); }, 4000);
}

// عرض كل البادجات (المفتوحة والمقفولة)
export async function renderBadgesWall(container) {
  if (!CU) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa;">سجل دخول الأول</p>'; return; }
  const snap = await get(ref(db, `unlocked_badges/${CU}`));
  const unlocked = snap.val() || {};

  container.innerHTML = BADGE_DEFINITIONS.map(b => {
    const isUnlocked = !!unlocked[b.id];
    return `
      <div class="badge-item-new ${isUnlocked ? 'unlocked' : 'locked'}" title="${b.desc}">
        <div class="badge-icon-lg">${isUnlocked ? b.icon : '🔒'}</div>
        <div class="badge-name-lg">${b.name}</div>
        <div class="badge-desc-lg">${b.desc}</div>
      </div>
    `;
  }).join('');
}

// تشغيل تلقائي عند تحميل الصفحة
export function initAutoBadges() {
  if (!CU) return;
  // فحص أول ما الصفحة تفتح (بعد 2 ثانية عشان ميعطلش التحميل)
  setTimeout(() => checkAndUnlockBadges(), 2000);
}

window.NFAutoBadges = { checkAndUnlockBadges, renderBadgesWall, initAutoBadges, BADGE_DEFINITIONS };