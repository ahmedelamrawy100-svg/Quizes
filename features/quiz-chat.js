/* ═══════════════════════════════════════════════════════════════════
   FEATURE: IN-GAME QUIZ CHAT (Floating Button + Panel + Translation)
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, onValue, push, currentUser, showToast, escapeHtml } from '../firebase-shared.js';

let currentRoomId = null;
let unsubscribe = null;
let isOpen = false;
let unreadCount = 0;

// الترجمات
const translations = {
    ar: {
        chatTitle: "شات التحدي",
        placeholder: "اكتب رسالتك هنا...",
        send: "📤",
        empty: "لا توجد رسائل بعد. كن الأول!",
        newMsg: "رسالة جديدة!"
    },
    en: {
        chatTitle: "Match Chat",
        placeholder: "Type your message...",
        send: "📤",
        empty: "No messages yet. Be the first!",
        newMsg: "New message!"
    }
};

function getLang() {
    return localStorage.getItem('lang') || 'ar';
}

// دالة إضافة الستايلات
function injectChatStyles() {
    if (document.getElementById('quizChatStyles')) return;
    const style = document.createElement('style');
    style.id = 'quizChatStyles';
    style.innerHTML = `
        /* زرار الشات العائم */
        #quizChatBtn {
            position: fixed; bottom: 20px; left: 20px; z-index: 1002;
            background: linear-gradient(135deg, #0088cc, #005580);
            color: #fff; border: 2px solid #fff; width: 60px; height: 60px;
            border-radius: 50%; font-size: 24px; cursor: pointer;
            box-shadow: 0 5px 20px rgba(0,136,204,0.6); transition: 0.3s;
            display: flex; align-items: center; justify-content: center;
            font-family: Cairo, sans-serif;
        }
        #quizChatBtn:hover { transform: scale(1.1); box-shadow: 0 8px 30px rgba(0,136,204,0.9); }
        
        /* شارة الرسائل غير المقروءة */
        #chatUnreadBadge {
            position: absolute; top: -5px; right: -5px;
            background: #ff0000; color: #fff; border-radius: 50%;
            min-width: 22px; height: 22px; font-size: 12px;
            display: none; align-items: center; justify-content: center;
            font-weight: 900; border: 2px solid #fff;
        }

        /* لوحة الشات */
        #quizChatPanel {
            position: fixed; bottom: 90px; left: 20px; z-index: 1003;
            width: 320px; max-width: calc(100vw - 40px); height: 400px;
            max-height: calc(100vh - 120px);
            background: #111; border: 2px solid #0088cc; border-radius: 15px;
            display: flex; flex-direction: column; overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.8); direction: rtl;
            font-family: Cairo, sans-serif;
            transition: opacity 0.3s, transform 0.3s;
            opacity: 0; pointer-events: none; transform: translateY(20px);
        }
        #quizChatPanel.open { opacity: 1; pointer-events: auto; transform: translateY(0); }

        /* هيدر الشات */
        .chat-header {
            background: #0088cc; color: #fff; padding: 12px 15px;
            font-weight: bold; font-size: 16px; display: flex;
            justify-content: space-between; align-items: center;
            flex-shrink: 0;
        }
        .chat-close-btn {
            background: transparent; border: none; color: #fff;
            font-size: 18px; cursor: pointer; padding: 0 5px;
        }
        .chat-close-btn:hover { color: #ff0000; }

        /* مساحة الرسائل */
        .chat-messages {
            flex: 1; padding: 15px; overflow-y: auto;
            display: flex; flex-direction: column; gap: 10px;
            background: #0a0a0a;
        }
        .chat-messages::-webkit-scrollbar { width: 6px; }
        .chat-messages::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        /* فقاعة الرسالة */
        .chat-msg {
            padding: 8px 12px; border-radius: 12px; font-size: 14px;
            line-height: 1.4; max-width: 85%; word-wrap: break-word;
        }
        .chat-msg.mine {
            background: #0088cc; color: #fff;
            align-self: flex-end; border-bottom-left-radius: 2px;
        }
        .chat-msg.theirs {
            background: #222; color: #eee; border: 1px solid #333;
            align-self: flex-start; border-bottom-right-radius: 2px;
        }
        .chat-msg-sender { font-size: 11px; font-weight: bold; color: #ffd700; margin-bottom: 3px; }
        .chat-msg-time { font-size: 10px; opacity: 0.6; margin-top: 3px; text-align: left; }

        /* مساحة الكتابة */
        .chat-input-area {
            padding: 10px; background: #111; border-top: 1px solid #333;
            display: flex; gap: 8px; flex-shrink: 0;
        }
        .chat-input-area input {
            flex: 1; padding: 10px 12px; border-radius: 20px;
            border: 1px solid #444; background: #000; color: #fff;
            font-family: Cairo, sans-serif; font-size: 14px; outline: none;
        }
        .chat-input-area input:focus { border-color: #0088cc; }
        .chat-input-area button {
            padding: 0 15px; border-radius: 20px; border: none;
            background: #0088cc; color: #fff; font-weight: bold;
            font-family: Cairo, sans-serif; cursor: pointer; transition: 0.2s;
        }
        .chat-input-area button:hover { background: #005580; }

        /* في حالة عدم وجود رسائل */
        .chat-empty {
            text-align: center; color: #666; font-size: 13px;
            margin-top: 50px; padding: 20px;
        }
        
        /* تعديل اتجاه النص في الوضع الإنجليزي */
        body[dir="ltr"] #quizChatPanel { direction: ltr; }
        body[dir="ltr"] .chat-msg.mine { border-bottom-left-radius: 12px; border-bottom-right-radius: 2px; align-self: flex-end; }
        body[dir="ltr"] .chat-msg.theirs { border-bottom-right-radius: 12px; border-bottom-left-radius: 2px; align-self: flex-start; }
        body[dir="ltr"] .chat-msg-time { text-align: right; }
    `;
    document.head.appendChild(style);
}

// دالة إنشاء واجهة الشات
function createChatUI() {
    if (document.getElementById('quizChatBtn')) return;

    const lang = getLang();
    const t = translations[lang];

    // زرار الشات
    const btn = document.createElement('button');
    btn.id = 'quizChatBtn';
    btn.innerHTML = `💬<span id="chatUnreadBadge">0</span>`;
    btn.title = t.chatTitle;
    btn.onclick = toggleChat;
    document.body.appendChild(btn);

    // لوحة الشات
    const panel = document.createElement('div');
    panel.id = 'quizChatPanel';
    panel.innerHTML = `
        <div class="chat-header">
            <span>💬 <span id="chatHeaderTitle">${t.chatTitle}</span></span>
            <button class="chat-close-btn" onclick="window._toggleQuizChat(false)">✖</button>
        </div>
        <div class="chat-messages" id="chatMessagesBox">
            <div class="chat-empty" id="chatEmptyMsg">${t.empty}</div>
        </div>
        <div class="chat-input-area">
            <input type="text" id="chatMsgInput" placeholder="${t.placeholder}" onkeypress="if(event.key==='Enter') window._sendQuizChat()">
            <button id="chatSendBtn" onclick="window._sendQuizChat()">${t.send}</button>
        </div>
    `;
    document.body.appendChild(panel);
}

// دالة فتح/قفل الشات
window._toggleQuizChat = function(state) {
    isOpen = (state !== undefined) ? state : !isOpen;
    const panel = document.getElementById('quizChatPanel');
    const badge = document.getElementById('chatUnreadBadge');
    
    if (isOpen) {
        panel.classList.add('open');
        if (badge) { badge.style.display = 'none'; unreadCount = 0; }
        document.getElementById('chatMsgInput')?.focus();
        // النزول لآخر رسالة
        const box = document.getElementById('chatMessagesBox');
        if (box) box.scrollTop = box.scrollHeight;
    } else {
        panel.classList.remove('open');
    }
};

function toggleChat() { window._toggleQuizChat(); }

// دالة إرسال الرسالة
window._sendQuizChat = async function() {
    const input = document.getElementById('chatMsgInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !currentRoomId) return;
    
    // حد أقصى 150 حرف
    if (text.length > 150) {
        showToast(getLang() === 'ar' ? 'الرسالة طويلة جداً!' : 'Message too long!', 'error');
        return;
    }

    try {
        await push(ref(db, `rooms/${currentRoomId}/chat`), {
            user: currentUser,
            text: text,
            time: Date.now()
        });
        input.value = '';
    } catch (e) {
        showToast(e.message, 'error');
    }
};

// تحميل الرسائل
function loadChat() {
    if (!currentRoomId) return;
    if (unsubscribe) unsubscribe();

    unsubscribe = onValue(ref(db, `rooms/${currentRoomId}/chat`), snap => {
        const data = snap.val() || {};
        const messages = Object.entries(data).sort((a, b) => (a[1].time || 0) - (b[1].time || 0));
        const box = document.getElementById('chatMessagesBox');
        if (!box) return;

        if (messages.length === 0) {
            box.innerHTML = `<div class="chat-empty" id="chatEmptyMsg">${translations[getLang()].empty}</div>`;
            return;
        }

        const lang = getLang();
        
        box.innerHTML = messages.map(([id, m]) => {
            const isMine = (m.user || '').toLowerCase() === currentUser.toLowerCase();
            const time = m.time ? new Date(m.time).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            
            return `
                <div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
                    ${!isMine ? `<div class="chat-msg-sender">👤 ${escapeHtml(m.user)}</div>` : ''}
                    <div>${escapeHtml(m.text)}</div>
                    <div class="chat-msg-time">${time}</div>
                </div>
            `;
        }).join('');

        // التعامل مع عداد الرسائل غير المقروءة
        if (!isOpen) {
            unreadCount++;
            const badge = document.getElementById('chatUnreadBadge');
            if (badge) {
                badge.innerText = unreadCount > 9 ? '+9' : unreadCount;
                badge.style.display = 'flex';
            }
        }

        // النزول لآخر رسالة
        box.scrollTop = box.scrollHeight;
    });
}

// تحديث ترجمة الشات لو المستخدم غير اللغة وهو جوه
window.addEventListener('languageChanged', () => {
    const lang = getLang();
    const t = translations[lang];
    const title = document.getElementById('chatHeaderTitle');
    const input = document.getElementById('chatMsgInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const emptyMsg = document.getElementById('chatEmptyMsg');
    
    if (title) title.innerText = t.chatTitle;
    if (input) input.placeholder = t.placeholder;
    if (sendBtn) sendBtn.innerText = t.send;
    if (emptyMsg) emptyMsg.innerText = t.empty;
});

export function initQuizChat(roomId) {
    if (!roomId) return;
    currentRoomId = roomId;
    
    injectChatStyles();
    
    createChatUI();
    
    loadChat();
}

window.NFQuizChat = { initQuizChat };