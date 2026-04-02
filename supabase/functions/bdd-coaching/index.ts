import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  isValidLength,
  INPUT_LIMITS,
  sanitizeForLog,
  GENERIC_ERRORS,
  handleError,
} from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { bddContent, issue } = body;

    // Validate bddContent
    if (!bddContent || typeof bddContent !== 'string' || bddContent.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo BDD é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidLength(bddContent, INPUT_LIMITS.BDD_CONTENT)) {
      console.warn("BDD content too long:", bddContent.length);
      return new Response(
        JSON.stringify({ error: 'Conteúdo BDD muito longo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate issue if provided
    if (issue) {
      if (typeof issue !== 'object') {
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!isValidLength(issue.summary, INPUT_LIMITS.TITLE)) {
        console.warn("Issue summary too long");
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!isValidLength(issue.acceptanceCriteria, INPUT_LIMITS.BDD_CONTENT)) {
        console.warn("Acceptance criteria too long");
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.CONFIG }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um mentor de QA analisando cenários BDD gerados para explicar pedagogicamente.

Para cada cenário no BDD, você deve:
1. Identificar quais técnicas de teste foram aplicadas
2. Explicar por que este cenário foi sugerido
3. Explicar por que é importante para a qualidade
4. Sugerir o que poderia ser adicionado como cobertura extra

TÉCNICAS RECONHECÍVEIS (use exatamente estes IDs):
- happy-path: Caminho Feliz - fluxo principal de sucesso
- negative: Cenário Negativo - testa erros e exceções
- equivalence: Particionamento de Equivalência - divide inputs em classes
- boundary: Valor Limite - testa fronteiras das partições
- state-transition: Transição de Estado - verifica mudanças de estado
- business-rule: Regra de Negócio Crítica - valida regras essenciais

Analise o BDD fornecido e extraia os cenários, identificando as técnicas aplicadas em cada um.
Seja didático e explique de forma clara para ajudar o QA a aprender.`;

    const userPrompt = `Analise o seguinte BDD gerado e forneça coaching pedagógico:

${issue ? `## Contexto do Ticket
Título: ${issue.summary || 'N/A'}
${issue.acceptanceCriteria ? `Critérios de Aceite: ${issue.acceptanceCriteria}` : ''}
` : ''}

## BDD Gerado:
${bddContent}

Extraia cada cenário e forneça análise pedagógica usando a função analyze_bdd_scenarios.`;

    console.log('Calling AI for coaching analysis, BDD length:', bddContent.length);

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
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_bdd_scenarios',
              description: 'Analyze BDD scenarios and provide pedagogical coaching',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'Resumo geral do raciocínio por trás dos cenários gerados (2-3 parágrafos)'
                  },
                  featureType: {
                    type: 'string',
                    description: 'Tipo da funcionalidade detectada (ex: Autenticação, Cadastro, Pagamento)'
                  },
                  scenarios: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Nome do cenário (ex: Cenário: Login bem-sucedido)' },
                        gherkinText: { type: 'string', description: 'Texto Gherkin completo do cenário' },
                        techniques: {
                          type: 'array',
                          items: { 
                            type: 'string', 
                            enum: ['happy-path', 'negative', 'equivalence', 'boundary', 'state-transition', 'business-rule'] 
                          },
                          description: 'IDs das técnicas de teste aplicadas neste cenário'
                        },
                        explanation: { type: 'string', description: 'Explicação detalhada de por que este cenário foi criado e como as técnicas se aplicam' },
                        whyImportant: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Lista de razões pelas quais este cenário é importante (3-4 razões)'
                        },
                        whatToAdd: {
                          type: 'array',
                          items: { type: 'string' },
                          description: 'Sugestões de cenários adicionais relacionados (2-3 sugestões)'
                        }
                      },
                      required: ['title', 'gherkinText', 'techniques', 'explanation', 'whyImportant', 'whatToAdd']
                    }
                  },
                  tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Dicas gerais de BDD e boas práticas (4-6 dicas)'
                  },
                  additionalExamples: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Exemplos de cenários adicionais que poderiam ser considerados (3-5 exemplos)'
                  }
                },
                required: ['summary', 'featureType', 'scenarios', 'tips', 'additionalExamples']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_bdd_scenarios' } }
      }),
    });

    if (!response.ok) {
      // Log full error server-side
      const errorText = await response.text();
      console.error('AI API error:', response.status, sanitizeForLog(errorText, 300));
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.RATE_LIMIT }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: GENERIC_ERRORS.CREDITS }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.EXTERNAL_SERVICE }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    // Extract the tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'analyze_bdd_scenarios') {
      console.error('Unexpected AI response format');
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.EXTERNAL_SERVICE }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coachingData = JSON.parse(toolCall.function.arguments);
    
    // Add IDs to scenarios
    coachingData.scenarios = coachingData.scenarios.map((s: any, index: number) => ({
      ...s,
      id: String(index + 1)
    }));

    console.log('Coaching data parsed successfully with', coachingData.scenarios.length, 'scenarios');

    return new Response(
      JSON.stringify({ coachingData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const { message, status } = handleError(error, "bdd-coaching");
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
