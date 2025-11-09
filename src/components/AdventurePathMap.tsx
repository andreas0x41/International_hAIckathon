import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Sparkles } from "lucide-react";
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
  const getPathPosition = (index: number, total: number) => {
    const positions = [
      { x: 15, y: 75 },   // Start bottom-left
      { x: 25, y: 55 },   // Up-left
      { x: 40, y: 45 },   // Center-left
      { x: 55, y: 60 },   // Down-center
      { x: 70, y: 40 },   // Up-right
      { x: 80, y: 25 },   // Top-right
    ];
    return positions[index % positions.length];
  };

  const getPathString = () => {
    let pathString = "";
    quizzes.forEach((_, index) => {
      const pos = getPathPosition(index, quizzes.length);
      if (index === 0) {
        pathString += `M ${pos.x}% ${pos.y}% `;
      } else {
        const prevPos = getPathPosition(index - 1, quizzes.length);
        const midX = (prevPos.x + pos.x) / 2;
        const midY = (prevPos.y + pos.y) / 2 - 10; // Curve upward
        pathString += `Q ${midX}% ${midY}%, ${pos.x}% ${pos.y}% `;
      }
    });
    return pathString;
  };

  return (
    <div className="relative min-h-[700px] rounded-3xl overflow-hidden shadow-[var(--shadow-lg)] bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 right-20 w-40 h-40 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-36 h-36 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-40 right-1/4 w-28 h-28 rounded-full bg-gold/20 blur-3xl" />
      </div>

      {/* Overlay for better contrast */}
      <div className="absolute inset-0 bg-background/5" />

      {/* SVG Path connecting nodes */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path
          d={getPathString()}
          stroke="url(#pathGradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />
        {/* Dashed overlay for movement effect */}
        <path
          d={getPathString()}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="15,15"
          className="animate-[dash_3s_linear_infinite]"
        />
      </svg>

      {/* Decorative sparkles */}
      <div className="absolute top-10 right-10 opacity-30 animate-pulse" style={{ animationDelay: '0s', zIndex: 0 }}>
        <Sparkles className="h-16 w-16 text-accent" />
      </div>
      <div className="absolute bottom-20 left-10 opacity-30 animate-pulse" style={{ animationDelay: '1s', zIndex: 0 }}>
        <Sparkles className="h-12 w-12 text-primary" />
      </div>

      {/* Quiz nodes */}
      <div className="relative p-8" style={{ zIndex: 2 }}>
        {quizzes.map((quiz, index) => {
          const { status, unlocked } = getQuizStatus(quiz, index);
          const quizProgress = progress.find((p) => p.quiz_id === quiz.id);
          const position = getPathPosition(index, quizzes.length);
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
