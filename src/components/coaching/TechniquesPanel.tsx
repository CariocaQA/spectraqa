import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FlaskConical, X } from 'lucide-react';
import { testTechniques, CoachingScenario, getTechniqueCount } from '@/data/coachingMockData';

interface TechniquesPanelProps {
  scenarios: CoachingScenario[];
  selectedTechnique: string | null;
  onSelectTechnique: (techniqueId: string | null) => void;
}

export function TechniquesPanel({ scenarios, selectedTechnique, onSelectTechnique }: TechniquesPanelProps) {
  const techniqueCounts = getTechniqueCount(scenarios);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-secondary/50 flex items-center justify-center">
              <FlaskConical className="w-3 h-3 text-secondary-foreground" />
            </div>
            <CardTitle className="text-sm">Técnicas de Teste Usadas</CardTitle>
          </div>
          {selectedTechnique && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => onSelectTechnique(null)}
            >
              <X className="w-3 h-3 mr-1" />
              Limpar filtro
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {testTechniques.map(technique => {
          const count = techniqueCounts.get(technique.id) || 0;
          if (count === 0) return null;
          
          const isSelected = selectedTechnique === technique.id;
          
          return (
            <button
              key={technique.id}
              onClick={() => onSelectTechnique(isSelected ? null : technique.id)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all duration-200 ${
                isSelected 
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/50' 
                  : 'border-border/50 hover:border-border hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${technique.color}`}
                  >
                    {technique.name}
                  </Badge>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {technique.description}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {count}
                </Badge>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
