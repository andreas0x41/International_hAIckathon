import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lock, CheckCircle2, Sparkles, Star } from "lucide-react";
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

interface PathPoint {
  x: number;
  y: number;
}

interface Decoration {
  x: number;
  y: number;
  type: 'tree' | 'grass' | 'flower' | 'cloud';
  size: number;
}

export const AdventurePathMap = () => {
  const navigate = useNavigate();
  const [hoveredQuiz, setHoveredQuiz] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      return { status: "completed", unlocked: true, score: quizProgress.score };
    }
    
    if (index === 0 || quizProgress?.is_unlocked) {
      return { status: "current", unlocked: true, score: 0 };
    }
    
    const previousQuiz = quizzes[index - 1];
    const previousProgress = progress.find((p) => p.quiz_id === previousQuiz?.id);
    
    if (previousProgress?.completed_at) {
      return { status: "current", unlocked: true, score: 0 };
    }
    
    return { status: "locked", unlocked: false, score: 0 };
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

  // Generate winding S-curve path
  const generatePathPoints = (numPoints: number): PathPoint[] => {
    const points: PathPoint[] = [];
    const amplitude = 150; // Width of the curve
    const verticalSpacing = 180; // Vertical distance between nodes
    const centerX = 300; // Center of the container
    
    for (let i = 0; i < numPoints; i++) {
      const y = i * verticalSpacing + 100;
      // Create smooth S-curves using sine wave
      const x = centerX + amplitude * Math.sin((i * Math.PI) / 2.5);
      points.push({ x, y });
    }
    
    return points;
  };

  // Generate SVG path string from points
  const generateSVGPath = (points: PathPoint[]): string => {
    if (points.length < 2) return "";
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const controlPointOffset = 40;
      
      // Create smooth curves using quadratic bezier
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      
      path += ` Q ${prev.x} ${midY}, ${midX} ${midY}`;
      path += ` Q ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // Generate random decorations that don't overlap with nodes
  const generateDecorations = (pathPoints: PathPoint[]): Decoration[] => {
    const decorations: Decoration[] = [];
    const types: Decoration['type'][] = ['tree', 'grass', 'flower', 'cloud'];
    const numDecorations = 30;
    
    for (let i = 0; i < numDecorations; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      let x, y;
      let validPosition = false;
      
      // Try to find a valid position that doesn't overlap with path
      for (let attempts = 0; attempts < 10; attempts++) {
        x = Math.random() * 550 + 25;
        y = Math.random() * (pathPoints.length * 180) + 50;
        
        // Check distance from all path points
        validPosition = pathPoints.every(point => {
          const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
          return distance > 80; // Minimum distance from path
        });
        
        if (validPosition) break;
      }
      
      if (validPosition) {
        decorations.push({
          x: x!,
          y: y!,
          type,
          size: Math.random() * 20 + 15,
        });
      }
    }
    
    return decorations;
  };

  const pathPoints = generatePathPoints(Math.max(quizzes.length, 8));
  const svgPath = generateSVGPath(pathPoints);
  const decorations = generateDecorations(pathPoints);

  const renderDecoration = (decoration: Decoration, index: number) => {
    const { x, y, type, size } = decoration;
    
    switch (type) {
      case 'tree':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y})`} opacity="0.6">
            <rect x="-3" y="0" width="6" height={size * 0.6} fill="hsl(var(--primary))" opacity="0.5" />
            <circle cx="0" cy="-5" r={size * 0.4} fill="hsl(var(--secondary))" />
            <circle cx="-8" cy="0" r={size * 0.35} fill="hsl(var(--secondary))" />
            <circle cx="8" cy="0" r={size * 0.35} fill="hsl(var(--secondary))" />
          </g>
        );
      case 'grass':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y})`} opacity="0.5">
            <path d={`M -${size/3} 0 Q 0 -${size} ${size/3} 0`} stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
            <path d={`M -${size/4} 0 Q 0 -${size*0.8} ${size/4} 0`} stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
          </g>
        );
      case 'flower':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y})`} opacity="0.7">
            <line x1="0" y1="0" x2="0" y2={size * 0.5} stroke="hsl(var(--primary))" strokeWidth="2" />
            <circle cx="0" cy={-size * 0.3} r={size * 0.25} fill="hsl(var(--accent))" />
            <circle cx="-5" cy={-size * 0.3} r={size * 0.2} fill="hsl(var(--accent))" opacity="0.8" />
            <circle cx="5" cy={-size * 0.3} r={size * 0.2} fill="hsl(var(--accent))" opacity="0.8" />
          </g>
        );
      case 'cloud':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y})`} opacity="0.3">
            <ellipse cx="0" cy="0" rx={size * 0.6} ry={size * 0.4} fill="hsl(var(--muted-foreground))" />
            <ellipse cx={size * 0.3} cy="-2" rx={size * 0.5} ry={size * 0.35} fill="hsl(var(--muted-foreground))" />
            <ellipse cx={-size * 0.3} cy="-2" rx={size * 0.5} ry={size * 0.35} fill="hsl(var(--muted-foreground))" />
          </g>
        );
    }
  };

  const getStarRating = (score: number, totalQuestions: number) => {
    const percentage = (score / (totalQuestions * 10)) * 100;
    if (percentage >= 90) return 3;
    if (percentage >= 70) return 2;
    return 1;
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-[var(--shadow-lg)]">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-green-50 to-green-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
      
      {/* Scrollable Content */}
      <div 
        ref={containerRef}
        className="relative overflow-y-auto overflow-x-hidden"
        style={{ height: '700px' }}
      >
        <svg 
          className="absolute top-0 left-0 w-full pointer-events-none" 
          style={{ height: `${pathPoints[pathPoints.length - 1]?.y + 200}px` }}
        >
          {/* Decorations */}
          {decorations.map((decoration, index) => renderDecoration(decoration, index))}
          
          {/* Path Shadow */}
          <path
            d={svgPath}
            stroke="hsl(var(--muted))"
            strokeWidth="28"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            transform="translate(3, 3)"
          />
          
          {/* Main Path */}
          <path
            d={svgPath}
            stroke="hsl(var(--primary))"
            strokeWidth="24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          />
          
          {/* Path Highlight */}
          <path
            d={svgPath}
            stroke="hsl(var(--secondary))"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.4"
          />
        </svg>

        {/* Quiz Nodes */}
        <div className="relative" style={{ height: `${pathPoints[pathPoints.length - 1]?.y + 200}px` }}>
          {quizzes.map((quiz, index) => {
            const { status, unlocked, score } = getQuizStatus(quiz, index);
            const position = pathPoints[index] || pathPoints[pathPoints.length - 1];
            const isHovered = hoveredQuiz === quiz.id;
            const stars = status === "completed" ? getStarRating(score, quiz.questions_json.length) : 0;

            return (
              <div
                key={quiz.id}
                className="absolute"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered ? 20 : 10,
                }}
              >
                {/* Quiz Node */}
                <div
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    status === "completed"
                      ? "bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)] scale-110"
                      : status === "current"
                      ? "bg-gradient-to-br from-accent to-gold shadow-[var(--shadow-gold)] animate-pulse scale-110"
                      : "bg-muted opacity-60 scale-100"
                  } ${isHovered ? 'scale-125' : ''}`}
                  onClick={() => handleStartQuiz(quiz, unlocked)}
                  onMouseEnter={(e) => {
                    setHoveredQuiz(quiz.id);
                    setHoverPosition({ x: position.x, y: position.y });
                  }}
                  onMouseLeave={(e) => {
                    // Check if we're moving to the hover card
                    const relatedTarget = e.relatedTarget as HTMLElement;
                    if (!relatedTarget?.closest('.hover-card')) {
                      setHoveredQuiz(null);
                    }
                  }}
                >
                  {status === "completed" && (
                    <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
                  )}
                  {status === "current" && (
                    <div className="relative">
                      <Sparkles className="h-10 w-10 text-gold-foreground" />
                      <div className="absolute inset-0 animate-ping">
                        <Sparkles className="h-10 w-10 text-gold-foreground opacity-50" />
                      </div>
                    </div>
                  )}
                  {status === "locked" && (
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Star Rating for Completed */}
                {status === "completed" && stars > 0 && (
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < stars ? 'text-gold fill-gold' : 'text-muted'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Hover Card */}
                {isHovered && (
                  <Card 
                    className="hover-card absolute left-24 top-0 w-80 shadow-[var(--shadow-lg)] animate-in fade-in slide-in-from-left-2 duration-200 z-30 bg-card"
                    onMouseEnter={() => setHoveredQuiz(quiz.id)}
                    onMouseLeave={() => setHoveredQuiz(null)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{quiz.title}</CardTitle>
                        {status === "completed" && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        {status === "locked" && (
                          <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                        {status === "completed" && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Your score:</span>
                            <span className="font-semibold text-primary">{score}</span>
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
    </div>
  );
};
