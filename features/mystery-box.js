import { db, ref, get, set, update, currentUser, showToast } from '../firebase-shared.js';

const REWARDS = [
  { w: 40, type: 'coins', min: 50, max: 200, label: '🪙 كوينز' },
  { w: 25, type: 'xp', min: 50, max: 300, label: '✨ XP' },
  { w: 15, type: 'item', itemId: 'fifty', label: '✂️ 50/50' },
  { w: 10, type: 'item', itemId: 'shield', label: '🛡️ درع' },
  { w: 6, type: 'item', itemId: 'box_gold', label: '🏆 صندوق ذهبي' },
  { w: 3, type: 'item', itemId: 'box_legendary', label: '👑 صندوق أسطوري' },
  { w: 1, type: 'avatar', label: '💎 أفاتار نادر' }
];

const COOLDOWN = 6 * 3600 * 1000; // 6 ساعات

export async function getMysteryBoxState() {
  const snap = await get(ref(db, `mystery_boxes/${currentUser}`));
  const data = snap.val() || {};
  const lastOpen = data.lastOpen || 0;
  const timeLeft = Math.max(0, lastOpen + COOLDOWN - Date.now());
  return { canOpen: timeLeft === 0, timeLeft, totalOpened: data.totalOpened || 0 };
}

function rollReward() {
  const total = REWARDS.reduce((s, r) => s + r.w, 0);
  let roll = Math.random() * total;
  for (const r of REWARDS) {
    roll -= r.w;
    if (roll <= 0) return r;
  }
  return REWARDS[0];
}

export async function openMysteryBox() {
  const state = await getMysteryBoxState();
  if (!state.canOpen) return { error: '⏳ لسه بدري!' };
  
  const reward = rollReward();
  const updates = { [`mystery_boxes/${currentUser}/lastOpen`]: Date.now(),
                    [`mystery_boxes/${currentUser}/totalOpened`]: state.totalOpened + 1 };
  
  let amount = 0;
  if (reward.type === 'coins' || reward.type === 'xp') {
    amount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
    const field = reward.type === 'coins' ? 'coins' : 'xp';
    const curSnap = await get(ref(db, `users_data/${currentUser}/${field}`));
    updates[`users_data/${currentUser}/${field}`] = (curSnap.val() || 0) + amount;
  } else if (reward.type === 'item') {
    const curSnap = await get(ref(db, `users_data/${currentUser}/inventory/${reward.itemId}`));
    updates[`users_data/${currentUser}/inventory/${reward.itemId}`] = (curSnap.val() || 0) + 1;
  } else if (reward.type === 'avatar') {
    updates[`avatars/owned/${currentUser}/mystery_rare`] = true;
  }
  
  await update(ref(db), updates);
  
  if (window.confetti) window.confetti({ particleCount: 200, spread: 100 });
  return { success: true, reward, amount, label: reward.label + (amount ? ` +${amount}` : '') };
}

export function renderMysteryBoxUI(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#ffd700,#ff8c00);border-radius:20px;padding:25px;text-align:center;color:#000;box-shadow:0 0 30px rgba(255,215,0,0.5);">
      <div style="font-size:60px;animation:floatBox 2s infinite;">🎁</div>
      <h3 style="margin:10px 0;font-size:20px;font-weight:900;">صندوق الغش</h3>
      <p style="font-size:13px;margin-bottom:15px;">افتح صندوق عشوائي كل 6 ساعات</p>
      <button id="mysteryBoxBtn" onclick="window._openMysteryBox()" style="padding:12px 30px;background:#000;color:#ffd700;border:none;border-radius:10px;font-family:Cairo;font-weight:bold;font-size:16px;cursor:pointer;">🎰 افتح الصندوق</button>
      <div id="mysteryTimer" style="font-size:12px;margin-top:10px;font-weight:bold;"></div>
    </div>
    <style>@keyframes floatBox{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}</style>
  `;
  
  updateTimer(container);
  setInterval(() => updateTimer(container), 60000);
}

async function updateTimer(container) {
  const state = await getMysteryBoxState();
  const btn = document.getElementById('mysteryBoxBtn');
  const timer = document.getElementById('mysteryTimer');
  if (!btn) return;
  if (state.canOpen) {
    btn.disabled = false; btn.innerText = '🎰 افتح الصندوق';
    btn.style.opacity = '1';
    timer.innerText = '✅ متاح!';
  } else {
    btn.disabled = true; btn.style.opacity = '0.5';
    const h = Math.floor(state.timeLeft / 3600000);
    const m = Math.floor((state.timeLeft % 3600000) / 60000);
    timer.innerText = `⏳ متاح بعد ${h}س ${m}د`;
  }
}

window._openMysteryBox = async () => {
  const r = await openMysteryBox();
  if (r.error) return showToast(r.error, 'error');
  showToast(`🎉 مبروك! حصلت على: ${r.label}`, 'gold');
  setTimeout(() => location.reload(), 2500);
};

window.NFMysteryBox = { getMysteryBoxState, openMysteryBox, renderMysteryBoxUI };