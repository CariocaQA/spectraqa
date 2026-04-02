import { useState } from 'react';
import { Copy, Check, Save, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface K6ResultProps {
  script: string;
  rationale: string;
  inputData: Record<string, unknown>;
}

export function K6Result({ script, rationale, inputData }: K6ResultProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    toast({ title: 'Copiado!', description: 'Script K6 copiado para a área de transferência' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!user) {
      toast({ 
        title: 'Erro', 
        description: 'Você precisa estar logado para salvar no histórico',
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('qa_artifacts').insert([{
        user_id: user.id,
        artifact_type: 'k6' as const,
        output_content: script,
        input_data: inputData as unknown as Record<string, never>,
        ticket_key: `K6-${Date.now()}`,
        ticket_summary: `Script K6 - ${inputData.testType || 'Load'} Test`,
        is_demo: false,
      }]);

      if (error) throw error;

      toast({ title: 'Salvo!', description: 'Script K6 salvo no histórico' });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({ 
        title: 'Erro', 
        description: 'Não foi possível salvar o script',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-slide-in">
      {/* Rationale */}
      <Card className="border-info/30 bg-info/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-info">
            <Lightbulb className="w-4 h-4" />
            Racional do Perfil de Carga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{rationale}</p>
        </CardContent>
      </Card>

      {/* Script */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Script K6 Gerado</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Salvar no histórico
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {script}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
