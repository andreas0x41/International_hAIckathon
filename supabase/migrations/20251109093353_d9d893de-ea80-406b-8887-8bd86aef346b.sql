-- Add streak tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_quiz_date DATE;

-- Create function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID, p_quiz_completed_date TIMESTAMPTZ)
RETURNS TABLE (
  new_streak INTEGER,
  streak_bonus INTEGER,
  is_new_record BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_quiz_date DATE;
  v_days_diff INTEGER;
  v_streak_bonus INTEGER := 0;
  v_is_new_record BOOLEAN := false;
BEGIN
  -- Get current profile data
  SELECT current_streak, longest_streak, last_quiz_date
  INTO v_current_streak, v_longest_streak, v_last_quiz_date
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calculate days difference
  IF v_last_quiz_date IS NULL THEN
    v_days_diff := 999; -- First quiz ever
  ELSE
    v_days_diff := DATE(p_quiz_completed_date) - v_last_quiz_date;
  END IF;

  -- Update streak based on days difference
  IF v_days_diff = 1 THEN
    -- Consecutive day - increment streak
    v_current_streak := v_current_streak + 1;
    
    -- Calculate bonus points (10 points per day of streak, max 100)
    v_streak_bonus := LEAST(v_current_streak * 10, 100);
    
  ELSIF v_days_diff = 0 THEN
    -- Same day - keep streak, no bonus
    v_streak_bonus := 0;
    
  ELSE
    -- Streak broken - reset to 1
    v_current_streak := 1;
    v_streak_bonus := 0;
  END IF;

  -- Check if new record
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
    v_is_new_record := true;
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_quiz_date = DATE(p_quiz_completed_date),
    total_points = total_points + v_streak_bonus
  WHERE id = p_user_id;

  -- Return results
  RETURN QUERY SELECT v_current_streak, v_streak_bonus, v_is_new_record;
END;
$$;