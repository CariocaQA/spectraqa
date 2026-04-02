import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, MessageSquarePlus, Layers, Loader2 } from 'lucide-react';
import { FeedbackCard } from '@/components/feedback/FeedbackCard';
import { FeedbackFilters } from '@/components/feedback/FeedbackFilters';
import { FeedbackDetailModal } from '@/components/feedback/FeedbackDetailModal';
import { NewFeedbackForm } from '@/components/feedback/NewFeedbackForm';
import { AdminGroupingPanel } from '@/components/feedback/AdminGroupingPanel';
import { useFeedback } from '@/hooks/useFeedback';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { Feedback } from '@/types/feedback';
import { toast } from 'sonner';

export default function CommunityFeedback() {
  const { isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const currentUserId = user?.id || 'anonymous';
  
  const {
    feedbacks,
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
    groups,
    isLoading,
  } = useFeedback();

  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isNewFormOpen, setIsNewFormOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const feedbackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Get creator IDs from feedbacks (the criado_por field stores the user ID now)
  const getCreatorId = useCallback((feedback: Feedback): string | undefined => {
    // Check allFeedbacks for the actual criado_por from DB
    const dbFeedback = allFeedbacks.find(f => f.id === feedback.id);
    // The first voter is typically the creator (auto-vote on creation)
    return feedback.votedBy[0];
  }, [allFeedbacks]);

  const canDeleteFeedback = useCallback((feedback: Feedback): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    // Check if user is the first voter (creator auto-votes)
    return feedback.votedBy[0] === currentUserId;
  }, [user, isAdmin, currentUserId]);

  const handleVote = (id: string) => {
    if (!user) {
      toast.error('Faça login para votar');
      return;
    }
    vote(id, currentUserId);
  };

  const handleDeleteFromCard = (id: string) => {
    setFeedbackToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (feedbackToDelete) {
      deleteFeedback(feedbackToDelete);
      setFeedbackToDelete(null);
    }
  };

  const scrollToFeedback = (id: string) => {
    const element = feedbackRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
  };

  const handleGoToPrimary = (primaryId: string) => {
    const primary = getFeedbackById(primaryId);
    if (primary) {
      setSelectedFeedback(null);
      setTimeout(() => scrollToFeedback(primaryId), 100);
    }
  };

  const renderFeedbackList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Carregando feedbacks...
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {feedbacks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum feedback encontrado com os filtros atuais.</p>
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <div key={feedback.id} ref={(el) => { feedbackRefs.current[feedback.id] = el; }}>
              <FeedbackCard 
                feedback={feedback} 
                currentUserId={currentUserId}
                canDelete={canDeleteFeedback(feedback)}
                onVote={handleVote} 
                onClick={setSelectedFeedback} 
                onGoToPrimary={handleGoToPrimary}
                onDelete={handleDeleteFromCard}
              />
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquarePlus className="h-6 w-6" />
              Feedback da Comunidade
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              Use este espaço para reportar bugs, sugerir melhorias e novas funcionalidades do SpectraQA. 
              Lemos tudo e usamos esse canal para priorizar o roadmap. Nem tudo será implementado, 
              mas sempre atualizamos o status dos itens aqui.
            </p>
          </div>
          <Button onClick={() => setIsNewFormOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Novo Feedback
          </Button>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="feedbacks">
            <TabsList>
              <TabsTrigger value="feedbacks">
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Feedbacks
              </TabsTrigger>
              <TabsTrigger value="triagem">
                <Layers className="h-4 w-4 mr-2" />
                Triagem (Admin)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feedbacks" className="space-y-4 mt-4">
              <FeedbackFilters filters={filters} onFiltersChange={setFilters} />
              {renderFeedbackList()}
            </TabsContent>

            <TabsContent value="triagem" className="mt-4">
              <AdminGroupingPanel 
                groups={groups} 
                allFeedbacks={allFeedbacks} 
                topVoted={topVoted}
                onRunAnalysis={runGroupingAnalysis} 
                onMerge={mergeFeedbacks} 
                onIgnoreGroup={ignoreGroup} 
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <FeedbackFilters filters={filters} onFiltersChange={setFilters} />
            {renderFeedbackList()}
          </div>
        )}
      </div>

      <FeedbackDetailModal 
        feedback={selectedFeedback} 
        open={!!selectedFeedback} 
        onOpenChange={(open) => !open && setSelectedFeedback(null)} 
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        canDelete={selectedFeedback ? canDeleteFeedback(selectedFeedback) : false}
        onVote={handleVote} 
        onGoToPrimary={handleGoToPrimary}
        onUpdateStatus={updateFeedbackStatus}
        onDelete={(id) => {
          deleteFeedback(id);
        }}
      />
      
      <NewFeedbackForm 
        open={isNewFormOpen} 
        onOpenChange={setIsNewFormOpen} 
        onSubmit={addFeedback} 
        onVote={handleVote} 
        findSimilar={findSimilar} 
      />

      {/* Delete Confirmation Dialog for Card */}
      <AlertDialog open={!!feedbackToDelete} onOpenChange={(open) => !open && setFeedbackToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir feedback?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O feedback e todos os votos associados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
