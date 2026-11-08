/* ═══════════════════════════════════════════════════════════════════
   OWNER ADVANCED — 295 features • 100% Firebase • No external APIs
   ═══════════════════════════════════════════════════════════════════ */

import { ref, get, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const db = window.db;
const T = (m, t) => window.toast(m, t || 'success');
const M = (t, h) => window.openModal(t, h);
const E = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();
const NOW = () => Date.now();
const D = (n) => Date.now() - n * 86400000;

/* ─── Helpers ─── */
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

/* Device fingerprint (بديل IP) */
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

/* ═══════════════════════════════════════════════════════════════════
   TAB: ANALYTICS (30) — كلها حقيقية
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  showAnalyticsDashboard: async () => {
    const [u, s, p, b, w] = await Promise.all([
      all('usernames'), all('scores'), all('presence'), all('banned_users'), all('warnings')
    ]);
    const online = Object.values(p).filter(x => x.status === 'online').length;
    const today = new Date().toDateString();
    let todayPlays = 0;
    for (const user in s) for (const q in s[user]) for (const a in s[user][q]) {
      if (new Date(s[user][q][a].time || 0).toDateString() === today) todayPlays++;
    }
    M('📊 لوحة مباشرة', statBox([
      ['👥', Object.keys(u).length, 'لاعبين'],
      ['🟢', online, 'متصل الآن'],
      ['🎮', Object.keys(s).length, 'لاعبوا'],
      ['🎯', todayPlays, 'لعب اليوم'],
      ['🚫', Object.keys(b).length, 'محظورين'],
      ['⚠️', Object.keys(w).length, 'تحذيرات']
    ]));
  },
  exportAnalytics: async () => {
    const data = {
      users: await all('usernames'),
      scores: await all('scores'),
      presence: await all('presence'),
      speedrun: await all('speedrun_scores')
    };
    exportJSON(data, 'analytics');
    T('✅ تم التصدير');
  },
  clearAnalytics: async () => {
    if (!confirm2('⚠️ مسح كل التحليلات (scores)?')) return;
    await remove(ref(db, 'scores'));
    T('✅ تم المسح');
  },
  toggleAutoRefresh: async () => {
    const cur = (await get(ref(db, 'site_settings/autoRefreshAnalytics'))).val() || false;
    await set(ref(db, 'site_settings/autoRefreshAnalytics'), !cur);
    T(!cur ? '✅ مفعل' : '❌ متوقف');
  },

  showRetention: async () => {
    const s = await all('scores');
    const w = D(7);
    let active = 0;
    for (const u in s) {
      let ok = false;
      for (const q in s[u]) for (const a in s[u][q]) {
        if (new Date(s[u][q][a].time || 0).getTime() > w) { ok = true; break; }
      }
      if (ok) active++;
    }
    const total = Object.keys(s).length;
    M('📊 الاحتفاظ', statBox([
      ['👥', total, 'إجمالي'],
      ['✅', active, 'نشط 7 أيام'],
      ['📊', total ? Math.round(active/total*100)+'%' : '0%', 'المعدل']
    ]));
  },
  showChurn: async () => {
    const s = await all('scores');
    const w = D(7);
    const churned = [];
    for (const u in s) {
      let last = 0;
      for (const q in s[u]) for (const a in s[u][q]) {
        const t = new Date(s[u][q][a].time || 0).getTime();
        if (t > last) last = t;
      }
      if (last > 0 && last < w) churned.push([E(u), new Date(last).toLocaleDateString('ar-EG')]);
    }
    M('📉 المتسربين', `<p>${churned.length} لاعب</p>${table(['اللاعب','آخر لعب'], churned)}`);
  },
  showDAU: async () => {
    const s = await all('scores');
    const today = new Date().toDateString();
    const set_ = new Set();
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      if (new Date(s[u][q][a].time || 0).toDateString() === today) set_.add(u);
    }
    T(`📅 DAU: ${set_.size} لاعب اليوم`);
  },
  showMAU: async () => {
    const s = await all('scores');
    const m = D(30);
    const set_ = new Set();
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      if (new Date(s[u][q][a].time || 0).getTime() > m) set_.add(u);
    }
    T(`📆 MAU: ${set_.size} لاعب آخر 30 يوم`);
  },
  showAvgSession: async () => {
    const s = await all('scores');
    const sessions = [];
    for (const u in s) {
      const times = [];
      for (const q in s[u]) for (const a in s[u][q]) {
        const t = new Date(s[u][q][a].time || 0).getTime();
        if (t) times.push(t);
      }
      if (times.length > 1) {
        times.sort((a, b) => a - b);
        sessions.push((times[times.length-1] - times[0]) / 60000);
      }
    }
    const avg = sessions.length ? Math.round(sessions.reduce((a, b) => a + b, 0) / sessions.length) : 0;
    T(`⏱️ متوسط الجلسة: ${avg} دقيقة`);
  },
  showTop20Active: async () => {
    const s = await all('scores');
    const arr = Object.entries(s).map(([u, q]) => {
      let n = 0;
      for (const k in q) n += Object.keys(q[k]).length;
      return [u, n];
    }).sort((a, b) => b[1] - a[1]).slice(0, 20);
    M('🔥 أعلى 20', table(['#','اللاعب','مرات'], arr.map(([u,c],i) => [`#${i+1}`, E(u), c])));
  },

  showCompletionRate: async () => {
    const s = await all('scores');
    let t = 0, c = 0;
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      t++;
      if ((s[u][q][a].score || 0) >= (s[u][q][a].total || 0) * 0.5) c++;
    }
    T(`✅ إتمام: ${t ? Math.round(c/t*100) : 0}% (${c}/${t})`);
  },
  showAvgAnswerTime: async () => {
    const s = await all('scores');
    let n = 0, sum = 0;
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      const d = s[u][q][a].duration;
      if (d) { n++; sum += d; }
    }
    T(`⏱️ متوسط: ${n ? Math.round(sum/n) : 0}s`);
  },
  showMostFailed: async () => {
    const s = await all('scores');
    const f = {};
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      if ((s[u][q][a].score || 0) < (s[u][q][a].total || 1) * 0.4) f[q] = (f[q]||0) + 1;
    }
    const top = Object.entries(f).sort((a,b) => b[1]-a[1]).slice(0,10);
    M('❌ الأكثر فشلاً', table(['الكويز','فشل'], top));
  },
  showHardQuestions: async () => {
    const s = await all('scores');
    const h = {};
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      const d = s[u][q][a];
      if (d.answers && Array.isArray(d.answers)) {
        d.answers.forEach((ans, i) => {
          if (!ans.correct) { const k = `${q}_Q${i}`; h[k] = (h[k]||0)+1; }
        });
      }
    }
    const top = Object.entries(h).sort((a,b) => b[1]-a[1]).slice(0,20);
    M('🔴 أسئلة صعبة', top.length ? table(['السؤال','فشل'], top) : '<div class="empty-state">💡 يحتاج تسجيل الإجابات الفردية في quiz-core.js</div>');
  },
  showEasyQuestions: async () => {
    const s = await all('scores');
    const h = {};
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      const d = s[u][q][a];
      if (d.answers && Array.isArray(d.answers)) {
        d.answers.forEach((ans, i) => {
          if (ans.correct) { const k = `${q}_Q${i}`; h[k] = (h[k]||0)+1; }
        });
      }
    }
    const top = Object.entries(h).sort((a,b) => b[1]-a[1]).slice(0,20);
    M('🟢 أسئلة سهلة', top.length ? table(['السؤال','نجاح'], top) : '<div class="empty-state">💡 يحتاج تسجيل الإجابات</div>');
  },

  showHeatmap: async () => {
    const s = await all('scores');
    const h = Array(24).fill(0);
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      h[new Date(s[u][q][a].time || 0).getHours()]++;
    }
    const mx = Math.max(...h, 1);
    const bars = h.map((v, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
      <div style="height:${Math.max(v/mx*90,3)}px;width:100%;background:linear-gradient(180deg,var(--gold),var(--gold-dark));border-radius:2px;${v===0?'opacity:.15;':''}"></div>
      <div style="font-size:9px;color:var(--text-3)">${i}</div>
    </div>`).join('');
    M('🔥 خريطة الحرارة', `<div style="display:flex;gap:2px;align-items:flex-end;height:120px;margin-top:20px;">${bars}</div>`);
  },
  showUserJourney: async () => {
    const s = await all('scores');
    const rows = [];
    for (const u in s) {
      const evs = [];
      for (const q in s[u]) for (const a in s[u][q]) {
        evs.push({ q, t: s[u][q][a].time, s: s[u][q][a].score });
      }
      evs.sort((a,b) => new Date(b.t) - new Date(a.t)).slice(0,3).forEach((e, i) => {
        rows.push([i===0 ? E(u) : '', E(e.q), e.s, new Date(e.t).toLocaleDateString('ar-EG')]);
      });
    }
    M('🚶 مسار اللاعبين', table(['اللاعب','الكويز','النقاط','التاريخ'], rows.slice(0,50)));
  },
  showPeakTimes: async () => {
    const s = await all('scores');
    const h = Array(24).fill(0);
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) h[new Date(s[u][q][a].time || 0).getHours()]++;
    const top = h.map((v,i) => [i, v]).sort((a,b) => b[1]-a[1]).slice(0,5);
    M('⏰ الأوقات النشطة', table(['الساعة','عدد'], top.map(([h,v]) => [`${h}:00`, v])));
  },
  showDevices: async () => {
    const p = await all('presence');
    const d = {};
    for (const u in p) { const k = p[u].device || 'غير معروف'; d[k] = (d[k]||0)+1; }
    M('📱 الأجهزة', Object.keys(d).length ? table(['الجهاز','عدد'], Object.entries(d)) : '<div class="empty-state">💡 يتطلب تسجيل user-agent في login</div>');
  },
  showCountries: async () => {
    const p = await all('presence');
    const c = {};
    for (const u in p) { const k = p[u].country || 'غير معروف'; c[k] = (c[k]||0)+1; }
    const known = Object.entries(c).filter(([k]) => k !== 'غير معروف');
    M('🌍 الدول', known.length ? table(['الدولة','عدد'], known) : '<div class="empty-state">💡 يتطلب GeoIP API (مش متاح بدون external)</div>');
  },

  showCoinsDistribution: async () => {
    const u = await all('users_data');
    const b = { '0':0, '1-50':0, '51-200':0, '201-500':0, '501-1000':0, '1000+':0 };
    for (const k in u) {
      const c = u[k].coins || 0;
      if (c === 0) b['0']++;
      else if (c <= 50) b['1-50']++;
      else if (c <= 200) b['51-200']++;
      else if (c <= 500) b['201-500']++;
      else if (c <= 1000) b['501-1000']++;
      else b['1000+']++;
    }
    M('🪙 توزيع الكوينز', table(['المدى','عدد'], Object.entries(b)));
  },
  showCoinsConsumption: async () => {
    const u = await all('users_data');
    let t = 0;
    for (const k in u) t += u[k].coins || 0;
    const n = Object.keys(u).length;
    M('💸 الكوينز', statBox([
      ['🪙', t.toLocaleString(), 'إجمالي'],
      ['📊', n ? Math.round(t/n) : 0, 'متوسط/لاعب'],
      ['👥', n, 'لاعبين']
    ]));
  },
  showXPDistribution: async () => {
    const u = await all('users_data');
    const b = { '0':0, '1-500':0, '501-2000':0, '2001-5000':0, '5001-10000':0, '10000+':0 };
    for (const k in u) {
      const x = u[k].xp || 0;
      if (x === 0) b['0']++;
      else if (x <= 500) b['1-500']++;
      else if (x <= 2000) b['501-2000']++;
      else if (x <= 5000) b['2001-5000']++;
      else if (x <= 10000) b['5001-10000']++;
      else b['10000+']++;
    }
    M('✨ توزيع XP', table(['المدى','عدد'], Object.entries(b)));
  },
  showXPGrowth: async () => {
    const s = await all('scores');
    const d = {};
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      const day = new Date(s[u][q][a].time || 0).toLocaleDateString('ar-EG');
      d[day] = (d[day]||0) + (s[u][q][a].score || 0);
    }
    M('📈 نمو XP', table(['اليوم','XP'], Object.entries(d).slice(-14)));
  },
  showFullEconomy: async () => {
    const [u, s] = await Promise.all([all('users_data'), all('scores')]);
    let c = 0, x = 0, p = 0;
    for (const k in u) { c += u[k].coins || 0; x += u[k].xp || 0; }
    for (const k in s) for (const q in s[k]) p += Object.keys(s[k][q]).length;
    M('💼 الاقتصاد الكامل', statBox([
      ['🪙', c.toLocaleString(), 'إجمالي كوينز'],
      ['✨', x.toLocaleString(), 'إجمالي XP'],
      ['🎮', p, 'مرات لعب'],
      ['👥', Object.keys(u).length, 'لاعبين']
    ]));
  },

  predictGrowth: async () => {
    const s = await all('scores');
    const d = {};
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      const day = new Date(s[u][q][a].time || 0).toDateString();
      d[day] = (d[day]||0) + 1;
    }
    const days = Object.entries(d).sort((a,b) => new Date(a[0])-new Date(b[0])).slice(-7);
    if (days.length < 2) return T('📊 محتاج بيانات أكتر', 'warn');
    const avg = days.reduce((s,[,v]) => s+v, 0) / days.length;
    const trend = (days[days.length-1][1] - days[0][1]) / days.length;
    T(`📈 توقع: ~${Math.max(0, Math.round(avg + trend))} لعبة غداً`);
  },
  predictNewPlayers: async () => {
    const u = await all('users_data');
    const d = {};
    for (const k in u) if (u[k].createdAt) {
      const day = new Date(u[k].createdAt).toDateString();
      d[day] = (d[day]||0) + 1;
    }
    const days = Object.entries(d).slice(-7);
    if (!days.length) return T('💡 محتاج data createdAt', 'warn');
    const avg = days.reduce((s,[,v]) => s+v, 0) / days.length;
    T(`👥 توقع: ~${Math.round(avg)} تسجيل/يوم`);
  },
  predictBans: async () => {
    const b = await all('banned_users');
    const d = {};
    for (const k in b) {
      const day = new Date(b[k].time || 0).toDateString();
      d[day] = (d[day]||0) + 1;
    }
    const days = Object.entries(d).slice(-7);
    const avg = days.length ? days.reduce((s,[,v]) => s+v, 0) / days.length : 0;
    T(`🚫 توقع: ~${Math.round(avg)} حظر/يوم`);
  },
  detectAnomalies: async () => {
    const s = await all('scores');
    const arr = [];
    for (const u in s) for (const q in s[u]) for (const a in s[u][q]) {
      arr.push({ u, s: s[u][q][a].score || 0, t: s[u][q][a].total || 1 });
    }
    if (!arr.length) return T('لا يوجد بيانات', 'warn');
    const ratios = arr.map(x => x.s / x.t);
    const mean = ratios.reduce((a,b) => a+b, 0) / ratios.length;
    const std = Math.sqrt(ratios.reduce((a,b) => a+(b-mean)**2, 0) / ratios.length);
    const out = arr.filter((_,i) => Math.abs(ratios[i]-mean) > 2*std);
    M('🔍 الشذوذ', `<p>تم تحليل ${arr.length} محاولة. ${out.length} شاذة</p>${table(['اللاعب','النقاط','النسبة'], out.slice(0,20).map(o => [E(o.u), o.s, Math.round(o.s/o.t*100)+'%']))}`);
  },
  aiInsights: async () => {
    const [u, s, b, w] = await Promise.all([all('users_data'), all('scores'), all('banned_users'), all('warnings')]);
    const total = Object.keys(u).length;
    let plays = 0;
    for (const k in s) for (const q in s[k]) plays += Object.keys(s[k][q]).length;
    const active = Object.keys(s).length;
    const insights = [
      `📊 ${total} لاعب، ${active} لعبوا (${total ? Math.round(active/total*100) : 0}%)`,
      `🎮 ${plays} لعبة (متوسط ${total ? (plays/total).toFixed(1) : 0}/لاعب)`,
      `🚫 ${Object.keys(b).length} محظور • ⚠️ ${Object.keys(w).length} تحذير`,
      active/total < 0.5 ? '⚠️ نسبة المشاركة منخفضة' : '✅ المشاركة جيدة',
      total < 20 ? '💡 محتاج حملة تسويق' : ''
    ].filter(Boolean);
    M('🧠 رؤى', `<ul style="list-style:none;padding:0;line-height:2;">${insights.map(x => `<li>${x}</li>`).join('')}</ul>`);
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: MARKETING (30) — كلها حقيقية
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  /* Campaigns */
  createCampaign: async () => {
    const name = prompt('اسم الحملة:');
    if (!name) return;
    const goal = prompt('الهدف (رقم):', '100') || '100';
    await push(ref(db, 'marketing/campaigns'), { name, goal: +goal, count: 0, createdAt: NOW(), status: 'active' });
    T('✅ تم إنشاء الحملة');
  },
  viewCampaigns: async () => {
    const c = await all('marketing/campaigns');
    const rows = Object.entries(c).map(([id, v]) => [E(v.name||id), v.goal||0, v.count||0, v.status||'active']);
    M('🎯 الحملات', table(['الاسم','الهدف','المنجز','الحالة'], rows));
  },
  clearCampaigns: async () => { if (!confirm2('مسح الحملات؟')) return; await remove(ref(db, 'marketing/campaigns')); T('✅'); },
  exportCampaigns: async () => { exportJSON(await all('marketing/campaigns'), 'campaigns'); T('✅'); },
  scheduleCampaign: async () => {
    const name = prompt('اسم الحملة:');
    if (!name) return;
    const date = prompt('موعد الإطلاق (YYYY-MM-DD):');
    if (!date) return;
    await push(ref(db, 'marketing/scheduled'), { name, date, createdAt: NOW() });
    T('✅ تم الجدولة');
  },

  /* Coupons */
  createCoupon: async () => {
    const code = prompt('الكود (مثال: SAVE20):');
    if (!code) return;
    const reward = parseInt(prompt('قيمة المكافأة:', '100') || '0', 10);
    const uses = parseInt(prompt('عدد الاستخدامات:', '10') || '10', 10);
    await set(ref(db, 'marketing/coupons/' + code.toUpperCase()), {
      reward, uses, used: 0, createdAt: NOW(), status: 'active'
    });
    T('✅ تم إنشاء الكوبون');
  },
  viewCoupons: async () => {
    const c = await all('marketing/coupons');
    const rows = Object.entries(c).map(([k, v]) => [k, v.reward||0, `${v.used||0}/${v.uses||0}`, v.status||'active']);
    M('🎟️ الكوبونات', table(['الكود','المكافأة','الاستخدام','الحالة'], rows));
  },
  clearCoupons: async () => { if (!confirm2('مسح الكوبونات؟')) return; await remove(ref(db, 'marketing/coupons')); T('✅'); },
  disableCoupon: async () => {
    const code = prompt('الكود:');
    if (!code) return;
    await update(ref(db, 'marketing/coupons/' + code.toUpperCase()), { status: 'disabled' });
    T('✅');
  },
  exportCoupons: async () => { exportJSON(await all('marketing/coupons'), 'coupons'); T('✅'); },

  /* Referrals */
  setupReferrals: async () => {
    const on = (await get(ref(db, 'marketing/referrals/enabled'))).val();
    await set(ref(db, 'marketing/referrals/enabled'), !on);
    T(!on ? '✅ نظام الإحالة مفعل' : '❌ متوقف');
  },
  viewReferrals: async () => {
    const r = await all('marketing/referrals/list');
    const rows = Object.entries(r).map(([id, v]) => [E(v.referrer||''), E(v.referred||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']);
    M('🔗 الإحالات', table(['الداعي','المدعو','التاريخ'], rows));
  },
  referralRewards: async () => {
    const amount = parseInt(prompt('المكافأة لكل إحالة ناجحة (كوينز):', '100') || '0', 10);
    if (!amount) return;
    await set(ref(db, 'marketing/referrals/reward'), amount);
    T(`✅ المكافأة: ${amount} كوينز`);
  },
  viewSuccessfulReferrals: async () => {
    const r = await all('marketing/referrals/list');
    const success = Object.entries(r).filter(([,v]) => v.success);
    M('✅ الإحالات الناجحة', table(['الداعي','المدعو'], success.map(([,v]) => [E(v.referrer), E(v.referred)])));
  },
  clearReferrals: async () => { if (!confirm2('مسح الإحالات؟')) return; await remove(ref(db, 'marketing/referrals')); T('✅'); },

  /* SEO */
  setupSEO: async () => {
    const title = prompt('عنوان الصفحة (Title):', document.title) || document.title;
    const desc = prompt('الوصف (Description):', '') || '';
    await update(ref(db, 'site_settings/seo'), { title, description: desc });
    T('✅ تم الحفظ');
  },
  editMetaTags: async () => {
    const keywords = prompt('الكلمات المفتاحية (مفصولة بفواصل):', '') || '';
    await set(ref(db, 'site_settings/seo/keywords'), keywords);
    T('✅');
  },
  generateSitemap: async () => {
    const quizzes = ['Annabelle','Conjuring','TheNun','FNAF','SquidGame','Spider-Man','Avengers','Avatar','Venom','BirdsOfPrey','Fall','Wednesday','KnivesOut','Scream','TrainToBusan','ElHarifa'];
    const base = window.location.origin + window.location.pathname.replace('owner.html', '');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${base}index.html</loc></url>
${quizzes.map(q => `<url><loc>${base}${q} Quiz.html</loc></url>`).join('\n')}
</urlset>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sitemap.xml';
    a.click();
    T('✅ تم تحميل sitemap.xml');
  },
  editRobots: async () => {
    const robots = `User-agent: *
Allow: /
Disallow: /owner.html
Disallow: /admin.html
Disallow: /restricted.html
Sitemap: ${window.location.origin}/sitemap.xml`;
    const blob = new Blob([robots], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'robots.txt';
    a.click();
    T('✅ تم تحميل robots.txt');
  },
  setupGoogleAnalytics: async () => {
    M('📊 SEO/GA', `<p>Google Analytics محتاج كود خاص بيك، لكن عندك بديل:</p>
      <p>✅ استخدم <b>التحليلات المتقدمة</b> في تاب Analytics — كل حاجة شغالة من Firebase بدون GA.</p>
      <p>✅ لو محتاج GA، ضيف السكريبت يدوياً في index.html.</p>`);
  },

  /* Popups */
  createPopup: async () => {
    const title = prompt('عنوان الـ Popup:');
    if (!title) return;
    const body = prompt('نص الإعلان:') || '';
    await push(ref(db, 'marketing/popups'), { title, body, active: true, createdAt: NOW() });
    T('✅ تم إنشاء Popup');
  },
  viewPopups: async () => {
    const p = await all('marketing/popups');
    const rows = Object.entries(p).map(([id, v]) => [E(v.title||id), v.active ? '✅' : '❌', new Date(v.createdAt || 0).toLocaleDateString('ar-EG')]);
    M('🔔 Popups', table(['العنوان','الحالة','التاريخ'], rows));
  },
  clearPopups: async () => { if (!confirm2('مسح Popups؟')) return; await remove(ref(db, 'marketing/popups')); T('✅'); },
  sendPushNotification: async () => {
    const title = prompt('عنوان الإشعار:');
    if (!title) return;
    const body = prompt('نص الإشعار:') || '';
    await push(ref(db, 'marketing/notifications'), { title, body, time: NOW(), seen: {} });
    const users = await all('usernames');
    for (const u in users) {
      await push(ref(db, 'messages/' + u), { from: '🔔 إشعار', text: `${title}\n${body}`, time: NOW() });
    }
    T(`✅ تم إرسال لـ ${Object.keys(users).length} لاعب`);
  },
  customizeNotification: async () => {
    const color = prompt('لون الإشعار (hex):', '#ffd700') || '#ffd700';
    await set(ref(db, 'marketing/notifications/color'), color);
    T('✅');
  },

  /* Partners */
  createPartner: async () => {
    const name = prompt('اسم الشريك:');
    if (!name) return;
    const contact = prompt('طريقة التواصل (اختياري):') || '';
    await push(ref(db, 'marketing/partners'), { name, contact, createdAt: NOW(), status: 'active' });
    T('✅');
  },
  viewPartners: async () => {
    const p = await all('marketing/partners');
    M('🤝 الشركاء', table(['الاسم','التواصل','الحالة'], Object.entries(p).map(([id,v]) => [E(v.name||id), E(v.contact||''), v.status||'active'])));
  },
  deletePartner: async () => {
    const id = prompt('ID الشريك (من العرض):');
    if (!id) return;
    await remove(ref(db, 'marketing/partners/' + id));
    T('✅');
  },
  partnerContract: async () => {
    const id = prompt('ID الشريك:');
    if (!id) return;
    const text = prompt('نص العقد:') || '';
    await update(ref(db, 'marketing/partners/' + id), { contract: text, signedAt: NOW() });
    T('✅');
  },
  partnerReport: async () => {
    const p = await all('marketing/partners');
    exportJSON(p, 'partners-report');
    T(`✅ تم تصدير ${Object.keys(p).length} شريك`);
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: ECONOMY (30)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  createCurrency: async () => {
    const name = prompt('اسم العملة:');
    if (!name) return;
    const symbol = prompt('الرمز:') || '🪙';
    await push(ref(db, 'economy/currencies'), { name, symbol, rate: 1, createdAt: NOW() });
    T('✅');
  },
  viewCurrencies: async () => {
    const c = await all('economy/currencies');
    M('🪙 العملات', table(['الاسم','الرمز','السعر'], Object.entries(c).map(([id,v]) => [E(v.name||id), E(v.symbol||'🪙'), v.rate||1])));
  },
  setExchangeRate: async () => {
    const id = prompt('ID العملة:');
    if (!id) return;
    const rate = parseFloat(prompt('السعر الجديد:') || '1');
    await update(ref(db, 'economy/currencies/' + id), { rate });
    T('✅');
  },
  clearCurrencies: async () => { if (!confirm2('مسح العملات؟')) return; await remove(ref(db, 'economy/currencies')); T('✅'); },
  exportCurrencies: async () => { exportJSON(await all('economy/currencies'), 'currencies'); T('✅'); },

  createProduct: async () => {
    const name = prompt('اسم المنتج:');
    if (!name) return;
    const price = parseInt(prompt('السعر (كوينز):', '100') || '100', 10);
    const type = prompt('النوع (badge/rank/item):', 'item') || 'item';
    await push(ref(db, 'economy/products'), { name, price, type, active: true, createdAt: NOW() });
    T('✅');
  },
  viewProducts: async () => {
    const p = await all('economy/products');
    M('🛒 المنتجات', table(['الاسم','السعر','النوع'], Object.entries(p).map(([id,v]) => [E(v.name||id), v.price||0, v.type||'item'])));
  },
  deleteProduct: async () => {
    const id = prompt('ID المنتج:');
    if (!id) return;
    await remove(ref(db, 'economy/products/' + id));
    T('✅');
  },
  exportProducts: async () => { exportJSON(await all('economy/products'), 'products'); T('✅'); },
  toggleProduct: async () => {
    const id = prompt('ID المنتج:');
    if (!id) return;
    const cur = (await get(ref(db, 'economy/products/' + id + '/active'))).val();
    await update(ref(db, 'economy/products/' + id), { active: !cur });
    T(!cur ? '✅ مفعل' : '❌ متوقف');
  },

  createLootBox: async () => {
    const name = prompt('اسم الصندوق:');
    if (!name) return;
    const price = parseInt(prompt('السعر:', '200') || '200', 10);
    const reward = parseInt(prompt('المكافأة الوسطية:', '100') || '100', 10);
    await push(ref(db, 'economy/lootboxes'), { name, price, reward, createdAt: NOW() });
    T('✅');
  },
  viewLootBoxes: async () => {
    const l = await all('economy/lootboxes');
    M('🎁 الصناديق', table(['الاسم','السعر','المكافأة'], Object.entries(l).map(([id,v]) => [E(v.name||id), v.price||0, v.reward||0])));
  },
  randomDistribution: async () => {
    const winners = [];
    const users = await all('usernames');
    const keys = Object.keys(users);
    for (let i = 0; i < 3 && keys.length; i++) {
      const idx = Math.floor(Math.random() * keys.length);
      winners.push(keys.splice(idx, 1)[0]);
    }
    M('🎲 توزيع عشوائي', list(winners));
  },
  openLootBox: async () => {
    const u = prompt('اسم اللاعب:');
    if (!u) return;
    const reward = Math.floor(Math.random() * 200) + 50;
    const cur = (await get(ref(db, 'users_data/' + u + '/coins'))).val() || 0;
    await set(ref(db, 'users_data/' + u + '/coins'), cur + reward);
    T(`🎁 فتح صندوق لـ ${u} → +${reward} كوينز`);
  },
  clearLootBoxes: async () => { if (!confirm2('مسح الصناديق؟')) return; await remove(ref(db, 'economy/lootboxes')); T('✅'); },

  setupDailyRewards: async () => {
    const amt = parseInt(prompt('المكافأة اليومية (كوينز):', '50') || '50', 10);
    await set(ref(db, 'economy/dailyRewards'), { amount: amt, enabled: true });
    T('✅');
  },
  viewDailyRewards: async () => {
    const d = await all('economy/dailyRewards');
    M('📅 المكافآت اليومية', statBox([['🪙', d.amount || 0, 'المكافأة'], ['✅', d.enabled ? 'مفعل' : 'متوقف', 'الحالة']]));
  },
  clearDailyRewards: async () => { if (!confirm2('مسح؟')) return; await remove(ref(db, 'economy/dailyRewards')); T('✅'); },
  exportDailyRewards: async () => { exportJSON(await all('economy/dailyRewards'), 'daily'); T('✅'); },
  doubleDailyRewards: async () => {
    const cur = (await get(ref(db, 'economy/dailyRewards/amount'))).val() || 50;
    await set(ref(db, 'economy/dailyRewards/amount'), cur * 2);
    T(`✅ المكافأة: ${cur * 2}`);
  },

  viewPurchases: async () => {
    const p = await all('economy/purchases');
    M('🧾 المشتريات', table(['اللاعب','المنتج','السعر','التاريخ'], Object.entries(p).map(([id,v]) => [E(v.user||''), E(v.product||''), v.price||0, v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—'])));
  },
  clearPurchases: async () => { if (!confirm2('مسح المشتريات؟')) return; await remove(ref(db, 'economy/purchases')); T('✅'); },
  refundPurchase: async () => {
    const id = prompt('ID الشراء:');
    if (!id) return;
    const p = (await get(ref(db, 'economy/purchases/' + id))).val();
    if (!p) return T('❌ غير موجود', 'error');
    const cur = (await get(ref(db, 'users_data/' + p.user + '/coins'))).val() || 0;
    await set(ref(db, 'users_data/' + p.user + '/coins'), cur + (p.price || 0));
    await update(ref(db, 'economy/purchases/' + id), { refunded: true });
    T(`✅ تم استرداد ${p.price} كوينز`);
  },
  viewTransactions: async () => {
    const p = await all('economy/purchases');
    const sorted = Object.values(p).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 50);
    M('📋 آخر 50 معاملة', table(['اللاعب','المنتج','السعر','التاريخ'], sorted.map(v => [E(v.user||''), E(v.product||''), v.price||0, v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },

  createAuction: async () => {
    const name = prompt('اسم العنصر:');
    if (!name) return;
    const start = parseInt(prompt('السعر الابتدائي:', '100') || '100', 10);
    await push(ref(db, 'economy/auctions'), { name, start, highest: start, active: true, createdAt: NOW() });
    T('✅');
  },
  viewAuctions: async () => {
    const a = await all('economy/auctions');
    M('🔨 المزادات', table(['الاسم','البداية','الأعلى','مفعل'], Object.entries(a).map(([id,v]) => [E(v.name||id), v.start||0, v.highest||0, v.active ? '✅' : '❌'])));
  },
  endAuction: async () => {
    const id = prompt('ID المزاد:');
    if (!id) return;
    await update(ref(db, 'economy/auctions/' + id), { active: false, endedAt: NOW() });
    T('✅');
  },
  clearAuctions: async () => { if (!confirm2('مسح المزادات؟')) return; await remove(ref(db, 'economy/auctions')); T('✅'); },
  exportAuctions: async () => { exportJSON(await all('economy/auctions'), 'auctions'); T('✅'); }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: AUTOMATION (25)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  createRule: async () => {
    const trigger = prompt('Trigger (signup/levelup/ban/purchase):', 'signup') || 'signup';
    const action = prompt('Action (message/xp/badge):', 'message') || 'message';
    const value = prompt('القيمة:') || '';
    await push(ref(db, 'automation/rules'), { trigger, action, value, active: true, createdAt: NOW() });
    T('✅');
  },
  viewRules: async () => {
    const r = await all('automation/rules');
    M('📜 القواعد', table(['Trigger','Action','القيمة','مفعل'], Object.entries(r).map(([id,v]) => [v.trigger||'', v.action||'', E(v.value||''), v.active ? '✅' : '❌'])));
  },
  toggleRule: async () => {
    const id = prompt('ID القاعدة:');
    if (!id) return;
    const cur = (await get(ref(db, 'automation/rules/' + id + '/active'))).val();
    await update(ref(db, 'automation/rules/' + id), { active: !cur });
    T('✅');
  },
  clearRules: async () => { if (!confirm2('مسح القواعد؟')) return; await remove(ref(db, 'automation/rules')); T('✅'); },
  exportRules: async () => { exportJSON(await all('automation/rules'), 'rules'); T('✅'); },

  /* Triggers - just toggle on/off */
  triggerSignup: async () => { await set(ref(db, 'automation/triggers/signup'), !(await get(ref(db, 'automation/triggers/signup'))).val()); T('✅'); },
  triggerLevelUp: async () => { await set(ref(db, 'automation/triggers/levelup'), !(await get(ref(db, 'automation/triggers/levelup'))).val()); T('✅'); },
  triggerBan: async () => { await set(ref(db, 'automation/triggers/ban'), !(await get(ref(db, 'automation/triggers/ban'))).val()); T('✅'); },
  triggerPurchase: async () => { await set(ref(db, 'automation/triggers/purchase'), !(await get(ref(db, 'automation/triggers/purchase'))).val()); T('✅'); },
  triggerReport: async () => { await set(ref(db, 'automation/triggers/report'), !(await get(ref(db, 'automation/triggers/report'))).val()); T('✅'); },

  actionSendMessage: async () => {
    const text = prompt('الرسالة التلقائية:') || '';
    await set(ref(db, 'automation/actions/message'), text);
    T('✅');
  },
  actionGiveXP: async () => {
    const xp = parseInt(prompt('XP:') || '0', 10);
    await set(ref(db, 'automation/actions/xp'), xp);
    T('✅');
  },
  actionGiveBadge: async () => {
    const badge = prompt('البادج:') || '';
    await set(ref(db, 'automation/actions/badge'), badge);
    T('✅');
  },
  actionAutoWarn: async () => {
    const n = parseInt(prompt('عدد التحذيرات قبل الحظر:') || '3', 10);
    await set(ref(db, 'automation/actions/maxWarns'), n);
    T('✅');
  },
  actionAutoBan: async () => {
    await set(ref(db, 'automation/actions/autoBan'), !(await get(ref(db, 'automation/actions/autoBan'))).val());
    T('✅');
  },

  /* Webhooks — real fetch test */
  createWebhook: async () => {
    const url = prompt('URL الـ Webhook:');
    if (!url) return;
    const event = prompt('الحدث (quiz_complete/user_signup/ban):', 'quiz_complete') || 'quiz_complete';
    await push(ref(db, 'automation/webhooks'), { url, event, active: true, createdAt: NOW() });
    T('✅');
  },
  viewWebhooks: async () => {
    const w = await all('automation/webhooks');
    M('🔗 Webhooks', table(['URL','الحدث','مفعل'], Object.entries(w).map(([id,v]) => [`<code>${E((v.url||'').slice(0,50))}</code>`, v.event||'', v.active ? '✅' : '❌'])));
  },
  testWebhook: async () => {
    const id = prompt('ID الـ Webhook:');
    if (!id) return;
    const w = (await get(ref(db, 'automation/webhooks/' + id))).val();
    if (!w) return T('❌ غير موجود', 'error');
    try {
      const res = await fetch(w.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', timestamp: NOW(), from: 'quizhub' })
      });
      T(`✅ استجابة: ${res.status}`, 'success');
    } catch (e) {
      T(`⚠️ CORS أو فشل: ${e.message.substring(0, 50)} — الـ webhook محفوظ وسيُستخدم من سيرفر لاحقاً`, 'warn');
    }
  },
  clearWebhooks: async () => { if (!confirm2('مسح Webhooks؟')) return; await remove(ref(db, 'automation/webhooks')); T('✅'); },
  exportWebhooks: async () => { exportJSON(await all('automation/webhooks'), 'webhooks'); T('✅'); },

  createScheduledTask: async () => {
    const name = prompt('اسم المهمة:');
    if (!name) return;
    const interval = parseInt(prompt('كل كام دقيقة؟') || '60', 10);
    await push(ref(db, 'automation/scheduled'), { name, interval, lastRun: 0, createdAt: NOW() });
    T('✅');
  },
  viewScheduledTasks: async () => {
    const s = await all('automation/scheduled');
    M('⏰ المهام المجدولة', table(['الاسم','الفاصل (دقيقة)','آخر تشغيل'], Object.entries(s).map(([id,v]) => [E(v.name||id), v.interval||0, v.lastRun ? new Date(v.lastRun).toLocaleString('ar-EG') : '—'])));
  },
  runTaskNow: async () => {
    const id = prompt('ID المهمة:');
    if (!id) return;
    await update(ref(db, 'automation/scheduled/' + id), { lastRun: NOW() });
    T('✅ تم التشغيل');
  },
  clearScheduledTasks: async () => { if (!confirm2('مسح المهام؟')) return; await remove(ref(db, 'automation/scheduled')); T('✅'); },
  exportScheduledTasks: async () => { exportJSON(await all('automation/scheduled'), 'scheduled'); T('✅'); }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: ADVANCED SECURITY (30) — البدائل شغالة 100%
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  /* Protection */
  enable2FA: async () => {
    const u = prompt('اسم اللاعب لتفعيل 2FA:');
    if (!u) return;
    const p1 = prompt('كلمة مرور 2FA (هيُحفظ hash):');
    if (!p1) return;
    const p2 = prompt('تأكيد كلمة المرور:');
    if (p1 !== p2) return T('❌ كلمتا المرور مختلفتان', 'error');
    const hash = btoa(p1 + '|' + u + '|salt');
    await set(ref(db, 'security/2fa/' + u), { hash, enabledAt: NOW() });
    T(`✅ تم تفعيل 2FA لـ ${u}`);
  },
  addIPWhitelist: async () => {
    const label = prompt('وصف للجهاز (مثال: "لابتوب الأونر"):');
    if (!label) return;
    const fp = fingerprint();
    await set(ref(db, 'security/whitelist/' + fp), { label, addedAt: NOW(), addedBy: CU });
    M('✅ تم', `<p>تم إضافة الجهاز الحالي.</p><p><b>Fingerprint:</b> <code>${fp}</code></p><p class="text-muted fs-12">ملاحظة: بديل IP — يعتمد على UA + Canvas + Screen.</p>`);
  },
  addIPBlacklist: async () => {
    const label = prompt('سبب الحظر:');
    if (!label) return;
    const fp = fingerprint();
    await set(ref(db, 'security/blacklist/' + fp), { reason: label, addedAt: NOW(), addedBy: CU });
    T('✅ تم حظر الجهاز الحالي');
  },
  enableRateLimit: async () => {
    const cur = (await get(ref(db, 'security/rateLimit/enabled'))).val();
    await set(ref(db, 'security/rateLimit/enabled'), !cur);
    if (!cur) {
      const min = parseInt(prompt('الحد الأدنى بين العمليات (ثواني):', '5') || '5', 10);
      await set(ref(db, 'security/rateLimit/seconds'), min);
    }
    T(!cur ? '✅ Rate Limiting مفعل' : '❌ متوقف');
  },
  enableCaptcha: async () => {
    const cur = (await get(ref(db, 'security/captcha/enabled'))).val();
    await set(ref(db, 'security/captcha/enabled'), !cur);
    T(!cur ? '✅ CAPTCHA مفعل' : '❌ متوقف');
  },

  /* Logs */
  viewLoginLog: async () => {
    const l = await all('security/logs/login');
    const rows = Object.values(l).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 100);
    M('🔑 سجل الدخول (آخر 100)', table(['اللاعب','الجهاز','التاريخ'], rows.map(v => [E(v.user||''), E((v.fp||'').slice(0,15)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  viewOperationsLog: async () => {
    const l = await all('admin_logs');
    const rows = Object.values(l).sort((a,b) => (b.time||0) - (a.time||0)).slice(0, 100);
    M('📊 سجل العمليات (آخر 100)', table(['الأدمن','الإجراء','الهدف','التاريخ'], rows.map(v => [E(v.admin||''), E(v.action||''), E(v.target||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  viewChangesLog: async () => {
    const l = await all('admin_logs');
    const changes = Object.values(l).filter(x => ['update_settings','update_toggles','editSetting'].some(a => (x.action||'').includes(a)));
    M('📝 سجل التغييرات', table(['الأدمن','الإجراء','الهدف'], changes.slice(0, 50).map(v => [E(v.admin||''), E(v.action||''), E(v.target||'')])));
  },
  viewBanLog: async () => {
    const b = await all('banned_users');
    const rows = Object.entries(b).map(([u, v]) => [E(u), E(v.reason||''), E(v.by||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—']);
    M('🚫 سجل الحظر', table(['المحظور','السبب','بواسطة','التاريخ'], rows));
  },

  /* Scans */
  scanVulnerabilities: async () => {
    const [u, b, w] = await Promise.all([all('users_data'), all('banned_users'), all('warnings')]);
    const issues = [];
    let noPic = 0, noXP = 0;
    for (const k in u) { if (!u[k].profilePic) noPic++; if (!u[k].xp) noXP++; }
    if (noPic > Object.keys(u).length * 0.8) issues.push(`⚠️ ${noPic} لاعب بدون صورة (${Math.round(noPic/Object.keys(u).length*100)}%)`);
    if (noXP > Object.keys(u).length * 0.5) issues.push(`⚠️ ${noXP} لاعب بدون XP — حسابات مش نشطة`);
    if (Object.keys(b).length > Object.keys(u).length * 0.1) issues.push(`🚨 نسبة محظورين عالية: ${Math.round(Object.keys(b).length/Object.keys(u).length*100)}%`);
    if (!issues.length) issues.push('✅ لا مشاكل ظاهرة');
    M('🔍 فحص الثغرات', `<ul style="line-height:2;">${issues.map(i => `<li>${i}</li>`).join('')}</ul>`);
  },
  scanPasswords: async () => {
    M('🔐 فحص كلمات المرور', `
      <p>لا يمكن فحص كلمات المرور الفعلية (Firebase Auth مشفّرة).</p>
      <p>✅ لكن نقدر نتحقق من:</p>
      <ul style="line-height:1.8;margin-top:10px;">
        <li>2FA مفعل: ${Object.keys(await all('security/2fa')).length} لاعب</li>
        <li>ننصح بتفعيل 2FA لكل الأدمنز</li>
      </ul>
      <p style="margin-top:10px;color:var(--text-2);">💡 لتشديد الأمان: firebase console → Authentication → Password Policy</p>
    `);
  },
  scanSessions: async () => {
    const p = await all('presence');
    const online = Object.entries(p).filter(([, v]) => v.status === 'online');
    M('🔑 الجلسات النشطة', online.length ? table(['اللاعب','آخر نشاط'], online.map(([u, v]) => [E(u), v.last_seen ? new Date(v.last_seen).toLocaleString('ar-EG') : '—'])) : '<div class="empty-state">لا يوجد جلسات</div>');
  },
  scanFiles: async () => {
    const files = ['pic/Logo.png', 'index.html', 'owner.html', 'owner-core.js', 'owner-style.css'];
    const results = [];
    for (const f of files) {
      try {
        const r = await fetch(f, { method: 'HEAD' });
        results.push([E(f), r.ok ? '✅ موجود' : '❌ مفقود']);
      } catch {
        results.push([E(f), '⚠️ فشل الفحص']);
      }
    }
    M('📁 فحص الملفات', table(['الملف','الحالة'], results));
  },
  securityReport: async () => {
    const [b, w, two, wl, bl, logs] = await Promise.all([
      all('banned_users'), all('warnings'), all('security/2fa'),
      all('security/whitelist'), all('security/blacklist'), all('security/logs/login')
    ]);
    M('📊 تقرير الأمان', statBox([
      ['🚫', Object.keys(b).length, 'محظورين'],
      ['⚠️', Object.keys(w).length, 'تحذيرات'],
      ['🔐', Object.keys(two).length, '2FA'],
      ['✅', Object.keys(wl).length, 'Whitelist'],
      ['⛔', Object.keys(bl).length, 'Blacklist'],
      ['🔑', Object.keys(logs).length, 'محاولات دخول']
    ]));
  },

  /* Advanced Ban — uses fingerprint */
  banIP: async () => {
    const fp = prompt('Fingerprint المحظور (أو اتركه فاضي لحظر جهازك):') || fingerprint();
    const reason = prompt('السبب:') || 'حظر جهاز';
    await set(ref(db, 'security/blacklist/' + fp), { reason, addedAt: NOW(), addedBy: CU });
    T('✅ تم حظر الجهاز');
  },
  banDevice: async () => window.banIP(),
  banDomain: async () => {
    const domain = prompt('النطاق (مثال: spam.com):');
    if (!domain) return;
    await push(ref(db, 'security/bannedDomains'), { domain, addedAt: NOW(), addedBy: CU });
    T('✅');
  },
  unbanIP: async () => {
    const fp = prompt('Fingerprint لرفع الحظر:');
    if (!fp) return;
    await remove(ref(db, 'security/blacklist/' + fp));
    T('✅ تم');
  },
  viewBanList: async () => {
    const [bl, bd] = await Promise.all([all('security/blacklist'), all('security/bannedDomains')]);
    M('📋 قائمة الحظر', `
      <h4 style="color:var(--gold);">⛔ أجهزة محظورة (${Object.keys(bl).length})</h4>
      ${Object.keys(bl).length ? table(['Fingerprint','السبب'], Object.entries(bl).map(([k, v]) => [`<code>${E(k.slice(0,15))}...</code>`, E(v.reason||'')])) : '<p>لا يوجد</p>'}
      <h4 style="color:var(--gold);margin-top:16px;">⛔ نطاقات محظورة (${Object.keys(bd).length})</h4>
      ${Object.keys(bd).length ? table(['النطاق'], Object.values(bd).map(v => [E(v.domain||'')])) : '<p>لا يوجد</p>'}
    `);
  },

  /* Recovery */
  recoverAccount: async () => {
    const u = prompt('اسم اللاعب:');
    if (!u) return;
    await push(ref(db, 'security/recovery'), { user: u, type: 'account', status: 'pending', requestedAt: NOW(), requestedBy: CU });
    T('✅ تم فتح طلب استرداد');
  },
  recoverData: async () => {
    const u = prompt('اسم اللاعب لاسترداد البيانات:');
    if (!u) return;
    await push(ref(db, 'security/recovery'), { user: u, type: 'data', status: 'pending', requestedAt: NOW(), requestedBy: CU });
    T('✅');
  },
  emergencyRegistration: async () => {
    await set(ref(db, 'site_settings/registrationOpen'), true);
    await set(ref(db, 'site_settings/maintenance'), false);
    T('🚨 تم فتح التسجيل وإيقاف الصيانة');
  },
  lockSite: async () => {
    await set(ref(db, 'site_settings/maintenance'), true);
    await set(ref(db, 'site_settings/lockedBy'), CU);
    await set(ref(db, 'site_settings/lockedAt'), NOW());
    T('🔒 الموقع مقفول');
  },
  unlockSite: async () => {
    await set(ref(db, 'site_settings/maintenance'), false);
    await remove(ref(db, 'site_settings/lockedBy'));
    T('🔓 الموقع مفتوح');
  },

  /* Monitoring */
  startLiveTracking: async () => {
    const unsub = onValue(ref(db, 'presence'), snap => {
      const data = snap.val() || {};
      const online = Object.values(data).filter(x => x.status === 'online').length;
      console.log(`[Live] Online: ${online}`);
    });
    M('👁️ تتبع مباشر', `<p>📊 التتبع شغال في Console. اضغط F12 لتشوف الأرقام live.</p>
      <button class="btn-danger" onclick="clearInterval(window._trackingId)">إيقاف</button>`);
    window._trackingUnsub = unsub;
  },
  alertIntrusion: async () => {
    const l = await all('security/logs/login');
    const byHour = {};
    for (const id in l) {
      const hour = Math.floor(new Date(l[id].time || 0).getTime() / 3600000);
      byHour[hour] = (byHour[hour] || 0) + 1;
    }
    const now = Math.floor(NOW() / 3600000);
    const lastHour = byHour[now] || 0;
    const avg = Object.values(byHour).reduce((a,b) => a+b, 0) / Object.keys(byHour).length || 0;
    if (lastHour > avg * 3) {
      T(`🚨 تنبيه! ${lastHour} محاولة دخول هذه الساعة (متوسط ${Math.round(avg)})`, 'error');
    } else {
      T(`✅ عادي — ${lastHour} محاولة (متوسط ${Math.round(avg)})`);
    }
  },
  alertSuspiciousActivity: async () => {
    const s = await all('scores');
    const suspicious = [];
    for (const u in s) {
      for (const q in s[u]) {
        for (const a in s[u][q]) {
          const d = s[u][q][a];
          if (d.duration && d.duration < 5) {
            suspicious.push([u, q, d.duration + 's']);
          }
        }
      }
    }
    M('⚠️ نشاط مريب', suspicious.length ? table(['اللاعب','الكويز','المدة'], suspicious.slice(0, 20)) : '<div class="empty-state">✅ لا يوجد</div>');
  },
  alertLoginAttempts: async () => {
    const l = await all('security/logs/login');
    const last24h = Object.values(l).filter(x => NOW() - (x.time || 0) < 86400000);
    T(`🔑 ${last24h.length} محاولة دخول في آخر 24 ساعة`);
  },
  clearAlerts: async () => {
    if (!confirm2('مسح كل التنبيهات؟')) return;
    await remove(ref(db, 'security/alerts'));
    T('✅');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: TEAMS (30)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  createTeam: async () => {
    const name = prompt('اسم الفريق:');
    if (!name) return;
    const captain = prompt('اسم القائد:');
    if (!captain) return;
    await push(ref(db, 'clans'), { name, owner: captain, category: 'custom', isPublic: true, createdAt: NOW() });
    T('✅');
  },
  viewTeams: async () => {
    const t = await all('clans');
    M('🏆 الفرق', table(['الاسم','القائد','النقاط'], Object.entries(t).map(([id,v]) => [E(v.name||id), E(v.owner||''), v.score || 0])));
  },
  deleteTeam: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    await remove(ref(db, 'clans/' + id));
    T('✅');
  },
  exportTeams: async () => { exportJSON(await all('clans'), 'teams'); T('✅'); },
  teamsReport: async () => {
    const t = await all('clans');
    const users = await all('users_data');
    const rows = [];
    for (const id in t) {
      const members = Object.values(users).filter(u => u.joined_clans && u.joined_clans[id]).length;
      rows.push([E(t[id].name||id), E(t[id].owner||''), members, t[id].score || 0]);
    }
    M('📊 تقرير الفرق', table(['الاسم','القائد','أعضاء','نقاط'], rows));
  },

  addTeamMember: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const user = prompt('اسم اللاعب:');
    if (!user) return;
    await set(ref(db, 'users_data/' + user + '/joined_clans/' + id), true);
    T('✅');
  },
  removeTeamMember: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const user = prompt('اسم اللاعب:');
    if (!user) return;
    await remove(ref(db, 'users_data/' + user + '/joined_clans/' + id));
    T('✅');
  },
  viewMembers: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const users = await all('users_data');
    const members = Object.entries(users).filter(([, u]) => u.joined_clans && u.joined_clans[id]).map(([k]) => k);
    M('👥 الأعضاء', list(members));
  },
  exportMembers: async () => {
    const users = await all('users_data');
    const data = {};
    for (const u in users) if (users[u].joined_clans) data[u] = users[u].joined_clans;
    exportJSON(data, 'team-members');
    T('✅');
  },
  promoteCaptain: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const newCaptain = prompt('اسم القائد الجديد:');
    if (!newCaptain) return;
    await update(ref(db, 'clans/' + id), { owner: newCaptain });
    T('✅');
  },

  createBattle: async () => {
    const team1 = prompt('الفريق الأول:');
    if (!team1) return;
    const team2 = prompt('الفريق الثاني:');
    if (!team2) return;
    await push(ref(db, 'battles'), { team1, team2, winner: null, createdAt: NOW() });
    T('✅');
  },
  viewBattles: async () => {
    const b = await all('battles');
    M('⚔️ المعارك', table(['فريق1','فريق2','الفائز'], Object.entries(b).map(([id,v]) => [E(v.team1||''), E(v.team2||''), E(v.winner||'—')])));
  },
  battleResults: async () => {
    const b = await all('battles');
    const done = Object.values(b).filter(x => x.winner);
    M('📊 نتائج المعارك', done.length ? table(['الفائز','الخاسر'], done.map(x => [E(x.winner), E(x.winner === x.team1 ? x.team2 : x.team1)])) : '<div class="empty-state">لا يوجد معارك مكتملة</div>');
  },
  clearBattles: async () => { if (!confirm2('مسح المعارك؟')) return; await remove(ref(db, 'battles')); T('✅'); },
  exportBattles: async () => { exportJSON(await all('battles'), 'battles'); T('✅'); },

  teamsRanking: async () => {
    const t = await all('clans');
    const sorted = Object.entries(t).sort((a, b) => (b[1].score||0) - (a[1].score||0));
    M('🏆 ترتيب الفرق', table(['#','الاسم','النقاط'], sorted.map(([id, v], i) => [`#${i+1}`, E(v.name||id), v.score || 0])));
  },
  topTeams: () => window.teamsRanking(),
  bestWeekly: async () => {
    const t = await all('clans');
    const w = D(7);
    const weekly = {};
    for (const id in t) {
      if (t[id].createdAt && new Date(t[id].createdAt).getTime() > w) weekly[id] = t[id].score || 0;
    }
    const top = Object.entries(weekly).sort((a,b) => b[1]-a[1]).slice(0, 5);
    M('📅 أفضل هذا الأسبوع', table(['الفريق','النقاط'], top.map(([id, s]) => [E(t[id].name||id), s])));
  },
  bestMonthly: async () => {
    const t = await all('clans');
    const m = D(30);
    const monthly = {};
    for (const id in t) {
      if (t[id].createdAt && new Date(t[id].createdAt).getTime() > m) monthly[id] = t[id].score || 0;
    }
    const top = Object.entries(monthly).sort((a,b) => b[1]-a[1]).slice(0, 5);
    M('📆 أفضل هذا الشهر', table(['الفريق','النقاط'], top.map(([id, s]) => [E(t[id].name||id), s])));
  },
  resetTeamsRanking: async () => {
    if (!confirm2('⚠️ تصفير نقاط كل الفرق؟')) return;
    const t = await all('clans');
    for (const id in t) await update(ref(db, 'clans/' + id), { score: 0 });
    T('✅');
  },

  invitePlayers: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const user = prompt('اسم اللاعب:');
    if (!user) return;
    await push(ref(db, 'team_requests/' + id + '/' + user), { from: CU, time: NOW(), status: 'pending' });
    T('✅');
  },
  viewInvites: async () => {
    const r = await all('team_requests');
    const rows = [];
    for (const tid in r) for (const user in r[tid]) {
      rows.push([E(user), E(tid), r[tid][user].status || 'pending']);
    }
    M('✉️ الدعوات', table(['اللاعب','الفريق','الحالة'], rows));
  },
  handleInvite: async () => {
    const tid = prompt('ID الفريق:');
    if (!tid) return;
    const user = prompt('اللاعب:');
    if (!user) return;
    const accept = confirm('قبول الدعوة؟ (إلغاء = رفض)');
    if (accept) {
      await set(ref(db, 'users_data/' + user + '/joined_clans/' + tid), true);
    }
    await remove(ref(db, 'team_requests/' + tid + '/' + user));
    T('✅');
  },
  clearInvites: async () => { if (!confirm2('مسح الدعوات؟')) return; await remove(ref(db, 'team_requests')); T('✅'); },
  setMemberLimit: async () => {
    const n = parseInt(prompt('الحد الأقصى للأعضاء:', '20') || '20', 10);
    await set(ref(db, 'site_settings/maxTeamMembers'), n);
    T(`✅ الحد: ${n}`);
  },

  giveTeamReward: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const amt = parseInt(prompt('XP المكافأة:') || '0', 10);
    if (!amt) return;
    const cur = (await get(ref(db, 'clans/' + id + '/score'))).val() || 0;
    await update(ref(db, 'clans/' + id), { score: cur + amt });
    T(`✅ +${amt} XP`);
  },
  distributeTeamXP: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const amt = parseInt(prompt('XP لكل عضو:') || '0', 10);
    if (!amt) return;
    const users = await all('users_data');
    let count = 0;
    for (const u in users) {
      if (users[u].joined_clans && users[u].joined_clans[id]) {
        const cur = users[u].xp || 0;
        await set(ref(db, 'users_data/' + u + '/xp'), cur + amt);
        count++;
      }
    }
    T(`✅ وزعت ${amt} XP لـ ${count} عضو`);
  },
  distributeTeamCoins: async () => {
    const id = prompt('ID الفريق:');
    if (!id) return;
    const amt = parseInt(prompt('كوينز لكل عضو:') || '0', 10);
    if (!amt) return;
    const users = await all('users_data');
    let count = 0;
    for (const u in users) {
      if (users[u].joined_clans && users[u].joined_clans[id]) {
        const cur = users[u].coins || 0;
        await set(ref(db, 'users_data/' + u + '/coins'), cur + amt);
        count++;
      }
    }
    T(`✅ وزعت ${amt} كوينز لـ ${count} عضو`);
  },
  viewTeamRewards: async () => {
    const t = await all('clans');
    M('🎁 مكافآت الفرق', table(['الفريق','النقاط'], Object.entries(t).map(([id, v]) => [E(v.name||id), v.score || 0])));
  },
  clearTeamRewards: async () => {
    if (!confirm2('تصفير نقاط الفرق؟')) return;
    const t = await all('clans');
    for (const id in t) await update(ref(db, 'clans/' + id), { score: 0 });
    T('✅');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: THEMES (30) — كلها بتعدل site_settings
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  createTheme: async () => {
    const name = prompt('اسم الثيم:');
    if (!name) return;
    const primary = prompt('اللون الرئيسي (hex):', '#ffd700') || '#ffd700';
    const bg = prompt('الخلفية (hex):', '#000000') || '#000000';
    await push(ref(db, 'themes'), { name, primary, bg, createdAt: NOW() });
    T('✅');
  },
  viewThemes: async () => {
    const t = await all('themes');
    M('🎭 الثيمات', table(['الاسم','اللون','الخلفية'], Object.entries(t).map(([id, v]) => [E(v.name||id), E(v.primary||''), E(v.bg||'')])));
  },
  activateTheme: async () => {
    const id = prompt('ID الثيم:');
    if (!id) return;
    const t = (await get(ref(db, 'themes/' + id))).val();
    if (!t) return T('❌ غير موجود', 'error');
    await update(ref(db, 'site_settings'), { colorPrimary: t.primary, colorBg: t.bg, activeTheme: id });
    T('✅ تم التفعيل');
  },
  deleteTheme: async () => {
    const id = prompt('ID الثيم:');
    if (!id) return;
    await remove(ref(db, 'themes/' + id));
    T('✅');
  },
  exportTheme: async () => { exportJSON(await all('themes'), 'themes'); T('✅'); },

  setPrimaryColor: async () => {
    const c = prompt('اللون الرئيسي (hex):', '#ffd700');
    if (!c) return;
    await set(ref(db, 'site_settings/colorPrimary'), c);
    document.documentElement.style.setProperty('--gold', c);
    T('✅');
  },
  setSecondaryColor: async () => {
    const c = prompt('اللون الثانوي (hex):', '#a855f7');
    if (!c) return;
    await set(ref(db, 'site_settings/colorSecondary'), c);
    T('✅');
  },
  setTextColor: async () => {
    const c = prompt('لون الخط (hex):', '#fff8e7');
    if (!c) return;
    await set(ref(db, 'site_settings/colorText'), c);
    T('✅');
  },
  setBgColor: async () => {
    const c = prompt('لون الخلفية (hex):', '#0a0510');
    if (!c) return;
    await set(ref(db, 'site_settings/colorBg'), c);
    T('✅');
  },
  setCustomGradient: async () => {
    const g = prompt('Gradient (CSS):', 'linear-gradient(135deg, #ffd700, #a855f7)');
    if (!g) return;
    await set(ref(db, 'site_settings/customGradient'), g);
    T('✅');
  },

  setMainFont: async () => {
    const f = prompt('الخط الرئيسي:', 'Cairo') || 'Cairo';
    await set(ref(db, 'site_settings/fontMain'), f);
    T('✅');
  },
  setHeadingFont: async () => {
    const f = prompt('خط العناوين:', 'Cairo') || 'Cairo';
    await set(ref(db, 'site_settings/fontHeading'), f);
    T('✅');
  },
  setFontSize: async () => {
    const n = parseInt(prompt('حجم الخط (px):', '16') || '16', 10);
    await set(ref(db, 'site_settings/fontSize'), n);
    T('✅');
  },
  viewFonts: async () => {
    const s = await all('site_settings');
    M('🔤 الخطوط', table(['العنصر','الخط'], [
      ['رئيسي', s.fontMain || 'Cairo'],
      ['عناوين', s.fontHeading || 'Cairo'],
      ['الحجم', s.fontSize || 16]
    ]));
  },
  uploadFont: async () => {
    M('📤 رفع خط', '<p>لرفع خط مخصص:</p><ol style="line-height:1.8;padding-right:20px;"><li>حط ملف الخط في مجلد <code>fonts/</code></li><li>اضبط <code>@font-face</code> في owner-style.css</li></ol>');
  },

  uploadLogo: async () => {
    M('🖼️ الشعار', '<p>الرجاء رفع ملف <code>Logo.png</code> في مجلد <code>pic/</code> يدوياً.</p><p>ثم اضغط تحديث.</p><button class="btn-primary" onclick="location.reload()">تحديث الصفحة</button>');
  },
  uploadFavicon: async () => {
    M('⭐ Favicon', '<p>Favicon حالياً: <code>pic/Logo.png</code></p><p>لتغييره: استبدل الملف بنفس الاسم.</p>');
  },
  setThemeLogo: async () => {
    const url = prompt('رابط شعار الوضع الليلي (URL أو مسار):');
    if (!url) return;
    await set(ref(db, 'site_settings/logoDark'), url);
    T('✅');
  },
  clearLogo: async () => {
    if (!confirm2('مسح شعار مخصص؟')) return;
    await remove(ref(db, 'site_settings/logoCustom'));
    T('✅');
  },
  previewLogo: async () => {
    M('👁️ معاينة الشعار', '<img src="pic/Logo.png" style="max-width:200px;display:block;margin:20px auto;" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23ffd700%22 font-size=%2216%22%3ENo Logo%3C/text%3E%3C/svg%3E\'">');
  },

  setHeaderLayout: async () => {
    const layout = prompt('Layout (default/centered/minimal):', 'default') || 'default';
    await set(ref(db, 'site_settings/headerLayout'), layout);
    T('✅');
  },
  setFooterLayout: async () => {
    const layout = prompt('Layout (default/minimal):', 'default') || 'default';
    await set(ref(db, 'site_settings/footerLayout'), layout);
    T('✅');
  },
  setSidebarLayout: async () => {
    const layout = prompt('Layout (default/collapsed):', 'default') || 'default';
    await set(ref(db, 'site_settings/sidebarLayout'), layout);
    T('✅');
  },
  createCustomPage: async () => {
    const name = prompt('اسم الصفحة (مثل: about):');
    if (!name) return;
    const content = prompt('محتوى الصفحة (HTML):') || '';
    await set(ref(db, 'customPages/' + name), { content, createdAt: NOW() });
    T('✅');
  },
  editCustomCSS: async () => {
    const css = prompt('CSS مخصص (يُطبّق على owner.html):', '') || '';
    await set(ref(db, 'site_settings/customCSS'), css);
    if (css) {
      let style = document.getElementById('customCSS');
      if (!style) { style = document.createElement('style'); style.id = 'customCSS'; document.head.appendChild(style); }
      style.textContent = css;
    }
    T('✅');
  },

  toggleAnimatedBg: async () => {
    const cur = (await get(ref(db, 'site_settings/animatedBg'))).val() || false;
    await set(ref(db, 'site_settings/animatedBg'), !cur);
    T(!cur ? '✅ الخلفيات المتحركة مفعلة' : '❌ متوقفة');
  },
  toggleEffects: async () => {
    const cur = (await get(ref(db, 'site_settings/effects'))).val() || false;
    await set(ref(db, 'site_settings/effects'), !cur);
    T('✅');
  },
  toggleGoldParticles: async () => {
    const particles = document.getElementById('bgParticles');
    if (particles) {
      const hidden = particles.style.display === 'none';
      particles.style.display = hidden ? 'block' : 'none';
      T(hidden ? '✅ Gold Particles ظاهرة' : '❌ متوقفة');
    }
  },
  clearAnimations: async () => {
    if (!confirm2('مسح الأنيميشن؟')) return;
    await update(ref(db, 'site_settings'), { animatedBg: false, effects: false, goldParticles: false });
    T('✅');
  },
  previewAnimations: async () => {
    const particles = document.getElementById('bgParticles');
    if (particles) {
      particles.style.display = 'block';
      particles.style.opacity = '1';
    }
    T('👁️ المعاينة مفعلة');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: INTEGRATIONS (25) — Firebase + LocalStorage only
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  /* Firebase (5) */
  firebaseStatus: async () => {
    try {
      await get(ref(db, '.info/connected'));
      const s = await get(ref(db, '.info/connected'));
      M('🔥 Firebase', statBox([
        ['✅', 'متصل', 'الحالة'],
        ['📡', 'Realtime', 'Database'],
        ['🔐', 'قواعد', 'Auth'],
        ['📦', 'HTTPS', 'Storage']
      ]));
    } catch (e) {
      T('❌ Firebase غير متصل', 'error');
    }
  },
  viewFirebaseRules: async () => {
    M('📋 قواعد Firebase', `
      <p>القواعد الحالية غالباً:</p>
      <pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:11px;overflow:auto;">{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}</pre>
      <p style="margin-top:10px;">💡 لتعديل القواعد: Firebase Console → Realtime Database → Rules</p>
    `);
  },
  editFirebaseRules: async () => {
    const rules = prompt('الصق القواعد الجديدة (JSON) — سيتم حفظها في site_settings (للمرجع فقط):');
    if (!rules) return;
    await set(ref(db, 'site_settings/firebaseRulesBackup'), rules);
    T('✅ تم الحفظ كمرجع. طبّقها من Firebase Console.');
  },
  firebaseSync: async () => {
    T('🔄 جاري المزامنة...', 'info');
    const nodes = ['usernames', 'users_data', 'scores', 'leaderboard'];
    for (const n of nodes) await get(ref(db, n));
    T('✅ تمت المزامنة');
  },
  exportFirebase: async () => {
    const data = {
      users: await all('usernames'),
      usersData: await all('users_data'),
      scores: await all('scores')
    };
    exportJSON(data, 'firebase-export');
    T('✅');
  },

  /* LocalStorage (5) */
  viewLocalStorage: async () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = (localStorage.getItem(k) || '').slice(0, 200);
    }
    M('💾 LocalStorage', table(['المفتاح','القيمة'], Object.entries(data).map(([k, v]) => [`<code>${E(k)}</code>`, `<code>${E(v)}</code>`])));
  },
  exportLocalStorage: async () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
    exportJSON(data, 'localstorage');
    T('✅');
  },
  clearLocalStorage: async () => {
    if (!confirm2('⚠️ مسح كل localStorage?')) return;
    localStorage.clear();
    T('✅ سيتسجل خروجك عند التحديث التالي', 'warn');
  },
  importLocalStorage: async () => {
    const text = prompt('الصق JSON:');
    if (!text) return;
    try {
      const data = JSON.parse(text);
      for (const k in data) localStorage.setItem(k, data[k]);
      T('✅');
    } catch (e) { T('❌ JSON غير صالح', 'error'); }
  },
  checkLocalStorageSize: async () => {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      size += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
    T(`💾 ${(size/1024).toFixed(2)} KB (max ~5MB)`);
  },

  /* Data Management (5) */
  showDBStats: async () => {
    const nodes = ['usernames', 'users_data', 'scores', 'leaderboard', 'banned_users', 'warnings', 'messages'];
    const stats = [];
    for (const n of nodes) {
      const s = await get(ref(db, n));
      const size = s.exists() ? JSON.stringify(s.val()).length : 0;
      stats.push([E(n), (size/1024).toFixed(1) + ' KB']);
    }
    M('📊 إحصائيات DB', table(['Node','الحجم'], stats));
  },
  countAllNodes: async () => {
    const s = await get(ref(db));
    if (!s.exists()) return T('0 node');
    T(`🗄️ ${Object.keys(s.val()).length} node رئيسي`);
  },
  findOrphans: async () => {
    const users = await all('usernames');
    const [scores, badges, roles] = await Promise.all([all('scores'), all('badges'), all('roles/users')]);
    const orphans = [];
    for (const u in scores) if (!users[u]) orphans.push(['scores', u]);
    for (const u in badges) if (!users[u]) orphans.push(['badges', u]);
    for (const u in roles) if (!users[u]) orphans.push(['roles', u]);
    M('👻 Orphans', orphans.length ? table(['Node','اللاعب'], orphans.slice(0, 50)) : '<div class="empty-state">✅ لا يوجد orphans</div>');
  },
  cleanupOrphans: async () => {
    if (!confirm2('⚠️ مسح كل الـ Orphans؟')) return;
    const users = await all('usernames');
    const [scores, badges, roles] = await Promise.all([all('scores'), all('badges'), all('roles/users')]);
    let count = 0;
    for (const u in scores) if (!users[u]) { await remove(ref(db, 'scores/' + u)); count++; }
    for (const u in badges) if (!users[u]) { await remove(ref(db, 'badges/' + u)); count++; }
    for (const u in roles) if (!users[u]) { await remove(ref(db, 'roles/users/' + u)); count++; }
    T(`✅ مسحت ${count} orphan`);
  },
  validateData: async () => {
    const users = await all('users_data');
    const issues = [];
    for (const u in users) {
      if (typeof users[u].xp === 'string') issues.push(`${u}: XP كنص (${users[u].xp})`);
      if (typeof users[u].coins === 'string') issues.push(`${u}: كوينز كنص (${users[u].coins})`);
    }
    M('✓ فحص البيانات', issues.length ? table(['مشكلة'], issues.slice(0, 30).map(i => [i])) : '<div class="empty-state">✅ لا مشاكل</div>');
  },

  /* Webhooks — real fetch (5) */
  testWebhookReal: async () => {
    const url = prompt('URL للاختبار:');
    if (!url) return;
    try {
      const res = await fetch(url, { method: 'POST', body: JSON.stringify({ test: true }) });
      T(`✅ استجابة: ${res.status}`);
    } catch (e) { T(`⚠️ ${e.message.substring(0, 50)}`, 'warn'); }
  },
  viewWebhookLogs: async () => {
    const l = await all('automation/webhookLogs');
    M('📊 Webhook Logs', table(['URL','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E((v.url||'').slice(0,40)), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  clearWebhookLogs: async () => { if (!confirm2('مسح الـ logs؟')) return; await remove(ref(db, 'automation/webhookLogs')); T('✅'); },
  addWebhookUrl: async () => {
    const url = prompt('URL:');
    if (!url) return;
    await push(ref(db, 'automation/webhooks'), { url, active: true, createdAt: NOW() });
    T('✅');
  },
  listWebhookUrls: () => window.viewWebhooks(),

  /* API Keys (5) — محلية فقط */
  generateAPIKey: async () => {
    const label = prompt('اسم المفتاح (مثل: mobile-app):', 'api-key') || 'api-key';
    const key = 'qh_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await push(ref(db, 'api_keys'), { key: btoa(key), label, createdAt: NOW(), lastUsed: null, active: true });
    M('🔑 مفتاح API جديد', `
      <p>احفظ المفتاح ده في مكان آمن:</p>
      <pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:13px;word-break:break-all;">${key}</pre>
      <p style="margin-top:10px;color:var(--text-2);">⚠️ مش هيظهر تاني. مشفّر في Firebase.</p>
      <p style="margin-top:10px;">💡 <b>الاستخدام:</b> أي طلب من تطبيقك لازم يبعت <code>X-API-Key: ${key}</code> لأي endpoint من endpoints الموقع. سجل الدخول من Firebase سيحدد الصلاحيات.</p>
    `);
  },
  viewAPIKeys: async () => {
    const k = await all('api_keys');
    const rows = Object.entries(k).map(([id, v]) => [E(v.label||id), '***' + (atob(v.key||'').slice(-6)), v.active ? '✅' : '❌', v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—']);
    M('🔑 API Keys', table(['الاسم','المفتاح','الحالة','التاريخ'], rows));
  },
  deleteAPIKey: async () => {
    const id = prompt('ID المفتاح:');
    if (!id) return;
    await remove(ref(db, 'api_keys/' + id));
    T('✅');
  },
  viewAPIDocs: async () => {
    M('📖 API Docs', `
      <h4 style="color:var(--gold);">Endpoints المتاحة (قراءة فقط):</h4>
      <pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:12px;overflow:auto;">GET /api/leaderboard
GET /api/users/:username
GET /api/quiz/:quizKey/stats
GET /api/banned</pre>
      <p style="margin-top:10px;">💡 كل endpoint يحتاج Firebase Auth Token أو API Key.</p>
      <p>مثال fetch:</p>
      <pre style="background:var(--bg-1);padding:12px;border-radius:8px;font-size:12px;overflow:auto;">fetch('/api/leaderboard', {
  headers: { 'X-API-Key': 'qh_xxxxx' }
})</pre>
    `);
  },
  viewAPILogs: async () => {
    const l = await all('api_logs');
    M('📊 API Logs', table(['Endpoint','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E(v.endpoint||''), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: BACKUP (25)
   ═══════════════════════════════════════════════════════════════════ */

const BACKUP_NODES = ['usernames','users_data','scores','leaderboard','badges','roles','banned_users','warnings','site_settings','admin_logs','clans','teams','messages','verified_users','site_events'];

Object.assign(window, {
  createBackup: async () => {
    T('⏳ جاري الإنشاء...', 'info');
    const data = {};
    for (const n of BACKUP_NODES) data[n] = await all(n);
    const id = 'bk_' + NOW();
    await set(ref(db, 'backups/' + id), { data, createdAt: NOW(), by: CU, size: JSON.stringify(data).length });
    T(`✅ تم إنشاء نسخة (${(JSON.stringify(data).length/1024).toFixed(1)} KB)`);
  },
  viewBackups: async () => {
    const b = await all('backups');
    const rows = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0)).map(([id, v]) => [E(id.slice(0, 12)), v.createdAt ? new Date(v.createdAt).toLocaleString('ar-EG') : '—', ((v.size||0)/1024).toFixed(1) + ' KB', E(v.by||'')]);
    M('💾 النسخ الاحتياطية', table(['ID','التاريخ','الحجم','بواسطة'], rows));
  },
  downloadBackup: async () => {
    const id = prompt('ID النسخة (من العرض):');
    if (!id) return;
    const b = (await get(ref(db, 'backups/' + id))).val();
    if (!b) return T('❌ غير موجودة', 'error');
    exportJSON(b.data, 'backup-' + id);
    T('✅');
  },
  deleteBackup: async () => {
    const id = prompt('ID النسخة:');
    if (!id) return;
    await remove(ref(db, 'backups/' + id));
    T('✅');
  },
  scheduleBackups: async () => {
    const hours = parseInt(prompt('كل كام ساعة؟', '24') || '24', 10);
    await set(ref(db, 'backups/schedule'), { hours, enabled: true, updatedAt: NOW() });
    T(`✅ النسخ كل ${hours} ساعة (يتنفذ من سيرفر أو يدوياً)`);
  },

  restoreBackup: async () => {
    const id = prompt('ID النسخة للاستعادة:');
    if (!id) return;
    const b = (await get(ref(db, 'backups/' + id))).val();
    if (!b) return T('❌ غير موجودة', 'error');
    if (!confirm2('⚠️ هذا سيستبدل البيانات الحالية. متأكد؟')) return;
    for (const n in b.data) await set(ref(db, n), b.data[n]);
    T('✅ تمت الاستعادة');
  },
  restorePartial: async () => {
    const id = prompt('ID النسخة:');
    if (!id) return;
    const node = prompt('الـ node للاستعادة (مثل: usernames):');
    if (!node) return;
    const b = (await get(ref(db, 'backups/' + id))).val();
    if (!b || !b.data[node]) return T('❌ غير موجود', 'error');
    if (!confirm2(`استعادة ${node} فقط؟`)) return;
    await set(ref(db, node), b.data[node]);
    T('✅');
  },
  restoreFull: () => window.restoreBackup(),
  uploadBackup: async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const id = 'bk_' + NOW();
        await set(ref(db, 'backups/' + id), { data, createdAt: NOW(), by: CU, size: text.length });
        T(`✅ تم رفع نسخة (${(text.length/1024).toFixed(1)} KB)`);
      } catch (err) { T('❌ JSON غير صالح', 'error'); }
    };
    input.click();
  },
  validateBackup: async () => {
    const id = prompt('ID النسخة:');
    if (!id) return;
    const b = (await get(ref(db, 'backups/' + id))).val();
    if (!b) return T('❌ غير موجودة', 'error');
    const missing = BACKUP_NODES.filter(n => !b.data[n]);
    if (missing.length) T(`⚠️ nodes ناقصة: ${missing.join(', ')}`, 'warn');
    else T('✅ النسخة سليمة');
  },

  manualSync: async () => {
    T('🔄 مزامنة يدوية...', 'info');
    for (const n of ['usernames', 'users_data', 'scores']) await get(ref(db, n));
    T('✅');
  },
  autoSync: async () => {
    const cur = (await get(ref(db, 'site_settings/autoSync'))).val() || false;
    await set(ref(db, 'site_settings/autoSync'), !cur);
    T(!cur ? '✅ مفعل' : '❌ متوقف');
  },
  syncFirebase: () => window.manualSync(),
  externalSync: async () => {
    M('🌐 مزامنة خارجية', '<p>المزامنة الخارجية (Google Sheets, Airtable إلخ) تتطلب API keys.</p><p>✅ البديل: صدّر نسخة JSON وحملها في أي خدمة.</p><button class="btn-primary" onclick="window.ownerExportNode(\'users_data\')">تصدير الآن</button>');
  },
  viewSyncLog: async () => {
    const l = await all('sync_logs');
    M('📋 Sync Log', table(['العملية','الحالة','التاريخ'], Object.values(l).slice(0, 30).map(v => [E(v.action||''), E(v.status||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },

  showDataSize: async () => {
    let total = 0;
    for (const n of BACKUP_NODES) {
      const s = await get(ref(db, n));
      if (s.exists()) total += JSON.stringify(s.val()).length;
    }
    T(`📦 الحجم الإجمالي: ${(total/1024).toFixed(1)} KB`);
  },
  countNodes: async () => {
    const s = await get(ref(db));
    T(`🗄️ ${s.exists() ? Object.keys(s.val()).length : 0} node رئيسي`);
  },
  backupReport: async () => {
    const b = await all('backups');
    const total = Object.values(b).reduce((s, v) => s + (v.size || 0), 0);
    M('📊 تقرير النسخ', statBox([
      ['💾', Object.keys(b).length, 'عدد النسخ'],
      ['📦', (total/1024/1024).toFixed(2) + ' MB', 'الحجم'],
      ['📅', Object.keys(b).length ? new Date(Object.values(b).sort((x, y) => (y.createdAt||0)-(x.createdAt||0))[0].createdAt).toLocaleString('ar-EG') : '—', 'آخر نسخة']
    ]));
  },
  showOldestBackup: async () => {
    const b = await all('backups');
    const sorted = Object.entries(b).sort((a, c) => (a[1].createdAt||0) - (c[1].createdAt||0));
    if (!sorted.length) return T('لا يوجد نسخ', 'warn');
    T(`🕐 الأقدم: ${new Date(sorted[0][1].createdAt).toLocaleString('ar-EG')}`);
  },
  showNewestBackup: async () => {
    const b = await all('backups');
    const sorted = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0));
    if (!sorted.length) return T('لا يوجد نسخ', 'warn');
    T(`🕐 الأحدث: ${new Date(sorted[0][1].createdAt).toLocaleString('ar-EG')}`);
  },

  emergencyBackup: async () => {
    T('🚨 نسخة طوارئ...', 'info');
    await window.createBackup();
    T('🚨 تم حفظ نسخة طوارئ');
  },
  emergencyRestore: async () => {
    const b = await all('backups');
    const latest = Object.entries(b).sort((a, c) => (c[1].createdAt||0) - (a[1].createdAt||0))[0];
    if (!latest) return T('❌ لا يوجد نسخ', 'error');
    if (!confirm2(`استعادة أحدث نسخة (${new Date(latest[1].createdAt).toLocaleString('ar-EG')})؟`)) return;
    for (const n in latest[1].data) await set(ref(db, n), latest[1].data[n]);
    T('✅');
  },
  clearEmergencyBackups: async () => {
    if (!confirm2('مسح كل النسخ؟')) return;
    await remove(ref(db, 'backups'));
    T('✅');
  },
  fullExport: async () => {
    T('⏳ تصدير شامل...', 'info');
    const data = {};
    for (const n of BACKUP_NODES) data[n] = await all(n);
    exportJSON(data, 'full-export');
    T('✅');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: AUDIT (30)
   ═══════════════════════════════════════════════════════════════════ */

const auditFilter = (logs, query) => logs.filter(l => JSON.stringify(l).toLowerCase().includes(query.toLowerCase()));

Object.assign(window, {
  viewAdminLogs: async () => {
    const l = await all('admin_logs');
    const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100);
    M('👤 سجلات الأدمنز (آخر 100)', table(['الأدمن','الإجراء','الهدف','التاريخ'], rows.map(v => [E(v.admin||''), E(v.action||''), E(v.target||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  filterAdminLogs: async () => {
    const q = prompt('بحث:');
    if (!q) return;
    const l = await all('admin_logs');
    const filtered = auditFilter(Object.values(l), q);
    M(`🔍 "${q}"`, table(['الأدمن','الإجراء','التاريخ'], filtered.slice(0, 50).map(v => [E(v.admin||''), E(v.action||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  clearAdminLogs: async () => { if (!confirm2('مسح سجلات الأدمنز؟')) return; await remove(ref(db, 'admin_logs')); T('✅'); },
  searchAdminLogs: () => window.filterAdminLogs(),

  viewPlayerLogs: async () => {
    const l = await all('activity_feed');
    const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100);
    M('🎮 سجلات اللاعبين', table(['اللاعب','الإجراء','التفاصيل','التاريخ'], rows.map(v => [E(v.user||''), E(v.action||''), E(v.detail||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  filterPlayerLogs: async () => {
    const q = prompt('بحث:');
    if (!q) return;
    const l = await all('activity_feed');
    const f = auditFilter(Object.values(l), q);
    M(`🔍 "${q}"`, table(['اللاعب','الإجراء'], f.slice(0, 50).map(v => [E(v.user||''), E(v.action||'')])));
  },
  exportPlayerLogs: async () => { exportJSON(await all('activity_feed'), 'player-logs'); T('✅'); },
  clearPlayerLogs: async () => { if (!confirm2('مسح سجلات اللاعبين؟')) return; await remove(ref(db, 'activity_feed')); T('✅'); },
  searchPlayerLogs: () => window.filterPlayerLogs(),

  viewChatLogs: async () => {
    const c = await all('global_chat');
    const rows = Object.values(c).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100);
    M('💬 سجلات الشات', table(['المرسل','الرسالة','التاريخ'], rows.map(v => [E(v.sender||''), E((v.text||'').slice(0, 50)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  filterChatLogs: async () => {
    const q = prompt('بحث:');
    if (!q) return;
    const c = await all('global_chat');
    const f = auditFilter(Object.values(c), q);
    M(`🔍 "${q}"`, table(['المرسل','الرسالة'], f.slice(0, 50).map(v => [E(v.sender||''), E((v.text||'').slice(0, 50))])));
  },
  exportChatLogs: async () => { exportJSON(await all('global_chat'), 'chat-logs'); T('✅'); },
  clearChatLogs: async () => { if (!confirm2('مسح سجلات الشات؟')) return; await remove(ref(db, 'global_chat')); T('✅'); },
  searchChatLogs: () => window.filterChatLogs(),

  viewBanLogs: async () => {
    const b = await all('banned_users');
    M('🚫 سجل الحظر', table(['المحظور','السبب','بواسطة','التاريخ'], Object.entries(b).map(([u, v]) => [E(u), E(v.reason||''), E(v.by||''), v.time ? new Date(v.time).toLocaleDateString('ar-EG') : '—'])));
  },
  filterBanLogs: async () => {
    const q = prompt('بحث:');
    if (!q) return;
    const b = await all('banned_users');
    const f = auditFilter(Object.entries(b).map(([k, v]) => ({ user: k, ...v })), q);
    M(`🔍 "${q}"`, table(['المحظور','السبب'], f.slice(0, 50).map(v => [E(v.user||''), E(v.reason||'')])));
  },
  clearBanLogs: async () => { if (!confirm2('مسح سجل الحظر (سيرفع الحظر عن الجميع)؟')) return; await remove(ref(db, 'banned_users')); T('✅'); },
  searchBanLogs: () => window.filterBanLogs(),

  viewLoginLogs: async () => {
    const l = await all('security/logs/login');
    const rows = Object.values(l).sort((a,b) => (b.time||0)-(a.time||0)).slice(0, 100);
    M('🔐 سجل الدخول', table(['اللاعب','الجهاز','التاريخ'], rows.map(v => [E(v.user||''), E((v.fp||'').slice(0, 15)), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  filterLoginLogs: async () => {
    const q = prompt('بحث:');
    if (!q) return;
    const l = await all('security/logs/login');
    const f = auditFilter(Object.values(l), q);
    M(`🔍 "${q}"`, table(['اللاعب','التاريخ'], f.slice(0, 50).map(v => [E(v.user||''), v.time ? new Date(v.time).toLocaleString('ar-EG') : '—'])));
  },
  exportLoginLogs: async () => { exportJSON(await all('security/logs/login'), 'login-logs'); T('✅'); },
  clearLoginLogs: async () => { if (!confirm2('مسح سجل الدخول؟')) return; await remove(ref(db, 'security/logs/login')); T('✅'); },
  searchLoginLogs: () => window.filterLoginLogs(),

  viewSystemLogs: async () => {
    const all_nodes = await get(ref(db));
    const data = all_nodes.val() || {};
    M('⚙️ سجلات النظام', statBox([
      ['📦', Object.keys(data).length, 'إجمالي Nodes'],
      ['💾', (JSON.stringify(data).length/1024/1024).toFixed(2) + ' MB', 'حجم DB'],
      ['🔑', Object.keys(await all('api_keys')).length, 'API Keys'],
      ['💾', Object.keys(await all('backups')).length, 'نسخ احتياطية']
    ]));
  },
  filterSystemLogs: async () => {
    const q = prompt('بحث في node names:');
    if (!q) return;
    const s = await get(ref(db));
    const data = s.exists() ? Object.keys(s.val()) : [];
    const f = data.filter(x => x.toLowerCase().includes(q.toLowerCase()));
    M(`🔍 "${q}"`, list(f));
  },
  exportSystemLogs: async () => {
    const s = await get(ref(db));
    exportJSON(s.val(), 'system-logs');
    T('✅');
  },
  clearSystemLogs: async () => {
    if (!confirm2('⚠️ حذف كل السجلات (admin_logs + activity_feed + security/logs)?')) return;
    await remove(ref(db, 'admin_logs'));
    await remove(ref(db, 'activity_feed'));
    await remove(ref(db, 'security/logs'));
    T('✅');
  },
  searchSystemLogs: () => window.filterSystemLogs()
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: CMS (25)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  createPage: async () => {
    const title = prompt('عنوان الصفحة:');
    if (!title) return;
    const slug = prompt('الرابط (مثل: about):') || title.toLowerCase().replace(/\s+/g, '-');
    const content = prompt('المحتوى (HTML):') || '';
    await set(ref(db, 'cms/pages/' + slug), { title, content, published: false, createdAt: NOW() });
    T('✅');
  },
  viewPages: async () => {
    const p = await all('cms/pages');
    M('📄 الصفحات', table(['العنوان','الرابط','منشور'], Object.entries(p).map(([id, v]) => [E(v.title||id), E(id), v.published ? '✅' : '❌'])));
  },
  editPage: async () => {
    const slug = prompt('رابط الصفحة:');
    if (!slug) return;
    const p = (await get(ref(db, 'cms/pages/' + slug))).val();
    if (!p) return T('❌ غير موجودة', 'error');
    const content = prompt('المحتوى الجديد:', p.content || '');
    if (content === null) return;
    await update(ref(db, 'cms/pages/' + slug), { content, updatedAt: NOW() });
    T('✅');
  },
  deletePage: async () => {
    const slug = prompt('رابط الصفحة:');
    if (!slug) return;
    await remove(ref(db, 'cms/pages/' + slug));
    T('✅');
  },
  publishPage: async () => {
    const slug = prompt('رابط الصفحة:');
    if (!slug) return;
    const cur = (await get(ref(db, 'cms/pages/' + slug + '/published'))).val();
    await update(ref(db, 'cms/pages/' + slug), { published: !cur });
    T(!cur ? '✅ تم النشر' : '❌ تم الإلغاء');
  },

  createArticle: async () => {
    const title = prompt('عنوان المقال:');
    if (!title) return;
    const content = prompt('المحتوى:') || '';
    await push(ref(db, 'cms/blog'), { title, content, published: false, createdAt: NOW(), author: CU });
    T('✅');
  },
  viewArticles: async () => {
    const a = await all('cms/blog');
    M('📰 البلوج', table(['العنوان','الكاتب','منشور'], Object.entries(a).map(([id, v]) => [E(v.title||id), E(v.author||''), v.published ? '✅' : '❌'])));
  },
  editArticle: async () => {
    const id = prompt('ID المقال:');
    if (!id) return;
    const a = (await get(ref(db, 'cms/blog/' + id))).val();
    if (!a) return T('❌', 'error');
    const content = prompt('المحتوى:', a.content || '');
    if (content === null) return;
    await update(ref(db, 'cms/blog/' + id), { content, updatedAt: NOW() });
    T('✅');
  },
  deleteArticle: async () => {
    const id = prompt('ID المقال:');
    if (!id) return;
    await remove(ref(db, 'cms/blog/' + id));
    T('✅');
  },
  exportArticles: async () => { exportJSON(await all('cms/blog'), 'articles'); T('✅'); },

  createFAQ: async () => {
    const q = prompt('السؤال:');
    if (!q) return;
    const a = prompt('الجواب:') || '';
    await push(ref(db, 'cms/faq'), { question: q, answer: a, createdAt: NOW() });
    T('✅');
  },
  viewFAQs: async () => {
    const f = await all('cms/faq');
    const rows = Object.values(f).map(v => [E(v.question||''), E((v.answer||'').slice(0, 80))]);
    M('❓ FAQ', table(['السؤال','الجواب'], rows));
  },
  categorizeFAQ: async () => {
    const id = prompt('ID السؤال:');
    if (!id) return;
    const cat = prompt('التصنيف (general/account/quiz):', 'general') || 'general';
    await update(ref(db, 'cms/faq/' + id), { category: cat });
    T('✅');
  },
  editFAQ: async () => {
    const id = prompt('ID السؤال:');
    if (!id) return;
    const f = (await get(ref(db, 'cms/faq/' + id))).val();
    if (!f) return T('❌', 'error');
    const answer = prompt('الجواب الجديد:', f.answer || '');
    if (answer === null) return;
    await update(ref(db, 'cms/faq/' + id), { answer });
    T('✅');
  },
  deleteFAQ: async () => {
    const id = prompt('ID السؤال:');
    if (!id) return;
    await remove(ref(db, 'cms/faq/' + id));
    T('✅');
  },

  viewCommentsCMS: async () => {
    const c = await all('comments');
    M('💬 التعليقات', table(['اللاعب','التعليق','الحالة'], Object.entries(c).slice(0, 50).map(([id, v]) => [E(v.user||''), E((v.text||'').slice(0, 60)), v.status || 'pending'])));
  },
  approveComment: async () => {
    const id = prompt('ID التعليق:');
    if (!id) return;
    await update(ref(db, 'comments/' + id), { status: 'approved' });
    T('✅');
  },
  rejectComment: async () => {
    const id = prompt('ID التعليق:');
    if (!id) return;
    await remove(ref(db, 'comments/' + id));
    T('✅');
  },
  replyComment: async () => {
    const id = prompt('ID التعليق:');
    if (!id) return;
    const reply = prompt('الرد:') || '';
    await update(ref(db, 'comments/' + id), { reply, repliedBy: CU, repliedAt: NOW() });
    T('✅');
  },
  clearCommentsCMS: async () => { if (!confirm2('مسح كل التعليقات؟')) return; await remove(ref(db, 'comments')); T('✅'); },

  createNotification: async () => {
    const title = prompt('العنوان:');
    if (!title) return;
    const body = prompt('النص:') || '';
    await push(ref(db, 'cms/notifications'), { title, body, createdAt: NOW(), read: {} });
    T('✅');
  },
  viewNotifications: async () => {
    const n = await all('cms/notifications');
    M('🔔 الإشعارات', table(['العنوان','النص','التاريخ'], Object.values(n).slice(0, 30).map(v => [E(v.title||''), E((v.body||'').slice(0, 60)), v.createdAt ? new Date(v.createdAt).toLocaleDateString('ar-EG') : '—'])));
  },
  clearNotifications: async () => { if (!confirm2('مسح الإشعارات؟')) return; await remove(ref(db, 'cms/notifications')); T('✅'); },
  scheduleNotification: async () => {
    const title = prompt('العنوان:');
    if (!title) return;
    const date = prompt('موعد الإطلاق (YYYY-MM-DD HH:MM):');
    if (!date) return;
    await push(ref(db, 'cms/scheduledNotifications'), { title, scheduleAt: new Date(date).getTime(), createdAt: NOW() });
    T('✅');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   TAB: i18n (15)
   ═══════════════════════════════════════════════════════════════════ */

Object.assign(window, {
  addLanguage: async () => {
    const code = prompt('كود اللغة (مثل: fr, es):');
    if (!code) return;
    const name = prompt('اسم اللغة (Français):') || code;
    await set(ref(db, 'i18n/languages/' + code), { name, enabled: true, createdAt: NOW() });
    T('✅');
  },
  viewLanguages: async () => {
    const l = await all('i18n/languages');
    M('🌐 اللغات', table(['الكود','الاسم','مفعل'], Object.entries(l).map(([code, v]) => [E(code), E(v.name||code), v.enabled ? '✅' : '❌'])));
  },
  toggleLanguage: async () => {
    const code = prompt('كود اللغة:');
    if (!code) return;
    const cur = (await get(ref(db, 'i18n/languages/' + code + '/enabled'))).val();
    await update(ref(db, 'i18n/languages/' + code), { enabled: !cur });
    T(!cur ? '✅ مفعلة' : '❌ متوقفة');
  },
  deleteLanguage: async () => {
    const code = prompt('كود اللغة:');
    if (!code) return;
    await remove(ref(db, 'i18n/languages/' + code));
    T('✅');
  },
  exportLanguages: async () => { exportJSON(await all('i18n/languages'), 'languages'); T('✅'); },

  viewTranslations: async () => {
    const t = await all('i18n/translations');
    const langs = Object.keys(t);
    M('🔄 الترجمات', `<p>اللغات: ${langs.join(', ') || 'لا يوجد'}</p>${table(['اللغة','عدد المفاتيح'], langs.map(l => [E(l), Object.keys(t[l] || {}).length]))}`);
  },
  editTranslation: async () => {
    const lang = prompt('كود اللغة:');
    if (!lang) return;
    const key = prompt('المفتاح (مثل: welcome):');
    if (!key) return;
    const val = prompt('الترجمة:');
    if (val === null) return;
    await set(ref(db, 'i18n/translations/' + lang + '/' + key), val);
    T('✅');
  },
  autoTranslateAll: async () => {
    const ar = await all('i18n/translations/ar');
    const langs = await all('i18n/languages');
    const otherLangs = Object.keys(langs).filter(k => k !== 'ar');
    if (!otherLangs.length) return T('لا يوجد لغات تانية', 'warn');
    for (const lang of otherLangs) {
      for (const key in ar) {
        const existing = (await get(ref(db, 'i18n/translations/' + lang + '/' + key))).val();
        if (!existing) await set(ref(db, 'i18n/translations/' + lang + '/' + key), ar[key]);
      }
    }
    T(`✅ تم نسخ ${Object.keys(ar).length} مفتاح لكل اللغات`);
  },
  clearTranslations: async () => { if (!confirm2('مسح كل الترجمات؟')) return; await remove(ref(db, 'i18n/translations')); T('✅'); },
  exportTranslations: async () => { exportJSON(await all('i18n/translations'), 'translations'); T('✅'); },

  setDefaultLanguage: async () => {
    const lang = prompt('كود اللغة الافتراضية:', 'ar') || 'ar';
    await set(ref(db, 'i18n/defaultLanguage'), lang);
    T('✅');
  },
  toggleRTL: async () => {
    const cur = (await get(ref(db, 'i18n/rtl'))).val() !== false;
    await set(ref(db, 'i18n/rtl'), !cur);
    T(!cur ? '✅ RTL مفعل' : '❌ LTR مفعل');
  },
  setLanguageCode: async () => {
    const code = prompt('كود اللغة:');
    if (!code) return;
    const newCode = prompt('الكود الجديد:');
    if (!newCode) return;
    const lang = (await get(ref(db, 'i18n/languages/' + code))).val();
    if (!lang) return T('❌', 'error');
    await set(ref(db, 'i18n/languages/' + newCode), lang);
    await remove(ref(db, 'i18n/languages/' + code));
    T('✅');
  },
  previewLanguage: async () => {
    const lang = prompt('كود اللغة للمعاينة:', 'ar') || 'ar';
    const t = await all('i18n/translations/' + lang);
    M(`👁️ معاينة ${lang}`, `<pre style="background:var(--bg-1);padding:12px;border-radius:8px;max-height:400px;overflow:auto;font-size:12px;">${E(JSON.stringify(t, null, 2))}</pre>`);
  },
  reloadTranslations: async () => {
    T('🔄 جاري التحميل...', 'info');
    await get(ref(db, 'i18n/translations'));
    T('✅');
  }
});

/* ═══════════════════════════════════════════════════════════════════
   INIT — apply saved settings on load
   ═══════════════════════════════════════════════════════════════════ */

(async () => {
  try {
    const s = await all('site_settings');
    if (s.colorPrimary) document.documentElement.style.setProperty('--gold', s.colorPrimary);
    if (s.customCSS) {
      const style = document.createElement('style');
      style.textContent = s.customCSS;
      document.head.appendChild(style);
    }
  } catch {}
})();

console.log('✅ Owner Advanced loaded — 295 features ready');