/* ═══════════════════════════════════════════════════════════════════
   👑 OWNER WORK HUB — شات الإدارة الحي + صندوق رسايل الشغل + الإشعارات
   ═══════════════════════════════════════════════════════════════════
   1) 💬 شات الإدارة: نفس admin_chat/{room} اللي بتكتب فيه لوحات
      الشركاء/المديرين/الأدمنز — فالكلام بيوصلهما ويردوا عليه.
   2) 📬 رسايل الشغل: بيcollect رسايل الشغل اللي بتتبعت للأونر:
      - messages/owner_inbox (رسايل الشركاء والمديرين والبيلدرز)
      - partner_requests/* (ملاحظات سريعة + طلبات اجتماع + تقارير أسبوعية + أفكار + بلاغات)
      - partner_ideas (قديم)
      وبيعرضها في تريدات لكل مُرسِل + رد فوري بيوصل لـ messages/{user}
      (وده نفس المكان اللي بتقرأ منه لوحات الشركاء "الردود من الأونر").
   3) 🔔 إشعارات: توست + صوت + بادج على التاب + عداد في عنوان الصفحة.
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, update, push, onValue, remove, escapeHtml } from './firebase-shared.js';

const CU = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
const esc = (s) => escapeHtml(s ?? '');
const escAttr = (s) => esc(String(s ?? '')).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

/* ═══════════ 🔔 صوت الإشعار (Web Audio — ملفات صفر) ═══════════ */
let _audioCtx = null;
function ping() {
    try {
        if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        [880, 1245].forEach((f, i) => {
            const o = _audioCtx.createOscillator(), g = _audioCtx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            const t0 = _audioCtx.currentTime + i * 0.12;
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
            o.connect(g); g.connect(_audioCtx.destination);
            o.start(t0); o.stop(t0 + 0.25);
        });
    } catch (e) { /* مفيش صوت — مش مشكلة */ }
}

/* ═══════════════════════════════════════════════════════════════════
   💬 الجزء الأول: شات الإدارة الحي (admin_chat)
   ═══════════════════════════════════════════════════════════════════ */
const ADMIN_ROOMS = [
    { key: 'group', emoji: '👥', name: 'الجميع (جماعي)' },
    { key: 'owner', emoji: '👑', name: 'الأونر' },
    { key: 'partner', emoji: '🤝', name: 'الشركاء' },
    { key: 'manager', emoji: '📋', name: 'المديرين' },
    { key: 'tester', emoji: '🧪', name: 'التسترات' },
    { key: 'builder', emoji: '🏗️', name: 'البيلدرز' },
    { key: 'admin', emoji: '🛡️', name: 'الأدمنز' }
];
const ROOMS_BY_KEY = Object.fromEntries(ADMIN_ROOMS.map(r => [r.key, r]));

let activeRoom = null;
const roomListeners = {};   // onValue لكل غرفة (بادجات + إشعارات)
const roomDataCache = {};   // آخر داتا لكل غرفة
const roomSeen = {};        // آخر عدد مشوف بيه (baseline)
const roomNew = {};         // الجديد غير المشوف (للبادج)

window._ownerWorkChatHTML = () => `
  <div class="chat-layout">
    <div class="chat-sidebar">
      <div class="chat-sidebar-title">💬 غرف الإدارة</div>
      <div id="ocRoomsList"></div>
      <div style="margin-top:auto; padding-top:10px; border-top:1px solid var(--border); font-size:11px; color:var(--text-3); line-height:1.8;">
        ⚡ الشات ده مشترك مع لوحات الشركاء والمديرين والأدمنز — أي حد يكتب هتشوفه فورًا وترد عليه.
      </div>
    </div>
    <div class="chat-main">
      <div class="chat-main-header">
        <span id="ocChatHeader">💬 اختر غرفة للبدء</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="ocChatSearch" class="chat-search" placeholder="🔍 بحث في الرسايل..." oninput="window.filterOwnerChat()">
          <button class="chat-stats-btn" onclick="window.ownerChatStats()" title="إحصائيات الغرف">📊</button>
        </div>
      </div>
      <div class="chat-main-messages" id="ocChatMessages">
        <div class="chat-empty"><div class="chat-empty-icon">💬</div><div>اختر غرفة من القائمة عشان تبدأ الشات مع الإدارة</div></div>
      </div>
      <div class="chat-main-input">
        <input type="text" id="ocChatInput" placeholder="اكتب رسالتك كأونر..." disabled onkeypress="if(event.key==='Enter') window.sendOwnerChatMessage()">
        <button id="ocChatSend" onclick="window.sendOwnerChatMessage()" disabled>📤</button>
      </div>
    </div>
  </div>`;

function renderOcRooms() {
    const box = document.getElementById('ocRoomsList');
    if (!box) return;
    box.innerHTML = ADMIN_ROOMS.map(r => `
      <button class="chat-room-item ${activeRoom === r.key ? 'active' : ''}" onclick="window.openOwnerChatRoom('${r.key}')">
        <span class="chat-room-emoji">${r.emoji}</span>
        <span class="chat-room-name">${r.name}</span>
        <span class="chat-room-badge" id="ocRoomBadge-${r.key}" style="display:none;">0</span>
      </button>`).join('');
    // حدّث البادجات المحفوظة
    ADMIN_ROOMS.forEach(r => updateOcRoomBadge(r.key));
}

function updateOcRoomBadge(key) {
    const badge = document.getElementById('ocRoomBadge-' + key);
    if (!badge) return;
    const n = roomNew[key] || 0;
    const total = Object.keys(roomDataCache[key] || {}).length;
    if (n > 0 && activeRoom !== key) { badge.style.display = 'inline-block'; badge.style.background = ''; badge.textContent = n; }
    else if (total > 0 && activeRoom !== key) { badge.style.display = 'inline-block'; badge.style.background = 'rgba(168,85,247,0.35)'; badge.textContent = total; }
    else badge.style.display = 'none';
}

function renderOcMessages(key) {
    const box = document.getElementById('ocChatMessages');
    if (!box || activeRoom !== key) return;
    const data = roomDataCache[key] || {};
    const msgs = Object.entries(data).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
    const qEl = document.getElementById('ocChatSearch');
    const q = qEl ? qEl.value.trim().toLowerCase() : '';
    const filtered = q ? msgs.filter(([, m]) => ((m.text || '') + ' ' + (m.sender || '')).toLowerCase().includes(q)) : msgs;
    if (!filtered.length) {
        box.innerHTML = `<div class="chat-empty"><div class="chat-empty-icon">💬</div><div>${q ? 'مفيش نتايج للبحث' : 'لا توجد رسائل. كن الأول!'}</div></div>`;
        return;
    }
    box.innerHTML = filtered.map(([id, m]) => {
        const isMine = (m.sender || '').toLowerCase() === CU;
        const time = m.time ? new Date(m.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
        return `
          <div class="chat-msg ${isMine ? 'mine' : 'theirs'}" data-id="${id}">
            ${!isMine ? `<div class="chat-msg-sender">👤 ${esc(m.sender || '?')}</div>` : ''}
            <div>${esc(m.text || '')}</div>
            <div class="chat-msg-time"><span>${time}</span><button class="msg-delete" onclick="event.stopPropagation(); window.deleteOwnerChatMsg('${key}', '${id}')" title="حذف">🗑️</button></div>
          </div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
}

window.openOwnerChatRoom = function (key) {
    if (!ROOMS_BY_KEY[key]) return;
    activeRoom = key;
    roomNew[key] = 0;
    renderOcRooms();
    updateNavBadges();
    const r = ROOMS_BY_KEY[key];
    const header = document.getElementById('ocChatHeader');
    const input = document.getElementById('ocChatInput');
    const send = document.getElementById('ocChatSend');
    const search = document.getElementById('ocChatSearch');
    if (header) header.innerHTML = `${r.emoji} شات ${r.name}`;
    if (input) input.disabled = false;
    if (send) send.disabled = false;
    if (search) search.value = '';
    renderOcMessages(key);
};

window.filterOwnerChat = function () { if (activeRoom) renderOcMessages(activeRoom); };

window.sendOwnerChatMessage = async function () {
    if (!activeRoom) return window.toast('اختر غرفة أولاً', 'error');
    const input = document.getElementById('ocChatInput');
    const text = (input.value || '').trim();
    if (!text) return;
    try {
        await push(ref(db, 'admin_chat/' + activeRoom), { sender: CU, text, time: Date.now() });
        input.value = '';
    } catch (e) { window.toast('خطأ: ' + e.message, 'error'); }
};

window.deleteOwnerChatMsg = async function (key, id) {
    try { await remove(ref(db, `admin_chat/${key}/${id}`)); } catch (e) { window.toast('خطأ: ' + e.message, 'error'); }
};

window.ownerChatStats = function () {
    const mt = document.getElementById('modalTitle'), mc = document.getElementById('modalContent'), ov = document.getElementById('modalOverlay');
    if (!mt || !mc || !ov) return;
    mt.textContent = '📊 إحصائيات غرف الشات';
    mc.innerHTML = ADMIN_ROOMS.map(r => {
        const c = Object.keys(roomDataCache[r.key] || {}).length;
        return `<div class="list-item"><span>${r.emoji} ${r.name}</span><b style="color:var(--gold);">${c} رسالة</b></div>`;
    }).join('') || '<div class="empty-state">مفيش داتا</div>';
    ov.classList.add('active');
};

window._ownerChatInit = function () {
    renderOcRooms();
    ADMIN_ROOMS.forEach(r => {
        if (roomListeners[r.key]) return;
        roomListeners[r.key] = onValue(ref(db, 'admin_chat/' + r.key), (snap) => {
            const data = snap.val() || {};
            const count = Object.keys(data).length;
            roomDataCache[r.key] = data;
            const prev = roomSeen[r.key];
            if (prev === undefined) {
                roomSeen[r.key] = count; // baseline أول مرة — من غير إشعارات
            } else if (count > prev) {
                roomSeen[r.key] = count;
                if (activeRoom !== r.key) {
                    roomNew[r.key] = (roomNew[r.key] || 0) + (count - prev);
                    // مين آخر واحد بعت؟
                    const newest = Object.values(data).sort((a, b) => (b.time || 0) - (a.time || 0))[0];
                    if (newest && (newest.sender || '').toLowerCase() !== CU) {
                        window.toast(`💬 رسالة جديدة في شات ${r.name} من ${newest.sender || '?'}`, 'info');
                        ping();
                    }
                }
            }
            updateOcRoomBadge(r.key);
            updateNavBadges();
            if (activeRoom === r.key) renderOcMessages(r.key);
        });
    });
};

/* ═══════════════════════════════════════════════════════════════════
   📬 الجزء الثاني: صندوق رسايل الشغل (owner_inbox + partner_requests)
   ═══════════════════════════════════════════════════════════════════ */
const REQ_TYPES = {
    quick_notes: { icon: '✏️', label: 'ملاحظة سريعة' },
    meeting_requests: { icon: '📅', label: 'طلب اجتماع' },
    weekly_reports: { icon: '📝', label: 'تقرير أسبوعي' },
    ideas: { icon: '💡', label: 'فكرة' },
    bug_reports: { icon: '🐞', label: 'بلاغ مشكلة' },
    event_ideas: { icon: '🎁', label: 'اقتراح فعالية' },
    sponsor_ideas: { icon: '🤝', label: 'اقتراح شريك' }
};

const work = {
    started: false,
    inboxData: {},      // messages/owner_inbox
    reqData: {},        // partner_requests
    ideasData: {},      // partner_ideas
    replyCache: {},     // messages/{user} (ردود الأونر السابقة)
    threads: [],
    activeThread: null,
    lastInboxCount: null,
    lastReqCount: null,
    threadUnsub: null
};

/* استخراج اسم المستخدم من حقل from — مثال: "Partner: ahmed1" → "ahmed1" */
function extractUser(from) {
    const s = String(from || '').trim();
    if (!s) return null;
    if (s.toLowerCase() === 'system report') return '__system__';
    const idx = s.lastIndexOf(':');
    if (idx >= 0) {
        const u = s.slice(idx + 1).trim();
        return u || s;
    }
    return s;
}

window._ownerWorkInboxHTML = () => `
  <div class="chat-layout">
    <div class="chat-sidebar">
      <div class="chat-sidebar-title">📬 مرسِلين رسايل الشغل</div>
      <div id="ocThreadsList"></div>
      <div style="margin-top:auto; padding-top:10px; border-top:1px solid var(--border); font-size:11px; color:var(--text-3); line-height:1.8;">
        📩 رسايل مباشرة + ✏️ ملاحظات + 📅 اجتماعات + 📝 تقارير + 💡 أفكار + 🐞 بلاغات — كلها في مكان واحد، وردك بيوصلهم في لوحتهم فورًا.
      </div>
    </div>
    <div class="chat-main">
      <div class="chat-main-header">
        <span id="ocWorkHeader">📬 اختر مُرسِل لعرض رسايله</span>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="chat-stats-btn" onclick="window.markWorkHandled()" title="علّم كل طلبات المُرسِل كمت handled">✅ تم التعامل</button>
          <button class="chat-stats-btn" onclick="window.ownerInboxStats()" title="إحصائيات">📊</button>
        </div>
      </div>
      <div class="chat-main-messages" id="ocWorkMessages">
        <div class="chat-empty"><div class="chat-empty-icon">📬</div><div>هنا بتوصلك رسايل الشغل من الشركاء والمديرين والأدمنز والبيلدرز — اختار مُرسِل وشوف ورد</div></div>
      </div>
      <div class="chat-main-input">
        <input type="text" id="ocWorkInput" placeholder="اكتب ردك للأونر..." disabled onkeypress="if(event.key==='Enter') window.sendWorkReply()">
        <button id="ocWorkSend" onclick="window.sendWorkReply()" disabled>↩️ رد</button>
      </div>
    </div>
  </div>`;

function rebuildThreads() {
    const map = {};
    const add = (user, item) => {
        if (!user) return;
        if (!map[user]) map[user] = { user, items: [] };
        map[user].items.push(item);
    };
    // 1) رسايل owner_inbox المباشرة
    Object.entries(work.inboxData).forEach(([id, m]) => {
        const user = extractUser(m.from);
        add(user, { source: 'inbox', id, icon: '📩', label: 'رسالة', text: m.text || '', from: m.from || '', time: m.time || 0, status: null, replyable: user !== '__system__' });
    });
    // 2) طلبات الشريك partner_requests/*
    Object.entries(work.reqData).forEach(([node, arr]) => {
        const meta = REQ_TYPES[node] || { icon: '📋', label: node };
        Object.entries(arr || {}).forEach(([id, r]) => {
            add(r.from, {
                source: 'req:' + node, path: `partner_requests/${node}/${id}`, id,
                icon: meta.icon, label: meta.label,
                text: r.text || r.reason || r.desc || r.title || r.name || [r.date, r.contact].filter(Boolean).join(' — '),
                from: r.from || '', time: r.time || 0, status: r.status || 'pending', replyable: true
            });
        });
    });
    // 3) partner_ideas (قديم)
    Object.entries(work.ideasData || {}).forEach(([id, r]) => {
        add(r.from || r.name, {
            source: 'ideas', path: `partner_ideas/${id}`, id, icon: '💡', label: 'فكرة',
            text: r.title || r.text || r.desc || r.idea || '', from: r.from || '', time: r.time || 0, status: null, replyable: !!r.from
        });
    });
    // ملخص كل تريد
    work.threads = Object.values(map).map(th => {
        th.items.sort((a, b) => (a.time || 0) - (b.time || 0));
        const last = th.items[th.items.length - 1];
        const seen = Number(localStorage.getItem('ownerWorkSeen_' + th.user) || 0);
        th.unread = th.items.filter(i => (i.time || 0) > seen && String(i.from || '').toLowerCase() !== CU).length;
        th.lastText = last ? ((last.label && last.label !== 'رسالة' ? last.label + ': ' : '') + (last.text || '')).slice(0, 42) : '';
        th.lastTime = last ? last.time : 0;
        return th;
    }).sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    renderThreads();
    updateInboxBadge();
}

function renderThreads() {
    const box = document.getElementById('ocThreadsList');
    if (!box) return;
    if (!work.threads.length) {
        box.innerHTML = '<div class="chat-empty" style="font-size:12px; padding:20px 5px;">مفيش رسايل شغل لسه — أول ما حد من الإدارة يبعتلك هتظهر هنا فورًا</div>';
        return;
    }
    box.innerHTML = work.threads.map(th => `
      <button class="chat-room-item ${work.activeThread === th.user ? 'active' : ''}" onclick="window.openWorkThread('${escAttr(th.user)}')">
        <span class="chat-room-emoji">${th.user === '__system__' ? '🤖' : '👤'}</span>
        <span style="flex:1; min-width:0; text-align:right;">
          <span class="chat-room-name" style="display:block;">${th.user === '__system__' ? 'النظام (تقارير)' : esc(th.user)}</span>
          <span style="display:block; font-size:10px; color:var(--text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(th.lastText)}</span>
        </span>
        ${th.unread ? `<span class="chat-room-badge">${th.unread}</span>` : ''}
      </button>`).join('');
}

function renderThreadMessages(user) {
    const box = document.getElementById('ocWorkMessages');
    if (!box || work.activeThread !== user) return;
    const th = work.threads.find(t => t.user === user);
    const items = th ? [...th.items] : [];
    // ردود الأونر السابقة من messages/{user}
    const replies = Object.entries(work.replyCache[user] || {})
        .filter(([, m]) => /👑|owner/i.test(m.from || ''))
        .map(([id, m]) => ({ mine: true, icon: '👑', text: m.text || '', time: m.time || 0, status: null, label: 'رد' }));
    const all = [
        ...items.map(i => ({ mine: false, icon: i.icon, text: i.text, time: i.time, status: i.status, label: i.label, source: i.source, path: i.path, replyable: i.replyable })),
        ...replies
    ].sort((a, b) => (a.time || 0) - (b.time || 0));
    if (!all.length) {
        box.innerHTML = '<div class="chat-empty"><div class="chat-empty-icon">📬</div><div>مفيش رسايل في التريد ده</div></div>';
        return;
    }
    box.innerHTML = all.map(m => `
      <div class="chat-msg ${m.mine ? 'mine' : 'theirs'}">
        ${!m.mine ? `<div class="chat-msg-sender">${m.icon || '📩'} ${esc(m.label || 'رسالة')}${m.status === 'handled' ? ' <span class="work-tag done">تم ✅</span>' : (m.status === 'pending' ? ' <span class="work-tag">جديد</span>' : '')}</div>` : ''}
        <div>${esc(m.text || '')}</div>
        <div class="chat-msg-time"><span>${m.time ? new Date(m.time).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
      </div>`).join('');
    box.scrollTop = box.scrollHeight;
}

window.openWorkThread = function (user) {
    work.activeThread = user;
    localStorage.setItem('ownerWorkSeen_' + user, String(Date.now()));
    renderThreads();
    updateInboxBadge();
    const th = work.threads.find(t => t.user === user);
    const header = document.getElementById('ocWorkHeader');
    if (header) header.innerHTML = `📬 رسايل ${user === '__system__' ? 'النظام (مش بيرد)' : esc(user)}`;
    const replyable = !!(th && th.items.some(i => i.replyable));
    const input = document.getElementById('ocWorkInput');
    const send = document.getElementById('ocWorkSend');
    if (input) input.disabled = !replyable;
    if (send) send.disabled = !replyable;
    renderThreadMessages(user);
    // ردود الأونر الحية من messages/{user}
    if (user !== '__system__') {
        if (work.threadUnsub) { try { work.threadUnsub(); } catch (e) { } }
        work.replyCache[user] = {};
        work.threadUnsub = onValue(ref(db, 'messages/' + user), (snap) => {
            work.replyCache[user] = snap.val() || {};
            if (work.activeThread === user) renderThreadMessages(user);
        });
    }
};

window.sendWorkReply = async function () {
    const user = work.activeThread;
    if (!user || user === '__system__') return window.toast('التريد ده مش بيقبل ردود', 'error');
    const input = document.getElementById('ocWorkInput');
    const text = (input.value || '').trim();
    if (!text) return;
    try {
        await push(ref(db, 'messages/' + user), { from: '👑 Owner', text, time: Date.now() });
        input.value = '';
        window.toast('✅ الرد اتبعت — هيوصله في "الردود من الأونر" في لوحته فورًا');
        renderThreadMessages(user);
    } catch (e) { window.toast('خطأ: ' + e.message, 'error'); }
};

window.markWorkHandled = async function () {
    const user = work.activeThread;
    if (!user) return window.toast('اختار مُرسِل الأول', 'error');
    const th = work.threads.find(t => t.user === user);
    if (!th) return;
    let n = 0;
    for (const it of th.items) {
        if (it.source && it.source.startsWith('req:') && it.status !== 'handled' && it.path) {
            try { await update(ref(db, it.path), { status: 'handled', handledAt: Date.now(), handledBy: CU }); n++; } catch (e) { /* تجاهل */ }
        }
    }
    window.toast(n ? `✅ اتعلّمت ${n} طلب كـ "تم"` : 'مفيش طلبات جديدة للتعليم');
};

window.ownerInboxStats = function () {
    const mt = document.getElementById('modalTitle'), mc = document.getElementById('modalContent'), ov = document.getElementById('modalOverlay');
    if (!mt || !mc || !ov) return;
    mt.textContent = '📊 إحصائيات رسايل الشغل';
    const reqCount = Object.values(work.reqData).reduce((s, arr) => s + Object.keys(arr || {}).length, 0);
    const pending = Object.values(work.reqData).flatMap(arr => Object.values(arr || {})).filter(r => (r.status || 'pending') !== 'handled').length;
    mc.innerHTML = `
      <div class="list-item"><span>📩 رسايل مباشرة (owner_inbox)</span><b style="color:var(--gold);">${Object.keys(work.inboxData).length}</b></div>
      <div class="list-item"><span>📋 طلبات الشركاء (partner_requests)</span><b style="color:var(--gold);">${reqCount}</b></div>
      <div class="list-item"><span>⏳ طلبات لسه متعملتش</span><b style="color:var(--danger);">${pending}</b></div>
      <div class="list-item"><span>💡 أفكار قديمة (partner_ideas)</span><b style="color:var(--gold);">${Object.keys(work.ideasData || {}).length}</b></div>
      <div class="list-item"><span>👥 عدد المرسِلين</span><b style="color:var(--gold);">${work.threads.length}</b></div>`;
    ov.classList.add('active');
};

window._ownerInboxInit = function () {
    renderThreads();
    if (work.started) { if (work.activeThread) window.openWorkThread(work.activeThread); return; }
    work.started = true;
    // 1) الرسايل المباشرة
    onValue(ref(db, 'messages/owner_inbox'), (snap) => {
        work.inboxData = snap.val() || {};
        const total = Object.keys(work.inboxData).length;
        if (work.lastInboxCount === null) {
            work.lastInboxCount = total; // baseline
        } else if (total > work.lastInboxCount) {
            work.lastInboxCount = total;
            const newest = Object.values(work.inboxData).sort((a, b) => (b.time || 0) - (a.time || 0))[0];
            if (newest && extractUser(newest.from) !== CU) {
                window.toast(`📬 رسالة شغل جديدة من ${newest.from || 'مجهول'}`, 'info');
                ping();
            }
        }
        rebuildThreads();
    });
    // 2) طلبات الشريك
    onValue(ref(db, 'partner_requests'), (snap) => {
        work.reqData = snap.val() || {};
        const total = Object.values(work.reqData).reduce((s, arr) => s + Object.keys(arr || {}).length, 0);
        if (work.lastReqCount === undefined) work.lastReqCount = total;
        else if (total > work.lastReqCount) {
            work.lastReqCount = total;
            window.toast('📬 طلب جديد من الشريك في صندوق رسايل الشغل', 'info');
            ping();
        }
        rebuildThreads();
    });
    // 3) الأفكار القديمة
    onValue(ref(db, 'partner_ideas'), (snap) => {
        work.ideasData = snap.val() || {};
        rebuildThreads();
    });
};

/* ═══════════════════════════════════════════════════════════════════
   🔔 البادجات على القائمة الجانبية + عداد العنوان
   ═══════════════════════════════════════════════════════════════════ */
function ensureNavBadges() {
    ['chat', 'work_inbox'].forEach(tab => {
        const btn = document.querySelector(`.nav-item[data-tab="${tab}"]`);
        if (btn && !btn.querySelector('.nav-badge')) {
            const sp = document.createElement('span');
            sp.className = 'nav-badge';
            sp.id = 'navBadge-' + tab;
            sp.style.display = 'none';
            btn.appendChild(sp);
        }
    });
}

function chatUnreadTotal() {
    return Object.values(roomNew).reduce((s, n) => s + (n || 0), 0);
}
function inboxUnreadTotal() {
    return work.threads.reduce((s, th) => s + (th.unread || 0), 0);
}
function updateNavBadges() {
    ensureNavBadges();
    const c = chatUnreadTotal(), w = inboxUnreadTotal();
    const cb = document.getElementById('navBadge-chat');
    const wb = document.getElementById('navBadge-work_inbox');
    if (cb) { cb.style.display = c > 0 ? 'inline-block' : 'none'; cb.textContent = c; }
    if (wb) { wb.style.display = w > 0 ? 'inline-block' : 'none'; wb.textContent = w; }
    // عداد في عنوان التاب
    const total = c + w;
    document.title = (total > 0 ? `(${total}) ` : '') + '👑 لوحة الأونر - Plot Twist';
}
function updateInboxBadge() { updateNavBadges(); }

/* استني لحد ما الأونر كور يبقى جاهز (owner-core بيعمل access check الأول) */
(function boot() {
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        const panel = document.getElementById('ownerPanel');
        const nav = document.getElementById('sidebarNav');
        if (panel && panel.classList.contains('show') && nav && nav.querySelector('[data-tab="chat"]')) {
            clearInterval(timer);
            ensureNavBadges();
            // شغّل الـ listeners من الأول عشان البادجات والإشعارات تشتغل من غير ما تفتح التابات
            window._ownerChatInit();
            window._ownerInboxInit();
        } else if (tries > 150) {
            clearInterval(timer);
        }
    }, 400);
})();
