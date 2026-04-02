import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Layers, Merge, X, RefreshCw, ThumbsUp, AlertCircle, Trophy } from 'lucide-react';
import { Feedback, FeedbackGroup, FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from '@/types/feedback';
import { toast } from 'sonner';

interface AdminGroupingPanelProps {
  groups: FeedbackGroup[];
  allFeedbacks: Feedback[];
  topVoted: Feedback[];
  onRunAnalysis: () => FeedbackGroup[];
  onMerge: (groupId: string, primaryId: string) => void;
  onIgnoreGroup: (groupId: string) => void;
}

const statusColors: Record<string, string> = {
  novo: 'bg-muted text-muted-foreground',
  em_analise: 'bg-yellow-500/20 text-yellow-400',
  planejado: 'bg-purple-500/20 text-purple-400',
  em_andamento: 'bg-blue-500/20 text-blue-400',
  concluido: 'bg-green-500/20 text-green-400',
  mesclado: 'bg-muted text-muted-foreground',
};

export function AdminGroupingPanel({ 
  groups, 
  allFeedbacks,
  topVoted,
  onRunAnalysis, 
  onMerge,
  onIgnoreGroup 
}: AdminGroupingPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({});
  const [displayGroups, setDisplayGroups] = useState<FeedbackGroup[]>(groups);

  const runAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const newGroups = onRunAnalysis();
      setDisplayGroups(newGroups);
      setIsAnalyzing(false);
      
      if (newGroups.length === 0) {
        toast.info('Nenhum grupo de feedbacks semelhantes encontrado.');
      } else {
        toast.success(`${newGroups.length} grupo(s) de feedbacks semelhantes encontrado(s).`);
      }
    }, 1000);
  };

  const handleMerge = (groupId: string) => {
    const primaryId = selectedPrimary[groupId];
    if (!primaryId) {
      toast.error('Selecione o feedback principal antes de mesclar.');
      return;
    }
    onMerge(groupId, primaryId);
    setDisplayGroups(prev => prev.filter(g => g.id !== groupId));
    toast.success('Feedbacks mesclados com sucesso!');
  };

  const handleIgnore = (groupId: string) => {
    onIgnoreGroup(groupId);
    setDisplayGroups(prev => prev.filter(g => g.id !== groupId));
    toast.info('Grupo ignorado.');
  };

  const getFeedbackById = (id: string) => allFeedbacks.find(f => f.id === id);

  return (
    <div className="space-y-6">
      {/* Top 10 mais votados */}
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Top 10 Mais Votados
          </CardTitle>
          <CardDescription>
            Feedbacks com maior número de votos da comunidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topVoted.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum feedback com votos ainda.
            </p>
          ) : (
            <div className="space-y-2">
              {topVoted.map((feedback, index) => (
                <div 
                  key={feedback.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{feedback.titulo}</span>
                      <Badge variant="outline" className="text-xs">
                        {FEEDBACK_TYPE_LABELS[feedback.tipo]}
                      </Badge>
                      <Badge className={`text-xs ${statusColors[feedback.status]}`}>
                        {FEEDBACK_STATUS_LABELS[feedback.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {feedback.area} • {feedback.criadoPor}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 font-semibold">
                    <ThumbsUp className="h-4 w-4 fill-current" />
                    {feedback.votos}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Triagem de similaridade */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Triagem de Feedbacks Semelhantes
              </CardTitle>
              <CardDescription>
                Analise e mescle feedbacks duplicados ou relacionados
              </CardDescription>
            </div>
            <Button onClick={runAnalysis} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analisando...' : 'Rodar Varredura'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum grupo de feedbacks semelhantes encontrado.</p>
              <p className="text-sm">Clique em "Rodar Varredura" para analisar.</p>
            </div>
          ) : (
            displayGroups.map((group) => {
              const feedbacks = group.feedbackIds
                .map(getFeedbackById)
                .filter(Boolean) as Feedback[];

              if (feedbacks.length < 2) return null;

              return (
                <Card key={group.id} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={group.similarity === 'alta' ? 'default' : 'secondary'}>
                          Similaridade {group.similarity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {feedbacks.length} feedbacks
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleIgnore(group.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ignorar grupo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={selectedPrimary[group.id] || ''}
                      onValueChange={(value) => 
                        setSelectedPrimary(prev => ({ ...prev, [group.id]: value }))
                      }
                    >
                      {feedbacks.map((feedback) => (
                        <div 
                          key={feedback.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border"
                        >
                          <RadioGroupItem 
                            value={feedback.id} 
                            id={`${group.id}-${feedback.id}`}
                            className="mt-1"
                          />
                          <Label 
                            htmlFor={`${group.id}-${feedback.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">#{feedback.id}</span>
                              <Badge variant="outline" className="text-xs">
                                {FEEDBACK_TYPE_LABELS[feedback.tipo]}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-secondary/30">
                                {feedback.area}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ThumbsUp className="h-3 w-3" />
                                {feedback.votos}
                              </span>
                            </div>
                            <p className="font-medium text-sm">{feedback.titulo}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {feedback.descricao}
                            </p>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    <div className="flex justify-end pt-2">
                      <Button 
                        onClick={() => handleMerge(group.id)}
                        disabled={!selectedPrimary[group.id]}
                      >
                        <Merge className="h-4 w-4 mr-2" />
                        Mesclar neste grupo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
