/* ═══════════════════════════════════════════════════════════════════
   FEATURE 12: PROMO CODES (UPDATED)
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const FB = { apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo", authDomain: "quiz-hub-app-f4cd0.firebaseapp.com", databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com", projectId: "quiz-hub-app-f4cd0", storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app", messagingSenderId: "282772179392", appId: "1:282772179392:web:64646d757592b29ff3a025" };
const db = getDatabase(getApps().length ? getApps()[0] : initializeApp(FB));
const CU = (localStorage.getItem('loggedInUser') || '').toLowerCase();
/* ترجمة حسب لغة الموقع (data-ar/data-en system) */
const SITE_LANG = () => localStorage.getItem('lang') || 'ar';
const L = (ar, en) => SITE_LANG() === 'en' ? en : ar;

export async function redeemCode(code) {
  if (!CU) return { error: L('سجل دخول الأول', 'Log in first') };
  code = code.trim().toUpperCase();
  if (!code) return { error: L('اكتب الكود', 'Enter a code') };

  const codeSnap = await get(ref(db, `promo_codes/${code}`));
  if (!codeSnap.exists()) return { error: L('❌ الكود غير صحيح', '❌ Invalid code') };
  const promo = codeSnap.val();

  if (!promo.active) return { error: L('❌ الكود متوقف', '❌ Code is disabled') };
  if (promo.expiresAt && Date.now() > promo.expiresAt) return { error: L('❌ الكود انتهت صلاحيته', '❌ Code expired') };
  if (promo.usedCount >= promo.maxUses) return { error: L('❌ الكود استُنفد', '❌ Code fully used') };

  const myRedemptions = await get(ref(db, `redeemed_codes/${CU}/${code}`));
  if (myRedemptions.exists()) return { error: L('❌ استخدمت الكود ده قبل كده', '❌ You already used this code') };

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
  } else if (rewardType === 'theme') {
    updates[`purchased_themes/${CU}/${promo.themeId}`] = { boughtAt: Date.now(), price: 0 };
  } else if (rewardType === 'title') {
    updates[`users_data/${CU}/owned_titles/${promo.titleText}`] = true;
  }

  updates[`promo_codes/${code}/usedCount`] = (promo.usedCount || 0) + 1;
  updates[`redeemed_codes/${CU}/${code}`] = { redeemedAt: Date.now(), reward, rewardType };

  await update(ref(db), updates);
  return { success: true, reward, rewardType };
}

export function renderPromoSection(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="promo-section" style="background:transparent; border:none; padding:0; margin:0;">
      <div class="promo-input-row">
        <input type="text" class="promo-input" id="promo-code-input" placeholder="PROMO2026" maxlength="30">
        <button class="promo-btn" onclick="window._redeemPromo()" data-ar="🎁 استخدم" data-en="🎁 Use">🎁 ${L('استخدم', 'Use')}</button>
      </div>
    </div>
  `;
}

window._redeemPromo = async () => {
  const input = document.getElementById('promo-code-input');
  const code = input.value.trim();
  if (!code) return showToast(L('اكتب الكود', 'Enter a code'), 'error');
  const r = await redeemCode(code);
  if (r.error) return showToast(r.error, 'error');
  input.value = '';
  showToast(L('🎉 مبروك! تم استلام الهدية بنجاح', '🎉 Congrats! Gift received successfully'), 'gold');
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

window.NFPromoCodes = { redeemCode, renderPromoSection };