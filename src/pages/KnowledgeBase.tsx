import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { AccessDenied } from '@/components/AccessDenied';
import { DocumentUpload } from '@/components/knowledge/DocumentUpload';
import { DocumentsList } from '@/components/knowledge/DocumentsList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Document {
  id: string;
  title: string;
  source_type: string;
  status: string;
  tags: string[];
  created_at: string;
  error_message?: string;
}

export default function KnowledgeBase() {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('qa_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Erro ao carregar documentos',
        description: 'Não foi possível carregar a lista de documentos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchDocuments();
    }
  }, [isAdmin, fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processingDocs = documents.filter(d => d.status === 'processing');
    if (processingDocs.length === 0) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('qa_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Documento removido' });
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o documento.',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('kb-retry-document', {
        body: { documentId: id },
      });

      if (error) {
        console.error('Retry error:', error);
        throw new Error(error.message || 'Erro ao reprocessar');
      }

      toast({ title: 'Reprocessando documento...' });
      fetchDocuments();
    } catch (error) {
      console.error('Error retrying:', error);
      toast({
        title: 'Erro ao reprocessar',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AccessDenied 
        title="Acesso Restrito"
        message="Apenas administradores podem gerenciar a base de conhecimento."
      />
    );
  }

  const stats = {
    total: documents.length,
    ready: documents.filter(d => d.status === 'ready').length,
    processing: documents.filter(d => d.status === 'processing').length,
    failed: documents.filter(d => d.status === 'failed').length,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Base de Conhecimento
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os documentos que alimentam o Consultor QA
          </p>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar documento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar documento</DialogTitle>
            </DialogHeader>
            <DocumentUpload onUploadComplete={() => {
              setIsUploadOpen(false);
              fetchDocuments();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.ready}</div>
          <div className="text-xs text-muted-foreground">Prontos</div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.processing}</div>
          <div className="text-xs text-muted-foreground">Processando</div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
          <div className="text-xs text-muted-foreground">Erros</div>
        </div>
      </div>

      {/* Documents List */}
      <DocumentsList
        documents={documents}
        isLoading={isLoading}
        onDelete={handleDelete}
        onRetry={handleRetry}
      />
    </div>
  );
}
