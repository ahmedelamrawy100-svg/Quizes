import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, runTransaction, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", 
    authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", 
    databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", 
    projectId: "quiz-hub-app-f4cd0", 
    storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", 
    messagingSenderId: "282772179392", 
    appId: "1:282772179392:web:64646d757592b29ff3a025" 
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);

// 1. دالة حقن واجهة الزعيم في الصفحة
function injectWorldBossUI() {
    if (document.getElementById('worldBossWidget')) return;

    const widgetHTML = `
    <div id="worldBossWidget" style="display: none; width: 100%; max-width: 1200px; margin: 0 auto 20px auto; background: linear-gradient(135deg, #1a0000, #330000); border: 2px solid #ff0000; border-radius: 15px; padding: 20px; box-shadow: 0 0 30px rgba(255,0,0,0.3); position: relative; overflow: hidden; direction: rtl;">
        <div style="position: absolute; top: -50px; right: -50px; font-size: 150px; opacity: 0.05; pointer-events: none;">👹</div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; position: relative; z-index: 2;">
            <div>
                <h2 style="color: #ff0000; margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px; font-family: Cairo, sans-serif;">
                    <span style="animation: pulse 2s infinite;">👹</span> الزعيم العالمي: <span id="bossName" style="color: #ffd700;">جاري التحميل...</span>
                </h2>
                <p style="color: #aaa; margin: 5px 0 0 0; font-size: 14px; font-family: Cairo, sans-serif;">اتحد مع باقي اللاعبين عشان تهزموه!</p>
            </div>
            <div style="text-align: left; direction: ltr; font-family: Cairo, sans-serif;">
                <span style="color: #ffd700; font-weight: bold; font-size: 18px;" id="bossHpText">0 / 0 HP</span>
            </div>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.8); height: 25px; border-radius: 15px; margin-top: 15px; overflow: hidden; border: 1px solid #551111; position: relative; z-index: 2;">
            <div id="bossHpBar" style="width: 100%; height: 100%; background: linear-gradient(90deg, #ff0000, #8b0000); transition: width 1s ease-out; box-shadow: 0 0 10px #ff0000;"></div>
            <div style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; font-size: 12px; font-weight: bold; color: #fff; text-shadow: 1px 1px 2px #000; font-family: Cairo, sans-serif;" id="bossPercent">100%</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 13px; color: #aaa; font-family: Cairo, sans-serif; position: relative; z-index: 2;">
            <span>⚔️ ضررك: <b id="myBossDamage" style="color: #ff9800;">0</b></span>
            <span>⏳ ينتهي: <b id="bossTimeLeft" style="color: #00bcd4;">--</b></span>
        </div>
    </div>
    `;

    const mainContent = document.getElementById('mainContent');
    const announcementBar = document.getElementById('announcement-bar');
    
    if (announcementBar) {
        announcementBar.insertAdjacentHTML('afterend', widgetHTML);
    } else if (mainContent) {
        mainContent.insertAdjacentHTML('afterbegin', widgetHTML);
    } else {
        document.body.insertAdjacentHTML('afterbegin', widgetHTML);
    }
}

// 2. الاستماع للبيانات
export function listenToWorldBoss() {
    // حقن الواجهة أول ما الصفحة تفتح
    setTimeout(injectWorldBossUI, 1000);

    const currentUser = (localStorage.getItem('loggedInUser') || '').toLowerCase();
    if (!currentUser) return; // لو مش مسجل دخول مفيش داتا هتظهر

    onValue(ref(db, 'world_boss/current'), (snapshot) => {
        const widget = document.getElementById('worldBossWidget');
        if (!widget) return;

        // لو مفيش بيانات في الفايربيز، نخفي الواجهة
        if (!snapshot.exists()) {
            widget.style.display = 'none';
            console.log("World Boss: No data in Firebase yet.");
            return;
        }

        const boss = snapshot.val();
        
        if (!boss.active || boss.currentHp <= 0) {
            widget.style.display = 'none';
            return;
        }

        // إظهار الواجهة
        widget.style.display = 'block';
        
        const nameEl = document.getElementById('bossName');
        const hpTextEl = document.getElementById('bossHpText');
        const hpBarEl = document.getElementById('bossHpBar');
        const percentEl = document.getElementById('bossPercent');

        if (nameEl) nameEl.innerText = boss.name || 'زعيم مجهول';
        if (hpTextEl) hpTextEl.innerText = `${(boss.currentHp || 0).toLocaleString()} / ${(boss.maxHp || 0).toLocaleString()} HP`;
        
        const percent = Math.max(0, Math.min(100, ((boss.currentHp || 0) / (boss.maxHp || 1)) * 100));
        if (hpBarEl) hpBarEl.style.width = `${percent}%`;
        if (percentEl) percentEl.innerText = `${Math.round(percent)}%`;
    });

    // الاستماع لضرر اللاعب
    onValue(ref(db, `world_boss/damage/${currentUser}`), (snapshot) => {
        const myDmg = document.getElementById('myBossDamage');
        if (myDmg) myDmg.innerText = snapshot.exists() ? snapshot.val().toLocaleString() : '0';
    });
}

// 3. إرسال الضرر
export async function sendDamageToBoss(playerScore) {
    const currentUser = (localStorage.getItem('loggedInUser') || '').toLowerCase();
    if (!currentUser || playerScore <= 0) return;

    try {
        const bossSnap = await get(ref(db, 'world_boss/current'));
        if (!bossSnap.exists()) return;
        
        const boss = bossSnap.val();
        if (!boss.active || boss.currentHp <= 0) return;

        const damage = playerScore * 10;

        // خصم الدم بأمان
        await runTransaction(ref(db, 'world_boss/current/currentHp'), (currentHp) => {
            if (currentHp === null) return null;
            return Math.max(0, currentHp - damage);
        });

        // تسجيل ضرر اللاعب
        await runTransaction(ref(db, `world_boss/damage/${currentUser}`), (currentDmg) => {
            return (currentDmg || 0) + damage;
        });

    } catch (e) {
        console.error("World Boss Error:", e);
    }
}

// تشغيل تلقائي
listenToWorldBoss();