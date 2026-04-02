import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';

interface CoachingSummaryProps {
  summary: string;
  featureType: string;
  scenarioCount: number;
}

export function CoachingSummary({ summary, featureType, scenarioCount }: CoachingSummaryProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base">Resumo do raciocínio do SpectraQA</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background/50">
              <Sparkles className="w-3 h-3 mr-1" />
              {featureType}
            </Badge>
            <Badge variant="secondary">
              {scenarioCount} cenários
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
}
