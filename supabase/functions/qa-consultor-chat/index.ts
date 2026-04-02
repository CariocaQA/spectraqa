import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  isValidLength,
  INPUT_LIMITS,
  sanitizeForLog,
  GENERIC_ERRORS,
  handleError,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONSULTOR_SYSTEM_PROMPT = `
Você é o Spectra, um assistente especializado em Quality Assurance (QA).

DIRETRIZES GERAIS:
- Seja objetivo, técnico e direto ao ponto
- Use linguagem em português brasileiro
- Não invente informações - se não souber, diga claramente
- Cite sempre as fontes quando disponíveis
- Priorize informações da base de conhecimento interna
- Use formatação Markdown para melhor legibilidade

REGRAS DO CONSULTOR QA:

1. CONSULTA À BASE INTERNA
   - SEMPRE consulte a base de conhecimento antes de responder
   - Priorize trechos dos materiais internos da empresa
   - Cite o documento e trecho específico usado

2. FORMATO DA RESPOSTA
   - Use Markdown para estruturar
   - Seja conciso mas completo
   - Ao final, liste as fontes consultadas

3. TÓPICOS QUE VOCÊ DOMINA
   - BDD e escrita de cenários Gherkin
   - Testes de performance e K6
   - Automação de testes
   - Processos de QA
   - Testes de API e integração
   - Estratégias de teste
`;

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.AUTH_REQUIRED }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.AUTH_INVALID }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { 
      question, 
      internalOnly = true, 
      allowGeneralKnowledge = false,
      conversationHistory = []
    } = body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Pergunta é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidLength(question, INPUT_LIMITS.QUESTION)) {
      console.warn("Question too long:", question.length);
      return new Response(JSON.stringify({ error: "Pergunta muito longa" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate conversation history
    if (!Array.isArray(conversationHistory)) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conversationHistory.length > INPUT_LIMITS.CONVERSATION_HISTORY) {
      console.warn("Conversation history too long:", conversationHistory.length);
      return new Response(JSON.stringify({ error: "Histórico de conversa muito longo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate each history message
    for (const msg of conversationHistory) {
      if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
        return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isValidLength(msg.content, INPUT_LIMITS.QUESTION)) {
        console.warn("History message too long");
        return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Question received, length:", question.length);

    // Search knowledge base
    let contextChunks: any[] = [];
    let sourcesUsed: any[] = [];

    try {
      const queryEmbedding = await generateEmbedding(question, lovableApiKey);
      
      const { data: chunks, error: searchError } = await supabase.rpc(
        "search_similar_chunks",
        {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_threshold: 0.5,
          match_count: 5,
        }
      );

      if (!searchError && chunks && chunks.length > 0) {
        contextChunks = chunks;
        
        // Get document titles
        const documentIds = [...new Set(chunks.map((c: any) => c.document_id))];
        const { data: docs } = await supabase
          .from("qa_documents")
          .select("id, title")
          .in("id", documentIds);

        sourcesUsed = chunks.map((chunk: any) => {
          const doc = docs?.find((d: any) => d.id === chunk.document_id);
          return {
            documentTitle: doc?.title || "Documento",
            excerpt: chunk.content_text.substring(0, 150) + "...",
            similarity: chunk.similarity,
          };
        });
      }
    } catch (searchError) {
      // Log error details server-side only
      console.error("KB search error:", searchError);
    }

    console.log(`Found ${contextChunks.length} relevant chunks`);

    // Build context from chunks
    let knowledgeContext = "";
    if (contextChunks.length > 0) {
      knowledgeContext = contextChunks
        .map((c: any) => c.content_text)
        .join("\n\n---\n\n");
    }

    // Build prompt based on settings
    let systemPrompt = CONSULTOR_SYSTEM_PROMPT;
    
    if (contextChunks.length > 0) {
      systemPrompt += `\n\nCONTEXTO DA BASE DE CONHECIMENTO INTERNA:\n${knowledgeContext}\n\n`;
      systemPrompt += "Use este contexto para fundamentar sua resposta. Cite as fontes.";
    } else if (internalOnly && !allowGeneralKnowledge) {
      systemPrompt += `\n\nNão foram encontradas informações relevantes na base de conhecimento interna.
      
Você DEVE responder com:
"Não encontrei informações suficientes nos materiais internos sobre este assunto.

📚 Sugestão: Considere adicionar documentos sobre [tema relevante] à base de conhecimento."

NÃO responda com conhecimento geral.`;
    } else if (allowGeneralKnowledge) {
      systemPrompt += `\n\nNão foram encontradas informações na base interna. Você pode usar conhecimento geral de QA, mas marque claramente com: "⚠️ Resposta baseada em conhecimento geral (não encontrado na base interna)"`;
    }

    // Build messages
    const messages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (already validated)
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current question
    messages.push({ role: "user", content: question });

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      // Log full error server-side
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, sanitizeForLog(errorText, 300));
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: GENERIC_ERRORS.RATE_LIMIT }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: GENERIC_ERRORS.CREDITS }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.EXTERNAL_SERVICE }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    console.log("Answer generated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      answer,
      sources: sourcesUsed,
      hasInternalSources: contextChunks.length > 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const { message, status } = handleError(error, "qa-consultor-chat");
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
