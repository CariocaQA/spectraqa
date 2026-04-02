import { useEffect, useState } from 'react';
import { FileText, Zap, Link2, ArrowRight, Sparkles, MessageCircle, BookOpen, Loader2, Play, HelpCircle } from 'lucide-react';
import { useOnboardingContext } from '@/components/onboarding/OnboardingProvider';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { demoTickets, demoArtifacts } from '@/data/demoData';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  consultorAnswers: number;
  bdds: number;
  k6Scripts: number;
  jiraSuggestions: number;
  jiraConnections: number;
  documents: number;
}

const quickActions = [
  {
    title: 'Consultor QA',
    description: 'Tire dúvidas sobre QA com IA',
    icon: MessageCircle,
    href: '/consultor',
    color: 'text-primary',
  },
  {
    title: 'Gerar BDD',
    description: 'Crie cenários Gherkin a partir de tickets Jira',
    icon: FileText,
    href: '/bdd',
    color: 'text-info',
  },
  {
    title: 'Gerar K6',
    description: 'Gere scripts de performance para K6',
    icon: Zap,
    href: '/k6',
    color: 'text-warning',
  },
  {
    title: 'Conexões Jira',
    description: 'Configure suas conexões com Jira',
    icon: Link2,
    href: '/connections',
    color: 'text-success',
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    consultorAnswers: 0,
    bdds: 0,
    k6Scripts: 0,
    jiraSuggestions: 0,
    jiraConnections: 0,
    documents: 0,
  });
  const [loading, setLoading] = useState(true);
  const { startTour } = useOnboardingContext();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch all stats in parallel
      const [
        { count: consultorCount },
        { count: bddCount },
        { count: k6Count },
        { count: suggestionsCount },
        { count: connectionsCount },
        { count: documentsCount },
      ] = await Promise.all([
        supabase.from('qa_artifacts').select('*', { count: 'exact', head: true }).eq('artifact_type', 'consultor_answer'),
        supabase.from('qa_artifacts').select('*', { count: 'exact', head: true }).eq('artifact_type', 'bdd'),
        supabase.from('qa_artifacts').select('*', { count: 'exact', head: true }).eq('artifact_type', 'k6'),
        supabase.from('qa_artifacts').select('*', { count: 'exact', head: true }).eq('artifact_type', 'jira_suggestions'),
        supabase.from('jira_connections').select('*', { count: 'exact', head: true }),
        supabase.from('qa_documents').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        consultorAnswers: consultorCount || 0,
        bdds: bddCount || 0,
        k6Scripts: k6Count || 0,
        jiraSuggestions: suggestionsCount || 0,
        jiraConnections: connectionsCount || 0,
        documents: documentsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalArtifacts = stats.consultorAnswers + stats.bdds + stats.k6Scripts + stats.jiraSuggestions;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="dashboard-header space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo ao <span className="text-gradient">SpectraQA</span>
        </h1>
        <p className="text-muted-foreground">
          Seu copiloto de QA para geração de cenários BDD, scripts K6 e consultoria inteligente
        </p>
      </div>

      {/* Tour Button */}
      <Card className="tour-button border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:border-primary/50 transition-all">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Novo por aqui?</p>
              <p className="text-sm text-muted-foreground">
                Faça um tour guiado e conheça todas as funcionalidades
              </p>
            </div>
          </div>
          <Button onClick={startTour} className="gap-2">
            <Play className="w-4 h-4" />
            Iniciar Tour
          </Button>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="stats-section grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              Consultas QA
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.consultorAnswers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              BDDs Gerados
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.bdds}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Scripts K6
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.k6Scripts}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Sugestões Jira
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.jiraSuggestions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              Conexões Jira
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.jiraConnections}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              Documentos KB
            </CardDescription>
            <CardTitle className="text-2xl">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.documents}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} to={action.href}>
            <Card className="h-full hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group cursor-pointer">
              <CardHeader className="pb-2">
                <action.icon className={`w-8 h-8 ${action.color} mb-2 group-hover:scale-110 transition-transform`} />
                <CardTitle className="text-base">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{action.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Demo Mode Section */}
      <Card className="demo-section border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Modo Demo</CardTitle>
            <Badge variant="secondary" className="ml-2">Explore sem Jira</Badge>
          </div>
          <CardDescription>
            Veja exemplos de artefatos gerados sem precisar configurar uma conexão Jira
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {demoTickets.map((ticket) => {
              const artifact = demoArtifacts.find((a) => a.ticketKey === ticket.key);
              return (
                <Card key={ticket.key} className="bg-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={ticket.type === 'bdd' ? 'default' : 'secondary'}>
                        {ticket.type === 'bdd' ? 'BDD' : 'K6'}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{ticket.key}</span>
                    </div>
                    <CardTitle className="text-sm mt-2">{ticket.summary}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {ticket.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full group"
                      asChild
                    >
                      <Link to={ticket.type === 'bdd' ? '/bdd' : '/k6'} state={{ demoTicket: ticket, demoArtifact: artifact }}>
                        Ver exemplo
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {!loading && totalArtifacts > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de artefatos gerados</p>
                <p className="text-3xl font-bold">{totalArtifacts}</p>
              </div>
              <Button asChild>
                <Link to="/history">
                  Ver Histórico
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
