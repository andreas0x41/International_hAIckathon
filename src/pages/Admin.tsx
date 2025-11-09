import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Leaf, Plus, Trash2, ArrowLeft, Upload, FileJson, Edit, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Validation schema
const questionSchema = z.object({
  question: z.string().trim().min(5, "Question must be at least 5 characters").max(500, "Question too long"),
  options: z.array(z.string().trim().min(1, "Option cannot be empty").max(200, "Option too long")).min(2, "Must have at least 2 options").max(6, "Maximum 6 options per question"),
  correctAnswer: z.number().min(0, "Correct answer must be valid"),
}).refine(
  (data) => data.correctAnswer < data.options.length,
  { message: "Correct answer index must be within options range", path: ["correctAnswer"] }
);

const quizSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  points_per_question: z.number().min(1, "Must award at least 1 point").max(100, "Max 100 points per question"),
  questions: z.array(questionSchema).min(1, "Must have at least 1 question").max(50, "Max 50 questions per quiz"),
});

// Schema for imported JSON files (supports both formats)
const importedQuestionSchema = z.object({
  question: z.string().trim().min(5, "Question must be at least 5 characters").max(500, "Question too long"),
  options: z.array(z.string().trim().min(1, "Option cannot be empty").max(200, "Option too long")).min(2, "Must have at least 2 options").max(6, "Maximum 6 options per question"),
  correct_index: z.number().min(0, "Correct answer must be valid").optional(),
  correctAnswer: z.number().min(0, "Correct answer must be valid").optional(),
  context_for_ai: z.string().optional(),
}).refine(
  (data) => data.correct_index !== undefined || data.correctAnswer !== undefined,
  { message: "Must have either correct_index or correctAnswer" }
).refine(
  (data) => {
    const correctIdx = data.correctAnswer ?? data.correct_index ?? 0;
    return correctIdx < data.options.length;
  },
  { message: "Correct answer index must be within options range" }
);

const importedQuizSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  points_per_question: z.number().min(1, "Must award at least 1 point").max(100, "Max 100 points per question").optional(),
  pointsPerQuestion: z.number().min(1, "Must award at least 1 point").max(100, "Max 100 points per question").optional(),
  questions: z.array(importedQuestionSchema).min(1, "Must have at least 1 question").max(50, "Max 50 questions per quiz"),
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
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [existingQuizzes, setExistingQuizzes] = useState<any[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [isManageQuizzesCollapsed, setIsManageQuizzesCollapsed] = useState(true);
  const [collapsedQuestions, setCollapsedQuestions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setIsLoadingQuizzes(true);
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("path_order", { ascending: true });

      if (error) throw error;
      setExistingQuizzes(data || []);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleEditQuiz = (quiz: any) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title || "");
    setDescription(quiz.description || "");
    setPointsPerQuestion(quiz.points_per_question || 10);
    
    // Ensure questions have proper structure and handle both correctAnswer and correct_index formats
    const loadedQuestions = quiz.questions_json?.map((q: any) => ({
      question: q.question || "",
      options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : (typeof q.correct_index === 'number' ? q.correct_index : 0),
    })) || [{ question: "", options: ["", "", "", ""], correctAnswer: 0 }];
    
    setQuestions(loadedQuestions);
    setCollapsedQuestions(new Set());
    
    // Scroll to form
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const downloadQuizAsJson = (quiz: any) => {
    const quizData = {
      title: quiz.title,
      description: quiz.description,
      points_per_question: quiz.points_per_question,
      questions: quiz.questions_json,
    };
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Quiz downloaded as JSON!");
  };

  const downloadCurrentQuizAsJson = () => {
    const quizData = {
      title,
      description,
      points_per_question: pointsPerQuestion,
      questions,
    };
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'quiz'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Current quiz downloaded as JSON!");
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;

      toast.success("Quiz deleted successfully");
      fetchQuizzes();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast.error("Failed to delete quiz");
    }
  };

  const handleReorderQuiz = async (quizId: string, direction: 'up' | 'down') => {
    const quizIndex = existingQuizzes.findIndex(q => q.id === quizId);
    if (quizIndex === -1) return;

    const currentQuiz = existingQuizzes[quizIndex];
    const swapIndex = direction === 'up' ? quizIndex - 1 : quizIndex + 1;

    if (swapIndex < 0 || swapIndex >= existingQuizzes.length) return;

    const swapQuiz = existingQuizzes[swapIndex];
    const currentOrder = currentQuiz.path_order;
    const swapOrder = swapQuiz.path_order;

    try {
      // Use a temp value to avoid conflicts
      const tempOrder = -999;
      
      // Step 1: Set first quiz to temp
      const { error: error1 } = await supabase
        .from("quizzes")
        .update({ path_order: tempOrder })
        .eq("id", currentQuiz.id);

      if (error1) throw error1;

      // Step 2: Move swap quiz to current's position
      const { error: error2 } = await supabase
        .from("quizzes")
        .update({ path_order: currentOrder })
        .eq("id", swapQuiz.id);

      if (error2) throw error2;

      // Step 3: Move current quiz to swap's position
      const { error: error3 } = await supabase
        .from("quizzes")
        .update({ path_order: swapOrder })
        .eq("id", currentQuiz.id);

      if (error3) throw error3;

      toast.success("Quiz order updated");
      fetchQuizzes();
    } catch (error) {
      console.error("Error reordering quiz:", error);
      toast.error("Failed to reorder quiz");
    }
  };

  const handleCancelEdit = () => {
    setEditingQuizId(null);
    setTitle("");
    setDescription("");
    setPointsPerQuestion(10);
    setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    setCollapsedQuestions(new Set());
  };

  const toggleQuestionCollapse = (index: number) => {
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error("Please upload a JSON file");
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast.error("File is too large. Maximum size is 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate JSON structure
        const validated = importedQuizSchema.parse(jsonData);
        
        // Set form data
        setTitle(validated.title);
        setDescription(validated.description);
        setPointsPerQuestion(validated.points_per_question || validated.pointsPerQuestion || 10);
        
        // Convert questions to internal format
        const convertedQuestions = validated.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer ?? q.correct_index ?? 0,
        }));
        
        setQuestions(convertedQuestions);
        
        toast.success(`Quiz loaded! ${convertedQuestions.length} question${convertedQuestions.length > 1 ? 's' : ''} imported.`);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          const firstError = error.errors[0];
          toast.error(`Invalid JSON format: ${firstError.message}`);
        } else if (error instanceof SyntaxError) {
          toast.error("Invalid JSON file. Please check the file format.");
        } else {
          toast.error("Failed to load quiz file");
          console.error("Import error:", error);
        }
      }
    };
    
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
  };

  const addQuestion = () => {
    if (questions.length >= 50) {
      toast.error("Maximum 50 questions per quiz");
      return;
    }
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
    // Don't collapse the newly added question
    setCollapsedQuestions(prev => {
      const newSet = new Set(prev);
      newSet.delete(questions.length); // The new question index
      return newSet;
    });
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error("Must have at least one question");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
    // Update collapsed questions indices
    setCollapsedQuestions(prev => {
      const newSet = new Set<number>();
      prev.forEach(i => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
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

      if (editingQuizId) {
        // Update existing quiz
        const { error: updateError } = await supabase
          .from("quizzes")
          .update({
            title: validatedData.title,
            description: validatedData.description,
            points_per_question: validatedData.points_per_question,
            questions_json: validatedData.questions,
          })
          .eq("id", editingQuizId);

        if (updateError) throw updateError;

        toast.success("Quiz updated successfully!");
        setEditingQuizId(null);
      } else {
        // Insert new quiz
        const nextOrder = existingQuizzes && existingQuizzes.length > 0 
          ? existingQuizzes[0].path_order + 1 
          : 1;

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
      }
      
      // Reset form
      setTitle("");
      setDescription("");
      setPointsPerQuestion(10);
      setQuestions([{ question: "", options: ["", "", "", ""], correctAnswer: 0 }]);
      setCollapsedQuestions(new Set());
      
      // Refresh quiz list
      fetchQuizzes();

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
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-[var(--shadow-glow)]">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold">Quiz Creator</h1>
              <p className="text-xs text-muted-foreground">Add New Learning Content</p>
            </div>
          </button>
          
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Existing Quizzes Management */}
        <Collapsible open={!isManageQuizzesCollapsed} onOpenChange={(open) => setIsManageQuizzesCollapsed(!open)}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between hover:opacity-80 transition-opacity">
                  <div className="text-left">
                    <CardTitle className="flex items-center gap-2">
                      Manage Existing Quizzes
                      {isManageQuizzesCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
                    </CardTitle>
                    <CardDescription>
                      Edit, reorder, or delete quizzes from the learning path.
                    </CardDescription>
                  </div>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {isLoadingQuizzes ? (
                  <p className="text-muted-foreground text-center py-4">Loading quizzes...</p>
                ) : existingQuizzes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No quizzes yet. Create one below!</p>
                ) : (
                  <div className="space-y-3">
                    {existingQuizzes.map((quiz, index) => (
                  <div key={quiz.id} className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleReorderQuiz(quiz.id, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleReorderQuiz(quiz.id, 'down')}
                        disabled={index === existingQuizzes.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{quiz.path_order}</span>
                        <h3 className="font-semibold truncate">{quiz.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{quiz.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quiz.questions_json?.length || 0} questions • {quiz.points_per_question} pts each
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadQuizAsJson(quiz)}
                      >
                        <FileJson className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditQuiz(quiz)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quiz?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{quiz.title}" and all associated progress. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Create/Edit Quiz Form */}
        <Card>
          <CardHeader>
            <CardTitle>{editingQuizId ? "Edit Quiz" : "Create New Quiz"}</CardTitle>
            <CardDescription>
              {editingQuizId 
                ? "Update the quiz details below." 
                : "Add a new quiz to the learning path. It will automatically appear at the next position."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* JSON Import */}
              <div className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <FileJson className="h-5 w-5" />
                    Import from JSON
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload a JSON file with quiz data to automatically fill the form.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                    id="json-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const example = {
                        title: "Example Quiz Title",
                        description: "This is an example description for your quiz",
                        points_per_question: 10,
                        questions: [
                          {
                            question: "What is the capital of France?",
                            options: ["London", "Berlin", "Paris", "Madrid"],
                            correctAnswer: 2
                          }
                        ]
                      };
                      const blob = new Blob([JSON.stringify(example, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'quiz-template.json';
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Template downloaded!");
                    }}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Download Template
                  </Button>
                </div>
              </div>

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
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Questions ({questions.length})</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={downloadCurrentQuizAsJson}
                      disabled={!title || !description}
                    >
                      <FileJson className="h-4 w-4 mr-1" />
                      Download JSON
                    </Button>
                    <Button type="button" onClick={addQuestion} size="sm" disabled={questions.length >= 50}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                </div>

                {questions.map((question, qIndex) => {
                  const isCollapsed = collapsedQuestions.has(qIndex);
                  return (
                    <Card key={qIndex} className="p-4">
                      <Collapsible open={!isCollapsed} onOpenChange={() => toggleQuestionCollapse(qIndex)}>
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <CollapsibleTrigger asChild>
                              <button 
                                type="button"
                                className="flex-1 text-left hover:opacity-80 transition-opacity"
                              >
                                {isCollapsed ? (
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <Label className="cursor-pointer">Question {qIndex + 1}</Label>
                                      <p className="text-sm text-muted-foreground truncate">
                                        {question.question || "Empty question"}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {question.options.length} options • Correct: {question.correctAnswer + 1}
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <ChevronUp className="h-4 w-4 flex-shrink-0 mt-1" />
                                    <div className="flex-1">
                                      <Label className="cursor-pointer">Question {qIndex + 1} *</Label>
                                    </div>
                                  </div>
                                )}
                              </button>
                            </CollapsibleTrigger>
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

                          <CollapsibleContent className="space-y-4">
                            <Textarea
                              value={question.question}
                              onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                              placeholder="Enter your question..."
                              maxLength={500}
                              rows={2}
                            />

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Answer Options (2-6) *</Label>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (question.options.length < 6) {
                                        const updated = [...questions];
                                        updated[qIndex].options.push("");
                                        setQuestions(updated);
                                      } else {
                                        toast.error("Maximum 6 options per question");
                                      }
                                    }}
                                    disabled={question.options.length >= 6}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (question.options.length > 2) {
                                        const updated = [...questions];
                                        // If removing the correct answer, reset to first option
                                        if (updated[qIndex].correctAnswer >= updated[qIndex].options.length - 1) {
                                          updated[qIndex].correctAnswer = 0;
                                        }
                                        updated[qIndex].options.pop();
                                        setQuestions(updated);
                                      } else {
                                        toast.error("Must have at least 2 options");
                                      }
                                    }}
                                    disabled={question.options.length <= 2}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
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
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {question.correctAnswer === oIndex ? "✓ Correct" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                {editingQuizId ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? "Updating..." : "Update Quiz"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Quiz Update</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to update "{title}". This will affect all users who have taken or are currently taking this quiz. Are you sure you want to proceed?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmit}>
                          Confirm Update
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Creating..." : "Create Quiz"}
                  </Button>
                )}
                {editingQuizId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel Edit
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => navigate("/dashboard")}>
                  Back
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
