import { db, ref, get, set, update, onValue, currentUser, isLoggedIn, showToast } from '../firebase-shared.js';

export function listenCurrentSeason(callback) {
    if (!isLoggedIn()) return () => {};
    return onValue(ref(db, 'season_pass/current'), snap => {
        callback(snap.val());
    });
}

export function listenUserProgress(seasonId, callback) {
    if (!isLoggedIn() || !seasonId) return () => {};
    return onValue(ref(db, `users_data/${currentUser}/season_pass/${seasonId}`), snap => {
        const data = snap.val() || {};
        // 🔴 إصلاح مشكلة الـ undefined
        const safeData = {
            xp: data.xp || 0,
            isVip: data.isVip || false,
            claimedFree: data.claimedFree || {},
            claimedPremium: data.claimedPremium || {}
        };
        callback(safeData);
    });
}

export async function addSeasonXP(amount) {
    if (!isLoggedIn()) return;
    try {
        const seasonSnap = await get(ref(db, 'season_pass/current'));
        if (!seasonSnap.exists()) return;
        const season = seasonSnap.val();
        
        if (Date.now() > season.endTime) return;

        const progressRef = ref(db, `users_data/${currentUser}/season_pass/${season.id}`);
        const progressSnap = await get(progressRef);
        let progress = progressSnap.val() || {};
        
        progress.xp = (progress.xp || 0) + amount;
        progress.isVip = progress.isVip || false;
        progress.claimedFree = progress.claimedFree || {};
        progress.claimedPremium = progress.claimedPremium || {};

        await set(progressRef, progress);
    } catch(e) { console.warn('Season XP Error:', e); }
}

export async function claimSeasonReward(tierId, isPremium) {
    if (!isLoggedIn()) return { error: 'سجل دخول الأول' };
    
    const seasonSnap = await get(ref(db, 'season_pass/current'));
    if (!seasonSnap.exists()) return { error: 'لا يوجد موسم نشط' };
    const season = seasonSnap.val();

    const progressRef = ref(db, `users_data/${currentUser}/season_pass/${season.id}`);
    const progressSnap = await get(progressRef);
    let progress = progressSnap.val() || {};
    let currentXP = progress.xp || 0;
    
    let claimedFree = progress.claimedFree || {};
    let claimedPremium = progress.claimedPremium || {};

    const tier = season.tiers[tierId];
    if (!tier) return { error: 'المستوى غير موجود' };

    if (currentXP < tier.xpNeeded) return { error: 'لم تصل لهذا المستوى بعد' };
    if (isPremium && !progress.isVip) return { error: 'هذه الجايزة للـ VIP فقط' };
    if (isPremium && claimedPremium[tierId]) return { error: 'لقد استلمت هذه الجايزة بالفعل' };
    if (!isPremium && claimedFree[tierId]) return { error: 'لقد استلمت هذه الجايزة بالفعل' };

    const reward = isPremium ? tier.premium : tier.free;
    const updates = {};
    
    if (reward.type === 'coins') {
        const curCoins = (await get(ref(db, `users_data/${currentUser}/coins`))).val() || 0;
        updates[`users_data/${currentUser}/coins`] = curCoins + reward.amount;
    } 
    else if (reward.type === 'xp') {
        const curXP = (await get(ref(db, `users_data/${currentUser}/xp`))).val() || 0;
        updates[`users_data/${currentUser}/xp`] = curXP + reward.amount;
    } 
    else if (reward.type === 'item') {
        const curItem = (await get(ref(db, `users_data/${currentUser}/inventory/${reward.itemId}`))).val() || 0;
        updates[`users_data/${currentUser}/inventory/${reward.itemId}`] = curItem + (reward.qty || 1);
    } 
    else if (reward.type === 'theme') {
        updates[`purchased_themes/${currentUser}/${reward.themeId}`] = { boughtAt: Date.now(), price: 0 };
    }

    if (isPremium) updates[`users_data/${currentUser}/season_pass/${season.id}/claimedPremium/${tierId}`] = true;
    else updates[`users_data/${currentUser}/season_pass/${season.id}/claimedFree/${tierId}`] = true;

    await update(ref(db), updates);
    return { success: true };
}

export async function buyVipPass() {
    if (!isLoggedIn()) return { error: 'سجل دخول الأول' };

    const seasonSnap = await get(ref(db, 'season_pass/current'));
    if (!seasonSnap.exists()) return { error: 'لا يوجد موسم نشط' };
    const season = seasonSnap.val();

    const progressRef = ref(db, `users_data/${currentUser}/season_pass/${season.id}`);
    const progress = (await get(progressRef)).val() || {};

    if (progress.isVip) return { error: 'أنت تمتلك الـ VIP بالفعل!' };

    const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
    const coins = coinsSnap.val() || 0;

    if (coins < season.vipPrice) return { error: `تحتاج ${season.vipPrice} كوينز` };

    await update(ref(db), {
        [`users_data/${currentUser}/coins`]: coins - season.vipPrice,
        [`users_data/${currentUser}/season_pass/${season.id}/isVip`]: true
    });

    return { success: true };
}

window.NFSeasonPass = { listenCurrentSeason, listenUserProgress, addSeasonXP, claimSeasonReward, buyVipPass };