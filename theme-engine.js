import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const app = getApps().length ? getApp() : initializeApp(FB);
const db = getDatabase(app);
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

if (CU) {
  let bgEl = document.getElementById('app-bg');
  if (!bgEl) { bgEl = document.createElement('div'); bgEl.id = 'app-bg'; document.body.prepend(bgEl); }

  let ovEl = document.getElementById('app-overlay');
  if (!ovEl) { ovEl = document.createElement('div'); ovEl.id = 'app-overlay'; document.body.prepend(ovEl); }

  let particlesContainer = document.getElementById('theme-particles');
  if (!particlesContainer) {
    particlesContainer = document.createElement('div');
    particlesContainer.id = 'theme-particles';
    document.body.appendChild(particlesContainer);
  }

  let styleEl = document.getElementById('dynamic-theme-style');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'dynamic-theme-style'; document.head.appendChild(styleEl); }

  let cachedTheme = null;
  try {
    const raw = localStorage.getItem('theme_cache');
    if (raw) cachedTheme = JSON.parse(raw);
  } catch(e) {}

  let isPreviewing = false;
  let realTheme = null;

  function applyTheme(theme) {
    const color = theme.color || '#ff0000';
    const bgImage = theme.bgImage ? `url('${theme.bgImage}')` : 'none';
    const bgColor = theme.bgColor || '#050510'; // لون غامق افتراضي
    const presetId = theme.presetId || 'default';
    const animation = theme.animation || 'none';

    const overlayColor = 'rgba(0,0,0,0.2)'; 

    // هنا التعديل: استخدمنا background بدل background-color عشان نمسح الـ gradient الفاتح
    styleEl.innerHTML = `
      body { background: ${bgColor} !important; background-image: none !important; overflow-x: hidden !important; }
      #app-bg { position: fixed; inset: 0; z-index: -3; background-image: ${bgImage}; background-size: cover; background-position: center; transition: opacity 0.5s; animation: smoothZoom 20s infinite alternate ease-in-out; }
      #app-overlay { position: fixed; inset: 0; z-index: -2; background: ${overlayColor}; }
      :root, body { --accent: ${color} !important; --primary: ${color} !important; --gold: ${color} !important; }
      
      @keyframes smoothZoom { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }

      #theme-particles { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
      .particle { position: absolute; top: -10vh; }

      .particle.sakura { background: #ffb7c5; border-radius: 12px 0 12px 0; box-shadow: 0 0 5px rgba(255,183,197,0.8); animation: fallRotate linear infinite; }
      @keyframes fallRotate { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }

      .particle.rain { width: 2px !important; height: 30px !important; background: rgba(255,255,255,0.8); border-radius: 2px; box-shadow: 0 0 5px rgba(255,255,255,0.5); animation: fallStraight linear infinite; }
      @keyframes fallStraight { 0% { transform: translateY(0); } 100% { transform: translateY(110vh); } }

      .particle.fire { border-radius: 50%; background: #ff5500; box-shadow: 0 0 15px #ff0000, 0 0 30px #ff5500; animation: rise linear infinite; }
      @keyframes rise { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-110vh) scale(0); opacity: 0; } }

      .particle.star { background: #fff; border-radius: 50%; box-shadow: 0 0 10px #fff, 0 0 20px #ffd700; animation: twinkle ease-in-out infinite alternate; }
      @keyframes twinkle { 0%, 100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.5); } }

      @keyframes pulseBg { from { filter: brightness(1); } to { filter: brightness(1.2); } }
    `;

    document.body.style.animation = '';
    if (animation === 'pulse') {
      document.body.style.animation = 'pulseBg 3s infinite alternate';
    }

    particlesContainer.innerHTML = '';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const isMobile = window.innerWidth < 768;
    const factor = isMobile ? 0.5 : 1;

    function createParticles(type, count) {
      const n = Math.max(10, Math.floor(count * factor));
      for (let i = 0; i < n; i++) {
        const p = document.createElement('div');
        p.className = `particle ${type}`;
        p.style.left = `${Math.random() * 100}%`;
        if (type === 'star') {
          p.style.top = `${Math.random() * 100}%`;
          p.style.animationDuration = `${Math.random() * 2 + 0.5}s`;
          p.style.animationDelay = `${Math.random() * 2}s`;
          p.style.width = p.style.height = `${Math.random() * 4 + 2}px`;
        } else if (type === 'fire') {
          p.style.bottom = `-10vh`;
          p.style.animationDuration = `${Math.random() * 2 + 1}s`;
          p.style.animationDelay = `-${Math.random() * 3}s`;
          p.style.width = p.style.height = `${Math.random() * 8 + 4}px`;
        } else {
          p.style.animationDuration = `${Math.random() * 3 + 1.5}s`;
          p.style.animationDelay = `-${Math.random() * 5}s`;
          if (type === 'sakura') p.style.width = p.style.height = `${Math.random() * 10 + 6}px`;
        }
        particlesContainer.appendChild(p);
      }
    }

    if (presetId === 'leg_sakura' || animation === 'sakura') createParticles('sakura', 80);
    else if (presetId === 'leg_storm' || animation === 'rain') createParticles('rain', 200);
    else if (presetId === 'leg_fire' || animation === 'fire') createParticles('fire', 100);
    else if (presetId === 'leg_space' || animation === 'star') createParticles('star', 150);
  }

  if (cachedTheme) {
    applyTheme(cachedTheme);
  }

  onValue(ref(db, `users_data/${CU}/activeTheme`), (snap) => {
    const theme = snap.val() || {};
    realTheme = {
      color: theme.color || '#ff0000',
      bgImage: theme.bgImage || null,
      bgColor: theme.bgColor || '#050510',
      presetId: theme.presetId || 'default',
      animation: theme.animation || 'none'
    };
    
    if (!isPreviewing) {
      applyTheme(realTheme);
    }
    
    try { localStorage.setItem('theme_cache', JSON.stringify(realTheme)); } catch(e) {}
  }, (err) => {
    console.error('[theme-engine] Firebase error:', err);
  });

  window.applyTemporaryTheme = (bgImage, animation) => {
    isPreviewing = true;
    const previewObj = {
      bgImage: bgImage,
      animation: animation,
      color: '#ff0000',
      presetId: 'preview'
    };
    applyTheme(previewObj);
  };

  window.revertTheme = () => {
    isPreviewing = false;
    if (realTheme) {
      applyTheme(realTheme);
    }
  };
}