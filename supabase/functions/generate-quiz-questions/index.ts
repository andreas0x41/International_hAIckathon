import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      title, 
      description, 
      numberOfQuestions = 3, 
      pointsPerQuestion = 10,
      additionalContext = "",
      theme = "",
      mode = "add",
      existingQuestions = []
    } = await req.json();

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: "Title and description are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt = `You are an expert quiz creator specializing in educational content. Generate engaging, educational quiz questions based on the provided topic.`;

    let userPrompt = "";

    if (mode === "edit") {
      systemPrompt += `\n\nYour task is to improve and refine existing quiz questions. Make them clearer, more educational, and ensure they have good distractors.`;
      userPrompt = `Improve these existing quiz questions for the topic:

Title: ${title}
Description: ${description}
${theme ? `Theme: ${theme}` : ""}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Existing Questions:
${JSON.stringify(existingQuestions, null, 2)}

Enhance each question by:
1. Making the question clearer and more precise
2. Improving the quality of answer options
3. Ensuring distractors are plausible but clearly wrong
4. Adding educational context`;

    } else {
      systemPrompt += `\n\nRules:
1. Create exactly ${numberOfQuestions} questions
2. Each question should have 4 options
3. Each question should have clear educational value
4. Include diverse question types (factual, conceptual, application-based)
5. Provide helpful context for AI to understand the question's educational purpose
6. Mark the correct answer clearly`;

      userPrompt = `Create ${numberOfQuestions} quiz questions for the following topic:

Title: ${title}
Description: ${description}
${theme ? `Theme/Focus: ${theme}` : ""}
${additionalContext ? `Additional Requirements: ${additionalContext}` : ""}

Return the questions in the specified JSON format.`;
    }

    console.log("Calling Lovable AI to generate quiz questions...");
    console.log("Mode:", mode);
    console.log("Number of questions:", numberOfQuestions);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_quiz_questions",
              description: "Generate educational quiz questions with options and context",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: {
                          type: "string",
                          description: "The question text"
                        },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "Array of 4 answer options"
                        },
                        correctAnswer: {
                          type: "number",
                          description: "Index of the correct answer (0-3)"
                        },
                        context_for_ai: {
                          type: "string",
                          description: "Additional context to help AI understand this question"
                        }
                      },
                      required: ["question", "options", "correctAnswer", "context_for_ai"]
                    }
                  }
                },
                required: ["questions"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_quiz_questions" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to generate questions with AI" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log("AI Response received");

    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "generate_quiz_questions") {
      console.error("Unexpected AI response format:", data);
      return new Response(
        JSON.stringify({ error: "Unexpected AI response format" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generatedData = JSON.parse(toolCall.function.arguments);
    console.log("Generated", generatedData.questions.length, "questions");

    return new Response(
      JSON.stringify(generatedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-quiz-questions function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
