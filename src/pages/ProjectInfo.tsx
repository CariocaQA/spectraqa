import { useState, useEffect, useCallback } from 'react';
import { FolderKanban, Plus, Pencil, Trash2, Save, Loader2, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjects, Project } from '@/hooks/useProjects';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessDenied } from '@/components/AccessDenied';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

export default function ProjectInfo() {
  const { canAccess, isBlocked, isTrialExpired, loading: accessLoading } = useAccessControl();
  const {
    projects,
    loading,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    createProject,
    updateProject,
    deleteProject
  } = useProjects();
  const { toast } = useToast();

  const [notes, setNotes] = useState('');
  const [jiraKeys, setJiraKeys] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // Dialogs
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [renameValue, setRenameValue] = useState('');

  // Sync local state with selected project
  useEffect(() => {
    if (selectedProject) {
      setNotes(selectedProject.notes || '');
      setJiraKeys((selectedProject.jira_project_keys || []).join(', '));
      setSaveStatus('idle');
    }
  }, [selectedProject?.id]);

  // Debounced auto-save
  const debouncedNotes = useDebounce(notes, 1500);

  useEffect(() => {
    if (!selectedProject || debouncedNotes === selectedProject.notes) return;

    const saveNotes = async () => {
      setSaveStatus('saving');
      const success = await updateProject(selectedProject.id, { notes: debouncedNotes });
      setSaveStatus(success ? 'saved' : 'idle');
      if (success) {
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    };

    saveNotes();
  }, [debouncedNotes, selectedProject?.id]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    const project = await createProject(newProjectName.trim());
    if (project) {
      setSelectedProjectId(project.id);
      setNewProjectName('');
      setShowNewDialog(false);
    }
  };

  const handleRenameProject = async () => {
    if (!selectedProject || !renameValue.trim()) return;

    const success = await updateProject(selectedProject.id, { name: renameValue.trim() });
    if (success) {
      toast({ title: 'Projeto renomeado' });
      setShowRenameDialog(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    await deleteProject(selectedProject.id);
    setShowDeleteDialog(false);
  };

  const handleSaveJiraKeys = async () => {
    if (!selectedProject) return;

    const keys = jiraKeys
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(k => k.length > 0);

    const success = await updateProject(selectedProject.id, { jira_project_keys: keys });
    if (success) {
      toast({ title: 'Chaves Jira atualizadas' });
    }
  };

  if (accessLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied isBlocked={isBlocked} isTrialExpired={isTrialExpired} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            Informações do Projeto
          </h1>
          <p className="text-muted-foreground mt-1">
            Mantenha notas e contexto sobre seus projetos para enriquecer as sugestões de QA
          </p>
        </div>
        <Button variant="outline" onClick={() => setShowHelpDialog(true)}>
          <HelpCircle className="w-4 h-4 mr-2" />
          Ajuda: como usar
        </Button>
      </div>

      {/* Project Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecionar Projeto</CardTitle>
          <CardDescription>
            Escolha um projeto existente ou crie um novo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={selectedProjectId || ''}
                onValueChange={(value) => setSelectedProjectId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>

            {selectedProject && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRenameValue(selectedProject.name);
                    setShowRenameDialog(true);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Renomear
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </>
            )}
          </div>

          {projects.length === 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center text-muted-foreground">
              Nenhum projeto cadastrado. Crie seu primeiro projeto para começar.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Notes */}
      {selectedProject && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    Informações do projeto: {selectedProject.name}
                  </CardTitle>
                  <CardDescription>
                    Registre regras de negócio, decisões, contexto e qualquer informação relevante
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Salvo
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Descreva aqui as regras de negócio, integrações, decisões técnicas, riscos conhecidos e qualquer contexto importante do projeto..."
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chaves de Projeto Jira (opcional)</CardTitle>
              <CardDescription>
                Associe chaves de projeto Jira para auto-seleção futura (ex: CBILL, PORTAL)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  value={jiraKeys}
                  onChange={(e) => setJiraKeys(e.target.value.toUpperCase())}
                  placeholder="PROJ1, PROJ2, PROJ3"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleSaveJiraKeys}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* New Project Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Projeto</DialogTitle>
            <DialogDescription>
              Dê um nome para o projeto. Você poderá adicionar notas depois.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="project-name">Nome do Projeto</Label>
            <Input
              id="project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Ex: Core Billing, Portal Cliente..."
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Criar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Projeto</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-project">Novo Nome</Label>
            <Input
              id="rename-project"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-2"
              onKeyDown={(e) => e.key === 'Enter' && handleRenameProject()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameProject} disabled={!renameValue.trim()}>
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O projeto "{selectedProject?.name}" e todas as suas notas serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Como usar as Informações do Projeto</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Este espaço é o <strong className="text-foreground">bloco de notas do seu projeto</strong> dentro do SpectraQA.
                Aqui você registra tudo o que não cabe (ou não aparece bem) em um único card do Jira,
                mas que é fundamental para entender a aplicação:
              </p>

              <ul className="list-disc pl-6 space-y-1">
                <li>visão geral do sistema</li>
                <li>regras de negócio importantes</li>
                <li>fluxos críticos (ex.: checkout, pagamento, login, cadastro)</li>
                <li>integrações com outros serviços</li>
                <li>decisões técnicas e restrições conhecidas</li>
                <li>riscos recorrentes e problemas históricos</li>
              </ul>

              <p>
                <strong className="text-foreground">Quanto melhor você alimentar este bloco, mais inteligente e contextualizado
                  o SpectraQA ficará para esse projeto.</strong>
              </p>

              <p>
                Quando você marcar a opção <em>"Usar Informações do Projeto"</em> nas telas de
                <strong className="text-foreground"> Sugestões por Jira</strong> e <strong className="text-foreground">Gerador de BDD</strong>,
                o SpectraQA vai combinar:
              </p>

              <ul className="list-disc pl-6 space-y-1">
                <li>O conteúdo do card do Jira</li>
                <li>As Informações do Projeto</li>
                <li>(Opcional) A base de conhecimento global</li>
              </ul>

              <p>
                para sugerir cenários de teste, riscos, estratégias e BDDs mais alinhados
                com a realidade da sua aplicação.
              </p>

              <p>
                Use este espaço como se fosse a <strong className="text-foreground">"memória viva" do projeto</strong>:
                volte aqui sempre que aprender algo novo, corrigir uma regra, mudar um fluxo ou descobrir um risco.
                Quanto mais atualizadas estiverem as Informações do Projeto, mais úteis e precisas serão as
                sugestões que o SpectraQA vai gerar para você.
              </p>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>
              Ok, entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
