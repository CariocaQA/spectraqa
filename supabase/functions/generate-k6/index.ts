import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const k6RequestSchema = z.object({
  baseUrl: z.string().url('URL base inválida').max(2000),
  endpoint: z.string().min(1, 'Endpoint é obrigatório').max(500),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.array(z.object({
    key: z.string().max(100),
    value: z.string().max(1000)
  })).max(20).default([]),
  payload: z.string().max(10000).optional().default(''),
  testType: z.enum(['smoke', 'load', 'stress', 'spike', 'endurance']),
  vus: z.number().int().min(1).max(1000),
  rampUp: z.string().max(20),
  duration: z.string().max(20),
  p95Threshold: z.number().int().min(1).max(60000),
  errorRateThreshold: z.number().min(0).max(100)
});

type K6Request = z.infer<typeof k6RequestSchema>;

const testTypeDescriptions = {
  smoke: 'Teste rápido com carga mínima para validar se o sistema funciona corretamente.',
  load: 'Teste de carga normal para avaliar comportamento sob tráfego esperado.',
  stress: 'Teste de stress para encontrar os limites do sistema sob carga crescente.',
  spike: 'Teste de pico para avaliar comportamento com aumento súbito de carga.',
  endurance: 'Teste de resistência para avaliar estabilidade sob carga prolongada.'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }

    // Parse and validate input
    let data: K6Request;
    try {
      const rawData = await req.json();
      data = k6RequestSchema.parse(rawData);
    } catch (validationError) {
      console.error('Erro de validação:', validationError);
      if (validationError instanceof z.ZodError) {
        return new Response(JSON.stringify({ 
          error: 'Dados inválidos: ' + validationError.errors.map(e => e.message).join(', ')
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw validationError;
    }

    console.log('Recebida requisição validada para gerar K6:', JSON.stringify({
      baseUrl: data.baseUrl,
      endpoint: data.endpoint,
      method: data.method,
      testType: data.testType,
      vus: data.vus
    }));

    const headersFormatted = data.headers
      .filter(h => h.key && h.value)
      .map(h => `'${h.key}': '${h.value}'`)
      .join(',\n      ');

    const prompt = `Você é um especialista em testes de performance com K6. Gere um script K6 completo e profissional baseado nas seguintes especificações:

## Configuração da API
- **Base URL**: ${data.baseUrl}
- **Endpoint**: ${data.endpoint}
- **Método HTTP**: ${data.method}
- **Headers**: 
${data.headers.filter(h => h.key && h.value).map(h => `  - ${h.key}: ${h.value}`).join('\n') || '  (nenhum)'}
${data.payload ? `- **Payload JSON**: \n\`\`\`json\n${data.payload}\n\`\`\`` : ''}

## Tipo de Teste
- **Tipo**: ${data.testType.toUpperCase()}
- **Descrição**: ${testTypeDescriptions[data.testType]}

## Perfil de Carga
- **Virtual Users (VUs)**: ${data.vus}
- **Ramp-up**: ${data.rampUp}
- **Duração total**: ${data.duration}

## Thresholds
- **Latência p95**: < ${data.p95Threshold}ms
- **Taxa de erro máxima**: < ${data.errorRateThreshold}%

## Requisitos do Script
1. Use imports corretos do K6 (http, check, sleep)
2. Configure options com stages apropriados para o tipo de teste ${data.testType}
3. Inclua thresholds para http_req_duration p(95) e http_req_failed
4. Adicione checks para validar response status e tempo de resposta
5. Use sleep apropriado entre requisições
6. Adicione comentários explicativos em português

## Formato de Resposta
Responda APENAS com um JSON válido no seguinte formato (sem markdown, sem código fence):
{
  "script": "// código K6 completo aqui",
  "rationale": "Explicação curta (2-3 frases) do racional do perfil de carga escolhido, baseado APENAS nos dados informados pelo usuário, sem inventar números ou métricas."
}`;

    console.log('Enviando prompt para Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em testes de performance K6. Sempre responda APENAS com JSON válido, sem markdown ou code fences.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Lovable:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro da API: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('Resposta da IA recebida');

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse the JSON response from AI
    let parsedContent;
    try {
      // Remove potential markdown code fences
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', content);
      // If parsing fails, try to extract script manually
      parsedContent = {
        script: content,
        rationale: 'Script gerado com base nos parâmetros informados.'
      };
    }

    return new Response(JSON.stringify({
      script: parsedContent.script,
      rationale: parsedContent.rationale,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na função generate-k6:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar script K6' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
