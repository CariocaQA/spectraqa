export interface DemoTicket {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  type: 'bdd' | 'k6';
}

export interface DemoArtifact {
  ticketKey: string;
  type: 'bdd' | 'k6';
  content: string;
}

export const demoTickets: DemoTicket[] = [
  {
    key: 'DEMO-001',
    summary: 'Implementar login com autenticação OAuth',
    description: 'Como usuário do sistema, quero fazer login usando OAuth para acessar minhas funcionalidades de forma segura.',
    acceptanceCriteria: [
      'O sistema deve exibir botão "Entrar com Google"',
      'Após autorização no provedor, usuário deve ser redirecionado para o dashboard',
      'O nome do usuário deve aparecer no header após login',
      'Se o usuário negar autorização, deve ver mensagem "Autorização negada"',
    ],
    type: 'bdd',
  },
  {
    key: 'DEMO-002',
    summary: 'API de consulta de pedidos com paginação',
    description: 'Endpoint REST para consultar pedidos com suporte a paginação e filtros.',
    acceptanceCriteria: [
      'GET /pedidos deve retornar lista de pedidos',
      'Suportar parâmetros page e limit para paginação',
      'Tempo de resposta deve ser inferior a 500ms para 95% das requisições',
      'Taxa de erro deve ser inferior a 1%',
    ],
    type: 'k6',
  },
];

export const demoArtifacts: DemoArtifact[] = [
  {
    ticketKey: 'DEMO-001',
    type: 'bdd',
    content: `# language: pt

Funcionalidade: Login com autenticação OAuth
  Como usuário do sistema
  Eu quero fazer login usando OAuth
  Para acessar minhas funcionalidades de forma segura

  Contexto:
    Dado que estou na página de login

  Cenário: Login OAuth bem sucedido
    Dado que possuo credenciais válidas no provedor OAuth
    Quando clico no botão "Entrar com Google"
    E autorizo o acesso no provedor
    Então devo ser redirecionado para o dashboard
    E devo ver meu nome de usuário no header

  Cenário: Falha ao autorizar no provedor OAuth
    Dado que possuo credenciais válidas no provedor OAuth
    Quando clico no botão "Entrar com Google"
    E nego a autorização no provedor
    Então devo permanecer na página de login
    E devo ver a mensagem "Autorização negada"

  Cenário: Erro de comunicação com provedor OAuth
    Dado que o provedor OAuth está indisponível
    Quando clico no botão "Entrar com Google"
    Então devo ver a mensagem "Serviço temporariamente indisponível"
    E devo permanecer na página de login

  # ─────────────────────────────────────────────────────────
  # Rastreabilidade
  # ─────────────────────────────────────────────────────────
  # CA-1 → Login OAuth bem sucedido (botão + redirecionamento + nome no header)
  # CA-2 → Falha ao autorizar no provedor OAuth (mensagem "Autorização negada")`,
  },
  {
    ticketKey: 'DEMO-002',
    type: 'k6',
    content: `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas customizadas
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

// Configuração do teste de carga
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up: 0 → 10 VUs em 30s
    { duration: '1m', target: 10 },    // Sustain: mantém 10 VUs por 1 min
    { duration: '10s', target: 0 },    // Ramp-down: 10 → 0 VUs em 10s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% das requisições < 500ms
    http_req_failed: ['rate<0.01'],    // Taxa de falha < 1%
    error_rate: ['rate<0.01'],         // Taxa de erro < 1%
  },
};

// Configurações do endpoint
const BASE_URL = 'https://api.exemplo.com';
const ENDPOINT = '/pedidos';

export default function () {
  const url = \`\${BASE_URL}\${ENDPOINT}?page=1&limit=20\`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const response = http.get(url, params);
  
  // Registra métricas
  responseTime.add(response.timings.duration);
  errorRate.add(response.status >= 400);
  
  // Validações
  const checkResult = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
    'has data array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });
  
  if (!checkResult) {
    console.log(\`Request failed: status=\${response.status}, duration=\${response.timings.duration}ms\`);
  }
  
  sleep(1); // Pausa de 1s entre requisições
}

/*
 * Explicação do Perfil de Carga:
 * 
 * Este é um teste de carga básico (Load Test) projetado para validar
 * os requisitos de performance da API de pedidos:
 * 
 * - 10 usuários virtuais simultâneos
 * - Ramp-up gradual para evitar picos de carga
 * - Duração total: 1min 40s
 * 
 * Thresholds baseados nos critérios de aceitação:
 * - p95 < 500ms (CA-3)
 * - Error rate < 1% (CA-4)
 */`,
  },
];
