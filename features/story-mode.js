/* ═══════════════════════════════════════════════════════════════════
   STORY MODE — Enhanced (v2)
   - Each stage has a specific quiz, part, and target score
   - Progress per chapter & per stage
   - Badge + coins + XP rewards
   - Auto-advances to next chapter when previous completes
   ═══════════════════════════════════════════════════════════════════ */

import { db, ref, get, set, update, currentUser, isLoggedIn, showToast } from '../firebase-shared.js';

export const STORY_CHAPTERS = [
  {
    id: 'ch1_horror',
    name: 'Horror World',
    nameAr: 'عالم الرعب',
    icon: '🎃',
    desc: 'A journey through horror classics',
    descAr: 'رحلة في أفلام الرعب الكلاسيكية',
    stages: [
      { quizKey: 'annabelle', part: 'part1', file: 'Annabelle Quiz.html', title: 'Annabelle (2014)', target: 5 },
      { quizKey: 'conjuring', part: 'part1', file: 'Conjuring Quiz.html', title: 'The Conjuring (2013)', target: 5 },
      { quizKey: 'TheNun', part: 'part1', file: 'The Nun Quiz.html', title: 'The Nun (2018)', target: 5 },
      { quizKey: 'FNAF', part: 'part1', file: 'FNAF Quiz.html', title: 'FNAF (2023)', target: 6 }
    ],
    reward: { coins: 2000, xp: 500, badge: '🎃 Horror Hero' }
  },
  {
    id: 'ch2_action',
    name: 'Action Heroes',
    nameAr: 'أبطال الأكشن',
    icon: '💥',
    desc: 'Superheroes on a mission',
    descAr: 'الأبطال الخارقون في مهمة',
    stages: [
      { quizKey: 'spiderman', part: 'part6', file: 'Spider-Man Quiz.html', title: 'Spider-Man Homecoming', target: 5 },
      { quizKey: 'avengers', part: 'part3', file: 'Avengers Quiz.html', title: 'Avengers: Infinity War', target: 5 },
      { quizKey: 'venom', part: 'part1', file: 'Venom Quiz.html', title: 'Venom (2018)', target: 6 },
      { quizKey: 'SquidGame', part: 'part1', file: 'Squid Game Quiz.html', title: 'Squid Game (2021)', target: 6 }
    ],
    reward: { coins: 2500, xp: 600, badge: '💥 Action Hero' }
  },
  {
    id: 'ch3_egyptian',
    name: 'Egyptian Cinema',
    nameAr: 'السينما المصرية',
    icon: '🇪🇬',
    desc: 'A comedy journey through Egyptian cinema',
    descAr: 'رحلة كوميدية في السينما المصرية',
    stages: [
      { quizKey: 'elharifa', part: 'all', file: 'El Harifa Quiz.html', title: 'El Harifa', target: 5 },
      { quizKey: 'barshama', part: 'all', file: 'Barshama Quiz.html', title: 'Barshama', target: 5 },
      { quizKey: 'beitelruby', part: 'all', file: 'Beit El Ruby Quiz.html', title: 'Beit El Ruby', target: 5 },
      { quizKey: 'ahmedwaahmed', part: 'all', file: 'Ahmed Wa Ahmed Quiz.html', title: 'Ahmed Wa Ahmed', target: 5 }
    ],
    reward: { coins: 2000, xp: 500, badge: '🇪🇬 Comedy Hero' }
  },
  {
    id: 'ch4_mystery',
    name: 'Mystery World',
    nameAr: 'عالم الغموض',
    icon: '🕵️',
    desc: 'Solving puzzles and crimes',
    descAr: 'حل الألغاز والجرائم',
    stages: [
      { quizKey: 'Wednesday', part: 'part1', file: 'Wednesday Quiz.html', title: 'Wednesday', target: 5 },
      { quizKey: 'knivesout', part: 'part1', file: 'Knives Out Quiz.html', title: 'Knives Out', target: 5 },
      { quizKey: 'blueelephant', part: 'part1', file: 'The Blue Elephant Quiz.html', title: 'The Blue Elephant', target: 6 }
    ],
    reward: { coins: 3000, xp: 700, badge: '🕵️ Mystery Hero' }
  },
  {
    id: 'ch5_scifi',
    name: 'Sci-Fi',
    nameAr: 'الخيال العلمي',
    icon: '🚀',
    desc: 'Futuristic worlds and space',
    descAr: 'عوالم مستقبلية وفضاء',
    stages: [
      { quizKey: 'avatar', part: 'part1', file: 'Avatar Quiz.html', title: 'Avatar (2009)', target: 5 },
      { quizKey: 'mazerunner', part: 'part1', file: 'Maze Runner Quiz.html', title: 'The Maze Runner', target: 6 }
    ],
    reward: { coins: 1500, xp: 400, badge: '🚀 Sci-Fi Hero' }
  }
];

/* ─── Progress helpers ─── */
export async function getUserStoryProgress() {
  if (!isLoggedIn()) return {};
  const snap = await get(ref(db, `story_progress/${currentUser}`));
  return snap.val() || {};
}

/* ─── Called by quiz-core when user finishes a story stage ─── */
export async function completeStage(chapterId, stageIndex, actualScore = null) {
  if (!isLoggedIn()) return;
  
  const chapter = STORY_CHAPTERS.find(c => c.id === chapterId);
  if (!chapter) return;
  
  const stage = chapter.stages[stageIndex];
  if (!stage) return;
  
  // Check if user met the target
  if (actualScore !== null && actualScore < stage.target) {
    showToast('🎯', `Need at least ${stage.target} points to pass this stage!`, 'error');
    return;
  }
  
  const progRef = ref(db, `story_progress/${currentUser}/${chapterId}`);
  const progSnap = await get(progRef);
  const prog = progSnap.val() || { completedStages: 0 };
  
  // Only advance if completing the NEXT expected stage
  if (stageIndex > prog.completedStages) {
    showToast('⚠️', 'Complete previous stages first!', 'error');
    return;
  }
  
  const newCompleted = Math.max(prog.completedStages, stageIndex + 1);
  
  await set(progRef, {
    ...prog,
    completedStages: newCompleted,
    lastStageAt: Date.now()
  });
  
  // Check for chapter completion
  if (newCompleted === chapter.stages.length && !prog.completedAt) {
    await set(ref(db, `story_progress/${currentUser}/${chapterId}/completedAt`), Date.now());
    
    // Give rewards
    const coinsSnap = await get(ref(db, `users_data/${currentUser}/coins`));
    const xpSnap = await get(ref(db, `users_data/${currentUser}/xp`));
    await update(ref(db, `users_data/${currentUser}`), {
      coins: (coinsSnap.val() || 0) + chapter.reward.coins,
      xp: (xpSnap.val() || 0) + chapter.reward.xp
    });
    await set(ref(db, `badges/${currentUser}/${chapter.reward.badge}`), true);
    
    showToast('🏆', `Chapter "${chapter.name}" complete! +${chapter.reward.coins} coins, +${chapter.reward.xp} XP`, 'gold', 6000);
    
    return { chapterCompleted: true, reward: chapter.reward };
  } else {
    showToast('✅', `Stage ${stageIndex + 1} complete! On to the next one.`, 'success');
  }
  
  return { stageCompleted: true };
}

/* ─── Get available chapters (unlock based on progress) ─── */
export async function getChapterAvailability() {
  const progress = await getUserStoryProgress();
  const result = [];
  
  STORY_CHAPTERS.forEach((ch, i) => {
    const chProg = progress[ch.id] || { completedStages: 0 };
    const prevChapter = i > 0 ? STORY_CHAPTERS[i - 1] : null;
    const prevCompleted = !prevChapter || !!progress[prevChapter.id]?.completedAt;
    
    result.push({
      ...ch,
      progress: chProg,
      locked: !prevCompleted,
      completed: !!chProg.completedAt
    });
  });
  
  return result;
}

window.NFStory = { STORY_CHAPTERS, getUserStoryProgress, completeStage, getChapterAvailability };