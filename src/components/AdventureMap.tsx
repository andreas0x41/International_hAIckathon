import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Quiz {
  id: string;
  title: string;
  description: string;
  path_order: number;
  points_per_question: number;
  questions_json: any[];
}

interface UserProgress {
  quiz_id: string;
  is_unlocked: boolean;
  completed_at: string | null;
  score: number;
}

export const AdventureMap = () => {
  const navigate = useNavigate();

  const { data: quizzes = [] } = useQuery({
    queryKey: ["quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("path_order");
      if (error) throw error;
      return data as Quiz[];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserProgress[];
    },
  });

  const getQuizStatus = (quiz: Quiz, index: number) => {
    const quizProgress = progress.find((p) => p.quiz_id === quiz.id);
    
    if (quizProgress?.completed_at) {
      return { status: "completed", unlocked: true };
    }
    
    if (index === 0 || quizProgress?.is_unlocked) {
      return { status: "unlocked", unlocked: true };
    }
    
    const previousQuiz = quizzes[index - 1];
    const previousProgress = progress.find((p) => p.quiz_id === previousQuiz?.id);
    
    if (previousProgress?.completed_at) {
      return { status: "unlocked", unlocked: true };
    }
    
    return { status: "locked", unlocked: false };
  };

  const handleStartQuiz = async (quiz: Quiz, unlocked: boolean) => {
    if (!unlocked) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if progress entry exists
    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("quiz_id", quiz.id)
      .maybeSingle();

    // Create progress entry if it doesn't exist
    if (!existingProgress) {
      await supabase.from("user_progress").insert({
        user_id: user.id,
        quiz_id: quiz.id,
        is_unlocked: true,
        score: 0,
      });
    }

    navigate(`/quiz/${quiz.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Your Learning Journey</h2>
        <p className="text-muted-foreground">Complete quizzes to unlock new topics and earn points!</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((quiz, index) => {
          const { status, unlocked } = getQuizStatus(quiz, index);
          const quizProgress = progress.find((p) => p.quiz_id === quiz.id);

          return (
            <Card
              key={quiz.id}
              className={`relative transition-all duration-300 ${
                unlocked
                  ? "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] cursor-pointer"
                  : "opacity-60"
              } ${status === "completed" ? "border-primary border-2" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {quiz.title}
                      {status === "completed" && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                      {status === "locked" && <Lock className="h-5 w-5 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription className="mt-2">{quiz.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-semibold">{quiz.questions_json.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Points per question:</span>
                    <span className="font-semibold text-accent">{quiz.points_per_question}</span>
                  </div>
                  {status === "completed" && quizProgress && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your score:</span>
                      <span className="font-semibold text-primary">{quizProgress.score}</span>
                    </div>
                  )}
                  <Button
                    className="w-full"
                    disabled={!unlocked}
                    onClick={() => handleStartQuiz(quiz, unlocked)}
                  >
                    {status === "locked" && "Locked"}
                    {status === "unlocked" && "Start Quiz"}
                    {status === "completed" && "Retake Quiz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
