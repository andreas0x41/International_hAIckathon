-- Function to calculate level from points
-- Level 1: 0-99 points
-- Level 2: 100-249 points
-- Level 3: 250-499 points
-- Level 4: 500-999 points
-- Level 5: 1000-1999 points
-- And so on (each level requires double the previous threshold)

CREATE OR REPLACE FUNCTION public.calculate_level(points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF points < 100 THEN
    RETURN 1;
  ELSIF points < 250 THEN
    RETURN 2;
  ELSIF points < 500 THEN
    RETURN 3;
  ELSIF points < 1000 THEN
    RETURN 4;
  ELSIF points < 2000 THEN
    RETURN 5;
  ELSIF points < 4000 THEN
    RETURN 6;
  ELSIF points < 8000 THEN
    RETURN 7;
  ELSE
    RETURN 8 + FLOOR((points - 8000)::NUMERIC / 10000);
  END IF;
END;
$$;

-- Function to automatically update level when points change
CREATE OR REPLACE FUNCTION public.update_level_on_points_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.current_level := calculate_level(NEW.total_points);
  RETURN NEW;
END;
$$;

-- Create trigger to update level whenever points change
DROP TRIGGER IF EXISTS update_level_trigger ON public.profiles;
CREATE TRIGGER update_level_trigger
  BEFORE UPDATE OF total_points ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_level_on_points_change();

-- Update all existing profiles to have correct levels
UPDATE public.profiles
SET current_level = calculate_level(total_points);