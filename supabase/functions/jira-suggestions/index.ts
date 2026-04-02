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

const JIRA_SUGGESTIONS_PROMPT = `
Você é o Spectra, um assistente especializado em Quality Assurance (QA).

DIRETRIZES GERAIS:
- Seja objetivo, técnico e direto ao ponto
- Use linguagem em português brasileiro
- Não invente requisitos além do que está no ticket
- Aponte claramente o que precisa ser esclarecido

TEMPLATE DE SAÍDA (USE EXATAMENTE ESTA ESTRUTURA):

## 📋 Resumo do que entendi do ticket
[Síntese clara e objetiva do que será implementado, em 2-3 frases]

## ⚠️ Riscos e pontos sensíveis
[Lista de riscos identificados e áreas que merecem atenção especial nos testes]

## ✅ Testes funcionais sugeridos
[Cenários de teste do fluxo principal - happy path, com passos claros]

## ❌ Testes negativos essenciais
[Cenários de erro, exceção e edge cases que DEVEM ser cobertos]

## 🔗 Testes de integração/contrato
[Se aplicável - testes de API, integrações com sistemas externos, webhooks]

## ⚡ Sugestões de performance
[Se aplicável - pontos de atenção para carga, volume de dados, timeouts]

## ❓ Lacunas no critério
[O que está faltando ou ambíguo e precisa ser esclarecido com PO/time]

REGRAS:
1. Base suas sugestões APENAS no conteúdo do ticket
2. NÃO invente requisitos que não estão mencionados
3. Seja específico nos cenários - use dados de exemplo quando apropriado
4. Considere edge cases e cenários de erro
5. Se houver integração mencionada, sugira testes de contrato
6. Se o critério estiver vago, aponte na seção de lacunas
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
    const { issue, manualInput, useKnowledgeBase = true, projectNotes = null, projectName = null } = body;

    // Validate: must have either issue or manualInput
    if (!issue && !manualInput) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate manual input if provided
    if (manualInput && (!manualInput.title || !manualInput.content)) {
      return new Response(JSON.stringify({ error: "Manual input requires title and content" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate issue object if provided
    if (issue && (typeof issue !== 'object' || !issue.summary)) {
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate input lengths
    if (issue && !isValidLength(issue.summary, INPUT_LIMITS.TITLE)) {
      console.warn("Issue summary too long:", issue.summary?.length);
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (issue && !isValidLength(issue.description, INPUT_LIMITS.BDD_CONTENT)) {
      console.warn("Issue description too long:", issue.description?.length);
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (manualInput && !isValidLength(manualInput.content, INPUT_LIMITS.BDD_CONTENT)) {
      console.warn("Manual content too long:", manualInput.content?.length);
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isValidLength(projectNotes, INPUT_LIMITS.NOTES)) {
      console.warn("Project notes too long:", projectNotes?.length);
      return new Response(JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isManualMode = !!manualInput;
    const sourceIdentifier = isManualMode ? `Manual: ${manualInput.title}` : (issue.key || 'unknown');
    
    console.log("Generating suggestions for:", sanitizeForLog(sourceIdentifier), projectName ? `with project: ${sanitizeForLog(projectName)}` : "");

    // Build ticket context based on input mode
    let ticketContext: string;
    
    if (isManualMode) {
      ticketContext = `
FUNCIONALIDADE: ${manualInput.title}

DESCRIÇÃO E REQUISITOS:
${manualInput.content}
`;
    } else {
      ticketContext = `
TICKET: ${issue.key || 'N/A'}
TIPO: ${issue.issueType || "N/A"}
TÍTULO: ${issue.summary}

DESCRIÇÃO:
${issue.description || "Sem descrição"}

CRITÉRIOS DE ACEITE:
${issue.acceptanceCriteria || "Não especificados"}

LABELS: ${Array.isArray(issue.labels) ? issue.labels.join(", ") : "Nenhum"}
COMPONENTES: ${Array.isArray(issue.components) ? issue.components.join(", ") : "Nenhum"}
`;
    }

    // Add project context if provided
    let projectContext = "";
    if (projectNotes && projectNotes.trim()) {
      projectContext = `

CONTEXTO DO PROJETO "${projectName || 'Projeto'}":
${projectNotes}

IMPORTANTE: Use as informações do projeto acima para:
- Alinhar vocabulário e termos de domínio
- Identificar riscos recorrentes do sistema
- Considerar regras de negócio já documentadas
- Sugerir testes alinhados com padrões do projeto
`;
    }

    // Search knowledge base for relevant context
    let knowledgeContext = "";
    if (useKnowledgeBase) {
      try {
        const searchQuery = `${issue.summary} ${(issue.description || "").substring(0, 200)}`;
        const queryEmbedding = await generateEmbedding(searchQuery, lovableApiKey);
        
        const { data: chunks } = await supabase.rpc("search_similar_chunks", {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_threshold: 0.5,
          match_count: 3,
        });

        if (chunks && chunks.length > 0) {
          knowledgeContext = "\n\nCONTEXTO DA BASE DE CONHECIMENTO INTERNA:\n" +
            chunks.map((c: any) => c.content_text).join("\n\n---\n\n");
        }
      } catch (kbError) {
        // Log error details server-side only, continue without KB
        console.error("Knowledge base search error:", kbError);
      }
    }

    // Build prompt with all context sources
    const systemPrompt = JIRA_SUGGESTIONS_PROMPT + projectContext + knowledgeContext;

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analise o seguinte ticket e gere sugestões de QA:\n\n${ticketContext}` }
        ],
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
    const suggestions = aiData.choices[0].message.content;

    console.log("Suggestions generated for:", sanitizeForLog(sourceIdentifier));

    return new Response(JSON.stringify({ 
      success: true,
      suggestions,
      usedKnowledgeBase: knowledgeContext.length > 0,
      usedProjectContext: projectContext.length > 0,
      inputMode: isManualMode ? 'manual' : 'jira'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const { message, status } = handleError(error, "jira-suggestions");
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
