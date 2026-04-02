import { Layers, FileText, BookOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Project } from '@/hooks/useProjects';

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  useProjectNotes: boolean;
  onToggleProjectNotes: (value: boolean) => void;
  useKnowledgeBase: boolean;
  onToggleKnowledgeBase: (value: boolean) => void;
  loading?: boolean;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  useProjectNotes,
  onToggleProjectNotes,
  useKnowledgeBase,
  onToggleKnowledgeBase,
  loading = false,
}: ProjectSelectorProps) {
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  
  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Layers className="w-4 h-4 text-primary" />
        Fontes de Contexto
      </div>
      
      {/* Project Selection Row */}
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Projeto</Label>
          <Select 
            value={selectedProjectId || 'none'} 
            onValueChange={(value) => onSelectProject(value === 'none' ? null : value)}
            disabled={loading}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-end">
          <div className="flex items-center gap-2">
            <Switch
              id="use-project-notes"
              checked={useProjectNotes && !!selectedProjectId}
              onCheckedChange={onToggleProjectNotes}
              disabled={!selectedProjectId}
            />
            <Label 
              htmlFor="use-project-notes" 
              className="text-sm cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Usar Informações do Projeto
            </Label>
          </div>
        </div>
      </div>
      
      {/* Project Notes Preview */}
      {selectedProject && selectedProject.notes && useProjectNotes && (
        <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 max-h-20 overflow-hidden">
          <span className="font-medium">Preview: </span>
          {selectedProject.notes.substring(0, 150)}
          {selectedProject.notes.length > 150 && '...'}
        </div>
      )}
      
      {/* Knowledge Base Toggle */}
      <div className="pt-3 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Switch
            id="use-knowledge-base"
            checked={useKnowledgeBase}
            onCheckedChange={onToggleKnowledgeBase}
          />
          <Label 
            htmlFor="use-knowledge-base" 
            className="text-sm cursor-pointer flex items-center gap-1"
          >
            <BookOpen className="w-4 h-4" />
            Usar Base de Conhecimento
          </Label>
        </div>
      </div>
      
      {projects.length === 0 && (
        <div className="text-xs text-muted-foreground">
          <a href="/project-info" className="text-primary hover:underline">
            Crie um projeto
          </a>{' '}
          para adicionar contexto às suas sugestões.
        </div>
      )}
    </div>
  );
}
