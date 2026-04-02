import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { Feedback, FEEDBACK_TYPE_LABELS, FEEDBACK_STATUS_LABELS } from '@/types/feedback';

interface SimilarFeedbackSuggestionsProps {
  suggestions: Feedback[];
  onViewDetails: (feedback: Feedback) => void;
  onUseFeedback: (feedback: Feedback) => void;
}

export function SimilarFeedbackSuggestions({ 
  suggestions, 
  onViewDetails, 
  onUseFeedback 
}: SimilarFeedbackSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
          <AlertTriangle className="h-5 w-5" />
          Encontramos feedbacks parecidos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Algum deles é o que você está reportando? Votar em um existente ajuda a priorizar!
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((feedback) => (
          <div 
            key={feedback.id}
            className="p-3 rounded-lg bg-background/50 border border-border/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {FEEDBACK_TYPE_LABELS[feedback.tipo]}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-secondary/30">
                    {feedback.area}
                  </Badge>
                  <Badge className="text-xs bg-muted">
                    {FEEDBACK_STATUS_LABELS[feedback.status]}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm mb-1">{feedback.titulo}</h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {feedback.votos} votos
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewDetails(feedback)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => onUseFeedback(feedback)}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Votar neste
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
