/* ═══════════════════════════════════════════════════════════════════
   QUIZ HUB — OWNER CORE (Working Features Only)
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
window.db = db; 

const CURRENT_USER = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
const OWNER_USERNAME = 'ahmed';

/* ═══════════════════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════════════════ */

const $ = (id) => document.getElementById(id);
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const countObj = (v) => v && typeof v === 'object' ? Object.keys(v).length : 0;
const fmtDate = (ts) => ts ? new Date(ts).toLocaleString('ar-EG', {year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

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
  custom: async (fnName) => {
    const fn = window[fnName];
    if (typeof fn === 'function') await fn();
    else toast('⚠️ الدالة غير موجودة', 'error');
  },
  
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

let activeRoles = []; 
let activeBadges = []; 

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

/* TAB 4: Roles (Will be populated dynamically) */
FEATURES.roles = { title: '🎖️ الرتب', sub: 'إدارة موحدة', sections: [{ title: '🎖️ كل الرتب', items: [] }] };

/* TAB 5: Badges (Will be populated dynamically) */
FEATURES.badges = { title: '🏅 البادجات', sub: 'إدارة موحدة', sections: [{ title: '🏅 كل البادجات', items: [] }] };

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

/* TAB 12: Chat — شات إدارة حي (الواجهة في features/owner-work.js) */
FEATURES.chat = {
  title: '💬 شات الإدارة', sub: 'شات حي مع كل الإدارة — 7 غرف + بحث + إحصائيات + حذف',
  sections: []
};

/* TAB 12.5: Work Inbox — صندوق رسايل الشغل الحي */
FEATURES.work_inbox = {
  title: '📬 رسايل الشغل', sub: 'صندوق حي: رسايل الشركاء والمديرين + الملاحظات والاجتماعات والتقارير + رد فوري',
  sections: []
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

FEATURES.marketing = {
  title: '📣 التسويق', sub: '30 خاصية — حملات + كوبونات + إحالات + SEO',
  sections: [
    { title: '🎯 الحملات (5)', items: [FQ(cid++,'➕','حملة جديدة','createCampaign'),FQ(cid++,'👁️','عرض الحملات','viewCampaigns'),FQ(cid++,'🗑️','مسح','clearCampaigns','danger'),FQ(cid++,'📤','تصدير','exportCampaigns'),FQ(cid++,'⏰','جدولة حملة','scheduleCampaign')] },
    { title: '🎟️ كوبونات (5)', items: [FQ(cid++,'➕','كود جديد','createCoupon'),FQ(cid++,'👁️','عرض','viewCoupons'),FQ(cid++,'🗑️','مسح','clearCoupons','danger'),FQ(cid++,'⏸️','تعطيل','disableCoupon'),FQ(cid++,'📤','تصدير','exportCoupons')] },
    { title: '🔗 الإحالات (5)', items: [FQ(cid++,'⚙️','إعداد النظام','setupReferrals'),FQ(cid++,'👁️','عرض','viewReferrals'),FQ(cid++,'🎁','مكافآت','referralRewards'),FQ(cid++,'✅','الناجحة','viewSuccessfulReferrals'),FQ(cid++,'🗑️','مسح','clearReferrals','danger')] },
    { title: '🌐 الربط الخارجي (5)', items: [FQ(cid++,'⚙️','إعدادات SEO','setupSEO'),FQ(cid++,'🏷️','Meta Tags','editMetaTags'),FQ(cid++,'🗺️','Sitemap','generateSitemap'),FQ(cid++,'🤖','Robots.txt','editRobots')] },
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
    { title: '🔤 الخطوط (5)', items: [FQ(cid++,'📝','الخط الرئيسي','setMainFont'),FQ(cid++,'📰','خط العناوين','setHeadingFont'),FQ(cid++,'📏','حجم الخط','setFontSize'),FQ(cid++,'👁️','عرض','viewFonts')] },
    { title: '🖼️ الشعار (5)', items: [FQ(cid++,'🖼️','شعار جديد','uploadLogo'),FQ(cid++,'⭐','Favicon','uploadFavicon'),FQ(cid++,'🌓','شعار دارك/لايت','setThemeLogo'),FQ(cid++,'🗑️','مسح','clearLogo','danger'),FQ(cid++,'👁️','معاينة','previewLogo')] },
    { title: '📐 Layouts (5)', items: [FQ(cid++,'📐','تخطيط الهيدر','setHeaderLayout'),FQ(cid++,'📐','تخطيط الفوتر','setFooterLayout'),FQ(cid++,'📐','تخطيط السايدبار','setSidebarLayout'),FQ(cid++,'➕','صفحة مخصصة','createCustomPage'),FQ(cid++,'🎨','CSS مخصص','editCustomCSS')] },
    { title: '✨ الأنيميشن (5)', items: [FQ(cid++,'✨','خلفيات متحركة','toggleAnimatedBg'),FQ(cid++,'🎬','تأثيرات','toggleEffects'),FQ(cid++,'⭐','Gold Particles','toggleGoldParticles'),FQ(cid++,'🗑️','مسح','clearAnimations','danger'),FQ(cid++,'👁️','معاينة','previewAnimations')] }
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
  { name: 'Communication', tabs: ['messages','chat','work_inbox','broadcast','admin_messages'] },
  { name: 'Engagement', tabs: ['events','requests'] },
  { name: 'Security', tabs: ['security','reports','adv_security'] },
  { name: 'System', tabs: ['database','backup','automation'] },
  { name: 'Advanced', tabs: ['analytics','marketing','economy','teams','themes','audit','cms','i18n'] }
];
const TAB_ICONS = { overview:'📊', players:'👥', content:'🎮', roles:'🎖️', badges:'🏅', settings:'⚙️', messages:'📩', chat:'💬', work_inbox:'📬', broadcast:'📢', admin_messages:'💬', events:'🎉', requests:'📥', security:'🚫', reports:'📈', adv_security:'🛡️', database:'🗄️', backup:'💾', automation:'⚙️', analytics:'📊', marketing:'📣', economy:'💰', teams:'👥', themes:'🎨', audit:'📝', cms:'📚', i18n:'🌐' };

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

  /* 🆕 واجهات حية: شات الإدارة + صندوق رسايل الشغل (من features/owner-work.js) */
  if (tabKey === 'chat' && window._ownerWorkChatHTML) {
    pane.innerHTML = window._ownerWorkChatHTML();
    if (window._ownerChatInit) window._ownerChatInit();
    return;
  }
  if (tabKey === 'work_inbox' && window._ownerWorkInboxHTML) {
    pane.innerHTML = window._ownerWorkInboxHTML();
    if (window._ownerInboxInit) window._ownerInboxInit();
    return;
  }

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
      <button class="mini-btn gold" onclick="window._addBadgeToUser('${badgeName}')">➕ إعطاء لمستخدم</button>
      <button class="mini-btn bad" onclick="window._deleteBadgeCompletely('${badgeName}')">🗑️ حذف البادج نهائياً</button>
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
      <button class="mini-btn gold" onclick="window._addRoleToUser('${roleName}')">➕ تعيين لمستخدم</button>
      <button class="mini-btn bad" onclick="window._deleteRoleCompletely('${roleName}')">🗑️ حذف الرتبة نهائياً</button>
    </div>
    <h4 style="color:var(--gold); margin-bottom:10px;">الأعضاء الحاليين (${members.length}):</h4>
    <div style="max-height:50vh; overflow-y:auto;">
      ${members.length ? members.map(u => `<div class="list-item"><div class="list-item-title">👤 ${escapeHtml(u)}</div><button class="mini-btn bad" onclick="window._removeRoleFromUser('${roleName}', '${u}')">❌ إزالة</button></div>`).join('') : '<div class="empty-state">لا يوجد أعضاء</div>'}
    </div>
  `);
};

window._addBadgeToUser = (badge) => withUser('إعطاء بادج', async u => { await set(ref(db, 'badges/' + u + '/' + badge), true); toast('✅ تم'); setTimeout(() => location.reload(), 1000); });
window._removeBadgeFromUser = async (badge, u) => { await remove(ref(db, 'badges/' + u + '/' + badge)); toast('✅ تم'); setTimeout(() => location.reload(), 1000); };
window._deleteBadgeCompletely = async (badge) => {
  if (!confirm(`⚠️ حذف البادج "${badge}" نهائياً من النظام؟`)) return;
  await set(ref(db, 'site_settings/deleted_badges/' + badge), true);
  await remove(ref(db, 'site_settings/custom_badges/' + badge));
  
  const users = await all('badges');
  for (const u in users) if (users[u][badge]) await remove(ref(db, `badges/${u}/${badge}`));

  toast(`🗑️ تم حذف البادج ${badge} نهائياً`);
  setTimeout(() => location.reload(), 1000);
};

window._addRoleToUser = (role) => withUser('تعيين رتبة', async u => { await set(ref(db, 'roles/users/' + u), role); toast('✅ تم'); setTimeout(() => location.reload(), 1000); });
window._removeRoleFromUser = async (role, u) => { await remove(ref(db, 'roles/users/' + u)); toast('✅ تم'); setTimeout(() => location.reload(), 1000); };
window._deleteRoleCompletely = async (role) => {
  if (!confirm(`⚠️ حذف الرتبة "${role}" نهائياً من النظام؟`)) return;
  await set(ref(db, 'site_settings/deleted_roles/' + role), true);
  await remove(ref(db, 'site_settings/custom_roles/' + role));
  
  const users = await all('roles/users');
  for (const u in users) if (users[u] === role) await remove(ref(db, 'roles/users/' + u));

  toast(`🗑️ تم حذف الرتبة ${role} نهائياً`);
  setTimeout(() => location.reload(), 1000);
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

window.createRole = async () => {
  const name = prompt('اسم الرتبة الجديدة:');
  if (!name) return;
  await set(ref(db, 'site_settings/custom_roles/' + name), true);
  toast(`✅ تم إضافة الرتبة ${name}`);
  setTimeout(() => location.reload(), 1000);
};

window.createBadge = async () => {
  const name = prompt('اسم البادج الجديد:');
  if (!name) return;
  await set(ref(db, 'site_settings/custom_badges/' + name), true);
  toast(`✅ تم إضافة البادج ${name}`);
  setTimeout(() => location.reload(), 1000);
};

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
    const s = document.createElement('span'); s.style.left = Math.random() * 100 + '%'; s.style.animationDuration = (Math.random() * 20 + 15) + 's'; s.style.animationDelay = (Math.random() * 20) + 's'; s.style.width = s.style.height = (Math.random() * 3 + 2) + 'px';
    bgp.appendChild(s);
  }
}

async function init() {
  await new Promise(r => setTimeout(r, 500));
  if (!CURRENT_USER || CURRENT_USER !== OWNER_USERNAME) {
    $('loadingScreen').style.display = 'none'; $('accessDenied').classList.add('show'); return;
  }

  // تحميل الرتب والبادجات المخصصة والمحذوفة
  const customRolesSnap = await all('site_settings/custom_roles');
  const deletedRolesSnap = await all('site_settings/deleted_roles');
  const customBadgesSnap = await all('site_settings/custom_badges');
  const deletedBadgesSnap = await all('site_settings/deleted_badges');

  const customRoles = Object.keys(customRolesSnap);
  const deletedRoles = Object.keys(deletedRolesSnap);
  const customBadges = Object.keys(customBadgesSnap);
  const deletedBadges = Object.keys(deletedBadgesSnap);

  // فلترة الرتب والبادجات الأصلية والمخصصة
  activeRoles = [...ROLES, ...customRoles].filter(r => !deletedRoles.includes(r));
  activeBadges = [...BADGES, ...customBadges].filter(b => !deletedBadges.includes(b));

  // بناء الـ Features ديناميكياً
  FEATURES.roles.sections[0].items = activeRoles.map(r => FQ(0,'🎖️',`إدارة رتبة: ${r}`,`manageRole_${r}`));
  FEATURES.roles.sections[0].items.push(FQ(0,'➕','إنشاء رتبة جديدة','createRole'));

  FEATURES.badges.sections[0].items = activeBadges.map(b => FQ(0,'🏅',`إدارة بادج: ${b}`,`manageBadge_${b}`));
  FEATURES.badges.sections[0].items.push(FQ(0,'➕','إنشاء بادج جديد','createBadge'));

  // ربط الدوال
  activeRoles.forEach(r => { window[`manageRole_${r}`] = () => manageRoleList(r); });
  activeBadges.forEach(b => { window[`manageBadge_${b}`] = () => manageBadgeList(b); });

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