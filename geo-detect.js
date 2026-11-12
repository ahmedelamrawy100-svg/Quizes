/* ═══════════════════════════════════════════════════════════════════
   GEO DETECT v2 — FIXED
   يستنى المستخدم يسجل دخول، بعدين يحدد دولته تلقائي
   بيعتمد على 3 طرق مختلفة عشان يضمن الشغل:
   1. onAuthStateChanged (لما المستخدم يسجل دخول جديد)
   2. Polling localStorage (كل ثانية)
   3. Immediate check (لو المستخدم مسجل دخول أصلاً)
   ═══════════════════════════════════════════════════════════════════ */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const CFG = {
  apiKey: "AIzaSyBmyW4tZGJfcHJ4jKSD3_6hebZK58Y3jXo",
  authDomain: "quiz-hub-app-f4cd0.firebaseapp.com",
  databaseURL: "https://quiz-hub-app-f4cd0-default-rtdb.firebaseio.com",
  projectId: "quiz-hub-app-f4cd0",
  storageBucket: "quiz-hub-app-f4cd0.firebasestorage.app",
  messagingSenderId: "282772179392",
  appId: "1:282772179392:web:64646d757592b29ff3a025"
};

/* ─── Firebase setup (safe) ─── */
let db = null, auth = null;
try {
  const app = getApps().length ? getApp() : initializeApp(CFG);
  db = getDatabase(app);
  auth = getAuth(app);
  console.log('[geo] ✅ Firebase ready');
} catch (e) {
  console.error('[geo] ❌ Firebase init failed:', e);
}

/* ─── State ─── */
const processingUsers = new Set();  // منع التكرار
const completedUsers = new Set();   // اللي اتحددوا خلاص

/* ─── Country mapping ─── */
const ALPHA2_TO_ISO = {
  'AF':'004','AL':'008','DZ':'012','AO':'024','AR':'032','AU':'036','AT':'040','BD':'050',
  'BE':'056','BO':'068','BR':'076','BG':'100','KH':'116','CM':'120','CA':'124','TD':'148',
  'CN':'156','CO':'170','CG':'178','CD':'180','CR':'188','HR':'191','CU':'192','CY':'196',
  'CZ':'203','DK':'208','DO':'214','EC':'218','EG':'818','SV':'222','ET':'231','FI':'246',
  'FR':'250','GE':'268','DE':'276','GH':'288','GR':'300','GT':'320','HN':'340','HK':'344',
  'HU':'348','IS':'352','IN':'356','ID':'360','IR':'364','IQ':'368','IE':'372','IL':'376',
  'IT':'380','CI':'384','JM':'388','JP':'392','JO':'400','KZ':'398','KE':'404','KP':'408',
  'KR':'410','KW':'414','KG':'417','LA':'418','LB':'422','LR':'430','LY':'434','LT':'440',
  'LU':'442','MG':'450','MW':'454','MY':'458','ML':'466','MR':'478','MX':'484','MD':'498',
  'MN':'496','ME':'499','MA':'504','MZ':'508','MM':'104','NA':'516','NP':'524','NL':'528',
  'NZ':'554','NI':'558','NE':'562','NG':'566','MK':'807','NO':'578','OM':'512','PK':'586',
  'PA':'591','PG':'598','PY':'600','PE':'604','PH':'608','PL':'616','PT':'620','QA':'634',
  'RO':'642','RU':'643','RW':'646','SA':'682','SN':'686','RS':'688','SL':'694','SG':'702',
  'SK':'703','SI':'705','SO':'706','ZA':'710','ES':'724','LK':'144','SD':'729','SE':'752',
  'CH':'756','SY':'760','TW':'158','TJ':'762','TZ':'834','TH':'764','TG':'768','TT':'780',
  'TN':'788','TR':'792','TM':'795','UG':'800','UA':'804','AE':'784','GB':'826','US':'840',
  'UY':'858','UZ':'860','VE':'862','VN':'704','YE':'887','ZM':'894','ZW':'716','PS':'275',
  'BY':'112','BZ':'084','BT':'064','BN':'096','BF':'854','BI':'108','CV':'132','CF':'140',
  'CL':'152','TL':'626','DJ':'262','GQ':'226','ER':'232','EE':'233','SZ':'748','FJ':'242',
  'GM':'270','GL':'304','GW':'624','GY':'328','HT':'332','LS':'426','LV':'428','MV':'462',
  'MT':'470','MU':'480','FM':'583','MC':'492','NR':'520','NC':'540','NU':'570','PW':'585',
  'PR':'630','KN':'659','LC':'662','VC':'670','WS':'882','SM':'674','ST':'678','SC':'690',
  'SB':'090','SS':'728','SR':'740','TO':'776','TV':'798','VU':'548','VA':'336','XK':'XK'
};

const TZ_TO_ISO = {
  'Africa/Cairo':'818','Africa/Alexandria':'818','Asia/Riyadh':'682','Asia/Dubai':'784',
  'Asia/Kuwait':'414','Asia/Qatar':'634','Asia/Baghdad':'368','Asia/Amman':'400',
  'Asia/Beirut':'422','Asia/Damascus':'760','Asia/Jerusalem':'275','Asia/Gaza':'275',
  'Africa/Casablanca':'504','Africa/Tunis':'788','Africa/Algiers':'012','Africa/Tripoli':'434',
  'Africa/Khartoum':'729','Asia/Karachi':'586','Asia/Kolkata':'356','Asia/Calcutta':'356',
  'Asia/Dhaka':'050','Asia/Kathmandu':'524','Asia/Colombo':'144','Asia/Yangon':'104',
  'Asia/Istanbul':'792','Europe/Istanbul':'792','Asia/Tehran':'364','Africa/Lagos':'566',
  'Africa/Nairobi':'404','Africa/Johannesburg':'710','Africa/Accra':'288',
  'Europe/London':'826','Europe/Dublin':'372','Europe/Paris':'250','Europe/Berlin':'276',
  'Europe/Madrid':'724','Europe/Rome':'380','Europe/Amsterdam':'528','Europe/Brussels':'056',
  'Europe/Vienna':'040','Europe/Stockholm':'752','Europe/Oslo':'578','Europe/Copenhagen':'208',
  'Europe/Helsinki':'246','Europe/Warsaw':'616','Europe/Prague':'203','Europe/Budapest':'348',
  'Europe/Athens':'300','Europe/Bucharest':'642','Europe/Sofia':'100','Europe/Belgrade':'688',
  'Europe/Zagreb':'191','Europe/Ljubljana':'705','Europe/Bratislava':'703',
  'Europe/Lisbon':'620','Europe/Moscow':'643','Europe/Kiev':'804','Europe/Kyiv':'804',
  'America/New_York':'840','America/Chicago':'840','America/Denver':'840',
  'America/Los_Angeles':'840','America/Phoenix':'840','America/Toronto':'124',
  'America/Vancouver':'124','America/Mexico_City':'484','America/Sao_Paulo':'076',
  'America/Argentina/Buenos_Aires':'032','America/Santiago':'152',
  'America/Lima':'604','America/Bogota':'170','America/Caracas':'862',
  'Asia/Tokyo':'392','Asia/Seoul':'410','Asia/Shanghai':'156','Asia/Hong_Kong':'344',
  'Asia/Taipei':'158','Asia/Singapore':'702','Asia/Kuala_Lumpur':'458',
  'Asia/Jakarta':'360','Asia/Manila':'608','Asia/Bangkok':'764','Asia/Ho_Chi_Minh':'704',
  'Asia/Hanoi':'704','Australia/Sydney':'036','Australia/Melbourne':'036',
  'Australia/Brisbane':'036','Australia/Perth':'036','Pacific/Auckland':'554'
};

/* ─── Detection logic ─── */
function alpha2ToISO(code) {
  if (!code || typeof code !== 'string') return null;
  return ALPHA2_TO_ISO[code.toUpperCase()] || null;
}

function tzToISO(tz) {
  if (!tz) return null;
  return TZ_TO_ISO[tz] || null;
}

async function tryFetch(url, extractor, timeoutMs = 4000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[geo] ${url} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return extractor(data);
  } catch (e) {
    console.warn(`[geo] ${url} failed:`, e.message);
    return null;
  }
}

async function detectCountry() {
  // Try APIs in order
  let iso = await tryFetch(
    'https://ipapi.co/json/',
    d => alpha2ToISO(d.country_code)
  );
  if (iso) { console.log('[geo] Detected via ipapi.co:', iso); return iso; }

  iso = await tryFetch(
    'https://ipwho.is/',
    d => d.success ? alpha2ToISO(d.country_code) : null
  );
  if (iso) { console.log('[geo] Detected via ipwho.is:', iso); return iso; }

  iso = await tryFetch(
    'https://ipinfo.io/json',
    d => alpha2ToISO(d.country)
  );
  if (iso) { console.log('[geo] Detected via ipinfo.io:', iso); return iso; }

  // Fallback: timezone
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    iso = tzToISO(tz);
    if (iso) { console.log('[geo] Detected via timezone', tz, ':', iso); return iso; }
  } catch (e) {}

  console.log('[geo] ❌ All detection methods failed');
  return null;
}

/* ─── Main: detect for specific user ─── */
async function detectForUser(username) {
  if (!username || typeof username !== 'string') return;
  username = username.toLowerCase().trim();
  if (!username || username === 'unknown' || username === 'زائر') return;

  if (processingUsers.has(username)) {
    console.log(`[geo] Already processing ${username}`);
    return;
  }
  if (completedUsers.has(username)) {
    console.log(`[geo] Already completed ${username}`);
    return;
  }
  if (!db) {
    console.warn('[geo] Firebase not ready');
    return;
  }

  processingUsers.add(username);
  console.log(`[geo] ⏳ Processing ${username}...`);

  try {
    // 1. Check if already in Firebase
    const snap = await get(ref(db, `users_data/${username}/country`));
    if (snap.exists() && snap.val()) {
      console.log(`[geo] ✅ ${username} already has country: ${snap.val()}`);
      completedUsers.add(username);
      processingUsers.delete(username);
      return;
    }

    // 2. Check localStorage cache
    const cachedISO = localStorage.getItem(`geo_iso_${username}`);
    const cachedAt = parseInt(localStorage.getItem(`geo_iso_${username}_at`) || '0');
    if (cachedISO && Date.now() - cachedAt < 7 * 24 * 3600 * 1000) {
      await set(ref(db, `users_data/${username}/country`), cachedISO);
      console.log(`[geo] ✅ ${username} → ${cachedISO} (from cache)`);
      completedUsers.add(username);
      processingUsers.delete(username);
      return;
    }

    // 3. Detect
    const iso = await detectCountry();
    if (!iso) {
      console.log(`[geo] ⚠️ Detection failed for ${username}, will retry`);
      processingUsers.delete(username);
      return;
    }

    // 4. Save to Firebase
    await set(ref(db, `users_data/${username}/country`), iso);
    console.log(`[geo] ✅ ${username} → ${iso}`);

    // 5. Cache locally
    try {
      localStorage.setItem(`geo_iso_${username}`, iso);
      localStorage.setItem(`geo_iso_${username}_at`, String(Date.now()));
    } catch (e) {}

    completedUsers.add(username);
  } catch (e) {
    console.error(`[geo] Error for ${username}:`, e);
    processingUsers.delete(username);
  }
}

/* ═══════════════════════════════════════════════════════════════════
   TRIGGERS — 3 طرق عشان يضمن الشغل في كل الحالات
   ═══════════════════════════════════════════════════════════════════ */

/* Trigger 1: Firebase Auth state change (الأقوى — بيشتغل حتى لو المستخدم لسه بيسجل دخول) */
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user && user.email) {
      const username = user.email.split('@')[0].toLowerCase();
      // Store it too (belt and suspenders)
      if (localStorage.getItem('loggedInUser') !== username) {
        localStorage.setItem('loggedInUser', username);
      }
      console.log(`[geo] 🔐 Auth: ${username} logged in`);
      // Wait for user data to be written first
      setTimeout(() => detectForUser(username), 2500);
    }
  });
}

/* Trigger 2: Polling (fallback — للمستخدمين القدام اللي بيتحط localStorage قبل تحميل geo-detect.js) */
let pollCount = 0;
const pollInterval = setInterval(() => {
  pollCount++;
  const username = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
  if (username && username !== 'unknown' && !completedUsers.has(username) && !processingUsers.has(username)) {
    console.log(`[geo] 🔄 Poll #${pollCount}: found user ${username}`);
    detectForUser(username);
  }
  // Stop after 30 attempts (30 seconds) — بعدها الـ auth listener هو اللي هيتولى
  if (pollCount >= 30) {
    clearInterval(pollInterval);
    console.log('[geo] Polling stopped (30s elapsed)');
  }
}, 1000);

/* Trigger 3: Immediate check (لو المستخدم already logged in) */
setTimeout(() => {
  const username = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
  if (username && username !== 'unknown' && !completedUsers.has(username)) {
    console.log(`[geo] 🚀 Immediate check: ${username}`);
    detectForUser(username);
  }
}, 500);

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API (للـ world-map.html وللاستخدام اليدوي)
   ═══════════════════════════════════════════════════════════════════ */
window.NFGeo = {
  detectCountry,
  detectForUser,
  async autoDetectAndSave() {
    const username = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
    if (!username) {
      console.log('[geo] autoDetectAndSave: no user');
      return null;
    }
    processingUsers.delete(username);
    completedUsers.delete(username);
    await detectForUser(username);
    try {
      const snap = await get(ref(db, `users_data/${username}/country`));
      return snap.exists() ? snap.val() : null;
    } catch (e) {
      return null;
    }
  },
  async forceRedetect() {
    const username = (localStorage.getItem('loggedInUser') || '').trim().toLowerCase();
    if (!username) return null;
    // Clear cache + Firebase
    localStorage.removeItem(`geo_iso_${username}`);
    localStorage.removeItem(`geo_iso_${username}_at`);
    try {
      await set(ref(db, `users_data/${username}/country`), null);
    } catch (e) {}
    processingUsers.delete(username);
    completedUsers.delete(username);
    return await this.autoDetectAndSave();
  },
  getStatus() {
    return {
      firebaseReady: !!db,
      authReady: !!auth,
      processing: [...processingUsers],
      completed: [...completedUsers],
      currentUser: localStorage.getItem('loggedInUser')
    };
  }
};

console.log('[geo] ✅ geo-detect.js loaded (v2)');