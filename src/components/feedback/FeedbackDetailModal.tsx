import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ThumbsUp, Calendar, User, ArrowRight, Merge, Trash2 } from 'lucide-react';
import { Feedback, FeedbackStatus, FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from '@/types/feedback';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FeedbackDetailModalProps {
  feedback: Feedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  isAdmin?: boolean;
  canDelete?: boolean;
  onVote?: (id: string) => void;
  onGoToPrimary?: (primaryId: string) => void;
  onUpdateStatus?: (id: string, status: FeedbackStatus) => void;
  onDelete?: (id: string) => void;
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

const statusOptions: FeedbackStatus[] = [
  'novo',
  'em_analise',
  'planejado',
  'em_andamento',
  'concluido',
];

export function FeedbackDetailModal({ 
  feedback, 
  open, 
  onOpenChange,
  currentUserId,
  isAdmin,
  canDelete,
  onVote,
  onGoToPrimary,
  onUpdateStatus,
  onDelete,
}: FeedbackDetailModalProps) {
  if (!feedback) return null;

  const isMerged = feedback.status === 'mesclado';
  const hasVoted = currentUserId ? feedback.votedBy.includes(currentUserId) : false;

  const handleDelete = () => {
    onDelete?.(feedback.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Badge variant="outline" className={typeColors[feedback.tipo]}>
              {FEEDBACK_TYPE_LABELS[feedback.tipo]}
            </Badge>
            <Badge variant="outline" className="bg-secondary/50">
              {feedback.area}
            </Badge>
            {!isAdmin || isMerged ? (
              <Badge className={statusColors[feedback.status]}>
                {FEEDBACK_STATUS_LABELS[feedback.status]}
              </Badge>
            ) : (
              <Select
                value={feedback.status}
                onValueChange={(value) => onUpdateStatus?.(feedback.id, value as FeedbackStatus)}
              >
                <SelectTrigger className="w-[160px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", statusColors[status]?.split(' ')[0])} />
                        {FEEDBACK_STATUS_LABELS[status]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogTitle className="text-xl">{feedback.titulo}</DialogTitle>
        </DialogHeader>

        {isMerged && feedback.mescladoEm && (
          <div 
            className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            onClick={() => {
              onGoToPrimary?.(feedback.mescladoEm!);
              onOpenChange(false);
            }}
          >
            <Merge className="h-4 w-4" />
            <span>Este feedback foi mesclado no feedback #{feedback.mescladoEm}</span>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h4>
            <p className="text-sm whitespace-pre-wrap">{feedback.descricao}</p>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{feedback.criadoPor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{format(feedback.criadoEm, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ThumbsUp className={cn("h-5 w-5", hasVoted && "fill-primary text-primary")} />
              <span className="font-semibold text-lg">{feedback.votos}</span>
              <span className="text-sm">votos</span>
            </div>

            <div className="flex items-center gap-2">
              {canDelete && onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir feedback?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O feedback e todos os votos associados serão removidos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {!isMerged && onVote && (
                <Button 
                  variant={hasVoted ? "default" : "outline"}
                  onClick={() => onVote(feedback.id)}
                >
                  <ThumbsUp className={cn("h-4 w-4 mr-2", hasVoted && "fill-current")} />
                  {hasVoted ? 'Remover voto' : 'Votar neste feedback'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
