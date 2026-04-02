import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import { Feedback, FeedbackType, FeedbackArea, FEEDBACK_TYPE_LABELS, FEEDBACK_AREAS } from '@/types/feedback';
import { SimilarFeedbackSuggestions } from './SimilarFeedbackSuggestions';
import { FeedbackDetailModal } from './FeedbackDetailModal';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';
import { containsProfanity } from '@/lib/profanityFilter';

interface NewFeedbackFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: Omit<Feedback, 'id' | 'votos' | 'criadoEm' | 'status' | 'votedBy'>, userId: string) => void;
  onVote: (id: string) => void;
  findSimilar: (titulo: string, descricao: string) => Feedback[];
}

export function NewFeedbackForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  onVote,
  findSimilar 
}: NewFeedbackFormProps) {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<FeedbackType>('bug');
  const [area, setArea] = useState<FeedbackArea>('Geral');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [similarFeedbacks, setSimilarFeedbacks] = useState<Feedback[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<Feedback | null>(null);
  const [profanityError, setProfanityError] = useState<string | null>(null);

  const debouncedTitulo = useDebounce(titulo, 300); // Reduzido para resposta mais rápida
  const debouncedDescricao = useDebounce(descricao, 300);

  useEffect(() => {
    // Busca mais responsiva: título >= 3 OU descrição >= 10
    if (debouncedTitulo.length >= 3 || debouncedDescricao.length >= 10) {
      setIsSearching(true);
      // Simula delay de busca
      setTimeout(() => {
        const similar = findSimilar(debouncedTitulo, debouncedDescricao);
        setSimilarFeedbacks(similar);
        setIsSearching(false);
      }, 200);
    } else {
      setSimilarFeedbacks([]);
    }
  }, [debouncedTitulo, debouncedDescricao, findSimilar]);

  // Validação de palavrões em tempo real
  useEffect(() => {
    const textToCheck = `${titulo} ${descricao}`;
    if (containsProfanity(textToCheck)) {
      setProfanityError('O texto contém linguagem imprópria. Por favor, reformule seu feedback de forma profissional.');
    } else {
      setProfanityError(null);
    }
  }, [titulo, descricao]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;
    
    // Validação final de palavrões
    const textToCheck = `${titulo} ${descricao}`;
    if (containsProfanity(textToCheck)) {
      setProfanityError('O texto contém linguagem imprópria. Por favor, reformule seu feedback de forma profissional.');
      return;
    }

    const userId = user?.id || 'anonymous';

    onSubmit({
      tipo,
      area,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      criadoPor: user?.email || 'usuario@demo.com',
    }, userId);

    // Reset form
    setTipo('bug');
    setArea('Geral');
    setTitulo('');
    setDescricao('');
    setSimilarFeedbacks([]);
    setProfanityError(null);
    onOpenChange(false);
  };

  const handleUseFeedback = (feedback: Feedback) => {
    onVote(feedback.id);
    onOpenChange(false);
  };

  const resetForm = () => {
    setTipo('bug');
    setArea('Geral');
    setTitulo('');
    setDescricao('');
    setSimilarFeedbacks([]);
    setProfanityError(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Feedback
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as FeedbackType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FEEDBACK_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Área</Label>
                <Select value={area} onValueChange={(v) => setArea(v as FeedbackArea)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_AREAS.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Descreva brevemente o problema ou sugestão"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Forneça mais detalhes sobre o bug, melhoria ou funcionalidade..."
                rows={4}
                required
              />
            </div>

            {profanityError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{profanityError}</AlertDescription>
              </Alert>
            )}

            {isSearching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando feedbacks semelhantes...
              </div>
            )}

            {similarFeedbacks.length > 0 && (
              <SimilarFeedbackSuggestions
                suggestions={similarFeedbacks}
                onViewDetails={setDetailFeedback}
                onUseFeedback={handleUseFeedback}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!titulo.trim() || !descricao.trim() || !!profanityError}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Feedback
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <FeedbackDetailModal
        feedback={detailFeedback}
        open={!!detailFeedback}
        onOpenChange={(open) => !open && setDetailFeedback(null)}
        onVote={(id) => {
          onVote(id);
          setDetailFeedback(null);
          onOpenChange(false);
        }}
      />
    </>
  );
}
