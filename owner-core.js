import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get, set, remove, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = initializeApp(firebaseConfig); const db = getDatabase(app); const auth = getAuth(app);

window.db = db; window.ref = ref; window.onValue = onValue; window.get = get; window.set = set; window.remove = remove; window.push = push; window.signOut = signOut; window.auth = auth;

window.checkPassword = async function() {
    const input = document.getElementById('ownerPasswordInput').value;
    try {
        await signInWithEmailAndPassword(auth, "owner@quizhub.com", input);
        document.getElementById('passwordLock').style.display = 'none';
        document.getElementById('ownerContent').style.display = 'block';
        initApp();
    } catch (error) {
        document.getElementById('errorMsg').style.display = 'block';
        document.getElementById('ownerPasswordInput').value = '';
        document.getElementById('ownerPasswordInput').focus();
    }
}

function initApp() {
    const currentUser = localStorage.getItem('loggedInUser') || 'owner';

    if (localStorage.getItem('theme') === 'light') { 
        document.body.classList.add('light-mode'); 
        document.getElementById('themeBtn').innerText = '🌙';
    } else {
        document.getElementById('themeBtn').innerText = '☀️';
    }

    window.toggleTheme = function() {
        const body = document.body; const btn = document.getElementById('themeBtn');
        body.classList.toggle('light-mode');
        if (body.classList.contains('light-mode')) { 
            btn.innerText = '🌙'; localStorage.setItem('theme', 'light'); 
        } else { 
            btn.innerText = '☀️'; localStorage.setItem('theme', 'dark'); 
        }
    }

    let currentLang = localStorage.getItem('lang') || 'ar';

    window.toggleLanguage = function() {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('lang', currentLang);
        applyLanguage();
    }

    function applyLanguage() {
        document.querySelectorAll('[data-ar]').forEach(el => {
            if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = currentLang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
            } else {
                el.innerText = currentLang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
            }
        });
        document.body.dir = currentLang === 'en' ? 'ltr' : 'rtl';
        document.getElementById('langBtn').innerText = currentLang === 'ar' ? 'EN' : 'AR';
        document.getElementById('panelTitle').innerText = currentLang === 'ar' ? '👑 لوحة الأونر' : '👑 Owner Panel';
    }
    applyLanguage();

    window.showToast = function(msg, type='success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div'); 
        toast.className = 'toast';
        toast.style.cssText = 'background:#111; border-right:5px solid #4caf50; color:#fff; padding:15px 20px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.5); font-weight:bold; font-family:Cairo, sans-serif; display:flex; align-items:center; gap:8px; animation: slideIn 0.3s forwards; direction:rtl;';
        if(type === 'error') toast.style.borderRightColor = '#ff3333';
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${msg}</span>`;
        container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
    }

    window.switchTab = function(id, el) {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active'); el.classList.add('active');
        const titlesAr = { 
            dashboard: '📊 الإحصائيات', users: '👥 اللاعبين', ranks: '🎖️ إدارة الرتب', badges: '🏅 البادجات', 
            warnings: '⚠️ التحذيرات', content: '📝 المحتوى', quizzes: '🎬 الكويزات', 
            rooms: '🚪 الغرف', requests: '📩 الطلبات', system: '⚙️ النظام', messages: '📩 الرسائل', 
            admins: '🛡️ الأدمنز', security: '🔒 الأمان', developer: '🔧 المطور'
        };
        const titlesEn = { 
            dashboard: '📊 Dashboard', users: '👥 Players', ranks: '🎖️ Ranks', badges: '🏅 Badges', 
            warnings: '⚠️ Warnings', content: '📝 Content', quizzes: '🎬 Quizzes', 
            rooms: '🚪 Rooms', requests: '📩 Requests', system: '⚙️ System', messages: '📩 Messages', 
            admins: '🛡️ Admins', security: '🔒 Security', developer: '🔧 Developer'
        };
        document.getElementById('pageTitle').innerText = currentLang === 'ar' ? titlesAr[id] : titlesEn[id];
    };

    let allUsers = {}, allPresence = {}, allScores = {}, allRoles = {}, allXP = {}, allRooms = {}, allBadges = {}, allUserRanks = {};

    window.onValue(window.ref(window.db, 'usernames'), snap => { 
        allUsers = snap.val() || {}; document.getElementById('statUsers').innerText = Object.keys(allUsers).length; window.renderUsers(); window.populateRankSelect(); window.populateBadgeSelect(); window.populateWarnSelect();
    });
    window.onValue(window.ref(window.db, 'presence'), snap => { 
        allPresence = snap.val() || {}; document.getElementById('statOnline').innerText = Object.values(allPresence).filter(p => p.status === 'online').length; window.renderUsers(); 
    });
    window.onValue(window.ref(window.db, 'scores'), snap => {
        allScores = snap.val() || {}; let plays = 0;
        for (let u in allScores) { for (let q in allScores[u]) { plays += Object.keys(allScores[u][q]).length; } }
        document.getElementById('statPlays').innerText = plays;
    });
    window.onValue(window.ref(window.db, 'users_data'), snap => {
        allXP = snap.val() || {}; let total = 0;
        for (let u in allXP) { if (allXP[u].xp) total += allXP[u].xp; }
        document.getElementById('statXP').innerText = total;
    });
    window.onValue(window.ref(window.db, 'roles/admins'), snap => { allRoles = snap.val() || {}; window.renderUsers(); window.renderAdmins(); });
    window.onValue(window.ref(window.db, 'roles/users'), snap => { allUserRanks = snap.val() || {}; window.renderRanksList(); window.renderUsers(); });
    window.onValue(window.ref(window.db, 'badges'), snap => { allBadges = snap.val() || {}; window.renderBadgesList(); });
    window.onValue(window.ref(window.db, 'rooms'), snap => { 
        allRooms = snap.val() || {}; document.getElementById('statRooms').innerText = Object.keys(allRooms).length; window.renderRooms(); 
    });
    window.onValue(window.ref(window.db, 'comments'), snap => { 
        document.getElementById('statComments').innerText = snap.exists() ? Object.keys(snap.val()).length : 0; 
        window.renderContent('comments', snap.val(), 'commentsList'); 
    });
    window.onValue(window.ref(window.db, 'suggestions'), snap => { 
        document.getElementById('statSuggestions').innerText = snap.exists() ? Object.keys(snap.val()).length : 0; 
        window.renderContent('suggestions', snap.val(), 'suggestionsList'); 
    });
    window.onValue(window.ref(window.db, 'quiz_requests'), snap => { 
        document.getElementById('statRequests').innerText = snap.exists() ? Object.keys(snap.val()).length : 0; 
        window.renderContent('quiz_requests', snap.val(), 'requestsList'); 
    });
    window.onValue(window.ref(window.db, 'custom_quizzes'), snap => { 
        document.getElementById('statCustom').innerText = snap.exists() ? Object.keys(snap.val()).length : 0; 
        window.renderCustomQuizzes(snap.val()); 
    });
    window.onValue(window.ref(window.db, 'site_stats/visitors'), snap => { document.getElementById('statVisitors').innerText = snap.exists() ? snap.val() : 0; });
    window.onValue(window.ref(window.db, 'warnings'), snap => { window.renderWarnings(snap.val()); });
    window.onValue(window.ref(window.db, 'banned_users'), snap => { window.renderBanned(snap.val()); });
    
    // --- قسم الطلبات (الرتب والبادجات) ---
    window.onValue(window.ref(window.db, 'admin_requests'), snap => {
        const list = document.getElementById('requestsOwnerList');
        if(!list) return;
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div class="item">لا توجد طلبات حالياً.</div>'; return; }
        const data = snap.val();
        const sortedKeys = Object.keys(data).sort((a,b) => data[b].time - data[a].time);
        
        sortedKeys.forEach(key => {
            const req = data[key];
            const div = document.createElement('div'); div.className = 'item';
            const statusColor = req.status === 'approved' ? '#4caf50' : '#ff9800';
            const statusText = req.status === 'approved' ? 'تم القبول ✅' : 'قيد الانتظار ⏳';
            
            div.innerHTML = `
                <div>
                    <h3 style="color:var(--gold);">👤 ${req.user}</h3>
                    <p>${req.text}</p>
                    <p style="font-size:12px; color:${statusColor}; font-weight:bold;">${statusText}</p>
                    <p style="font-size:11px; color:#888;">${new Date(req.time).toLocaleString()}</p>
                </div>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    ${req.status !== 'approved' ? `<button class="btn btn-green" onclick="window.approveRequest('${req.user}', '${key}')">قبول ✅</button>` : ''}
                    <button class="btn btn-red" onclick="window.deleteRequest('${key}')">مسح 🗑️</button>
                </div>
            `;
            list.appendChild(div);
        });
    });

    window.approveRequest = (user, key) => {
        window.set(window.ref(window.db, 'admin_requests/' + key + '/status'), 'approved');
        window.showToast(`تم قبول طلب ${user}، روح لصفحة اللاعبين واديله الرتبة.`);
        // بننقله لصفحة اللاعبين
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.getElementById('tab-users').classList.add('active');
        document.querySelectorAll('.nav-item')[1].classList.add('active');
    };

    window.deleteRequest = (key) => {
        if(confirm('مسح الطلب ده؟')) {
            window.remove(window.ref(window.db, 'admin_requests/' + key));
            window.showToast('تم مسح الطلب');
        }
    };
    // -----------------------------------------

    window.onValue(window.ref(window.db, 'site_settings/maintenance'), snap => {
        const isM = snap.exists() ? snap.val() : false;
        document.getElementById('maintenanceBtn').innerText = isM ? (currentLang === 'ar' ? 'إلغاء الصيانة' : 'Disable Maintenance') : (currentLang === 'ar' ? 'تفعيل الصيانة' : 'Enable Maintenance');
        document.getElementById('maintenanceBtn').className = isM ? 'btn btn-green' : 'btn btn-red';
    });

    window.renderUsers = function() {
        const container = document.getElementById('usersList'); if(!container) return;
        container.innerHTML = '';
        const search = document.getElementById('searchUser').value.toLowerCase();
        
        Object.keys(allUsers).filter(u => u.toLowerCase().includes(search) && u.toLowerCase() !== 'owner').forEach(u => {
            const isOnline = allPresence[u] && allPresence[u].status === 'online';
            const userXP = allXP[u] ? allXP[u].xp || 0 : 0;
            const userRank = allUserRanks[u] || 'Player';

            let roleTag = `<span style="color:#aaa; font-size:12px; background:#222; padding:2px 6px; border-radius:4px;">${userRank}</span>`;
            
            let isAdmin = false;
            for (let adminName in allRoles) {
                if (adminName.toLowerCase() === u.toLowerCase()) { isAdmin = true; break; }
            }

            if (u.toLowerCase() === 'ahmed') {
                roleTag = '<span style="color:#ffd700; font-size:12px; background:#333; padding:2px 6px; border-radius:4px;">👑 Owner</span>';
            } else if (isAdmin) {
                roleTag = '<span style="color:#0088cc; font-size:12px; background:#333; padding:2px 6px; border-radius:4px;">🛡️ Admin</span>';
            }

            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h3>${u} ${roleTag}</h3>
                    <p style="color:${isOnline ? 'var(--green)' : '#aaa'}; font-size:12px;">${isOnline ? '🟢 Online' : '⚪ Offline'} | XP: ${userXP}</p>
                </div>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    <button class="btn btn-blue" onclick="window.editXP('${u}')">تعديل XP</button>
                    <button class="btn btn-gold" onclick="window.sendDMPrompt('${u}')">رسالة</button>
                    ${u.toLowerCase() !== 'ahmed' ? `<button class="btn btn-red" onclick="window.banUser('${u}')">حظر 🚫</button>` : ''}
                </div>
            `;
            container.appendChild(div);
        });
    };

    window.populateRankSelect = function() {
        const sel = document.getElementById('rankUserSelect'); if(!sel) return;
        sel.innerHTML = `<option value="">-- اختر اللاعب --</option>`;
        Object.keys(allUsers).forEach(u => { if(u.toLowerCase() !== 'owner') sel.innerHTML += `<option value="${u}">${u}</option>`; });
    };

    window.setRank = async function() {
        const user = document.getElementById('rankUserSelect').value;
        const rank = document.getElementById('rankSelect').value;
        if(!user) return window.showToast('اختر اللاعب أولاً!', 'error');
        await window.set(window.ref(window.db, 'roles/users/' + user), rank);
        window.showToast(`Rank (${rank}) assigned to ${user}`);
    };

    window.renderRanksList = function() {
        const list = document.getElementById('ranksList'); if(!list) return;
        list.innerHTML = '';
        if(Object.keys(allUserRanks).length === 0) { list.innerHTML = '<div class="item">لا يوجد لاعبين لديهم رتب حالياً.</div>'; return; }
        
        for(let user in allUserRanks) {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h3>👤 ${user}</h3>
                    <p style="color:var(--gold); font-weight:bold;">${allUserRanks[user]}</p>
                </div>
                <button class="btn btn-red" onclick="window.removeRank('${user}')">إزالة الرتبة 🗑️</button>
            `;
            list.appendChild(div);
        }
    };

    window.removeRank = async (user) => {
        if(confirm(`إزالة رتبة ${user}؟`)) {
            await window.set(window.ref(window.db, 'roles/users/' + user), 'Player');
            window.showToast('Rank reset to Player');
        }
    };

    window.populateBadgeSelect = function() {
        const sel = document.getElementById('badgeUserSelect'); if(!sel) return;
        sel.innerHTML = `<option value="">-- اختر اللاعب --</option>`;
        Object.keys(allUsers).forEach(u => { if(u.toLowerCase() !== 'owner') sel.innerHTML += `<option value="${u}">${u}</option>`; });
    };

    window.giveBadge = async (badgeName) => {
        const sel = document.getElementById('badgeUserSelect'); if(!sel) return;
        const user = sel.value;
        if(!user) return window.showToast('اختر اللاعب الأول!', 'error');
        await window.set(window.ref(window.db, 'badges/' + user + '/' + badgeName), true);
        window.showToast(`Badge (${badgeName}) given to ${user}`);
    };

    window.renderBadgesList = function() {
        const list = document.getElementById('badgesList'); if(!list) return;
        list.innerHTML = '';
        let hasData = false;
        for(let user in allBadges) {
            const badges = Object.keys(allBadges[user]);
            if(badges.length > 0) {
                hasData = true;
                const div = document.createElement('div'); div.className = 'item';
                div.innerHTML = `<div><h3>👤 ${user}</h3><p style="font-size:12px; color:var(--gold);">${badges.join(' | ')}</p></div>
                <button class="btn btn-red" onclick="window.removeAllBadges('${user}')">Clear Badges 🗑️</button>`;
                list.appendChild(div);
            }
        }
        if(!hasData) list.innerHTML = '<div class="item">لا يوجد لاعبين مميزين بالبادجات.</div>';
    };

    window.removeAllBadges = async (user) => {
        if(confirm(`مسح كل بادجات ${user}؟`)) {
            await window.remove(window.ref(window.db, 'badges/' + user));
            window.showToast('Badges cleared');
        }
    };

    window.populateWarnSelect = function() {
        const sel = document.getElementById('warnUserSelect'); if(!sel) return;
        sel.innerHTML = `<option value="">-- اختر اللاعب --</option>`;
        Object.keys(allUsers).forEach(u => { if(u.toLowerCase() !== 'owner') sel.innerHTML += `<option value="${u}">${u}</option>`; });
    };

    window.sendWarning = async function() {
        const user = document.getElementById('warnUserSelect').value;
        const reason = document.getElementById('warnReason').value.trim();
        if(!user || !reason) return window.showToast('اختر اللاعب واكتب السبب', 'error');
        await window.set(window.ref(window.db, 'warnings/' + user), { text: reason, date: Date.now() });
        window.showToast(`Warning sent to ${user}`);
        document.getElementById('warnReason').value = '';
    };

    window.renderWarnings = function(data) {
        const list = document.getElementById('warningsList'); if(!list) return;
        list.innerHTML = '';
        if(!data) { list.innerHTML = '<div class="item">لا توجد تحذيرات مسجلة.</div>'; return; }
        
        Object.keys(data).forEach(user => {
            const warn = data[user];
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h3 style="color:var(--gold);">👤 ${user}</h3>
                    <p>Reason: ${warn.text}</p>
                    <p style="font-size:12px; color:#aaa;">${new Date(warn.date).toLocaleString()}</p>
                </div>
                <button class="btn btn-red" onclick="window.removeWarning('${user}')">Remove Warning 🗑️</button>
            `;
            list.appendChild(div);
        });
    };

    window.removeWarning = async (user) => {
        if(confirm(`إزالة التحذير عن ${user}؟`)) {
            await window.remove(window.ref(window.db, 'warnings/' + user));
            window.showToast('Warning removed');
        }
    };

    window.renderContent = function(node, data, containerId) {
        const container = document.getElementById(containerId); if(!container) return;
        container.innerHTML = '';
        if (!data) { container.innerHTML = '<div class="item">لا يوجد محتوى.</div>'; return; }
        
        Object.keys(data).reverse().forEach(key => {
            const c = data[key]; const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <p style="color:var(--gold); font-size:12px;">👤 ${c.user}</p>
                    <p>${c.text}</p>
                </div>
                <button class="btn btn-red" onclick="window.deleteItem('${node}', '${key}')">Delete 🗑️</button>
            `;
            container.appendChild(div);
        });
    };

    window.renderCustomQuizzes = function(data) {
        const container = document.getElementById('customQuizzesList'); if(!container) return;
        container.innerHTML = '';
        if (!data) { container.innerHTML = '<div class="item">لا توجد كويزات مخصصة.</div>'; return; }
        
        Object.keys(data).forEach(key => {
            const q = data[key]; const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <p style="color:var(--gold); font-weight:bold;">${q.name}</p>
                    <p style="font-size:12px; color:#aaa;">${q.cat}</p>
                </div>
                <button class="btn btn-red" onclick="window.deleteItem('custom_quizzes', '${key}')">Delete 🗑️</button>
            `;
            container.appendChild(div);
        });
    };

    window.deleteItem = async (node, key) => {
        if(confirm('متأكد من المسح؟')) {
            await window.remove(window.ref(window.db, node + '/' + key));
            window.showToast('Deleted');
        }
    }

    window.clearAll = async (node) => {
        if(confirm('متأكد من مسح كل المحتوى في هذا القسم؟')) {
            await window.remove(window.ref(window.db, node));
            window.showToast('All cleared');
        }
    }

    window.addQuiz = async () => {
        const name = document.getElementById('qName').value.trim();
        const img = document.getElementById('qImage').value.trim();
        const link = document.getElementById('qLink').value.trim();
        const cat = document.getElementById('qCategory').value;
        if(!name || !img || !link) return window.showToast('املأ كل الحقول', 'error');
        
        await window.push(window.ref(window.db, 'custom_quizzes'), { name, img, link, cat, addedBy: currentUser, time: Date.now() });
        window.showToast('Quiz added successfully!');
        document.getElementById('qName').value = '';
        document.getElementById('qImage').value = '';
        document.getElementById('qLink').value = '';
    }

    window.renderRooms = function() {
        const list = document.getElementById('roomsList'); if(!list) return;
        list.innerHTML = `<div style="margin-bottom: 15px; text-align: center;"><button class="btn btn-red" onclick="window.clearAllRooms()" style="width: 100%; padding: 10px;">🗑️ مسح كل الغرف</button></div>`;
        
        if(Object.keys(allRooms).length === 0) { list.innerHTML += '<div class="item">لا توجد غرف نشطة.</div>'; return; }
        for(let room in allRooms) {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><p>Room Code: <b style="color:var(--gold)">${room}</b></p><p style="font-size:12px; color:#aaa;">Status: ${allRooms[room].status}</p></div><button class="btn btn-red" onclick="window.deleteRoom('${room}')">Delete 🗑️</button>`;
            list.appendChild(div);
        }
    };

    window.clearAllRooms = async function() {
        if (confirm('متأكد إنك عايز تمسح كل الغرف النشطة؟')) {
            await window.remove(window.ref(window.db, 'rooms'));
            window.showToast('تم مسح كل الغرف');
        }
    };

    window.deleteRoom = async (room) => {
        if(confirm(`مسح غرفة ${room}؟`)) {
            await window.remove(window.ref(window.db, 'rooms/' + room));
            window.showToast('Room deleted');
        }
    };

    window.editXP = async (u) => {
        const xpSnap = await window.get(window.ref(window.db, 'users_data/' + u + '/xp'));
        const xp = xpSnap.exists() ? xpSnap.val() : 0;
        const newXp = prompt(`تعديل نقاط (XP) للاعب ${u}:`, xp);
        if (newXp !== null && !isNaN(newXp)) {
            await window.set(window.ref(window.db, 'users_data/' + u + '/xp'), parseInt(newXp));
            window.showToast('XP updated successfully');
        }
    };

    window.sendDMPrompt = (u) => {
        const msg = prompt(`اكتب رسالتك لـ ${u}:`);
        if(msg) {
            window.push(window.ref(window.db, 'messages/' + u), { from: 'الإدارة', text: msg, time: Date.now() });
            window.showToast('Message sent!');
        }
    };

    window.banUser = async (user) => {
        const reason = prompt(`سبب حظر ${user}:`, 'مخالفة القواعد');
        if(reason !== null) {
            await window.set(window.ref(window.db, 'banned_users/' + user), { status: true, reason: reason });
            await window.set(window.ref(window.db, 'kick_signals/' + user), Date.now());
            window.showToast(`تم حظر ${user} وطرده`);
        }
    };

    window.unbanUser = async (user) => {
        if(confirm(`فك الحظر عن ${user}؟`)) {
            await window.remove(window.ref(window.db, 'banned_users/' + user));
            window.showToast('User unbanned');
        }
    };

    window.toggleMaintenance = async () => {
        const snap = await window.get(window.ref(window.db, 'site_settings/maintenance'));
        const isM = snap.exists() ? snap.val() : false;
        await window.set(window.ref(window.db, 'site_settings/maintenance'), !isM);
        window.showToast(isM ? 'تم إلغاء الصيانة' : 'تم تفعيل الصيانة');
    };

    window.renderAdmins = function() {
        const list = document.getElementById('adminsList'); if(!list) return;
        list.innerHTML = '';
        let hasData = false;
        for(let user in allRoles) {
            hasData = true;
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><h3>🛡️ ${user}</h3></div>
            <button class="btn btn-red" onclick="window.removeAdmin('${user}')">Remove Admin 🗑️</button>`;
            list.appendChild(div);
        }
        if(!hasData) list.innerHTML = '<div class="item">لا يوجد أدمنز حالياً.</div>';
    };

    window.removeAdmin = async (user) => {
        if(confirm(`إزالة ${user} من الأدمن؟`)) {
            await window.remove(window.ref(window.db, 'roles/admins/' + user));
            window.showToast('Admin removed');
        }
    };

    window.renderBanned = function(data) {
        const list = document.getElementById('bannedList'); if(!list) return;
        list.innerHTML = '';
        if(!data) { list.innerHTML = '<div class="item">لا يوجد لاعبين محظورين.</div>'; return; }
        
        Object.keys(data).forEach(user => {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h3 style="color:var(--accent);">🚫 ${user}</h3>
                    <p style="font-size:12px; color:#aaa;">Reason: ${data[user].reason || 'غير محدد'}</p>
                </div>
                <button class="btn btn-green" onclick="window.unbanUser('${user}')">Unban ✅</button>
            `;
            list.appendChild(div);
        });
    };

    window.publishAnnouncement = async () => {
        const t = document.getElementById('announcementInput').value.trim();
        if(!t) return;
        await window.set(window.ref(window.db, 'site_settings/announcement'), t);
        window.showToast('Announcement published!');
        document.getElementById('announcementInput').value = '';
    };

    window.sendBroadcast = async () => {
        const t = document.getElementById('broadcastInput').value.trim();
        if(!t) return;
        await window.set(window.ref(window.db, 'site_settings/broadcast'), { text: t, time: Date.now() });
        window.showToast('Broadcast sent to all!');
        document.getElementById('broadcastInput').value = '';
    };

    window.resetVisitors = async () => {
        await window.set(window.ref(window.db, 'site_stats/visitors'), 0);
        window.showToast('Visitor counter reset');
    };

    window.sendDM = async () => {
        const u = document.getElementById('dmUser').value.trim();
        const msg = document.getElementById('dmText').value.trim();
        if(!u || !msg) return window.showToast('اكتب الاسم والرسالة', 'error');
        await window.push(window.ref(window.db, 'messages/' + u), { from: 'الإدارة', text: msg, time: Date.now() });
        window.showToast('Message sent successfully!');
        document.getElementById('dmUser').value = '';
        document.getElementById('dmText').value = '';
    };

    window.resetSite = async () => {
        if(prompt('اكتب "RESET" لتأكيد مسح كل البيانات:') === 'RESET') {
            await window.remove(window.ref(window.db, 'scores'));
            await window.remove(window.ref(window.db, 'users_data'));
            await window.remove(window.ref(window.db, 'custom_quizzes'));
            await window.remove(window.ref(window.db, 'comments'));
            await window.remove(window.ref(window.db, 'suggestions'));
            window.showToast('Site reset successfully', 'error');
        }
    };

    window.restoreData = (event) => {
        const file = event.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if(confirm('هل أنت متأكد من استعادة هذه النسخة؟ سيتم مسح البيانات الحالية.')) {
                    await window.set(window.ref(window.db, '/'), data);
                    window.showToast('Backup restored successfully!');
                }
            } catch(err) { window.showToast('Invalid file', 'error'); }
        };
        reader.readAsText(file);
    };

    window.logoutUser = () => { 
        window.signOut(window.auth); 
        localStorage.removeItem('loggedInUser'); 
        window.location.href = 'index.html'; 
    };
}