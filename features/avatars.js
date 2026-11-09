import { db, ref, get, set, update, currentUser, showToast } from '../firebase-shared.js';

export const AVATAR_CATALOG = [
  { id: 'default', name: 'افتراضي', icon: '👤', price: 0, rarity: 'common' },
  { id: 'ninja', name: 'نينجا', icon: '🥷', price: 500, rarity: 'common' },
  { id: 'knight', name: 'فارس', icon: '🛡️', price: 800, rarity: 'common' },
  { id: 'wizard', name: 'ساحر', icon: '🧙', price: 1000, rarity: 'rare' },
  { id: 'dragon', name: 'تنين', icon: '🐉', price: 2500, rarity: 'rare' },
  { id: 'pirate', name: 'قرصان', icon: '🏴‍☠️', price: 1500, rarity: 'rare' },
  { id: 'ghost', name: 'شبح', icon: '👻', price: 2000, rarity: 'epic' },
  { id: 'robot', name: 'روبوت', icon: '🤖', price: 3000, rarity: 'epic' },
  { id: 'alien', name: 'فضائي', icon: '👽', price: 3500, rarity: 'epic' },
  { id: 'king', name: 'ملك', icon: '👑', price: 5000, rarity: 'legendary' },
  { id: 'phoenix', name: 'عنقاء', icon: '🔥', price: 8000, rarity: 'legendary' },
  { id: 'mystery_rare', name: 'أسطوري', icon: '💎', price: 0, rarity: 'legendary', hidden: true }
];

const RARITY_COLORS = { common: '#888', rare: '#2196f3', epic: '#9c27b0', legendary: '#ffd700' };

export async function getCurrentAvatar() {
  const snap = await get(ref(db, `avatars/current/${currentUser}`));
  return snap.val() || 'default';
}

export async function getOwnedAvatars() {
  const snap = await get(ref(db, `avatars/owned/${currentUser}`));
  return snap.val() || { default: true };
}

export async function buyAvatar(avatarId) {
  const av = AVATAR_CATALOG.find(a => a.id === avatarId);
  if (!av) return { error: 'مش موجود' };
  if (av.price === 0) return { error: 'مجاني بالفعل' };
  
  const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
  const coins = coinsSnap.val() || 0;
  if (coins < av.price) return { error: `محتاج ${av.price} كوينز` };
  
  await update(ref(db, `users_data/${currentUser}`), { coins: coins - av.price });
  await set(ref(db, `avatars/owned/${currentUser}/${avatarId}`), true);
  return { success: true };
}

export async function equipAvatar(avatarId) {
  const owned = await getOwnedAvatars();
  if (!owned[avatarId]) return { error: 'مش عندك الأفاتار ده' };
  await set(ref(db, `avatars/current/${currentUser}`), avatarId);
  return { success: true };
}

export async function renderAvatarsGrid(container) {
  const owned = await getOwnedAvatars();
  const current = await getCurrentAvatar();
  
  container.innerHTML = AVATAR_CATALOG.filter(a => !a.hidden || owned[a.id]).map(av => {
    const isOwned = !!owned[av.id];
    const isActive = current === av.id;
    return `
      <div class="theme-card ${isActive ? 'active' : ''}" style="border-color:${RARITY_COLORS[av.rarity]};">
        ${isActive ? '<span class="theme-active-badge">✓</span>' : ''}
        <div style="font-size:60px;margin:15px 0;">${av.icon}</div>
        <div class="theme-name">${av.name}</div>
        <div style="font-size:10px;color:${RARITY_COLORS[av.rarity]};font-weight:bold;">${av.rarity.toUpperCase()}</div>
        ${isOwned 
          ? (isActive ? '<div style="color:#4caf50;margin-top:8px;font-weight:bold;">✓ مفعل</div>' : `<button class="nf-btn nf-btn-success" style="width:100%;margin-top:8px;font-size:12px;" onclick="window._equipAvatar('${av.id}')">استخدم</button>`)
          : `<div class="theme-price" style="margin:8px 0;">${av.price} 🪙</div><button class="nf-btn nf-btn-primary" style="width:100%;font-size:12px;" onclick="window._buyAvatar('${av.id}')">🛒 شراء</button>`}
      </div>
    `;
  }).join('');
}

window._buyAvatar = async (id) => {
  const r = await buyAvatar(id);
  if (r.error) return showToast(r.error, 'error');
  showToast('🎉 اشتريت الأفاتار!', 'gold');
  renderAvatarsGrid(document.getElementById('avatarsGrid'));
};

window._equipAvatar = async (id) => {
  const r = await equipAvatar(id);
  if (r.error) return showToast(r.error, 'error');
  showToast('✅ الأفاتار اتفعل', 'info');
  renderAvatarsGrid(document.getElementById('avatarsGrid'));
};

window.NFAvatars = { AVATAR_CATALOG, getCurrentAvatar, getOwnedAvatars, buyAvatar, equipAvatar, renderAvatarsGrid };