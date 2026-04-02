import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Globe, FileCode, Settings, Target, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { HeadersInput, HeaderPair } from './HeadersInput';

const testTypes = [
  { value: 'smoke', label: 'Smoke', description: 'Validação rápida com carga mínima' },
  { value: 'load', label: 'Load', description: 'Carga normal esperada' },
  { value: 'stress', label: 'Stress', description: 'Encontrar os limites' },
  { value: 'spike', label: 'Spike', description: 'Aumento súbito de carga' },
  { value: 'endurance', label: 'Endurance', description: 'Estabilidade prolongada' },
] as const;

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const formSchema = z.object({
  baseUrl: z.string().url('URL inválida').min(1, 'Base URL é obrigatória'),
  endpoint: z.string().min(1, 'Endpoint é obrigatório').regex(/^\//, 'Endpoint deve começar com /'),
  method: z.enum(httpMethods),
  payload: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'JSON inválido'),
  testType: z.enum(['smoke', 'load', 'stress', 'spike', 'endurance']),
  vus: z.number().min(1, 'Mínimo 1 VU').max(1000, 'Máximo 1000 VUs'),
  rampUp: z.string().regex(/^\d+[smh]$/, 'Formato inválido (ex: 30s, 1m, 1h)'),
  duration: z.string().regex(/^\d+[smh]$/, 'Formato inválido (ex: 5m, 1h)'),
  p95Threshold: z.number().min(1, 'Mínimo 1ms').max(60000, 'Máximo 60000ms'),
  errorRateThreshold: z.number().min(0, 'Mínimo 0%').max(100, 'Máximo 100%'),
});

export type K6FormValues = z.infer<typeof formSchema> & { headers: HeaderPair[] };

interface K6FormProps {
  onSubmit: (data: K6FormValues) => void;
  isLoading: boolean;
}

export function K6Form({ onSubmit, isLoading }: K6FormProps) {
  const [headers, setHeaders] = useState<HeaderPair[]>([
    { key: 'Content-Type', value: 'application/json' }
  ]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      baseUrl: '',
      endpoint: '/',
      method: 'GET',
      payload: '',
      testType: 'load',
      vus: 10,
      rampUp: '30s',
      duration: '5m',
      p95Threshold: 500,
      errorRateThreshold: 1,
    },
  });

  const selectedMethod = form.watch('method');
  const selectedTestType = form.watch('testType');
  const showPayload = ['POST', 'PUT', 'PATCH'].includes(selectedMethod);

  const handleSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit({ ...data, headers });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* API Configuration */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Configuração da API
            </CardTitle>
            <CardDescription>Defina o endpoint e parâmetros da requisição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endpoint</FormLabel>
                    <FormControl>
                      <Input placeholder="/v1/pedidos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método HTTP</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {httpMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="mb-3 block">Headers</FormLabel>
              <HeadersInput headers={headers} onChange={setHeaders} />
            </div>

            {showPayload && (
              <FormField
                control={form.control}
                name="payload"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payload (JSON)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='{"key": "value"}'
                        className="font-mono text-sm min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Test Type */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              Tipo de Teste
            </CardTitle>
            <CardDescription>Selecione o tipo de teste de performance</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="testType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(value) => value && field.onChange(value)}
                      className="flex flex-wrap justify-start gap-2"
                    >
                      {testTypes.map((type) => (
                        <ToggleGroupItem
                          key={type.value}
                          value={type.value}
                          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-4"
                        >
                          {type.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FormControl>
                  <FormDescription className="mt-3">
                    {testTypes.find(t => t.value === selectedTestType)?.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Load Profile */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Perfil de Carga
            </CardTitle>
            <CardDescription>Configure os parâmetros de carga do teste</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="vus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Virtual Users (VUs)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={1000}
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rampUp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ramp-up</FormLabel>
                    <FormControl>
                      <Input placeholder="30s" {...field} />
                    </FormControl>
                    <FormDescription>Ex: 30s, 1m, 2h</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração total</FormLabel>
                    <FormControl>
                      <Input placeholder="5m" {...field} />
                    </FormControl>
                    <FormDescription>Ex: 5m, 10m, 1h</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Thresholds
            </CardTitle>
            <CardDescription>Defina os limites aceitáveis de performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="p95Threshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latência p95 (ms)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Tempo máximo aceitável para 95% das requisições</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="errorRateThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de erro máxima (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={100}
                        step={0.1}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>Percentual máximo de requisições com erro</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando Script...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Gerar Script K6
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
