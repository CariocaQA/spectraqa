import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string }[];
}

export function TourProgress({ currentStep, totalSteps, steps }: TourProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <Card className="fixed bottom-4 right-4 w-72 z-[10001] shadow-xl border-primary/20 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Progresso do Tour</span>
          <span className="text-xs text-muted-foreground">
            {currentStep} de {totalSteps}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} className="h-2" />
        
        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep - 1;
            
            return (
              <div
                key={index}
                className={cn(
                  'flex items-center gap-2 text-xs py-1 px-2 rounded transition-colors',
                  isCurrent && 'bg-primary/10 text-primary font-medium',
                  isCompleted && 'text-muted-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground/50'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                ) : (
                  <Circle className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isCurrent ? 'text-primary' : 'text-muted-foreground/30'
                  )} />
                )}
                <span className="truncate">{step.title}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
