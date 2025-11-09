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
      const { data, error } = await supabase.functions.invoke("quiz-feedback", {
        body: {
          question,
          userAnswer,
          correct,
          context,
        },
      });
      if (error) throw error;
      return data.feedback;
    },
    onSuccess: (feedback) => {
      setAiFeedback(feedback);
      setShowFeedback(true);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update progress
      const { error: progressError } = await supabase
        .from("user_progress")
        .upsert({
          user_id: user.id,
          quiz_id: quizId,
          score,
          completed_at: new Date().toISOString(),
          is_unlocked: true,
        });

      if (progressError) throw progressError;

      // Update user points
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", user.id)
        .single();

      if (profile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            total_points: profile.total_points + score,
          })
          .eq("id", user.id);

        if (updateError) throw updateError;
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
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(`Quiz completed! You earned ${score} points!`);
      navigate("/dashboard");
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
      completeMutation.mutate();
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!quiz) {
    return <div className="min-h-screen flex items-center justify-center">Quiz not found</div>;
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
                  <Button onClick={handleNext} className="w-full">
                    {currentQuestion < quiz.questions_json.length - 1 ? "Next Question" : "Complete Quiz"}
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
