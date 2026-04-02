import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BDD_GENERATION_PROMPT = `Você é o Spectra, um especialista em Quality Assurance especializado em criar cenários BDD (Behavior-Driven Development) em formato Gherkin.

DIRETRIZES GERAIS:
- Use linguagem em português brasileiro
- Use as palavras-chave Gherkin em português: Funcionalidade, Cenário, Dado, Quando, Então, E, Mas
- Seja técnico, preciso e objetivo
- Baseie-se APENAS no conteúdo do ticket fornecido
- NÃO invente requisitos além do que está no ticket

FORMATO DE SAÍDA OBRIGATÓRIO:

Inicie com um bloco de código Gherkin formatado:

\`\`\`gherkin
# language: pt

Funcionalidade: [Título descritivo baseado no ticket]
  Como [persona/usuário]
  Eu quero [ação/funcionalidade]
  Para [benefício/objetivo]

  Contexto:
    Dado [pré-condições comuns a todos os cenários]

  @happy-path
  Cenário: [Nome descritivo do cenário principal]
    Dado [contexto inicial]
    Quando [ação do usuário]
    Então [resultado esperado]
    E [validações adicionais]

  @negative
  Cenário: [Nome do cenário negativo 1]
    Dado [contexto]
    Quando [ação que causa erro]
    Então [comportamento esperado de erro]

  @negative
  Cenário: [Nome do cenário negativo 2]
    Dado [contexto]
    Quando [outra condição de erro]
    Então [tratamento esperado]
\`\`\`

Depois do bloco Gherkin, adicione as seções de rastreabilidade:

---

## 📋 Rastreabilidade

| Critério de Aceite | Cenário(s) Relacionado(s) |
|-------------------|---------------------------|
| CA-1: [descrição] | Cenário: [nome] |
| CA-2: [descrição] | Cenário: [nome] |

## ⚠️ Assunções e Pontos de Atenção

- [Listar qualquer assunção feita ou ponto que precisa ser esclarecido]

REGRAS DE OURO:
1. Mínimo: 1 happy path + 2 cenários negativos
2. Use tags para categorizar: @happy-path, @negative, @edge-case, @integration
3. Nomes de cenários devem ser descritivos e únicos
4. Passos devem ser atômicos e reutilizáveis
5. Sempre inclua a seção de Rastreabilidade mapeando CAs para cenários
6. Prefira termos de negócio do ticket sobre termos técnicos genéricos
7. Se não houver critérios de aceite explícitos, extraia os requisitos da descrição do ticket`;

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
    }),
  });

  if (!response.ok) {
    console.error("Embedding error:", await response.text());
    throw new Error("Failed to generate embedding");
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { issue, manualInput, useKnowledgeBase, projectNotes = null, projectName = null } = await req.json();

    // Validate: must have either issue or manualInput
    if (!issue && !manualInput) {
      return new Response(JSON.stringify({ error: 'Missing issue data or manual input' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate manual input if provided
    if (manualInput && (!manualInput.title || !manualInput.content)) {
      return new Response(JSON.stringify({ error: 'Manual input requires title and content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isManualMode = !!manualInput;
    const sourceIdentifier = isManualMode ? `Manual: ${manualInput.title}` : issue.key;
    
    console.log("Generating BDD for:", sourceIdentifier, projectName ? `with project context: ${projectName}` : "");

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
TICKET JIRA: ${issue.key}

TÍTULO: ${issue.summary}

DESCRIÇÃO:
${issue.description || 'Não informada'}

CRITÉRIOS DE ACEITE:
${issue.acceptanceCriteria || 'Não informados'}

TIPO: ${issue.issueType || 'N/A'}
STATUS: ${issue.status || 'N/A'}
PRIORIDADE: ${issue.priority || 'N/A'}
LABELS: ${issue.labels?.join(', ') || 'Nenhuma'}
COMPONENTES: ${issue.components?.join(', ') || 'Nenhum'}
`;
    }

    // Add project context if provided
    let projectContext = "";
    if (projectNotes && projectNotes.trim()) {
      projectContext = `

CONTEXTO DO PROJETO "${projectName || 'Projeto'}":
${projectNotes}

IMPORTANTE: Use as informações do projeto acima para:
- Alinhar vocabulário e termos de domínio com o projeto
- Não propor cenários que violem regras já documentadas
- Sugerir cenários extras baseados em fluxos típicos do projeto
- Ajustar nomenclatura conforme padrões do sistema
`;
    }

    // Knowledge base feature temporarily disabled
    // Lovable AI Gateway doesn't support embedding models yet
    let knowledgeContext = "";
    if (useKnowledgeBase) {
      console.log("Knowledge base feature requested but embedding models not available in Lovable AI Gateway");
      // TODO: Re-enable when embedding models are supported
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BDD_GENERATION_PROMPT },
          { 
            role: "user", 
            content: `Gere cenários BDD completos para o seguinte ticket:\n\n${ticketContext}${projectContext}${knowledgeContext}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to generate BDD' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const bddContent = aiData.choices[0]?.message?.content;

    if (!bddContent) {
      return new Response(JSON.stringify({ error: 'No BDD content generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("BDD generated successfully for", sourceIdentifier);

    return new Response(JSON.stringify({ 
      bdd: bddContent,
      usedKnowledgeBase: useKnowledgeBase && knowledgeContext.length > 0,
      usedProjectContext: projectContext.length > 0,
      inputMode: isManualMode ? 'manual' : 'jira'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in jira-bdd-generate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
