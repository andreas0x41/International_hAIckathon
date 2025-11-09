import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Leaf, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema
const questionSchema = z.object({
  question: z.string().trim().min(5, "Question must be at least 5 characters").max(500, "Question too long"),
  options: z.array(z.string().trim().min(1, "Option cannot be empty").max(200, "Option too long")).length(4, "Must have exactly 4 options"),
  correctAnswer: z.number().min(0).max(3, "Correct answer must be 0-3"),
});

const quizSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  points_per_question: z.number().min(1, "Must award at least 1 point").max(100, "Max 100 points per question"),
  questions: z.array(questionSchema).min(1, "Must have at least 1 question").max(50, "Max 50 questions per quiz"),
});

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pointsPerQuestion, setPointsPerQuestion] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 50) {
      toast.error("Maximum 50 questions per quiz");
      return;
    }
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error("Must have at least one question");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Validate input
      const validatedData = quizSchema.parse({
        title,
        description,
        points_per_question: pointsPerQuestion,
        questions,
      });

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create quizzes");
        navigate("/auth");
        return;
      }

      // Get the next path_order (max + 1)
      const { data: existingQuizzes, error: fetchError } = await supabase
        .from("quizzes")
        .select("path_order")
        .order("path_order", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      const nextOrder = existingQuizzes && existingQuizzes.length > 0 
        ? existingQuizzes[0].path_order + 1 
        : 1;

      // Insert the quiz
      const { error: insertError } = await supabase
        .from("quizzes")
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          path_order: nextOrder,
          points_per_question: validatedData.points_per_question,
          questions_json: validatedData.questions,
        });

      if (insertError) throw insertError;

      toast.success(`Quiz created successfully at position ${nextOrder}!`);
      
      // Reset form
      setTitle("");
      setDescription("");
      setPointsPerQuestion(10);
      setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
      
      // Navigate back to dashboard
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast.error(firstError.message);
      } else {
        console.error("Error creating quiz:", error);
        toast.error("Failed to create quiz. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)]">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Quiz Creator</h1>
              <p className="text-xs text-muted-foreground">Add New Learning Content</p>
            </div>
          </div>
          
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create New Quiz</CardTitle>
            <CardDescription>
              Add a new quiz to the learning path. It will automatically appear at the next position.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Ocean Conservation"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this quiz covers..."
                    maxLength={500}
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="points">Points per Correct Answer *</Label>
                  <Input
                    id="points"
                    type="number"
                    value={pointsPerQuestion}
                    onChange={(e) => setPointsPerQuestion(parseInt(e.target.value) || 10)}
                    min={1}
                    max={100}
                    required
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Questions ({questions.length})</Label>
                  <Button type="button" onClick={addQuestion} size="sm" disabled={questions.length >= 50}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, qIndex) => (
                  <Card key={qIndex} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Label>Question {qIndex + 1} *</Label>
                          <Textarea
                            value={question.question}
                            onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                            placeholder="Enter your question..."
                            maxLength={500}
                            rows={2}
                            required
                          />
                        </div>
                        {questions.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeQuestion(qIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Answer Options *</Label>
                        {question.options.map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correctAnswer === oIndex}
                              onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                              className="cursor-pointer"
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              maxLength={200}
                              required
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {question.correctAnswer === oIndex ? "✓ Correct" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Quiz"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
