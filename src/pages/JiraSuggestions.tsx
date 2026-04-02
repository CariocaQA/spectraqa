import { useState, useEffect } from 'react';
import { Lightbulb, Search, Loader2, Copy, Save, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessDenied } from '@/components/AccessDenied';
import { useProjects } from '@/hooks/useProjects';
import { ProjectSelector } from '@/components/project/ProjectSelector';
import { InputModeSelector, InputMode } from '@/components/input/InputModeSelector';
import { ManualInputForm } from '@/components/input/ManualInputForm';
import { useJiraValidation } from '@/hooks/useJiraValidation';
import ReactMarkdown from 'react-markdown';

interface Connection {
  id: string;
  name: string;
  is_default: boolean;
}

interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string;
  issueType: string;
  status: string;
  priority: string;
  labels: string[];
  components: string[];
}

export default function JiraSuggestions() {
  const { canAccess, loading: accessLoading } = useAccessControl();
  const { validateConnection, isValidating } = useJiraValidation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [issueKey, setIssueKey] = useState('');
  const [issue, setIssue] = useState<JiraIssue | null>(null);
  const [suggestions, setSuggestions] = useState<string>('');
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('jira');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  // Project context
  const { projects, loading: projectsLoading, selectedProjectId, selectedProject, setSelectedProjectId } = useProjects();
  const [useProjectNotes, setUseProjectNotes] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      const { data } = await supabase
        .from('jira_connections')
        .select('id, name, is_default')
        .eq('status', 'connected')
        .order('is_default', { ascending: false });

      if (data && data.length > 0) {
        setConnections(data);
        const defaultConn = data.find(c => c.is_default) || data[0];
        setSelectedConnection(defaultConn.id);
      }
    };

    if (canAccess) {
      fetchConnections();
    }
  }, [canAccess]);

  const handleFetchIssue = async () => {
    if (!selectedConnection || !issueKey.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione uma conexão e informe a issue key.',
        variant: 'destructive',
      });
      return;
    }

    const isValid = await validateConnection(selectedConnection);
    if (!isValid) return;

    setIsLoadingIssue(true);
    setIssue(null);
    setSuggestions('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jira-fetch-issue`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connectionId: selectedConnection,
            issueKey: issueKey.trim().toUpperCase(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar issue');
      }

      setIssue(data.issue);
      toast({ title: 'Ticket carregado' });

    } catch (error) {
      console.error('Fetch issue error:', error);
      toast({
        title: 'Erro ao buscar ticket',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingIssue(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    // Validate based on input mode
    if (inputMode === 'jira' && !issue) {
      toast({ title: 'Erro', description: 'Busque um ticket primeiro', variant: 'destructive' });
      return;
    }

    if (inputMode === 'manual' && (!manualTitle.trim() || !manualContent.trim())) {
      toast({ title: 'Erro', description: 'Preencha o título e a descrição', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setSuggestions('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const requestBody: Record<string, unknown> = {
        useKnowledgeBase,
        projectNotes: useProjectNotes && selectedProject ? selectedProject.notes : null,
        projectName: useProjectNotes && selectedProject ? selectedProject.name : null,
      };

      if (inputMode === 'manual') {
        requestBody.manualInput = {
          title: manualTitle.trim(),
          content: manualContent.trim()
        };
      } else {
        requestBody.issue = issue;
      }

      const response = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-suggestions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar sugestões');
      }

      setSuggestions(data.suggestions);

      if (data.usedKnowledgeBase) {
        toast({ title: 'Sugestões geradas com base interna' });
      } else {
        toast({ title: 'Sugestões geradas' });
      }

    } catch (error) {
      console.error('Generate suggestions error:', error);
      toast({
        title: 'Erro ao gerar sugestões',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestions);
    setIsCopied(true);
    toast({ title: 'Copiado!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveToHistory = async () => {
    if (!suggestions) return;

    // Validate based on input mode
    if (inputMode === 'jira' && !issue) return;
    if (inputMode === 'manual' && !manualTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const ticketKey = inputMode === 'manual'
        ? `M-${manualTitle.substring(0, 30).replace(/\s+/g, '-').toUpperCase()}`
        : issue!.key;

      const ticketSummary = inputMode === 'manual' ? manualTitle : issue!.summary;

      const inputData = inputMode === 'manual'
        ? {
          inputMode: 'manual',
          manualTitle,
          manualContent,
          useKnowledgeBase,
          usedProjectNotes: useProjectNotes && !!selectedProject
        }
        : {
          inputMode: 'jira',
          issue,
          useKnowledgeBase,
          usedProjectNotes: useProjectNotes && !!selectedProject
        };

      const { error } = await supabase.from('qa_artifacts').insert([{
        user_id: user.id,
        artifact_type: 'jira_suggestions' as const,
        ticket_key: ticketKey,
        ticket_summary: ticketSummary,
        output_content: suggestions,
        input_data: JSON.parse(JSON.stringify(inputData)),
        jira_connection_id: inputMode === 'jira' ? selectedConnection : null,
      }]);

      if (error) throw error;

      toast({ title: 'Salvo no histórico' });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Erro ao salvar',
        variant: 'destructive',
      });
    }
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-warning" />
          Sugestões de QA
        </h1>
        <p className="text-muted-foreground mt-1">
          Busque um ticket ou informe manualmente para receber sugestões de QA automatizadas
        </p>
      </div>

      {/* Input Mode Selector */}
      <InputModeSelector value={inputMode} onChange={(mode) => {
        setInputMode(mode);
        // Clear generated content when switching modes
        setSuggestions('');
      }} />

      {/* Jira Search Form - only visible in jira mode */}
      {inputMode === 'jira' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar Ticket</CardTitle>
            <CardDescription>Selecione a conexão Jira e informe a chave do ticket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_2fr_auto]">
              <div className="space-y-2">
                <Label>Conexão Jira</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name} {conn.is_default && '(padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Key</Label>
                <Input
                  value={issueKey}
                  onChange={(e) => setIssueKey(e.target.value.toUpperCase())}
                  placeholder="Ex: PROJ-123"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchIssue()}
                />
              </div>

              <div className="flex items-end">
                <Button onClick={handleFetchIssue} disabled={isLoadingIssue || isValidating || !selectedConnection}>
                  {isLoadingIssue || isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Buscar</span>
                </Button>
              </div>
            </div>

            {connections.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                Nenhuma conexão Jira configurada.{' '}
                <a href="/connections" className="text-primary hover:underline">
                  Configure uma conexão
                </a>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Input Form - only visible in manual mode */}
      {inputMode === 'manual' && (
        <ManualInputForm
          title={manualTitle}
          content={manualContent}
          onTitleChange={setManualTitle}
          onContentChange={setManualContent}
          titlePlaceholder="Ex: Integração com sistema de pagamento"
          contentPlaceholder="Cole aqui a descrição da funcionalidade, requisitos, critérios de aceite ou qualquer informação relevante para gerar sugestões de QA..."
          contentLabel="Descrição / Requisitos"
          contentDescription="Informe os detalhes da funcionalidade, critérios de aceite, regras de negócio ou qualquer contexto relevante"
        />
      )}

      {/* Context Sources */}
      <ProjectSelector
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        useProjectNotes={useProjectNotes}
        onToggleProjectNotes={setUseProjectNotes}
        useKnowledgeBase={useKnowledgeBase}
        onToggleKnowledgeBase={setUseKnowledgeBase}
        loading={projectsLoading}
      />

      {/* Issue Details - only visible in jira mode when issue is loaded */}
      {inputMode === 'jira' && issue && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{issue.issueType}</Badge>
                <span className="font-mono text-sm text-muted-foreground">{issue.key}</span>
              </div>
              <Badge variant={issue.status === 'Done' ? 'default' : 'secondary'}>
                {issue.status}
              </Badge>
            </div>
            <CardTitle className="text-lg mt-2">{issue.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {issue.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {issue.description.substring(0, 500)}
                  {issue.description.length > 500 && '...'}
                </p>
              </div>
            )}

            {issue.acceptanceCriteria && (
              <div>
                <h4 className="text-sm font-medium mb-2">Critérios de Aceite</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {issue.acceptanceCriteria}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {issue.labels?.map((label) => (
                <Badge key={label} variant="outline" className="text-xs">
                  {label}
                </Badge>
              ))}
              {issue.components?.map((comp) => (
                <Badge key={comp} variant="secondary" className="text-xs">
                  {comp}
                </Badge>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleGenerateSuggestions} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Gerar Sugestões de QA
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button for Manual Mode */}
      {inputMode === 'manual' && manualTitle.trim() && manualContent.trim() && (
        <div className="flex justify-end">
          <Button onClick={handleGenerateSuggestions} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Sugestões de QA
              </>
            )}
          </Button>
        </div>
      )}

      {/* Suggestions */}
      {suggestions && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sugestões de QA</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {isCopied ? (
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {isCopied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSaveToHistory}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children, ...props }) => {
                    const text = String(children);

                    // Main section headers with emojis - prominent styling with background
                    if (text.match(/^[📋⚠️✅❌🔗⚡📝💡🔍]/)) {
                      return (
                        <div className="mt-8 mb-4 first:mt-0">
                          <div className="bg-muted/40 rounded-lg px-4 py-3 border-l-4 border-primary">
                            <span className="text-base font-bold text-foreground" {...props}>
                              {children}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    // Scenario headers - card style
                    if (text.startsWith('Cenário')) {
                      return (
                        <div className="mt-4 mb-3 bg-muted/20 rounded-lg border border-border/40 p-4">
                          <div className="font-semibold text-foreground flex items-center gap-2" {...props}>
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            {children}
                          </div>
                        </div>
                      );
                    }

                    // Field labels (Pré-condição, Ação, Resultado esperado) - styled labels
                    const fieldMatch = text.match(/^(Pré-condição|Ação|Resultado esperado):/);
                    if (fieldMatch) {
                      const fieldType = fieldMatch[1];
                      const colorClass =
                        fieldType === 'Pré-condição' ? 'text-blue-400' :
                          fieldType === 'Ação' ? 'text-yellow-400' :
                            'text-green-400';

                      return (
                        <div className="my-2 ml-4 flex gap-2" {...props}>
                          <span className={`font-medium ${colorClass} whitespace-nowrap`}>
                            {fieldType}:
                          </span>
                          <span className="text-muted-foreground">
                            {text.replace(`${fieldType}:`, '').trim()}
                          </span>
                        </div>
                      );
                    }

                    // Regular paragraphs
                    return <p className="my-2 text-muted-foreground" {...props}>{children}</p>;
                  },
                  strong: ({ children, ...props }) => (
                    <strong className="text-foreground font-semibold" {...props}>{children}</strong>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="my-3 ml-4 space-y-2 list-disc list-inside text-muted-foreground" {...props}>
                      {children}
                    </ul>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="text-muted-foreground" {...props}>{children}</li>
                  ),
                }}
              >
                {suggestions}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
