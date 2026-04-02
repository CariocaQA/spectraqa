export interface TestTechnique {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface CoachingScenario {
  id: string;
  title: string;
  gherkinText: string;
  techniques: string[];
  explanation: string;
  whyImportant: string[];
  whatToAdd: string[];
}

export interface CoachingData {
  summary: string;
  featureType: string;
  scenarios: CoachingScenario[];
  tips: string[];
  additionalExamples: string[];
}

export const testTechniques: TestTechnique[] = [
  {
    id: 'happy-path',
    name: 'Caminho Feliz',
    description: 'Cenário que testa o fluxo principal de sucesso da funcionalidade',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  },
  {
    id: 'negative',
    name: 'Cenário Negativo',
    description: 'Testa comportamentos de erro e exceções do sistema',
    color: 'bg-red-500/20 text-red-400 border-red-500/30'
  },
  {
    id: 'equivalence',
    name: 'Particionamento de Equivalência',
    description: 'Divide inputs em classes equivalentes para reduzir casos de teste',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  {
    id: 'boundary',
    name: 'Valor Limite',
    description: 'Testa valores nos limites das partições de equivalência',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  },
  {
    id: 'state-transition',
    name: 'Transição de Estado',
    description: 'Verifica mudanças de estado do sistema ou objeto',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  {
    id: 'business-rule',
    name: 'Regra de Negócio Crítica',
    description: 'Valida regras de negócio essenciais para o funcionamento',
    color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
  }
];

export const mockCoachingData: CoachingData = {
  summary: `Com base nos critérios de aceite fornecidos, o SpectraQA gerou 4 cenários BDD, cobrindo o fluxo principal de sucesso, variações de entrada inválida e comportamentos de erro esperados.

Os cenários aplicam técnicas clássicas de teste como particionamento de equivalência (selecionando exemplos representativos de cada classe de entrada) e análise de valor limite (testando fronteiras dos campos). Abaixo você encontra a explicação detalhada de cada cenário e as técnicas utilizadas.`,
  
  featureType: 'Autenticação de Usuário',
  
  scenarios: [
    {
      id: '1',
      title: 'Cenário: Login bem-sucedido com credenciais válidas',
      gherkinText: `Dado que o usuário está na página de login
E possui uma conta ativa no sistema
Quando o usuário informa email "usuario@empresa.com" 
E informa senha "Senha@123"
E clica no botão "Entrar"
Então o sistema deve autenticar o usuário
E redirecionar para a página inicial
E exibir mensagem de boas-vindas com o nome do usuário`,
      techniques: ['happy-path', 'equivalence'],
      explanation: `Este cenário cobre o fluxo principal de sucesso (caminho feliz), garantindo que um usuário com credenciais válidas consegue acessar o sistema normalmente.

A técnica de particionamento de equivalência é aplicada aqui: escolhemos um exemplo representativo de "credenciais válidas" (email no formato correto + senha que atende aos requisitos) sem precisar testar todas as combinações possíveis. Este único caso representa toda a classe de equivalência "credenciais válidas".`,
      whyImportant: [
        'Garante que a funcionalidade básica de login está operacional',
        'É o cenário mais executado pelos usuários reais',
        'Serve como baseline para comparação com cenários de erro',
        'Valida a integração entre frontend, backend e banco de dados'
      ],
      whatToAdd: [
        'Cenário com login usando email em maiúsculas (case insensitive)',
        'Cenário verificando persistência da sessão após refresh',
        'Cenário com login em dispositivos diferentes simultaneamente'
      ]
    },
    {
      id: '2',
      title: 'Cenário: Tentativa de login com senha incorreta',
      gherkinText: `Dado que o usuário está na página de login
E possui uma conta ativa com email "usuario@empresa.com"
Quando o usuário informa email "usuario@empresa.com"
E informa senha "SenhaErrada123"
E clica no botão "Entrar"
Então o sistema deve exibir mensagem "Credenciais inválidas"
E manter o usuário na página de login
E não revelar se o email existe no sistema`,
      techniques: ['negative', 'equivalence'],
      explanation: `Este é um cenário negativo essencial que testa o comportamento do sistema quando a senha informada não corresponde à cadastrada.

A técnica de particionamento de equivalência é usada para representar toda a classe "senha incorreta" com um único exemplo. Não precisamos testar todas as senhas erradas possíveis - uma representa todas.

Importante notar que o cenário também valida uma regra de segurança: a mensagem não deve revelar se o email existe, prevenindo enumeração de usuários.`,
      whyImportant: [
        'Previne acesso não autorizado ao sistema',
        'Valida mensagens de erro genéricas (segurança)',
        'Testa a resiliência do sistema a tentativas inválidas',
        'Garante que dados sensíveis não são expostos em erros'
      ],
      whatToAdd: [
        'Cenário com múltiplas tentativas consecutivas (rate limiting)',
        'Cenário verificando log de tentativas falhas para auditoria',
        'Cenário com senha similar mas não idêntica (typos comuns)'
      ]
    },
    {
      id: '3',
      title: 'Cenário: Login com email em formato inválido',
      gherkinText: `Dado que o usuário está na página de login
Quando o usuário informa email "emailsemarroba.com"
E informa senha "Senha@123"
E clica no botão "Entrar"
Então o sistema deve exibir mensagem "Formato de email inválido"
E destacar o campo de email com borda vermelha
E não enviar requisição ao servidor`,
      techniques: ['negative', 'boundary'],
      explanation: `Este cenário testa a validação de formato do campo de email, aplicando análise de valor limite na estrutura do email.

O "@" é um caractere obrigatório que define a "fronteira" entre um email válido e inválido. Ao testar sem esse caractere, estamos testando um valor limite da regra de validação.

A validação ocorre no frontend (client-side), evitando chamadas desnecessárias ao servidor para dados obviamente inválidos.`,
      whyImportant: [
        'Melhora a experiência do usuário com feedback imediato',
        'Reduz carga no servidor bloqueando requisições inválidas',
        'Previne erros de digitação comuns',
        'Demonstra validação em múltiplas camadas'
      ],
      whatToAdd: [
        'Cenário com email sem domínio (usuario@)',
        'Cenário com múltiplos @ (user@@email.com)',
        'Cenário com caracteres especiais não permitidos no email'
      ]
    },
    {
      id: '4',
      title: 'Cenário: Login com conta bloqueada após múltiplas tentativas',
      gherkinText: `Dado que o usuário está na página de login
E já realizou 4 tentativas de login com senha incorreta
Quando o usuário informa email "usuario@empresa.com"
E informa senha "SenhaErrada123"
E clica no botão "Entrar"
Então o sistema deve bloquear a conta temporariamente
E exibir mensagem "Conta bloqueada. Tente novamente em 15 minutos"
E enviar email de notificação de segurança ao usuário`,
      techniques: ['negative', 'state-transition', 'business-rule'],
      explanation: `Este cenário combina múltiplas técnicas de teste. É um cenário negativo que testa o comportamento de proteção contra força bruta.

A técnica de transição de estado é aplicada porque o sistema muda de estado: de "conta ativa" para "conta temporariamente bloqueada" após X tentativas.

Também valida uma regra de negócio crítica de segurança: o bloqueio temporário e a notificação por email são requisitos não-funcionais essenciais.`,
      whyImportant: [
        'Protege contra ataques de força bruta',
        'Implementa política de segurança da empresa',
        'Notifica o usuário legítimo sobre tentativas suspeitas',
        'Atende requisitos de compliance (ex: LGPD, SOC2)'
      ],
      whatToAdd: [
        'Cenário verificando desbloqueio automático após o tempo',
        'Cenário com reset do contador após login bem-sucedido',
        'Cenário testando desbloqueio via link no email'
      ]
    }
  ],
  
  tips: [
    'Use linguagem de negócio, não termos técnicos de implementação nos steps. Prefira "informa email" ao invés de "preenche input#email".',
    'Evite colocar múltiplas asserções pesadas em um único Then. Cada Then deve verificar um aspecto específico do comportamento.',
    'Considere mover passos repetidos (como navegação e contexto inicial) para o Background da feature.',
    'Mantenha os cenários independentes entre si - cada um deve poder ser executado isoladamente.',
    'Use tabelas de exemplos (Scenario Outline) quando tiver múltiplas variações do mesmo fluxo.',
    'Nomeie cenários de forma descritiva: o nome deve explicar O QUE está sendo testado, não COMO.'
  ],
  
  additionalExamples: [
    'Cenário negativo: Tentativa de login com senha expirada (política de rotação de 90 dias)',
    'Cenário de valor limite: Campo de senha com exatamente 8, 7 e 9 caracteres (mínimo é 8)',
    'Cenário de integração: Login via SSO/OAuth com provedor externo (Google, Microsoft)',
    'Cenário de acessibilidade: Navegação completa do formulário usando apenas teclado',
    'Cenário de performance: Login deve completar em menos de 3 segundos sob carga normal'
  ]
};

export function getTechniqueById(id: string): TestTechnique | undefined {
  return testTechniques.find(t => t.id === id);
}

export function getTechniqueCount(scenarios: CoachingScenario[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  scenarios.forEach(scenario => {
    scenario.techniques.forEach(techId => {
      counts.set(techId, (counts.get(techId) || 0) + 1);
    });
  });
  
  return counts;
}
