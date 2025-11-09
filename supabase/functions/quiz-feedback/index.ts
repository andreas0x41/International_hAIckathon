import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { question, userAnswer, correct, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an eco-friendly sustainability educator. Provide concise, actionable feedback for quiz answers. 
    Your response should:
    1. Explain why the answer is ${correct ? 'correct' : 'incorrect'}
    2. Provide ONE specific, actionable tip the user can implement immediately
    Keep it brief (2-3 sentences max) and encouraging.`;

    const userPrompt = `Question: ${question}
User's answer: ${userAnswer}
Status: ${correct ? 'Correct' : 'Incorrect'}
Context: ${context}

Provide brief explanation and one actionable eco-tip.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            feedback: correct 
              ? "Great job! Try to reduce your carbon footprint by making small daily changes." 
              : "Keep learning! Every small action counts towards a sustainable future."
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const feedback = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ feedback }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in quiz-feedback function:', error);
    return new Response(
      JSON.stringify({ 
        feedback: "Great effort! Keep learning about sustainability and taking action in your daily life."
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
