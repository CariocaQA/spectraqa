import { useState, useMemo } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { CoachingSummary } from './CoachingSummary';
import { ScenarioCard } from './ScenarioCard';
import { TechniquesPanel } from './TechniquesPanel';
import { TipsPanel } from './TipsPanel';
import { CoachingData } from '@/data/coachingMockData';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CoachingTabProps {
  coachingData?: CoachingData | null;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

export function CoachingTab({ coachingData, isLoading, hasError, onRetry }: CoachingTabProps) {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  // Only use provided data - no fallback to prevent showing irrelevant mock data
  const data = coachingData;

  const filteredScenarios = useMemo(() => {
    if (!selectedTechnique) return data.scenarios;
    return data.scenarios.filter(s =>
      s.techniques.includes(selectedTechnique)
    );
  }, [selectedTechnique, data.scenarios]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-sm">Analisando cenários para coaching...</p>
        <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
      </div>
    );
  }

  // Error state
  if (hasError || (!isLoading && !data)) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Coaching Indisponível</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Não foi possível gerar a análise pedagógica neste momento.
            Isso pode acontecer devido a problemas temporários de conexão ou processamento.
          </p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Panel */}
      <CoachingSummary
        summary={data.summary}
        featureType={data.featureType}
        scenarioCount={data.scenarios.length}
      />

      {/* Main Content: Scenarios + Techniques Panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr,300px]">
        {/* Scenarios List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            {selectedTechnique
              ? `Cenários com a técnica selecionada (${filteredScenarios.length})`
              : `Todos os cenários (${filteredScenarios.length})`
            }
          </h3>
          <div className="space-y-3">
            {filteredScenarios.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isFiltered={!!selectedTechnique}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar: Techniques */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <TechniquesPanel
            scenarios={data.scenarios}
            selectedTechnique={selectedTechnique}
            onSelectTechnique={setSelectedTechnique}
          />
        </div>
      </div>

      {/* Tips Panel */}
      <TipsPanel
        tips={data.tips}
        additionalExamples={data.additionalExamples}
      />
    </div>
  );
}
