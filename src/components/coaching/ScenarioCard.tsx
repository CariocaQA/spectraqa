import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Lightbulb, AlertCircle, Plus } from 'lucide-react';
import { CoachingScenario, getTechniqueById } from '@/data/coachingMockData';

interface ScenarioCardProps {
  scenario: CoachingScenario;
  isFiltered?: boolean;
}

export function ScenarioCard({ scenario, isFiltered = false }: ScenarioCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={`transition-all duration-200 ${isFiltered ? 'ring-2 ring-primary/50' : ''} ${isOpen ? 'bg-muted/30' : ''}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-medium text-sm">{scenario.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {scenario.techniques.map(techId => {
                    const technique = getTechniqueById(techId);
                    if (!technique) return null;
                    return (
                      <Badge 
                        key={techId} 
                        variant="outline" 
                        className={`text-xs ${technique.color}`}
                      >
                        {technique.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0">
                {isOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span className="ml-1 text-xs">{isOpen ? 'Recolher' : 'Ver detalhes'}</span>
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Gherkin Code */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Código Gherkin
              </h4>
              <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap border border-border/50">
                {scenario.gherkinText}
              </pre>
            </div>

            {/* Explanation */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                Explicação
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3 rounded-lg">
                {scenario.explanation}
              </p>
            </div>

            {/* Why Important */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Por que este cenário é importante?
              </h4>
              <ul className="space-y-1.5">
                {scenario.whyImportant.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What to Add */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                <Plus className="w-3 h-3" />
                O que poderia ser adicionado?
              </h4>
              <ul className="space-y-1.5">
                {scenario.whatToAdd.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2 italic">
                    <span className="text-amber-400 mt-1">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
