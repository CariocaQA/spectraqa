import { useState } from 'react';
import { Zap } from 'lucide-react';
import { K6Form, K6FormValues } from '@/components/k6/K6Form';
import { K6Result } from '@/components/k6/K6Result';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessDenied } from '@/components/AccessDenied';

interface GenerationResult {
  script: string;
  rationale: string;
}

export default function K6Generator() {
  const { toast } = useToast();
  const { canAccess, isBlocked, isTrialExpired, loading: accessLoading } = useAccessControl();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [lastInput, setLastInput] = useState<K6FormValues | null>(null);

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied isBlocked={isBlocked} isTrialExpired={isTrialExpired} />;
  }

  const handleGenerate = async (data: K6FormValues) => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data: responseData, error } = await supabase.functions.invoke('generate-k6', {
        body: {
          baseUrl: data.baseUrl,
          endpoint: data.endpoint,
          method: data.method,
          headers: data.headers,
          payload: data.payload || '',
          testType: data.testType,
          vus: data.vus,
          rampUp: data.rampUp,
          duration: data.duration,
          p95Threshold: data.p95Threshold,
          errorRateThreshold: data.errorRateThreshold,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar script');
      }

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setResult({
        script: responseData.script,
        rationale: responseData.rationale,
      });
      setLastInput(data);

      toast({ 
        title: 'Script gerado!', 
        description: 'Seu script K6 foi gerado com sucesso.' 
      });

    } catch (error) {
      console.error('Erro ao gerar K6:', error);
      toast({
        title: 'Erro na geração',
        description: error instanceof Error ? error.message : 'Não foi possível gerar o script K6',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gerador de Performance K6</h1>
          <p className="text-muted-foreground text-sm">
            Configure os parâmetros e gere scripts K6 completos com IA
          </p>
        </div>
      </div>

      {/* Form */}
      <K6Form onSubmit={handleGenerate} isLoading={isLoading} />

      {/* Result */}
      {result && lastInput && (
        <K6Result 
          script={result.script} 
          rationale={result.rationale}
          inputData={lastInput as unknown as Record<string, unknown>}
        />
      )}
    </div>
  );
}
