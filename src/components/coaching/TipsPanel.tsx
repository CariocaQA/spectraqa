import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Sparkles, BookOpen } from 'lucide-react';

interface TipsPanelProps {
  tips: string[];
  additionalExamples: string[];
}

export function TipsPanel({ tips, additionalExamples }: TipsPanelProps) {
  return (
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-400" />
          </div>
          <CardTitle className="text-base">Dicas do SpectraQA para este contexto</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Best Practices */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            Boas Práticas de BDD
          </h4>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Additional Examples */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Exemplos Adicionais Sugeridos
          </h4>
          <ul className="space-y-2">
            {additionalExamples.map((example, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2 italic">
                <span className="text-primary mt-0.5 shrink-0">→</span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
