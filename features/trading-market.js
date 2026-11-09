import { db, ref, get, set, update, push, remove, onValue, currentUser, showToast, escapeHtml } from '../firebase-shared.js';

const COMMISSION = 0.05; // 5%

export async function createListing(itemId, qty, price, type = 'item') {
  if (price < 10) return { error: 'أقل سعر 10 كوينز' };
  if (qty < 1) return { error: 'الكمية غلط' };
  
  const invSnap = await get(ref(db, `users_data/${currentUser}/inventory/${itemId}`));
  const has = invSnap.val() || 0;
  if (has < qty) return { error: 'مش عندك كمية كافية' };
  
  // شيل من المخزون
  await set(ref(db, `users_data/${currentUser}/inventory/${itemId}`), has - qty > 0 ? has - qty : null);
  
  // اعمل listing
  const newRef = push(ref(db, 'market/listings'));
  await set(newRef, {
    seller: currentUser, type, itemId, qty, price,
    createdAt: Date.now(), status: 'active'
  });
  return { success: true, listingId: newRef.key };
}

export async function buyListing(listingId) {
  const snap = await get(ref(db, `market/listings/${listingId}`));
  if (!snap.exists()) return { error: 'الإعلان انتهى' };
  const listing = snap.val();
  if (listing.status !== 'active') return { error: 'مش متاح' };
  if (listing.seller === currentUser) return { error: 'مش تقدر تشتري حاجتك' };
  
  const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
  const coins = coinsSnap.val() || 0;
  if (coins < listing.price) return { error: `محتاج ${listing.price}` };
  
  const sellerEarn = Math.floor(listing.price * (1 - COMMISSION));
  
  // خصم من المشتري
  await set(ref(db, `users_data/${currentUser}/coins`), coins - listing.price);
  // أضف للبائع
  const sellerCoinsSnap = await get(ref(db, `users_data/${listing.seller}/coins`));
  await set(ref(db, `users_data/${listing.seller}/coins`), (sellerCoinsSnap.val() || 0) + sellerEarn);
  
  // أضف للمشتري
  const invSnap = await get(ref(db, `users_data/${currentUser}/inventory/${listing.itemId}`));
  await set(ref(db, `users_data/${currentUser}/inventory/${listing.itemId}`), (invSnap.val() || 0) + listing.qty);
  
  // اقفل الإعلان
  await update(ref(db, `market/listings/${listingId}`), { status: 'sold', soldAt: Date.now() });
  
  // سجل
  await push(ref(db, 'market/history'), {
    buyer: currentUser, seller: listing.seller, itemId: listing.itemId,
    qty: listing.qty, price: listing.price, commission: listing.price - sellerEarn, time: Date.now()
  });
  
  return { success: true };
}

export async function cancelListing(listingId) {
  const snap = await get(ref(db, `market/listings/${listingId}`));
  if (!snap.exists()) return { error: 'مش موجود' };
  const l = snap.val();
  if (l.seller !== currentUser) return { error: 'مش إعلانك' };
  if (l.status !== 'active') return { error: 'مقفول' };
  
  const invSnap = await get(ref(db, `users_data/${currentUser}/inventory/${l.itemId}`));
  await set(ref(db, `users_data/${currentUser}/inventory/${l.itemId}`), (invSnap.val() || 0) + l.qty);
  await update(ref(db, `market/listings/${listingId}`), { status: 'cancelled' });
  return { success: true };
}

export function listenListings(callback) {
  return onValue(ref(db, 'market/listings'), snap => {
    const data = snap.val() || {};
    const active = Object.entries(data)
      .filter(([, v]) => v.status === 'active')
      .sort((a, b) => b[1].createdAt - a[1].createdAt);
    callback(active);
  });
}

window.NFMarket = { createListing, buyListing, cancelListing, listenListings };