import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ArrowRight, Merge, Trash2 } from 'lucide-react';
import { Feedback, FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from '@/types/feedback';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FeedbackCardProps {
  feedback: Feedback;
  currentUserId?: string;
  canDelete?: boolean;
  onVote?: (id: string) => void;
  onClick?: (feedback: Feedback) => void;
  onGoToPrimary?: (primaryId: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const typeColors: Record<string, string> = {
  bug: 'bg-destructive/20 text-destructive border-destructive/30',
  melhoria: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  nova_funcionalidade: 'bg-green-500/20 text-green-400 border-green-500/30',
};

const statusColors: Record<string, string> = {
  novo: 'bg-muted text-muted-foreground',
  em_analise: 'bg-yellow-500/20 text-yellow-400',
  planejado: 'bg-purple-500/20 text-purple-400',
  em_andamento: 'bg-blue-500/20 text-blue-400',
  concluido: 'bg-green-500/20 text-green-400',
  mesclado: 'bg-muted text-muted-foreground',
};

export function FeedbackCard({ 
  feedback, 
  currentUserId,
  canDelete,
  onVote, 
  onClick, 
  onGoToPrimary,
  onDelete,
  compact 
}: FeedbackCardProps) {
  const isMerged = feedback.status === 'mesclado';
  const hasVoted = currentUserId ? feedback.votedBy.includes(currentUserId) : false;

  return (
    <Card 
      className={cn(
        "transition-all hover:border-primary/50 cursor-pointer",
        isMerged && "opacity-60",
        compact && "p-2"
      )}
      onClick={() => onClick?.(feedback)}
    >
      <CardContent className={cn("p-4", compact && "p-3")}>
        {isMerged && feedback.mescladoEm && (
          <div 
            className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-2 rounded bg-muted/50"
            onClick={(e) => {
              e.stopPropagation();
              onGoToPrimary?.(feedback.mescladoEm!);
            }}
          >
            <Merge className="h-4 w-4" />
            <span>Este feedback foi mesclado em #{feedback.mescladoEm}</span>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={typeColors[feedback.tipo]}>
                {FEEDBACK_TYPE_LABELS[feedback.tipo]}
              </Badge>
              <Badge variant="outline" className="bg-secondary/50">
                {feedback.area}
              </Badge>
              <Badge className={statusColors[feedback.status]}>
                {FEEDBACK_STATUS_LABELS[feedback.status]}
              </Badge>
            </div>

            <h3 className={cn(
              "font-semibold mb-1",
              compact ? "text-sm" : "text-base",
              isMerged && "line-through opacity-70"
            )}>
              {feedback.titulo}
            </h3>

            {!compact && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {feedback.descricao}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{feedback.criadoPor}</span>
              <span>{format(feedback.criadoEm, "dd MMM yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isMerged && onVote && (
              <Button
                variant={hasVoted ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all",
                  hasVoted && "bg-primary text-primary-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(feedback.id);
                }}
              >
                <ThumbsUp className={cn("h-4 w-4", hasVoted && "fill-current")} />
                <span className="font-semibold">{feedback.votos}</span>
              </Button>
            )}

            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(feedback.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}

            {isMerged && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ThumbsUp className="h-4 w-4" />
                <span>{feedback.votos}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
