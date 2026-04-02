import { useState } from 'react';
import { History as HistoryIcon, FileText, Zap, Lightbulb, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MarkdownContent } from '@/components/MarkdownContent';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ArtifactType = 'bdd' | 'k6' | 'consultor_answer' | 'jira_suggestions';

interface Artifact {
  id: string;
  artifact_type: ArtifactType;
  ticket_key: string | null;
  ticket_summary: string | null;
  output_content: string;
  created_at: string | null;
  is_demo: boolean | null;
}

const artifactConfig: Record<ArtifactType, { label: string; icon: typeof FileText; color: string }> = {
  bdd: { label: 'BDD', icon: FileText, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  k6: { label: 'K6', icon: Zap, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  jira_suggestions: { label: 'Sugestão', icon: Lightbulb, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  consultor_answer: { label: 'Consulta', icon: FileText, color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

export default function History() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ['qa_artifacts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('qa_artifacts')
        .select('id, artifact_type, ticket_key, ticket_summary, output_content, created_at, is_demo')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Artifact[];
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('qa_artifacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qa_artifacts'] });
      toast({ title: 'Artefato excluído', description: 'O registro foi removido do histórico.' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o artefato.', variant: 'destructive' });
    },
  });

  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const stats = {
    bdd: artifacts?.filter(a => a.artifact_type === 'bdd').length || 0,
    k6: artifacts?.filter(a => a.artifact_type === 'k6').length || 0,
    suggestions: artifacts?.filter(a => a.artifact_type === 'jira_suggestions').length || 0,
    consultor: artifacts?.filter(a => a.artifact_type === 'consultor_answer').length || 0,
  };

  const getTitle = (artifact: Artifact) => {
    if (artifact.ticket_key && artifact.ticket_summary) {
      return `${artifact.ticket_key}: ${artifact.ticket_summary}`;
    }
    if (artifact.ticket_key) {
      return artifact.ticket_key;
    }
    if (artifact.ticket_summary) {
      return artifact.ticket_summary;
    }
    return 'Artefato sem título';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <HistoryIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="text-muted-foreground text-sm">Veja seus artefatos gerados</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-2xl font-bold">{stats.bdd}</p>
              <p className="text-xs text-muted-foreground">BDDs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold">{stats.k6}</p>
              <p className="text-xs text-muted-foreground">Scripts K6</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-2xl font-bold">{stats.suggestions}</p>
              <p className="text-xs text-muted-foreground">Sugestões</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats.consultor}</p>
              <p className="text-xs text-muted-foreground">Consultas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Artifacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Artefatos Gerados</CardTitle>
          <CardDescription>Clique para expandir e ver o conteúdo completo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !artifacts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <HistoryIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum artefato gerado ainda.</p>
              <p className="text-sm">Seus BDDs, scripts K6 e sugestões aparecerão aqui.</p>
            </div>
          ) : (
            artifacts.map(artifact => {
              const config = artifactConfig[artifact.artifact_type];
              const Icon = config.icon;
              const isOpen = openItems.has(artifact.id);

              return (
                <Collapsible key={artifact.id} open={isOpen} onOpenChange={() => toggleItem(artifact.id)}>
                  <div className="border border-border/50 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 p-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>

                      <Badge variant="outline" className={`shrink-0 ${config.color}`}>
                        <Icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>

                      <CollapsibleTrigger asChild>
                        <button className="flex-1 text-left truncate text-sm font-medium hover:underline cursor-pointer">
                          {getTitle(artifact)}
                        </button>
                      </CollapsibleTrigger>

                      {artifact.is_demo && (
                        <Badge variant="secondary" className="shrink-0 text-xs">Demo</Badge>
                      )}

                      <span className="text-xs text-muted-foreground shrink-0">
                        {artifact.created_at && format(new Date(artifact.created_at), "dd/MM", { locale: ptBR })}
                      </span>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir artefato?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O artefato será removido permanentemente do histórico.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(artifact.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 border-t border-border/30">
                        <MarkdownContent 
                          content={artifact.output_content} 
                          className="bg-muted/30 rounded-lg p-4 overflow-auto max-h-[500px]"
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
