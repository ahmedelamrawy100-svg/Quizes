import { db, ref, get, set, onValue, currentUser, showToast } from '../firebase-shared.js';

export const STORY_CHAPTERS = [
  {
    id: 'ch1_horror',
    name: 'عالم الرعب',
    icon: '🎃',
    desc: 'رحلة في أفلام الرعب الكلاسيكية',
    stages: [
      { quizKey: 'annabelle', file: 'Annabelle Quiz.html', title: 'أنابيل', target: 5, hint: 'البداية في عالم الدمى' },
      { quizKey: 'conjuring', file: 'Conjuring Quiz.html', title: 'الكونجورينج', target: 5, hint: 'العفاريت الحقيقية' },
      { quizKey: 'TheNun', file: 'The Nun Quiz.html', title: 'الراهبة', target: 5, hint: 'مواجهة فالاك' },
      { quizKey: 'FNAF', file: 'FNAF Quiz.html', title: 'فايف نايتس', target: 6, hint: 'الليلة الأخيرة' }
    ],
    reward: { coins: 2000, xp: 500, badge: '🎃 بطل الرعب' }
  },
  {
    id: 'ch2_action',
    name: 'أبطال الأكشن',
    icon: '💥',
    desc: 'الأبطال الخارقون في مهمة',
    stages: [
      { quizKey: 'spiderman', file: 'Spider-Man Quiz.html', title: 'سبايدرمان', target: 5 },
      { quizKey: 'avengers', file: 'Avengers Quiz.html', title: 'المنتقمون', target: 5 },
      { quizKey: 'venom', file: 'Venom Quiz.html', title: 'فينوم', target: 6 },
      { quizKey: 'SquidGame', file: 'Squid Game Quiz.html', title: 'لعبة الحبار', target: 6 }
    ],
    reward: { coins: 2500, xp: 600, badge: '💥 بطل الأكشن' }
  },
  {
    id: 'ch3_egyptian',
    name: 'السينما المصرية',
    icon: '🇪🇬',
    desc: 'رحلة كوميدية في السينما المصرية',
    stages: [
      { quizKey: 'elharifa', file: 'El Harifa Quiz.html', title: 'الحريفة', target: 5 },
      { quizKey: 'barshama', file: 'Barshama Quiz.html', title: 'برشامة', target: 5 },
      { quizKey: 'beitelruby', file: 'Beit El Ruby Quiz.html', title: 'بيت الروبي', target: 5 },
      { quizKey: 'ahmedwaahmed', file: 'Ahmed Wa Ahmed Quiz.html', title: 'أحمد وأحمد', target: 5 }
    ],
    reward: { coins: 2000, xp: 500, badge: '🇪🇬 بطل الكوميدي' }
  }
];

export async function getUserStoryProgress() {
  const snap = await get(ref(db, `story_progress/${currentUser}`));
  return snap.val() || {};
}

export async function completeStage(chapterId, stageIndex) {
  const chapter = STORY_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return;
  
  const progressSnap = await get(ref(db, `story_progress/${currentUser}/${chapterId}`));
  const prog = progressSnap.val() || { completedStages: 0 };
  const newCompleted = Math.max(prog.completedStages, stageIndex + 1);
  
  await set(ref(db, `story_progress/${currentUser}/${chapterId}`), {
    completedStages: newCompleted,
    updatedAt: Date.now()
  });
  
  // لو خلص الشابتر
  if (newCompleted === chapter.stages.length && !prog.completedAt) {
    await set(ref(db, `story_progress/${currentUser}/${chapterId}/completedAt`), Date.now());
    
    // مكافأة
    const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
    const xpSnap = await get(ref(db, `users_data/${currentUser}/xp`));
    await set(ref(db, `users_data/${currentUser}/coins`), (coinsSnap.val() || 0) + chapter.reward.coins);
    await set(ref(db, `users_data/${currentUser}/xp`), (xpSnap.val() || 0) + chapter.reward.xp);
    await set(ref(db, `badges/${currentUser}/${chapter.reward.badge}`), true);
    
    return { chapterCompleted: true, reward: chapter.reward };
  }
  
  return { stageCompleted: true };
}

window.NFStory = { STORY_CHAPTERS, getUserStoryProgress, completeStage };