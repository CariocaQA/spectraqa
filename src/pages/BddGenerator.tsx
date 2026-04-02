import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Copy, Check, Sparkles, Search, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { DemoTicket, DemoArtifact } from '@/data/demoData';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessDenied } from '@/components/AccessDenied';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useProjects } from '@/hooks/useProjects';
import { ProjectSelector } from '@/components/project/ProjectSelector';
import { CoachingToggle } from '@/components/coaching/CoachingToggle';
import { CoachingTab } from '@/components/coaching/CoachingTab';
import { CoachingData } from '@/data/coachingMockData';
import { InputModeSelector, InputMode } from '@/components/input/InputModeSelector';
import { ManualInputForm } from '@/components/input/ManualInputForm';
import { useJiraValidation } from '@/hooks/useJiraValidation';

interface Connection {
  id: string;
  name: string;
  is_default: boolean;
}

interface JiraIssue {
  key: string;
  summary: string;
  description: string | null;
  acceptanceCriteria: string | null;
  issueType: string | null;
  status: string | null;
  priority: string | null;
  labels: string[];
  components: string[];
}

export default function BddGenerator() {
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const { canAccess, isBlocked, isTrialExpired, loading: accessLoading } = useAccessControl();

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>('jira');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');

  // Jira integration state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<string>('');
  const [issueKey, setIssueKey] = useState('');
  const [issue, setIssue] = useState<JiraIssue | null>(null);
  const [bddContent, setBddContent] = useState<string>('');
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [loadingIssue, setLoadingIssue] = useState(false);
  const [loadingBdd, setLoadingBdd] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [coachingMode, setCoachingMode] = useState(true);
  const [activeTab, setActiveTab] = useState('bdd');

  // Coaching state
  const [coachingData, setCoachingData] = useState<CoachingData | null>(null);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const [coachingError, setCoachingError] = useState(false);

  // Project context
  const { projects, loading: projectsLoading, selectedProjectId, selectedProject, setSelectedProjectId } = useProjects();
  const [useProjectNotes, setUseProjectNotes] = useState(true);

  // Demo mode props
  const demoTicket = location.state?.demoTicket as DemoTicket | undefined;
  const demoArtifact = location.state?.demoArtifact as DemoArtifact | undefined;

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data, error } = await supabase
      .from('jira_connections')
      .select('id, name, is_default')
      .order('is_default', { ascending: false });

    if (!error && data) {
      setConnections(data);
      const defaultConn = data.find(c => c.is_default);
      if (defaultConn) {
        setSelectedConnection(defaultConn.id);
      } else if (data.length > 0) {
        setSelectedConnection(data[0].id);
      }
    }
  };

  const handleFetchIssue = async () => {
    if (!selectedConnection || !issueKey.trim()) {
      toast({ title: 'Erro', description: 'Selecione uma conexão e informe a chave do ticket', variant: 'destructive' });
      return;
    }

    const isValid = await validateConnection(selectedConnection);
    if (!isValid) return;

    setLoadingIssue(true);
    setIssue(null);
    setBddContent('');

    try {
      const response = await supabase.functions.invoke('jira-fetch-issue', {
        body: { connectionId: selectedConnection, issueKey: issueKey.trim().toUpperCase() }
      });

      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Handle string response (needs parsing)
      let data = response.data;
      if (typeof data === 'string') {
        console.log('Parsing string response...');
        data = JSON.parse(data);
      }

      console.log('Parsed data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract issue from response
      const issueData = data.issue;
      console.log('Issue data:', issueData);

      if (!issueData) {
        throw new Error('Dados do ticket não encontrados na resposta');
      }

      setIssue(issueData);
      toast({ title: 'Ticket carregado', description: `${issueData.key}: ${issueData.summary}` });
    } catch (error: any) {
      console.error('Error fetching issue:', error);
      toast({ title: 'Erro ao buscar ticket', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingIssue(false);
    }
  };

  const handleGenerateBdd = async () => {
    // Validate based on input mode
    if (inputMode === 'jira' && !issue) {
      toast({ title: 'Erro', description: 'Busque um ticket primeiro', variant: 'destructive' });
      return;
    }

    if (inputMode === 'manual' && (!manualTitle.trim() || !manualContent.trim())) {
      toast({ title: 'Erro', description: 'Preencha o título e a descrição', variant: 'destructive' });
      return;
    }

    setLoadingBdd(true);
    setBddContent('');
    setCoachingData(null);

    try {
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

      const response = await supabase.functions.invoke('jira-bdd-generate', {
        body: requestBody
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const generatedBdd = response.data.bdd;
      setBddContent(generatedBdd);

      // Switch to learning tab if coaching mode is enabled
      if (coachingMode) {
        setActiveTab('aprendizado');
        // Fetch coaching data automatically
        fetchCoachingData(generatedBdd);
      }

      const kbMessage = response.data.usedKnowledgeBase
        ? ' (com contexto da base de conhecimento)'
        : '';
      toast({ title: 'BDD gerado com sucesso!' + kbMessage });
    } catch (error: any) {
      console.error('Error generating BDD:', error);
      toast({ title: 'Erro ao gerar BDD', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingBdd(false);
    }
  };

  const fetchCoachingData = async (bddContent: string) => {
    // Build issue data for coaching based on input mode
    const issueForCoaching = inputMode === 'manual'
      ? {
        key: `M-${manualTitle.substring(0, 20)}`,
        summary: manualTitle,
        description: manualContent,
        acceptanceCriteria: null
      }
      : issue;

    if (!issueForCoaching) return;

    setLoadingCoaching(true);
    setCoachingError(false);

    try {
      const response = await supabase.functions.invoke('bdd-coaching', {
        body: {
          bddContent,
          issue: {
            key: issueForCoaching.key,
            summary: issueForCoaching.summary,
            description: issueForCoaching.description,
            acceptanceCriteria: issueForCoaching.acceptanceCriteria
          }
        }
      });

      if (response.error) {
        console.error('Coaching error:', response.error);
        setCoachingError(true);
        return;
      }

      if (response.data?.coaching) {
        setCoachingData(response.data.coaching);
      } else {
        console.warn('No coaching data in response');
        setCoachingError(true);
      }
    } catch (error: any) {
      console.error('Error fetching coaching data:', error);
      setCoachingError(true);
    } finally {
      setLoadingCoaching(false);
    }
  };

  const handleCopy = async () => {
    const content = bddContent || demoArtifact?.content;
    if (content) {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: 'Copiado!', description: 'BDD copiado para a área de transferência' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveToHistory = async () => {
    if (!bddContent || !user) return;

    // Validate based on input mode
    if (inputMode === 'jira' && !issue) return;
    if (inputMode === 'manual' && !manualTitle.trim()) return;

    setSavingHistory(true);
    try {
      const ticketKey = inputMode === 'manual'
        ? `M-${manualTitle.substring(0, 30).replace(/\s+/g, '-').toUpperCase()}`
        : issue!.key;

      const ticketSummary = inputMode === 'manual' ? manualTitle : issue!.summary;

      const inputData = inputMode === 'manual'
        ? {
          inputMode: 'manual',
          manualTitle,
          manualContent,
          usedKnowledgeBase: useKnowledgeBase,
          usedProjectNotes: useProjectNotes && !!selectedProject
        }
        : {
          inputMode: 'jira',
          description: issue!.description,
          acceptanceCriteria: issue!.acceptanceCriteria,
          issueType: issue!.issueType,
          usedKnowledgeBase: useKnowledgeBase,
          usedProjectNotes: useProjectNotes && !!selectedProject
        };

      const { error } = await supabase.from('qa_artifacts').insert({
        user_id: user.id,
        artifact_type: 'bdd',
        ticket_key: ticketKey,
        ticket_summary: ticketSummary,
        output_content: bddContent,
        jira_connection_id: inputMode === 'jira' ? selectedConnection : null,
        input_data: JSON.parse(JSON.stringify(inputData))
      });

      if (error) throw error;
      toast({ title: 'Salvo no histórico!', description: 'BDD salvo com sucesso' });
    } catch (error: any) {
      console.error('Error saving to history:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSavingHistory(false);
    }
  };

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

  // Demo mode rendering
  if (demoTicket && demoArtifact) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gerador de BDD</h1>
            <p className="text-muted-foreground text-sm">Exemplo do Modo Demo</p>
          </div>
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="w-3 h-3 mr-1" />
            Demo
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="outline" className="mb-2 font-mono">{demoTicket.key}</Badge>
                <CardTitle className="text-lg">{demoTicket.summary}</CardTitle>
                <CardDescription className="mt-2">{demoTicket.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Critérios de Aceitação:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {demoTicket.acceptanceCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">BDD Gerado</CardTitle>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {demoArtifact.content}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main BDD Generator with Jira integration
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-info" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gerador de BDD</h1>
          <p className="text-muted-foreground text-sm">Gere cenários Gherkin a partir de tickets Jira ou entrada manual</p>
        </div>
      </div>

      {/* Input Mode Selector */}
      <InputModeSelector value={inputMode} onChange={(mode) => {
        setInputMode(mode);
        // Clear generated content when switching modes
        setBddContent('');
        setCoachingData(null);
      }} />

      {/* Jira Search Form - only visible in jira mode */}
      {inputMode === 'jira' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar Ticket</CardTitle>
            <CardDescription>Selecione a conexão Jira e informe a chave do ticket</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Conexão Jira</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map(conn => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name} {conn.is_default && '(Padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave do Ticket</Label>
                <Input
                  placeholder="Ex: PROJ-123"
                  value={issueKey}
                  onChange={(e) => setIssueKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchIssue()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleFetchIssue} disabled={loadingIssue || isValidating || !selectedConnection}>
                  {loadingIssue || isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Buscar
                </Button>
              </div>
            </div>

            {connections.length === 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Nenhuma conexão Jira configurada. <a href="/connections" className="text-primary hover:underline">Configure uma conexão</a> para começar.
              </div>
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
          titlePlaceholder="Ex: Login com autenticação OAuth"
          contentPlaceholder="Cole aqui a descrição da funcionalidade, critérios de aceite, regras de negócio ou qualquer informação relevante para gerar os cenários BDD..."
          contentLabel="Descrição / Critérios de Aceite"
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

      {/* Coaching Mode Toggle - always visible before generation */}
      <CoachingToggle
        enabled={coachingMode}
        onToggle={setCoachingMode}
      />

      {/* Issue Details - only visible in jira mode when issue is loaded */}
      {inputMode === 'jira' && issue && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{issue.key}</Badge>
                  {issue.issueType && <Badge variant="secondary">{issue.issueType}</Badge>}
                  {issue.priority && <Badge variant="outline">{issue.priority}</Badge>}
                </div>
                <CardTitle className="text-lg">{issue.summary}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {issue.description && (
              <div>
                <h4 className="text-sm font-medium mb-2">Descrição:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.description}</p>
              </div>
            )}

            {issue.acceptanceCriteria && (
              <div>
                <h4 className="text-sm font-medium mb-2">Critérios de Aceite:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{issue.acceptanceCriteria}</p>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleGenerateBdd} disabled={loadingBdd}>
                {loadingBdd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Gerar BDD
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Button for Manual Mode */}
      {inputMode === 'manual' && manualTitle.trim() && manualContent.trim() && (
        <div className="flex justify-end">
          <Button onClick={handleGenerateBdd} disabled={loadingBdd}>
            {loadingBdd ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Gerar BDD
          </Button>
        </div>
      )}


      {/* Generated BDD with Tabs */}
      {bddContent && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${coachingMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="bdd">BDD Gerado</TabsTrigger>
            {coachingMode && (
              <TabsTrigger value="aprendizado" className="relative">
                Aprendizado
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="bdd" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Cenários BDD</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSaveToHistory} disabled={savingHistory}>
                      {savingHistory ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Salvar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copiado' : 'Copiar'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={bddContent} />
              </CardContent>
            </Card>
          </TabsContent>

          {coachingMode && (
            <TabsContent value="aprendizado" className="mt-4">
              <CoachingTab
                coachingData={coachingData}
                isLoading={loadingCoaching}
                hasError={coachingError}
                onRetry={() => bddContent && fetchCoachingData(bddContent)}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
