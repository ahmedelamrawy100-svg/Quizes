/* ═══════════════════════════════════════════════════════════════════
   PLOT TWIST — QUIZ BUILDER v2.2 (Bilingual + Portrait + Admin)
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, remove, push, onValue, currentUser, isLoggedIn } from '../firebase-shared.js';

const IMGBB_API_KEY = "3e7c71a0a091350d70363ef5909198d7";

export const QUIZ_CATEGORIES = {
  horror:   { name: 'Horror',   nameAr: 'رعب',         icon: '🎃', color: '#ff4757' },
  action:   { name: 'Action',   nameAr: 'أكشن',        icon: '💥', color: '#ffa502' },
  thriller: { name: 'Thriller', nameAr: 'تشويق',       icon: '🎬', color: '#1e90ff' },
  mystery:  { name: 'Mystery',  nameAr: 'غموض',        icon: '🕵️', color: '#a55eea' },
  egyptian: { name: 'Egyptian', nameAr: 'مصري',        icon: '🇪🇬', color: '#eccc68' },
  anime:    { name: 'Anime',    nameAr: 'أنيمي',       icon: '🇯🇵', color: '#ff69b4' },
  gaming:   { name: 'Gaming',   nameAr: 'ألعاب',       icon: '🎮', color: '#00bcd4' },
  sports:   { name: 'Sports',   nameAr: 'رياضة',       icon: '⚽', color: '#10b981' },
  music:    { name: 'Music',    nameAr: 'موسيقى',      icon: '🎵', color: '#e91e63' },
  tech:     { name: 'Tech',     nameAr: 'تكنولوجيا',   icon: '💻', color: '#3b82f6' },
  general:  { name: 'General',  nameAr: 'عام',         icon: '🎯', color: '#888' },
};

export const QUIZ_ICONS = [
  '🎬','🎮','🎃','👻','💥','🕵️','🌊','⚔️','👑','🎭','😱','🔪','🦑','🐉','🏆',
  '⚽','🎵','💻','🚀','🎨','📚','🧠','💎','🔥','⭐','❤️','🎯','🎲','🌍','🇪🇬',
  '🦁','🐺','🦅','🐍','🍕','🍔','☕','🏰','⚡','🌟','🎪','🎯','🎨','🎸','🎤'
];

const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 1;
const MAX_TITLE_LEN = 60;
const MAX_QUESTION_LEN = 300;
const MAX_OPTION_LEN = 150;
const MAX_REVIEW_LEN = 300;

function sanitize(str, maxLen = 500) {
  return String(str || '').trim().slice(0, maxLen);
}

/* ─── Image Upload ─── */
export async function uploadImage(file, maxDim = 1200) {
  if (!file) return { error: 'No file / مفيش ملف' };
  if (!file.type.startsWith('image/')) return { error: 'Not an image / الملف مش صورة' };
  if (file.size > 8 * 1024 * 1024) return { error: 'Image too large / الصورة كبيرة أوي' };

  try {
    const resizedBlob = await resizeImage(file, maxDim);
    const formData = new FormData();
    formData.append('image', resizedBlob);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    if (!data.success) return { error: 'Upload failed / فشل الرفع' };
    return { success: true, url: data.data.url };
  } catch (e) {
    return { error: 'Error / خطأ: ' + e.message };
  }
}

function resizeImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else { width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Process failed'));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Corrupt image')); };
    img.src = url;
  });
}

/* ─── Validation (Bilingual) ─── */
export function validateQuiz(data, strict = true, lang = 'ar') {
  const errors = [];
  const isAr = lang === 'ar';

  if (!data.title || data.title.length < 3) errors.push(isAr ? 'العنوان لازم 3 حروف على الأقل' : 'Title must be at least 3 characters');
  if (data.title && data.title.length > MAX_TITLE_LEN) errors.push(isAr ? `العنوان طويل (${MAX_TITLE_LEN} حرف كحد أقصى)` : `Title too long (max ${MAX_TITLE_LEN} chars)`);
  if (!data.category || !QUIZ_CATEGORIES[data.category]) errors.push(isAr ? 'اختار تصنيف' : 'Select a category');
  if (!Array.isArray(data.questions) || data.questions.length < MIN_QUESTIONS) errors.push(isAr ? 'لازم سؤال واحد على الأقل' : 'At least 1 question required');
  if (data.questions && data.questions.length > MAX_QUESTIONS) errors.push(isAr ? `الحد الأقصى ${MAX_QUESTIONS} سؤال` : `Max ${MAX_QUESTIONS} questions`);

  if (strict && data.questions) {
    data.questions.forEach((q, i) => {
      const num = i + 1;
      if (!q.q_ar || q.q_ar.length < 3) errors.push(isAr ? `سؤال ${num}: النص قصير` : `Q${num}: Text too short`);
      if (!Array.isArray(q.options_ar) || q.options_ar.length < 2) errors.push(isAr ? `سؤال ${num}: محتاج اختيارين على الأقل` : `Q${num}: Need at least 2 options`);
      if (q.options_ar && q.options_ar.some(o => !o || !o.trim())) errors.push(isAr ? `سؤال ${num}: في اختيار فاضي` : `Q${num}: Empty option found`);
      if (typeof q.answer !== 'number' || q.answer < 0 || (q.options_ar && q.answer >= q.options_ar.length)) errors.push(isAr ? `سؤال ${num}: حدد الإجابة الصحيحة` : `Q${num}: Select correct answer`);
    });
  }

  return errors;
}

/* ─── Admin Check ─── */
function isAdminUser() {
  return currentUser.toLowerCase() === 'ahmed';
}

/* ─── CRUD ─── */
export async function createQuiz({ title, titleEn = '', icon = '🎬', category = 'general', description = '', coverImage = null, questions = [], status = 'draft' }, lang = 'ar') {
  if (!isLoggedIn()) return { error: lang === 'ar' ? 'سجل دخول الأول' : 'Please login first' };

  const cleanData = {
    title: sanitize(title, MAX_TITLE_LEN),
    titleEn: sanitize(titleEn, MAX_TITLE_LEN),
    icon: sanitize(icon, 8) || '🎬',
    category: QUIZ_CATEGORIES[category] ? category : 'general',
    description: sanitize(description, 200),
    coverImage: coverImage || null,
    creator: currentUser,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: status === 'published' ? 'published' : 'draft',
    questions: (questions || []).map(q => ({
      q_ar: sanitize(q.q_ar, MAX_QUESTION_LEN),
      q_en: sanitize(q.q_en || '', MAX_QUESTION_LEN),
      image: q.image || null,
      options_ar: (q.options_ar || []).map(o => sanitize(o, MAX_OPTION_LEN)),
      options_en: (q.options_en || []).map(o => sanitize(o, MAX_OPTION_LEN)),
      answer: Number(q.answer) || 0,
      type: 'multiple_choice'
    })),
    plays: 0, ratings: {}, reviews: {},
    avgRating: 0, ratingCount: 0, reviewCount: 0
  };

  const errors = validateQuiz(cleanData, status === 'published', lang);
  if (errors.length > 0) return { error: errors.join(' • ') };

  try {
    const newRef = push(ref(db, 'user_quizzes'));
    await set(newRef, cleanData);
    return { success: true, id: newRef.key };
  } catch (e) {
    return { error: 'Error: ' + e.message };
  }
}

export async function updateQuiz(quizId, data, lang = 'ar') {
  if (!isLoggedIn() || !quizId) return { error: 'Invalid' };

  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}`));
    if (!snap.exists()) return { error: lang === 'ar' ? 'الكويز مش موجود' : 'Quiz not found' };
    const quiz = snap.val();
    
    if (quiz.creator !== currentUser && !isAdminUser()) {
      return { error: lang === 'ar' ? 'مش كويزك ومش أدمن' : 'Not your quiz or admin' };
    }

    const updates = { updatedAt: Date.now() };

    if (data.title !== undefined) updates.title = sanitize(data.title, MAX_TITLE_LEN);
    if (data.titleEn !== undefined) updates.titleEn = sanitize(data.titleEn, MAX_TITLE_LEN);
    if (data.icon !== undefined) updates.icon = sanitize(data.icon, 8);
    if (data.category !== undefined && QUIZ_CATEGORIES[data.category]) updates.category = data.category;
    if (data.description !== undefined) updates.description = sanitize(data.description, 200);
    if (data.coverImage !== undefined) updates.coverImage = data.coverImage || null;
    if (data.status !== undefined) updates.status = data.status;
    if (data.questions !== undefined) {
      updates.questions = data.questions.map(q => ({
        q_ar: sanitize(q.q_ar, MAX_QUESTION_LEN),
        q_en: sanitize(q.q_en || '', MAX_QUESTION_LEN),
        image: q.image || null,
        options_ar: (q.options_ar || []).map(o => sanitize(o, MAX_OPTION_LEN)),
        options_en: (q.options_en || []).map(o => sanitize(o, MAX_OPTION_LEN)),
        answer: Number(q.answer) || 0,
        type: 'multiple_choice'
      }));
    }

    if (data.status === 'published') {
      const merged = { ...quiz, ...updates };
      const errors = validateQuiz(merged, true, lang);
      if (errors.length > 0) return { error: errors.join(' • ') };
    }

    await update(ref(db, `user_quizzes/${quizId}`), updates);
    return { success: true };
  } catch (e) {
    return { error: 'Error: ' + e.message };
  }
}

export async function deleteQuiz(quizId, lang = 'ar') {
  if (!isLoggedIn() || !quizId) return { error: 'Invalid' };
  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}`));
    if (!snap.exists()) return { error: lang === 'ar' ? 'مش موجود' : 'Not found' };
    
    if (snap.val().creator !== currentUser && !isAdminUser()) {
      return { error: lang === 'ar' ? 'مش كويزك ومش أدمن' : 'Not your quiz or admin' };
    }
    
    await remove(ref(db, `user_quizzes/${quizId}`));
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function duplicateQuiz(quizId, lang = 'ar') {
  if (!isLoggedIn() || !quizId) return { error: 'Invalid' };
  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}`));
    if (!snap.exists()) return { error: lang === 'ar' ? 'مش موجود' : 'Not found' };
    const quiz = snap.val();

    const copy = {
      ...quiz,
      title: quiz.title + (lang === 'ar' ? ' (نسخة)' : ' (Copy)'),
      creator: currentUser,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'draft',
      plays: 0, ratings: {}, reviews: {},
      avgRating: 0, ratingCount: 0, reviewCount: 0
    };

    const newRef = push(ref(db, 'user_quizzes'));
    await set(newRef, copy);
    return { success: true, id: newRef.key };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getQuiz(quizId) {
  if (!quizId) return null;
  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}`));
    return snap.exists() ? { id: quizId, ...snap.val() } : null;
  } catch (e) { return null; }
}

export async function getUserQuizzes(user = null, fetchAll = false) {
  const u = user || currentUser;
  if (!u) return [];
  try {
    const snap = await get(ref(db, 'user_quizzes'));
    if (!snap.exists()) return [];
    const all = snap.val();
    const shouldFetchAll = fetchAll || isAdminUser();
    
    return Object.entries(all)
      .filter(([, q]) => shouldFetchAll || q.creator === u)
      .map(([id, q]) => ({ id, ...q }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (e) { return []; }
}

export async function getCommunityQuizzes({ category = 'all', sortBy = 'newest', search = '' } = {}) {
  try {
    const snap = await get(ref(db, 'user_quizzes'));
    if (!snap.exists()) return [];
    let quizzes = Object.entries(snap.val())
      .filter(([, q]) => q.status === 'published')
      .map(([id, q]) => ({ id, ...q }));

    if (category !== 'all') quizzes = quizzes.filter(q => q.category === category);
    if (search) {
      const s = search.toLowerCase();
      quizzes = quizzes.filter(q =>
        q.title.toLowerCase().includes(s) ||
        (q.titleEn || '').toLowerCase().includes(s) ||
        q.creator.toLowerCase().includes(s)
      );
    }

    if (sortBy === 'newest') quizzes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    else if (sortBy === 'plays') quizzes.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    else if (sortBy === 'rating') quizzes.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

    return quizzes;
  } catch (e) { return []; }
}

export function listenCommunityQuizzes(callback) {
  return onValue(ref(db, 'user_quizzes'), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const quizzes = Object.entries(snap.val())
      .filter(([, q]) => q.status === 'published')
      .map(([id, q]) => ({ id, ...q }));
    callback(quizzes);
  });
}

export async function publishQuiz(quizId, lang = 'ar') {
  return updateQuiz(quizId, { status: 'published' }, lang);
}

export async function unpublishQuiz(quizId, lang = 'ar') {
  return updateQuiz(quizId, { status: 'draft' }, lang);
}

export async function incrementPlays(quizId) {
  if (!quizId) return;
  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}/plays`));
    const current = snap.exists() ? (snap.val() || 0) : 0;
    await set(ref(db, `user_quizzes/${quizId}/plays`), current + 1);
  } catch (e) { console.warn(e); }
}

export async function addReview(quizId, rating, text = '', lang = 'ar') {
  if (!isLoggedIn() || !quizId) return { error: lang === 'ar' ? 'سجل دخول الأول' : 'Please login first' };
  const r = Number(rating);
  if (r < 1 || r > 5) return { error: lang === 'ar' ? 'التقييم من 1 لـ 5' : 'Rating must be 1-5' };

  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}`));
    if (!snap.exists()) return { error: lang === 'ar' ? 'مش موجود' : 'Not found' };
    const quiz = snap.val();
    if (quiz.creator === currentUser) return { error: lang === 'ar' ? 'مينفعش تقيم كويزك' : 'Cannot rate your own quiz' };

    const review = { user: currentUser, rating: r, text: sanitize(text, MAX_REVIEW_LEN), time: Date.now() };
    const ratings = { ...(quiz.ratings || {}), [currentUser]: r };
    const reviews = { ...(quiz.reviews || {}), [currentUser]: review };
    const ratingValues = Object.values(ratings);
    const avg = ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length;

    await update(ref(db, `user_quizzes/${quizId}`), {
      ratings, reviews,
      avgRating: Math.round(avg * 10) / 10,
      ratingCount: ratingValues.length,
      reviewCount: Object.keys(reviews).length
    });

    return { success: true, avgRating: Math.round(avg * 10) / 10 };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getReviews(quizId) {
  if (!quizId) return [];
  try {
    const snap = await get(ref(db, `user_quizzes/${quizId}/reviews`));
    if (!snap.exists()) return [];
    return Object.values(snap.val()).sort((a, b) => (b.time || 0) - (a.time || 0));
  } catch (e) { return []; }
}

export function getCreatorStats(quizzes) {
  const stats = { total: quizzes.length, published: 0, drafts: 0, totalPlays: 0, totalRatings: 0, avgRating: 0, totalReviews: 0 };
  let ratingSum = 0, ratingCount = 0;

  quizzes.forEach(q => {
    if (q.status === 'published') stats.published++;
    else stats.drafts++;
    stats.totalPlays += (q.plays || 0);
    stats.totalReviews += (q.reviewCount || 0);
    if (q.avgRating && q.ratingCount) {
      ratingSum += q.avgRating * q.ratingCount;
      ratingCount += q.ratingCount;
    }
  });

  stats.totalRatings = ratingCount;
  stats.avgRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;
  return stats;
}

window.NFQuizBuilder = {
  QUIZ_CATEGORIES, QUIZ_ICONS, uploadImage, validateQuiz,
  createQuiz, updateQuiz, deleteQuiz, duplicateQuiz,
  getQuiz, getUserQuizzes, getCommunityQuizzes, listenCommunityQuizzes,
  publishQuiz, unpublishQuiz, incrementPlays, addReview, getReviews, getCreatorStats
};