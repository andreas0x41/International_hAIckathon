-- Fix search_path for security - recreate functions with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_level(points INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'public'
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