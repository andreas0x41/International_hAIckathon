-- Update the SELECT policy on quizzes table to allow everyone (including unauthenticated users) to view quizzes
DROP POLICY IF EXISTS "Authenticated users can view quizzes" ON public.quizzes;

CREATE POLICY "Everyone can view quizzes" 
ON public.quizzes 
FOR SELECT 
TO public
USING (true);