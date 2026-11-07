/* ============================================================
   OWNER PANEL CORE - Quiz Hub (FINAL POLISH & THEME FIX)
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, remove, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
  authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
  databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
  projectId: "quiz-hub-app-f4cd0",
  storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
  messagingSenderId: "282772179392",
  appId: "1:282772179392:web:64646d757592b29ff3a025"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

window.db = db; window.ref = ref; window.get = get; window.set = set;
window.remove = remove; window.update = update; window.push = push;

const currentUser = (localStorage.getItem('loggedInUser') || '').trim();
if (!currentUser) location.href = 'index.html';

/* ==================== ESCAPE (XSS SAFE) ==================== */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ==================== HELPERS ==================== */
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'success' ? '' : type);
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
window.toast = toast;

/* أداة لتنسيق الداتا بشكل شيك بدل الـ JSON */
function formatObject(obj, title = '') {
  if (!obj || typeof obj !== 'object') return `<div style="padding:10px; background:var(--bg-2); border-radius:8px; color:var(--text);">${esc(obj)}</div>`;
  
  let html = `<div style="background:var(--bg-2); padding:15px; border-radius:8px; direction:ltr; text-align:left; font-family:monospace; font-size:14px; line-height:1.8; max-height:400px; overflow-y:auto; border:1px solid var(--border); color:var(--text);">`;
  if (title) html += `<h3 style="margin:0 0 10px 0; color:var(--primary);">${esc(title)}:</h3>`;

  for (const [k, v] of Object.entries(obj)) {
    let valStr = '';
    if (v !== null && typeof v === 'object') {
      valStr = `<pre style="margin:5px 0; padding:8px; background:rgba(128,128,128,0.1); border-radius:4px; font-size:12px; color:var(--text); white-space:pre-wrap; word-wrap:break-word;">${esc(JSON.stringify(v, null, 2))}</pre>`;
    } else if (k === 'profilePic' && typeof v === 'string' && v.startsWith('http')) {
      valStr = `<img src="${esc(v)}" style="height:40px; border-radius:4px; vertical-align:middle;">`;
    } else {
      valStr = `<span style="color:var(--success); font-weight:bold;">${esc(v)}</span>`;
    }
    html += `<div style="margin-bottom:8px;"><span style="color:var(--primary); font-weight:bold;">${esc(k)}:</span> ${valStr}</div>`;
  }
  html += `</div>`;
  return html;
}

function showModal(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').textContent = typeof content === 'string'
    ? content : JSON.stringify(content, null, 2);
  document.getElementById('modal-overlay').classList.add('active');
}

window.showModalHTML = function (title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('active');
};

window.closeModal = () => document.getElementById('modal-overlay').classList.remove('active');

/* ---- Site-styled prompt / confirm ---- */
window._siteDialogCancel = null;

document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') {
    if (window._siteDialogCancel) { window._siteDialogCancel(); }
    else { window.closeModal(); }
  }
});

window.sitePrompt = function (message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '✏️ إدخال';
    const safe = String(defaultValue).replace(/"/g, '&quot;');
    document.getElementById('modal-content').innerHTML = `
      <p style="margin-bottom:12px; line-height:1.6;">${esc(message)}</p>
      <input type="text" id="sitePromptInput" value="${safe}" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--bg-2); color:var(--text); font-size:14px; margin-bottom:12px; box-sizing:border-box;">
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="feature-btn" id="sitePromptCancel">إلغاء</button>
        <button class="feature-btn good" id="sitePromptOk">موافق</button>
      </div>`;
    overlay.classList.add('active');
    const input = document.getElementById('sitePromptInput');
    setTimeout(() => { input.focus(); input.select(); }, 50);
    const close = (val) => { overlay.classList.remove('active'); window._siteDialogCancel = null; resolve(val); };
    window._siteDialogCancel = () => close(null);
    document.getElementById('sitePromptCancel').onclick = () => close(null);
    document.getElementById('sitePromptOk').onclick = () => close(input.value);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') close(input.value);
      if (e.key === 'Escape') close(null);
    };
  });
};

window.siteConfirm = function (message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = '⚠️ تأكيد';
    document.getElementById('modal-content').innerHTML = `
      <p style="margin-bottom:12px; line-height:1.6;">${esc(message)}</p>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="feature-btn" id="siteConfirmCancel">إلغاء</button>
        <button class="feature-btn danger" id="siteConfirmOk">تأكيد</button>
      </div>`;
    overlay.classList.add('active');
    const close = (val) => { overlay.classList.remove('active'); window._siteDialogCancel = null; resolve(val); };
    window._siteDialogCancel = () => close(false);
    document.getElementById('siteConfirmCancel').onclick = () => close(false);
    document.getElementById('siteConfirmOk').onclick = () => close(true);
  });
};

function download(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 100);
}
window.download = download;

function countKeys(obj) { return (!obj || typeof obj !== 'object') ? 0 : Object.keys(obj).length; }

window.toggleTheme = () => {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('ownerTheme', isLight ? 'light' : 'dark');
};

window.logout = () => {
  signOut(auth).then(() => {
    localStorage.removeItem('loggedInUser');
    location.href = 'index.html';
  });
};

if (localStorage.getItem('ownerTheme') === 'light') document.body.classList.add('light-mode');

/* ==================== RED LINES ==================== */
function initRedLines() {
  const c = document.getElementById('redLinesContainer');
  if (!c) return;
  c.innerHTML = '';
  for (let i = 0; i < 100; i++) {
    const line = document.createElement('div');
    line.className = 'red-line';
    c.appendChild(line);
  }
}

/* ==================== CORE OPS ==================== */
async function nodeStats(node) {
  try {
    const snap = await get(ref(db, node));
    const data = snap.val();
    if (!data) return showModal('📊 ' + node, 'لا توجد بيانات');
    
    let html = `<p style="margin-bottom:12px; font-size:16px;">عدد العناصر: <b style="color:var(--primary);">${countKeys(data)}</b></p>`;
    let displayData = data;
    if (typeof data === 'object' && countKeys(data) > 50) {
       displayData = Object.fromEntries(Object.entries(data).slice(0, 50));
       html += `<p style="color:var(--text-2); font-size:12px; margin-bottom:8px;">(يتم عرض أول 50 عنصر فقط)</p>`;
    }
    html += formatObject(displayData);
    showModalHTML('📊 ' + node, html);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function nodeExport(node) {
  try {
    const snap = await get(ref(db, node));
    download(node.replace(/\//g, '_') + '.json', JSON.stringify(snap.val() || {}, null, 2));
    toast('تم تصدير ' + node);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function nodeClear(node) {
  if (!await siteConfirm(`مسح كل بيانات "${node}"؟`)) return;
  try {
    await remove(ref(db, node));
    toast('تم مسح ' + node, 'success');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

/* ==================== QUIZ OPS ==================== */
async function quizStats(q) {
  try {
    const snap = await get(ref(db, 'scores'));
    const data = snap.val() || {};
    let players = 0, attempts = 0, bestScore = 0;
    Object.values(data).forEach(quizzes => {
      if (quizzes[q]) {
        players++;
        Object.values(quizzes[q]).forEach(a => {
          attempts++;
          if (a.score > bestScore) bestScore = a.score;
        });
      }
    });
    showModal('🎮 ' + q, `عدد اللاعبين: ${players}\nعدد المحاولات: ${attempts}\nأعلى نتيجة: ${bestScore}`);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function quizExport(q) {
  try {
    const snap = await get(ref(db, 'scores'));
    const data = snap.val() || {};
    const filtered = {};
    Object.entries(data).forEach(([u, quizzes]) => { if (quizzes[q]) filtered[u] = quizzes[q]; });
    download(q + '_scores.json', JSON.stringify(filtered, null, 2));
    toast('تم التصدير');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function quizReset(q) {
  if (!await siteConfirm(`تصفير نتائج ${q}؟`)) return;
  try {
    const snap = await get(ref(db, 'scores'));
    const data = snap.val() || {};
    for (const user in data) if (data[user][q]) await remove(ref(db, `scores/${user}/${q}`));
    toast('تم التصفير');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function quizClear(q) {
  if (!await siteConfirm(`مسح ${q} نهائياً من الكل؟`)) return;
  try {
    await quizResetSilent(q);
    const lb = await get(ref(db, 'leaderboard'));
    const data = lb.val() || {};
    for (const u in data) if (data[u][q]) await remove(ref(db, `leaderboard/${u}/${q}`));
    toast('تم المسح');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function quizResetSilent(q) {
  const snap = await get(ref(db, 'scores'));
  const data = snap.val() || {};
  for (const user in data) if (data[user][q]) await remove(ref(db, `scores/${user}/${q}`));
}

/* ==================== RANK OPS ==================== */
async function rankMembers(rank) {
  try {
    const snap = await get(ref(db, 'roles/users'));
    const data = snap.val() || {};
    const members = Object.entries(data).filter(([, r]) => r === rank).map(([u]) => u);
    showModal('👥 ' + rank, `العدد: ${members.length}\n\n${members.join('\n') || 'لا يوجد أعضاء'}`);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function rankAssignPrompt(rank) {
  const user = await sitePrompt(`اسم اللاعب اللي هياخد رتبة ${rank}:`);
  if (!user) return;
  try {
    await set(ref(db, 'roles/users/' + user), rank);
    toast('تم تعيين ' + rank + ' لـ ' + user);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function rankClear(rank) {
  if (!await siteConfirm(`مسح رتبة ${rank} من الكل؟`)) return;
  try {
    const snap = await get(ref(db, 'roles/users'));
    const data = snap.val() || {};
    for (const u in data) if (data[u] === rank) await remove(ref(db, 'roles/users/' + u));
    toast('تم المسح');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

window.deleteCustomRank = async (r) => {
  if (!await siteConfirm(`حذف الرتبة "${r}" نهائياً من النظام؟ (سيتم إزالتها من كل اللاعبين)`)) return;
  try {
    await remove(ref(db, 'custom_ranks/' + r));
    const snap = await get(ref(db, 'roles/users'));
    const data = snap.val() || {};
    for (const u in data) if (data[u] === r) await remove(ref(db, 'roles/users/' + u));
    toast('تم حذف الرتبة نهائياً');
    renderRolesTab();
    closeModal();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
};

/* ==================== BADGE OPS ==================== */
async function badgeMembers(badge) {
  try {
    const snap = await get(ref(db, 'badges'));
    const data = snap.val() || {};
    const holders = [];
    for (const u in data) if (data[u] && data[u][badge]) holders.push(u);
    showModal('🏅 ' + badge, `العدد: ${holders.length}\n\n${holders.join('\n') || 'لا يوجد'}`);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function badgeAssignPrompt(badge) {
  const user = await sitePrompt(`اسم اللاعب اللي هياخد بادج ${badge}:`);
  if (!user) return;
  try {
    await set(ref(db, `badges/${user}/${badge}`), true);
    toast('تم الإعطاء');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function badgeClear(badge) {
  if (!await siteConfirm(`مسح بادج ${badge} من الكل؟`)) return;
  try {
    const snap = await get(ref(db, 'badges'));
    const data = snap.val() || {};
    for (const u in data) if (data[u][badge]) await remove(ref(db, `badges/${u}/${badge}`));
    toast('تم المسح');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

window.deleteCustomBadge = async (b) => {
  if (!await siteConfirm(`حذف البادج "${b}" نهائياً من النظام؟`)) return;
  try {
    await remove(ref(db, 'custom_badges/' + b));
    const snap = await get(ref(db, 'badges'));
    const data = snap.val() || {};
    for (const u in data) if (data[u] && data[u][b]) await remove(ref(db, `badges/${u}/${b}`));
    toast('تم حذف البادج نهائياً');
    renderBadgesTab();
    closeModal();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
};

/* ==================== SETTINGS OPS (UPGRADED) ==================== */
async function settingView(key, label) {
  try {
    const snap = await get(ref(db, 'site_settings/' + key));
    showModal('⚙️ ' + label, `القيمة: ${snap.exists() ? JSON.stringify(snap.val()) : '(غير محدد)'}`);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function settingEdit(key, label) {
  try {
    const snap = await get(ref(db, 'site_settings/' + key));
    let current = snap.exists() ? snap.val() : '';
    const isBool = typeof current === 'boolean' || current === 'true' || current === 'false' || current === 1 || current === 0;
    const isOn = current === true || current === 'true' || current === 1;

    let html = `<p style="margin-bottom:15px; font-size:16px;">${label}</p>`;

    if (isBool) {
      html += `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-2); padding:15px; border-radius:8px; margin-bottom:15px;">
          <span>الحالة (ON / OFF)</span>
          <label class="switch">
            <input type="checkbox" id="settingToggle" ${isOn ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
        </div>`;
    } else {
      const safeVal = String(current).replace(/"/g, '&quot;');
      html += `
        <input type="text" id="settingInput" value="${safeVal}" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-2); color:var(--text); margin-bottom:15px; box-sizing:border-box;">`;
    }

    html += `
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="feature-btn" onclick="closeModal()">إلغاء</button>
        <button class="feature-btn good" onclick="saveSetting('${key}', ${isBool})">حفظ التغييرات</button>
      </div>`;

    showModalHTML('⚙️ تعديل ' + label, html);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

window.saveSetting = async function (key, isBool) {
  try {
    let val;
    if (isBool) {
      val = document.getElementById('settingToggle').checked;
    } else {
      val = document.getElementById('settingInput').value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(val) && val.trim() !== '') val = Number(val);
    }
    await set(ref(db, 'site_settings/' + key), val);
    toast('تم حفظ الإعداد بنجاح');
    closeModal();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
};

/* ==================== FEATURE REGISTRY ==================== */
const CATEGORIES = {
  dashboard: {}, users: {}, content: {}, roles: {}, badges: {},
  settings: {}, messages: {}, events: {}, security: {}, reports: {},
  db: {}, chat: {}, broadcast: {}, admin_messages: {}, requests: {}
};

function F(section, category, icon, label, fn, cls = '') {
  if (!CATEGORIES[section][category]) CATEGORIES[section][category] = [];
  CATEGORIES[section][category].push({ icon, label, fn, cls });
}

/* ==================== CONSTANTS ==================== */
const QUIZZES = ['annabelle','conjuring','TheNun','FNAF','SquidGame','spiderman',
  'spiderman2026','avengers','avatar','venom','birdsofprey','fall',
  'Wednesday','knivesout','scream','TrainToBusan','elharifa'];

const RANKS = ['Owner','Admin','VIP','Star','Divine','Angel','Dragon',
  'King','Legend','Lion','Genius','Pro Player','Knight','Ninja','Player'];

const BADGES = ['Founder','Alien','VIP','Sniper','Action','Star',
  'Genius','Detective','Horror','K-Drama','Gamer'];

const CONTENT_TYPES = ['comments','suggestions','quiz_requests','warnings',
  'support_tickets','admin_requests','activity_feed','partner_ideas',
  'global_chat','challenges'];

const ADMIN_ROLES = [
  { key: 'group', name: 'جماعي (الكل)', emoji: '👥' },
  { key: 'owner', name: 'الأونر', emoji: '👑' },
  { key: 'partner', name: 'الشريك', emoji: '🤝' },
  { key: 'manager', name: 'المدير', emoji: '📋' },
  { key: 'tester', name: 'التستر', emoji: '🧪' },
  { key: 'builder', name: 'البيلدر', emoji: '🏗️' },
  { key: 'admin', name: 'الأدمن', emoji: '🛡️' }
];

/* ==================== DB NODES ==================== */
const DB_NODES = {
  usernames: 'أسماء المستخدمين', users_data: 'بيانات المستخدمين',
  scores: 'نتائج الكويزات', leaderboard: 'المتصدرين',
  speedrun_scores: 'نتائج السرعة', badges: 'البادجات',
  roles: 'الرتب', friends: 'الأصدقاء',
  friend_requests: 'طلبات الصداقة', messages: 'الرسائل',
  comments: 'التعليقات', suggestions: 'الاقتراحات',
  quiz_requests: 'طلبات الكويزات', warnings: 'التحذيرات',
  banned_users: 'المحظورين', support_tickets: 'تذاكر الدعم',
  global_chat: 'الشات العام', challenges: 'التحديات',
  rooms: 'الغرف', presence: 'حالة الاتصال',
  teams: 'التيمات', partner_ideas: 'أفكار الشركاء',
  partners_chat: 'شات الشركاء', admin_requests: 'طلبات الإدارة',
  manager_requests: 'طلبات المديرين', activity_feed: 'آخر الأنشطة',
  site_events: 'الفعاليات', site_settings: 'إعدادات الموقع',
  owner_inbox: 'صندوق الأونر', kick_signals: 'إشارات الطرد',
  verified_users: 'الموثقين', broadcast_messages: 'رسائل البث'
};
Object.entries(DB_NODES).forEach(([node, name]) => {
  F('db', '📊 إحصائيات المسارات', '📊', 'إحصائيات ' + name, () => nodeStats(node), 'info');
  F('db', '📥 تصدير المسارات', '📥', 'تصدير ' + name, () => nodeExport(node));
  F('db', '🗑️ مسح المسارات', '🗑️', 'مسح ' + name, () => nodeClear(node), 'danger');
});

/* ==================== SETTINGS ==================== */
const SETTINGS = [
  ['siteName','اسم الموقع'],['announcement','الإعلان'],['colorPrimary','اللون الأساسي'],
  ['maintenance','وضع الصيانة'],['chatOff','إيقاف الشات'],['version','الإصدار'],
  ['welcomeMessage','رسالة الترحيب'],['maxRoomsPerUser','حد الغرف'],
  ['xpMultiplier','مضاعف XP'],['coinsPerQuiz','كوينز لكل كويز'],
  ['dailyBonus','بونص يومي'],['maxWarnings','أقصى تحذيرات'],
  ['banDuration','مدة الحظر'],['registrationOpen','التسجيل مفتوح'],
  ['friendRequestsOn','طلبات الصداقة'],['chatModeration','رقابة الشات'],
  ['autoBan','الحظر التلقائي'],['maxPlayersPerRoom','أقصى لاعبين/غرفة'],
  ['leaderboardReset','تصفير المتصدرين'],['quizCooldown','تبريد الكويزات'],
  ['leaderboardInterval','تحديث المتصدرين'],['teamBattleOn','حرب التيمات'],
  ['speedrunOn','وضع السرعة'],['challengeOn','وضع التحدي'],['ghostModeOn','وضع الشبح']
];
SETTINGS.forEach(([key, label]) => {
  F('settings', '⚙️ إعدادات الموقع', '✏️', 'تعديل ' + label, () => settingEdit(key, label));
  F('settings', '⚙️ إعدادات الموقع', '📊', 'عرض ' + label, () => settingView(key, label), 'info');
});

/* ==================== DASHBOARD ==================== */
async function dashStat(node) {
  try {
    const snap = await get(ref(db, node));
    showModal('📊 ' + node, `العدد: ${countKeys(snap.val())}`);
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}
['usernames','banned_users','warnings','comments','suggestions',
 'support_tickets','global_chat','rooms','challenges','friends'
].forEach(n => F('dashboard', '📊 نظرة سريعة', '📊', 'عدد ' + n, () => dashStat(n), 'info'));

F('dashboard', '⚡ أوامر سريعة', '🔄', 'تحديث الإحصائيات', () => { loadDashboardStats(); toast('تم التحديث'); }, 'info');
F('dashboard', '⚡ أوامر سريعة', '📥', 'تصدير كل البيانات', async () => {
  const snap = await get(ref(db, '.'));
  download('all_data_backup.json', JSON.stringify(snap.val(), null, 2));
  toast('تم التصدير');
});
F('dashboard', '⚡ أوامر سريعة', '🧹', 'مسح كل الغرف', async () => {
  if (!await siteConfirm('مسح كل الغرف النشطة؟')) return;
  await remove(ref(db, 'rooms')); toast('تم المسح');
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '♻️', 'تصفير المتصدرين', async () => {
  if (!await siteConfirm('تصفير الليدربورد بالكامل؟')) return;
  await remove(ref(db, 'leaderboard')); toast('تم التصفير');
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '💾', 'نسخة احتياطية', async () => {
  const snap = await get(ref(db, '.'));
  download('backup_' + Date.now() + '.json', JSON.stringify(snap.val(), null, 2));
  toast('تم النسخ الاحتياطي');
});
F('dashboard', '⚡ أوامر سريعة', '📨', 'إرسال تقرير للأونر', async () => {
  const usersSnap = await get(ref(db, 'usernames'));
  const count = countKeys(usersSnap.val());
  await push(ref(db, 'messages/owner_inbox'), {
    from: currentUser, text: `تقرير سريع: عدد اللاعبين = ${count}`, time: Date.now()
  });
  toast('تم الإرسال');
});
F('dashboard', '⚡ أوامر سريعة', '📊', 'أعلى 10 XP', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  const sorted = Object.entries(data).map(([u, v]) => [u, (v && v.xp) || 0])
    .sort((a, b) => b[1] - a[1]).slice(0, 10);
  showModal('🏆 أعلى 10 XP', sorted.map((x, i) => `${i+1}. ${x[0]}: ${x[1]} XP`).join('\n') || 'لا بيانات');
});
F('dashboard', '⚡ أوامر سريعة', '📊', 'أكثر الكويزات لعباً', async () => {
  const snap = await get(ref(db, 'scores'));
  const data = snap.val() || {};
  const counts = {};
  Object.values(data).forEach(u => Object.keys(u).forEach(q => counts[q] = (counts[q] || 0) + 1));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  showModal('🎮 الأكثر لعباً', sorted.map((x, i) => `${i+1}. ${x[0]}: ${x[1]} لاعب`).join('\n') || 'لا بيانات');
});
F('dashboard', '⚡ أوامر سريعة', '📊', 'أقل الكويزات لعباً', async () => {
  const snap = await get(ref(db, 'scores'));
  const data = snap.val() || {};
  const counts = {};
  Object.values(data).forEach(u => Object.keys(u).forEach(q => counts[q] = (counts[q] || 0) + 1));
  const sorted = Object.entries(counts).sort((a, b) => a[1] - b[1]);
  showModal('🎮 الأقل لعباً', sorted.map((x, i) => `${i+1}. ${x[0]}: ${x[1]} لاعب`).join('\n') || 'لا بيانات');
});
F('dashboard', '⚡ أوامر سريعة', '🩺', 'فحص الاتصال', async () => {
  const t = Date.now();
  await get(ref(db, '.info/connected'));
  toast('الاستجابة: ' + (Date.now() - t) + 'ms', 'info');
});
F('dashboard', '⚡ أوامر سريعة', '🧹', 'مسح الحسابات الفارغة', async () => {
  if (!await siteConfirm('مسح الحسابات بدون XP؟')) return;
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  let removed = 0;
  for (const u in data) if (!data[u] || !data[u].xp) { await remove(ref(db, 'users_data/' + u)); removed++; }
  toast('تم المسح: ' + removed);
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '👥', 'المتصلين حالياً', async () => {
  const snap = await get(ref(db, 'presence'));
  const data = snap.val() || {};
  const online = Object.entries(data).filter(([, v]) => v.status === 'online').map(([u]) => u);
  showModal('🟢 المتصلين (' + online.length + ')', online.join('\n') || 'لا يوجد');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '📊', 'إجمالي XP الموقع', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  let total = 0;
  Object.values(data).forEach(v => total += (v && v.xp) || 0);
  showModal('📊 إجمالي XP', 'المجموع: ' + total);
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '📊', 'متوسط XP', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  const vals = Object.values(data).map(v => (v && v.xp) || 0);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  showModal('📊 متوسط XP', 'المتوسط: ' + avg);
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🟢', 'المتصلين آخر 24 ساعة', async () => {
  const snap = await get(ref(db, 'presence'));
  const data = snap.val() || {};
  const dayAgo = Date.now() - 86400000;
  const count = Object.values(data).filter(v => (v.last_seen || 0) > dayAgo).length;
  showModal('🟢 نشطين 24 ساعة', 'العدد: ' + count);
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '📩', 'عرض صندوق الأونر', async () => {
  const snap = await get(ref(db, 'messages/owner_inbox'));
  const data = snap.val() || {};
  const msgs = Object.values(data).slice(-20).map(m => `[${m.from}] ${m.text}`).join('\n');
  showModal('📩 صندوق الأونر', msgs || 'لا رسائل');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '💬', 'شات الشركاء', async () => {
  const snap = await get(ref(db, 'partners_chat'));
  const data = snap.val() || {};
  const msgs = Object.values(data).slice(-20).map(m => `[${m.sender}] ${m.text}`).join('\n');
  showModal('💬 شات الشركاء', msgs || 'فاضي');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '📊', 'عدد الغرف', async () => {
  const snap = await get(ref(db, 'rooms'));
  showModal('🚪 الغرف', 'العدد: ' + countKeys(snap.val()));
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🔄', 'مسح presence', async () => {
  if (!await siteConfirm('مسح كل presence؟')) return;
  await remove(ref(db, 'presence')); toast('تم المسح');
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '📤', 'تقرير الغرف', async () => {
  const snap = await get(ref(db, 'rooms'));
  download('rooms.json', JSON.stringify(snap.val() || {}, null, 2));
  toast('تم');
});
F('dashboard', '⚡ أوامر سريعة', '👑', 'عرض كل الأدمنز', async () => {
  const snap = await get(ref(db, 'roles/admins'));
  const data = snap.val() || {};
  showModal('🛡️ الأدمنز', Object.keys(data).join('\n') || 'لا يوجد');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🎖️', 'عرض كل الرتب', async () => {
  const snap = await get(ref(db, 'roles/users'));
  const data = snap.val() || {};
  const lines = Object.entries(data).map(([u, r]) => `${u} → ${r}`);
  showModal('🎖️ الرتب', lines.join('\n') || 'لا يوجد');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🏅', 'عرض كل البادجات', async () => {
  const snap = await get(ref(db, 'badges'));
  const data = snap.val() || {};
  const lines = Object.entries(data).map(([u, b]) => `${u}: ${Object.keys(b).join(', ')}`);
  showModal('🏅 البادجات', lines.join('\n') || 'لا يوجد');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '📊', 'احصائيات الأسبوع', async () => {
  const snap = await get(ref(db, 'scores'));
  const data = snap.val() || {};
  const weekAgo = Date.now() - 7 * 86400000;
  let attempts = 0;
  Object.values(data).forEach(u => Object.values(u).forEach(q => Object.values(q).forEach(a => {
    if (new Date(a.time).getTime() > weekAgo) attempts++;
  })));
  showModal('📊 هذا الأسبوع', 'المحاولات: ' + attempts);
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🚫', 'قائمة المحظورين', async () => {
  const snap = await get(ref(db, 'banned_users'));
  const data = snap.val() || {};
  const lines = Object.entries(data).map(([u, v]) => `${u}: ${v.reason || 'مخالفة'}`);
  showModal('🚫 المحظورين', lines.join('\n') || 'لا يوجد');
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '⚠️', 'قائمة التحذيرات', async () => {
  const snap = await get(ref(db, 'warnings'));
  const data = snap.val() || {};
  const lines = Object.entries(data).map(([u, v]) => `${u}: ${v.text || ''}`);
  showModal('⚠️ التحذيرات', lines.join('\n') || 'لا يوجد');
}, 'danger');
F('dashboard', '⚡ أوامر سريعة', '📊', 'عدد المسجلين اليوم', async () => {
  const snap = await get(ref(db, 'usernames'));
  const data = snap.val() || {};
  showModal('👥 إجمالي المسجلين', 'العدد: ' + countKeys(data));
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🔄', 'تحديث كامل', () => location.reload());
F('dashboard', '⚡ أوامر سريعة', '📊', 'عدد الطلبات', async () => {
  const snap = await get(ref(db, 'friend_requests'));
  showModal('📩 طلبات الصداقة', 'العدد: ' + countKeys(snap.val()));
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '🎁', 'عرض العروض النشطة', async () => {
  const snap = await get(ref(db, 'site_events/active_offers'));
  const data = snap.val() || {};
  showModal('🎁 العروض', Object.values(data).map(o => o.text).join('\n') || 'لا يوجد');
}, 'info');
F('dashboard', '⚡ أوامر سريعة', '⚙️', 'كل الإعدادات', async () => {
  const snap = await get(ref(db, 'site_settings'));
  showModalHTML('⚙️ الإعدادات', formatObject(snap.val() || {}));
}, 'info');
F('dashboard', '✓ التوثيق', '✓', 'عرض كل الموثقين', () => viewVerifiedUsers(), 'info');

/* ==================== USERS GENERIC ==================== */
async function listUsers(filter) {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  let users = Object.entries(data);
  if (filter === 'online') {
    const p = (await get(ref(db, 'presence'))).val() || {};
    users = users.filter(([u]) => p[u] && p[u].status === 'online');
  } else if (filter === 'top_xp') {
    users.sort((a, b) => ((b[1] && b[1].xp) || 0) - ((a[1] && a[1].xp) || 0));
  } else if (filter === 'zero_xp') {
    users = users.filter(([, v]) => !v || !v.xp);
  }
  showModal('👥 قائمة', users.map(([u, v]) => `${u} (XP: ${(v && v.xp) || 0})`).join('\n') || 'لا يوجد');
}

F('users', '🔍 عرض اللاعبين', '👥', 'كل اللاعبين', () => listUsers('all'));
F('users', '🔍 عرض اللاعبين', '🟢', 'المتصلين', () => listUsers('online'), 'info');
F('users', '🔍 عرض اللاعبين', '🏆', 'أعلى XP', () => listUsers('top_xp'), 'success');
F('users', '🔍 عرض اللاعبين', '📉', 'صفر XP', () => listUsers('zero_xp'));
F('users', '🔍 عرض اللاعبين', '🚫', 'المحظورين', async () => {
  const snap = await get(ref(db, 'banned_users'));
  showModal('🚫 المحظورين', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'danger');
F('users', '🔍 عرض اللاعبين', '⚠️', 'التحذيرات', async () => {
  const snap = await get(ref(db, 'warnings'));
  showModal('⚠️ تحذيرات', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'danger');
F('users', '🔍 عرض اللاعبين', '🛡️', 'الأدمنز', async () => {
  const snap = await get(ref(db, 'roles/admins'));
  showModal('🛡️ الأدمنز', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'info');
F('users', '🔍 عرض اللاعبين', '👑', 'الأونر', () => showModal('👑', 'ahmed'), 'info');
F('users', '🔍 عرض اللاعبين', '📋', 'المديرين', async () => {
  const snap = await get(ref(db, 'roles/managers'));
  showModal('📋 المديرين', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'info');
F('users', '🔍 عرض اللاعبين', '🤝', 'الشركاء', async () => {
  const snap = await get(ref(db, 'roles/partners'));
  showModal('🤝 الشركاء', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'info');
F('users', '🔍 عرض اللاعبين', '🧪', 'التسترات', async () => {
  const snap = await get(ref(db, 'roles/testers'));
  showModal('🧪 التسترات', Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}, 'info');
F('users', '🔍 عرض اللاعبين', '✓', 'الموثقين', () => viewVerifiedUsers(), 'success');
F('users', '📥 تصدير اللاعبين', '📥', 'تصدير JSON', async () => {
  const snap = await get(ref(db, 'users_data'));
  download('users.json', JSON.stringify(snap.val() || {}, null, 2));
  toast('تم');
});
F('users', '📥 تصدير اللاعبين', '📊', 'تصدير CSV', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  const csv = 'username,xp,coins,team\n' + Object.entries(data).map(([u, v]) =>
    `${u},${(v && v.xp) || 0},${(v && v.coins) || 0},${(v && v.team) || ''}`).join('\n');
  download('users.csv', csv, 'text/csv');
  toast('تم');
}, 'success');
F('users', '♻️ إجراءات جماعية', '♻️', 'تصفير كل XP', async () => {
  if (!await siteConfirm('تصفير كل XP؟')) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) await update(ref(db, 'users_data/' + u), { xp: 0 });
  toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '💰', 'تصفير كل كوينز', async () => {
  if (!await siteConfirm('تصفير كل الكوينز؟')) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) await update(ref(db, 'users_data/' + u), { coins: 0 });
  toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '🎨', 'مسح كل الصور', async () => {
  if (!await siteConfirm('مسح كل صور الملف الشخصي؟')) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) await remove(ref(db, 'users_data/' + u + '/profilePic'));
  toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '👥', 'مسح كل الأصدقاء', async () => {
  if (!await siteConfirm('مسح كل الأصدقاء؟')) return;
  await remove(ref(db, 'friends')); toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '📩', 'مسح كل طلبات الصداقة', async () => {
  if (!await siteConfirm('مسح كل الطلبات؟')) return;
  await remove(ref(db, 'friend_requests')); toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '🔥', 'تصفير الستريك', async () => {
  if (!await siteConfirm('تصفير كل الستريك؟')) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) await update(ref(db, 'users_data/' + u), { streak: 0 });
  toast('تم');
}, 'danger');
F('users', '♻️ إجراءات جماعية', '⚔️', 'مسح كل التيمات', async () => {
  if (!await siteConfirm('مسح كل التيمات من اللاعبين؟')) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) await remove(ref(db, 'users_data/' + u + '/team'));
  toast('تم');
}, 'danger');
F('users', '📊 إحصائيات', '📊', 'متوسط XP', async () => {
  const snap = await get(ref(db, 'users_data'));
  const vals = Object.values(snap.val() || {}).map(v => (v && v.xp) || 0);
  const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  showModal('متوسط XP', avg);
}, 'info');
F('users', '📊 إحصائيات', '📊', 'متوسط المستوى', async () => {
  const snap = await get(ref(db, 'users_data'));
  const vals = Object.values(snap.val() || {}).map(v => (v && v.xp) || 0);
  const levels = vals.map(x => Math.min(10, Math.floor(x / 300) + 1));
  const avg = levels.length ? Math.round(levels.reduce((a, b) => a + b, 0) / levels.length) : 0;
  showModal('متوسط المستوى', avg);
}, 'info');
F('users', '📊 إحصائيات', '👥', 'عدد اللي معاهم صور', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  const count = Object.values(data).filter(v => v && v.profilePic).length;
  showModal('بصور', count);
}, 'info');
F('users', '📊 إحصائيات', '📊', 'توزيع التيمات', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  const teams = {};
  Object.values(data).forEach(v => { if (v && v.team) teams[v.team] = (teams[v.team] || 0) + 1; });
  showModalHTML('توزيع التيمات', formatObject(teams));
}, 'info');
F('users', '📊 إحصائيات', '📊', 'توزيع الرتب', async () => {
  const snap = await get(ref(db, 'roles/users'));
  const data = snap.val() || {};
  const r = {};
  Object.values(data).forEach(v => r[v] = (r[v] || 0) + 1);
  showModalHTML('توزيع الرتب', formatObject(r));
}, 'info');
F('users', '📊 إحصائيات', '🏅', 'توزيع البادجات', async () => {
  const snap = await get(ref(db, 'badges'));
  const data = snap.val() || {};
  const b = {};
  Object.values(data).forEach(v => Object.keys(v).forEach(k => b[k] = (b[k] || 0) + 1));
  showModalHTML('توزيع البادجات', formatObject(b));
}, 'info');
F('users', '📩 إجراءات', '📩', 'رسالة جماعية للكل', async () => {
  const text = await sitePrompt('نص الرسالة:');
  if (!text) return;
  const snap = await get(ref(db, 'usernames'));
  for (const u in (snap.val() || {})) await push(ref(db, 'messages/' + u), { from: currentUser, text, time: Date.now() });
  toast('تم الإرسال للكل');
});
F('users', '📩 إجراءات', '🔔', 'إشعار جماعي', async () => {
  const text = await sitePrompt('نص الإشعار:');
  if (!text) return;
  await push(ref(db, 'global_notifications'), { text, from: currentUser, time: Date.now() });
  toast('تم');
});

/* ==================== MESSAGES ==================== */
F('messages', '📩 صندوق الأونر', '👁️', 'عرض الرسائل', async () => {
  const snap = await get(ref(db, 'messages/owner_inbox'));
  const msgs = Object.entries(snap.val() || {}).map(([k, m]) =>
    `[${new Date(m.time).toLocaleString('ar-EG')}] من ${m.from}: ${m.text}`).join('\n\n');
  showModal('📩 صندوق الأونر', msgs || 'فاضي');
}, 'info');
F('messages', '📩 صندوق الأونر', '🗑️', 'مسح الصندوق', async () => {
  if (!await siteConfirm('مسح الكل؟')) return;
  await remove(ref(db, 'messages/owner_inbox')); toast('تم');
}, 'danger');
F('messages', '📩 صندوق الأونر', '📥', 'تصدير الصندوق', () => nodeExport('messages/owner_inbox'));
F('messages', '📩 صندوق الأونر', '✉️', 'رد على لاعب', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  const text = await sitePrompt('نص الرد:');
  if (!text) return;
  await push(ref(db, 'messages/' + user), { from: currentUser, text, time: Date.now() });
  toast('تم الرد');
});
F('messages', '📩 رسائل الشركاء', '👁️', 'عرض شات الشركاء', async () => {
  const snap = await get(ref(db, 'partners_chat'));
  const msgs = Object.values(snap.val() || {}).slice(-30).map(m => `[${m.sender}] ${m.text}`).join('\n');
  showModal('💬 شات الشركاء', msgs || 'فاضي');
}, 'info');
F('messages', '📩 رسائل الشركاء', '🗑️', 'مسح شات الشركاء', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'partners_chat')); toast('تم');
}, 'danger');
F('messages', '📩 رسائل الشركاء', '📥', 'تصدير شات الشركاء', () => nodeExport('partners_chat'));
F('messages', '📩 إجراءات سريعة', '📩', 'إرسال رسالة للكل', async () => {
  const text = await sitePrompt('نص الرسالة:');
  if (!text) return;
  const snap = await get(ref(db, 'usernames'));
  for (const u in (snap.val() || {})) await push(ref(db, 'messages/' + u), { from: currentUser, text, time: Date.now() });
  toast('تم');
});
F('messages', '📩 إجراءات سريعة', '📊', 'عدد الرسائل في النظام', async () => {
  const snap = await get(ref(db, 'messages'));
  const data = snap.val() || {};
  let total = 0;
  Object.values(data).forEach(u => total += countKeys(u));
  showModal('📩 إجمالي الرسائل', total);
}, 'info');

/* ==================== EVENTS ==================== */
F('events', '🎁 العروض', '➕', 'إضافة عرض', async () => {
  const text = await sitePrompt('نص العرض:');
  if (!text) return;
  await push(ref(db, 'site_events/active_offers'), { text, time: Date.now() });
  toast('تم');
}, 'success');
F('events', '🎁 العروض', '👁️', 'عرض العروض', async () => {
  const snap = await get(ref(db, 'site_events/active_offers'));
  showModal('🎁 العروض', Object.values(snap.val() || {}).map(o => o.text).join('\n') || 'لا يوجد');
}, 'info');
F('events', '🎁 العروض', '🗑️', 'مسح كل العروض', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'site_events/active_offers')); toast('تم');
}, 'danger');
F('events', '🎁 العروض', '📥', 'تصدير العروض', () => nodeExport('site_events/active_offers'));
F('events', '🎉 استفتاء', '➕', 'استفتاء جديد', async () => {
  const q = await sitePrompt('السؤال:');
  if (!q) return;
  const o1 = await sitePrompt('اختيار 1:');
  if (!o1) return;
  const o2 = await sitePrompt('اختيار 2:');
  if (!o2) return;
  await set(ref(db, 'site_events/active_poll'), { question: q, option1: o1, option2: o2, votes1: 0, votes2: 0, created: Date.now() });
  toast('تم');
}, 'success');
F('events', '🎉 استفتاء', '👁️', 'عرض الاستفتاء', async () => {
  const snap = await get(ref(db, 'site_events/active_poll'));
  showModal('🎉 الاستفتاء', snap.val() || 'لا يوجد');
}, 'info');
F('events', '🎉 استفتاء', '🗑️', 'مسح الاستفتاء', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'site_events/active_poll')); toast('تم');
}, 'danger');
F('events', '🎯 مسابقات', '➕', 'مسابقة جديدة', async () => {
  const name = await sitePrompt('اسم المسابقة:');
  if (!name) return;
  const prize = await sitePrompt('الجائزة:');
  await push(ref(db, 'site_events/contests'), { name, prize, time: Date.now() });
  toast('تم');
}, 'success');
F('events', '🎯 مسابقات', '👁️', 'عرض المسابقات', async () => {
  const snap = await get(ref(db, 'site_events/contests'));
  showModal('🎯 المسابقات', Object.values(snap.val() || {}).map(c => `${c.name} - ${c.prize}`).join('\n') || 'لا يوجد');
}, 'info');
F('events', '🎯 مسابقات', '🗑️', 'مسح المسابقات', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'site_events/contests')); toast('تم');
}, 'danger');
F('events', '🎁 جوائز', '🎁', 'اختيار فائز عشوائي', async () => {
  const snap = await get(ref(db, 'usernames'));
  const users = Object.keys(snap.val() || {});
  if (!users.length) return toast('لا يوجد', 'error');
  showModal('🎁 الفائز', users[Math.floor(Math.random() * users.length)]);
}, 'success');
F('events', '🎁 جوائز', '🎁', 'اختيار 3 فائزين', async () => {
  const snap = await get(ref(db, 'usernames'));
  const users = Object.keys(snap.val() || {}).sort(() => Math.random() - 0.5).slice(0, 3);
  showModal('🎁 الفائزين', users.join('\n'));
}, 'success');
F('events', '🎁 جوائز', '💰', 'توزيع كوينز على الكل', async () => {
  const amt = parseInt(await sitePrompt('عدد الكوينز:'));
  if (!amt) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) {
    const cur = (await get(ref(db, 'users_data/' + u + '/coins'))).val() || 0;
    await set(ref(db, 'users_data/' + u + '/coins'), cur + amt);
  }
  toast('تم التوزيع');
}, 'success');
F('events', '🎁 جوائز', '✨', 'توزيع XP على الكل', async () => {
  const amt = parseInt(await sitePrompt('عدد XP:'));
  if (!amt) return;
  const snap = await get(ref(db, 'users_data'));
  for (const u in (snap.val() || {})) {
    const cur = (await get(ref(db, 'users_data/' + u + '/xp'))).val() || 0;
    await set(ref(db, 'users_data/' + u + '/xp'), cur + amt);
  }
  toast('تم');
}, 'success');
F('events', '📢 إعلانات', '📢', 'إعلان في الشريط', async () => {
  const text = await sitePrompt('نص الإعلان:');
  if (!text) return;
  await set(ref(db, 'site_settings/announcement'), text); toast('تم');
}, 'success');
F('events', '📢 إعلانات', '🗑️', 'مسح الإعلان', async () => {
  await set(ref(db, 'site_settings/announcement'), ''); toast('تم');
}, 'danger');
F('events', '📢 إعلانات', '👁️', 'عرض الإعلان', async () => {
  const snap = await get(ref(db, 'site_settings/announcement'));
  showModal('📢 الإعلان الحالي', snap.val() || '(فارغ)');
}, 'info');
F('events', '🎊 مواسم', '➕', 'موسم جديد', async () => {
  const name = await sitePrompt('اسم الموسم:');
  if (!name) return;
  await push(ref(db, 'site_events/seasons'), { name, start: Date.now() });
  toast('تم');
}, 'success');
F('events', '🎊 مواسم', '👁️', 'عرض المواسم', async () => {
  const snap = await get(ref(db, 'site_events/seasons'));
  showModal('🎊 المواسم', Object.values(snap.val() || {}).map(s => s.name).join('\n') || 'لا يوجد');
}, 'info');
F('events', '🎊 مواسم', '🗑️', 'مسح المواسم', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'site_events/seasons')); toast('تم');
}, 'danger');

/* ==================== SECURITY ==================== */
F('security', '🚫 حظر', '🚫', 'حظر لاعب', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  const reason = await sitePrompt('السبب:', 'مخالفة القوانين');
  if (reason === null) return;
  await set(ref(db, 'banned_users/' + user), { reason, by: currentUser, time: Date.now() });
  toast('تم الحظر', 'success');
}, 'danger');
F('security', '🚫 حظر', '✅', 'رفع حظر', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  await remove(ref(db, 'banned_users/' + user));
  toast('تم الرفع', 'success');
}, 'success');
F('security', '🚫 حظر', '👁️', 'قائمة المحظورين', async () => {
  const snap = await get(ref(db, 'banned_users'));
  const lines = Object.entries(snap.val() || {}).map(([u, v]) => `${u}: ${v.reason || ''}`);
  showModal('🚫 المحظورين', lines.join('\n') || 'لا يوجد');
}, 'info');
F('security', '🚫 حظر', '🗑️', 'مسح كل المحظورين', async () => {
  if (!await siteConfirm('مسح كل المحظورين؟')) return;
  await remove(ref(db, 'banned_users')); toast('تم');
}, 'danger');
F('security', '🚫 حظر', '📥', 'تصدير المحظورين', () => nodeExport('banned_users'));
F('security', '⚠️ تحذيرات', '⚠️', 'إرسال تحذير', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  const reason = await sitePrompt('السبب:');
  if (!reason) return;
  await set(ref(db, 'warnings/' + user), { text: reason, time: Date.now() });
  toast('تم التحذير', 'success');
}, 'danger');
F('security', '⚠️ تحذيرات', '🗑️', 'مسح تحذير', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  await remove(ref(db, 'warnings/' + user));
  toast('تم المسح');
}, 'danger');
F('security', '⚠️ تحذيرات', '👁️', 'قائمة التحذيرات', async () => {
  const snap = await get(ref(db, 'warnings'));
  const lines = Object.entries(snap.val() || {}).map(([u, v]) => `${u}: ${v.text}`);
  showModal('⚠️ التحذيرات', lines.join('\n') || 'لا يوجد');
}, 'info');
F('security', '⚠️ تحذيرات', '🗑️', 'مسح كل التحذيرات', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'warnings')); toast('تم');
}, 'danger');
F('security', '⚠️ تحذيرات', '📥', 'تصدير التحذيرات', () => nodeExport('warnings'));
F('security', '👢 طرد', '👢', 'طرد لاعب', async () => {
  const user = await sitePrompt('اسم اللاعب:');
  if (!user) return;
  await set(ref(db, 'kick_signals/' + user), true);
  toast('تم الطرد');
}, 'danger');
F('security', '👢 طرد', '🗑️', 'مسح كل إشارات الطرد', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'kick_signals')); toast('تم');
}, 'danger');
F('security', '👢 طرد', '👁️', 'عرض إشارات الطرد', () => nodeStats('kick_signals'), 'info');
F('security', '🔒 أمان', '🔒', 'قفل التسجيل', async () => {
  await set(ref(db, 'site_settings/registrationOpen'), false);
  toast('تم قفل التسجيل');
}, 'danger');
F('security', '🔒 أمان', '🔓', 'فتح التسجيل', async () => {
  await set(ref(db, 'site_settings/registrationOpen'), true);
  toast('تم فتح التسجيل');
}, 'success');
F('security', '🔒 أمان', '🛑', 'وضع الصيانة', async () => {
  await set(ref(db, 'site_settings/maintenance'), true);
  toast('تم التفعيل');
}, 'danger');
F('security', '🔒 أمان', '✅', 'إيقاف الصيانة', async () => {
  await set(ref(db, 'site_settings/maintenance'), false);
  toast('تم الإيقاف');
}, 'success');
F('security', '🔒 أمان', '💬', 'إيقاف الشات', async () => {
  await set(ref(db, 'site_settings/chatOff'), true);
  toast('تم الإيقاف');
}, 'danger');
F('security', '🔒 أمان', '💬', 'تشغيل الشات', async () => {
  await set(ref(db, 'site_settings/chatOff'), false);
  toast('تم التشغيل');
}, 'success');
F('security', '🔒 أمان', '👥', 'قفل طلبات الصداقة', async () => {
  await set(ref(db, 'site_settings/friendRequestsOn'), false);
  toast('تم');
}, 'danger');
F('security', '🔒 أمان', '👥', 'فتح طلبات الصداقة', async () => {
  await set(ref(db, 'site_settings/friendRequestsOn'), true);
  toast('تم');
}, 'success');
F('security', '🔒 أمان', '📊', 'حالة الموقع', async () => {
  const snap = await get(ref(db, 'site_settings'));
  showModalHTML('📊 حالة الموقع', formatObject(snap.val()));
}, 'info');
F('security', '🧹 تنظيف', '🧹', 'مسح الغرف الفاضية', async () => {
  if (!await siteConfirm('مسح الغرف بدون لاعبين؟')) return;
  const snap = await get(ref(db, 'rooms'));
  const data = snap.val() || {};
  let count = 0;
  for (const code in data) {
    if (data[code].status === 'waiting' && !data[code].player2_score) {
      await remove(ref(db, 'rooms/' + code)); count++;
    }
  }
  toast('تم المسح: ' + count);
}, 'danger');
F('security', '🧹 تنظيف', '🧹', 'مسح كل presence', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'presence')); toast('تم');
}, 'danger');
F('security', '🧹 تنظيف', '🧹', 'مسح activity_feed', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'activity_feed')); toast('تم');
}, 'danger');
F('security', '🧹 تنظيف', '🧹', 'مسح global_chat', async () => {
  if (!await siteConfirm('مسح كل رسائل الشات العام؟')) return;
  await remove(ref(db, 'global_chat')); toast('تم');
}, 'danger');
F('security', '🧹 تنظيف', '🧹', 'مسح كل التحديات', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'challenges')); toast('تم');
}, 'danger');

/* ==================== REPORTS ==================== */
F('reports', '📊 تقارير', '📊', 'تقرير شامل', async () => {
  const nodes = ['usernames','users_data','scores','badges','banned_users','warnings','support_tickets','verified_users'];
  const report = {};
  for (const n of nodes) report[n] = countKeys((await get(ref(db, n))).val());
  showModalHTML('📊 تقرير شامل', formatObject(report));
}, 'info');
F('reports', '📊 تقارير', '📥', 'تحميل التقرير', async () => {
  const snap = await get(ref(db, '.'));
  download('full_report_' + Date.now() + '.json', JSON.stringify(snap.val(), null, 2));
  toast('تم');
});
F('reports', '📊 تقارير', '👥', 'تقرير اللاعبين', async () => {
  const snap = await get(ref(db, 'users_data'));
  const data = snap.val() || {};
  let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
  for (const [u, d] of Object.entries(data)) {
    html += `<div style="background:var(--bg-2); padding:10px; border-radius:8px; border:1px solid var(--border);">
      <b style="font-size:16px; color:var(--primary);">${esc(u)}</b><br>
      <span style="color:var(--text-2); font-size:13px;">XP: ${d.xp || 0} | Coins: ${d.coins || 0} | Team: ${esc(d.team || 'بدون تيم')}</span>
    </div>`;
  }
  html += '</div>';
  showModalHTML('👥 تقرير اللاعبين', html);
}, 'info');
F('reports', '📊 تقارير', '🏆', 'تقرير المتصدرين', () => nodeStats('leaderboard'), 'info');
F('reports', '📊 تقارير', '🎮', 'تقرير الكويزات', () => nodeStats('scores'), 'info');
F('reports', '📊 تقارير', '⚡', 'تقرير السرعة', () => nodeStats('speedrun_scores'), 'info');
F('reports', '📊 تقارير', '🚫', 'تقرير الحظر', () => nodeStats('banned_users'), 'info');
F('reports', '📊 تقارير', '⚠️', 'تقرير التحذيرات', () => nodeStats('warnings'), 'info');
F('reports', '📊 تقارير', '📩', 'تقرير الرسائل', () => nodeStats('messages'), 'info');
F('reports', '📊 تقارير', '💬', 'تقرير الشات', () => nodeStats('global_chat'), 'info');
F('reports', '📊 تقارير', '👥', 'تقرير الأصدقاء', () => nodeStats('friends'), 'info');
F('reports', '📊 تقارير', '🎖️', 'تقرير الرتب', () => nodeStats('roles'), 'info');
F('reports', '📊 تقارير', '🏅', 'تقرير البادجات', () => nodeStats('badges'), 'info');
F('reports', '📊 تقارير', '⚔️', 'تقرير التيمات', () => nodeStats('teams'), 'info');
F('reports', '📊 تقارير', '🚪', 'تقرير الغرف', () => nodeStats('rooms'), 'info');
F('reports', '📊 تقارير', '🎉', 'تقرير الفعاليات', () => nodeStats('site_events'), 'info');
F('reports', '📊 تقارير', '💡', 'تقرير الاقتراحات', () => nodeStats('suggestions'), 'info');
F('reports', '📊 تقارير', '💬', 'تقرير التعليقات', () => nodeStats('comments'), 'info');
F('reports', '📊 تقارير', '🎫', 'تقرير التذاكر', () => nodeStats('support_tickets'), 'info');
F('reports', '📊 تقارير', '📊', 'مقارنة أسبوعية', async () => {
  const snap = await get(ref(db, 'scores'));
  const data = snap.val() || {};
  const weekAgo = Date.now() - 7 * 86400000;
  let attempts = 0, players = new Set();
  Object.entries(data).forEach(([u, quizzes]) => Object.values(quizzes).forEach(q =>
    Object.values(q).forEach(a => {
      if (new Date(a.time).getTime() > weekAgo) { attempts++; players.add(u); }
    })
  ));
  showModal('📊 هذا الأسبوع', `محاولات: ${attempts}\nلاعبين نشطين: ${players.size}`);
}, 'info');
F('reports', '📊 تقارير', '✓', 'تقرير الموثقين', () => nodeStats('verified_users'), 'info');

/* ==================== CHAT ==================== */
F('chat', '💬 الشات العام', '👁️', 'عرض الرسائل', async () => {
  const snap = await get(ref(db, 'global_chat'));
  const msgs = Object.values(snap.val() || {}).slice(-50).map(m => `[${m.sender}] ${m.text}`).join('\n');
  showModal('💬 الشات العام', msgs || 'فاضي');
}, 'info');
F('chat', '💬 الشات العام', '🗑️', 'مسح كل الرسائل', async () => {
  if (!await siteConfirm('مسح الكل؟')) return;
  await remove(ref(db, 'global_chat')); toast('تم');
}, 'danger');
F('chat', '💬 الشات العام', '📥', 'تصدير الرسائل', () => nodeExport('global_chat'));
F('chat', '💬 الشات العام', '📊', 'عدد الرسائل', () => nodeStats('global_chat'), 'info');
F('chat', '💬 الشات العام', '📢', 'إرسال رسالة رسمية', async () => {
  const text = await sitePrompt('نص الرسالة:');
  if (!text) return;
  await push(ref(db, 'global_chat'), { sender: '👑 ' + currentUser, text, time: Date.now() });
  toast('تم');
}, 'success');
F('chat', '💬 الشات العام', '📤', 'إرسال تنبيه', async () => {
  const text = await sitePrompt('نص التنبيه:');
  if (!text) return;
  await push(ref(db, 'global_chat'), { sender: '⚠️ إدارة', text: '⚠️ ' + text, time: Date.now() });
  toast('تم');
}, 'warn');
F('chat', '💬 شات الشركاء', '👁️', 'عرض رسائل الشركاء', async () => {
  const snap = await get(ref(db, 'partners_chat'));
  const msgs = Object.values(snap.val() || {}).slice(-50).map(m => `[${m.sender}] ${m.text}`).join('\n');
  showModal('💬 شات الشركاء', msgs || 'فاضي');
}, 'info');
F('chat', '💬 شات الشركاء', '🗑️', 'مسح شات الشركاء', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'partners_chat')); toast('تم');
}, 'danger');
F('chat', '💬 شات الشركاء', '📥', 'تصدير', () => nodeExport('partners_chat'));
F('chat', '💬 الشات', '💬', 'إرسال في شات الشركاء', async () => {
  const text = await sitePrompt('الرسالة:');
  if (!text) return;
  await push(ref(db, 'partners_chat'), { sender: currentUser, text, time: Date.now() });
  toast('تم');
}, 'success');
F('chat', '💬 الشات', '🔒', 'إيقاف الشات العام', async () => {
  await set(ref(db, 'site_settings/chatOff'), true); toast('تم');
}, 'danger');
F('chat', '💬 الشات', '🔓', 'تشغيل الشات العام', async () => {
  await set(ref(db, 'site_settings/chatOff'), false); toast('تم');
}, 'success');
F('chat', '💬 الشات', '👁️', 'عرض رسائل النظام', async () => {
  const v = (await get(ref(db, 'activity_feed'))).val();
  showModalHTML('رسائل النظام', v ? formatObject(v) : 'لا شيء');
}, 'info');
F('chat', '💬 الشات', '📊', 'إحصائيات', () => nodeStats('activity_feed'), 'info');
F('chat', '💬 الشات', '🧹', 'مسح activity_feed', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'activity_feed')); toast('تم');
}, 'danger');
F('chat', '💬 الشات', '🧹', 'مسح كل الشاتات', async () => {
  if (!await siteConfirm('مسح كل الشاتات؟')) return;
  await remove(ref(db, 'global_chat'));
  await remove(ref(db, 'partners_chat'));
  toast('تم المسح الكامل');
}, 'danger');
F('chat', '💬 الشات', '💬', 'عدد الرسائل اليوم', async () => {
  const snap = await get(ref(db, 'global_chat'));
  const dayAgo = Date.now() - 86400000;
  const count = Object.values(snap.val() || {}).filter(m => m.time > dayAgo).length;
  showModal('عدد رسائل اليوم', count);
}, 'info');
F('chat', '💬 الشات', '📥', 'تصدير كل الشاتات', () => {
  nodeExport('global_chat'); nodeExport('partners_chat');
});
F('chat', '💬 الشات', '📊', 'عدد الرسائل الكلي', async () => {
  const g = await get(ref(db, 'global_chat'));
  const p = await get(ref(db, 'partners_chat'));
  showModal('إجمالي', countKeys(g.val()) + countKeys(p.val()));
}, 'info');
F('chat', '💬 الشات', '🧹', 'مسح رسائل لاعب', async () => {
  const u = await sitePrompt('اسم اللاعب:');
  if (!u) return;
  const snap = await get(ref(db, 'global_chat'));
  const data = snap.val() || {};
  let count = 0;
  for (const k in data) if (data[k].sender === u) { await remove(ref(db, 'global_chat/' + k)); count++; }
  toast('تم المسح: ' + count);
}, 'danger');

/* ==================== BROADCAST ==================== */
F('broadcast', '📢 بث', '📢', 'بث رسالة للكل', async () => {
  const text = await sitePrompt('نص البث:');
  if (!text) return;
  await push(ref(db, 'broadcast_messages'), { text, from: currentUser, time: Date.now() });
  toast('تم البث بنجاح (لن يؤثر على الشريط الأحمر)');
}, 'success');
F('broadcast', '📢 بث', '👁️', 'عرض البث', async () => {
  const snap = await get(ref(db, 'broadcast_messages'));
  const lines = Object.values(snap.val() || {}).map(m => `[${m.from}] ${m.text}`);
  showModal('📢 البث', lines.join('\n') || 'فاضي');
}, 'info');
F('broadcast', '📢 بث', '🗑️', 'مسح البث', async () => {
  if (!await siteConfirm('مسح؟')) return;
  await remove(ref(db, 'broadcast_messages')); toast('تم');
}, 'danger');
F('broadcast', '📢 بث', '📥', 'تصدير البث', () => nodeExport('broadcast_messages'));
F('broadcast', '📢 إشعارات', '🔔', 'إشعار للكل', async () => {
  const text = await sitePrompt('نص الإشعار:');
  if (!text) return;
  const snap = await get(ref(db, 'usernames'));
  for (const u in (snap.val() || {})) {
    await push(ref(db, 'messages/' + u), { from: '📢 إدارة', text, time: Date.now() });
  }
  toast('تم');
}, 'success');
F('broadcast', '📢 إشعارات', '🔔', 'إشعار لرتبة', async () => {
  const rank = await sitePrompt('الرتبة:');
  if (!rank) return;
  const text = await sitePrompt('النص:');
  if (!text) return;
  const snap = await get(ref(db, 'roles/users'));
  const data = snap.val() || {};
  let count = 0;
  for (const u in data) if (data[u] === rank) { await push(ref(db, 'messages/' + u), { from: '📢 إدارة', text, time: Date.now() }); count++; }
  toast('تم لـ ' + count);
}, 'success');
F('broadcast', '📢 إشعارات', '🔔', 'إشعار للأونر', async () => {
  const text = await sitePrompt('النص:');
  if (!text) return;
  await push(ref(db, 'messages/owner_inbox'), { from: currentUser, text, time: Date.now() });
  toast('تم');
});

/* ==================== REQUESTS ==================== */
F('requests', '📩 صندوق الأونر', '👁️', 'عرض صندوق الأونر', async () => {
  const snap = await get(ref(db, 'messages/owner_inbox'));
  const data = snap.val() || {};
  if (!Object.keys(data).length) return showModal('📩 صندوق الأونر', 'فاضي');
  const msgs = Object.entries(data).map(([k, m]) =>
    `━━━━━━━━━━━━\nمن: ${m.from}\nالوقت: ${new Date(m.time).toLocaleString('ar-EG')}\nالرسالة: ${m.text}`).join('\n');
  showModal('📩 صندوق الأونر', msgs);
}, 'info');
F('requests', '📩 صندوق الأونر', '🗑️', 'مسح الصندوق', async () => {
  if (!await siteConfirm('مسح كل صندوق الأونر؟')) return;
  await remove(ref(db, 'messages/owner_inbox')); toast('تم');
}, 'danger');
F('requests', '📩 صندوق الأونر', '📥', 'تصدير', () => nodeExport('messages/owner_inbox'));

F('requests', '📩 كل الرسايل', '👁️', 'عرض كل رسايل اللاعبين', async () => {
  const snap = await get(ref(db, 'messages'));
  const data = snap.val() || {};
  const lines = [];
  for (const [u, msgs] of Object.entries(data)) {
    if (u === 'owner_inbox') continue;
    for (const [, m] of Object.entries(msgs || {})) {
      lines.push(`[${m.from || '?'} → ${u}] ${m.text}`);
    }
  }
  showModal('📩 كل الرسايل', lines.slice(-60).join('\n') || 'لا يوجد');
}, 'info');
F('requests', '📩 كل الرسايل', '📊', 'عدد الرسايل الكلي', async () => {
  const snap = await get(ref(db, 'messages'));
  const data = snap.val() || {};
  let total = 0;
  Object.values(data).forEach(u => total += countKeys(u));
  showModal('📊 عدد الرسايل', total);
}, 'info');
F('requests', '📩 كل الرسايل', '🗑️', 'مسح رسايل لاعب', async () => {
  const u = await sitePrompt('اسم اللاعب:');
  if (!u) return;
  if (!await siteConfirm(`مسح كل رسايل ${u}؟`)) return;
  await remove(ref(db, 'messages/' + u)); toast('تم');
}, 'danger');

F('requests', '📩 طلبات الأدمن', '👁️', 'عرض طلبات الأدمن', async () => {
  const snap = await get(ref(db, 'admin_requests'));
  const data = snap.val() || {};
  const lines = Object.entries(data).map(([id, r]) =>
    `ID: ${id}\nمن: ${r.user}\nالرسالة: ${r.text}\nالحالة: ${r.status || 'pending'}\n`);
  showModal('📩 طلبات الأدمن', lines.join('\n') || 'لا يوجد');
}, 'info');
F('requests', '📩 طلبات الأدمن', '✅', 'قبول طلب', async () => {
  const id = await sitePrompt('ID الطلب:');
  if (!id) return;
  await update(ref(db, 'admin_requests/' + id), { status: 'approved' });
  toast('تم القبول');
}, 'success');
F('requests', '📩 طلبات الأدمن', '❌', 'رفض طلب', async () => {
  const id = await sitePrompt('ID الطلب:');
  if (!id) return;
  await update(ref(db, 'admin_requests/' + id), { status: 'rejected' });
  toast('تم الرفض');
}, 'danger');
F('requests', '📩 طلبات الأدمن', '🗑️', 'مسح كل الطلبات', async () => {
  if (!await siteConfirm('مسح كل طلبات الأدمن؟')) return;
  await remove(ref(db, 'admin_requests')); toast('تم');
}, 'danger');

F('requests', '📩 طلبات المديرين', '👁️', 'عرض طلبات المديرين', async () => {
  const snap = await get(ref(db, 'manager_requests'));
  showModalHTML('📩 طلبات المديرين', formatObject(snap.val() || {}));
}, 'info');
F('requests', '📩 طلبات المديرين', '🗑️', 'مسح كل الطلبات', async () => {
  if (!await siteConfirm('مسح كل طلبات المديرين؟')) return;
  await remove(ref(db, 'manager_requests')); toast('تم');
}, 'danger');
F('requests', '📩 طلبات المديرين', '📥', 'تصدير', () => nodeExport('manager_requests'));

F('requests', '📩 طلبات الكويزات', '👁️', 'عرض طلبات الكويزات', async () => {
  const snap = await get(ref(db, 'quiz_requests'));
  showModalHTML('📩 طلبات الكويزات', formatObject(snap.val() || {}));
}, 'info');
F('requests', '📩 طلبات الكويزات', '🗑️', 'مسح الطلبات', async () => {
  if (!await siteConfirm('مسح كل طلبات الكويزات؟')) return;
  await remove(ref(db, 'quiz_requests')); toast('تم');
}, 'danger');

F('requests', '📩 طلبات الصداقة', '👁️', 'عرض طلبات الصداقة', async () => {
  const snap = await get(ref(db, 'friend_requests'));
  showModalHTML('📩 طلبات الصداقة', formatObject(snap.val() || {}));
}, 'info');
F('requests', '📩 طلبات الصداقة', '🗑️', 'مسح الطلبات', async () => {
  if (!await siteConfirm('مسح كل طلبات الصداقة؟')) return;
  await remove(ref(db, 'friend_requests')); toast('تم');
}, 'danger');

F('requests', '🎫 تذاكر الدعم', '👁️', 'عرض التذاكر', async () => {
  const snap = await get(ref(db, 'support_tickets'));
  const lines = Object.values(snap.val() || {}).map(t =>
    `[${new Date(t.time).toLocaleString('ar-EG')}] ${t.text}`).join('\n\n');
  showModal('🎫 التذاكر', lines || 'لا يوجد');
}, 'info');
F('requests', '🎫 تذاكر الدعم', '🗑️', 'مسح كل التذاكر', async () => {
  if (!await siteConfirm('مسح كل التذاكر؟')) return;
  await remove(ref(db, 'support_tickets')); toast('تم');
}, 'danger');

/* ==================== CUSTOM RANK / BADGE ==================== */
async function getCustomBadges() {
  const snap = await get(ref(db, 'custom_badges'));
  return Object.keys(snap.val() || {});
}
async function getCustomRanks() {
  const snap = await get(ref(db, 'custom_ranks'));
  return Object.keys(snap.val() || {});
}

function sanitizeName(s) {
  return String(s || '').replace(/[<>"'&]/g, '').trim().slice(0, 30);
}

window.createNewBadge = async () => {
  const name = sanitizeName(await sitePrompt('اسم البادج الجديد:'));
  if (!name) return;
  await set(ref(db, 'custom_badges/' + name), true);
  toast('تم إنشاء البادج: ' + name);
  renderBadgesTab();
};

window.createNewRank = async () => {
  const name = sanitizeName(await sitePrompt('اسم الرتبة الجديدة:'));
  if (!name) return;
  await set(ref(db, 'custom_ranks/' + name), true);
  toast('تم إنشاء الرتبة: ' + name);
  renderRolesTab();
};

/* ==================== VERIFIED USERS (التوثيق) ==================== */
async function viewVerifiedUsers() {
  try {
    const snap = await get(ref(db, 'verified_users'));
    const data = snap.val() || {};
    const users = Object.keys(data);
    const lines = users.map(u =>
      `✓ ${u} — بواسطة ${data[u].by || '?'} في ${data[u].time ? new Date(data[u].time).toLocaleString('ar-EG') : '?'}`
    );
    showModal('✓ الموثقين (' + users.length + ')', lines.join('\n') || 'لا يوجد موثقين');
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function verifyUser(u) {
  try {
    await set(ref(db, 'verified_users/' + u), { by: currentUser, time: Date.now() });
    await set(ref(db, 'users_data/' + u + '/verified'), 1);
    toast('تم توثيق ' + u + ' ✓', 'success');
    renderUsersTab();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

async function removeVerifyUser(u) {
  try {
    if (!await siteConfirm(`إلغاء توثيق ${u}؟`)) return;
    await remove(ref(db, 'verified_users/' + u));
    await remove(ref(db, 'users_data/' + u + '/verified'));
    toast('تم إلغاء توثيق ' + u, 'success');
    renderUsersTab();
  } catch (e) { toast('خطأ: ' + e.message, 'error'); }
}

/* ==================== TAB CONFIG ==================== */
const TAB_CONFIG = [
  { key: 'dashboard', icon: '📊', label: 'الرئيسية' },
  { key: 'users', icon: '👥', label: 'اللاعبين' },
  { key: 'content', icon: '📝', label: 'المحتوى' },
  { key: 'roles', icon: '🎖️', label: 'الرتب' },
  { key: 'badges', icon: '🏅', label: 'البادجات' },
  { key: 'settings', icon: '⚙️', label: 'الإعدادات' },
  { key: 'messages', icon: '📩', label: 'الرسائل' },
  { key: 'events', icon: '🎉', label: 'الفعاليات' },
  { key: 'security', icon: '🚫', label: 'الأمان' },
  { key: 'reports', icon: '📈', label: 'التقارير' },
  { key: 'db', icon: '💾', label: 'قاعدة البيانات' },
  { key: 'chat', icon: '💬', label: 'الشات' },
  { key: 'broadcast', icon: '📢', label: 'البث' },
  { key: 'admin_messages', icon: '💬', label: 'رسايل الإدارة' },
  { key: 'requests', icon: '📥', label: 'طلبات' }
];

let activeTab = 'dashboard';

window.switchTab = function (key, btn) {
  activeTab = key;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn?.classList.add('active');
  document.getElementById('tab-' + key)?.classList.add('active');
  if (key === 'users') renderUsersTab();
};

async function renderTabs() {
  const bar = document.getElementById('tabsBar');
  bar.innerHTML = TAB_CONFIG.map((t, i) =>
    `<button class="tab-btn${i === 0 ? ' active' : ''}" onclick="switchTab('${t.key}', this)">${t.icon} ${t.label}</button>`
  ).join('');

  const container = document.getElementById('tabsContainer');
  container.innerHTML = TAB_CONFIG.map(t =>
    `<div id="tab-${t.key}" class="tab-content${t.key === 'dashboard' ? ' active' : ''}"></div>`
  ).join('');

  for (const t of TAB_CONFIG) {
    const el = document.getElementById('tab-' + t.key);
    if (t.key === 'users') continue;
    if (t.key === 'content') continue;
    if (t.key === 'roles') continue;
    if (t.key === 'badges') continue;
    if (t.key === 'admin_messages') continue;
    renderFeatures(t.key, el);
  }

  await renderContentTab();
  await renderRolesTab();
  await renderBadgesTab();
  await renderAdminMessagesTab();
  await renderUsersTab();
}

/* ==================== CONTENT TAB ==================== */
async function renderContentTab() {
  const container = document.getElementById('tab-content');
  if (!container) return;

  let html = `
    <div class="section">
      <div class="section-title">🎮 إدارة الكويزات (${QUIZZES.length}) — اضغط على الكويز لعرض الخيارات</div>
      <div class="grid-features">
        ${QUIZZES.map(q => `
          <button class="feature-btn" onclick="openQuizMenu('${esc(q)}')">
            <span class="icon">🎮</span> ${esc(q)}
          </button>
        `).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-title">📝 أنواع المحتوى الأخرى — اضغط لعرض الخيارات</div>
      <div class="grid-features">
        ${CONTENT_TYPES.map(n => `
          <button class="feature-btn info" onclick="openContentMenu('${esc(n)}')">
            <span class="icon">📝</span> ${esc(n)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

window.openQuizMenu = function (q) {
  showModalHTML(`🎮 ${q}`, `
    <p style="margin-bottom:12px; color:var(--text-2);">اختر العملية:</p>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <button class="feature-btn info" onclick="closeModal(); quizStats('${q}')">📊 إحصائيات</button>
      <button class="feature-btn" onclick="closeModal(); quizExport('${q}')">📥 تصدير</button>
      <button class="feature-btn danger" onclick="closeModal(); quizReset('${q}')">♻️ تصفير</button>
      <button class="feature-btn danger" onclick="closeModal(); quizClear('${q}')">🗑️ حذف</button>
    </div>
  `);
};

window.openContentMenu = function (n) {
  showModalHTML(`📝 ${n}`, `
    <p style="margin-bottom:12px; color:var(--text-2);">اختر العملية:</p>
    <div style="display:grid; grid-template-columns:1fr; gap:10px;">
      <button class="feature-btn info" onclick="closeModal(); nodeStats('${n}')">👁️ عرض</button>
      <button class="feature-btn" onclick="closeModal(); nodeExport('${n}')">📥 تصدير</button>
      <button class="feature-btn danger" onclick="closeModal(); nodeClear('${n}')">🗑️ مسح</button>
    </div>
  `);
};

/* ==================== ROLES TAB ==================== */
async function renderRolesTab() {
  const container = document.getElementById('tab-roles');
  if (!container) return;
  const custom = await getCustomRanks();
  const all = [...RANKS, ...custom.filter(r => !RANKS.includes(r))];

  let html = `
    <div class="section">
      <div class="section-title">🎖️ الرتب (${all.length})</div>
      <button class="feature-btn good" onclick="createNewRank()" style="margin-bottom:16px; width:auto; padding:10px 20px;">➕ إنشاء رتبة جديدة</button>
      <div class="grid-features">
        ${all.map(r => `
          <button class="feature-btn" onclick="openRankMenu('${esc(r)}')">
            <span class="icon">🛡️</span> ${esc(r)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

window.openRankMenu = function (r) {
  showModalHTML(`🛡️ ${esc(r)}`, `
    <p style="margin-bottom:12px; color:var(--text-2);">اختر العملية:</p>
    <div style="display:grid; grid-template-columns:1fr; gap:10px;">
      <button class="feature-btn info" onclick="closeModal(); rankMembers('${esc(r)}')">👥 أعضاء الرتبة</button>
      <button class="feature-btn good" onclick="closeModal(); rankAssignPrompt('${esc(r)}')">✏️ تعيين لمستخدم</button>
      <button class="feature-btn danger" onclick="closeModal(); rankClear('${esc(r)}')">🗑️ مسح من الكل</button>
      <button class="feature-btn danger" onclick="closeModal(); deleteCustomRank('${esc(r)}')">❌ حذف الرتبة نهائياً</button>
    </div>
  `);
};

/* ==================== BADGES TAB ==================== */
async function renderBadgesTab() {
  const container = document.getElementById('tab-badges');
  if (!container) return;
  const custom = await getCustomBadges();
  const all = [...BADGES, ...custom.filter(b => !BADGES.includes(b))];

  let html = `
    <div class="section">
      <div class="section-title">🏅 البادجات (${all.length})</div>
      <button class="feature-btn good" onclick="createNewBadge()" style="margin-bottom:16px; width:auto; padding:10px 20px;">➕ إنشاء بادج جديد</button>
      <div class="grid-features">
        ${all.map(b => `
          <button class="feature-btn" onclick="openBadgeMenu('${esc(b)}')">
            <span class="icon">🏅</span> ${esc(b)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

window.openBadgeMenu = function (b) {
  showModalHTML(`🏅 ${esc(b)}`, `
    <p style="margin-bottom:12px; color:var(--text-2);">اختر العملية:</p>
    <div style="display:grid; grid-template-columns:1fr; gap:10px;">
      <button class="feature-btn info" onclick="closeModal(); badgeMembers('${esc(b)}')">👥 حاملي البادج</button>
      <button class="feature-btn good" onclick="closeModal(); badgeAssignPrompt('${esc(b)}')">✏️ إعطاء لمستخدم</button>
      <button class="feature-btn danger" onclick="closeModal(); badgeClear('${esc(b)}')">🗑️ مسح من الكل</button>
      <button class="feature-btn danger" onclick="closeModal(); deleteCustomBadge('${esc(b)}')">❌ حذف البادج نهائياً</button>
    </div>
  `);
};

/* ==================== ADMIN MESSAGES TAB ==================== */
async function renderAdminMessagesTab() {
  const container = document.getElementById('tab-admin_messages');
  if (!container) return;

  let html = `
    <div class="section">
      <div class="section-title">💬 رسايل الإدارة (${ADMIN_ROLES.length}) — اضغط على رتبة لعرض الشات</div>
      <div class="grid-features">
        ${ADMIN_ROLES.map(t => `
          <button class="feature-btn" onclick="openAdminChat('${t.key}', '${esc(t.name)}', '${t.emoji}')">
            <span class="icon">${t.emoji}</span> شات ${esc(t.name)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

window.openAdminChat = async function (key, name, emoji) {
  const snap = await get(ref(db, `admin_chat/${key}`));
  const data = snap.val() || {};
  const msgs = Object.values(data)
    .sort((a, b) => (a.time || 0) - (b.time || 0))
    .map(m => `<div style="padding:8px; border-bottom:1px solid var(--border);">
        <b style="color:var(--primary);">${esc(m.sender)}:</b>
        <span>${esc(m.text)}</span>
        <div style="font-size:11px; color:var(--text-2);">${m.time ? new Date(m.time).toLocaleString('ar-EG') : ''}</div>
      </div>`).join('');

  showModalHTML(`${emoji} شات ${esc(name)}`, `
    <div style="max-height:400px; overflow-y:auto; margin-bottom:12px; padding:8px; background:var(--bg-2); border-radius:8px;">
      ${msgs || '<div style="text-align:center; color:var(--text-2); padding:20px;">لا يوجد رسائل</div>'}
    </div>
    <div style="display:flex; gap:8px;">
      <input type="text" id="adminChatInput" placeholder="اكتب رسالة..." style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border); background:var(--bg-2); color:var(--text); box-sizing:border-box;">
      <button class="feature-btn good" onclick="sendAdminMessage('${key}')">إرسال</button>
      <button class="feature-btn danger" onclick="clearAdminChat('${key}')">🗑️</button>
    </div>
  `);
  setTimeout(() => document.getElementById('adminChatInput')?.focus(), 100);
};

window.sendAdminMessage = async function (key) {
  const input = document.getElementById('adminChatInput');
  if (!input || !input.value.trim()) return;
  await push(ref(db, `admin_chat/${key}`), {
    sender: currentUser, text: input.value.trim(), time: Date.now()
  });
  toast('تم الإرسال');
  const role = ADMIN_ROLES.find(t => t.key === key);
  openAdminChat(key, role.name, role.emoji);
};

window.clearAdminChat = async function (key) {
  if (!await siteConfirm('مسح كل رسايل الشات؟')) return;
  await remove(ref(db, `admin_chat/${key}`));
  toast('تم المسح');
  const role = ADMIN_ROLES.find(t => t.key === key);
  openAdminChat(key, role.name, role.emoji);
};

/* ==================== GENERIC FEATURE RENDERER ==================== */
function renderFeatures(sectionKey, container) {
  const cats = CATEGORIES[sectionKey] || {};
  const totalFeatures = Object.values(cats).reduce((s, a) => s + a.length, 0);
  let html = `<div class="section"><div class="section-title">📦 إجمالي الخصائص في هذا القسم: ${totalFeatures}</div></div>`;

  Object.entries(cats).forEach(([catName, features]) => {
    html += `<div class="section">
      <div class="section-title">${catName} <span style="margin-right:auto; color:var(--text-2); font-size:12px;">(${features.length})</span></div>
      <div class="grid-features" data-cat="${catName}">
        ${features.map((f, i) =>
          `<button class="feature-btn ${f.cls}" data-section="${sectionKey}" data-cat="${catName}" data-index="${i}">
            <span class="icon">${f.icon}</span> ${f.label}
          </button>`
        ).join('')}
      </div>
    </div>`;
  });

  container.innerHTML = html;

  container.querySelectorAll('.feature-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.section;
      const c = btn.dataset.cat;
      const i = parseInt(btn.dataset.index);
      const fn = CATEGORIES[s][c][i].fn;
      try { fn(); } catch (e) { toast('خطأ: ' + e.message, 'error'); }
    });
  });
}

/* ==================== USERS TAB ==================== */
let cachedUsers = {};

async function renderUsersTab() {
  const container = document.getElementById('tab-users');
  if (!container) return;

  if (!container.dataset.initialized) {
    container.innerHTML = `
      <div class="section">
        <div class="section-title" id="usersCount">👥 إدارة اللاعبين</div>
        <input type="text" class="search-input" id="searchUser" placeholder="🔍 ابحث عن لاعب...">
        <div id="usersListBody"></div>
      </div>`;
    container.dataset.initialized = '1';
    document.getElementById('searchUser').addEventListener('input', () => renderUsersList());
  }

  await renderUsersList();
}

async function renderUsersList() {
  const body = document.getElementById('usersListBody');
  const countEl = document.getElementById('usersCount');
  if (!body) return;

  const filter = (document.getElementById('searchUser')?.value || '').toLowerCase();

  const [dataSnap, rankSnap, presenceSnap, verifiedSnap] = await Promise.all([
    get(ref(db, 'users_data')),
    get(ref(db, 'roles/users')),
    get(ref(db, 'presence')),
    get(ref(db, 'verified_users'))
  ]);

  const data = dataSnap.val() || {};
  const ranks = rankSnap.val() || {};
  const presence = presenceSnap.val() || {};
  const verified = verifiedSnap.val() || {};
  cachedUsers = data;

  const userList = Object.keys(data)
    .filter(u => u.toLowerCase().includes(filter))
    .sort();

  const perUserActions = [
    { icon: '👁️', label: 'عرض', fn: (u) => showUserDetails(u) },
    { icon: '📊', label: 'نتائج', fn: (u) => showUserScores(u), cls: 'info' },
    { icon: '🎖️', label: 'رتبة', fn: (u) => assignUserRank(u) },
    { icon: '❌', label: 'إلغاء رتبة', fn: (u) => removeUserRank(u), cls: 'bad' },
    { icon: '🏅', label: 'بادج', fn: (u) => assignUserBadge(u) },
    { icon: '❌', label: 'إلغاء بادج', fn: (u) => removeUserBadge(u), cls: 'bad' },
    { icon: '✓', label: 'توثيق', fn: (u) => verifyUser(u), cls: 'good' },
    { icon: '❌', label: 'إلغاء توثيق', fn: (u) => removeVerifyUser(u), cls: 'bad' },
    { icon: '📩', label: 'رسالة', fn: (u) => sendUserMessage(u), cls: 'info' },
    { icon: '⚠️', label: 'تحذير', fn: (u) => warnUser(u), cls: 'bad' },
    { icon: '❌', label: 'إلغاء تحذير', fn: (u) => removeUserWarning(u), cls: 'bad' },
    { icon: '🚫', label: 'حظر', fn: (u) => banUser(u), cls: 'bad' },
    { icon: '✅', label: 'رفع حظر', fn: (u) => unbanUser(u), cls: 'good' },
    { icon: '👢', label: 'طرد', fn: (u) => kickUser(u), cls: 'bad' },
    { icon: '♻️', label: 'تصفير XP', fn: (u) => resetUserXP(u), cls: 'bad' },
    { icon: '➕', label: 'XP+', fn: (u) => addUserXP(u), cls: 'good' },
    { icon: '➖', label: 'XP-', fn: (u) => removeUserXP(u), cls: 'bad' },
    { icon: '💰', label: 'كوينز+', fn: (u) => addUserCoins(u), cls: 'good' },
    { icon: '🖼️', label: 'صور', fn: (u) => viewUserAvatar(u) },
    { icon: '👥', label: 'أصدقاء', fn: (u) => viewUserFriends(u), cls: 'info' },
    { icon: '📥', label: 'تصدير', fn: (u) => exportUserData(u) },
    { icon: '🗑️', label: 'حذف', fn: (u) => deleteUser(u), cls: 'bad' },
    { icon: '🔥', label: 'ستريك', fn: (u) => viewUserStreak(u), cls: 'info' },
    { icon: '⚔️', label: 'تيم', fn: (u) => changeUserTeam(u), cls: 'info' },
    { icon: '❌', label: 'إلغاء تيم', fn: (u) => removeUserTeam(u), cls: 'bad' },
    { icon: '👑', label: 'أدمن', fn: (u) => promoteAdmin(u), cls: 'good' },
    { icon: '❌', label: 'إلغاء أدمن', fn: (u) => removeUserAdmin(u), cls: 'bad' }
  ];

  let html = '';
  userList.forEach(u => {
    const ud = data[u] || {};
    const rank = ranks[u] || 'Player';
    const pic = ud.profilePic;
    const isOnline = presence[u] && presence[u].status === 'online';
    const isVerified = !!verified[u] || ud.verified === 1;
    const avatar = pic ? `<img src="${esc(pic)}" alt="">` : esc(u.charAt(0).toUpperCase());

    html += `<div class="user-row" style="display:flex; flex-direction:column; gap:10px; padding:15px; border-bottom:1px solid var(--border);">
      <div class="user-info" style="display:flex; align-items:center; gap:12px;">
        <div class="user-avatar">${avatar}</div>
        <div>
          <div class="user-name">
            ${isOnline ? '🟢' : '⚫'} ${esc(u)}
            ${isVerified ? ' <span title="موثق ✓" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#1DA1F2;color:#fff;border-radius:50%;font-size:10px;font-weight:bold;vertical-align:middle;margin-right:4px;">✓</span>' : ''}
          </div>
          <span class="user-rank">${esc(rank)}</span>
          <span class="user-rank" style="background:rgba(0,255,136,0.1); color:var(--success);">${ud.xp || 0} XP</span>
          <span class="user-rank" style="background:rgba(255,215,0,0.1);">${ud.coins || 0} 🪙</span>
        </div>
      </div>
      <div class="user-actions" data-user="${esc(u)}" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(115px, 1fr)); gap:6px; width:100%;">
        ${perUserActions.map((a, i) =>
          `<button class="mini-btn ${a.cls || ''}" data-action="${i}" data-user="${esc(u)}" style="font-size:11px; padding:6px 4px; text-align:center; display:flex; align-items:center; justify-content:center; gap:4px;">
             ${a.icon} ${a.label}
           </button>`
        ).join('')}
      </div>
    </div>`;
  });

  if (!userList.length) {
    html = `<div style="text-align:center; padding:40px; color:var(--text-2);">لا يوجد لاعبين مطابقين</div>`;
  }

  countEl.textContent = `👥 إدارة اللاعبين (${userList.length} لاعب)`;
  body.innerHTML = html;

  body.querySelectorAll('.mini-btn').forEach(btn => {
    btn.onclick = async () => {
      const u = btn.dataset.user;
      const a = parseInt(btn.dataset.action);
      try { await perUserActions[a].fn(u); }
      catch (e) { toast('خطأ: ' + e.message, 'error'); }
    };
  });
}

/* Per-user actions */
function showUserDetails(u) {
  const d = cachedUsers[u] || {};
  const pic = d.profilePic ? `<img src="${esc(d.profilePic)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--primary);">` : `<div style="width:80px;height:80px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;">${esc(u.charAt(0).toUpperCase())}</div>`;
  
  let info = formatObject({
    xp: d.xp || 0,
    coins: d.coins || 0,
    streak: d.streak || 0,
    persona: d.persona || 'لا يوجد',
    team: d.team || 'بدون تيم',
    verified: d.verified ? '✓' : '❌'
  });
  
  const html = `
    <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:20px;">
      ${pic}
      <h2 style="margin:10px 0 5px 0;">${esc(u)}</h2>
    </div>
    ${info}
  `;
  showModalHTML('👤 ' + esc(u), html);
}

async function showUserScores(u) {
  const snap = await get(ref(db, 'scores/' + u));
  const data = snap.val() || {};
  showModalHTML('📊 نتائج ' + esc(u), formatObject(data));
}
async function assignUserRank(u) {
  const cur = (await get(ref(db, 'roles/users/' + u))).val() || 'Player';
  const r = await sitePrompt(`الرتبة الحالية لـ ${u} هي ${cur}\nأدخل الرتبة الجديدة:`);
  if (!r) return;
  await set(ref(db, 'roles/users/' + u), r);
  toast('تم تعيين الرتبة');
  renderUsersTab();
}
async function removeUserRank(u) {
  if (!await siteConfirm(`إلغاء رتبة ${u}؟`)) return;
  await remove(ref(db, 'roles/users/' + u));
  toast('تم إلغاء الرتبة');
  renderUsersTab();
}
async function assignUserBadge(u) {
  const b = await sitePrompt(`أدخل اسم البادج لـ ${u}:`);
  if (!b) return;
  await set(ref(db, `badges/${u}/${b}`), true);
  toast('تم');
}
async function removeUserBadge(u) {
  const b = await sitePrompt(`اسم البادج اللي عايز تلغيه لـ ${u}:`);
  if (!b) return;
  await remove(ref(db, `badges/${u}/${b}`));
  toast('تم إلغاء البادج');
}
async function sendUserMessage(u) {
  const text = await sitePrompt(`رسالة لـ ${u}:`);
  if (!text) return;
  await push(ref(db, 'messages/' + u), { from: currentUser, text, time: Date.now() });
  toast('تم الإرسال');
}
async function warnUser(u) {
  const r = await sitePrompt(`سبب التحذير لـ ${u}:`);
  if (!r) return;
  await set(ref(db, 'warnings/' + u), { text: r, time: Date.now() });
  toast('تم التحذير');
}
async function removeUserWarning(u) {
  if (!await siteConfirm(`إلغاء تحذير ${u}؟`)) return;
  await remove(ref(db, 'warnings/' + u));
  toast('تم إلغاء التحذير');
}
async function banUser(u) {
  const r = await sitePrompt(`سبب حظر ${u}:`, 'مخالفة');
  if (r === null) return;
  await set(ref(db, 'banned_users/' + u), { reason: r, by: currentUser, time: Date.now() });
  toast('تم الحظر');
}
async function unbanUser(u) {
  await remove(ref(db, 'banned_users/' + u));
  toast('تم رفع الحظر');
}
async function kickUser(u) {
  if (!await siteConfirm(`طرد ${u}؟`)) return;
  await set(ref(db, 'kick_signals/' + u), true);
  toast('تم الطرد');
}
async function resetUserXP(u) {
  if (!await siteConfirm(`تصفير XP لـ ${u}؟`)) return;
  await set(ref(db, 'users_data/' + u + '/xp'), 0);
  toast('تم');
  renderUsersTab();
}
async function addUserXP(u) {
  const a = parseInt(await sitePrompt('كم XP:'));
  if (!a) return;
  const c = (await get(ref(db, 'users_data/' + u + '/xp'))).val() || 0;
  await set(ref(db, 'users_data/' + u + '/xp'), c + a);
  toast('تمت الإضافة');
  renderUsersTab();
}
async function removeUserXP(u) {
  const a = parseInt(await sitePrompt('كم XP:'));
  if (!a) return;
  const c = (await get(ref(db, 'users_data/' + u + '/xp'))).val() || 0;
  await set(ref(db, 'users_data/' + u + '/xp'), Math.max(0, c - a));
  toast('تم الخصم');
  renderUsersTab();
}
async function addUserCoins(u) {
  const a = parseInt(await sitePrompt('كم كوينز:'));
  if (!a) return;
  const c = (await get(ref(db, 'users_data/' + u + '/coins'))).val() || 0;
  await set(ref(db, 'users_data/' + u + '/coins'), c + a);
  toast('تم');
  renderUsersTab();
}
async function viewUserAvatar(u) {
  const d = cachedUsers[u] || {};
  showModalHTML('🖼️ ' + esc(u), d.profilePic
    ? `<img src="${esc(d.profilePic)}" style="max-width:100%;border-radius:8px;">`
    : 'لا يوجد صورة');
}
async function viewUserFriends(u) {
  const snap = await get(ref(db, 'friends/' + u));
  showModal('👥 أصدقاء ' + u, Object.keys(snap.val() || {}).join('\n') || 'لا يوجد');
}
async function exportUserData(u) {
  const snap = await get(ref(db, 'users_data/' + u));
  download(u + '_data.json', JSON.stringify(snap.val() || {}, null, 2));
  toast('تم');
}
async function deleteUser(u) {
  if (!await siteConfirm(`حذف حساب ${u} نهائياً؟`)) return;
  await remove(ref(db, 'users_data/' + u));
  await remove(ref(db, 'usernames/' + u));
  await remove(ref(db, 'scores/' + u));
  toast('تم الحذف');
  renderUsersTab();
}
async function viewUserStreak(u) {
  const snap = await get(ref(db, 'users_data/' + u + '/streak'));
  showModal('🔥 ' + u, 'الستريك: ' + (snap.val() || 0));
}
async function changeUserTeam(u) {
  const t = await sitePrompt('التيم الجديد (horror/action/mystery/thriller/egyptian/drama):');
  if (!t) return;
  await set(ref(db, 'users_data/' + u + '/team'), t);
  toast('تم');
  renderUsersTab();
}
async function removeUserTeam(u) {
  if (!await siteConfirm(`إلغاء تيم ${u}؟`)) return;
  await remove(ref(db, 'users_data/' + u + '/team'));
  toast('تم إلغاء التيم');
  renderUsersTab();
}
async function promoteAdmin(u) {
  await set(ref(db, 'roles/admins/' + u), true);
  toast('تم ترقية ' + u + ' لأدمن');
}
async function removeUserAdmin(u) {
  if (!await siteConfirm(`إلغاء أدمن من ${u}؟`)) return;
  await remove(ref(db, 'roles/admins/' + u));
  toast('تم إلغاء الأدمن');
}

/* ==================== DASHBOARD STATS ==================== */
async function loadDashboardStats() {
  try {
    const [u, p, r, s, b, w, c, t] = await Promise.all([
      get(ref(db, 'usernames')), get(ref(db, 'presence')),
      get(ref(db, 'rooms')), get(ref(db, 'scores')),
      get(ref(db, 'banned_users')), get(ref(db, 'warnings')),
      get(ref(db, 'comments')), get(ref(db, 'support_tickets'))
    ]);
    document.getElementById('s-users').textContent = countKeys(u.val());
    const online = p.val() ? Object.values(p.val()).filter(v => v.status === 'online').length : 0;
    document.getElementById('s-online').textContent = online;
    document.getElementById('s-rooms').textContent = countKeys(r.val());
    let plays = 0;
    const sData = s.val() || {};
    Object.values(sData).forEach(quizzes => {
      Object.values(quizzes).forEach(attempts => { plays += Object.keys(attempts).length; });
    });
    document.getElementById('s-plays').textContent = plays;
    document.getElementById('s-banned').textContent = countKeys(b.val());
    document.getElementById('s-warns').textContent = countKeys(w.val());
    document.getElementById('s-comments').textContent = countKeys(c.val());
    document.getElementById('s-tickets').textContent = countKeys(t.val());
  } catch (e) { console.error(e); }
}

/* ==================== EXPOSE ONCLICK HANDLERS ==================== */
window.nodeStats         = nodeStats;
window.nodeExport        = nodeExport;
window.nodeClear         = nodeClear;
window.quizStats         = quizStats;
window.quizExport        = quizExport;
window.quizReset         = quizReset;
window.quizClear         = quizClear;
window.rankMembers       = rankMembers;
window.rankAssignPrompt  = rankAssignPrompt;
window.rankClear         = rankClear;
window.badgeMembers      = badgeMembers;
window.badgeAssignPrompt = badgeAssignPrompt;
window.badgeClear        = badgeClear;
window.viewVerifiedUsers = viewVerifiedUsers;
window.verifyUser        = verifyUser;
window.removeVerifyUser  = removeVerifyUser;
window.saveSetting       = saveSetting;
window.renderUsersTab    = renderUsersTab;

/* ==================== INIT ==================== */
async function checkOwnerAndInit() {
  const roleSnap = await get(ref(db, 'roles/users/' + currentUser));
  const role = roleSnap.val();
  const isOwner = (currentUser.toLowerCase() === 'ahmed') || (role === 'Owner');

  if (!isOwner) {
    document.body.innerHTML = `
      <div class="access-denied">
        <h1>⛔ وصول مرفوض</h1>
        <p>هذه الصفحة للأونر فقط.</p>
        <br>
        <a href="index.html" style="color:var(--primary); text-decoration:underline;">⬅ رجوع للرئيسية</a>
      </div>`;
    return;
  }

  document.getElementById('ownerName').textContent = currentUser;
  document.getElementById('ownerContent').classList.add('active');
  initRedLines();
  await renderTabs();
  loadDashboardStats();
}

checkOwnerAndInit();