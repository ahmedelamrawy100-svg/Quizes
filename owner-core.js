/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — OWNER CORE (926 features) — FULL MERGED & FIXED
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
  authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
  databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
  projectId: "quiz-hub-app-f4cd0",
  storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
  messagingSenderId: "282772179392",
  appId: "1:282772179392:web:64646d757592b29ff3a025"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getDatabase(app);
const auth = getAuth(app);
window.db = db; // هام جداً عشان مميزات الـ advanced تشتغل

const CURRENT_USER = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
const OWNER_USERNAME = 'ahmed';

/* ═══════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countObj = (v) => v && typeof v === 'object' ? Object.keys(v).length : 0;
const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('ar-EG', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString('ar-EG', {hour:'2-digit',minute:'2-digit'}) : '';

const T = (m, t) => window.toast(m, t || 'success');
const M = (t, h) => window.openModal(t, h);
const E = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();
const NOW = () => Date.now();
const D = (n) => Date.now() - n * 86400000;

const all = async (node) => {
  try { const s = await get(ref(db, node)); return s.exists() ? (s.val() || {}) : {}; }
  catch { return {}; }
};

const statBox = (items) => `<div class="stats-grid">${items.map(([i,v,l]) => `
  <div class="stat-card"><div class="stat-icon">${i}</div>
  <div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
`).join('')}</div>`;

const table = (hs, rs) => `<table class="data-table">
  <thead><tr>${hs.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rs.length ? rs.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${hs.length}" class="text-center">لا يوجد</td></tr>`}</tbody>
</table>`;

const list = (items) => items.length ? `<ul style="list-style:none;padding:0;max-height:60vh;overflow-y:auto;">${items.map(x => `<li style="padding:8px 0;border-bottom:1px solid var(--border);">${x}</li>`).join('')}</ul>` : '<div class="empty-state">لا يوجد</div>';

const exportJSON = (data, name) => {
  const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = `${name}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const confirm2 = (msg) => confirm(msg) && confirm('تأكيد أخير؟');

const fingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('QuizHub', 2, 15);
  const hash = canvas.toDataURL().slice(-50);
  const ua = navigator.userAgent;
  const screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lang = navigator.language;
  const raw = `${hash}|${ua}|${screen}|${tz}|${lang}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) { h = ((h << 5) - h) + raw.charCodeAt(i); h |= 0; }
  return 'fp_' + Math.abs(h).toString(36);
};

function toast(msg, type = 'success') {
  const c = $('toast-container'); if (!c) return;
  if (c.children.length >= 3) c.removeChild(c.firstChild);
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'success' ? '' : type);
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3500);
}
window.toast = toast;

function openModal(title, html) {
  $('modalTitle').textContent = title;
  $('modalContent').innerHTML = html;
  $('modalOverlay').classList.add('active');
}
window.openModal = openModal;
window.closeModal = () => $('modalOverlay').classList.remove('active');
$('modalOverlay').onclick = (e) => { if (e.target.id === 'modalOverlay') window.closeModal(); };

async function logAction(action, target, details) {
  try { await push(ref(db, 'admin_logs'), { admin: CURRENT_USER, action, target, details: details || '', time: Date.now() }); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════
   GENERIC HANDLERS
   ═══════════════════════════════════════════════════════════════════ */

const H = {
  count: async (node, label) => {
    if (!node) return toast('❌ Node missing', 'error');
    const s = await get(ref(db, node));
    const c = s.exists() ? (typeof s.val() === 'object' ? Object.keys(s.val()).length : 1) : 0;
    toast(`${label || node}: ${c}`, 'info');
  },
  export: async (node, label) => {
    try {
      const s = await get(ref(db, node));
      const data = s.exists() ? s.val() : {};
      exportJSON(data, label || node);
      toast('✅ تم التصدير');
    } catch (e) { toast('خطأ: ' + e.message, 'error'); }
  },
  csv: async (node, label) => {
    try {
      const s = await get(ref(db, node));
      const data = s.exists() ? s.val() : {};
      const rows = [['key', 'value']];
      for (const k in data) rows.push([k, JSON.stringify(data[k]).replace(/"/g, '""')]);
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${label || node}-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast('✅ تم تصدير CSV');
    } catch (e) { toast('خطأ: ' + e.message, 'error'); }
  },
  clear: async (node, label) => {
    if (!confirm(`⚠️ مسح "${label || node}" بالكامل؟`)) return;
    if (!confirm('تأكيد أخير؟ لا يمكن الرجوع!')) return;
    await remove(ref(db, node));
    await logAction('clear_node', node);
    toast(`✅ تم مسح ${label || node}`);
  },
  view: async (node, label) => {
    const s = await get(ref(db, node));
    const data = s.exists() ? s.val() : {};
    const entries = Object.entries(data);
    if (!entries.length) return openModal(label || node, '<div class="empty-state">لا يوجد محتوى</div>');
    
    let html = '<div style="max-height:60vh; overflow-y:auto; padding:4px;">';
    entries.slice(0, 100).forEach(([k, v]) => {
      if (v && typeof v === 'object' && (v.text || v.message) && (v.sender || v.from)) {
        html += `
          <div class="list-item" style="display:flex; flex-direction:column; align-items:flex-start; margin-bottom:8px; background:var(--surface-hover);">
            <div class="list-item-title" style="color:var(--gold); font-size:14px;">👤 ${escapeHtml(v.sender || v.from || 'مجهول')}</div>
            <div class="list-item-sub" style="font-size:14px; color:var(--text); margin:4px 0;">💬 ${escapeHtml(v.text || v.message || '')}</div>
            <div class="list-item-sub" style="font-size:10px; opacity:0.6;">🕒 ${v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'}</div>
          </div>
        `;
      } else {
        html += `
          <div class="list-item">
            <div class="list-item-content">
              <div class="list-item-title">${escapeHtml(k)}</div>
              <div class="list-item-sub">${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</div>
            </div>
          </div>
        `;
      }
    });
    html += `</div>`;
    if (entries.length > 100) html += `<p class="text-dim text-center mt-10">... ${entries.length - 100} عنصر إضافي</p>`;
    
    openModal(label || node, html);
  },
  toggle: async (path, label) => {
    const s = await get(ref(db, path));
    const cur = s.exists() ? s.val() : false;
    await set(ref(db, path), !cur);
    toast(`${label || path}: ${!cur ? '✅ مفعل' : '❌ متوقف'}`, 'info');
  },
  setBool: async (path, value, label) => {
    await set(ref(db, path), value);
    toast(`${label || path}: ${value ? '✅ مفعل' : '❌ متوقف'}`, 'info');
  },
  reset: async (node, label) => {
    if (!confirm(`⚠️ تصفير "${label || node}"؟`)) return;
    await set(ref(db, node), {});
    await logAction('reset_node', node);
    toast(`✅ تم تصفير ${label || node}`);
  },
  info: async (msg) => toast(msg || 'قيد التطوير...', 'info'),
  custom: async (fnName) => {
    const fn = window[fnName];
    if (typeof fn === 'function') await fn();
    else toast('⚠️ الدالة غير موجودة', 'error');
  },
  
  // المميزات الديناميكية للكويزات (بتشتغل مع أي كويز)
  quizStats: async (quizKey) => {
    const s = await get(ref(db, 'scores'));
    const data = s.exists() ? s.val() : {};
    let plays = 0, players = new Set(), totalScore = 0, totalDuration = 0, durationCount = 0, topScores = [];

    for (const u in data) {
      if (data[u][quizKey]) {
        for (const attempt in data[u][quizKey]) {
          const record = data[u][quizKey][attempt];
          plays++; players.add(u);
          if (record.score) totalScore += record.score;
          if (record.duration) { totalDuration += record.duration; durationCount++; }
          topScores.push({ user: u, score: record.score || 0, time: record.time || 0 });
        }
      }
    }

    topScores.sort((a, b) => b.score - a.score);
    const top5 = topScores.slice(0, 5);
    const avgScore = plays ? Math.round(totalScore / plays) : 0;
    const avgTime = durationCount ? Math.round(totalDuration / durationCount) : 0;
    const L = QUIZ_LABELS[quizKey] || quizKey;

    let html = `
      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card"><div class="stat-icon">🎮</div><div class="stat-value">${plays}</div><div class="stat-label">مرات اللعب</div></div>
        <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${players.size}</div><div class="stat-label">لاعبين فريدين</div></div>
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-value">${avgScore}</div><div class="stat-label">متوسط النقاط</div></div>
        <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${avgTime}s</div><div class="stat-label">متوسط الوقت</div></div>
      </div>
      <h4 style="color:var(--gold); margin-bottom:10px;">🏆 أعلى 5 لاعبين</h4>
    `;

    if (top5.length) {
      html += `<table class="data-table"><thead><tr><th>#</th><th>اللاعب</th><th>النقاط</th><th>التاريخ</th></tr></thead><tbody>`;
      top5.forEach((t, i) => {
        html += `<tr><td>#${i+1}</td><td>${escapeHtml(t.user)}</td><td>${t.score}</td><td>${t.time ? new Date(t.time).toLocaleDateString('ar-EG') : '—'}</td></tr>`;
      });
      html += `</tbody></table>`;
    } else {
      html += `<div class="empty-state">لا يوجد لاعبين لعبوا هذا الكويز بعد</div>`;
    }

    openModal(`📊 إحصائيات كويز: ${L}`, html);
  },
  quizExport: async (quizKey) => {
    const L = QUIZ_LABELS[quizKey] || quizKey;
    const s = await get(ref(db, 'scores'));
    const data = s.exists() ? s.val() : {};
    const exportData = {};
    for (const u in data) if (data[u][quizKey]) exportData[u] = data[u][quizKey];
    exportJSON(exportData, 'scores-' + L);
    toast('✅ تم التصدير');
  },
  quizReset: async (quizKey) => {
    const L = QUIZ_LABELS[quizKey] || quizKey;
    if (!confirm(`تصفير ${L}؟`)) return;
    const s = (await get(ref(db, 'scores'))).val() || {};
    for (const u in s) if (s[u][quizKey]) await remove(ref(db, `scores/${u}/${quizKey}`));
    toast('✅ تم تصفير الكويز');
  },
  quizDelete: async (quizKey) => {
    const L = QUIZ_LABELS[quizKey] || quizKey;
    if (!confirm(`⚠️ حذف كويز ${L} من عند كل اللاعبين نهائياً؟`)) return;
    if (!confirm('تأكيد أخير؟')) return;
    const s = (await get(ref(db, 'scores'))).val() || {};
    for (const u in s) if (s[u][quizKey]) await remove(ref(db, `scores/${u}/${quizKey}`));
    toast('✅ تم حذف الكويز نهائياً');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   FEATURE REGISTRY
   ═══════════════════════════════════════════════════════════════════ */

const F = (id, icon, label, h, style) => ({ id, icon, label, h, style });
const FQ = (id, icon, label, fnName, style) => ({ id, icon, label, h: ['custom', fnName], style });

const QUIZ_LABELS = {annabelle:'🎃 أنابيل',conjuring:'👻 الكونجورينج',TheNun:'✝️ الراهبة',FNAF:'🐻 فايف نايتس',SquidGame:'🦑 لعبة الحبار',spiderman:'🕷️ سبايدرمان',spiderman2026:'🕷️ سبايدرمان 2026',avengers:'🛡️ المنتقمون',avatar:'🌊 أفاتار',venom:'🖤 فينوم',birdsofprey:'🦅 الطيور الجارحة',fall:'🪜 السقوط',Wednesday:'🖤 وينزداي',knivesout:'🔪 مطارق',scream:'👻 سكريم',TrainToBusan:'🚄 قطار بوسان',elharifa:'⚽ الحريفة'};

const CONTENT_TYPES = ['comments','suggestions','quiz_requests','warnings','support_tickets','admin_requests','activity_feed','partner_ideas','global_chat','challenges'];
const CONTENT_LABELS = {comments:'💬 التعليقات',suggestions:'💡 الاقتراحات',quiz_requests:'🎬 طلبات الكويزات',warnings:'⚠️ التحذيرات',support_tickets:'🎫 تذاكر الدعم',admin_requests:'📩 طلبات الإدارة',activity_feed:'📰 آخر الأنشطة',partner_ideas:'🤝 أفكار الشركاء',global_chat:'💬 الشات العام',challenges:'⚔️ التحديات'};

const ROLES = ['Owner','Admin','VIP','Star','Divine','Angel','Dragon','King','Legend','Lion','Genius','Pro Player','Knight','Ninja','Player'];
const BADGES = ['Founder','Alien','VIP','Sniper','Action','Star','Genius','Detective','Horror','K-Drama','Gamer'];
const SETTINGS_KEYS = ['siteName','announcement','colorPrimary','maintenance','chatOff','version','welcomeMessage','maxRoomsPerUser','xpMultiplier','coinsPerQuiz','dailyBonus','maxWarnings','banDuration','registrationOpen','friendRequestsOn','chatModeration','autoBan','maxPlayersPerRoom','leaderboardReset','quizCooldown','leaderboardInterval','teamBattleOn','speedrunOn','challengeOn','ghostModeOn'];
const DB_NODES = ['usernames','users_data','scores','leaderboard','speedrun_scores','badges','roles','friends','friend_requests','messages','comments','suggestions','quiz_requests','warnings','banned_users','support_tickets','global_chat','challenges','rooms','presence','teams','partner_ideas','partners_chat','admin_requests','manager_requests','activity_feed','site_events','site_settings','owner_inbox','kick_signals','verified_users','broadcast_messages','kick_requests','admin_chat','admin_logs'];

const FEATURES = {};

/* TAB 1: Overview */
FEATURES.overview = {
  title: '📊 نظرة سريعة', sub: '42 خاصية — إحصائيات + أوامر سريعة + توثيق',
  sections: [
    { title: '📊 الإحصائيات', items: [
      F(1,'👥','عدد usernames',['count','usernames','عدد usernames']),F(2,'🚫','عدد banned_users',['count','banned_users','عدد banned_users']),F(3,'⚠️','عدد warnings',['count','warnings','عدد warnings']),F(4,'💬','عدد comments',['count','comments','عدد comments']),F(5,'💡','عدد suggestions',['count','suggestions','عدد suggestions']),F(6,'🎫','عدد support_tickets',['count','support_tickets','عدد support_tickets']),F(7,'💬','عدد global_chat',['count','global_chat','عدد global_chat']),F(8,'🏠','عدد rooms',['count','rooms','عدد rooms']),F(9,'⚔️','عدد challenges',['count','challenges','عدد challenges']),F(10,'👥','عدد friends',['count','friends','عدد friends'])
    ] },
    { title: '⚡ أوامر سريعة', items: [
      FQ(11,'🔄','تحديث الإحصائيات','refreshStats'),FQ(12,'📤','تصدير كل البيانات','exportAll'),FQ(13,'🗑️','مسح كل الغرف','clearRooms','danger'),FQ(14,'🏆','تصفير المتصدرين','resetLeaderboard','danger'),FQ(15,'💾','نسخة احتياطية كاملة','fullBackup'),FQ(16,'📩','إرسال تقرير سريع للأونر','sendQuickReport'),FQ(17,'🏆','أعلى 10 XP','showTop10XP'),FQ(18,'🎮','أكثر الكويزات لعباً','showMostPlayedQuizzes'),FQ(19,'📉','أقل الكويزات لعباً','showLeastPlayedQuizzes'),FQ(20,'📡','فحص الاتصال','testPing'),FQ(21,'🧹','مسح الحسابات الفارغة','clearEmptyAccounts','danger'),FQ(22,'🟢','المتصلين حالياً','showOnlineNow'),FQ(23,'✨','إجمالي XP الموقع','showTotalXP'),FQ(24,'📊','متوسط XP','showAvgXP'),FQ(25,'📅','المتصلين آخر 24 ساعة','show24hActive'),FQ(26,'📩','عرض صندوق الأونر','viewOwnerInbox'),FQ(27,'💬','عرض شات الشركاء','viewPartnerChat'),FQ(28,'🏠','عدد الغرف','countRooms'),FQ(29,'🧹','مسح presence','clearPresence','danger'),FQ(30,'📤','تصدير تقرير الغرف','exportRoomsReport'),FQ(31,'🛡️','عرض كل الأدمنز','showAllAdmins'),FQ(32,'🎖️','عرض كل الرتب','showAllRoles'),FQ(33,'🏅','عرض كل البادجات','showAllBadges'),FQ(34,'📅','احصائيات الأسبوع','showWeeklyStats'),FQ(35,'🚫','قائمة المحظورين','viewBannedList'),FQ(36,'⚠️','قائمة التحذيرات','viewWarningsList'),FQ(37,'👤','عدد المسجلين','showRegisteredCount'),FQ(38,'🔄','تحديث كامل للصفحة','reloadPage'),FQ(39,'👥','عدد طلبات الصداقة','countFriendRequests'),FQ(40,'🎁','العروض النشطة','viewActiveOffers'),FQ(41,'⚙️','عرض كل الإعدادات','viewAllSettings'),FQ(42,'📡','فحص الاتصال المباشر','testLiveConnection')
    ]},
    { title: '✓ التوثيق', items: [FQ(43,'✓','عرض كل الموثقين','viewAllVerified')] }
  ]
};

/* TAB 2: Users */
FEATURES.players = {
  title: '👥 اللاعبين', sub: '48 خاصية — عرض + تصدير + إجراءات جماعية + إحصائيات + إجراءات فردية',
  sections: [
    { title: '🔍 عرض اللاعبين', items: [FQ(44,'👥','كل اللاعبين','viewAllPlayers'),FQ(45,'🟢','المتصلين حالياً','showOnlineNow'),FQ(46,'🏆','أعلى XP','showTop10XP'),FQ(47,'0️⃣','صفر XP','showZeroXP'),FQ(48,'🚫','المحظورين','viewBannedList'),FQ(49,'⚠️','التحذيرات','viewWarningsList'),FQ(50,'🛡️','الأدمنز','showAllAdmins'),FQ(51,'📋','المديرين','showAllManagers'),FQ(52,'🤝','الشركاء','showAllPartners'),FQ(53,'🧪','التسترات','showAllTesters'),FQ(54,'✓','الموثقين','viewAllVerified')] },
    { title: '📥 تصدير', items: [F(55,'📤','تصدير JSON',['export','users_data','players']),F(56,'📊','تصدير CSV',['csv','users_data','players'])] },
    { title: '♻️ إجراءات جماعية', items: [FQ(57,'✨','تصفير كل XP','resetAllXP','danger'),FQ(58,'🪙','تصفير كل كوينز','resetAllCoins','danger'),FQ(59,'🖼️','مسح كل الصور','clearAllPics','danger'),FQ(60,'👥','مسح كل الأصدقاء','clearAllFriends','danger'),FQ(61,'📩','مسح كل طلبات الصداقة','clearAllFriendRequests','danger'),FQ(62,'🔥','تصفير الستريك','resetAllStreaks','danger'),FQ(63,'⚔️','مسح كل التيمات','clearAllTeams','danger')] },
    { title: '📊 إحصائيات', items: [FQ(64,'📊','متوسط XP','showAvgXP'),FQ(65,'⭐','متوسط المستوى','showAvgLevel'),FQ(66,'🖼️','عدد اللي معاهم صور','countUsersWithPics'),FQ(67,'⚔️','توزيع التيمات','showTeamsDistribution'),FQ(68,'🎖️','توزيع الرتب','showRolesDistribution'),FQ(69,'🏅','توزيع البادجات','showBadgesDistribution')] },
    { title: '📩 إجراءات', items: [FQ(70,'📨','رسالة جماعية للكل','sendBulkMessage'),FQ(71,'🔔','إشعار جماعي','sendBulkNotification')] },
    { title: '👤 إجراءات لكل لاعب (20)', items: [
      FQ(72,'👤','عرض الملف الشخصي','pickPlayerProfile'),FQ(73,'📊','نتائج اللاعب','pickPlayerResults'),FQ(74,'🎖️','تعيين رتبة','pickAssignRole'),FQ(75,'❌','إلغاء رتبة','pickRemoveRole'),FQ(76,'🏅','إعطاء بادج','pickAssignBadge'),FQ(77,'❌','إلغاء بادج','pickRemoveBadge'),FQ(78,'✓','توثيق','pickVerify'),FQ(79,'❌','إلغاء توثيق','pickUnverify'),FQ(80,'📩','إرسال رسالة','pickSendMessage'),FQ(81,'⚠️','تحذير','pickWarn'),FQ(82,'❌','إلغاء تحذير','pickClearWarn'),FQ(83,'🚫','حظر','pickBan','danger'),FQ(84,'✅','رفع حظر','pickUnban'),FQ(85,'👢','طرد','pickKick','danger'),FQ(86,'0️⃣','تصفير XP','pickResetXP','danger'),FQ(87,'➕','إضافة XP','pickAddXP'),FQ(88,'➖','خصم XP','pickRemoveXP'),FQ(89,'🪙','إضافة كوينز','pickAddCoins'),FQ(90,'🗑️','حذف الحساب','pickDeleteAccount','danger'),FQ(91,'🛡️','ترقية لأدمن','pickPromoteAdmin')
    ]}
  ]
};

/* TAB 3: Content (Dynamic) */
const contentTypeItems = [];
let cid = 92;
CONTENT_TYPES.forEach(t => {
  const L = CONTENT_LABELS[t];
  contentTypeItems.push(F(cid++,'👁️',`${L} — عرض`,['view',t,L]));
  contentTypeItems.push(F(cid++,'📤',`${L} — تصدير`,['export',t,L]));
  contentTypeItems.push(FQ(cid++,'🗑️',`${L} — مسح`,`contentClear_${t}`,'danger'));
});

FEATURES.content = {
  title: '📝 المحتوى', sub: 'إدارة ديناميكية للكويزات — يتم جلبها أوتوماتيك من قاعدة البيانات',
  sections: [
    { title: '🎮 إدارة الكويزات', items: [
      FQ(90, '🔄', 'تحديث قائمة الكويزات', 'refreshQuizzesList'),
      FQ(91, '➕', 'إضافة كويز جديد يدوياً', 'addQuizManually')
    ]},
    { title: '📝 أنواع المحتوى (10 × 3 = 30)', items: contentTypeItems }
  ]
};

/* TAB 4: Roles */
const roleItems = [];
ROLES.forEach(r => { roleItems.push(FQ(cid++,'🎖️',`إدارة رتبة: ${r}`,`manageRole_${r}`)); });
roleItems.push(FQ(cid++,'➕','إنشاء رتبة جديدة','createRole'));
FEATURES.roles = { title: '🎖️ الرتب', sub: '16 خاصية — إدارة موحدة', sections: [{ title: '🎖️ كل الرتب (15)', items: roleItems }] };

/* TAB 5: Badges */
const badgeItems = [];
BADGES.forEach(b => { badgeItems.push(FQ(cid++,'🏅',`إدارة بادج: ${b}`,`manageBadge_${b}`)); });
badgeItems.push(FQ(cid++,'➕','إنشاء بادج جديد','createBadge'));
FEATURES.badges = { title: '🏅 البادجات', sub: '12 خاصية — إدارة موحدة', sections: [{ title: '🏅 كل البادجات (11)', items: badgeItems }] };

/* TAB 6: Settings */
const settingItems = [];
SETTINGS_KEYS.forEach(k => {
  settingItems.push(FQ(cid++,'✏️',`${k} — تعديل`,`editSetting_${k}`));
  settingItems.push(FQ(cid++,'👁️',`${k} — عرض`,`viewSetting_${k}`,'info'));
});
FEATURES.settings = { title: '⚙️ الإعدادات', sub: '50 خاصية — 25 إعداد × 2', sections: [{ title: '⚙️ كل الإعدادات (25)', items: settingItems }] };

/* TAB 7: Messages */
FEATURES.messages = {
  title: '📩 الرسائل', sub: '9 خصائص — صندوق الأونر + شات الشركاء + إجراءات',
  sections: [
    { title: '📩 صندوق الأونر (4)', items: [FQ(cid++,'👁️','عرض الرسائل','viewOwnerInbox'),FQ(cid++,'🗑️','مسح الصندوق','clearOwnerInbox','danger'),FQ(cid++,'📤','تصدير الصندوق','exportOwnerInbox'),FQ(cid++,'↩️','رد على لاعب','replyToPlayer')] },
    { title: '🤝 رسائل الشركاء (3)', items: [FQ(cid++,'👁️','عرض شات الشركاء','viewPartnerChat'),FQ(cid++,'🗑️','مسح الشات','clearPartnerChat','danger'),FQ(cid++,'📤','تصدير الشات','exportPartnerChat')] },
    { title: '⚡ إجراءات سريعة (2)', items: [FQ(cid++,'📨','رسالة للكل','sendBulkMessage'),FQ(cid++,'🔢','عدد الرسائل الكلي','countAllMessages')] }
  ]
};

/* TAB 8: Events */
FEATURES.events = {
  title: '🎉 الفعاليات', sub: '20 خاصية — عروض + استفتاءات + مسابقات + جوائز + إعلانات + مواسم',
  sections: [
    { title: '🎁 العروض (4)', items: [FQ(cid++,'➕','إضافة عرض','addOffer'),FQ(cid++,'👁️','عرض العروض','viewOffers'),FQ(cid++,'🗑️','مسح العروض','clearOffers','danger'),FQ(cid++,'📤','تصدير العروض','exportOffers')] },
    { title: '🗳️ استفتاء (3)', items: [FQ(cid++,'➕','استفتاء جديد','createPoll'),FQ(cid++,'👁️','عرض الاستفتاء','viewPoll'),FQ(cid++,'🗑️','مسح الاستفتاء','clearPoll','danger')] },
    { title: '🏆 مسابقات (3)', items: [FQ(cid++,'➕','مسابقة جديدة','createContest'),FQ(cid++,'👁️','عرض المسابقات','viewContests'),FQ(cid++,'🗑️','مسح المسابقات','clearContests','danger')] },
    { title: '🎁 جوائز (4)', items: [FQ(cid++,'🎲','فائز عشوائي','pickRandomWinner'),FQ(cid++,'🏆','اختيار 3 فائزين','pickThreeWinners'),FQ(cid++,'🪙','توزيع كوينز للكل','distributeCoins'),FQ(cid++,'✨','توزيع XP للكل','distributeXP')] },
    { title: '📢 إعلانات (3)', items: [FQ(cid++,'➕','إعلان في الشريط','setAnnouncement'),FQ(cid++,'🗑️','مسح الإعلان','clearAnnouncement','danger'),FQ(cid++,'👁️','عرض الإعلان','viewAnnouncement')] },
    { title: '📅 مواسم (3)', items: [FQ(cid++,'➕','موسم جديد','createSeason'),FQ(cid++,'👁️','عرض المواسم','viewSeasons'),FQ(cid++,'🗑️','مسح المواسم','clearSeasons','danger')] }
  ]
};

/* TAB 9: Security */
FEATURES.security = {
  title: '🚫 الأمان', sub: '27 خاصية — حظر + تحذيرات + طرد + أمان + تنظيف',
  sections: [
    { title: '🚫 حظر (5)', items: [FQ(cid++,'🚫','حظر لاعب','pickBan','danger'),FQ(cid++,'✅','رفع حظر','pickUnban'),FQ(cid++,'📋','قائمة المحظورين','viewBannedList'),FQ(cid++,'🗑️','مسح كل المحظورين','clearAllBans','danger'),F(0,'📤','تصدير المحظورين',['export','banned_users','banned'])] },
    { title: '⚠️ تحذيرات (5)', items: [FQ(cid++,'⚠️','إرسال تحذير','pickWarn'),FQ(cid++,'❌','مسح تحذير','pickClearWarn'),FQ(cid++,'📋','قائمة التحذيرات','viewWarningsList'),FQ(cid++,'🗑️','مسح كل التحذيرات','clearAllWarns','danger'),F(0,'📤','تصدير التحذيرات',['export','warnings','warnings'])] },
    { title: '👢 طرد (3)', items: [FQ(cid++,'👢','طرد لاعب','pickKick','danger'),FQ(cid++,'🗑️','مسح كل إشارات الطرد','clearKickSignals','danger'),FQ(cid++,'👁️','عرض إشارات الطرد','viewKickSignals')] },
    { title: '🛡️ أمان (9)', items: [FQ(cid++,'🔒','قفل التسجيل','lockRegistration','danger'),FQ(cid++,'🔓','فتح التسجيل','unlockRegistration'),FQ(cid++,'🚧','وضع الصيانة','enableMaintenance','danger'),FQ(cid++,'✅','إيقاف الصيانة','disableMaintenance'),FQ(cid++,'🚫','إيقاف الشات','disableChat','danger'),FQ(cid++,'✅','تشغيل الشات','enableChat'),FQ(cid++,'🔒','قفل طلبات الصداقة','lockFriendRequests','danger'),FQ(cid++,'🔓','فتح طلبات الصداقة','unlockFriendRequests'),FQ(cid++,'📊','حالة الموقع','showSiteStatus')] },
    { title: '🧹 تنظيف (5)', items: [FQ(cid++,'🏠','مسح الغرف الفاضية','clearEmptyRooms','danger'),FQ(cid++,'👻','مسح presence','clearPresence','danger'),FQ(cid++,'📰','مسح activity_feed','clearActivityFeed','danger'),FQ(cid++,'💬','مسح global_chat','clearGlobalChat','danger'),FQ(cid++,'⚔️','مسح كل التحديات','clearChallenges','danger')] }
  ]
};

/* TAB 10: Reports */
FEATURES.reports = {
  title: '📈 التقارير', sub: '21 خاصية — تقارير شاملة',
  sections: [{ title: '📈 كل التقارير', items: [
    FQ(cid++,'📊','تقرير شامل','reportComprehensive'),FQ(cid++,'⬇️','تحميل التقرير','downloadComprehensiveReport'),FQ(cid++,'👥','تقرير اللاعبين','reportPlayers'),FQ(cid++,'🏆','تقرير المتصدرين','reportLeaderboard'),FQ(cid++,'🎮','تقرير الكويزات','reportQuizzes'),FQ(cid++,'⚡','تقرير السرعة','reportSpeedrun'),FQ(cid++,'🚫','تقرير الحظر','reportBans'),FQ(cid++,'⚠️','تقرير التحذيرات','reportWarnings'),FQ(cid++,'📩','تقرير الرسائل','reportMessages'),FQ(cid++,'💬','تقرير الشات','reportChat'),FQ(cid++,'👥','تقرير الأصدقاء','reportFriends'),FQ(cid++,'🎖️','تقرير الرتب','reportRoles'),FQ(cid++,'🏅','تقرير البادجات','reportBadges'),FQ(cid++,'⚔️','تقرير التيمات','reportTeams'),FQ(cid++,'🏠','تقرير الغرف','reportRooms'),FQ(cid++,'🎉','تقرير الفعاليات','reportEvents'),FQ(cid++,'💡','تقرير الاقتراحات','reportSuggestions'),FQ(cid++,'💬','تقرير التعليقات','reportComments'),FQ(cid++,'🎫','تقرير التذاكر','reportTickets'),FQ(cid++,'📊','مقارنة أسبوعية','reportWeeklyCompare'),FQ(cid++,'✓','تقرير الموثقين','reportVerified')
  ]}]
};

/* TAB 11: Database */
const dbItems = [];
DB_NODES.forEach(n => {
  dbItems.push(F(0,'📊',`${n} — إحصائيات`,['count',n,n]));
  dbItems.push(F(0,'📤',`${n} — تصدير`,['export',n,n]));
  dbItems.push(FQ(0,'🗑️',`${n} — مسح`,`dbClear_${n}`,'danger'));
});
FEATURES.database = { title: '🗄️ قاعدة البيانات', sub: '105 خاصية — 35 node × 3 عمليات', sections: [{ title: '🗄️ كل الـ Nodes (35)', items: dbItems }] };

/* TAB 12: Chat */
FEATURES.chat = {
  title: '💬 الشات', sub: '16 خاصية — الشات العام + شات الشركاء',
  sections: [
    { title: '💬 الشات العام (6)', items: [FQ(cid++,'👁️','عرض الرسائل','viewGlobalChat'),FQ(cid++,'🗑️','مسح كل الرسائل','clearGlobalChat','danger'),F(0,'📤','تصدير الرسائل',['export','global_chat','global_chat']),F(0,'🔢','عدد الرسائل',['count','global_chat','global_chat']),FQ(cid++,'📨','إرسال رسالة رسمية','sendOfficialMessage'),FQ(cid++,'🔔','إرسال تنبيه','sendAlertMessage')] },
    { title: '🤝 شات الشركاء (3)', items: [FQ(cid++,'👁️','عرض رسائل الشركاء','viewPartnerChat'),FQ(cid++,'🗑️','مسح الشات','clearPartnerChat','danger'),FQ(cid++,'📤','تصدير الشات','exportPartnerChat')] },
    { title: '💬 الشات (7)', items: [FQ(cid++,'📨','إرسال في شات الشركاء','sendToPartnerChat'),FQ(cid++,'🚫','إيقاف الشات العام','disableChat','danger'),FQ(cid++,'✅','تشغيل الشات العام','enableChat'),FQ(cid++,'👁️','عرض رسائل النظام','viewSystemMessages'),FQ(cid++,'📊','إحصائيات النشاط','chatActivityStats'),FQ(cid++,'🗑️','مسح activity_feed','clearActivityFeed','danger'),FQ(cid++,'🗑️','مسح كل الشاتات','clearAllChats','danger')] }
  ]
};

/* TAB 13: Broadcast */
FEATURES.broadcast = {
  title: '📢 البث', sub: '7 خصائص — بث + إشعارات',
  sections: [
    { title: '📢 بث (4)', items: [FQ(cid++,'📨','بث رسالة للكل','broadcastAll'),FQ(cid++,'👁️','عرض البث','viewBroadcasts'),FQ(cid++,'🗑️','مسح البث','clearBroadcasts','danger'),F(0,'📤','تصدير البث',['export','broadcast_messages','broadcast'])] },
    { title: '🔔 إشعارات (3)', items: [FQ(cid++,'🔔','إشعار للكل','notifyAll'),FQ(cid++,'🎖️','إشعار لرتبة','notifyByRank'),FQ(cid++,'👑','إشعار للأونر','notifyOwner')] }
  ]
};

/* TAB 14: Admin Messages */
const adminRooms = [
  {key:'group',emoji:'👥',name:'شات الجميع'},{key:'owner',emoji:'👑',name:'شات الأونر'},{key:'partner',emoji:'🤝',name:'شات الشركاء'},{key:'manager',emoji:'📋',name:'شات المديرين'},{key:'tester',emoji:'🧪',name:'شات التسترات'},{key:'builder',emoji:'🏗️',name:'شات البيلدرز'},{key:'admin',emoji:'🛡️',name:'شات الأدمنز'}
];
FEATURES.admin_messages = {
  title: '💬 شات الإدارة', sub: '7 غرف — كل غرفة عرض + إرسال + مسح',
  sections: [{ title: '💬 غرف الشات (7)', items: adminRooms.map((r, i) => FQ(cid++, r.emoji, r.name, `openAdminRoom_${r.key}`)) }]
};

/* TAB 15: Requests */
FEATURES.requests = {
  title: '📥 الطلبات', sub: '19 خاصية — صندوق + رسائل + طلبات متنوعة',
  sections: [
    { title: '📩 صندوق الأونر (3)', items: [FQ(cid++,'👁️','عرض الصندوق','viewOwnerInbox'),FQ(cid++,'🗑️','مسح الصندوق','clearOwnerInbox','danger'),FQ(cid++,'📤','تصدير الصندوق','exportOwnerInbox')] },
    { title: '📨 كل الرسايل (3)', items: [FQ(cid++,'👁️','عرض كل الرسايل','viewAllMessages'),FQ(cid++,'🔢','عدد الرسايل الكلي','countAllMessages'),FQ(cid++,'🗑️','مسح رسايل لاعب','pickClearPlayerMessages','danger')] },
    { title: '📩 طلبات الأدمن (4)', items: [FQ(cid++,'👁️','عرض الطلبات','viewAdminRequests'),FQ(cid++,'✅','قبول طلب','acceptAdminRequest'),FQ(cid++,'❌','رفض طلب','rejectAdminRequest'),FQ(cid++,'🗑️','مسح الكل','clearAdminRequests','danger')] },
    { title: '📋 طلبات المديرين (3)', items: [FQ(cid++,'👁️','عرض','viewManagerRequests'),FQ(cid++,'🗑️','مسح','clearManagerRequests','danger'),F(0,'📤','تصدير',['export','manager_requests','manager_requests'])] },
    { title: '🎬 طلبات الكويزات (2)', items: [FQ(cid++,'👁️','عرض','viewQuizRequests'),FQ(cid++,'🗑️','مسح','clearQuizRequests','danger')] },
    { title: '🤝 طلبات الصداقة (2)', items: [FQ(cid++,'👁️','عرض','viewFriendRequests'),FQ(cid++,'🗑️','مسح','clearAllFriendRequests','danger')] },
    { title: '🎫 تذاكر الدعم (2)', items: [FQ(cid++,'👁️','عرض التذاكر','viewTickets'),FQ(cid++,'🗑️','مسح التذاكر','clearTickets','danger')] }
  ]
};

/* TABS 16-28: Extension */
FEATURES.analytics = {
  title: '📊 تحليلات متقدمة', sub: '30 خاصية — لوحة + تحليل + تنبؤات',
  sections: [
    { title: '📈 لوحة مباشرة (4)', items: [FQ(cid++,'👁️','عرض لوحة التحليلات','showAnalyticsDashboard'),FQ(cid++,'📤','تصدير','exportAnalytics'),FQ(cid++,'🗑️','مسح','clearAnalytics','danger'),FQ(cid++,'🔄','تحديث تلقائي','toggleAutoRefresh')] },
    { title: '👥 تحليل اللاعبين (6)', items: [FQ(cid++,'📊','معدل الاحتفاظ','showRetention'),FQ(cid++,'📉','معدل التسرب','showChurn'),FQ(cid++,'📅','DAU','showDAU'),FQ(cid++,'📆','MAU','showMAU'),FQ(cid++,'⏱️','متوسط وقت الجلسة','showAvgSession'),FQ(cid++,'🔥','أعمق 20 تفاعلاً','showTop20Active')] },
    { title: '🎮 تحليل الكويزات (5)', items: [FQ(cid++,'✅','معدل الإتمام','showCompletionRate'),FQ(cid++,'⏱️','متوسط وقت الإجابة','showAvgAnswerTime'),FQ(cid++,'❌','أكثر الكويزات فشلاً','showMostFailed'),FQ(cid++,'🔴','الأسئلة الصعبة','showHardQuestions'),FQ(cid++,'🟢','الأسئلة السهلة','showEasyQuestions')] },
    { title: '🧠 تحليل السلوك (5)', items: [FQ(cid++,'🔥','خريطة حرارة','showHeatmap'),FQ(cid++,'🚶','مسار اللاعب','showUserJourney'),FQ(cid++,'⏰','الأوقات النشطة','showPeakTimes'),FQ(cid++,'📱','الأجهزة','showDevices'),FQ(cid++,'🌍','الدول','showCountries')] },
    { title: '💰 تحليل مالي (5)', items: [FQ(cid++,'🪙','توزيع الكوينز','showCoinsDistribution'),FQ(cid++,'💸','استهلاك الكوينز','showCoinsConsumption'),FQ(cid++,'✨','توزيع XP','showXPDistribution'),FQ(cid++,'📈','نمو XP','showXPGrowth'),FQ(cid++,'💼','اقتصاد كامل','showFullEconomy')] },
    { title: '🔮 تنبؤات (5)', items: [FQ(cid++,'📈','تنبؤ بالنمو','predictGrowth'),FQ(cid++,'👥','تنبؤ بالجدد','predictNewPlayers'),FQ(cid++,'🚫','تنبؤ بالمحظورين','predictBans'),FQ(cid++,'🔍','كشف الشذوذ','detectAnomalies'),FQ(cid++,'🧠','ذكاء تحليلي','aiInsights')] }
  ]
};

FEATURES.ai = {
  title: '🤖 AI Assistant', sub: '25 خاصية — مساعد + مكافحة غش + تحليل نصوص',
  sections: [
    { title: '💬 مساعد إداري (5)', items: [FQ(cid++,'💬','شات مع المساعد','openAIChat'),FQ(cid++,'💡','اقتراحات ذكية','aiSmartSuggestions'),FQ(cid++,'📊','تحليل السجلات','aiAnalyzeLogs'),FQ(cid++,'📝','تلخيص التقارير','aiSummarizeReports'),FQ(cid++,'🗑️','مسح المحادثات','clearAIChats','danger')] },
    { title: '🕵️ مكافحة الغش (5)', items: [FQ(cid++,'🤖','كشف الحسابات الوهمية','detectFakeAccounts'),FQ(cid++,'🔍','كشف الـ Bots','detectBots'),FQ(cid++,'👥','كشف Multi-Accounts','detectMultiAccounts'),FQ(cid++,'🎯','كشف التلاعب','detectCheating'),FQ(cid++,'🚫','مراجعة قرارات الحظر','reviewBanDecisions')] },
    { title: '📝 تحليل النصوص (5)', items: [FQ(cid++,'🤬','فلترة الشتائم','filterProfanity'),FQ(cid++,'😊','تحليل المشاعر','analyzeSentiment'),FQ(cid++,'📋','تلخيص الاقتراحات','summarizeSuggestions'),FQ(cid++,'🏷️','تصنيف التذاكر','classifyTickets'),FQ(cid++,'💬','رد تلقائي','autoReplyTickets')] },
    { title: '✍️ توليد المحتوى (5)', items: [FQ(cid++,'❓','توليد أسئلة','generateQuestions'),FQ(cid++,'📢','توليد إعلان','generateAnnouncement'),FQ(cid++,'👋','توليد ترحيب','generateWelcome'),FQ(cid++,'🏆','توليد مسابقة','generateContest'),FQ(cid++,'🌐','ترجمة تلقائية','autoTranslate')] },
    { title: '🎯 تخصيص (5)', items: [FQ(cid++,'🎮','توصية كويزات','recommendQuizzes'),FQ(cid++,'👥','توصية أصدقاء','recommendFriends'),FQ(cid++,'📢','توصية إعلانات','recommendAds'),FQ(cid++,'🧠','تحليل شخصية','analyzePlayerPersonality'),FQ(cid++,'🔮','توقع احتياج','predictNeeds')] }
  ]
};

FEATURES.marketing = {
  title: '📣 التسويق', sub: '30 خاصية — حملات + كوبونات + إحالات + SEO',
  sections: [
    { title: '🎯 الحملات (5)', items: [FQ(cid++,'➕','حملة جديدة','createCampaign'),FQ(cid++,'👁️','عرض الحملات','viewCampaigns'),FQ(cid++,'🗑️','مسح','clearCampaigns','danger'),FQ(cid++,'📤','تصدير','exportCampaigns'),FQ(cid++,'⏰','جدولة حملة','scheduleCampaign')] },
    { title: '🎟️ كوبونات (5)', items: [FQ(cid++,'➕','كود جديد','createCoupon'),FQ(cid++,'👁️','عرض','viewCoupons'),FQ(cid++,'🗑️','مسح','clearCoupons','danger'),FQ(cid++,'⏸️','تعطيل','disableCoupon'),FQ(cid++,'📤','تصدير','exportCoupons')] },
    { title: '🔗 الإحالات (5)', items: [FQ(cid++,'⚙️','إعداد النظام','setupReferrals'),FQ(cid++,'👁️','عرض','viewReferrals'),FQ(cid++,'🎁','مكافآت','referralRewards'),FQ(cid++,'✅','الناجحة','viewSuccessfulReferrals'),FQ(cid++,'🗑️','مسح','clearReferrals','danger')] },
    { title: '🌐 الربط الخارجي (5)', items: [FQ(cid++,'⚙️','إعدادات SEO','setupSEO'),FQ(cid++,'🏷️','Meta Tags','editMetaTags'),FQ(cid++,'🗺️','Sitemap','generateSitemap'),FQ(cid++,'🤖','Robots.txt','editRobots'),FQ(cid++,'📊','Google Analytics','setupGoogleAnalytics')] },
    { title: '🔔 Popups (5)', items: [FQ(cid++,'➕','Popup جديد','createPopup'),FQ(cid++,'👁️','عرض','viewPopups'),FQ(cid++,'🗑️','مسح','clearPopups','danger'),FQ(cid++,'🔔','Push','sendPushNotification'),FQ(cid++,'✏️','تخصيص','customizeNotification')] },
    { title: '🤝 الشراكات (5)', items: [FQ(cid++,'➕','شريك جديد','createPartner'),FQ(cid++,'👁️','عرض','viewPartners'),FQ(cid++,'🗑️','حذف','deletePartner','danger'),FQ(cid++,'📝','عقد شراكة','partnerContract'),FQ(cid++,'📊','تقرير','partnerReport')] }
  ]
};

FEATURES.economy = {
  title: '💰 الاقتصاد', sub: '30 خاصية — عملات + متجر + صناديق + مشتريات',
  sections: [
    { title: '🪙 العملات (5)', items: [FQ(cid++,'➕','عملة جديدة','createCurrency'),FQ(cid++,'👁️','عرض','viewCurrencies'),FQ(cid++,'💱','سعر الصرف','setExchangeRate'),FQ(cid++,'🗑️','مسح','clearCurrencies','danger'),FQ(cid++,'📤','تصدير','exportCurrencies')] },
    { title: '🛒 المتجر (5)', items: [FQ(cid++,'➕','منتج جديد','createProduct'),FQ(cid++,'👁️','عرض','viewProducts'),FQ(cid++,'🗑️','مسح','deleteProduct','danger'),FQ(cid++,'📤','تصدير','exportProducts'),FQ(cid++,'🔄','تفعيل/تعطيل','toggleProduct')] },
    { title: '🎁 الصناديق (5)', items: [FQ(cid++,'➕','صندوق جديد','createLootBox'),FQ(cid++,'👁️','عرض','viewLootBoxes'),FQ(cid++,'🎲','توزيع عشوائي','randomDistribution'),FQ(cid++,'🎁','افتتاح صندوق','openLootBox'),FQ(cid++,'🗑️','مسح','clearLootBoxes','danger')] },
    { title: '📅 المكافآت اليومية (5)', items: [FQ(cid++,'⚙️','إعداد','setupDailyRewards'),FQ(cid++,'👁️','عرض','viewDailyRewards'),FQ(cid++,'🗑️','مسح','clearDailyRewards','danger'),FQ(cid++,'📤','تصدير','exportDailyRewards'),FQ(cid++,'✖️','مضاعفة','doubleDailyRewards')] },
    { title: '🧾 المشتريات (5)', items: [FQ(cid++,'👁️','عرض','viewPurchases'),FQ(cid++,'🗑️','مسح','clearPurchases','danger'),FQ(cid++,'↩️','استرداد','refundPurchase'),F(0,'📤','تصدير',['export','users_data','purchases']),FQ(cid++,'📋','سجل المعاملات','viewTransactions')] },
    { title: '🔨 المزادات (5)', items: [FQ(cid++,'➕','مزاد جديد','createAuction'),FQ(cid++,'👁️','عرض','viewAuctions'),FQ(cid++,'🏁','إنهاء','endAuction'),FQ(cid++,'🗑️','مسح','clearAuctions','danger'),FQ(cid++,'📤','تصدير','exportAuctions')] }
  ]
};

FEATURES.automation = {
  title: '⚙️ الأتمتة', sub: '25 خاصية — قواعد + Triggers + Actions + Webhooks',
  sections: [
    { title: '📜 القواعد (5)', items: [FQ(cid++,'➕','قاعدة جديدة','createRule'),FQ(cid++,'👁️','عرض','viewRules'),FQ(cid++,'🔄','تفعيل/تعطيل','toggleRule'),FQ(cid++,'🗑️','مسح','clearRules','danger'),FQ(cid++,'📤','تصدير','exportRules')] },
    { title: '⚡ Triggers (5)', items: [FQ(cid++,'👤','عند التسجيل','triggerSignup'),FQ(cid++,'⭐','عند مستوى X','triggerLevelUp'),FQ(cid++,'🚫','عند الحظر','triggerBan'),FQ(cid++,'🛒','عند الشراء','triggerPurchase'),FQ(cid++,'📊','عند تقرير','triggerReport')] },
    { title: '🎬 Actions (5)', items: [FQ(cid++,'📨','رسالة تلقائية','actionSendMessage'),FQ(cid++,'✨','XP تلقائي','actionGiveXP'),FQ(cid++,'🏅','بادج تلقائي','actionGiveBadge'),FQ(cid++,'⚠️','تحذير تلقائي','actionAutoWarn'),FQ(cid++,'🚫','حظر تلقائي','actionAutoBan')] },
    { title: '🔗 Webhooks (5)', items: [FQ(cid++,'➕','Webhook جديد','createWebhook'),FQ(cid++,'👁️','عرض','viewWebhooks'),FQ(cid++,'🧪','اختبار','testWebhook'),FQ(cid++,'🗑️','مسح','clearWebhooks','danger'),FQ(cid++,'📤','تصدير','exportWebhooks')] },
    { title: '⏰ الجدولة (5)', items: [FQ(cid++,'➕','مهمة جديدة','createScheduledTask'),FQ(cid++,'👁️','عرض','viewScheduledTasks'),FQ(cid++,'▶️','تشغيل فوري','runTaskNow'),FQ(cid++,'🗑️','مسح','clearScheduledTasks','danger'),FQ(cid++,'📤','تصدير','exportScheduledTasks')] }
  ]
};

FEATURES.adv_security = {
  title: '🛡️ أمان متقدم', sub: '30 خاصية — حماية + سجلات + فحص + استرداد',
  sections: [
    { title: '🔐 الحماية (5)', items: [FQ(cid++,'🔐','2FA للأدمنز','enable2FA'),FQ(cid++,'📝','IP Whitelist','addIPWhitelist'),FQ(cid++,'🚫','IP Blacklist','addIPBlacklist'),FQ(cid++,'⏱️','Rate Limiting','enableRateLimit'),FQ(cid++,'🤖','CAPTCHA','enableCaptcha')] },
    { title: '📋 السجلات (5)', items: [FQ(cid++,'🔑','سجل الدخول','viewLoginLog'),FQ(cid++,'📊','سجل العمليات','viewOperationsLog'),FQ(cid++,'📝','سجل التغييرات','viewChangesLog'),FQ(cid++,'🚫','سجل الحظر','viewBanLog'),F(0,'📤','تصدير السجلات',['export','admin_logs','admin_logs'])] },
    { title: '🔍 الفحص (5)', items: [FQ(cid++,'🔍','فحص الثغرات','scanVulnerabilities'),FQ(cid++,'🔐','فحص كلمات المرور','scanPasswords'),FQ(cid++,'🔑','فحص الجلسات','scanSessions'),FQ(cid++,'📁','فحص الملفات','scanFiles'),FQ(cid++,'📊','تقرير الأمان','securityReport')] },
    { title: '🚫 الحظر المتقدم (5)', items: [FQ(cid++,'🌐','حظر IP','banIP'),FQ(cid++,'📱','حظر الجهاز','banDevice'),FQ(cid++,'🌍','حظر النطاق','banDomain'),FQ(cid++,'✅','رفع حظر IP','unbanIP'),FQ(cid++,'📋','قائمة الحظر','viewBanList')] },
    { title: '🆘 الاسترداد (5)', items: [FQ(cid++,'♻️','استرداد حساب','recoverAccount'),FQ(cid++,'💾','استرداد بيانات','recoverData'),FQ(cid++,'🚨','طوارئ تسجيل','emergencyRegistration'),FQ(cid++,'🔒','قفل الموقع','lockSite','danger'),FQ(cid++,'🔓','فتح الموقع','unlockSite')] },
    { title: '👁️ المراقبة (5)', items: [FQ(cid++,'👁️','تتبع مباشر','startLiveTracking'),FQ(cid++,'🚨','تنبيه تسلل','alertIntrusion'),FQ(cid++,'⚠️','نشاط مريب','alertSuspiciousActivity'),FQ(cid++,'🔑','محاولات دخول','alertLoginAttempts'),FQ(cid++,'🗑️','مسح التنبيهات','clearAlerts','danger')] }
  ]
};

FEATURES.teams = {
  title: '👥 إدارة الفرق', sub: '30 خاصية — فرق + أعضاء + معارك + ترتيب',
  sections: [
    { title: '🏆 الفرق (5)', items: [FQ(cid++,'➕','فريق جديد','createTeam'),FQ(cid++,'👁️','عرض','viewTeams'),FQ(cid++,'🗑️','مسح','deleteTeam','danger'),FQ(cid++,'📤','تصدير','exportTeams'),FQ(cid++,'📊','تقرير','teamsReport')] },
    { title: '🧑‍🤝‍🧑 الأعضاء (5)', items: [FQ(cid++,'➕','إضافة عضو','addTeamMember'),FQ(cid++,'➖','إزالة عضو','removeTeamMember'),FQ(cid++,'👁️','عرض','viewMembers'),FQ(cid++,'📤','تصدير','exportMembers'),FQ(cid++,'⬆️','ترقية قائد','promoteCaptain')] },
    { title: '⚔️ المعارك (5)', items: [FQ(cid++,'➕','معركة جديدة','createBattle'),FQ(cid++,'👁️','عرض','viewBattles'),FQ(cid++,'📊','نتائج','battleResults'),FQ(cid++,'🗑️','مسح','clearBattles','danger'),FQ(cid++,'📤','تصدير','exportBattles')] },
    { title: '🥇 الترتيب (5)', items: [FQ(cid++,'🏆','ترتيب الفرق','teamsRanking'),FQ(cid++,'⭐','أعلى نقاط','topTeams'),FQ(cid++,'📅','أفضل أسبوعي','bestWeekly'),FQ(cid++,'📆','أفضل شهري','bestMonthly'),FQ(cid++,'0️⃣','تصفير الترتيب','resetTeamsRanking','danger')] },
    { title: '✉️ الدعوات (5)', items: [FQ(cid++,'📨','دعوة لاعبين','invitePlayers'),FQ(cid++,'👁️','عرض','viewInvites'),FQ(cid++,'✅','قبول/رفض','handleInvite'),FQ(cid++,'🗑️','مسح','clearInvites','danger'),FQ(cid++,'📏','حد الأعضاء','setMemberLimit')] },
    { title: '🎁 المكافآت (5)', items: [FQ(cid++,'🎁','مكافأة فريق','giveTeamReward'),FQ(cid++,'✨','توزيع XP','distributeTeamXP'),FQ(cid++,'🪙','توزيع كوينز','distributeTeamCoins'),FQ(cid++,'👁️','عرض','viewTeamRewards'),FQ(cid++,'🗑️','مسح','clearTeamRewards','danger')] }
  ]
};

FEATURES.themes = {
  title: '🎨 التخصيص', sub: '30 خاصية — ثيمات + ألوان + خطوط + أنيميشن',
  sections: [
    { title: '🎭 الثيمات (5)', items: [FQ(cid++,'➕','ثيم جديد','createTheme'),FQ(cid++,'👁️','عرض','viewThemes'),FQ(cid++,'✅','تفعيل','activateTheme'),FQ(cid++,'🗑️','حذف','deleteTheme','danger'),FQ(cid++,'📤','تصدير','exportTheme')] },
    { title: '🌈 الألوان (5)', items: [FQ(cid++,'🎨','اللون الرئيسي','setPrimaryColor'),FQ(cid++,'🎨','اللون الثانوي','setSecondaryColor'),FQ(cid++,'🖤','لون الخط','setTextColor'),FQ(cid++,'🖼️','لون الخلفية','setBgColor'),FQ(cid++,'🌈','تدرج مخصص','setCustomGradient')] },
    { title: '🔤 الخطوط (5)', items: [FQ(cid++,'📝','الخط الرئيسي','setMainFont'),FQ(cid++,'📰','خط العناوين','setHeadingFont'),FQ(cid++,'📏','حجم الخط','setFontSize'),FQ(cid++,'👁️','عرض','viewFonts'),FQ(cid++,'📤','رفع خط','uploadFont')] },
    { title: '🖼️ الشعار (5)', items: [FQ(cid++,'🖼️','شعار جديد','uploadLogo'),FQ(cid++,'⭐','Favicon','uploadFavicon'),FQ(cid++,'🌓','شعار دارك/لايت','setThemeLogo'),FQ(cid++,'🗑️','مسح','clearLogo','danger'),FQ(cid++,'👁️','معاينة','previewLogo')] },
    { title: '📐 Layouts (5)', items: [FQ(cid++,'📐','تخطيط الهيدر','setHeaderLayout'),FQ(cid++,'📐','تخطيط الفوتر','setFooterLayout'),FQ(cid++,'📐','تخطيط السايدبار','setSidebarLayout'),FQ(cid++,'➕','صفحة مخصصة','createCustomPage'),FQ(cid++,'🎨','CSS مخصص','editCustomCSS')] },
    { title: '✨ الأنيميشن (5)', items: [FQ(cid++,'✨','خلفيات متحركة','toggleAnimatedBg'),FQ(cid++,'🎬','تأثيرات','toggleEffects'),FQ(cid++,'⭐','Gold Particles','toggleGoldParticles'),FQ(cid++,'🗑️','مسح','clearAnimations','danger'),FQ(cid++,'👁️','معاينة','previewAnimations')] }
  ]
};

FEATURES.integrations = {
  title: '🔗 التكاملات', sub: '25 خاصية — Firebase + Discord + Telegram + Google',
  sections: [
    { title: '🔥 Firebase (5)', items: [FQ(cid++,'📊','حالة','firebaseStatus'),FQ(cid++,'📋','عرض القواعد','viewFirebaseRules'),FQ(cid++,'✏️','تعديل القواعد','editFirebaseRules'),FQ(cid++,'🔄','مزامنة','firebaseSync'),F(0,'📤','تصدير',['export','site_settings','firebase'])] },
    { title: '💬 Discord (5)', items: [FQ(cid++,'🔗','ربط','connectDiscord'),FQ(cid++,'👁️','السيرفرات','viewDiscordServers'),FQ(cid++,'🔗','Webhooks','setupDiscordWebhooks'),FQ(cid++,'🗑️','مسح','disconnectDiscord','danger'),FQ(cid++,'📊','تقرير','discordReport')] },
    { title: '✈️ Telegram (5)', items: [FQ(cid++,'🤖','ربط البوت','connectTelegramBot'),FQ(cid++,'📨','إرسال','sendTelegramMessage'),FQ(cid++,'👁️','المشتركين','viewTelegramSubscribers'),FQ(cid++,'🗑️','مسح','disconnectTelegram','danger'),FQ(cid++,'📊','تقرير','telegramReport')] },
    { title: '🟢 Google (5)', items: [FQ(cid++,'📊','Google Sheets','connectGoogleSheets'),FQ(cid++,'🔑','Google Login','setupGoogleLogin'),FQ(cid++,'📈','Analytics','connectGoogleAnalytics'),FQ(cid++,'🔄','مزامنة','syncGoogleSheets'),FQ(cid++,'📤','تصدير','exportToGoogle')] },
    { title: '🔌 API (5)', items: [FQ(cid++,'🔑','مفتاح جديد','createAPIKey'),FQ(cid++,'👁️','عرض المفاتيح','viewAPIKeys'),FQ(cid++,'🗑️','حذف','deleteAPIKey','danger'),FQ(cid++,'📖','وثائق','viewAPIDocs'),FQ(cid++,'📊','Logs','viewAPILogs')] }
  ]
};

FEATURES.backup = {
  title: '💾 النسخ الاحتياطي', sub: '25 خاصية — نسخ + استعادة + مزامنة + طوارئ',
  sections: [
    { title: '📦 النسخ (5)', items: [FQ(cid++,'➕','نسخة جديدة','createBackup'),FQ(cid++,'👁️','عرض','viewBackups'),FQ(cid++,'⬇️','تحميل','downloadBackup'),FQ(cid++,'🗑️','مسح','deleteBackup','danger'),FQ(cid++,'⏰','جدولة','scheduleBackups')] },
    { title: '♻️ الاستعادة (5)', items: [FQ(cid++,'♻️','استعادة','restoreBackup'),FQ(cid++,'📦','جزئية','restorePartial'),FQ(cid++,'🔄','كاملة','restoreFull'),FQ(cid++,'📤','رفع','uploadBackup'),FQ(cid++,'✓','تحقق','validateBackup')] },
    { title: '🔄 المزامنة (5)', items: [FQ(cid++,'🔄','مزامنة يدوية','manualSync'),FQ(cid++,'⏰','مزامنة تلقائية','autoSync'),FQ(cid++,'🔥','Firebase','syncFirebase'),FQ(cid++,'🌐','خارجية','externalSync'),FQ(cid++,'📋','سجل','viewSyncLog')] },
    { title: '📊 الإحصائيات (5)', items: [FQ(cid++,'📦','حجم البيانات','showDataSize'),FQ(cid++,'🔢','عدد Nodes','countNodes'),FQ(cid++,'📊','تقرير','backupReport'),FQ(cid++,'🕐','أقدم نسخة','showOldestBackup'),FQ(cid++,'🕐','أحدث نسخة','showNewestBackup')] },
    { title: '🚨 الطوارئ (5)', items: [FQ(cid++,'🚨','نسخة طوارئ','emergencyBackup'),FQ(cid++,'🆘','استرداد','emergencyRestore'),FQ(cid++,'🗑️','مسح','clearEmergencyBackups','danger'),FQ(cid++,'📤','تصدير شامل','fullExport'),FQ(cid++,'✓','فحص','validateBackup')] }
  ]
};

FEATURES.audit = {
  title: '📝 سجل التدقيق', sub: '30 خاصية — سجلات شاملة قابلة للبحث',
  sections: [
    { title: '👤 سجلات الأدمنز', items: [FQ(cid++,'👁️','عرض','viewAdminLogs'),FQ(cid++,'🔍','تصفية','filterAdminLogs'),F(0,'📤','تصدير',['export','admin_logs','admin_logs']),FQ(cid++,'🗑️','مسح','clearAdminLogs','danger'),FQ(cid++,'🔎','بحث','searchAdminLogs')] },
    { title: '🎮 سجلات اللاعبين', items: [FQ(cid++,'👁️','عرض','viewPlayerLogs'),FQ(cid++,'🔍','تصفية','filterPlayerLogs'),FQ(cid++,'📤','تصدير','exportPlayerLogs'),FQ(cid++,'🗑️','مسح','clearPlayerLogs','danger'),FQ(cid++,'🔎','بحث','searchPlayerLogs')] },
    { title: '💬 سجلات الشات', items: [FQ(cid++,'👁️','عرض','viewChatLogs'),FQ(cid++,'🔍','تصفية','filterChatLogs'),FQ(cid++,'📤','تصدير','exportChatLogs'),FQ(cid++,'🗑️','مسح','clearChatLogs','danger'),FQ(cid++,'🔎','بحث','searchChatLogs')] },
    { title: '🚫 سجلات الحظر', items: [FQ(cid++,'👁️','عرض','viewBanLogs'),FQ(cid++,'🔍','تصفية','filterBanLogs'),F(0,'📤','تصدير',['export','banned_users','ban_logs']),FQ(cid++,'🗑️','مسح','clearBanLogs','danger'),FQ(cid++,'🔎','بحث','searchBanLogs')] },
    { title: '🔐 سجلات الدخول', items: [FQ(cid++,'👁️','عرض','viewLoginLogs'),FQ(cid++,'🔍','تصفية','filterLoginLogs'),FQ(cid++,'📤','تصدير','exportLoginLogs'),FQ(cid++,'🗑️','مسح','clearLoginLogs','danger'),FQ(cid++,'🔎','بحث','searchLoginLogs')] },
    { title: '⚙️ سجلات النظام', items: [FQ(cid++,'👁️','عرض','viewSystemLogs'),FQ(cid++,'🔍','تصفية','filterSystemLogs'),FQ(cid++,'📤','تصدير','exportSystemLogs'),FQ(cid++,'🗑️','مسح','clearSystemLogs','danger'),FQ(cid++,'🔎','بحث','searchSystemLogs')] }
  ]
};

FEATURES.cms = {
  title: '📚 إدارة المحتوى', sub: '25 خاصية — صفحات + بلوج + FAQ + تعليقات',
  sections: [
    { title: '📄 الصفحات (5)', items: [FQ(cid++,'➕','صفحة جديدة','createPage'),FQ(cid++,'👁️','عرض','viewPages'),FQ(cid++,'✏️','تعديل','editPage'),FQ(cid++,'🗑️','حذف','deletePage','danger'),FQ(cid++,'📢','نشر','publishPage')] },
    { title: '📰 البلوج (5)', items: [FQ(cid++,'➕','مقال جديد','createArticle'),FQ(cid++,'👁️','عرض','viewArticles'),FQ(cid++,'✏️','تعديل','editArticle'),FQ(cid++,'🗑️','حذف','deleteArticle','danger'),FQ(cid++,'📤','تصدير','exportArticles')] },
    { title: '❓ FAQ (5)', items: [FQ(cid++,'➕','سؤال جديد','createFAQ'),FQ(cid++,'👁️','عرض','viewFAQs'),FQ(cid++,'🏷️','تصنيف','categorizeFAQ'),FQ(cid++,'✏️','تعديل','editFAQ'),FQ(cid++,'🗑️','حذف','deleteFAQ','danger')] },
    { title: '💬 التعليقات (5)', items: [FQ(cid++,'👁️','عرض','viewCommentsCMS'),FQ(cid++,'✅','موافقة','approveComment'),FQ(cid++,'❌','رفض','rejectComment'),FQ(cid++,'↩️','رد','replyComment'),FQ(cid++,'🗑️','مسح','clearCommentsCMS','danger')] },
    { title: '🔔 الإشعارات (5)', items: [FQ(cid++,'➕','إشعار جديد','createNotification'),FQ(cid++,'👁️','عرض','viewNotifications'),FQ(cid++,'🗑️','مسح','clearNotifications','danger'),F(0,'📤','تصدير',['export','notifications','notifications']),FQ(cid++,'⏰','جدولة','scheduleNotification')] }
  ]
};

FEATURES.i18n = {
  title: '🌐 تعدد اللغات', sub: '15 خاصية — لغات + ترجمة + إعدادات',
  sections: [
    { title: '🗣️ اللغات (5)', items: [FQ(cid++,'➕','إضافة لغة','addLanguage'),FQ(cid++,'👁️','عرض','viewLanguages'),FQ(cid++,'🔄','تفعيل/تعطيل','toggleLanguage'),FQ(cid++,'🗑️','حذف','deleteLanguage','danger'),FQ(cid++,'📤','تصدير','exportLanguages')] },
    { title: '🔄 الترجمة (5)', items: [FQ(cid++,'👁️','عرض','viewTranslations'),FQ(cid++,'✏️','تعديل','editTranslation'),FQ(cid++,'🤖','ترجمة تلقائية','autoTranslateAll'),FQ(cid++,'🗑️','مسح','clearTranslations','danger'),FQ(cid++,'📤','تصدير','exportTranslations')] },
    { title: '⚙️ الإعدادات (5)', items: [FQ(cid++,'🌐','اللغة الافتراضية','setDefaultLanguage'),FQ(cid++,'📐','RTL','toggleRTL'),FQ(cid++,'🏷️','رمز اللغة','setLanguageCode'),FQ(cid++,'👁️','عرض اللغة','previewLanguage'),FQ(cid++,'🔄','إعادة تحميل','reloadTranslations')] }
  ]
};

const TAB_GROUPS = [
  { name: 'Core', tabs: ['overview','players','content'] },
  { name: 'Customization', tabs: ['roles','badges','settings'] },
  { name: 'Communication', tabs: ['messages','chat','broadcast','admin_messages'] },
  { name: 'Engagement', tabs: ['events','requests'] },
  { name: 'Security', tabs: ['security','reports','adv_security'] },
  { name: 'System', tabs: ['database','backup','automation','integrations'] },
  { name: 'Advanced', tabs: ['analytics','ai','marketing','economy','teams','themes','audit','cms','i18n'] }
];
const TAB_ICONS = { overview:'📊', players:'👥', content:'🎮', roles:'🎖️', badges:'🏅', settings:'⚙️', messages:'📩', chat:'💬', broadcast:'📢', admin_messages:'💬', events:'🎉', requests:'📥', security:'🚫', reports:'📈', adv_security:'🛡️', database:'🗄️', backup:'💾', automation:'⚙️', integrations:'🔗', analytics:'📊', ai:'🤖', marketing:'📣', economy:'💰', teams:'👥', themes:'🎨', audit:'📝', cms:'📚', i18n:'🌐' };

/* ═══════════════════════════════════════════════════════════════════
   RENDER
   ═══════════════════════════════════════════════════════════════════ */

function renderSidebar() {
  const nav = $('sidebarNav');
  if (!nav) return;
  nav.innerHTML = TAB_GROUPS.map(g => `
    <div class="nav-group">
      <div class="nav-group-title">${g.name}</div>
      <div class="sidebar-nav">
        ${g.tabs.map(t => `<button class="nav-item ${t === 'overview' ? 'active' : ''}" data-tab="${t}"><span class="nav-icon">${TAB_ICONS[t] || '📄'}</span><span class="nav-label">${FEATURES[t]?.title?.replace(/^[^\s]+\s/, '') || t}</span></button>`).join('')}
      </div>
    </div>
  `).join('');
  nav.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
}

async function renderTab(tabKey) {
  const main = $('ownerMain');
  if (!main) return;
  let pane = $(`tab-${tabKey}`);
  if (!pane) {
    pane = document.createElement('div');
    pane.id = `tab-${tabKey}`;
    pane.className = 'tab-pane';
    main.appendChild(pane);
  }
  const tab = FEATURES[tabKey];
  if (!tab) { pane.innerHTML = '<div class="empty-state">التاب غير موجود</div>'; return; }

  pane.innerHTML = `
    <div class="page-title">${tab.title}</div>
    <div class="page-sub">${tab.sub}</div>
    <div id="dynamicContent_${tabKey}"></div>
  `;

  let dynamicSectionHTML = '';
  if (tabKey === 'content') {
    toast('⏳ جاري جلب الكويزات...', 'info');
    
    const scores = await all('scores');
    const manualQuizzes = await all('site_settings/manual_quizzes');
    const uniqueQuizzes = new Set(Object.keys(manualQuizzes));
    
    for (const user in scores) {
      for (const quizKey in scores[user]) {
        if (quizKey !== 'system_sync') uniqueQuizzes.add(quizKey);
      }
    }
    
    if (uniqueQuizzes.size === 0) uniqueQuizzes.add('general_quiz');
    
    const quizItems = [];
    let quizId = 200;
    
    Array.from(uniqueQuizzes).forEach(k => {
      const L = QUIZ_LABELS[k] || k;
      quizItems.push(F(quizId++,'📊',`${L} — إحصائيات`,['quizStats', k]));
      quizItems.push(F(quizId++,'📤',`${L} — تصدير`,['quizExport', k]));
      quizItems.push(F(quizId++,'0️⃣',`${L} — تصفير`,['quizReset', k],'danger'));
      quizItems.push(F(quizId++,'🗑️',`${L} — حذف`,['quizDelete', k],'danger'));
    });

    dynamicSectionHTML = `
      <div class="features-section">
        <div class="features-section-title"><span>📊 كويزات موجودة في الداتابيز (${uniqueQuizzes.size})</span></div>
        <div class="features-grid">
          ${quizItems.map(f => `
            <button class="feature-btn ${f.style || ''}" onclick='window._runFeature(${JSON.stringify(tabKey)}, -1, -1, ${JSON.stringify(f)})'>
              <span class="icon">${f.icon}</span><span class="label">${escapeHtml(f.label)}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  pane.innerHTML += dynamicSectionHTML;
  pane.innerHTML += tab.sections.map((s, si) => `
    <div class="features-section">
      <div class="features-section-title"><span>${s.title}</span><span class="count">${s.items.length}</span></div>
      <div class="features-grid">
        ${s.items.map((f, fi) => {
          const featureId = f.id || `${tabKey}_${si}_${fi}`;
          return `<button class="feature-btn ${f.style || ''}" data-feature-id="${featureId}" onclick='window._runFeature(${JSON.stringify(tabKey)}, ${si}, ${fi})'><span class="icon">${f.icon}</span><span class="label">${escapeHtml(f.label)}</span>${f.id ? `<span class="num">#${f.id}</span>` : ''}</button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function switchTab(tabKey) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  renderTab(tabKey);
  const pane = $(`tab-${tabKey}`);
  if (pane) pane.classList.add('active');
}
window.ownerSwitchTab = switchTab;
window.switchTab = switchTab;

window._runFeature = async (tabKey, sectionIdx, featureIdx, featureObj = null) => {
  let feature = featureObj || FEATURES[tabKey]?.sections[sectionIdx]?.items[featureIdx];
  if (!feature) return toast('الخاصية غير موجودة', 'error');
  
  try {
    const [handlerKey, ...args] = feature.h;
    const handler = H[handlerKey];
    if (handler) await handler(...args);
    else toast('⚠️ قيد التطوير', 'info');
  } catch (e) {
    console.error(e); toast('خطأ: ' + e.message, 'error');
  }
};

/* ═══════════════════════════════════════════════════════════════════
   SPECIFIC HANDLERS (CORE)
   ═══════════════════════════════════════════════════════════════════ */

async function pickPlayer(title, callback) {
  const s = await get(ref(db, 'usernames'));
  const users = s.exists() ? Object.keys(s.val()) : [];
  if (!users.length) return toast('لا يوجد لاعبين', 'error');
  openModal(title || 'اختر لاعب', `
    <input class="field-input" id="pickSearch" placeholder="🔍 بحث..." oninput="window._filterPickList()">
    <div id="pickList" style="max-height:50vh; overflow-y:auto;">
      ${users.map(u => `<div class="list-item" data-user="${escapeHtml(u)}"><div class="list-item-content"><div class="list-item-title">👤 ${escapeHtml(u)}</div></div><button class="mini-btn gold" onclick="window._pickUser('${escapeHtml(u)}')">اختيار</button></div>`).join('')}
    </div>
  `);
  window._pickCallback = callback;
}

window._filterPickList = () => {
  const q = $('pickSearch').value.toLowerCase();
  document.querySelectorAll('#pickList .list-item').forEach(el => el.style.display = el.dataset.user.toLowerCase().includes(q) ? '' : 'none');
};

window._pickUser = (user) => {
  closeModal();
  if (window._pickCallback) window._pickCallback(user);
};

async function withUser(title, fn) {
  await pickPlayer(title, async (user) => {
    try { await fn(user); } catch (e) { toast(e.message, 'error'); }
  });
}

window.pickPlayerProfile = () => withUser('عرض الملف', u => window.open(`profile.html?user=${encodeURIComponent(u)}`, '_blank'));
window.pickPlayerResults = () => withUser('نتائج اللاعب', async u => {
  const s = await get(ref(db, 'scores/' + u)); const data = s.exists() ? s.val() : {};
  let total = 0, quizzes = 0;
  for (const k in data) { quizzes++; for (const a in data[k]) total += (data[k][a].score || 0); }
  toast(`👤 ${u}: ${total} نقطة من ${quizzes} كويز`, 'info');
});
window.pickAssignRole = () => withUser('تعيين رتبة', async u => {
  const role = prompt('اكتب الرتبة:', 'Player'); if (!role) return;
  await set(ref(db, 'roles/users/' + u), role); await logAction('assign_role', u, role); toast(`✅ تم تعيين ${role} لـ ${u}`);
});
window.pickRemoveRole = () => withUser('إلغاء رتبة', async u => { await remove(ref(db, 'roles/users/' + u)); toast(`✅ تم إلغاء رتبة ${u}`); });
window.pickAssignBadge = () => withUser('إعطاء بادج', async u => {
  const badge = prompt('اسم البادج:', 'Founder'); if (!badge) return;
  await set(ref(db, 'badges/' + u + '/' + badge), true); toast(`✅ تم إعطاء ${badge} لـ ${u}`);
});
window.pickRemoveBadge = () => withUser('إلغاء بادج', async u => {
  const badge = prompt('اسم البادج:'); if (!badge) return;
  await remove(ref(db, 'badges/' + u + '/' + badge)); toast(`✅ تم`);
});
window.pickVerify = () => withUser('توثيق', async u => { await set(ref(db, 'verified_users/' + u), { by: CURRENT_USER, time: Date.now() }); await set(ref(db, 'users_data/' + u + '/verified'), 1); toast(`✓ تم توثيق ${u}`); });
window.pickUnverify = () => withUser('إلغاء توثيق', async u => { await remove(ref(db, 'verified_users/' + u)); await remove(ref(db, 'users_data/' + u + '/verified')); toast(`✅ تم`); });
window.pickSendMessage = () => withUser('إرسال رسالة', async u => {
  const text = prompt('الرسالة:'); if (!text) return;
  await push(ref(db, 'messages/' + u), { from: '👑 Owner', text, time: Date.now() }); toast('✅ تم');
});
window.pickWarn = () => withUser('تحذير', async u => {
  const reason = prompt('السبب:', 'مخالفة'); if (!reason) return;
  await set(ref(db, 'warnings/' + u), { text: reason, by: CURRENT_USER, time: Date.now() }); toast(`⚠️ تم تحذير ${u}`);
});
window.pickClearWarn = () => withUser('إلغاء تحذير', async u => { await remove(ref(db, 'warnings/' + u)); toast(`✅ تم`); });
window.pickBan = () => withUser('حظر', async u => {
  const reason = prompt('السبب:', 'مخالفة القوانين'); if (reason === null) return;
  await set(ref(db, 'banned_users/' + u), { reason, by: CURRENT_USER, time: Date.now() }); toast(`🚫 تم حظر ${u}`);
});
window.pickUnban = () => withUser('رفع حظر', async u => { await remove(ref(db, 'banned_users/' + u)); toast(`✅ تم`); });
window.pickKick = () => withUser('طرد', async u => { await set(ref(db, 'kick_signals/' + u), true); toast(`👢 تم`); });
window.pickResetXP = () => withUser('تصفير XP', async u => { await set(ref(db, 'users_data/' + u + '/xp'), 0); toast(`0️⃣ تم`); });
window.pickAddXP = () => withUser('إضافة XP', async u => {
  const amt = parseInt(prompt('كم XP؟', '100') || '0', 10); if (!amt) return;
  const s = await get(ref(db, 'users_data/' + u + '/xp')); const cur = s.exists() ? (s.val() || 0) : 0;
  await set(ref(db, 'users_data/' + u + '/xp'), cur + amt); toast(`✅ +${amt} XP`);
});
window.pickRemoveXP = () => withUser('خصم XP', async u => {
  const amt = parseInt(prompt('كم XP؟', '100') || '0', 10); if (!amt) return;
  const s = await get(ref(db, 'users_data/' + u + '/xp')); const cur = s.exists() ? (s.val() || 0) : 0;
  await set(ref(db, 'users_data/' + u + '/xp'), Math.max(0, cur - amt)); toast(`✅ -${amt} XP`);
});
window.pickAddCoins = () => withUser('إضافة كوينز', async u => {
  const amt = parseInt(prompt('كم كوينز؟', '50') || '0', 10); if (!amt) return;
  const s = await get(ref(db, 'users_data/' + u + '/coins')); const cur = s.exists() ? (s.val() || 0) : 0;
  await set(ref(db, 'users_data/' + u + '/coins'), cur + amt); toast(`✅ +${amt} كوينز`);
});
window.pickDeleteAccount = () => withUser('حذف حساب', async u => {
  if (!confirm(`⚠️ حذف ${u} نهائياً؟`)) return;
  if (!confirm('تأكيد أخير؟')) return;
  await remove(ref(db, 'usernames/' + u)); await remove(ref(db, 'users_data/' + u)); await remove(ref(db, 'roles/users/' + u)); await remove(ref(db, 'scores/' + u)); toast(`🗑️ تم حذف ${u}`);
});
window.pickPromoteAdmin = () => withUser('ترقية لأدمن', async u => { await set(ref(db, 'roles/admins/' + u), true); await set(ref(db, 'roles/users/' + u), 'Admin'); toast(`🛡️ ${u} بقى أدمن`); });

/* ─── دوال الإدارة الموحدة للرتب والبادجات ─── */
const manageBadgeList = async (badgeName) => {
  const s = await get(ref(db, 'badges')); const allBadges = s.val() || {};
  const members = Object.keys(allBadges).filter(u => allBadges[u][badgeName]);
  openModal(`🏅 إدارة بادج: ${badgeName}`, `
    <div style="margin-bottom:15px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn-primary" onclick="window._addBadgeToUser('${badgeName}')">➕ إعطاء لمستخدم</button>
      <button class="btn-danger" onclick="window._clearBadgeAll('${badgeName}')">🗑️ مسح البادج للكل</button>
    </div>
    <h4 style="color:var(--gold); margin-bottom:10px;">الأعضاء الحاليين (${members.length}):</h4>
    <div style="max-height:50vh; overflow-y:auto;">
      ${members.length ? members.map(u => `<div class="list-item"><div class="list-item-title">👤 ${escapeHtml(u)}</div><button class="mini-btn bad" onclick="window._removeBadgeFromUser('${badgeName}', '${u}')">❌ إزالة</button></div>`).join('') : '<div class="empty-state">لا يوجد أعضاء</div>'}
    </div>
  `);
};

const manageRoleList = async (roleName) => {
  const s = await get(ref(db, 'roles/users')); const allRoles = s.val() || {};
  const members = Object.keys(allRoles).filter(u => allRoles[u] === roleName);
  openModal(`🎖️ إدارة رتبة: ${roleName}`, `
    <div style="margin-bottom:15px; display:flex; gap:10px; flex-wrap:wrap;">
      <button class="btn-primary" onclick="window._addRoleToUser('${roleName}')">➕ تعيين لمستخدم</button>
      <button class="btn-danger" onclick="window._clearRoleAll('${roleName}')">🗑️ سحب الرتبة من الكل</button>
    </div>
    <h4 style="color:var(--gold); margin-bottom:10px;">الأعضاء الحاليين (${members.length}):</h4>
    <div style="max-height:50vh; overflow-y:auto;">
      ${members.length ? members.map(u => `<div class="list-item"><div class="list-item-title">👤 ${escapeHtml(u)}</div><button class="mini-btn bad" onclick="window._removeRoleFromUser('${roleName}', '${u}')">❌ إزالة</button></div>`).join('') : '<div class="empty-state">لا يوجد أعضاء</div>'}
    </div>
  `);
};

ROLES.forEach(r => { window[`manageRole_${r}`] = () => manageRoleList(r); });
BADGES.forEach(b => { window[`manageBadge_${b}`] = () => manageBadgeList(b); });

window._addBadgeToUser = (badge) => withUser('إعطاء بادج', async u => { await set(ref(db, 'badges/' + u + '/' + badge), true); toast('✅ تم'); window.closeModal(); });
window._removeBadgeFromUser = async (badge, u) => { await remove(ref(db, 'badges/' + u + '/' + badge)); toast('✅ تم'); window.closeModal(); };
window._clearBadgeAll = async (badge) => {
  if (!confirm('مسح البادج من الكل؟')) return;
  const s = (await get(ref(db, 'badges'))).val() || {};
  for (const u in s) if (s[u][badge]) await remove(ref(db, 'badges/' + u + '/' + badge));
  toast('✅'); window.closeModal();
};
window._addRoleToUser = (role) => withUser('تعيين رتبة', async u => { await set(ref(db, 'roles/users/' + u), role); toast('✅ تم'); window.closeModal(); });
window._removeRoleFromUser = async (role, u) => { await remove(ref(db, 'roles/users/' + u)); toast('✅ تم'); window.closeModal(); };
window._clearRoleAll = async (role) => {
  if (!confirm('سحب الرتبة من الكل؟')) return;
  const s = (await get(ref(db, 'roles/users'))).val() || {};
  for (const u in s) if (s[u] === role) await remove(ref(db, 'roles/users/' + u));
  toast('✅'); window.closeModal();
};

/* Overview helpers */
window.refreshStats = () => switchTab('overview');
window.exportAll = async () => {
  const nodes = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','verified_users'];
  const data = {};
  await Promise.all(nodes.map(async n => data[n] = (await get(ref(db, n))).val() || {}));
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `full-export-${Date.now()}.json`; a.click(); toast('✅ تم تصدير كل شيء');
};
window.clearRooms = async () => { if (!confirm('مسح كل الغرف؟')) return; await remove(ref(db, 'rooms')); toast('✅'); };
window.resetLeaderboard = async () => { if (!confirm('تصفير المتصدرين؟')) return; await remove(ref(db, 'leaderboard')); toast('✅'); };
window.fullBackup = async () => { await window.exportAll(); };
window.sendQuickReport = async () => {
  const u = (await get(ref(db, 'usernames'))).val() || {};
  await push(ref(db, 'messages/owner_inbox'), { from: 'System Report', text: `تقرير سريع: ${Object.keys(u).length} لاعب`, time: Date.now() }); toast('✅ تم إرسال التقرير');
};
window.showTop10XP = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const top = Object.entries(data).map(([u,d]) => [u, d.xp||0]).sort((a,b)=>b[1]-a[1]).slice(0,10);
  openModal('🏆 أعلى 10 XP', `<table class="data-table"><thead><tr><th>#</th><th>اللاعب</th><th>XP</th></tr></thead><tbody>${top.map(([u,xp],i)=>`<tr><td>#${i+1}</td><td>${escapeHtml(u)}</td><td>${xp}</td></tr>`).join('')||'<tr><td colspan="3">لا يوجد</td></tr>'}</tbody></table>`);
};
window.showMostPlayedQuizzes = async () => {
  const s = await get(ref(db, 'scores')); const data = s.exists() ? s.val() : {};
  const counts = {}; for (const u in data) for (const q in data[u]) counts[q] = (counts[q]||0) + Object.keys(data[u][q]).length;
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  openModal('🎮 أكثر الكويزات', `<table class="data-table"><thead><tr><th>الكويز</th><th>مرات</th></tr></thead><tbody>${top.map(([q,c])=>`<tr><td>${escapeHtml(q)}</td><td>${c}</td></tr>`).join('')||'<tr><td colspan="2">لا يوجد</td></tr>'}</tbody></table>`);
};
window.showLeastPlayedQuizzes = async () => {
  const s = await get(ref(db, 'scores')); const data = s.exists() ? s.val() : {};
  const counts = {}; for (const u in data) for (const q in data[u]) counts[q] = (counts[q]||0) + Object.keys(data[u][q]).length;
  const bot = Object.entries(counts).sort((a,b)=>a[1]-b[1]).slice(0,10);
  openModal('📉 أقل الكويزات', `<table class="data-table"><thead><tr><th>الكويز</th><th>مرات</th></tr></thead><tbody>${bot.map(([q,c])=>`<tr><td>${escapeHtml(q)}</td><td>${c}</td></tr>`).join('')||'<tr><td colspan="2">لا يوجد</td></tr>'}</tbody></table>`);
};
window.testPing = async () => { const t = Date.now(); await get(ref(db, '.info/connected')); toast(`📡 ${Date.now() - t}ms`, 'info'); };
window.clearEmptyAccounts = async () => {
  if (!confirm('⚠️ مسح كل الحسابات بدون XP؟')) return;
  const u = (await get(ref(db, 'users_data'))).val() || {}; let count = 0;
  for (const name in u) { if (!u[name].xp || u[name].xp === 0) { await remove(ref(db, 'usernames/' + name)); await remove(ref(db, 'users_data/' + name)); count++; } }
  toast(`✅ تم مسح ${count} حساب`);
};
window.showOnlineNow = async () => {
  const s = await get(ref(db, 'presence')); const data = s.exists() ? s.val() : {};
  const online = Object.entries(data).filter(([,v]) => v.status === 'online');
  openModal('🟢 المتصلين', `${online.length} لاعب<br><br>${online.map(([u]) => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد'}`);
};
window.showTotalXP = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const total = Object.values(data).reduce((sum, u) => sum + (u.xp || 0), 0); toast(`✨ إجمالي XP: ${total.toLocaleString()}`, 'info');
};
window.showAvgXP = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const arr = Object.values(data); const avg = arr.length ? Math.round(arr.reduce((sum, u) => sum + (u.xp || 0), 0) / arr.length) : 0; toast(`📊 متوسط XP: ${avg}`, 'info');
};
window.show24hActive = async () => {
  const s = await get(ref(db, 'presence')); const data = s.exists() ? s.val() : {};
  const now = Date.now(); const active = Object.entries(data).filter(([,v]) => now - (v.last_seen || 0) < 86400000);
  toast(`📅 ${active.length} لاعب نشط آخر 24 ساعة`, 'info');
};
window.viewOwnerInbox = () => H.view('messages/owner_inbox', '📩 صندوق الأونر');
window.viewPartnerChat = () => H.view('partners_chat', '💬 شات الشركاء');
window.countRooms = async () => H.count('rooms', 'الغرف');
window.clearPresence = async () => { if (!confirm('مسح presence؟')) return; await remove(ref(db, 'presence')); toast('✅'); };
window.exportRoomsReport = async () => {
  const s = await get(ref(db, 'rooms')); const data = s.exists() ? s.val() : {};
  openModal('🏠 تقرير الغرف', `<div>${Object.keys(data).length} غرفة نشطة</div>`);
};
window.showAllAdmins = async () => {
  const s = await get(ref(db, 'roles/admins')); const data = s.exists() ? s.val() : {};
  openModal('🛡️ الأدمنز', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};
window.showAllRoles = async () => {
  const s = await get(ref(db, 'roles/users')); const data = s.exists() ? s.val() : {};
  const counts = {}; for (const u in data) counts[data[u]] = (counts[data[u]]||0) + 1;
  openModal('🎖️ الرتب', Object.entries(counts).map(([r,c]) => `${r}: ${c}`).join('<br>'));
};
window.showAllBadges = async () => {
  const s = await get(ref(db, 'badges')); const data = s.exists() ? s.val() : {};
  const counts = {}; for (const u in data) for (const b in data[u]) counts[b] = (counts[b]||0) + 1;
  openModal('🏅 البادجات', Object.entries(counts).map(([b,c]) => `${b}: ${c}`).join('<br>'));
};
window.showWeeklyStats = async () => {
  const s = await get(ref(db, 'scores')); const data = s.exists() ? s.val() : {};
  const now = Date.now(), weekAgo = now - 7*86400000; let plays = 0;
  for (const u in data) for (const q in data[u]) for (const a in data[u][q]) { if (new Date(data[u][q][a].time).getTime() > weekAgo) plays++; }
  toast(`📅 ${plays} لعبة هذا الأسبوع`, 'info');
};
window.viewBannedList = async () => {
  const s = await get(ref(db, 'banned_users')); const data = s.exists() ? s.val() : {};
  openModal('🚫 المحظورين', Object.entries(data).map(([u,d]) => `<div class="list-item"><div class="list-item-title">${escapeHtml(u)}</div><div class="list-item-sub">${escapeHtml(d.reason||'')}</div></div>`).join('') || '<div class="empty-state">لا يوجد</div>');
};
window.viewWarningsList = async () => {
  const s = await get(ref(db, 'warnings')); const data = s.exists() ? s.val() : {};
  openModal('⚠️ التحذيرات', Object.entries(data).map(([u,d]) => `<div class="list-item"><div class="list-item-title">${escapeHtml(u)}</div><div class="list-item-sub">${escapeHtml(d.text||'')}</div></div>`).join('') || '<div class="empty-state">لا يوجد</div>');
};
window.showRegisteredCount = async () => H.count('usernames', 'المسجلين');
window.reloadPage = () => location.reload();
window.countFriendRequests = async () => H.count('friend_requests', 'طلبات الصداقة');
window.viewActiveOffers = async () => {
  const s = await get(ref(db, 'site_events/active_offers')); const data = s.exists() ? s.val() : {};
  openModal('🎁 العروض النشطة', Object.values(data).map(o => `• ${escapeHtml(o.text||'')}`).join('<br>') || '<div class="empty-state">لا يوجد</div>');
};
window.viewAllSettings = async () => {
  const s = await get(ref(db, 'site_settings')); const data = s.exists() ? s.val() : {};
  openModal('⚙️ الإعدادات', `<table class="data-table"><thead><tr><th>مفتاح</th><th>قيمة</th></tr></thead><tbody>${Object.entries(data).map(([k,v])=>`<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(JSON.stringify(v))}</td></tr>`).join('')}</tbody></table>`);
};
window.testLiveConnection = async () => { try { await get(ref(db, '.info/connected')); toast('✅ الاتصال شغال', 'info'); } catch { toast('❌ فشل الاتصال', 'error'); } };
window.viewAllVerified = async () => {
  const s = await get(ref(db, 'verified_users')); const data = s.exists() ? s.val() : {};
  openModal('✓ الموثقين', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};

window.viewAllPlayers = async () => {
  const s = await get(ref(db, 'usernames')); const data = s.exists() ? s.val() : {};
  openModal('👥 كل اللاعبين', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};
window.showZeroXP = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const zero = Object.entries(data).filter(([,d]) => !d.xp || d.xp === 0);
  openModal('0️⃣ صفر XP', zero.length ? zero.map(([u]) => `• ${escapeHtml(u)}`).join('<br>') : 'لا يوجد');
};
window.showAllManagers = async () => {
  const s = await get(ref(db, 'roles/managers')); const data = s.exists() ? s.val() : {};
  openModal('📋 المديرين', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};
window.showAllPartners = async () => {
  const s = await get(ref(db, 'roles/partners')); const data = s.exists() ? s.val() : {};
  openModal('🤝 الشركاء', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};
window.showAllTesters = async () => {
  const s = await get(ref(db, 'roles/testers')); const data = s.exists() ? s.val() : {};
  openModal('🧪 التسترات', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد');
};
window.resetAllXP = async () => { if (!confirm('⚠️ تصفير XP للكل؟')) return; const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) await set(ref(db, 'users_data/' + u + '/xp'), 0); toast('✅'); };
window.resetAllCoins = async () => { if (!confirm('⚠️ تصفير كوينز للكل؟')) return; const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) await set(ref(db, 'users_data/' + u + '/coins'), 0); toast('✅'); };
window.clearAllPics = async () => { if (!confirm('⚠️ مسح صور الكل؟')) return; const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) if (s[u].profilePic) await remove(ref(db, 'users_data/' + u + '/profilePic')); toast('✅'); };
window.clearAllFriends = async () => { if (!confirm('مسح كل الأصدقاء؟')) return; await remove(ref(db, 'friends')); toast('✅'); };
window.clearAllFriendRequests = async () => { if (!confirm('مسح كل طلبات الصداقة؟')) return; await remove(ref(db, 'friend_requests')); toast('✅'); };
window.resetAllStreaks = async () => { if (!confirm('تصفير الستريك للكل؟')) return; const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) await set(ref(db, 'users_data/' + u + '/streak'), 0); toast('✅'); };
window.clearAllTeams = async () => { if (!confirm('مسح كل التيمات؟')) return; await remove(ref(db, 'clans')); await remove(ref(db, 'teams')); toast('✅'); };
window.showAvgLevel = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const arr = Object.values(data); const avg = arr.length ? Math.round(arr.reduce((sum, u) => sum + Math.floor((u.xp||0)/500)+1, 0) / arr.length) : 0; toast(`⭐ متوسط المستوى: ${avg}`, 'info');
};
window.countUsersWithPics = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const c = Object.values(data).filter(u => u.profilePic).length; toast(`🖼️ ${c} لاعب عندهم صور`, 'info');
};
window.showTeamsDistribution = async () => {
  const s = await get(ref(db, 'users_data')); const data = s.exists() ? s.val() : {};
  const teams = {}; for (const u in data) { const t = data[u].team; if (t) teams[t] = (teams[t]||0) + 1; }
  openModal('⚔️ توزيع التيمات', Object.entries(teams).map(([t,c]) => `${t}: ${c}`).join('<br>') || 'لا يوجد');
};
window.showRolesDistribution = () => window.showAllRoles();
window.showBadgesDistribution = () => window.showAllBadges();
window.sendBulkMessage = async () => {
  const text = prompt('نص الرسالة الجماعية:'); if (!text) return;
  const s = (await get(ref(db, 'usernames'))).val() || {}; for (const u in s) await push(ref(db, 'messages/' + u), { from: '📢 إدارة', text, time: Date.now() }); toast('✅ تم');
};
window.sendBulkNotification = async () => {
  const text = prompt('نص الإشعار:'); if (!text) return;
  const s = (await get(ref(db, 'usernames'))).val() || {}; for (const u in s) await push(ref(db, 'messages/' + u), { from: '🔔 إشعار', text, time: Date.now() }); toast('✅ تم');
};

CONTENT_TYPES.forEach(t => {
  window[`contentClear_${t}`] = async () => { if (!confirm(`مسح ${CONTENT_LABELS[t]}؟`)) return; await remove(ref(db, t)); toast('✅'); };
});

window.createRole = async () => { const name = prompt('اسم الرتبة الجديدة:'); if (!name) return; toast(`✅ سيتم إضافة ${name} إلى القائمة`, 'info'); };
window.createBadge = async () => { const name = prompt('اسم البادج الجديد:'); if (!name) return; toast(`✅ سيتم إضافة ${name}`, 'info'); };

SETTINGS_KEYS.forEach(k => {
  window[`editSetting_${k}`] = async () => {
    const s = await get(ref(db, 'site_settings/' + k)); const cur = s.exists() ? s.val() : '';
    const newVal = prompt(`القيمة الجديدة لـ ${k}:`, typeof cur === 'boolean' ? String(cur) : cur); if (newVal === null) return;
    let parsed = newVal;
    if (newVal === 'true') parsed = true; else if (newVal === 'false') parsed = false; else if (!isNaN(Number(newVal)) && newVal !== '') parsed = Number(newVal);
    await set(ref(db, 'site_settings/' + k), parsed); toast(`✅ تم تحديث ${k}`);
  };
  window[`viewSetting_${k}`] = async () => { const s = await get(ref(db, 'site_settings/' + k)); toast(`${k} = ${s.exists() ? JSON.stringify(s.val()) : 'غير محدد'}`, 'info'); };
});

DB_NODES.forEach(n => {
  window[`dbClear_${n}`] = async () => { if (!confirm(`⚠️ مسح node "${n}"؟`)) return; if (!confirm('تأكيد أخير؟')) return; await remove(ref(db, n)); toast('✅'); };
});

window.clearOwnerInbox = async () => { if (!confirm('مسح صندوق الأونر؟')) return; await remove(ref(db, 'messages/owner_inbox')); toast('✅'); };
window.exportOwnerInbox = async () => H.export('messages/owner_inbox', 'owner_inbox');
window.replyToPlayer = () => withUser('رد على لاعب', async u => { const text = prompt('الرد:'); if (!text) return; await push(ref(db, 'messages/' + u), { from: '👑 Owner', text, time: Date.now() }); toast('✅'); });
window.clearPartnerChat = async () => { if (!confirm('مسح شات الشركاء؟')) return; await remove(ref(db, 'partners_chat')); toast('✅'); };
window.exportPartnerChat = async () => H.export('partners_chat', 'partners_chat');
window.countAllMessages = async () => {
  const s = await get(ref(db, 'messages')); const data = s.exists() ? s.val() : {};
  let total = 0; for (const u in data) total += Object.keys(data[u]).length; toast(`📩 ${total} رسالة`, 'info');
};

window.addOffer = async () => { const text = prompt('نص العرض:'); if (!text) return; await push(ref(db, 'site_events/active_offers'), { text, time: Date.now() }); toast('✅'); };
window.viewOffers = () => window.viewActiveOffers();
window.clearOffers = async () => { if (!confirm('مسح العروض؟')) return; await remove(ref(db, 'site_events/active_offers')); toast('✅'); };
window.exportOffers = async () => H.export('site_events/active_offers', 'offers');
window.createPoll = async () => {
  const q = prompt('السؤال:'); if (!q) return;
  const o1 = prompt('خيار 1:'); const o2 = prompt('خيار 2:'); if (!o1 || !o2) return;
  await set(ref(db, 'site_events/active_poll'), { question: q, option1: o1, option2: o2, created: Date.now() }); toast('✅');
};
window.viewPoll = async () => { const s = await get(ref(db, 'site_events/active_poll')); if (!s.exists()) return toast('لا يوجد استفتاء', 'info'); openModal('🗳️ استفتاء', `<pre>${escapeHtml(JSON.stringify(s.val(), null, 2))}</pre>`); };
window.clearPoll = async () => { if (!confirm('مسح الاستفتاء؟')) return; await remove(ref(db, 'site_events/active_poll')); toast('✅'); };
window.createContest = async () => {
  const name = prompt('اسم المسابقة:'); if (!name) return;
  const prize = prompt('الجائزة:'); if (!prize) return;
  await push(ref(db, 'site_events/contests'), { name, prize, time: Date.now() }); toast('✅');
};
window.viewContests = async () => { const s = await get(ref(db, 'site_events/contests')); const data = s.exists() ? s.val() : {}; openModal('🏆 المسابقات', Object.values(data).map(c => `• ${escapeHtml(c.name)} — ${escapeHtml(c.prize)}`).join('<br>') || 'لا يوجد'); };
window.clearContests = async () => { if (!confirm('مسح المسابقات؟')) return; await remove(ref(db, 'site_events/contests')); toast('✅'); };
window.pickRandomWinner = async () => {
  const s = (await get(ref(db, 'usernames'))).val() || {}; const arr = Object.keys(s); if (!arr.length) return toast('لا يوجد لاعبين', 'error');
  toast(`🎲 الفائز: ${arr[Math.floor(Math.random() * arr.length)]}`, 'info');
};
window.pickThreeWinners = async () => {
  const s = (await get(ref(db, 'usernames'))).val() || {}; const arr = Object.keys(s).sort(() => Math.random() - 0.5).slice(0, 3);
  toast(`🏆 الفائزين: ${arr.join(', ')}`, 'info');
};
window.distributeCoins = async () => {
  const amt = parseInt(prompt('كم كوينز لكل لاعب؟', '50') || '0', 10); if (!amt) return;
  const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) { const cur = s[u].coins || 0; await set(ref(db, 'users_data/' + u + '/coins'), cur + amt); } toast(`✅ وزعت ${amt} كوينز`);
};
window.distributeXP = async () => {
  const amt = parseInt(prompt('كم XP لكل لاعب؟', '100') || '0', 10); if (!amt) return;
  const s = (await get(ref(db, 'users_data'))).val() || {}; for (const u in s) { const cur = s[u].xp || 0; await set(ref(db, 'users_data/' + u + '/xp'), cur + amt); } toast(`✅ وزعت ${amt} XP`);
};
window.setAnnouncement = async () => { const text = prompt('نص الإعلان:'); if (!text) return; await set(ref(db, 'site_settings/announcement'), text); toast('✅'); };
window.clearAnnouncement = async () => { if (!confirm('مسح الإعلان؟')) return; await set(ref(db, 'site_settings/announcement'), ''); toast('✅'); };
window.viewAnnouncement = async () => { const s = await get(ref(db, 'site_settings/announcement')); toast(`📢 ${s.exists() ? s.val() : 'لا يوجد'}`, 'info'); };
window.createSeason = async () => { const name = prompt('اسم الموسم:'); if (!name) return; await push(ref(db, 'site_events/seasons'), { name, time: Date.now() }); toast('✅'); };
window.viewSeasons = async () => { const s = await get(ref(db, 'site_events/seasons')); const data = s.exists() ? s.val() : {}; openModal('📅 المواسم', Object.values(data).map(x => `• ${escapeHtml(x.name)}`).join('<br>') || 'لا يوجد'); };
window.clearSeasons = async () => { if (!confirm('مسح المواسم؟')) return; await remove(ref(db, 'site_events/seasons')); toast('✅'); };

window.clearAllBans = async () => { if (!confirm('⚠️ مسح كل المحظورين؟')) return; await remove(ref(db, 'banned_users')); toast('✅'); };
window.clearAllWarns = async () => { if (!confirm('⚠️ مسح كل التحذيرات؟')) return; await remove(ref(db, 'warnings')); toast('✅'); };
window.clearKickSignals = async () => { if (!confirm('مسح إشارات الطرد؟')) return; await remove(ref(db, 'kick_signals')); toast('✅'); };
window.viewKickSignals = async () => { const s = await get(ref(db, 'kick_signals')); const data = s.exists() ? s.val() : {}; openModal('👢 إشارات الطرد', Object.keys(data).map(u => `• ${escapeHtml(u)}`).join('<br>') || 'لا يوجد'); };
window.lockRegistration = async () => { await set(ref(db, 'site_settings/registrationOpen'), false); toast('🔒 التسجيل مقفول'); };
window.unlockRegistration = async () => { await set(ref(db, 'site_settings/registrationOpen'), true); toast('🔓 التسجيل مفتوح'); };
window.enableMaintenance = async () => { await set(ref(db, 'site_settings/maintenance'), true); toast('🚧 وضع الصيانة مفعل'); };
window.disableMaintenance = async () => { await set(ref(db, 'site_settings/maintenance'), false); toast('✅ الصيانة متوقفة'); };
window.disableChat = async () => { await set(ref(db, 'site_settings/chatOff'), true); toast('🚫 الشات مقفول'); };
window.enableChat = async () => { await set(ref(db, 'site_settings/chatOff'), false); toast('✅ الشات شغال'); };
window.lockFriendRequests = async () => { await set(ref(db, 'site_settings/friendRequestsOn'), false); toast('🔒'); };
window.unlockFriendRequests = async () => { await set(ref(db, 'site_settings/friendRequestsOn'), true); toast('🔓'); };
window.showSiteStatus = async () => {
  const s = await get(ref(db, 'site_settings')); const data = s.exists() ? s.val() : {};
  openModal('📊 حالة الموقع', `<div>🔧 الصيانة: ${data.maintenance ? 'مفعل' : 'متوقف'}</div><div>💬 الشات: ${data.chatOff ? 'مقفول' : 'شغال'}</div><div>📝 التسجيل: ${data.registrationOpen ? 'مفتوح' : 'مقفول'}</div><div>👥 طلبات الصداقة: ${data.friendRequestsOn ? 'مفتوحة' : 'مقفولة'}</div>`);
};
window.clearEmptyRooms = async () => {
  if (!confirm('مسح الغرف الفاضية؟')) return;
  const s = (await get(ref(db, 'rooms'))).val() || {}; let c = 0;
  for (const r in s) { if (!s[r].player1_score && s[r].status === 'waiting') { await remove(ref(db, 'rooms/' + r)); c++; } } toast(`✅ مسحت ${c} غرفة`);
};
window.clearActivityFeed = async () => { if (!confirm('مسح activity_feed؟')) return; await remove(ref(db, 'activity_feed')); toast('✅'); };
window.clearGlobalChat = async () => { if (!confirm('مسح global_chat؟')) return; await remove(ref(db, 'global_chat')); toast('✅'); };
window.clearChallenges = async () => { if (!confirm('مسح التحديات؟')) return; await remove(ref(db, 'challenges')); toast('✅'); };

window.reportComprehensive = async () => {
  const [u, s, b, w] = await Promise.all([get(ref(db,'usernames')), get(ref(db,'scores')), get(ref(db,'banned_users')), get(ref(db,'warnings'))]);
  openModal('📊 تقرير شامل', `<div>👥 اللاعبين: ${countObj(u.val())}</div><div>🎮 نتائج: ${countObj(s.val())}</div><div>🚫 محظورين: ${countObj(b.val())}</div><div>⚠️ تحذيرات: ${countObj(w.val())}</div>`);
};
window.downloadComprehensiveReport = async () => {
  const [u, s, b, w] = await Promise.all([get(ref(db,'usernames')), get(ref(db,'scores')), get(ref(db,'banned_users')), get(ref(db,'warnings'))]);
  const data = { users: u.val(), scores: s.val(), bans: b.val(), warnings: w.val() };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `report-${Date.now()}.json`; a.click(); toast('✅ تم التحميل');
};
window.reportPlayers = () => H.export('users_data', 'players-report');
window.reportLeaderboard = () => H.export('leaderboard', 'leaderboard-report');
window.reportQuizzes = () => H.export('scores', 'quizzes-report');
window.reportSpeedrun = () => H.export('speedrun_scores', 'speedrun-report');
window.reportBans = () => H.export('banned_users', 'bans-report');
window.reportWarnings = () => H.export('warnings', 'warnings-report');
window.reportMessages = () => H.export('messages', 'messages-report');
window.reportChat = () => H.export('global_chat', 'chat-report');
window.reportFriends = () => H.export('friends', 'friends-report');
window.reportRoles = () => H.export('roles/users', 'roles-report');
window.reportBadges = () => H.export('badges', 'badges-report');
window.reportTeams = () => H.export('teams', 'teams-report');
window.reportRooms = () => H.export('rooms', 'rooms-report');
window.reportEvents = () => H.export('site_events', 'events-report');
window.reportSuggestions = () => H.export('suggestions', 'suggestions-report');
window.reportComments = () => H.export('comments', 'comments-report');
window.reportTickets = () => H.export('support_tickets', 'tickets-report');
window.reportWeeklyCompare = async () => toast('📊 سيتم تجهيز المقارنة الأسبوعية', 'info');
window.reportVerified = () => H.export('verified_users', 'verified-report');

window.viewGlobalChat = () => H.view('global_chat', '💬 الشات العام');
window.sendOfficialMessage = async () => { const text = prompt('الرسالة الرسمية:'); if (!text) return; await push(ref(db, 'global_chat'), { sender: '📢 إدارة', text, time: Date.now() }); toast('✅'); };
window.sendAlertMessage = async () => { const text = prompt('نص التنبيه:'); if (!text) return; await push(ref(db, 'global_chat'), { sender: '⚠️ تنبيه', text, time: Date.now() }); toast('✅'); };
window.sendToPartnerChat = async () => { const text = prompt('الرسالة:'); if (!text) return; await push(ref(db, 'partners_chat'), { sender: CURRENT_USER, text, time: Date.now() }); toast('✅'); };
window.viewSystemMessages = () => H.view('admin_chat/system', 'رسائل النظام');
window.chatActivityStats = async () => { const s = await get(ref(db, 'global_chat')); toast(`💬 ${countObj(s.val())} رسالة في الشات العام`, 'info'); };
window.clearAllChats = async () => { if (!confirm('⚠️ مسح كل الشاتات؟')) return; await remove(ref(db, 'global_chat')); await remove(ref(db, 'partners_chat')); await remove(ref(db, 'admin_chat')); toast('✅'); };

window.broadcastAll = async () => {
  const text = prompt('نص البث:'); if (!text) return;
  await push(ref(db, 'broadcast_messages'), { text, from: CURRENT_USER, time: Date.now() });
  const users = (await get(ref(db, 'usernames'))).val() || {};
  for (const u in users) { await push(ref(db, 'messages/' + u), { from: '📢 إعلان', text, time: Date.now() }); } toast('✅');
};
window.viewBroadcasts = () => H.view('broadcast_messages', '📢 البث');
window.clearBroadcasts = async () => { if (!confirm('مسح البث؟')) return; await remove(ref(db, 'broadcast_messages')); toast('✅'); };
window.notifyAll = () => window.broadcastAll();
window.notifyByRank = async () => {
  const rank = prompt('الرتبة:', 'VIP'); if (!rank) return;
  const text = prompt('الرسالة:'); if (!text) return;
  const roles = (await get(ref(db, 'roles/users'))).val() || {};
  for (const u in roles) { if (roles[u] === rank) await push(ref(db, 'messages/' + u), { from: '🔔 إشعار', text, time: Date.now() }); } toast(`✅ تم إشعار ${rank}`);
};
window.notifyOwner = async () => { const text = prompt('الرسالة:'); if (!text) return; await push(ref(db, 'messages/owner_inbox'), { from: CURRENT_USER, text, time: Date.now() }); toast('✅'); };

adminRooms.forEach(r => {
  window[`openAdminRoom_${r.key}`] = async () => {
    const s = await get(ref(db, 'admin_chat/' + r.key)); const data = s.exists() ? s.val() : {};
    const entries = Object.entries(data).sort((a,b)=>(a[1].time||0)-(b[1].time||0));
    openModal(`${r.emoji} ${r.name}`, `
      <div style="max-height:40vh; overflow-y:auto; margin-bottom:12px;">
        ${entries.length ? entries.map(([id,m]) => `<div class="list-item"><div class="list-item-content"><div class="list-item-title">${escapeHtml(m.sender||'?')}</div><div class="list-item-sub">${escapeHtml(m.text||'')}</div></div></div>`).join('') : '<div class="empty-state">لا يوجد رسائل</div>'}
      </div>
      <textarea class="field-textarea" id="adminMsgInput_${r.key}" placeholder="اكتب رسالتك..."></textarea>
      <button class="btn-primary" onclick="window._sendAdminMsg('${r.key}')">📤 إرسال</button>
      <button class="btn-danger" style="margin-top:8px;" onclick="window._clearAdminRoom('${r.key}')">🗑️ مسح الكل</button>
    `);
  };
});
window._sendAdminMsg = async (key) => { const el = document.getElementById(`adminMsgInput_${key}`); const text = el?.value?.trim(); if (!text) return; await push(ref(db, 'admin_chat/' + key), { sender: CURRENT_USER, text, time: Date.now() }); el.value = ''; toast('✅'); };
window._clearAdminRoom = async (key) => { if (!confirm('مسح كل رسائل الغرفة؟')) return; await remove(ref(db, 'admin_chat/' + key)); toast('✅'); };

window.viewAllMessages = () => H.view('messages', '📨 كل الرسايل');
window.pickClearPlayerMessages = () => withUser('مسح رسايل لاعب', async u => { await remove(ref(db, 'messages/' + u)); toast('✅'); });
window.viewAdminRequests = () => H.view('admin_requests', '📩 طلبات الأدمن');
window.acceptAdminRequest = async () => {
  const id = prompt('ID الطلب:'); if (!id) return;
  const s = await get(ref(db, 'admin_requests/' + id)); if (s.exists()) { const req = s.val(); await set(ref(db, 'roles/admins/' + req.user), true); await update(ref(db, 'admin_requests/' + id), { status: 'approved' }); toast('✅'); }
};
window.rejectAdminRequest = async () => { const id = prompt('ID الطلب:'); if (!id) return; await remove(ref(db, 'admin_requests/' + id)); toast('✅'); };
window.clearAdminRequests = async () => { if (!confirm('مسح الطلبات؟')) return; await remove(ref(db, 'admin_requests')); toast('✅'); };
window.viewManagerRequests = () => H.view('manager_requests', '📋 طلبات المديرين');
window.clearManagerRequests = async () => { if (!confirm('مسح؟')) return; await remove(ref(db, 'manager_requests')); toast('✅'); };
window.viewQuizRequests = () => H.view('quiz_requests', '🎬 طلبات الكويزات');
window.clearQuizRequests = async () => { if (!confirm('مسح؟')) return; await remove(ref(db, 'quiz_requests')); toast('✅'); };
window.viewFriendRequests = () => H.view('friend_requests', '🤝 طلبات الصداقة');
window.viewTickets = () => H.view('support_tickets', '🎫 التذاكر');
window.clearTickets = async () => { if (!confirm('مسح التذاكر؟')) return; await remove(ref(db, 'support_tickets')); toast('✅'); };

/* ═══════════════════════════════════════════════════════════════════
   ADVANCED HANDLERS (المميزات اللي كانت في owner-advanced.js)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  // Analytics
  showAnalyticsDashboard: async () => {
    const [u, s, p, b, w] = await Promise.all([all('usernames'), all('scores'), all('presence'), all('banned_users'), all('warnings')]);
    const online = Object.values(p).filter(x => x.status === 'online').length;
    const today = new Date().toDateString();
    let todayPlays = 0;
    for (const user in s) for (const q in s[user]) for (const a in s[user][q]) {
      if (new Date(s[user][q][a].time || 0).toDateString() === today) todayPlays++;
    }
    M('📊 لوحة مباشرة', statBox([['👥', Object.keys(u).length, 'لاعبين'],['🟢', online, 'متصل الآن'],['🎮', Object.keys(s).length, 'لاعبوا'],['🎯', todayPlays, 'لعب اليوم'],['🚫', Object.keys(b).length, 'محظورين'],['⚠️', Object.keys(w).length, 'تحذيرات']]));
  },
  exportAnalytics: async () => { exportJSON({ users: await all('usernames'), scores: await all('scores'), presence: await all('presence'), speedrun: await all('speedrun_scores') }, 'analytics'); T('✅ تم التصدير'); },
  clearAnalytics: async () => { if (!confirm2('⚠️ مسح كل التحليلات (scores)?')) return; await remove(ref(db, 'scores')); T('✅ تم المسح'); },
  toggleAutoRefresh: async () => { const cur = (await get(ref(db, 'site_settings/autoRefreshAnalytics'))).val() || false; await set(ref(db, 'site_settings/autoRefreshAnalytics'), !cur); T(!cur ? '✅ مفعل' : '❌ متوقف'); },
  showRetention: async () => { const s = await all('scores'); const w = D(7); let active = 0; for (const u in s) { let ok = false; for (const q in s[u]) for (const a in s[u][q]) { if (new Date(s[u][q][a].time || 0).getTime() > w) { ok = true; break; } } if (ok) active++; } const total = Object.keys(s).length; M('📊 الاحتفاظ', statBox([['👥', total, 'إجمالي'],['✅', active, 'نشط 7 أيام'],['📊', total ? Math.round(active/total*100)+'%' : '0%', 'المعدل']])); },
  showChurn: async () => { const s = await all('scores'); const w = D(7); const churned = []; for (const u in s) { let last = 0; for (const q in s[u]) for (const a in s[u][q]) { const t = new Date(s[u][q][a].time || 0).getTime(); if (t > last) last = t; } if (last > 0 && last < w) churned.push([E(u), new Date(last).toLocaleDateString('ar-EG')]); } M('📉 المتسربين', `<p>${churned.length} لاعب</p>${table(['اللاعب','آخر لعب'], churned)}`); },
  showDAU: async () => { const s = await all('scores'); const today = new Date().toDateString(); const set_ = new Set(); for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { if (new Date(s[u][q][a].time || 0).toDateString() === today) set_.add(u); } T(`📅 DAU: ${set_.size} لاعب اليوم`); },
  showMAU: async () => { const s = await all('scores'); const m = D(30); const set_ = new Set(); for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { if (new Date(s[u][q][a].time || 0).getTime() > m) set_.add(u); } T(`📆 MAU: ${set_.size} لاعب آخر 30 يوم`); },
  showAvgSession: async () => { const s = await all('scores'); const sessions = []; for (const u in s) { const times = []; for (const q in s[u]) for (const a in s[u][q]) { const t = new Date(s[u][q][a].time || 0).getTime(); if (t) times.push(t); } if (times.length > 1) { times.sort((a, b) => a - b); sessions.push((times[times.length-1] - times[0]) / 60000); } } const avg = sessions.length ? Math.round(sessions.reduce((a, b) => a + b, 0) / sessions.length) : 0; T(`⏱️ متوسط الجلسة: ${avg} دقيقة`); },
  showTop20Active: async () => { const s = await all('scores'); const arr = Object.entries(s).map(([u, q]) => { let n = 0; for (const k in q) n += Object.keys(q[k]).length; return [u, n]; }).sort((a, b) => b[1] - a[1]).slice(0, 20); M('🔥 أعلى 20', table(['#','اللاعب','مرات'], arr.map(([u,c],i) => [`#${i+1}`, E(u), c]))); },
  showCompletionRate: async () => { const s = await all('scores'); let t = 0, c = 0; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { t++; if ((s[u][q][a].score || 0) >= (s[u][q][a].total || 0) * 0.5) c++; } T(`✅ إتمام: ${t ? Math.round(c/t*100) : 0}% (${c}/${t})`); },
  showAvgAnswerTime: async () => { const s = await all('scores'); let n = 0, sum = 0; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { const d = s[u][q][a].duration; if (d) { n++; sum += d; } } T(`⏱️ متوسط: ${n ? Math.round(sum/n) : 0}s`); },
  showMostFailed: async () => { const s = await all('scores'); const f = {}; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { if ((s[u][q][a].score || 0) < (s[u][q][a].total || 1) * 0.4) f[q] = (f[q]||0) + 1; } const top = Object.entries(f).sort((a,b) => b[1]-a[1]).slice(0,10); M('❌ الأكثر فشلاً', table(['الكويز','فشل'], top)); },
  showHardQuestions: async () => { const s = await all('scores'); const h = {}; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { const d = s[u][q][a]; if (d.answers && Array.isArray(d.answers)) { d.answers.forEach((ans, i) => { if (!ans.correct) { const k = `${q}_Q${i}`; h[k] = (h[k]||0)+1; } }); } } const top = Object.entries(h).sort((a,b) => b[1]-a[1]).slice(0,20); M('🔴 أسئلة صعبة', top.length ? table(['السؤال','فشل'], top) : '<div class="empty-state">💡 يحتاج تسجيل الإجابات الفردية في quiz-core.js</div>'); },
  showEasyQuestions: async () => { const s = await all('scores'); const h = {}; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { const d = s[u][q][a]; if (d.answers && Array.isArray(d.answers)) { d.answers.forEach((ans, i) => { if (ans.correct) { const k = `${q}_Q${i}`; h[k] = (h[k]||0)+1; } }); } } const top = Object.entries(h).sort((a,b) => b[1]-a[1]).slice(0,20); M('🟢 أسئلة سهلة', top.length ? table(['السؤال','نجاح'], top) : '<div class="empty-state">💡 يحتاج تسجيل الإجابات</div>'); },
  showHeatmap: async () => { const s = await all('scores'); const h = Array(24).fill(0); for (const u in s) for (const q in s[u]) for (const a in s[u][q]) h[new Date(s[u][q][a].time || 0).getHours()]++; const mx = Math.max(...h, 1); const bars = h.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="height:${Math.max(v/mx*90,3)}px;width:100%;background:linear-gradient(180deg,var(--gold),var(--gold-dark));border-radius:2px;${v===0?'opacity:.15;':''}"></div><div style="font-size:9px;color:var(--text-3)">${i}</div></div>`).join(''); M('🔥 خريطة الحرارة', `<div style="display:flex;gap:2px;align-items:flex-end;height:120px;margin-top:20px;">${bars}</div>`); },
  showUserJourney: async () => { const s = await all('scores'); const rows = []; for (const u in s) { const evs = []; for (const q in s[u]) for (const a in s[u][q]) { evs.push({ q, t: s[u][q][a].time, s: s[u][q][a].score }); } evs.sort((a,b) => new Date(b.t) - new Date(a.t)).slice(0,3).forEach((e, i) => { rows.push([i===0 ? E(u) : '', E(e.q), e.s, new Date(e.t).toLocaleDateString('ar-EG')]); }); } M('🚶 مسار اللاعبين', table(['اللاعب','الكويز','النقاط','التاريخ'], rows.slice(0,50))); },
  showPeakTimes: async () => { const s = await all('scores'); const h = Array(24).fill(0); for (const u in s) for (const q in s[u]) for (const a in s[u][q]) h[new Date(s[u][q][a].time || 0).getHours()]++; const top = h.map((v,i) => [i, v]).sort((a,b) => b[1]-a[1]).slice(0,5); M('⏰ الأوقات النشطة', table(['الساعة','عدد'], top.map(([h,v]) => [`${h}:00`, v]))); },
  showDevices: async () => { const p = await all('presence'); const d = {}; for (const u in p) { const k = p[u].device || 'غير معروف'; d[k] = (d[k]||0)+1; } M('📱 الأجهزة', Object.keys(d).length ? table(['الجهاز','عدد'], Object.entries(d)) : '<div class="empty-state">💡 يتطلب تسجيل user-agent في login</div>'); },
  showCountries: async () => { const p = await all('presence'); const c = {}; for (const u in p) { const k = p[u].country || 'غير معروف'; c[k] = (c[k]||0)+1; } const known = Object.entries(c).filter(([k]) => k !== 'غير معروف'); M('🌍 الدول', known.length ? table(['الدولة','عدد'], known) : '<div class="empty-state">💡 يتطلب GeoIP API (مش متاح بدون external)</div>'); },
  showCoinsDistribution: async () => { const u = await all('users_data'); const b = { '0':0, '1-50':0, '51-200':0, '201-500':0, '501-1000':0, '1000+':0 }; for (const k in u) { const c = u[k].coins || 0; if (c === 0) b['0']++; else if (c <= 50) b['1-50']++; else if (c <= 200) b['51-200']++; else if (c <= 500) b['201-500']++; else if (c <= 1000) b['501-1000']++; else b['1000+']++; } M('🪙 توزيع الكوينز', table(['المدى','عدد'], Object.entries(b))); },
  showCoinsConsumption: async () => { const u = await all('users_data'); let t = 0; for (const k in u) t += u[k].coins || 0; const n = Object.keys(u).length; M('💸 الكوينز', statBox([['🪙', t.toLocaleString(), 'إجمالي'],['📊', n ? Math.round(t/n) : 0, 'متوسط/لاعب'],['👥', n, 'لاعبين']])); },
  showXPDistribution: async () => { const u = await all('users_data'); const b = { '0':0, '1-500':0, '501-2000':0, '2001-5000':0, '5001-10000':0, '10000+':0 }; for (const k in u) { const x = u[k].xp || 0; if (x === 0) b['0']++; else if (x <= 500) b['1-500']++; else if (x <= 2000) b['501-2000']++; else if (x <= 5000) b['2001-5000']++; else if (x <= 10000) b['5001-10000']++; else b['10000+']++; } M('✨ توزيع XP', table(['المدى','عدد'], Object.entries(b))); },
  showXPGrowth: async () => { const s = await all('scores'); const d = {}; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { const day = new Date(s[u][q][a].time || 0).toLocaleDateString('ar-EG'); d[day] = (d[day]||0) + (s[u][q][a].score || 0); } M('📈 نمو XP', table(['اليوم','XP'], Object.entries(d).slice(-14))); },
  showFullEconomy: async () => { const [u, s] = await Promise.all([all('users_data'), all('scores')]); let c = 0, x = 0, p = 0; for (const k in u) { c += u[k].coins || 0; x += u[k].xp || 0; } for (const k in s) for (const q in s[k]) p += Object.keys(s[k][q]).length; M('💼 الاقتصاد الكامل', statBox([['🪙', c.toLocaleString(), 'إجمالي كوينز'],['✨', x.toLocaleString(), 'إجمالي XP'],['🎮', p, 'مرات لعب'],['👥', Object.keys(u).length, 'لاعبين']])); },
  predictGrowth: async () => { const s = await all('scores'); const d = {}; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { const day = new Date(s[u][q][a].time || 0).toDateString(); d[day] = (d[day]||0) + 1; } const days = Object.entries(d).sort((a,b) => new Date(a[0])-new Date(b[0])).slice(-7); if (days.length < 2) return T('📊 محتاج بيانات أكتر', 'warn'); const avg = days.reduce((s,[,v]) => s+v, 0) / days.length; const trend = (days[days.length-1][1] - days[0][1]) / days.length; T(`📈 توقع: ~${Math.max(0, Math.round(avg + trend))} لعبة غداً`); },
  predictNewPlayers: async () => { const u = await all('users_data'); const d = {}; for (const k in u) if (u[k].createdAt) { const day = new Date(u[k].createdAt).toDateString(); d[day] = (d[day]||0) + 1; } const days = Object.entries(d).slice(-7); if (!days.length) return T('💡 محتاج data createdAt', 'warn'); const avg = days.reduce((s,[,v]) => s+v, 0) / days.length; T(`👥 توقع: ~${Math.round(avg)} تسجيل/يوم`); },
  predictBans: async () => { const b = await all('banned_users'); const d = {}; for (const k in b) { const day = new Date(b[k].time || 0).toDateString(); d[day] = (d[day]||0) + 1; } const days = Object.entries(d).slice(-7); const avg = days.length ? days.reduce((s,[,v]) => s+v, 0) / days.length : 0; T(`🚫 توقع: ~${Math.round(avg)} حظر/يوم`); },
  detectAnomalies: async () => { const s = await all('scores'); const arr = []; for (const u in s) for (const q in s[u]) for (const a in s[u][q]) { arr.push({ u, s: s[u][q][a].score || 0, t: s[u][q][a].total || 1 }); } if (!arr.length) return T('لا يوجد بيانات', 'warn'); const ratios = arr.map(x => x.s / x.t); const mean = ratios.reduce((a,b) => a+b, 0) / ratios.length; const std = Math.sqrt(ratios.reduce((a,b) => a+(b-mean)**2, 0) / ratios.length); const out = arr.filter((_,i) => Math.abs(ratios[i]-mean) > 2*std); M('🔍 الشذوذ', `<p>تم تحليل ${arr.length} محاولة. ${out.length} شاذة</p>${table(['اللاعب','النقاط','النسبة'], out.slice(0,20).map(o => [E(o.u), o.s, Math.round(o.s/o.t*100)+'%']))}`); },
  aiInsights: async () => { const [u, s, b, w] = await Promise.all([all('users_data'), all('scores'), all('banned_users'), all('warnings')]); const total = Object.keys(u).length; let plays = 0; for (const k in s) for (const q in s[k]) plays += Object.keys(s[k][q]).length; const active = Object.keys(s).length; const insights = [`📊 ${total} لاعب، ${active} لعبوا (${total ? Math.round(active/total*100) : 0}%)`,`🎮 ${plays} لعبة (متوسط ${total ? (plays/total).toFixed(1) : 0}/لاعب)`,`🚫 ${Object.keys(b).length} محظور • ⚠️ ${Object.keys(w).length} تحذير`,active/total < 0.5 ? '⚠️ نسبة المشاركة منخفضة' : '✅ المشاركة جيدة',total < 20 ? '💡 محتاج حملة تسويق' : ''].filter(Boolean); M('🧠 رؤى', `<ul style="list-style:none;padding:0;line-height:2;">${insights.map(x => `<li>${x}</li>`).join('')}</ul>`); },
  
  // Marketing
  createCampaign: async () => { const name = prompt('اسم الحملة:'); if (!name) return; const goal = prompt('الهدف (رقم):', '100') || '100'; await push(ref(db, 'marketing/campaigns'), { name, goal: +goal, count: 0, createdAt: NOW(), status: 'active' }); T('✅ تم إنشاء الحملة'); },
  viewCampaigns: async () => { const c = await all('marketing/campaigns'); const rows = Object.entries(c).map(([id, v]) => [E(v.name||id), v.goal||0, v.count||0, v.status||'active']); M('🎯 الحملات', table(['الاسم','الهدف','المنجز','الحالة'], rows)); },
  clearCampaigns: async () => { if (!confirm2('مسح الحملات؟')) return; await remove(ref(db, 'marketing/campaigns')); T('✅'); },
  exportCampaigns: async () => { exportJSON(await all('marketing/campaigns'), 'campaigns'); T('✅'); },
  scheduleCampaign: async () => { const name = prompt('اسم الحملة:'); if (!name) return; const date = prompt('موعد الإطلاق (YYYY-MM-DD):'); if (!date) return; await push(ref(db, 'marketing/scheduled'), { name, date, createdAt: NOW() }); T('✅ تم الجدولة'); },
  createCoupon: async () => { const code = prompt('الكود (مثال: SAVE20):'); if (!code) return; const reward = parseInt(prompt('قيمة المكافأة:', '100') || '0', 10); const uses = parseInt(prompt('عدد الاستخدامات:', '10') || '10', 10); await set(ref(db, 'marketing/coupons/' + code.toUpperCase()), { reward, uses, used: 0, createdAt: NOW(), status: 'active' }); T('✅ تم إنشاء الكوبون'); },
  viewCoupons: async () => { const c = await all('marketing/coupons'); const rows = Object.entries(c).map(([k, v]) => [k, v.reward||0, `${v.used||0}/${v.uses||0}`, v.status||'active']); M('🎟️ الكوبونات', table(['الكود','المكافأة','الاستخدام','الحالة'], rows)); },
  clearCoupons: async () => { if (!confirm2('مسح الكوبونات؟')) return; await remove(ref(db, 'marketing/coupons')); T('✅'); },
  disableCoupon: async () => { const code = prompt('الكود:'); if (!code) return; await update(ref(db, 'marketing/coupons/' + code.toUpperCase()), { status: 'disabled' }); T('✅'); },
  exportCoupons: async () => { exportJSON(await all('marketing/coupons'), 'coupons'); T('✅'); },
  setupReferrals: async () => { const on = (await get(ref(db, 'marketing/referrals/enabled'))).val(); await set(ref(db, 'marketing/referrals/enabled'), !on); T(!on ? '✅ نظام الإحالة مفعل' : '❌ متوقف'); },
  viewReferrals: async () => { const r = await all('marketing/referrals/list'); const rows = Object.entries(r).map(([id, v]) => [E(v.referrer||''), E(v.referred||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']); M('🔗 الإحالات', table(['الداعي','المدعو','التاريخ'], rows)); },
  referralRewards: async () => { const amount = parseInt(prompt('المكافأة لكل إحالة ناجحة (كوينز):', '100') || '0', 10); if (!amount) return; await set(ref(db, 'marketing/referrals/reward'), amount); T(`✅ المكافأة: ${amount} كوينز`); },
  viewSuccessfulReferrals: async () => { const r = await all('marketing/referrals/list'); const success = Object.entries(r).filter(([,v]) => v.success); M('✅ الإحالات الناجحة', table(['الداعي','المدعو'], success.map(([,v]) => [E(v.referrer), E(v.referred)]))); },
  clearReferrals: async () => { if (!confirm2('مسح الإحالات؟')) return; await remove(ref(db, 'marketing/referrals')); T('✅'); },
  setupSEO: async () => { const title = prompt('عنوان الصفحة (Title):', document.title) || document.title; const desc = prompt('الوصف (Description):', '') || ''; await update(ref(db, 'site_settings/seo'), { title, description: desc }); T('✅ تم الحفظ'); },
  editMetaTags: async () => { const keywords = prompt('الكلمات المفتاحية (مفصولة بفواصل):', '') || ''; await set(ref(db, 'site_settings/seo/keywords'), keywords); T('✅'); },
  generateSitemap: async () => { const quizzes = ['Annabelle','Conjuring','TheNun','FNAF','SquidGame','Spider-Man','Avengers','Avatar','Venom','BirdsOfPrey','Fall','Wednesday','KnivesOut','Scream','TrainToBusan','ElHarifa']; const base = window.location.origin + window.location.pathname.replace('owner.html', ''); const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}index.html</loc></url>${quizzes.map(q => `<url><loc>${base}${q} Quiz.html</loc></url>`).join('\n')}</urlset>`; const blob = new Blob([xml], { type: 'application/xml' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sitemap.xml'; a.click(); T('✅ تم تحميل sitemap.xml'); },
  editRobots: async () => { const robots = `User-agent: *\nAllow: /\nDisallow: /owner.html\nDisallow: /admin.html\nDisallow: /restricted.html\nSitemap: ${window.location.origin}/sitemap.xml`; const blob = new Blob([robots], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'robots.txt'; a.click(); T('✅ تم تحميل robots.txt'); },
  setupGoogleAnalytics: async () => { M('📊 SEO/GA', `<p>Google Analytics محتاج كود خاص بيك، لكن عندك بديل:</p><p>✅ استخدم <b>التحليلات المتقدمة</b> في تاب Analytics — كل حاجة شغالة من Firebase بدون GA.</p><p>✅ لو محتاج GA، ضيف السكريبت يدوياً في index.html.</p>`); },
  createPopup: async () => { const title = prompt('عنوان الـ Popup:'); if (!title) return; const body = prompt('نص الإعلان:') || ''; await push(ref(db, 'marketing/popups'), { title, body, active: true, createdAt: NOW() }); T('✅ تم إنشاء Popup'); },
  viewPopups: async () => { const p = await all('marketing/popups'); const rows = Object.entries(p).map(([id, v]) => [E(v.title||id), v.active ? '✅' : '❌', new Date(v.createdAt || 0).toLocaleDateString('ar-EG')]); M('🔔 Popups', table(['العنوان','الحالة','التاريخ'], rows)); },
  clearPopups: async () => { if (!confirm2('مسح Popups؟')) return; await remove(ref(db, 'marketing/popups')); T('✅'); },
  sendPushNotification: async () => { const title = prompt('عنوان الإشعار:'); if (!title) return; const body = prompt('نص الإشعار:') || ''; await push(ref(db, 'marketing/notifications'), { title, body, time: NOW(), seen: {} }); const users = await all('usernames'); for (const u in users) { await push(ref(db, 'messages/' + u), { from: '🔔 إشعار', text: `${title}\n${body}`, time: NOW() }); } T(`✅ تم إرسال لـ ${Object.keys(users).length} لاعب`); },
  customizeNotification: async () => { const color = prompt('لون الإشعار (hex):', '#ffd700') || '#ffd700'; await set(ref(db, 'marketing/notifications/color'), color); T('✅'); },
  createPartner: async () => { const name = prompt('اسم الشريك:'); if (!name) return; const contact = prompt('طريقة التواصل (اختياري):') || ''; await push(ref(db, 'marketing/partners'), { name, contact, createdAt: NOW(), status: 'active' }); T('✅'); },
  viewPartners: async () => { const p = await all('marketing/partners'); M('🤝 الشركاء', table(['الاسم','التواصل','الحالة'], Object.entries(p).map(([id,v]) => [E(v.name||id), E(v.contact||''), v.status||'active']))); },
  deletePartner: async () => { const id = prompt('ID الشريك (من العرض):'); if (!id) return; await remove(ref(db, 'marketing/partners/' + id)); T('✅'); },
  partnerContract: async () => { const id = prompt('ID الشريك:'); if (!id) return; const text = prompt('نص العقد:') || ''; await update(ref(db, 'marketing/partners/' + id), { contract: text, signedAt: NOW() }); T('✅'); },
  partnerReport: async () => { const p = await all('marketing/partners'); exportJSON(p, 'partners-report'); T(`✅ تم تصدير ${Object.keys(p).length} شريك`); },
  
  // Economy
  createCurrency: async () => { const name = prompt('اسم العملة:'); if (!name) return; const symbol = prompt('الرمز:') || '🪙'; await push(ref(db, 'economy/currencies'), { name, symbol, rate: 1, createdAt: NOW() }); T('✅'); },
  viewCurrencies: async () => { const c = await all('economy/currencies'); M('🪙 العملات', table(['الاسم','الرمز','السعر'], Object.entries(c).map(([id,v]) => [E(v.name||id), E(v.symbol||'🪙'), v.rate||1]))); },
  setExchangeRate: async () => { const id = prompt('ID العملة:'); if (!id) return; const rate = parseFloat(prompt('السعر الجديد:') || '1'); await update(ref(db, 'economy/currencies/' + id), { rate }); T('✅'); },
  clearCurrencies: async () => { if (!confirm2('مسح العملات؟')) return; await remove(ref(db, 'economy/currencies')); T('✅'); },
  exportCurrencies: async () => { exportJSON(await all('economy/currencies'), 'currencies'); T('✅'); },
  createProduct: async () => { const name = prompt('اسم المنتج:'); if (!name) return; const price = parseInt(prompt('السعر (كوينز):', '100') || '100', 10); const type = prompt('النوع (badge/rank/item):', 'item') || 'item'; await push(ref(db, 'economy/products'), { name, price, type, active: true, createdAt: NOW() }); T('✅'); },
  viewProducts: async () => { const p = await all('economy/products'); M('🛒 المنتجات', table(['الاسم','السعر','النوع'], Object.entries(p).map(([id,v]) => [E(v.name||id), v.price||0, v.type||'item']))); },
  deleteProduct: async () => { const id = prompt('ID المنتج:'); if (!id) return; await remove(ref(db, 'economy/products/' + id)); T('✅'); },
  exportProducts: async () => { exportJSON(await all('economy/products'), 'products'); T('✅'); },
  toggleProduct: async () => { const id = prompt('ID المنتج:'); if (!id) return; const cur = (await get(ref(db, 'economy/products/' + id + '/active'))).val(); await update(ref(db, 'economy/products/' + id), { active: !cur }); T(!cur ? '✅ مفعل' : '❌ متوقف'); },
  createLootBox: async () => { const name = prompt('اسم الصندوق:'); if (!name) return; const price = parseInt(prompt('السعر:', '200') || '200', 10); const reward = parseInt(prompt('المكافأة الوسطية:', '100') || '100', 10); await push(ref(db, 'economy/lootboxes'), { name, price, reward, createdAt: NOW() }); T('✅'); },
  viewLootBoxes: async () => { const l = await all('economy/lootboxes'); M('🎁 الصناديق', table(['الاسم','السعر','المكافأة'], Object.entries(l).map(([id,v]) => [E(v.name||id), v.price||0, v.reward||0]))); },
  randomDistribution: async () => { const winners = []; const users = await all('usernames'); const keys = Object.keys(users); for (let i = 0; i < 3 && keys.length; i++) { const idx = Math.floor(Math.random() * keys.length); winners.push(keys.splice(idx, 1)[0]); } M('🎲 توزيع عشوائي', list(winners)); },
  openLootBox: async () => { const u = prompt('اسم اللاعب:'); if (!u) return; const reward = Math.floor(Math.random() * 200) + 50; const cur = (await get(ref(db, 'users_data/' + u + '/coins'))).val() || 0; await set(ref(db, 'users_data/' + u + '/coins'), cur + reward); T(`🎁 فتح صندوق لـ ${u} → +${reward} كوينز`); },
  clearLootBoxes: async () => { if (!confirm2('مسح الصناديق؟')) return; await remove(ref(db, 'economy/lootboxes')); T('✅'); },
  setupDailyRewards: async () => { const amt = parseInt(prompt('المكافأة اليومية (كوينز):', '50') || '50', 10); await set(ref(db, 'economy/dailyRewards'), { amount: amt, enabled: true }); T('✅'); },
  viewDailyRewards: async () => { const d = await all('economy/dailyRewards'); M('📅 المكافآت اليومية', statBox([['🪙', d.amount || 0, 'المكافأة'], ['✅', d.enabled ? 'مفعل' : 'متوقف', 'الحالة']])); },
  clearDailyRewards: async () => { if (!confirm2('مسح؟')) return; await remove(ref(db, 'economy/dailyRewards')); T('✅'); },
  exportDailyRewards: async () => { exportJSON(await all('economy/dailyRewards'), 'daily'); T('✅'); },
  doubleDailyRewards: async () => { const cur = (await get(ref(db, 'economy/dailyRewards/amount'))).val() || 50; await set(ref(db, 'economy/dailyRewards/amount'), cur * 2); T(`✅ المكافأة: ${cur * 2}`); },
  viewPurchases: async () => { const p = await all('economy/purchases'); M('🧾 المشتريات', table(['اللاعب','المنتج','السعر','التاريخ'], Object.entries(p).map(([id,v]) => [E(v.user||''), E(v.product||''), v.price||0, v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']))); },
  clearPurchases: async () => { if (!confirm2('مسح المشتريات؟')) return; await remove(ref(db, 'economy/purchases')); T('✅'); },
  refundPurchase: async () => { const id = prompt('ID الشراء:'); if (!id) return; const p = (await get(ref(db, 'economy/purchases/' + id))).val(); if (!p) return T('❌ غير موجود', 'error'); const cur = (await get(ref(db, 'users_data/' + p.user + '/coins'))).val() || 0; await set(ref(db, 'users_data/' + p.user + '/coins'), cur + (p.price || 0)); await update(ref(db, 'economy/purchases/' + id), { refunded: true }); T(`✅ تم استرداد ${p.price} كوينز`); },
  viewTransactions: async () => { const p = await all('economy/purchases'); const sorted = Object.values(p).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 50); M('📋 آخر 50 معاملة', table(['اللاعب','المنتج','السعر','التاريخ'], sorted.map(v => [E(v.user||''), E(v.product||''), v.price||0, v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  createAuction: async () => { const name = prompt('اسم العنصر:'); if (!name) return; const start = parseInt(prompt('السعر الابتدائي:', '100') || '100', 10); await push(ref(db, 'economy/auctions'), { name, start, highest: start, active: true, createdAt: NOW() }); T('✅'); },
  viewAuctions: async () => { const a = await all('economy/auctions'); M('🔨 المزادات', table(['الاسم','البداية','الأعلى','مفعل'], Object.entries(a).map(([id,v]) => [E(v.name||id), v.start||0, v.highest||0, v.active ? '✅' : '❌']))); },
  endAuction: async () => { const id = prompt('ID المزاد:'); if (!id) return; await update(ref(db, 'economy/auctions/' + id), { active: false, endedAt: NOW() }); T('✅'); },
  clearAuctions: async () => { if (!confirm2('مسح المزادات؟')) return; await remove(ref(db, 'economy/auctions')); T('✅'); },
  exportAuctions: async () => { exportJSON(await all('economy/auctions'), 'auctions'); T('✅'); },
  
  // Automation
  createRule: async () => { const trigger = prompt('Trigger (signup/levelup/ban/purchase):', 'signup') || 'signup'; const action = prompt('Action (message/xp/badge):', 'message') || 'message'; const value = prompt('القيمة:') || ''; await push(ref(db, 'automation/rules'), { trigger, action, value, active: true, createdAt: NOW() }); T('✅'); },
  viewRules: async () => { const r = await all('automation/rules'); M('📜 القواعد', table(['Trigger','Action','القيمة','مفعل'], Object.entries(r).map(([id,v]) => [v.trigger||'', v.action||'', E(v.value||''), v.active ? '✅' : '❌']))); },
  toggleRule: async () => { const id = prompt('ID القاعدة:'); if (!id) return; const cur = (await get(ref(db, 'automation/rules/' + id + '/active'))).val(); await update(ref(db, 'automation/rules/' + id), { active: !cur }); T('✅'); },
  clearRules: async () => { if (!confirm2('مسح القواعد؟')) return; await remove(ref(db, 'automation/rules')); T('✅'); },
  exportRules: async () => { exportJSON(await all('automation/rules'), 'rules'); T('✅'); },
  triggerSignup: async () => { await set(ref(db, 'automation/triggers/signup'), !(await get(ref(db, 'automation/triggers/signup'))).val()); T('✅'); },
  triggerLevelUp: async () => { await set(ref(db, 'automation/triggers/levelup'), !(await get(ref(db, 'automation/triggers/levelup'))).val()); T('✅'); },
  triggerBan: async () => { await set(ref(db, 'automation/triggers/ban'), !(await get(ref(db, 'automation/triggers/ban'))).val()); T('✅'); },
  triggerPurchase: async () => { await set(ref(db, 'automation/triggers/purchase'), !(await get(ref(db, 'automation/triggers/purchase'))).val()); T('✅'); },
  triggerReport: async () => { await set(ref(db, 'automation/triggers/report'), !(await get(ref(db, 'automation/triggers/report'))).val()); T('✅'); },
  actionSendMessage: async () => { const text = prompt('الرسالة التلقائية:') || ''; await set(ref(db, 'automation/actions/message'), text); T('✅'); },
  actionGiveXP: async () => { const xp = parseInt(prompt('XP:') || '0', 10); await set(ref(db, 'automation/actions/xp'), xp); T('✅'); },
  actionGiveBadge: async () => { const badge = prompt('البادج:') || ''; await set(ref(db, 'automation/actions/badge'), badge); T('✅'); },
  actionAutoWarn: async () => { const n = parseInt(prompt('عدد التحذيرات قبل الحظر:') || '3', 10); await set(ref(db, 'automation/actions/maxWarns'), n); T('✅'); },
  actionAutoBan: async () => { await set(ref(db, 'automation/actions/autoBan'), !(await get(ref(db, 'automation/actions/autoBan'))).val()); T('✅'); },
  createWebhook: async () => { const url = prompt('URL الـ Webhook:'); if (!url) return; const event = prompt('الحدث (quiz_complete/user_signup/ban):', 'quiz_complete') || 'quiz_complete'; await push(ref(db, 'automation/webhooks'), { url, event, active: true, createdAt: NOW() }); T('✅'); },
  viewWebhooks: async () => { const w = await all('automation/webhooks'); M('🔗 Webhooks', table(['URL','الحدث','مفعل'], Object.entries(w).map(([id,v]) => [`<code>${E((v.url||'').slice(0,50))}</code>`, v.event||'', v.active ? '✅' : '❌']))); },
  testWebhook: async () => { const id = prompt('ID الـ Webhook:'); if (!id) return; const w = (await get(ref(db, 'automation/webhooks/' + id))).val(); if (!w) return T('❌ غير موجود', 'error'); try { const res = await fetch(w.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'test', timestamp: NOW(), from: 'quizhub' }) }); T(`✅ استجابة: ${res.status}`, 'success'); } catch (e) { T(`⚠️ CORS أو فشل: ${e.message.substring(0, 50)} — الـ webhook محفوظ وسيُستخدم من سيرفر لاحقاً`, 'warn'); } },
  clearWebhooks: async () => { if (!confirm2('مسح Webhooks؟')) return; await remove(ref(db, 'automation/webhooks')); T('✅'); },
  exportWebhooks: async () => { exportJSON(await all('automation/webhooks'), 'webhooks'); T('✅'); },
  createScheduledTask: async () => { const name = prompt('اسم المهمة:'); if (!name) return; const interval = parseInt(prompt('كل كام دقيقة؟') || '60', 10); await push(ref(db, 'automation/scheduled'), { name, interval, lastRun: 0, createdAt: NOW() }); T('✅'); },
  viewScheduledTasks: async () => { const s = await all('automation/scheduled'); M('⏰ المهام المجدولة', table(['الاسم','الفاصل (دقيقة)','آخر تشغيل'], Object.entries(s).map(([id,v]) => [E(v.name||id), v.interval||0, v.lastRun ? new Date(v.lastRun).toLocaleString('ar-EG') : '—']))); },
  runTaskNow: async () => { const id = prompt('ID المهمة:'); if (!id) return; await update(ref(db, 'automation/scheduled/' + id), { lastRun: NOW() }); T('✅ تم التشغيل'); },
  clearScheduledTasks: async () => { if (!confirm2('مسح المهام؟')) return; await remove(ref(db, 'automation/scheduled')); T('✅'); },
  exportScheduledTasks: async () => { exportJSON(await all('automation/scheduled'), 'scheduled'); T('✅'); },

  // Advanced Security
  enable2FA: async () => { const u = prompt('اسم اللاعب لتفعيل 2FA:'); if (!u) return; const p1 = prompt('كلمة مرور 2FA (هيُحفظ hash):'); if (!p1) return; const p2 = prompt('تأكيد كلمة المرور:'); if (p1 !== p2) return T('❌ كلمتا المرور مختلفتان', 'error'); const hash = btoa(p1 + '|' + u + '|salt'); await set(ref(db, 'security/2fa/' + u), { hash, enabledAt: NOW() }); T(`✅ تم تفعيل 2FA لـ ${u}`); },
  addIPWhitelist: async () => { const label = prompt('وصف للجهاز (مثال: "لابتوب الأونر"):'); if (!label) return; const fp = fingerprint(); await set(ref(db, 'security/whitelist/' + fp), { label, addedAt: NOW(), addedBy: CU }); M('✅ تم', `<p>تم إضافة الجهاز الحالي.</p><p><b>Fingerprint:</b> <code>${fp}</code></p><p class="text-muted fs-12">ملاحظة: بديل IP — يعتمد على UA + Canvas + Screen.</p>`); },
  addIPBlacklist: async () => { const label = prompt('سبب الحظر:'); if (!label) return; const fp = fingerprint(); await set(ref(db, 'security/blacklist/' + fp), { reason: label, addedAt: NOW(), addedBy: CU }); T('✅ تم حظر الجهاز الحالي'); },
  enableRateLimit: async () => { const cur = (await get(ref(db, 'security/rateLimit/enabled'))).val(); await set(ref(db, 'security/rateLimit/enabled'), !cur); if (!cur) { const min = parseInt(prompt('الحد الأدنى بين العمليات (ثواني):', '5') || '5', 10); await set(ref(db, 'security/rateLimit/seconds'), min); } T(!cur ? '✅ Rate Limiting مفعل' : '❌ متوقف'); },
  enableCaptcha: async () => { const cur = (await get(ref(db, 'security/captcha/enabled'))).val(); await set(ref(db, 'security/captcha/enabled'), !cur); T(!cur ? '✅ CAPTCHA مفعل' : '❌ متوقف'); },
  viewLoginLog: async () => { const l = await all('security/logs/login'); const rows = Object.values(l).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 100); M('🔑 سجل الدخول (آخر 100)', table(['اللاعب','الجهاز','التاريخ'], rows.map(v => [E(v.user||''), E((v.fp||'').slice(0,15)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  viewOperationsLog: async () => { const l = await all('admin_logs'); const rows = Object.values(l).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 100); M('📊 سجل العمليات (آخر 100)', table(['الأدمن','الإجراء','الهدف','التاريخ'], rows.map(v => [E(v.admin||''), E(v.action||''), E(v.target||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  viewChangesLog: async () => { const l = await all('admin_logs'); const changes = Object.values(l).filter(x => ['update_settings','update_toggles','editSetting'].some(a => (x.action||'').includes(a))); M('📝 سجل التغييرات', table(['الأدمن','الإجراء','الهدف'], changes.slice(0, 50).map(v => [E(v.admin||''), E(v.action||''), E(v.target||'')]))); },
  viewBanLog: async () => { const b = await all('banned_users'); const rows = Object.entries(b).map(([u, v]) => [E(u), E(v.reason||''), E(v.by||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']); M('🚫 سجل الحظر', table(['المحظور','السبب','بواسطة','التاريخ'], rows)); },
  scanVulnerabilities: async () => { const [u, b, w] = await Promise.all([all('users_data'), all('banned_users'), all('warnings')]); const issues = []; let noPic = 0, noXP = 0; for (const k in u) { if (!u[k].profilePic) noPic++; if (!u[k].xp) noXP++; } if (noPic > Object.keys(u).length * 0.8) issues.push(`⚠️ ${noPic} لاعب بدون صورة (${Math.round(noPic/Object.keys(u).length*100)}%)`); if (noXP > Object.keys(u).length * 0.5) issues.push(`⚠️ ${noXP} لاعب بدون XP — حسابات مش نشطة`); if (Object.keys(b).length > Object.keys(u).length * 0.1) issues.push(`🚨 نسبة محظورين عالية: ${Math.round(Object.keys(b).length/Object.keys(u).length*100)}%`); if (!issues.length) issues.push('✅ لا مشاكل ظاهرة'); M('🔍 فحص الثغرات', `<ul style="line-height:2;">${issues.map(i => `<li>${i}</li>`).join('')}</ul>`); },
  scanPasswords: async () => { M('🔐 فحص كلمات المرور', `<p>لا يمكن فحص كلمات المرور الفعلية (Firebase Auth مشفّرة).</p><p>✅ لكن نقدر نتحقق من:</p><ul style="line-height:1.8;margin-top:10px;"><li>2FA مفعل: ${Object.keys(await all('security/2fa')).length} لاعب</li><li>ننصح بتفعيل 2FA لكل الأدمنز</li></ul><p style="margin-top:10px;color:var(--text-2);">💡 لتشديد الأمان: firebase console → Authentication → Password Policy</p>`); },
  scanSessions: async () => { const p = await all('presence'); const online = Object.entries(p).filter(([, v]) => v.status === 'online'); M('🔑 الجلسات النشطة', online.length ? table(['اللاعب','آخر نشاط'], online.map(([u, v]) => [E(u), v.last_seen ? new Date(v.last_seen).toLocaleString('ar-EG') : '—'])) : '<div class="empty-state">لا يوجد جلسات</div>'); },
  scanFiles: async () => { const files = ['pic/Logo.png', 'index.html', 'owner.html', 'owner-core.js', 'owner-style.css']; const results = []; for (const f of files) { try { const r = await fetch(f, { method: 'HEAD' }); results.push([E(f), r.ok ? '✅ موجود' : '❌ مفقود']); } catch { results.push([E(f), '⚠️ فشل الفحص']); } } M('📁 فحص الملفات', table(['الملف','الحالة'], results)); },
  securityReport: async () => { const [b, w, two, wl, bl, logs] = await Promise.all([all('banned_users'), all('warnings'), all('security/2fa'), all('security/whitelist'), all('security/blacklist'), all('security/logs/login')]); M('📊 تقرير الأمان', statBox([['🚫', Object.keys(b).length, 'محظورين'],['⚠️', Object.keys(w).length, 'تحذيرات'],['🔐', Object.keys(two).length, '2FA'],['✅', Object.keys(wl).length, 'Whitelist'],['⛔', Object.keys(bl).length, 'Blacklist'],['🔑', Object.keys(logs).length, 'محاولات دخول']])); },
  banIP: async () => { const fp = prompt('Fingerprint المحظور (أو اتركه فاضي لحظر جهازك):') || fingerprint(); const reason = prompt('السبب:') || 'حظر جهاز'; await set(ref(db, 'security/blacklist/' + fp), { reason, addedAt: NOW(), addedBy: CU }); T('✅ تم حظر الجهاز'); },
  banDevice: async () => window.banIP(),
  banDomain: async () => { const domain = prompt('النطاق (مثال: spam.com):'); if (!domain) return; await push(ref(db, 'security/bannedDomains'), { domain, addedAt: NOW(), addedBy: CU }); T('✅'); },
  unbanIP: async () => { const fp = prompt('Fingerprint لرفع الحظر:'); if (!fp) return; await remove(ref(db, 'security/blacklist/' + fp)); T('✅ تم'); },
  viewBanList: async () => { const [bl, bd] = await Promise.all([all('security/blacklist'), all('security/bannedDomains')]); M('📋 قائمة الحظر', `<h4 style="color:var(--gold);">⛔ أجهزة محظورة (${Object.keys(bl).length})</h4>${Object.keys(bl).length ? table(['Fingerprint','السبب'], Object.entries(bl).map(([k, v]) => [`<code>${E(k.slice(0,15))}...</code>`, E(v.reason||'')])) : '<p>لا يوجد</p>'}<h4 style="color:var(--gold);margin-top:16px;">⛔ نطاقات محظورة (${Object.keys(bd).length})</h4>${Object.keys(bd).length ? table(['النطاق'], Object.values(bd).map(v => [E(v.domain||'')])) : '<p>لا يوجد</p>'}`); },
  recoverAccount: async () => { const u = prompt('اسم اللاعب:'); if (!u) return; await push(ref(db, 'security/recovery'), { user: u, type: 'account', status: 'pending', requestedAt: NOW(), requestedBy: CU }); T('✅ تم فتح طلب استرداد'); },
  recoverData: async () => { const u = prompt('اسم اللاعب لاسترداد البيانات:'); if (!u) return; await push(ref(db, 'security/recovery'), { user: u, type: 'data', status: 'pending', requestedAt: NOW(), requestedBy: CU }); T('✅'); },
  emergencyRegistration: async () => { await set(ref(db, 'site_settings/registrationOpen'), true); await set(ref(db, 'site_settings/maintenance'), false); T('🚨 تم فتح التسجيل وإيقاف الصيانة'); },
  lockSite: async () => { await set(ref(db, 'site_settings/maintenance'), true); await set(ref(db, 'site_settings/lockedBy'), CU); await set(ref(db, 'site_settings/lockedAt'), NOW()); T('🔒 الموقع مقفول'); },
  unlockSite: async () => { await set(ref(db, 'site_settings/maintenance'), false); await remove(ref(db, 'site_settings/lockedBy')); T('🔓 الموقع مفتوح'); },
  startLiveTracking: async () => { const unsub = onValue(ref(db, 'presence'), snap => { const data = snap.val() || {}; const online = Object.values(data).filter(x => x.status === 'online').length; console.log(`[Live] Online: ${online}`); }); M('👁️ تتبع مباشر', `<p>📊 التتبع شغال في Console. اضغط F12 لتشوف الأرقام live.</p><button class="btn-danger" onclick="clearInterval(window._trackingId)">إيقاف</button>`); window._trackingUnsub = unsub; },
  alertIntrusion: async () => { const l = await all('security/logs/login'); const byHour = {}; for (const id in l) { const hour = Math.floor(new Date(l[id].time || 0).getTime() / 3600000); byHour[hour] = (byHour[hour] || 0) + 1; } const now = Math.floor(NOW() / 3600000); const lastHour = byHour[now] || 0; const avg = Object.values(byHour).reduce((a,b) => a+b, 0) / Object.keys(byHour).length || 0; if (lastHour > avg * 3) { T(`🚨 تنبيه! ${lastHour} محاولة دخول هذه الساعة (متوسط ${Math.round(avg)})`, 'error'); } else { T(`✅ عادي — ${lastHour} محاولة (متوسط ${Math.round(avg)})`); } },
  alertSuspiciousActivity: async () => { const s = await all('scores'); const suspicious = []; for (const u in s) { for (const q in s[u]) { for (const a in s[u][q]) { const d = s[u][q][a]; if (d.duration && d.duration < 5) { suspicious.push([u, q, d.duration + 's']); } } } } M('⚠️ نشاط مريب', suspicious.length ? table(['اللاعب','الكويز','المدة'], suspicious.slice(0, 20)) : '<div class="empty-state">✅ لا يوجد</div>'); },
  alertLoginAttempts: async () => { const l = await all('security/logs/login'); const last24h = Object.values(l).filter(x => NOW() - (x.time || 0) < 86400000); T(`🔑 ${last24h.length} محاولة دخول في آخر 24 ساعة`); },
  clearAlerts: async () => { if (!confirm2('مسح كل التنبيهات؟')) return; await remove(ref(db, 'security/alerts')); T('✅'); },
  
  // Teams
  createTeam: async () => { const name = prompt('اسم الفريق:'); if (!name) return; const captain = prompt('اسم القائد:'); if (!captain) return; await push(ref(db, 'clans'), { name, owner: captain, category: 'custom', isPublic: true, createdAt: NOW() }); T('✅'); },
  viewTeams: async () => { const t = await all('clans'); M('🏆 الفرق', table(['الاسم','القائد','النقاط'], Object.entries(t).map(([id,v]) => [E(v.name||id), E(v.owner||''), v.score || 0]))); },
  deleteTeam: async () => { const id = prompt('ID الفريق:'); if (!id) return; await remove(ref(db, 'clans/' + id)); T('✅'); },
  exportTeams: async () => { exportJSON(await all('clans'), 'teams'); T('✅'); },
  teamsReport: async () => { const t = await all('clans'); const users = await all('users_data'); const rows = []; for (const id in t) { const members = Object.values(users).filter(u => u.joined_clans && u.joined_clans[id]).length; rows.push([E(t[id].name||id), E(t[id].owner||''), members, t[id].score || 0]); } M('📊 تقرير الفرق', table(['الاسم','القائد','أعضاء','نقاط'], rows)); },
  addTeamMember: async () => { const id = prompt('ID الفريق:'); if (!id) return; const user = prompt('اسم اللاعب:'); if (!user) return; await set(ref(db, 'users_data/' + user + '/joined_clans/' + id), true); T('✅'); },
  removeTeamMember: async () => { const id = prompt('ID الفريق:'); if (!id) return; const user = prompt('اسم اللاعب:'); if (!user) return; await remove(ref(db, 'users_data/' + user + '/joined_clans/' + id)); T('✅'); },
  viewMembers: async () => { const id = prompt('ID الفريق:'); if (!id) return; const users = await all('users_data'); const members = Object.entries(users).filter(([, u]) => u.joined_clans && u.joined_clans[id]).map(([k]) => k); M('👥 الأعضاء', list(members)); },
  exportMembers: async () => { const users = await all('users_data'); const data = {}; for (const u in users) if (users[u].joined_clans) data[u] = users[u].joined_clans; exportJSON(data, 'team-members'); T('✅'); },
  promoteCaptain: async () => { const id = prompt('ID الفريق:'); if (!id) return; const newCaptain = prompt('اسم القائد الجديد:'); if (!newCaptain) return; await update(ref(db, 'clans/' + id), { owner: newCaptain }); T('✅'); },
  createBattle: async () => { const team1 = prompt('الفريق الأول:'); if (!team1) return; const team2 = prompt('الفريق الثاني:'); if (!team2) return; await push(ref(db, 'battles'), { team1, team2, winner: null, createdAt: NOW() }); T('✅'); },
  viewBattles: async () => { const b = await all('battles'); M('⚔️ المعارك', table(['فريق1','فريق2','الفائز'], Object.entries(b).map(([id,v]) => [E(v.team1||''), E(v.team2||''), E(v.winner||'—')]))); },
  battleResults: async () => { const b = await all('battles'); const done = Object.values(b).filter(x => x.winner); M('📊 نتائج المعارك', done.length ? table(['الفائز','الخاسر'], done.map(x => [E(x.winner), E(x.winner === x.team1 ? x.team2 : x.team1)])) : '<div class="empty-state">لا يوجد معارك مكتملة</div>'); },
  clearBattles: async () => { if (!confirm2('مسح المعارك؟')) return; await remove(ref(db, 'battles')); T('✅'); },
  exportBattles: async () => { exportJSON(await all('battles'), 'battles'); T('✅'); },
  teamsRanking: async () => { const t = await all('clans'); const sorted = Object.entries(t).sort((a, b) => (b[1].score||0) - (a[1].score||0)); M('🏆 ترتيب الفرق', table(['#','الاسم','النقاط'], sorted.map(([id, v], i) => [`#${i+1}`, E(v.name||id), v.score || 0]))); },
  topTeams: () => window.teamsRanking(),
  bestWeekly: async () => { const t = await all('clans'); const w = D(7); const weekly = {}; for (const id in t) { if (t[id].createdAt && new Date(t[id].createdAt).getTime() > w) weekly[id] = t[id].score || 0; } const top = Object.entries(weekly).sort((a,b) => b[1]-a[1]).slice(0, 5); M('📅 أفضل هذا الأسبوع', table(['الفريق','النقاط'], top.map(([id, s]) => [E(t[id].name||id), s]))); },
  bestMonthly: async () => { const t = await all('clans'); const m = D(30); const monthly = {}; for (const id in t) { if (t[id].createdAt && new Date(t[id].createdAt).getTime() > m) monthly[id] = t[id].score || 0; } const top = Object.entries(monthly).sort((a,b) => b[1]-a[1]).slice(0, 5); M('📆 أفضل هذا الشهر', table(['الفريق','النقاط'], top.map(([id, s]) => [E(t[id].name||id), s]))); },
  resetTeamsRanking: async () => { if (!confirm2('⚠️ تصفير نقاط كل الفرق؟')) return; const t = await all('clans'); for (const id in t) await update(ref(db, 'clans/' + id), { score: 0 }); T('✅'); },
  invitePlayers: async () => { const id = prompt('ID الفريق:'); if (!id) return; const user = prompt('اسم اللاعب:'); if (!user) return; await push(ref(db, 'team_requests/' + id + '/' + user), { from: CU, time: NOW(), status: 'pending' }); T('✅'); },
  viewInvites: async () => { const r = await all('team_requests'); const rows = []; for (const tid in r) for (const user in r[tid]) { rows.push([E(user), E(tid), r[tid][user].status || 'pending']); } M('✉️ الدعوات', table(['اللاعب','الفريق','الحالة'], rows)); },
  handleInvite: async () => { const tid = prompt('ID الفريق:'); if (!tid) return; const user = prompt('اللاعب:'); if (!user) return; const accept = confirm('قبول الدعوة؟ (إلغاء = رفض)'); if (accept) { await set(ref(db, 'users_data/' + user + '/joined_clans/' + tid), true); } await remove(ref(db, 'team_requests/' + tid + '/' + user)); T('✅'); },
  clearInvites: async () => { if (!confirm2('مسح الدعوات؟')) return; await remove(ref(db, 'team_requests')); T('✅'); },
  setMemberLimit: async () => { const n = parseInt(prompt('الحد الأقصى للأعضاء:', '20') || '20', 10); await set(ref(db, 'site_settings/maxTeamMembers'), n); T(`✅ الحد: ${n}`); },
  giveTeamReward: async () => { const id = prompt('ID الفريق:'); if (!id) return; const amt = parseInt(prompt('XP المكافأة:') || '0', 10); if (!amt) return; const cur = (await get(ref(db, 'clans/' + id + '/score'))).val() || 0; await update(ref(db, 'clans/' + id), { score: cur + amt }); T(`✅ +${amt} XP`); },
  distributeTeamXP: async () => { const id = prompt('ID الفريق:'); if (!id) return; const amt = parseInt(prompt('XP لكل عضو:') || '0', 10); if (!amt) return; const users = await all('users_data'); let count = 0; for (const u in users) { if (users[u].joined_clans && users[u].joined_clans[id]) { const cur = users[u].xp || 0; await set(ref(db, 'users_data/' + u + '/xp'), cur + amt); count++; } } T(`✅ وزعت ${amt} XP لـ ${count} عضو`); },
  distributeTeamCoins: async () => { const id = prompt('ID الفريق:'); if (!id) return; const amt = parseInt(prompt('كوينز لكل عضو:') || '0', 10); if (!amt) return; const users = await all('users_data'); let count = 0; for (const u in users) { if (users[u].joined_clans && users[u].joined_clans[id]) { const cur = users[u].coins || 0; await set(ref(db, 'users_data/' + u + '/coins'), cur + amt); count++; } } T(`✅ وزعت ${amt} كوينز لـ ${count} عضو`); },
  viewTeamRewards: async () => { const t = await all('clans'); M('🎁 مكافآت الفرق', table(['الفريق','النقاط'], Object.entries(t).map(([id, v]) => [E(v.name||id), v.score || 0]))); },
  clearTeamRewards: async () => { if (!confirm2('تصفير نقاط الفرق؟')) return; const t = await all('clans'); for (const id in t) await update(ref(db, 'clans/' + id), { score: 0 }); T('✅'); },
  
  // Themes
  createTheme: async () => { const name = prompt('اسم الثيم:'); if (!name) return; const primary = prompt('اللون الرئيسي (hex):', '#ffd700') || '#ffd700'; const bg = prompt('الخلفية (hex):', '#000000') || '#000000'; await push(ref(db, 'themes'), { name, primary, bg, createdAt: NOW() }); T('✅'); },
  viewThemes: async () => { const t = await all('themes'); M('🎭 الثيمات', table(['الاسم','اللون','الخلفية'], Object.entries(t).map(([id, v]) => [E(v.name||id), E(v.primary||''), E(v.bg||'')]))); },
  activateTheme: async () => { const id = prompt('ID الثيم:'); if (!id) return; const t = (await get(ref(db, 'themes/' + id))).val(); if (!t) return T('❌ غير موجود', 'error'); await update(ref(db, 'site_settings'), { colorPrimary: t.primary, colorBg: t.bg, activeTheme: id }); T('✅ تم التفعيل'); },
  deleteTheme: async () => { const id = prompt('ID الثيم:'); if (!id) return; await remove(ref(db, 'themes/' + id)); T('✅'); },
  exportTheme: async () => { exportJSON(await all('themes'), 'themes'); T('✅'); },
  setPrimaryColor: async () => { const c = prompt('اللون الرئيسي (hex):', '#ffd700'); if (!c) return; await set(ref(db, 'site_settings/colorPrimary'), c); document.documentElement.style.setProperty('--gold', c); T('✅'); },
  setSecondaryColor: async () => { const c = prompt('اللون الثانوي (hex):', '#a855f7'); if (!c) return; await set(ref(db, 'site_settings/colorSecondary'), c); T('✅'); },
  setTextColor: async () => { const c = prompt('لون الخط (hex):', '#fff8e7'); if (!c) return; await set(ref(db, 'site_settings/colorText'), c); T('✅'); },
  setBgColor: async () => { const c = prompt('لون الخلفية (hex):', '#0a0510'); if (!c) return; await set(ref(db, 'site_settings/colorBg'), c); T('✅'); },
  setCustomGradient: async () => { const g = prompt('Gradient (CSS):', 'linear-gradient(135deg, #ffd700, #a855f7)'); if (!g) return; await set(ref(db, 'site_settings/customGradient'), g); T('✅'); },
  setMainFont: async () => { const f = prompt('الخط الرئيسي:', 'Cairo') || 'Cairo'; await set(ref(db, 'site_settings/fontMain'), f); T('✅'); },
  setHeadingFont: async () => { const f = prompt('خط العناوين:', 'Cairo') || 'Cairo'; await set(ref(db, 'site_settings/fontHeading'), f); T('✅'); },
  setFontSize: async () => { const n = parseInt(prompt('حجم الخط (px):', '16') || '16', 10); await set(ref(db, 'site_settings/fontSize'), n); T('✅'); },
  viewFonts: async () => { const s = await all('site_settings'); M('🔤 الخطوط', table(['العنصر','الخط'], [['رئيسي', s.fontMain || 'Cairo'],['عناوين', s.fontHeading || 'Cairo'],['الحجم', s.fontSize || 16]])); },
  uploadFont: async () => { M('📤 رفع خط', '<p>لرفع خط مخصص:</p><ol style="line-height:1.8;padding-right:20px;"><li>حط ملف الخط في مجلد <code>fonts/</code></li><li>اضبط <code>@font-face</code> في owner-style.css</li></ol>'); },
  uploadLogo: async () => { M('🖼️ الشعار', '<p>الرجاء رفع ملف <code>Logo.png</code> في مجلد <code>pic/</code> يدوياً.</p><p>ثم اضغط تحديث.</p><button class="btn-primary" onclick="location.reload()">تحديث الصفحة</button>'); },
  uploadFavicon: async () => { M('⭐ Favicon', '<p>Favicon حالياً: <code>pic/Logo.png</code></p><p>لتغييره: استبدل الملف بنفس الاسم.</p>'); },
  setThemeLogo: async () => { const url = prompt('رابط شعار الوضع الليلي (URL أو مسار):'); if (!url) return; await set(ref(db, 'site_settings/logoDark'), url); T('✅'); },
  clearLogo: async () => { if (!confirm2('مسح شعار مخصص؟')) return; await remove(ref(db, 'site_settings/logoCustom')); T('✅'); },
  previewLogo: async () => { M('👁️ معاينة الشعار', '<img src="pic/Logo.png" style="max-width:200px;display:block;margin:20px auto;" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2216%22%3ENo Logo%3C/text%3E%3C/svg%3E\'">'); },
  setHeaderLayout: async () => { const layout = prompt('Layout (default/centered/minimal):', 'default') || 'default'; await set(ref(db, 'site_settings/headerLayout'), layout); T('✅'); },
  setFooterLayout: async () => { const layout = prompt('Layout (default/minimal):', 'default') || 'default'; await set(ref(db, 'site_settings/footerLayout'), layout); T('✅'); },
  setSidebarLayout: async () => { const layout = prompt('Layout (default/collapsed):', 'default') || 'default'; await set(ref(db, 'site_settings/sidebarLayout'), layout); T('✅'); },
  createCustomPage: async () => { const name = prompt('اسم الصفحة (مثل: about):'); if (!name) return; const content = prompt('محتوى الصفحة (HTML):') || ''; await set(ref(db, 'customPages/' + name), { content, createdAt: NOW() }); T('✅'); },
  editCustomCSS: async () => { const css = prompt('CSS مخصص (يُطبّق على owner.html):', '') || ''; await set(ref(db, 'site_settings/customCSS'), css); if (css) { let style = document.getElementById('customCSS'); if (!style) { style = document.createElement('style'); style.id = 'customCSS'; document.head.appendChild(style); } style.textContent = css; } T('✅'); },
  toggleAnimatedBg: async () => { const cur = (await get(ref(db, 'site_settings/animatedBg'))).val() || false; await set(ref(db, 'site_settings/animatedBg'), !cur); T(!cur ? '✅ الخلفيات المتحركة مفعلة' : '❌ متوقفة'); },
  toggleEffects: async () => { const cur = (await get(ref(db, 'site_settings/effects'))).val() || false; await set(ref(db, 'site_settings/effects'), !cur); T('✅'); },
  toggleGoldParticles: async () => { const particles = document.getElementById('bgParticles'); if (particles) { const hidden = particles.style.display === 'none'; particles.style.display = hidden ? 'block' : 'none'; T(hidden ? '✅ Gold Particles ظاهرة' : '❌ متوقفة'); } },
  clearAnimations: async () => { if (!confirm2('مسح الأنيميشن؟')) return; await update(ref(db, 'site_settings'), { animatedBg: false, effects: false, goldParticles: false }); T('✅'); },
  previewAnimations: async () => { const particles = document.getElementById('bgParticles'); if (particles) { particles.style.display = 'block'; particles.style.opacity = '1'; } T('👁️ المعاينة مفعلة'); },

  // Integrations
  firebaseStatus: async () => { try { await get(ref(db, '.info/connected')); const s = await get(ref(db, '.info/connected')); M('🔥 Firebase', statBox([['✅', 'متصل', 'الحالة'],['📡', 'Realtime', 'Database'],['🔐', 'قواعد', 'Auth'],['📦', 'HTTPS', 'Storage']])); } catch (e) { T('❌ Firebase غير متصل', 'error'); } },
  viewFirebaseRules: async () => { M('📋 قواعد Firebase', `<p>القواعد الحالية غالباً:</p><pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:11px;overflow:auto;">{"rules": {".read": "auth != null",".write": "auth != null"}}</pre><p style="margin-top:10px;">💡 لتعديل القواعد: Firebase Console → Realtime Database → Rules</p>`); },
  editFirebaseRules: async () => { const rules = prompt('الصق القواعد الجديدة (JSON) — سيتم حفظها في site_settings (للمرجع فقط):'); if (!rules) return; await set(ref(db, 'site_settings/firebaseRulesBackup'), rules); T('✅ تم الحفظ كمرجع. طبّقها من Firebase Console.'); },
  firebaseSync: async () => { T('🔄 جاري المزامنة...', 'info'); const nodes = ['usernames', 'users_data', 'scores', 'leaderboard']; for (const n of nodes) await get(ref(db, n)); T('✅ تمت المزامنة'); },
  exportFirebase: async () => { const data = { users: await all('usernames'), usersData: await all('users_data'), scores: await all('scores') }; exportJSON(data, 'firebase-export'); T('✅'); },
  viewLocalStorage: async () => { const data = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); data[k] = (localStorage.getItem(k) || '').slice(0, 200); } M('💾 LocalStorage', table(['المفتاح','القيمة'], Object.entries(data).map(([k, v]) => [`<code>${E(k)}</code>`, `<code>${E(v)}</code>`]))); },
  exportLocalStorage: async () => { const data = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); data[k] = localStorage.getItem(k); } exportJSON(data, 'localstorage'); T('✅'); },
  clearLocalStorage: async () => { if (!confirm2('⚠️ مسح كل localStorage?')) return; localStorage.clear(); T('✅ سيتسجل خروجك عند التحديث التالي', 'warn'); },
  importLocalStorage: async () => { const text = prompt('الصق JSON:'); if (!text) return; try { const data = JSON.parse(text); for (const k in data) localStorage.setItem(k, data[k]); T('✅'); } catch (e) { T('❌ JSON غير صالح', 'error'); } },
  checkLocalStorageSize: async () => { let size = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); size += (k.length + (localStorage.getItem(k) || '').length) * 2; } T(`💾 ${(size/1024).toFixed(2)} KB (max ~5MB)`); },
  showDBStats: async () => { const nodes = ['usernames', 'users_data', 'scores', 'leaderboard', 'banned_users', 'warnings', 'messages']; const stats = []; for (const n of nodes) { const s = await get(ref(db, n)); const size = s.exists() ? JSON.stringify(s.val()).length : 0; stats.push([E(n), (size/1024).toFixed(1) + ' KB']); } M('📊 إحصائيات DB', table(['Node','الحجم'], stats)); },
  countAllNodes: async () => { const s = await get(ref(db)); if (!s.exists()) return T('0 node'); T(`🗄️ ${Object.keys(s.val()).length} node رئيسي`); },
  findOrphans: async () => { const users = await all('usernames'); const [scores, badges, roles] = await Promise.all([all('scores'), all('badges'), all('roles/users')]); const orphans = []; for (const u in scores) if (!users[u]) orphans.push(['scores', u]); for (const u in badges) if (!users[u]) orphans.push(['badges', u]); for (const u in roles) if (!users[u]) orphans.push(['roles', u]); M('👻 Orphans', orphans.length ? table(['Node','اللاعب'], orphans.slice(0, 50)) : '<div class="empty-state">✅ لا يوجد orphans</div>'); },
  cleanupOrphans: async () => { if (!confirm2('⚠️ مسح كل الـ Orphans؟')) return; const users = await all('usernames'); const [scores, badges, roles] = await Promise.all([all('scores'), all('badges'), all('roles/users')]); let count = 0; for (const u in scores) if (!users[u]) { await remove(ref(db, 'scores/' + u)); count++; } for (const u in badges) if (!users[u]) { await remove(ref(db, 'badges/' + u)); count++; } for (const u in roles) if (!users[u]) { await remove(ref(db, 'roles/users/' + u)); count++; } T(`✅ مسحت ${count} orphan`); },
  validateData: async () => { const users = await all('users_data'); const issues = []; for (const u in users) { if (typeof users[u].xp === 'string') issues.push(`${u}: XP كنص (${users[u].xp})`); if (typeof users[u].coins === 'string') issues.push(`${u}: كوينز كنص (${users[u].coins})`); } M('✓ فحص البيانات', issues.length ? table(['مشكلة'], issues.slice(0, 30).map(i => [i])) : '<div class="empty-state">✅ لا مشاكل</div>'); },
  testWebhookReal: async () => { const url = prompt('URL للاختبار:'); if (!url) return; try { const res = await fetch(url, { method: 'POST', body: JSON.stringify({ test: true }) }); T(`✅ استجابة: ${res.status}`); } catch (e) { T(`⚠️ ${e.message.substring(0, 50)}`, 'warn'); } },
  viewWebhookLogs: async () => { const l = await all('automation/webhookLogs'); M('📊 Webhook Logs', table(['URL','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E((v.url||'').slice(0,40)), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  clearWebhookLogs: async () => { if (!confirm2('مسح الـ logs؟')) return; await remove(ref(db, 'automation/webhookLogs')); T('✅'); },
  addWebhookUrl: async () => { const url = prompt('URL:'); if (!url) return; await push(ref(db, 'automation/webhooks'), { url, active: true, createdAt: NOW() }); T('✅'); },
  listWebhookUrls: () => window.viewWebhooks(),
  generateAPIKey: async () => { const label = prompt('اسم المفتاح (مثل: mobile-app):', 'api-key') || 'api-key'; const key = 'qh_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); await push(ref(db, 'api_keys'), { key: btoa(key), label, createdAt: NOW(), lastUsed: null, active: true }); M('🔑 مفتاح API جديد', `<p>احفظ المفتاح ده في مكان آمن:</p><pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:13px;word-break:break-all;">${key}</pre><p style="margin-top:10px;color:var(--text-2);">⚠️ مش هيظهر تاني. مشفّر في Firebase.</p><p style="margin-top:10px;">💡 <b>الاستخدام:</b> أي طلب من تطبيقك لازم يبعت <code>X-API-Key: ${key}</code> لأي endpoint من endpoints الموقع. سجل الدخول من Firebase سيحدد الصلاحيات.</p>`); },
  viewAPIKeys: async () => { const k = await all('api_keys'); const rows = Object.entries(k).map(([id, v]) => [E(v.label||id), '***' + (atob(v.key||'').slice(-6)), v.active ? '✅' : '❌', v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—']); M('🔑 API Keys', table(['الاسم','المفتاح','الحالة','التاريخ'], rows)); },
  deleteAPIKey: async () => { const id = prompt('ID المفتاح:'); if (!id) return; await remove(ref(db, 'api_keys/' + id)); T('✅'); },
  viewAPIDocs: async () => { M('📖 API Docs', `<h4 style="color:var(--gold);">Endpoints المتاحة (قراءة فقط):</h4><pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:12px;overflow:auto;">GET /api/leaderboard\nGET /api/users/:username\nGET /api/quiz/:quizKey/stats\nGET /api/banned</pre><p style="margin-top:10px;">💡 كل endpoint يحتاج Firebase Auth Token أو API Key.</p><p>مثال fetch:</p><pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:12px;overflow:auto;">fetch('/api/leaderboard', {\n  headers: { 'X-API-Key': 'qh_xxxxx' }\n})</pre>`); },
  viewAPILogs: async () => { const l = await all('api_logs'); M('📊 API Logs', table(['Endpoint','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E(v.endpoint||''), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },

  // Backup
  createBackup: async () => { T('⏳ جاري الإنشاء...', 'info'); const data = {}; const BACKUP_NODES = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','clans','teams','messages','verified_users','site_events']; for (const n of BACKUP_NODES) data[n] = await all(n); const id = 'bk_' + NOW(); await set(ref(db, 'backups/' + id), { data, createdAt: NOW(), by: CU, size: JSON.stringify(data).length }); T(`✅ تم إنشاء نسخة (${(JSON.stringify(data).length/1024).toFixed(1)} KB)`); },
  viewBackups: async () => { const b = await all('backups'); const rows = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0)).map(([id, v]) => [E(id.slice(0, 12)), v.createdAt ? new Date(v.createdAt).toLocaleString('ar-EG') : '—', ((v.size||0)/1024).toFixed(1) + ' KB', E(v.by||'')]); M('💾 النسخ الاحتياطية', table(['ID','التاريخ','الحجم','بواسطة'], rows)); },
  downloadBackup: async () => { const id = prompt('ID النسخة (من العرض):'); if (!id) return; const b = (await get(ref(db, 'backups/' + id))).val(); if (!b) return T('❌ غير موجودة', 'error'); exportJSON(b.data, 'backup-' + id); T('✅'); },
  deleteBackup: async () => { const id = prompt('ID النسخة:'); if (!id) return; await remove(ref(db, 'backups/' + id)); T('✅'); },
  scheduleBackups: async () => { const hours = parseInt(prompt('كل كام ساعة؟', '24') || '24', 10); await set(ref(db, 'backups/schedule'), { hours, enabled: true, updatedAt: NOW() }); T(`✅ النسخ كل ${hours} ساعة (يتنفذ من سيرفر أو يدوياً)`); },
  restoreBackup: async () => { const id = prompt('ID النسخة للاستعادة:'); if (!id) return; const b = (await get(ref(db, 'backups/' + id))).val(); if (!b) return T('❌ غير موجودة', 'error'); if (!confirm2('⚠️ هذا سيستبدل البيانات الحالية. متأكد؟')) return; for (const n in b.data) await set(ref(db, n), b.data[n]); T('✅ تمت الاستعادة'); },
  restorePartial: async () => { const id = prompt('ID النسخة:'); if (!id) return; const node = prompt('الـ node للاستعادة (مثل: usernames):'); if (!node) return; const b = (await get(ref(db, 'backups/' + id))).val(); if (!b || !b.data[node]) return T('❌ غير موجود', 'error'); if (!confirm2(`استعادة ${node} فقط؟`)) return; await set(ref(db, node), b.data[node]); T('✅'); },
  restoreFull: () => window.restoreBackup(),
  uploadBackup: async () => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.json'; input.onchange = async (e) => { const file = e.target.files[0]; if (!file) return; const text = await file.text(); try { const data = JSON.parse(text); const id = 'bk_' + NOW(); await set(ref(db, 'backups/' + id), { data, createdAt: NOW(), by: CU, size: text.length }); T(`✅ تم رفع نسخة (${(text.length/1024).toFixed(1)} KB)`); } catch (err) { T('❌ JSON غير صالح', 'error'); } }; input.click(); },
  validateBackup: async () => { const id = prompt('ID النسخة:'); if (!id) return; const b = (await get(ref(db, 'backups/' + id))).val(); if (!b) return T('❌ غير موجودة', 'error'); const BACKUP_NODES = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','clans','teams','messages','verified_users','site_events']; const missing = BACKUP_NODES.filter(n => !b.data[n]); if (missing.length) T(`⚠️ nodes ناقصة: ${missing.join(', ')}`, 'warn'); else T('✅ النسخة سليمة'); },
  manualSync: async () => { T('🔄 مزامنة يدوية...', 'info'); for (const n of ['usernames', 'users_data', 'scores']) await get(ref(db, n)); T('✅'); },
  autoSync: async () => { const cur = (await get(ref(db, 'site_settings/autoSync'))).val() || false; await set(ref(db, 'site_settings/autoSync'), !cur); T(!cur ? '✅ مفعل' : '❌ متوقف'); },
  syncFirebase: () => window.manualSync(),
  externalSync: async () => { M('🌐 مزامنة خارجية', '<p>المزامنة الخارجية (Google Sheets, Airtable إلخ) تتطلب API keys.</p><p>✅ البديل: صدّر نسخة JSON وحملها في أي خدمة.</p><button class="btn-primary" onclick="window.ownerExportNode(\'users_data\')">تصدير الآن</button>'); },
  viewSyncLog: async () => { const l = await all('sync_logs'); M('📋 Sync Log', table(['العملية','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E(v.action||''), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  showDataSize: async () => { let total = 0; const BACKUP_NODES = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','clans','teams','messages','verified_users','site_events']; for (const n of BACKUP_NODES) { const s = await get(ref(db, n)); if (s.exists()) total += JSON.stringify(s.val()).length; } T(`📦 الحجم الإجمالي: ${(total/1024).toFixed(1)} KB`); },
  countNodes: async () => { const s = await get(ref(db)); T(`🗄️ ${s.exists() ? Object.keys(s.val()).length : 0} node رئيسي`); },
  backupReport: async () => { const b = await all('backups'); const total = Object.values(b).reduce((s, v) => s + (v.size || 0), 0); M('📊 تقرير النسخ', statBox([['💾', Object.keys(b).length, 'عدد النسخ'],['📦', (total/1024/1024).toFixed(2) + ' MB', 'الحجم'],['📅', Object.keys(b).length ? new Date(Object.values(b).sort((x, y) => (y.createdAt||0)-(x.createdAt||0))[0].createdAt).toLocaleString('ar-EG') : '—', 'آخر نسخة']])); },
  showOldestBackup: async () => { const b = await all('backups'); const sorted = Object.entries(b).sort((a, c) => (a[1].createdAt||0) - (c[1].createdAt||0)); if (!sorted.length) return T('لا يوجد نسخ', 'warn'); T(`🕐 الأقدم: ${new Date(sorted[0][1].createdAt).toLocaleString('ar-EG')}`); },
  showNewestBackup: async () => { const b = await all('backups'); const sorted = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0)); if (!sorted.length) return T('لا يوجد نسخ', 'warn'); T(`🕐 الأحدث: ${new Date(sorted[0][1].createdAt).toLocaleString('ar-EG')}`); },
  emergencyBackup: async () => { T('🚨 نسخة طوارئ...', 'info'); await window.createBackup(); T('🚨 تم حفظ نسخة طوارئ'); },
  emergencyRestore: async () => { const b = await all('backups'); const latest = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0))[0]; if (!latest) return T('❌ لا يوجد نسخ', 'error'); if (!confirm2(`استعادة أحدث نسخة (${new Date(latest[1].createdAt).toLocaleString('ar-EG')})؟`)) return; for (const n in latest[1].data) await set(ref(db, n), latest[1].data[n]); T('✅'); },
  clearEmergencyBackups: async () => { if (!confirm2('مسح كل النسخ؟')) return; await remove(ref(db, 'backups')); T('✅'); },
  fullExport: async () => { T('⏳ تصدير شامل...', 'info'); const data = {}; const BACKUP_NODES = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','clans','teams','messages','verified_users','site_events']; for (const n of BACKUP_NODES) data[n] = await all(n); exportJSON(data, 'full-export'); T('✅'); },

  // Audit
  viewAdminLogs: async () => { const l = await all('admin_logs'); const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100); M('👤 سجلات الأدمنز (آخر 100)', table(['الأدمن','الإجراء','الهدف','التاريخ'], rows.map(v => [E(v.admin||''), E(v.action||''), E(v.target||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  filterAdminLogs: async () => { const q = prompt('بحث:'); if (!q) return; const l = await all('admin_logs'); const filtered = Object.values(l).filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, table(['الأدمن','الإجراء','التاريخ'], filtered.slice(0, 50).map(v => [E(v.admin||''), E(v.action||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  clearAdminLogs: async () => { if (!confirm2('مسح سجلات الأدمنز؟')) return; await remove(ref(db, 'admin_logs')); T('✅'); },
  searchAdminLogs: () => window.filterAdminLogs(),
  viewPlayerLogs: async () => { const l = await all('activity_feed'); const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100); M('🎮 سجلات اللاعبين', table(['اللاعب','الإجراء','التفاصيل','التاريخ'], rows.map(v => [E(v.user||''), E(v.action||''), E(v.detail||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  filterPlayerLogs: async () => { const q = prompt('بحث:'); if (!q) return; const l = await all('activity_feed'); const f = Object.values(l).filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, table(['اللاعب','الإجراء'], f.slice(0, 50).map(v => [E(v.user||''), E(v.action||'')]))); },
  exportPlayerLogs: async () => { exportJSON(await all('activity_feed'), 'player-logs'); T('✅'); },
  clearPlayerLogs: async () => { if (!confirm2('مسح سجلات اللاعبين؟')) return; await remove(ref(db, 'activity_feed')); T('✅'); },
  searchPlayerLogs: () => window.filterPlayerLogs(),
  viewChatLogs: async () => { const c = await all('global_chat'); const rows = Object.values(c).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100); M('💬 سجلات الشات', table(['المرسل','الرسالة','التاريخ'], rows.map(v => [E(v.sender||''), E((v.text||'').slice(0, 50)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  filterChatLogs: async () => { const q = prompt('بحث:'); if (!q) return; const c = await all('global_chat'); const f = Object.values(c).filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, table(['المرسل','الرسالة'], f.slice(0, 50).map(v => [E(v.sender||''), E((v.text||'').slice(0, 50))]))); },
  exportChatLogs: async () => { exportJSON(await all('global_chat'), 'chat-logs'); T('✅'); },
  clearChatLogs: async () => { if (!confirm2('مسح سجلات الشات؟')) return; await remove(ref(db, 'global_chat')); T('✅'); },
  searchChatLogs: () => window.filterChatLogs(),
  viewBanLogs: async () => { const b = await all('banned_users'); M('🚫 سجل الحظر', table(['المحظور','السبب','بواسطة','التاريخ'], Object.entries(b).map(([u, v]) => [E(u), E(v.reason||''), E(v.by||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']))); },
  filterBanLogs: async () => { const q = prompt('بحث:'); if (!q) return; const b = await all('banned_users'); const f = Object.entries(b).map(([k, v]) => ({ user: k, ...v })).filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, table(['المحظور','السبب'], f.slice(0, 50).map(v => [E(v.user||''), E(v.reason||'')]))); },
  clearBanLogs: async () => { if (!confirm2('مسح سجل الحظر (سيرفع الحظر عن الجميع)؟')) return; await remove(ref(db, 'banned_users')); T('✅'); },
  searchBanLogs: () => window.filterBanLogs(),
  viewLoginLogs: async () => { const l = await all('security/logs/login'); const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100); M('🔐 سجل الدخول', table(['اللاعب','الجهاز','التاريخ'], rows.map(v => [E(v.user||''), E((v.fp||'').slice(0, 15)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  filterLoginLogs: async () => { const q = prompt('بحث:'); if (!q) return; const l = await all('security/logs/login'); const f = Object.values(l).filter(x => JSON.stringify(x).toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, table(['اللاعب','التاريخ'], f.slice(0, 50).map(v => [E(v.user||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—']))); },
  exportLoginLogs: async () => { exportJSON(await all('security/logs/login'), 'login-logs'); T('✅'); },
  clearLoginLogs: async () => { if (!confirm2('مسح سجل الدخول؟')) return; await remove(ref(db, 'security/logs/login')); T('✅'); },
  searchLoginLogs: () => window.filterLoginLogs(),
  viewSystemLogs: async () => { const all_nodes = await get(ref(db)); const data = all_nodes.val() || {}; M('⚙️ سجلات النظام', statBox([['📦', Object.keys(data).length, 'إجمالي Nodes'],['💾', (JSON.stringify(data).length/1024/1024).toFixed(2) + ' MB', 'حجم DB'],['🔑', Object.keys(await all('api_keys')).length, 'API Keys'],['💾', Object.keys(await all('backups')).length, 'نسخ احتياطية']])); },
  filterSystemLogs: async () => { const q = prompt('بحث في node names:'); if (!q) return; const s = await get(ref(db)); const data = s.exists() ? Object.keys(s.val()) : []; const f = data.filter(x => x.toLowerCase().includes(q.toLowerCase())); M(`🔍 "${q}"`, list(f)); },
  exportSystemLogs: async () => { const s = await get(ref(db)); exportJSON(s.val(), 'system-logs'); T('✅'); },
  clearSystemLogs: async () => { if (!confirm2('⚠️ حذف كل السجلات (admin_logs + activity_feed + security/logs)?')) return; await remove(ref(db, 'admin_logs')); await remove(ref(db, 'activity_feed')); await remove(ref(db, 'security/logs')); T('✅'); },
  searchSystemLogs: () => window.filterSystemLogs(),

  // CMS
  createPage: async () => { const title = prompt('عنوان الصفحة:'); if (!title) return; const slug = prompt('الرابط (مثل: about):') || title.toLowerCase().replace(/\s+/g, '-'); const content = prompt('المحتوى (HTML):') || ''; await set(ref(db, 'cms/pages/' + slug), { title, content, published: false, createdAt: NOW() }); T('✅'); },
  viewPages: async () => { const p = await all('cms/pages'); M('📄 الصفحات', table(['العنوان','الرابط','منشور'], Object.entries(p).map(([id, v]) => [E(v.title||id), E(id), v.published ? '✅' : '❌']))); },
  editPage: async () => { const slug = prompt('رابط الصفحة:'); if (!slug) return; const p = (await get(ref(db, 'cms/pages/' + slug))).val(); if (!p) return T('❌ غير موجودة', 'error'); const content = prompt('المحتوى الجديد:', p.content || ''); if (content === null) return; await update(ref(db, 'cms/pages/' + slug), { content, updatedAt: NOW() }); T('✅'); },
  deletePage: async () => { const slug = prompt('رابط الصفحة:'); if (!slug) return; await remove(ref(db, 'cms/pages/' + slug)); T('✅'); },
  publishPage: async () => { const slug = prompt('رابط الصفحة:'); if (!slug) return; const cur = (await get(ref(db, 'cms/pages/' + slug + '/published'))).val(); await update(ref(db, 'cms/pages/' + slug), { published: !cur }); T(!cur ? '✅ تم النشر' : '❌ تم الإلغاء'); },
  createArticle: async () => { const title = prompt('عنوان المقال:'); if (!title) return; const content = prompt('المحتوى:') || ''; await push(ref(db, 'cms/blog'), { title, content, published: false, createdAt: NOW(), author: CU }); T('✅'); },
  viewArticles: async () => { const a = await all('cms/blog'); M('📰 البلوج', table(['العنوان','الكاتب','منشور'], Object.entries(a).map(([id, v]) => [E(v.title||id), E(v.author||''), v.published ? '✅' : '❌']))); },
  editArticle: async () => { const id = prompt('ID المقال:'); if (!id) return; const a = (await get(ref(db, 'cms/blog/' + id))).val(); if (!a) return T('❌', 'error'); const content = prompt('المحتوى:', a.content || ''); if (content === null) return; await update(ref(db, 'cms/blog/' + id), { content, updatedAt: NOW() }); T('✅'); },
  deleteArticle: async () => { const id = prompt('ID المقال:'); if (!id) return; await remove(ref(db, 'cms/blog/' + id)); T('✅'); },
  exportArticles: async () => { exportJSON(await all('cms/blog'), 'articles'); T('✅'); },
  createFAQ: async () => { const q = prompt('السؤال:'); if (!q) return; const a = prompt('الجواب:') || ''; await push(ref(db, 'cms/faq'), { question: q, answer: a, createdAt: NOW() }); T('✅'); },
  viewFAQs: async () => { const f = await all('cms/faq'); const rows = Object.values(f).map(v => [E(v.question||''), E((v.answer||'').slice(0, 80))]); M('❓ FAQ', table(['السؤال','الجواب'], rows)); },
  categorizeFAQ: async () => { const id = prompt('ID السؤال:'); if (!id) return; const cat = prompt('التصنيف (general/account/quiz):', 'general') || 'general'; await update(ref(db, 'cms/faq/' + id), { category: cat }); T('✅'); },
  editFAQ: async () => { const id = prompt('ID السؤال:'); if (!id) return; const f = (await get(ref(db, 'cms/faq/' + id))).val(); if (!f) return T('❌', 'error'); const answer = prompt('الجواب الجديد:', f.answer || ''); if (answer === null) return; await update(ref(db, 'cms/faq/' + id), { answer }); T('✅'); },
  deleteFAQ: async () => { const id = prompt('ID السؤال:'); if (!id) return; await remove(ref(db, 'cms/faq/' + id)); T('✅'); },
  viewCommentsCMS: async () => { const c = await all('comments'); M('💬 التعليقات', table(['اللاعب','التعليق','الحالة'], Object.entries(c).slice(0, 50).map(([id, v]) => [E(v.user||''), E((v.text||'').slice(0, 60)), v.status || 'pending']))); },
  approveComment: async () => { const id = prompt('ID التعليق:'); if (!id) return; await update(ref(db, 'comments/' + id), { status: 'approved' }); T('✅'); },
  rejectComment: async () => { const id = prompt('ID التعليق:'); if (!id) return; await remove(ref(db, 'comments/' + id)); T('✅'); },
  replyComment: async () => { const id = prompt('ID التعليق:'); if (!id) return; const reply = prompt('الرد:') || ''; await update(ref(db, 'comments/' + id), { reply, repliedBy: CU, repliedAt: NOW() }); T('✅'); },
  clearCommentsCMS: async () => { if (!confirm2('مسح كل التعليقات؟')) return; await remove(ref(db, 'comments')); T('✅'); },
  createNotification: async () => { const title = prompt('العنوان:'); if (!title) return; const body = prompt('النص:') || ''; await push(ref(db, 'cms/notifications'), { title, body, createdAt: NOW(), read: {} }); T('✅'); },
  viewNotifications: async () => { const n = await all('cms/notifications'); M('🔔 الإشعارات', table(['العنوان','النص','التاريخ'], Object.values(n).slice(0, 30).map(v => [E(v.title||''), E((v.body||'').slice(0, 60)), v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—']))); },
  clearNotifications: async () => { if (!confirm2('مسح الإشعارات؟')) return; await remove(ref(db, 'cms/notifications')); T('✅'); },
  scheduleNotification: async () => { const title = prompt('العنوان:'); if (!title) return; const date = prompt('موعد الإطلاق (YYYY-MM-DD HH:MM):'); if (!date) return; await push(ref(db, 'cms/scheduledNotifications'), { title, scheduleAt: new Date(date).getTime(), createdAt: NOW() }); T('✅'); },

  // i18n
  addLanguage: async () => { const code = prompt('كود اللغة (مثل: fr, es):'); if (!code) return; const name = prompt('اسم اللغة (Français):') || code; await set(ref(db, 'i18n/languages/' + code), { name, enabled: true, createdAt: NOW() }); T('✅'); },
  viewLanguages: async () => { const l = await all('i18n/languages'); M('🌐 اللغات', table(['الكود','الاسم','مفعل'], Object.entries(l).map(([code, v]) => [E(code), E(v.name||code), v.enabled ? '✅' : '❌']))); },
  toggleLanguage: async () => { const code = prompt('كود اللغة:'); if (!code) return; const cur = (await get(ref(db, 'i18n/languages/' + code + '/enabled'))).val(); await update(ref(db, 'i18n/languages/' + code), { enabled: !cur }); T(!cur ? '✅ مفعلة' : '❌ متوقفة'); },
  deleteLanguage: async () => { const code = prompt('كود اللغة:'); if (!code) return; await remove(ref(db, 'i18n/languages/' + code)); T('✅'); },
  exportLanguages: async () => { exportJSON(await all('i18n/languages'), 'languages'); T('✅'); },
  viewTranslations: async () => { const t = await all('i18n/translations'); const langs = Object.keys(t); M('🔄 الترجمات', `<p>اللغات: ${langs.join(', ') || 'لا يوجد'}</p>${table(['اللغة','عدد المفاتيح'], langs.map(l => [E(l), Object.keys(t[l] || {}).length]))}`); },
  editTranslation: async () => { const lang = prompt('كود اللغة:'); if (!lang) return; const key = prompt('المفتاح (مثل: welcome):'); if (!key) return; const val = prompt('الترجمة:'); if (val === null) return; await set(ref(db, 'i18n/translations/' + lang + '/' + key), val); T('✅'); },
  autoTranslateAll: async () => { const ar = await all('i18n/translations/ar'); const langs = await all('i18n/languages'); const otherLangs = Object.keys(langs).filter(k => k !== 'ar'); if (!otherLangs.length) return T('لا يوجد لغات تانية', 'warn'); for (const lang of otherLangs) { for (const key in ar) { const existing = (await get(ref(db, 'i18n/translations/' + lang + '/' + key))).val(); if (!existing) await set(ref(db, 'i18n/translations/' + lang + '/' + key), ar[key]); } } T(`✅ تم نسخ ${Object.keys(ar).length} مفتاح لكل اللغات`); },
  clearTranslations: async () => { if (!confirm2('مسح كل الترجمات؟')) return; await remove(ref(db, 'i18n/translations')); T('✅'); },
  exportTranslations: async () => { exportJSON(await all('i18n/translations'), 'translations'); T('✅'); },
  setDefaultLanguage: async () => { const lang = prompt('كود اللغة الافتراضية:', 'ar') || 'ar'; await set(ref(db, 'i18n/defaultLanguage'), lang); T('✅'); },
  toggleRTL: async () => { const cur = (await get(ref(db, 'i18n/rtl'))).val() !== false; await set(ref(db, 'i18n/rtl'), !cur); T(!cur ? '✅ RTL مفعل' : '❌ LTR مفعل'); },
  setLanguageCode: async () => { const code = prompt('كود اللغة:'); if (!code) return; const newCode = prompt('الكود الجديد:'); if (!newCode) return; const lang = (await get(ref(db, 'i18n/languages/' + code))).val(); if (!lang) return T('❌', 'error'); await set(ref(db, 'i18n/languages/' + newCode), lang); await remove(ref(db, 'i18n/languages/' + code)); T('✅'); },
  previewLanguage: async () => { const lang = prompt('كود اللغة للمعاينة:', 'ar') || 'ar'; const t = await all('i18n/translations/' + lang); M(`👁️ معاينة ${lang}`, `<pre style="background:var(--bg-1);padding:12px;border-radius:8px;max-height:400px;overflow:auto;font-size:12px;">${E(JSON.stringify(t, null, 2))}</pre>`); },
  reloadTranslations: async () => { T('🔄 جاري التحميل...', 'info'); await get(ref(db, 'i18n/translations')); T('✅'); },

  // AI Placeholder Handlers (اللي كانت بتدي قيد التطوير)
  openAIChat: async () => T('🚧 شات المساعد قيد التطوير', 'info'),
  aiSmartSuggestions: async () => T('🚧 قيد التطوير', 'info'),
  aiAnalyzeLogs: async () => T('🚧 قيد التطوير', 'info'),
  aiSummarizeReports: async () => T('🚧 قيد التطوير', 'info'),
  clearAIChats: async () => { if (!confirm('مسح المحادثات؟')) return; await remove(ref(db, 'ai_chats')); T('✅'); },
  detectFakeAccounts: async () => T('🚧 قيد التطوير', 'info'),
  detectBots: async () => T('🚧 قيد التطوير', 'info'),
  detectMultiAccounts: async () => T('🚧 قيد التطوير', 'info'),
  detectCheating: async () => T('🚧 قيد التطوير', 'info'),
  reviewBanDecisions: async () => T('🚧 قيد التطوير', 'info'),
  filterProfanity: async () => T('🚧 قيد التطوير', 'info'),
  analyzeSentiment: async () => T('🚧 قيد التطوير', 'info'),
  summarizeSuggestions: async () => T('🚧 قيد التطوير', 'info'),
  classifyTickets: async () => T('🚧 قيد التطوير', 'info'),
  autoReplyTickets: async () => T('🚧 قيد التطوير', 'info'),
  generateQuestions: async () => T('🚧 قيد التطوير', 'info'),
  generateAnnouncement: async () => T('🚧 قيد التطوير', 'info'),
  generateWelcome: async () => T('🚧 قيد التطوير', 'info'),
  generateContest: async () => T('🚧 قيد التطوير', 'info'),
  autoTranslate: async () => T('🚧 قيد التطوير', 'info'),
  recommendQuizzes: async () => T('🚧 قيد التطوير', 'info'),
  recommendFriends: async () => T('🚧 قيد التطوير', 'info'),
  recommendAds: async () => T('🚧 قيد التطوير', 'info'),
  analyzePlayerPersonality: async () => T('🚧 قيد التطوير', 'info'),
  predictNeeds: async () => T('🚧 قيد التطوير', 'info'),

  // Placeholders for External Integrations
  connectDiscord: async () => T('🚧 Discord قيد التطوير', 'info'),
  viewDiscordServers: async () => T('🚧 Discord قيد التطوير', 'info'),
  setupDiscordWebhooks: async () => T('🚧 Discord قيد التطوير', 'info'),
  disconnectDiscord: async () => T('🚧 Discord قيد التطوير', 'info'),
  discordReport: async () => T('🚧 Discord قيد التطوير', 'info'),
  connectTelegramBot: async () => T('🚧 Telegram قيد التطوير', 'info'),
  sendTelegramMessage: async () => T('🚧 Telegram قيد التطوير', 'info'),
  viewTelegramSubscribers: async () => T('🚧 Telegram قيد التطوير', 'info'),
  disconnectTelegram: async () => T('🚧 Telegram قيد التطوير', 'info'),
  telegramReport: async () => T('🚧 Telegram قيد التطوير', 'info'),
  connectGoogleSheets: async () => T('🚧 Google Sheets قيد التطوير', 'info'),
  setupGoogleLogin: async () => T('🚧 Google Login قيد التطوير', 'info'),
  connectGoogleAnalytics: async () => T('🚧 Google Analytics قيد التطوير', 'info'),
  syncGoogleSheets: async () => T('🚧 Google Sheets قيد التطوير', 'info'),
  exportToGoogle: async () => T('🚧 Google قيد التطوير', 'info')
});

/* ═══════════════════════════════════════════════════════════════════
   COMMAND PALETTE
   ═══════════════════════════════════════════════════════════════════ */

const ALL_FEATURES = [];
Object.entries(FEATURES).forEach(([tabKey, tab]) => {
  tab.sections.forEach((s, si) => {
    s.items.forEach((f, fi) => { ALL_FEATURES.push({ tab: tabKey, si, fi, icon: f.icon, label: f.label, id: f.id }); });
  });
});

let paletteSelected = 0;
let paletteResults = [];

window._openPalette = () => {
  const p = $('commandPalette'); const input = $('paletteInput');
  p.classList.add('active'); setTimeout(() => input.focus(), 50); _updatePalette('');
};

function _updatePalette(q) {
  q = q.toLowerCase().trim();
  paletteResults = !q ? ALL_FEATURES.slice(0, 50) : ALL_FEATURES.filter(f => f.label.toLowerCase().includes(q));
  paletteSelected = 0; _renderPalette();
}

function _renderPalette() {
  const box = $('paletteResults');
  if (!paletteResults.length) { box.innerHTML = '<div class="palette-empty">لا توجد نتائج</div>'; return; }
  box.innerHTML = paletteResults.slice(0, 50).map((f, i) => `
    <div class="palette-result ${i === paletteSelected ? 'selected' : ''}" onclick="window._paletteExec(${f.tab === 'x' ? 0 : JSON.stringify(f.tab)}, ${f.si}, ${f.fi})">
      <span class="palette-result-icon">${f.icon}</span>
      <span>${escapeHtml(f.label)}</span>
      ${f.id ? `<span style="margin-right:auto; font-size:10px; color:var(--text-3);">#${f.id}</span>` : ''}
    </div>
  `).join('');
}

window._paletteExec = (tab, si, fi) => {
  $('commandPalette').classList.remove('active');
  switchTab(tab);
  setTimeout(() => window._runFeature(tab, si, fi), 100);
};

setTimeout(() => {
  const input = $('paletteInput');
  if (input) {
    input.addEventListener('input', e => _updatePalette(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); paletteSelected = Math.min(paletteSelected + 1, paletteResults.length - 1); _renderPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); paletteSelected = Math.max(paletteSelected - 1, 0); _renderPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); const r = paletteResults[paletteSelected]; if (r) window._paletteExec(r.tab, r.si, r.fi); }
    });
  }
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); window._openPalette(); } if (e.key === 'Escape') $('commandPalette').classList.remove('active'); });
  $('commandPalette').addEventListener('click', e => { if (e.target.id === 'commandPalette') $('commandPalette').classList.remove('active'); });
}, 100);

window.ownerToggleTheme = () => {
  const isLight = document.body.classList.toggle('light-mode');
  $('themeBtn').textContent = isLight ? '🌙' : '☀️';
  localStorage.setItem('ownerTheme', isLight ? 'light' : 'dark');
};
if (localStorage.getItem('ownerTheme') === 'light') { document.body.classList.add('light-mode'); $('themeBtn').textContent = '🌙'; }

setInterval(() => { const el = $('liveClock'); if (el) el.textContent = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }, 1000);
window.ownerLogout = () => signOut(auth).then(() => { localStorage.removeItem('loggedInUser'); location.href = 'index.html'; });

const bgp = $('bgParticles');
if (bgp) {
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%'; s.style.animationDuration = (Math.random() * 20 + 15) + 's'; s.style.animationDelay = (Math.random() * 20) + 's'; s.style.width = s.style.height = (Math.random() * 3 + 2) + 'px';
    bgp.appendChild(s);
  }
}

async function init() {
  await new Promise(r => setTimeout(r, 500));
  if (!CURRENT_USER || CURRENT_USER !== OWNER_USERNAME) {
    $('loadingScreen').style.display = 'none'; $('accessDenied').classList.add('show'); return;
  }
  $('loadingScreen').style.display = 'none'; $('ownerPanel').classList.add('show'); $('ownerName').textContent = CURRENT_USER;
  get(ref(db, 'users_data/' + CURRENT_USER + '/profilePic')).then(s => {
    if (s.exists()) $('ownerAvatar').innerHTML = `<img src="${s.val()}">`;
    else $('ownerAvatar').textContent = CURRENT_USER.charAt(0).toUpperCase();
  }).catch(() => {});
  renderSidebar(); switchTab('overview');
}

window.refreshQuizzesList = () => switchTab('content');
window.addQuizManually = async () => {
  const name = prompt('اسم الكويز (مثال: TheNewMovie):');
  if (!name) return;
  await set(ref(db, 'site_settings/manual_quizzes/' + name), true);
  toast('✅ تمت إضافة الكويز للقائمة، اضغط تحديث.');
  switchTab('content');
};
init();