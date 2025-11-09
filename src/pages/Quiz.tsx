import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  context_for_ai: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  path_order: number;
  questions_json: Question[];
  points_per_question: number;
}

const Quiz = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  const { data: quiz, isLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", quizId)
        .single();
      if (error) throw error;
      return data as unknown as Quiz;
    },
    enabled: !!quizId,
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ question, userAnswer, correct, context }: {
      question: string;
      userAnswer: string;
      correct: boolean;
      context: string;
    }) => {
      console.log("Requesting AI feedback for:", { question, userAnswer, correct });
      const { data, error } = await supabase.functions.invoke("quiz-feedback", {
        body: {
          question,
          userAnswer,
          correct,
          context,
        },
      });
      if (error) {
        console.error("Feedback error:", error);
        throw error;
      }
      console.log("Feedback received:", data);
      return data.feedback;
    },
    onSuccess: (feedback) => {
      setAiFeedback(feedback);
      setShowFeedback(true);
    },
    onError: (error: any) => {
      console.error("Feedback mutation error:", error);
      // Show feedback anyway with a fallback message
      setAiFeedback("Keep learning! Every step you take helps create a more sustainable future.");
      setShowFeedback(true);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log("Completing quiz with score:", score);

      // Update progress
      const { error: progressError } = await supabase
        .from("user_progress")
        .upsert({
          user_id: user.id,
          quiz_id: quizId,
          score,
          completed_at: new Date().toISOString(),
          is_unlocked: true,
        }, {
          onConflict: 'user_id,quiz_id'
        });

      if (progressError) {
        console.error("Progress error:", progressError);
        throw progressError;
      }

      // Update user points
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }

      if (profile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            total_points: profile.total_points + score,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Profile update error:", updateError);
          throw updateError;
        }
      }

      // Unlock next quiz
      if (quiz) {
        const { data: nextQuiz } = await supabase
          .from("quizzes")
          .select("id")
          .eq("path_order", quiz.path_order + 1)
          .maybeSingle();

        if (nextQuiz) {
          await supabase.from("user_progress").upsert({
            user_id: user.id,
            quiz_id: nextQuiz.id,
            is_unlocked: true,
            score: 0,
          }, {
            onConflict: 'user_id,quiz_id'
          });
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      console.log("Quiz completed successfully!");
      setShowCompletion(true);
    },
    onError: (error: any) => {
      console.error("Complete quiz error:", error);
      toast.error(error.message || "Failed to complete quiz");
    },
  });

  const handleAnswerSelect = async (answerIndex: number) => {
    if (!quiz || showFeedback) return;

    setSelectedAnswer(answerIndex);
    const question = quiz.questions_json[currentQuestion];
    const correct = answerIndex === question.correct_index;

    if (correct) {
      setCorrectAnswers(prev => prev + 1);
      setScore(prev => prev + quiz.points_per_question);
    }

    // Get AI feedback
    feedbackMutation.mutate({
      question: question.question,
      userAnswer: question.options[answerIndex],
      correct,
      context: question.context_for_ai,
    });
  };

  const handleNext = () => {
    if (!quiz) return;

    if (currentQuestion < quiz.questions_json.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setAiFeedback("");
    } else {
      console.log("Triggering complete mutation");
      completeMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center">Quiz not found</div>;
  }

  // Show completion screen
  if (showCompletion) {
    const totalQuestions = quiz.questions_json.length;
    const percentCorrect = Math.round((correctAnswers / totalQuestions) * 100);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-6 rounded-full bg-gradient-to-br from-primary to-secondary">
                <CheckCircle2 className="h-16 w-16 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl mb-2">Quiz Completed!</CardTitle>
            <CardDescription className="text-lg">{quiz.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-6 rounded-lg bg-muted">
                <div className="text-4xl font-bold text-primary mb-2">{correctAnswers}/{totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
              <div className="p-6 rounded-lg bg-muted">
                <div className="text-4xl font-bold text-accent mb-2">{score}</div>
                <div className="text-sm text-muted-foreground">Points Earned</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-semibold mb-2">Score: {percentCorrect}%</div>
              <Progress value={percentCorrect} className="h-3" />
            </div>

            {score > 0 ? (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary text-center">
                <p className="text-lg font-semibold text-primary">
                  🎉 {score} Eco Points added to your account!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-sm text-muted-foreground">
                  Keep learning! Review the feedback to improve your eco-knowledge.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCompletion(false);
                  setCurrentQuestion(0);
                  setSelectedAnswer(null);
                  setShowFeedback(false);
                  setScore(0);
                  setCorrectAnswers(0);
                }}
              >
                Retake Quiz
              </Button>
              <Button
                className="flex-1"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = quiz.questions_json[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions_json.length) * 100;
  const isCorrect = selectedAnswer === question.correct_index;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-3xl py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>{quiz.title}</CardTitle>
              <div className="text-sm font-semibold text-accent">
                {score} Points
              </div>
            </div>
            <CardDescription>
              Question {currentQuestion + 1} of {quiz.questions_json.length}
            </CardDescription>
            <Progress value={progress} className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <h3 className="text-xl font-semibold">{question.question}</h3>

            <div className="space-y-3">
              {question.options.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className={`w-full justify-start text-left h-auto py-4 px-6 ${
                    selectedAnswer === index
                      ? isCorrect
                        ? "border-primary bg-primary/10"
                        : "border-destructive bg-destructive/10"
                      : ""
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                >
                  {option}
                </Button>
              ))}
            </div>

            {showFeedback && (
              <Card className={isCorrect ? "border-primary bg-primary/5" : "border-destructive bg-destructive/5"}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <CardTitle className="text-lg">
                      {isCorrect ? "Correct!" : "Not quite right"}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-accent mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm mb-2">AI Insight & Action Tip:</p>
                      <p className="text-sm">{aiFeedback}</p>
                    </div>
                  </div>
                  <Button onClick={handleNext} className="w-full" disabled={completeMutation.isPending}>
                    {completeMutation.isPending && "Completing..."}
                    {!completeMutation.isPending && currentQuestion < quiz.questions_json.length - 1 && "Next Question"}
                    {!completeMutation.isPending && currentQuestion >= quiz.questions_json.length - 1 && "Complete Quiz"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
