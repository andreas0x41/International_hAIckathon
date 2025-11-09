// Utility functions for managing guest user progress in localStorage

interface GuestQuizProgress {
  quiz_id: string;
  score: number;
  completed_at: string | null;
  is_unlocked: boolean;
}

const GUEST_PROGRESS_KEY = 'eco_rewards_guest_progress';

export const getGuestProgress = (): GuestQuizProgress[] => {
  try {
    const stored = localStorage.getItem(GUEST_PROGRESS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveGuestProgress = (progress: GuestQuizProgress) => {
  try {
    const currentProgress = getGuestProgress();
    const existingIndex = currentProgress.findIndex(p => p.quiz_id === progress.quiz_id);
    
    if (existingIndex >= 0) {
      currentProgress[existingIndex] = progress;
    } else {
      currentProgress.push(progress);
    }
    
    localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(currentProgress));
  } catch (error) {
    console.error('Failed to save guest progress:', error);
  }
};

export const unlockNextGuestQuiz = (currentQuizId: string, allQuizzes: any[]) => {
  try {
    const currentQuiz = allQuizzes.find(q => q.id === currentQuizId);
    if (!currentQuiz) return;
    
    const nextQuiz = allQuizzes.find(q => q.path_order === currentQuiz.path_order + 1);
    if (!nextQuiz) return;
    
    const currentProgress = getGuestProgress();
    const nextProgress = currentProgress.find(p => p.quiz_id === nextQuiz.id);
    
    if (!nextProgress) {
      saveGuestProgress({
        quiz_id: nextQuiz.id,
        score: 0,
        completed_at: null,
        is_unlocked: true,
      });
    }
  } catch (error) {
    console.error('Failed to unlock next quiz:', error);
  }
};

export const clearGuestProgress = () => {
  try {
    localStorage.removeItem(GUEST_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to clear guest progress:', error);
  }
};

export const transferGuestProgressToUser = async (userId: string, supabase: any) => {
  try {
    const guestProgress = getGuestProgress();
    
    if (guestProgress.length === 0) {
      return { success: true, transferred: 0 };
    }
    
    // Insert all progress records
    const { error } = await supabase
      .from('user_progress')
      .insert(
        guestProgress.map(p => ({
          user_id: userId,
          quiz_id: p.quiz_id,
          score: p.score,
          completed_at: p.completed_at,
          is_unlocked: p.is_unlocked,
        }))
      );
    
    if (error) throw error;
    
    // Calculate total points from completed quizzes
    const totalPoints = guestProgress
      .filter(p => p.completed_at)
      .reduce((sum, p) => sum + p.score, 0);
    
    if (totalPoints > 0) {
      // Update user profile with accumulated points
      await supabase
        .from('profiles')
        .update({ total_points: totalPoints })
        .eq('id', userId);
    }
    
    // Clear localStorage after successful transfer
    clearGuestProgress();
    
    return { success: true, transferred: guestProgress.length, points: totalPoints };
  } catch (error) {
    console.error('Failed to transfer guest progress:', error);
    return { success: false, transferred: 0, error };
  }
};
