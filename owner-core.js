import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, get, set, remove, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = initializeApp(firebaseConfig); 
const db = getDatabase(app); 
const auth = getAuth(app);

window.db = db; window.ref = ref; window.onValue = onValue; window.get = get; 
window.set = set; window.remove = remove; window.push = push; 
window.signOut = signOut; window.auth = auth;

// 1. التحقق الأساسي
const currentUser = localStorage.getItem('loggedInUser');
if (currentUser === 'ahmed') {
    document.getElementById('passwordLock').style.display = 'none';
    document.getElementById('ownerContent').style.display = 'block';
    initApp('ahmed');
} else {
    document.getElementById('passwordLock').style.display = 'flex';
    window.checkPassword = async function() {
        const input = document.getElementById('ownerPasswordInput').value;
        const errorMsg = document.getElementById('errorMsg');
        if (!input) return;

        errorMsg.style.display = 'block';
        errorMsg.style.color = '#eab308';
        errorMsg.innerText = "جاري التحقق من السيرفر...";

        try {
            // محاولة تسجيل الدخول
            const userCredential = await signInWithEmailAndPassword(auth, "owner@quizhub.com", input);
            
            // لو نجح
            localStorage.setItem('loggedInUser', 'ahmed'); // نحفظه عشان المرة الجاية
            document.getElementById('passwordLock').style.display = 'none';
            document.getElementById('ownerContent').style.display = 'block';
            initApp('ahmed');
        } catch (error) {
            // لو فشل
            errorMsg.style.color = '#ef4444';
            errorMsg.innerText = "كلمة المرور غير صحيحة! جرب تاني.";
            document.getElementById('ownerPasswordInput').value = '';
            console.error(error);
        }
    }
}

// 2. تشغيل اللوحة
function initApp(username) {
    document.getElementById('panelTitle').innerText = '👑 لوحة الأونر';
    
    // إعداد الثيم
    if (localStorage.getItem('ownerTheme') === 'dark') { 
        document.body.classList.add('dark-mode'); 
        document.getElementById('themeBtn').innerText = '☀️';
    } else {
        document.getElementById('themeBtn').innerText = '🌙';
    }

    window.toggleTheme = function() {
        const isDark = document.body.classList.toggle('dark-mode');
        if (isDark) { document.getElementById('themeBtn').innerText = '☀️'; localStorage.setItem('ownerTheme', 'dark'); } 
        else { document.getElementById('themeBtn').innerText = '🌙'; localStorage.setItem('ownerTheme', 'light'); }
    }

    window.toggleLanguage = function() {
        // دالة بسيطة عشان الزرار ميعملش إيرور
        alert('سيتم تفعيل تبديل اللغة قريباً');
    }

    window.logoutUser = () => { 
        window.signOut(window.auth); 
        localStorage.removeItem('loggedInUser'); 
        window.location.href = 'index.html'; 
    };

    window.showToast = function(msg, type='success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div'); 
        toast.style.cssText = 'background:#1a1f26; border-right:5px solid #10b981; color:#fff; padding:15px 20px; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.5); font-weight:bold; font-family:Cairo, sans-serif; display:flex; align-items:center; gap:8px; margin-bottom:10px;';
        if(type === 'error') toast.style.borderRightColor = '#ef4444';
        toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${msg}</span>`;
        container.appendChild(toast); setTimeout(() => toast.remove(), 3000);
    }

    window.switchTab = function(id, el) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(n => n.classList.remove('active'));
        document.getElementById('tab-' + id).classList.add('active'); el.classList.add('active');
        const titlesAr = { 
            dashboard: '📊 الإحصائيات', assign: '👑 تعيين الإدارة', users: '👥 اللاعبين', ranks: '🎖️ إدارة الرتب', badges: '🏅 البادجات', 
            warnings: '⚠️ التحذيرات', content: '📝 المحتوى', quizzes: '🎬 الكويزات', 
            rooms: '🚪 الغرف', manager: '📩 طلبات المنجر', offers: '🎁 العروض والمسابقات', system: '⚙️ النظام', messages: '📩 الرسائل', 
            admins: '🛡️ الأدمنز', security: '🔒 الأمان', developer: '🔧 المطور'
        };
        document.getElementById('pageTitle').innerText = titlesAr[id] || 'لوحة الأونر';
    };

    // ==========================================
    // ربط البيانات (Data Binding) زي الأصل بالظبط
    // ==========================================
    let allUsers = {}, allPresence = {}, allScores = {}, allRoles = {}, allXP = {}, allRooms = {}, allBadges = {}, allUserRanks = {};

    window.onValue(window.ref(window.db, 'usernames'), snap => { 
        allUsers = snap.val() || {}; document.getElementById('statUsers').innerText = Object.keys(allUsers).length; 
        window.renderUsers(); window.populateRankSelect(); window.populateBadgeSelect(); window.populateWarnSelect(); window.renderAssignList();
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
    window.onValue(window.ref(window.db, 'roles/users'), snap => { allUserRanks = snap.val() || {}; window.renderRanksList(); window.renderUsers(); window.renderAssignList(); });
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
        window.renderContent('quiz_requests', snap.val(), 'requestsList'); 
    });
    window.onValue(window.ref(window.db, 'custom_quizzes'), snap => { 
        window.renderCustomQuizzes(snap.val()); 
    });
    window.onValue(window.ref(window.db, 'site_stats/visitors'), snap => { document.getElementById('statVisitors').innerText = snap.exists() ? snap.val() : 0; });
    window.onValue(window.ref(window.db, 'warnings'), snap => { window.renderWarnings(snap.val()); });
    window.onValue(window.ref(window.db, 'banned_users'), snap => { window.renderBanned(snap.val()); });

    // ==========================================
    // الدوال الأساسية (Core Functions)
    // ==========================================
    
    window.renderAssignList = function() {
        const list = document.getElementById('assignList');
        if(!list) return;
        const searchInput = document.getElementById('assignSearch');
        const search = searchInput ? searchInput.value.toLowerCase() : '';
        
        let html = '';
        for (let u in allUsers) {
            if (u.toLowerCase() !== 'ahmed' && u.toLowerCase().includes(search)) {
                html += `
                <div class="item">
                    <div><h3>👤 ${u}</h3></div>
                    <div style="display:flex; gap:10px;">
                        <select class="form-control" style="width:150px; margin:0;" onchange="window.setStaffRole('${u}', this.value)">
                            <option value="Player" ${allUserRanks[u]==='Player'||!allUserRanks[u]?'selected':''}>لاعب عادي</option>
                            <option value="Admin" ${allUserRanks[u]==='Admin'?'selected':''}>أدمن</option>
                            <option value="Manager" ${allUserRanks[u]==='Manager'?'selected':''}>منجر</option>
                            <option value="Partner" ${allUserRanks[u]==='Partner'?'selected':''}>بارتنر</option>
                            <option value="Tester" ${allUserRanks[u]==='Tester'?'selected':''}>تستر</option>
                        </select>
                    </div>
                </div>`;
            }
        }
        list.innerHTML = html || '<p>لا يوجد لاعبين.</p>';
    };

    window.setStaffRole = async function(username, role) {
        await window.set(window.ref(window.db, 'roles/users/' + username), role);
        await window.remove(window.ref(window.db, 'roles/admins/' + username));
        await window.remove(window.ref(window.db, 'roles/managers/' + username));
        await window.remove(window.ref(window.db, 'roles/partners/' + username));
        await window.remove(window.ref(window.db, 'roles/testers/' + username));

        if(role === 'Admin') await window.set(window.ref(window.db, 'roles/admins/' + username), true);
        if(role === 'Manager') await window.set(window.ref(window.db, 'roles/managers/' + username), true);
        if(role === 'Partner') await window.set(window.ref(window.db, 'roles/partners/' + username), true);
        if(role === 'Tester') await window.set(window.ref(window.db, 'roles/testers/' + username), true);

        window.showToast(`تم تعيين ${username} كـ ${role}`);
    };

    window.onValue(window.ref(window.db, 'messages/owner_inbox'), snap => {
        const list = document.getElementById('ownerInboxList');
        if(!list) return;
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div class="item">لا توجد رسائل.</div>'; return; }
        
        Object.keys(snap.val()).reverse().forEach(key => {
            const msg = snap.val()[key];
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h4 style="color:var(--primary); font-size:14px;">${msg.from}</h4>
                    <p>${msg.text}</p>
                </div>
                <button class="btn btn-blue" onclick="window.replyToStaff('${msg.from}', '${key}')">رد ✉️</button>
            `;
            list.appendChild(div);
        });
    });

    window.replyToStaff = async function(senderStr, msgKey) {
        const username = senderStr.split(': ')[1] || 'Unknown';
        const reply = prompt(`اكتب ردك لـ ${username}:`);
        if(reply) {
            await window.push(window.ref(window.db, 'messages/' + username), { from: 'الإدارة (الأونر)', text: reply, time: Date.now() });
            await window.remove(window.ref(window.db, 'messages/owner_inbox/' + msgKey));
            window.showToast('تم إرسال الرد بنجاح!');
        }
    };

    window.renderUsers = function() {
        const container = document.getElementById('usersList'); if(!container) return;
        container.innerHTML = '';
        const search = document.getElementById('searchUser').value.toLowerCase();
        
        Object.keys(allUsers).filter(u => u.toLowerCase().includes(search) && u.toLowerCase() !== 'owner').forEach(u => {
            const isOnline = allPresence[u] && allPresence[u].status === 'online';
            const userXP = allXP[u] ? allXP[u].xp || 0 : 0;
            const userRank = allUserRanks[u] || 'Player';

            let roleTag = `<span style="color:var(--text-secondary); font-size:12px; background:var(--surface-2); padding:2px 6px; border-radius:4px;">${userRank}</span>`;
            let isAdmin = false;
            for (let adminName in allRoles) { if (adminName.toLowerCase() === u.toLowerCase()) { isAdmin = true; break; } }

            if (u.toLowerCase() === 'ahmed') {
                roleTag = '<span style="color:var(--primary); font-size:12px; background:var(--primary-light); padding:2px 6px; border-radius:4px;">👑 Owner</span>';
            } else if (isAdmin) {
                roleTag = '<span style="color:var(--info); font-size:12px; background:rgba(59,130,246,0.1); padding:2px 6px; border-radius:4px;">🛡️ Admin</span>';
            }

            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `
                <div>
                    <h3>${u} ${roleTag}</h3>
                    <p style="color:${isOnline ? 'var(--success)' : 'var(--text-secondary)'}; font-size:12px;">${isOnline ? '🟢 Online' : '⚪ Offline'} | XP: ${userXP}</p>
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
                <div><h3>👤 ${user}</h3><p style="color:var(--primary); font-weight:bold;">${allUserRanks[user]}</p></div>
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
                div.innerHTML = `<div><h3>👤 ${user}</h3><p style="font-size:12px; color:var(--primary);">${badges.join(' | ')}</p></div>
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
            div.innerHTML = `<div><h3 style="color:var(--primary);">👤 ${user}</h3><p>Reason: ${warn.text}</p></div><button class="btn btn-red" onclick="window.removeWarning('${user}')">Remove Warning 🗑️</button>`;
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
            div.innerHTML = `<div><p style="color:var(--primary); font-size:12px;">👤 ${c.user}</p><p>${c.text}</p></div><button class="btn btn-red" onclick="window.deleteItem('${node}', '${key}')">Delete 🗑️</button>`;
            container.appendChild(div);
        });
    };

    window.renderCustomQuizzes = function(data) {
        const container = document.getElementById('customQuizzesList'); if(!container) return;
        container.innerHTML = '';
        if (!data) { container.innerHTML = '<div class="item">لا توجد كويزات مخصصة.</div>'; return; }
        Object.keys(data).forEach(key => {
            const q = data[key]; const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><p style="color:var(--primary); font-weight:bold;">${q.name}</p><p style="font-size:12px; color:var(--text-secondary);">${q.cat}</p></div><button class="btn btn-red" onclick="window.deleteItem('custom_quizzes', '${key}')">Delete 🗑️</button>`;
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
        await window.push(window.ref(window.db, 'custom_quizzes'), { name, img, link, cat, addedBy: username, time: Date.now() });
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
            div.innerHTML = `<div><p>Room Code: <b style="color:var(--primary)">${room}</b></p><p style="font-size:12px; color:var(--text-secondary);">Status: ${allRooms[room].status}</p></div><button class="btn btn-red" onclick="window.deleteRoom('${room}')">Delete 🗑️</button>`;
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
            div.innerHTML = `<div><h3>🛡️ ${user}</h3></div><button class="btn btn-red" onclick="window.removeAdmin('${user}')">Remove Admin 🗑️</button>`;
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
            div.innerHTML = `<div><h3 style="color:var(--danger);">🚫 ${user}</h3><p style="font-size:12px; color:var(--text-secondary);">Reason: ${data[user].reason || 'غير محدد'}</p></div><button class="btn btn-green" onclick="window.unbanUser('${user}')">Unban ✅</button>`;
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

    window.clearSiteCache = async () => {
        if(confirm('هل أنت متأكد من مسح الكاش؟ سيتم تحديث الموقع لجميع اللاعبين عند فتحهم للصفحة القادمة.')) {
            await window.set(window.ref(window.db, 'site_settings/version'), Date.now());
            window.showToast('تم مسح الكاش بنجاح! الموقع سيحدث للجميع.');
        }
    };

    // ==========================================
    // إدارة المنجر والعروض
    // ==========================================
    window.onValue(window.ref(window.db, 'manager_requests/drafts'), snap => {
        const list = document.getElementById('managerDraftsList'); if(!list) return;
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div class="item">لا توجد مسودات.</div>'; return; }
        const data = snap.val();
        const namesAr = { rules: '📜 قوانين الموقع', announcement: '📢 إعلان', faq: '❓ أسئلة شائعة', welcome: '👋 رسالة ترحيب', journey: '🛣️ رحلة مستخدم', terms: '📝 شروط مسابقات', performance: '📊 تقييم فريق' };
        for(let key in data) {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><h3 style="color:var(--primary);">${namesAr[key] || key}</h3><p style="font-size:14px; color:var(--text-secondary); margin-top:5px;">${data[key]}</p></div><div style="display:flex; gap:5px;"><button class="btn btn-green" onclick="window.approveDraft('${key}', '${data[key].replace(/'/g, "\\'")}')">نشر ✅</button><button class="btn btn-red" onclick="window.deleteDraft('${key}')">مسح 🗑️</button></div>`;
            list.appendChild(div);
        }
    });

    window.onValue(window.ref(window.db, 'manager_requests'), snap => {
        const list = document.getElementById('managerReqsList'); if(!list) return;
        list.innerHTML = '';
        const data = snap.val();
        if(!data) { list.innerHTML = '<div class="item">لا توجد طلبات.</div>'; return; }
        const ignored = ['drafts', 'offers', 'contests'];
        const namesAr = { tournaments: '🏆 بطولات', player_week: '⭐ لاعب الأسبوع', matches: '⚔️ مباريات', ideas: '💡 أفكار كويزات', vip_notes: '👑 ملاحظات VIP', sponsor_replies: '🤝 ردود شركاء', shifts: '⏰ شفتات', team_tasks: '📋 مهام فريق', dev_requests: '🛠️ طلبات تطوير', calendar: '📅 فعاليات', tester_tasks: '🧪 مهام تسترات', bugs: '🐛 مشاكل', marketing: '📢 تسويق', meetings: '🤝 اجتماعات', discounts: '💸 خصومات' };
        let hasReqs = false;
        for(let key in data) {
            if(ignored.includes(key)) continue;
            for(let reqId in data[key]) {
                hasReqs = true;
                const req = data[key][reqId];
                const div = document.createElement('div'); div.className = 'item';
                div.innerHTML = `<div><h3 style="color:var(--info); font-size:16px;">${namesAr[key] || key}</h3><p>${req.text}</p></div><button class="btn btn-green" onclick="window.deleteReq('${key}', '${reqId}')">تم ✅</button>`;
                list.appendChild(div);
            }
        }
        if(!hasReqs) list.innerHTML = '<div class="item">لا توجد طلبات حالياً.</div>';
    });

    window.onValue(window.ref(window.db, 'manager_requests/offers'), snap => {
        const list = document.getElementById('managerOffersList'); if(!list) return;
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div class="item">لا توجد عروض حالياً.</div>'; return; }
        const data = snap.val();
        for(let key in data) {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><h3 style="color:var(--primary);">🎁 ${data[key].text}</h3></div><div style="display:flex; gap:5px;"><button class="btn btn-green" onclick="window.approveOffer('${key}', '${data[key].text}')">نشر ✅</button><button class="btn btn-red" onclick="window.deleteReq('offers', '${key}')">رفض ❌</button></div>`;
            list.appendChild(div);
        }
    });

    window.onValue(window.ref(window.db, 'manager_requests/contests'), snap => {
        const list = document.getElementById('managerContestsList'); if(!list) return;
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div class="item">لا توجد مسابقات حالياً.</div>'; return; }
        const data = snap.val();
        for(let key in data) {
            const div = document.createElement('div'); div.className = 'item';
            div.innerHTML = `<div><h3 style="color:var(--primary);">🏆 ${data[key].text}</h3></div><div style="display:flex; gap:5px;"><button class="btn btn-green" onclick="window.approveContest('${key}', '${data[key].text}')">نشر ✅</button><button class="btn btn-red" onclick="window.deleteReq('contests', '${key}')">رفض ❌</button></div>`;
            list.appendChild(div);
        }
    });

    window.approveOffer = async (key, text) => {
        await window.set(window.ref(window.db, 'site_events/active_offers/' + key), { text: text, approved: Date.now() });
        await window.remove(window.ref(window.db, 'manager_requests/offers/' + key));
        window.showToast('تم نشر العرض!');
    };

    window.approveContest = async (key, text) => {
        await window.set(window.ref(window.db, 'site_events/active_contests/' + key), { text: text, approved: Date.now() });
        await window.remove(window.ref(window.db, 'manager_requests/contests/' + key));
        window.showToast('تم نشر المسابقة!');
    };

    window.approveDraft = async (key, text) => {
        if(confirm('هل أنت متأكد من نشر هذه المسودة؟')) {
            if(key === 'rules') await window.set(window.ref(window.db, 'site_settings/rules'), text);
            if(key === 'announcement') await window.set(window.ref(window.db, 'site_settings/announcement'), text);
            await window.remove(window.ref(window.db, 'manager_requests/drafts/' + key));
            window.showToast('تم النشر بنجاح!');
        }
    };

    window.deleteDraft = async (key) => {
        if(confirm('مسح المسودة؟')) {
            await window.remove(window.ref(window.db, 'manager_requests/drafts/' + key));
            window.showToast('تم المسح');
        }
    };

    window.deleteReq = async (node, id) => {
        await window.remove(window.ref(window.db, 'manager_requests/' + node + '/' + id));
        window.showToast('تم الإنجاز');
    };
}