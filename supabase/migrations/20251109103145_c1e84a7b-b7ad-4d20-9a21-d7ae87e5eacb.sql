-- Add INSERT policy for quizzes table to allow authenticated users to create quizzes
CREATE POLICY "Authenticated users can create quizzes" 
ON public.quizzes 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for quizzes table to allow authenticated users to update quizzes
CREATE POLICY "Authenticated users can update quizzes" 
ON public.quizzes 
FOR UPDATE 
TO authenticated
USING (true);

-- Add DELETE policy for quizzes table to allow authenticated users to delete quizzes
CREATE POLICY "Authenticated users can delete quizzes" 
ON public.quizzes 
FOR DELETE 
TO authenticated
USING (true);