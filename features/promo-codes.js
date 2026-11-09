/* ═══════════════════════════════════════════════════════════════════
   FEATURE 12: PROMO CODES
   Node: promo_codes/{CODE} = { reward, rewardType, maxUses, usedCount, expiresAt, active }
         redeemed_codes/{userId}/{CODE} = { redeemedAt }
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();

export async function redeemCode(code) {
  if (!CU) return { error: 'سجل دخول الأول' };
  code = code.trim().toUpperCase();
  if (!code) return { error: 'اكتب الكود' };

  const codeSnap = await get(ref(db, `promo_codes/${code}`));
  if (!codeSnap.exists()) return { error: '❌ الكود غير صحيح' };
  const promo = codeSnap.val();

  if (!promo.active) return { error: '❌ الكود متوقف' };
  if (promo.expiresAt && Date.now() > promo.expiresAt) return { error: '❌ الكود انتهت صلاحيته' };
  if (promo.usedCount >= promo.maxUses) return { error: '❌ الكود استُنفد' };

  const myRedemptions = await get(ref(db, `redeemed_codes/${CU}/${code}`));
  if (myRedemptions.exists()) return { error: '❌ استخدمت الكود ده قبل كده' };

  // تطبيق المكافأة
  const updates = {};
  const rewardType = promo.rewardType || 'coins';
  const reward = promo.reward || 0;

  if (rewardType === 'coins') {
    const curSnap = await get(ref(db, `users_data/${CU}/coins`));
    updates[`users_data/${CU}/coins`] = (curSnap.val() || 0) + reward;
  } else if (rewardType === 'xp') {
    const curSnap = await get(ref(db, `users_data/${CU}/xp`));
    updates[`users_data/${CU}/xp`] = (curSnap.val() || 0) + reward;
  } else if (rewardType === 'item') {
    const itemSnap = await get(ref(db, `users_data/${CU}/inventory/${promo.itemId}`));
    updates[`users_data/${CU}/inventory/${promo.itemId}`] = (itemSnap.val() || 0) + (promo.quantity || 1);
  }

  updates[`promo_codes/${code}/usedCount`] = (promo.usedCount || 0) + 1;
  updates[`redeemed_codes/${CU}/${code}`] = { redeemedAt: Date.now(), reward, rewardType };

  await update(ref(db), updates);
  return { success: true, reward, rewardType };
}

// ===== ADMIN: إنشاء كود =====
export async function createPromoCode(code, config) {
  code = code.trim().toUpperCase();
  await set(ref(db, `promo_codes/${code}`), {
    reward: config.reward || 100,
    rewardType: config.rewardType || 'coins',
    itemId: config.itemId || null,
    quantity: config.quantity || 1,
    maxUses: config.maxUses || 100,
    usedCount: 0,
    expiresAt: config.expiresAt || (Date.now() + 30 * 86400000),
    active: true,
    createdAt: Date.now(),
    createdBy: CU
  });
  return { success: true };
}

export async function deletePromoCode(code) {
  await set(ref(db, `promo_codes/${code.toUpperCase()}`), null);
}

export async function togglePromoCode(code) {
  const snap = await get(ref(db, `promo_codes/${code.toUpperCase()}/active`));
  await set(ref(db, `promo_codes/${code.toUpperCase()}/active`), !snap.val());
}

export function renderPromoSection(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="promo-section">
      <h3 style="color:var(--nf-gold); font-size:18px; margin-bottom:5px;">🎁 عندك كود خصم؟</h3>
      <p style="color:var(--nf-text-2); font-size:13px;">اكتب الكود هنا واستلم مكافأتك فوراً</p>
      <div class="promo-input-row">
        <input type="text" class="promo-input" id="promo-code-input" placeholder="PROMO2026" maxlength="30">
        <button class="promo-btn" onclick="window._redeemPromo()">🎁 استخدم</button>
      </div>
    </div>
  `;
}

window._redeemPromo = async () => {
  const input = document.getElementById('promo-code-input');
  const code = input.value.trim();
  if (!code) return showToast('اكتب الكود', 'error');
  const r = await redeemCode(code);
  if (r.error) return showToast(r.error, 'error');
  input.value = '';
  showToast(`🎉 مبروك! +${r.reward} ${r.rewardType === 'coins' ? 'كوينز' : r.rewardType === 'xp' ? 'XP' : 'أداة'}`, 'gold');
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

window.NFPromoCodes = { redeemCode, createPromoCode, deletePromoCode, togglePromoCode, renderPromoSection };