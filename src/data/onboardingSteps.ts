import { Step } from 'react-joyride';

export const onboardingSteps: Step[] = [
  {
    target: '.dashboard-header',
    title: 'Bem-vindo ao Spectra! 🚀',
    content: 'Esta é sua plataforma de assistência QA. Aqui você pode gerar cenários BDD, scripts de performance e muito mais.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '.stats-section',
    title: 'Suas Estatísticas',
    content: 'Acompanhe quantos artefatos você já gerou: consultas, BDDs, scripts K6 e sugestões.',
    placement: 'bottom',
  },
  {
    target: '.quick-actions',
    title: 'Ações Rápidas',
    content: 'Acesso direto às principais ferramentas. Clique em qualquer card para começar.',
    placement: 'top',
  },
  {
    target: '.demo-section',
    title: 'Modo Demo',
    content: 'Explore exemplos prontos sem precisar configurar uma conexão Jira.',
    placement: 'top',
  },
  {
    target: '.nav-consultor',
    title: 'Consultor QA',
    content: 'Tire dúvidas sobre QA, BDD, automação e processos com nossa IA treinada em documentos internos.',
    placement: 'right',
  },
  {
    target: '.nav-suggestions',
    title: 'Sugestões por Card',
    content: 'Cole uma chave do Jira e receba recomendações inteligentes de testes baseadas no ticket.',
    placement: 'right',
  },
  {
    target: '.nav-bdd',
    title: 'Gerador de BDD',
    content: 'Crie cenários Gherkin automaticamente a partir de tickets Jira. Suporta modo coaching para aprendizado.',
    placement: 'right',
  },
  {
    target: '.nav-k6',
    title: 'Gerador K6',
    content: 'Gere scripts de performance prontos para uso. Configure VUs, duração e tipos de teste.',
    placement: 'right',
  },
  {
    target: '.nav-connections',
    title: 'Conexões Jira',
    content: 'Configure suas conexões com Jira Cloud (OAuth) ou Server/Data Center (API Token).',
    placement: 'right',
  },
  {
    target: '.nav-project-info',
    title: 'Informações do Projeto',
    content: 'Adicione contexto sobre seu projeto para melhorar a qualidade das sugestões da IA.',
    placement: 'right',
  },
  {
    target: '.tour-button',
    title: 'Pronto para começar!',
    content: 'Você pode reiniciar este tour a qualquer momento clicando neste botão. Boa jornada!',
    placement: 'bottom',
  },
];
