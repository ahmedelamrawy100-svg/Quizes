/* ═══════════════════════════════════════════════════════════════════
   FEATURE 7: PROFILE THEMES (ثيمات البروفايل)
   Node: purchased_themes/{userId}/{themeId} = true
         users_data/{userId}/activeTheme = themeId
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

// كتالوج الثيمات
export const PROFILE_THEMES = [
  { id: 'default',   name: 'افتراضي',  icon: '⚪', price: 0,    colors: ['#ff0000', '#111'] },
  { id: 'neon',      name: 'نيون',     icon: '💠', price: 500,  colors: ['#00ffff', '#0a0a2e'] },
  { id: 'gold',      name: 'ذهبي',     icon: '👑', price: 1000, colors: ['#ffd700', '#1a1a00'] },
  { id: 'ocean',     name: 'محيط',     icon: '🌊', price: 800,  colors: ['#0088cc', '#001a2e'] },
  { id: 'forest',    name: 'غابة',     icon: '🌲', price: 800,  colors: ['#10b981', '#0a1a10'] },
  { id: 'sunset',    name: 'غروب',     icon: '🌅', price: 1200, colors: ['#ec4899', '#2e001a'] },
  { id: 'blood',     name: 'دم',       icon: '🩸', price: 1500, colors: ['#ef4444', '#1a0000'] },
  { id: 'galaxy',    name: 'مجرة',     icon: '🌌', price: 2000, colors: ['#a855f7', '#1a002e'] },
  { id: 'legendary', name: 'أسطوري',   icon: '💎', price: 5000, colors: ['#ffd700', '#a855f7'] },
];

let ownedCache = {};
let activeThemeId = 'default';

export function initThemes() {
  if (!CU) return;
  onValue(ref(db, `purchased_themes/${CU}`), snap => {
    ownedCache = snap.val() || {};
    ownedCache['default'] = true;
  });
  onValue(ref(db, `users_data/${CU}/activeTheme`), snap => {
    activeThemeId = snap.val() || 'default';
    applyTheme(activeThemeId);
  });
}

export function applyTheme(themeId) {
  const theme = PROFILE_THEMES.find(t => t.id === themeId) || PROFILE_THEMES[0];
  document.documentElement.style.setProperty('--accent', theme.colors[0]);
  document.documentElement.style.setProperty('--primary', theme.colors[0]);
}

export async function buyTheme(themeId) {
  const theme = PROFILE_THEMES.find(t => t.id === themeId);
  if (!theme) return { error: 'الثيم مش موجود' };
  if (ownedCache[themeId]) return { error: 'الثيم عندك بالفعل' };

  const coinsSnap = await get(ref(db, `users_data/${CU}/coins`));
  const coins = coinsSnap.val() || 0;
  if (coins < theme.price) return { error: `محتاج ${theme.price} كوينز (عندك ${coins})` };

  await update(ref(db, `users_data/${CU}`), { coins: coins - theme.price });
  await set(ref(db, `purchased_themes/${CU}/${themeId}`), { boughtAt: Date.now(), price: theme.price });
  return { success: true };
}

export async function activateTheme(themeId) {
  if (!ownedCache[themeId] && themeId !== 'default') {
    return { error: 'لازم تشتري الثيم الأول' };
  }
  await set(ref(db, `users_data/${CU}/activeTheme`), themeId);
  activeThemeId = themeId;
  applyTheme(themeId);
  return { success: true };
}

export function renderThemesGrid(container) {
  if (!CU) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#aaa;">سجل دخول الأول</p>'; return; }
  container.innerHTML = PROFILE_THEMES.map(theme => {
    const owned = !!ownedCache[theme.id];
    const active = activeThemeId === theme.id;
    return `
      <div class="theme-card ${active ? 'active' : ''}" data-theme="${theme.id}">
        ${active ? '<span class="theme-active-badge">✓ نشط</span>' : ''}
        <div class="theme-preview" style="background: linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]});">
          <div style="position:absolute; bottom:8px; right:8px; font-size:24px;">${theme.icon}</div>
        </div>
        <div class="theme-name">${theme.name}</div>
        <div class="theme-price">${owned ? (active ? '✅ نشط' : '✅ مملوك') : `${theme.price} 🪙`}</div>
        ${!owned ? `<button class="nf-btn nf-btn-primary" style="width:100%; margin-top:8px; font-size:12px;" onclick="window._buyTheme('${theme.id}', this)">🛒 شراء</button>` : 
          (!active ? `<button class="nf-btn nf-btn-success" style="width:100%; margin-top:8px; font-size:12px;" onclick="window._activateTheme('${theme.id}')">✅ استخدم</button>` : '')}
      </div>
    `;
  }).join('');
}

window._buyTheme = async (themeId, btn) => {
  btn.disabled = true;
  btn.textContent = '⏳...';
  const r = await buyTheme(themeId);
  if (r.error) { btn.disabled = false; btn.textContent = '🛒 شراء'; return showToast(r.error, 'error'); }
  showToast('🎉 اشتريت الثيم!', 'gold');
  renderThemesGrid(document.getElementById('themes-grid'));
};

window._activateTheme = async (themeId) => {
  const r = await activateTheme(themeId);
  if (r.error) return showToast(r.error, 'error');
  showToast('✅ الثيم اتنشط', 'info');
  renderThemesGrid(document.getElementById('themes-grid'));
};

function showToast(msg, type = 'success') {
  const c = document.getElementById('nf-toast-container') || (() => {
    const cc = document.createElement('div');
    cc.id = 'nf-toast-container'; cc.className = 'nf-toast-container';
    document.body.appendChild(cc); return cc;
  })();
  const t = document.createElement('div');
  t.className = 'nf-toast ' + (type !== 'success' ? type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

window.NFThemes = { initThemes, buyTheme, activateTheme, renderThemesGrid, PROFILE_THEMES };