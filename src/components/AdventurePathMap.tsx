import { useState, useRef, useEffect } from "react";
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

interface PathPoint {
  x: number;
  y: number;
}

interface Decoration {
  x: number;
  y: number;
  type: 'tree' | 'grass' | 'flower' | 'cloud' | 'rock' | 'mushroom' | 'butterfly';
  size: number;
  rotation?: number;
}

export const AdventurePathMap = () => {
  const navigate = useNavigate();
  const [hoveredQuiz, setHoveredQuiz] = useState<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleMouseLeave = (quizId: string) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set a 500ms delay before closing
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredQuiz(null);
    }, 500);
  };

  const handleMouseEnter = (quizId: string, position: PathPoint) => {
    // Clear any pending timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    setHoveredQuiz(quizId);
    setHoverPosition({ x: position.x, y: position.y });
  };

  // Generate winding S-curve path points - one point per quiz
  const generatePathPoints = (numQuizzes: number): PathPoint[] => {
    const points: PathPoint[] = [];
    const verticalSpacing = 200; // Consistent spacing between nodes
    const amplitude = isMobile ? 120 : 180; // Width of the curve
    const centerX = isMobile ? 200 : 300; // Center of the container
    const frequency = 0.8; // Controls the wave frequency
    
    for (let i = 0; i < numQuizzes; i++) {
      const y = i * verticalSpacing + 150; // Start at 150 from top
      // Create smooth S-curves using sine wave
      const x = centerX + amplitude * Math.sin((i * Math.PI) / (frequency * 3));
      points.push({ x, y });
    }
    
    return points;
  };

  // Generate smooth SVG path through all points using quadratic bezier curves
  const generateSVGPath = (points: PathPoint[]): string => {
    if (points.length < 2) return "";
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      const prev = points[i - 1];
      
      // Control point for smooth curve
      const controlX = (prev.x + curr.x) / 2;
      const controlY = (prev.y + curr.y) / 2;
      
      // Quadratic bezier curve to current point
      path += ` Q ${prev.x} ${(prev.y + curr.y) / 2}, ${controlX} ${controlY}`;
      path += ` T ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  // Generate random decorations that don't overlap with nodes
  const generateDecorations = (pathPoints: PathPoint[], containerHeight: number): Decoration[] => {
    const decorations: Decoration[] = [];
    const types: Decoration['type'][] = ['tree', 'grass', 'flower', 'cloud', 'rock', 'mushroom', 'butterfly'];
    const numDecorations = isMobile ? 25 : 50;
    const containerWidth = isMobile ? 400 : 600;
    
    for (let i = 0; i < numDecorations; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      let x, y;
      let validPosition = false;
      
      // Try to find a valid position that doesn't overlap with path
      for (let attempts = 0; attempts < 10; attempts++) {
        x = Math.random() * (containerWidth - 100) + 50;
        y = Math.random() * (containerHeight - 200) + 100;
        
        // Check distance from all path points
        validPosition = pathPoints.every(point => {
          const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
          return distance > 100; // Minimum distance from path
        });
        
        if (validPosition) break;
      }
      
      if (validPosition) {
        decorations.push({
          x: x!,
          y: y!,
          type,
          size: Math.random() * 20 + 15,
          rotation: Math.random() * 360,
        });
      }
    }
    
    return decorations;
  };

  const pathPoints = generatePathPoints(quizzes.length);
  const svgPath = generateSVGPath(pathPoints);
  const containerHeight = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1].y + 300 : 1000;
  
  // Memoize decorations so they don't change between renders
  const decorationsKey = `${quizzes.length}-${isMobile}`;
  const decorations = useRef<{ key: string; items: Decoration[] }>({ key: '', items: [] });
  
  if (decorations.current.key !== decorationsKey) {
    decorations.current = {
      key: decorationsKey,
      items: generateDecorations(pathPoints, containerHeight)
    };
  }

  const renderDecoration = (decoration: Decoration, index: number) => {
    const { x, y, type, size, rotation = 0 } = decoration;
    
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
      case 'rock':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y}) rotate(${rotation})`} opacity="0.5">
            <ellipse cx="0" cy="0" rx={size * 0.5} ry={size * 0.4} fill="hsl(var(--muted))" />
            <ellipse cx="-3" cy="-2" rx={size * 0.3} ry={size * 0.25} fill="hsl(var(--muted))" opacity="0.7" />
          </g>
        );
      case 'mushroom':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y})`} opacity="0.7">
            <rect x="-2" y="-5" width="4" height={size * 0.4} fill="hsl(var(--muted-foreground))" rx="2" />
            <ellipse cx="0" cy={-size * 0.4} rx={size * 0.4} ry={size * 0.25} fill="hsl(var(--destructive))" opacity="0.6" />
            <circle cx="-3" cy={-size * 0.4} r="2" fill="hsl(var(--background))" opacity="0.8" />
            <circle cx="3" cy={-size * 0.35} r="1.5" fill="hsl(var(--background))" opacity="0.8" />
          </g>
        );
      case 'butterfly':
        return (
          <g key={`dec-${index}`} transform={`translate(${x}, ${y}) rotate(${rotation})`} opacity="0.6" className="animate-pulse" style={{ animationDuration: '3s' }}>
            <ellipse cx="-4" cy="0" rx={size * 0.25} ry={size * 0.35} fill="hsl(var(--accent))" />
            <ellipse cx="4" cy="0" rx={size * 0.25} ry={size * 0.35} fill="hsl(var(--accent))" />
            <line x1="0" y1="-5" x2="0" y2="5" stroke="hsl(var(--foreground))" strokeWidth="1" />
          </g>
        );
    }
  };

  const getProgressPercentage = (score: number, quiz: Quiz) => {
    const maxScore = quiz.questions_json.length * quiz.points_per_question;
    return Math.min((score / maxScore) * 100, 100);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl shadow-[var(--shadow-lg)] max-w-full mx-auto">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-green-50 to-green-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
      
      {/* Scrollable Content */}
      <div 
        ref={containerRef}
        className="relative overflow-y-auto overflow-x-hidden"
        style={{ height: isMobile ? '600px' : '700px' }}
      >
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: isMobile ? '400px' : '600px' }}>
          <svg 
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" 
            style={{ 
              height: `${containerHeight}px`,
              width: isMobile ? '400px' : '600px',
            }}
            viewBox={isMobile ? "0 0 400 " + containerHeight : "0 0 600 " + containerHeight}
            preserveAspectRatio="xMidYMin meet"
          >
            {/* Decorations */}
            {decorations.current.items.map((decoration, index) => renderDecoration(decoration, index))}
          
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
          <div className="relative mx-auto" style={{ 
            height: `${containerHeight}px`,
            width: isMobile ? '400px' : '600px',
          }}>
            {quizzes.map((quiz, index) => {
              const { status, unlocked, score } = getQuizStatus(quiz, index);
              const position = pathPoints[index];
              
              if (!position) return null; // Safety check
              
              const isHovered = hoveredQuiz === quiz.id;
              const progressPercentage = status === "completed" ? getProgressPercentage(score, quiz) : 0;
              const nodeSize = isMobile ? 16 : 20;
              const circleRadius = isMobile ? 32 : 40;

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
                {/* Progress Circle for Completed Quizzes */}
                {status === "completed" && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <svg 
                      className="w-28 h-28" 
                      style={{ transform: 'rotate(-90deg)' }}
                      viewBox="0 0 120 120"
                    >
                      {/* Background circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={circleRadius}
                        fill="none"
                        stroke="hsl(var(--muted))"
                        strokeWidth="6"
                        opacity="0.3"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="60"
                        cy="60"
                        r={circleRadius}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="6"
                        strokeDasharray={`${2 * Math.PI * circleRadius}`}
                        strokeDashoffset={`${2 * Math.PI * circleRadius * (1 - progressPercentage / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    {/* Percentage Label */}
                    <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 bg-card border border-border rounded-full px-2 py-0.5 text-xs font-bold text-primary whitespace-nowrap shadow-sm">
                      {Math.round(progressPercentage)}%
                    </div>
                  </div>
                )}

                {/* Glowing Ring for Current Quiz */}
                {status === "current" && (
                  <svg className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2">
                    <circle
                      cx="48"
                      cy="48"
                      r={circleRadius + 2}
                      fill="none"
                      stroke="hsl(var(--accent))"
                      strokeWidth="3"
                      opacity="0.6"
                    />
                  </svg>
                )}
                
                {/* Quiz Node */}
                <div
                  className={`relative rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                    status === "completed"
                      ? "bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)]"
                      : status === "current"
                      ? "bg-gradient-to-br from-accent via-gold to-accent shadow-[var(--shadow-gold)]"
                      : "bg-muted opacity-60"
                  } ${isHovered ? 'scale-110' : ''}`}
                  style={{
                    width: `${nodeSize * 4}px`,
                    height: `${nodeSize * 4}px`,
                  }}
                  onClick={() => handleStartQuiz(quiz, unlocked)}
                  onMouseEnter={() => handleMouseEnter(quiz.id, position)}
                  onMouseLeave={() => handleMouseLeave(quiz.id)}
                >
                  {status === "completed" && (
                    <CheckCircle2 className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-primary-foreground`} />
                  )}
                  {status === "current" && (
                    <div className="relative">
                      <Sparkles className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-gold-foreground drop-shadow-lg`} />
                    </div>
                  )}
                  {status === "locked" && (
                    <Lock className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-muted-foreground`} />
                  )}
                </div>

                {/* Hover Card */}
                {isHovered && !isMobile && (
                  <Card 
                    className="hover-card absolute left-24 top-0 w-80 shadow-[var(--shadow-lg)] animate-in fade-in slide-in-from-left-2 duration-200 z-30 bg-card"
                    onMouseEnter={() => handleMouseEnter(quiz.id, position)}
                    onMouseLeave={() => handleMouseLeave(quiz.id)}
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
    </div>
  );
};
