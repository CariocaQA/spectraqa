import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  name: string;
  jira_project_keys: string[] | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('project_contexts')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      // Type assertion since we know the shape matches
      setProjects((data || []) as unknown as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (name: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('project_contexts')
        .insert({ user_id: user.id, name, notes: '' })
        .select()
        .single();
      
      if (error) throw error;
      
      const newProject = data as unknown as Project;
      setProjects(prev => [...prev, newProject].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: 'Projeto criado', description: name });
      return newProject;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({ title: 'Erro ao criar projeto', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, 'name' | 'notes' | 'jira_project_keys'>>) => {
    try {
      const { error } = await supabase
        .from('project_contexts')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      return true;
    } catch (error: any) {
      console.error('Error updating project:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_contexts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
      toast({ title: 'Projeto excluído' });
      return true;
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return {
    projects,
    loading,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}
