import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Feedback, FeedbackGroup, FeedbackType, FeedbackArea, FeedbackStatus } from '@/types/feedback';
import { toast } from 'sonner';

interface UseFeedbackFilters {
  tipo?: FeedbackType;
  area?: FeedbackArea;
  status?: FeedbackStatus;
  ordenacao: 'recentes' | 'votados';
}

interface DbFeedback {
  id: string;
  tipo: 'bug' | 'melhoria' | 'nova_funcionalidade';
  area: string;
  titulo: string;
  descricao: string;
  status: 'novo' | 'em_analise' | 'planejado' | 'em_andamento' | 'concluido' | 'mesclado';
  votos: number;
  criado_por: string;
  criado_por_nome: string | null;
  criado_em: string;
  mesclado_em_id: string | null;
}

interface DbVote {
  feedback_id: string;
  user_id: string;
}

// Transform database feedback to app feedback
function transformFeedback(dbFeedback: DbFeedback, votes: DbVote[]): Feedback {
  return {
    id: dbFeedback.id,
    tipo: dbFeedback.tipo as FeedbackType,
    area: dbFeedback.area as FeedbackArea,
    titulo: dbFeedback.titulo,
    descricao: dbFeedback.descricao,
    status: dbFeedback.status as FeedbackStatus,
    votos: dbFeedback.votos,
    votedBy: votes.filter(v => v.feedback_id === dbFeedback.id).map(v => v.user_id),
    criadoPor: dbFeedback.criado_por_nome || 'Usuário',
    criadoEm: new Date(dbFeedback.criado_em),
    mescladoEm: dbFeedback.mesclado_em_id || undefined,
  };
}

export function useFeedback() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UseFeedbackFilters>({ ordenacao: 'recentes' });
  const [groups, setGroups] = useState<FeedbackGroup[]>([]);

  // Fetch all feedbacks
  const { data: feedbacksData = [], isLoading: isLoadingFeedbacks } = useQuery({
    queryKey: ['feedbacks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data as DbFeedback[];
    },
  });

  // Fetch all votes
  const { data: votesData = [] } = useQuery({
    queryKey: ['feedback_votes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_votes')
        .select('feedback_id, user_id');

      if (error) throw error;
      return data as DbVote[];
    },
  });

  // Transform to app format
  const allFeedbacks = useMemo(() => {
    return feedbacksData.map(f => transformFeedback(f, votesData));
  }, [feedbacksData, votesData]);

  // Apply filters
  const filteredFeedbacks = useMemo(() => {
    let result = [...allFeedbacks];

    if (filters.tipo) {
      result = result.filter(f => f.tipo === filters.tipo);
    }
    if (filters.area) {
      result = result.filter(f => f.area === filters.area);
    }
    if (filters.status) {
      result = result.filter(f => f.status === filters.status);
    }

    if (filters.ordenacao === 'recentes') {
      result.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } else {
      result.sort((a, b) => b.votos - a.votos);
    }

    return result;
  }, [allFeedbacks, filters]);

  // Top 10 mais votados (para painel admin)
  const topVoted = useMemo(() => {
    return [...allFeedbacks]
      .filter(f => f.status !== 'mesclado')
      .sort((a, b) => b.votos - a.votos)
      .slice(0, 10);
  }, [allFeedbacks]);

  // Add feedback mutation
  const addFeedbackMutation = useMutation({
    mutationFn: async (params: { 
      feedback: Omit<Feedback, 'id' | 'votos' | 'criadoEm' | 'status' | 'votedBy' | 'criadoPor'>, 
      userId: string,
      userName: string 
    }) => {
      const { feedback, userId, userName } = params;
      
      // Insert feedback
      const { data: newFeedback, error: feedbackError } = await supabase
        .from('feedbacks')
        .insert({
          tipo: feedback.tipo,
          area: feedback.area,
          titulo: feedback.titulo,
          descricao: feedback.descricao,
          criado_por: userId,
          criado_por_nome: userName,
          votos: 1, // Creator votes automatically
        })
        .select()
        .single();

      if (feedbackError) throw feedbackError;

      // Insert creator's vote
      const { error: voteError } = await supabase
        .from('feedback_votes')
        .insert({
          feedback_id: newFeedback.id,
          user_id: userId,
        });

      if (voteError) throw voteError;

      return newFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback_votes'] });
      toast.success('Feedback criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error adding feedback:', error);
      toast.error('Erro ao criar feedback');
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ feedbackId, userId, hasVoted }: { feedbackId: string; userId: string; hasVoted: boolean }) => {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from('feedback_votes')
          .delete()
          .eq('feedback_id', feedbackId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from('feedback_votes')
          .insert({ feedback_id: feedbackId, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback_votes'] });
    },
    onError: (error) => {
      console.error('Error voting:', error);
      toast.error('Erro ao votar');
    },
  });

  // Update status mutation (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      toast.success('Status atualizado');
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  // Toggle vote
  const vote = useCallback((id: string, userId: string) => {
    const hasVoted = votesData.some(v => v.feedback_id === id && v.user_id === userId);
    voteMutation.mutate({ feedbackId: id, userId, hasVoted });
  }, [votesData, voteMutation]);

  // Check if user voted
  const hasUserVoted = useCallback((feedbackId: string, userId: string): boolean => {
    return votesData.some(v => v.feedback_id === feedbackId && v.user_id === userId);
  }, [votesData]);

  // Add feedback
  const addFeedback = useCallback((
    feedback: Omit<Feedback, 'id' | 'votos' | 'criadoEm' | 'status' | 'votedBy'>, 
    userId: string
  ) => {
    addFeedbackMutation.mutate({ 
      feedback: { 
        tipo: feedback.tipo, 
        area: feedback.area, 
        titulo: feedback.titulo, 
        descricao: feedback.descricao 
      }, 
      userId, 
      userName: feedback.criadoPor 
    });
  }, [addFeedbackMutation]);

  // Update status (admin)
  const updateFeedbackStatus = useCallback((id: string, newStatus: FeedbackStatus) => {
    updateStatusMutation.mutate({ id, status: newStatus });
  }, [updateStatusMutation]);

  // Find similar (simple text search)
  const findSimilar = useCallback((titulo: string, descricao: string): Feedback[] => {
    if (titulo.length < 3 && descricao.length < 10) return [];

    const searchTerms = [...titulo.toLowerCase().split(' '), ...descricao.toLowerCase().split(' ')]
      .filter(term => term.length > 2);

    const scored = allFeedbacks
      .filter(f => f.status !== 'mesclado')
      .map(f => {
        const feedbackTerms = [
          ...f.titulo.toLowerCase().split(' '),
          ...f.descricao.toLowerCase().split(' '),
        ];
        const matchCount = searchTerms.filter(term => 
          feedbackTerms.some(ft => ft.includes(term) || term.includes(ft))
        ).length;
        return { feedback: f, score: matchCount };
      })
      .filter(item => item.score > 1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return scored.map(s => s.feedback);
  }, [allFeedbacks]);

  // Grouping analysis (local for now - could be AI-powered later)
  const runGroupingAnalysis = useCallback(() => {
    const openFeedbacks = allFeedbacks.filter(f => 
      ['novo', 'em_analise'].includes(f.status)
    );

    const newGroups: FeedbackGroup[] = [];
    const processed = new Set<string>();

    openFeedbacks.forEach(f1 => {
      if (processed.has(f1.id)) return;

      const similar = openFeedbacks.filter(f2 => {
        if (f1.id === f2.id || processed.has(f2.id)) return false;
        
        const sameArea = f1.area === f2.area;
        const titleWords1 = f1.titulo.toLowerCase().split(' ').filter(w => w.length > 3);
        const titleWords2 = f2.titulo.toLowerCase().split(' ').filter(w => w.length > 3);
        const commonWords = titleWords1.filter(w => titleWords2.includes(w)).length;
        
        return sameArea && commonWords >= 1;
      });

      if (similar.length > 0) {
        const groupIds = [f1.id, ...similar.map(s => s.id)];
        groupIds.forEach(id => processed.add(id));
        
        newGroups.push({
          id: `g-${Date.now()}-${f1.id}`,
          feedbackIds: groupIds,
          similarity: similar.length > 1 ? 'alta' : 'media',
          ignored: false,
        });
      }
    });

    const existingNotIgnored = groups.filter(g => !g.ignored);
    const mergedGroups = [...existingNotIgnored];
    
    newGroups.forEach(ng => {
      const exists = mergedGroups.some(eg => 
        eg.feedbackIds.sort().join(',') === ng.feedbackIds.sort().join(',')
      );
      if (!exists) {
        mergedGroups.push(ng);
      }
    });

    setGroups(mergedGroups);
    return mergedGroups.filter(g => !g.ignored);
  }, [allFeedbacks, groups]);

  // Merge feedbacks (admin)
  const mergeFeedbacksMutation = useMutation({
    mutationFn: async ({ groupId, primaryId }: { groupId: string; primaryId: string }) => {
      const group = groups.find(g => g.id === groupId);
      if (!group) throw new Error('Group not found');

      const secondaryIds = group.feedbackIds.filter(id => id !== primaryId);
      
      // Update secondary feedbacks to merged status
      for (const id of secondaryIds) {
        const { error } = await supabase
          .from('feedbacks')
          .update({ status: 'mesclado', mesclado_em_id: primaryId })
          .eq('id', id);
        if (error) throw error;
      }

      return { groupId, primaryId };
    },
    onSuccess: ({ groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success('Feedbacks mesclados com sucesso');
    },
    onError: (error) => {
      console.error('Error merging feedbacks:', error);
      toast.error('Erro ao mesclar feedbacks');
    },
  });

  const mergeFeedbacks = useCallback((groupId: string, primaryId: string) => {
    mergeFeedbacksMutation.mutate({ groupId, primaryId });
  }, [mergeFeedbacksMutation]);

  const ignoreGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.map(g => 
      g.id === groupId ? { ...g, ignored: true } : g
    ));
  }, []);

  const getFeedbackById = useCallback((id: string) => {
    return allFeedbacks.find(f => f.id === id);
  }, [allFeedbacks]);

  const activeGroups = useMemo(() => 
    groups.filter(g => !g.ignored), 
    [groups]
  );

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete associated votes (cascade should handle, but be explicit)
      const { error: votesError } = await supabase
        .from('feedback_votes')
        .delete()
        .eq('feedback_id', id);
      
      if (votesError) throw votesError;

      // Then delete the feedback
      const { error } = await supabase
        .from('feedbacks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({ queryKey: ['feedback_votes'] });
      toast.success('Feedback excluído com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting feedback:', error);
      toast.error('Erro ao excluir feedback');
    },
  });

  const deleteFeedback = useCallback((id: string) => {
    deleteFeedbackMutation.mutate(id);
  }, [deleteFeedbackMutation]);

  return {
    feedbacks: filteredFeedbacks,
    allFeedbacks,
    topVoted,
    filters,
    setFilters,
    vote,
    hasUserVoted,
    addFeedback,
    updateFeedbackStatus,
    findSimilar,
    runGroupingAnalysis,
    mergeFeedbacks,
    ignoreGroup,
    getFeedbackById,
    deleteFeedback,
    groups: activeGroups,
    isLoading: isLoadingFeedbacks,
  };
}
