import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Leaf, Sparkles } from "lucide-react";
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

export const AdventurePathMap = () => {
  const navigate = useNavigate();
  const [hoveredQuiz, setHoveredQuiz] = useState<string | null>(null);

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

    const { data: existingProgress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("quiz_id", quiz.id)
      .maybeSingle();

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

  // Create a winding path layout
  const getPathPosition = (index: number) => {
    const positions = [
      { x: 10, y: 20 },   // Start bottom-left
      { x: 30, y: 60 },   // Up
      { x: 50, y: 50 },   // Right
      { x: 70, y: 70 },   // Down-right
      { x: 85, y: 40 },   // Up-right
    ];
    return positions[index % positions.length];
  };

  return (
    <div className="relative min-h-[600px] bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl p-8 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 opacity-20">
        <Leaf className="h-24 w-24 text-primary animate-pulse" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20">
        <Sparkles className="h-24 w-24 text-accent animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* SVG Path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M 10% 80% Q 25% 40%, 30% 40% T 50% 50% Q 60% 60%, 70% 30% T 85% 60%"
          stroke="url(#pathGradient)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="10,5"
          className="animate-[dash_20s_linear_infinite]"
        />
      </svg>

      {/* Quiz nodes */}
      <div className="relative" style={{ zIndex: 1 }}>
        {quizzes.map((quiz, index) => {
          const { status, unlocked } = getQuizStatus(quiz, index);
          const quizProgress = progress.find((p) => p.quiz_id === quiz.id);
          const position = getPathPosition(index);
          const isHovered = hoveredQuiz === quiz.id;

          return (
            <div
              key={quiz.id}
              className="absolute transition-all duration-300"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                zIndex: isHovered ? 10 : 1,
              }}
              onMouseEnter={() => setHoveredQuiz(quiz.id)}
              onMouseLeave={() => setHoveredQuiz(null)}
            >
              {/* Quiz Node */}
              <div
                className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                  status === "completed"
                    ? "bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)]"
                    : status === "unlocked"
                    ? "bg-gradient-to-br from-gold to-accent shadow-[var(--shadow-gold)] animate-pulse"
                    : "bg-muted opacity-60"
                }`}
                onClick={() => handleStartQuiz(quiz, unlocked)}
              >
                {status === "completed" && (
                  <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
                )}
                {status === "unlocked" && (
                  <div className="text-2xl font-bold text-gold-foreground">{quiz.path_order}</div>
                )}
                {status === "locked" && (
                  <Lock className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Hover Card */}
              {isHovered && (
                <Card className="absolute left-24 top-0 w-80 shadow-[var(--shadow-lg)] animate-in fade-in slide-in-from-left-2 duration-200 z-20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{quiz.title}</CardTitle>
                      {status === "completed" && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                      {status === "locked" && (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <CardDescription>{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
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
                      {unlocked && (
                        <Button className="w-full" onClick={() => handleStartQuiz(quiz, unlocked)}>
                          {status === "completed" ? "Retake Quiz" : "Start Quiz"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
