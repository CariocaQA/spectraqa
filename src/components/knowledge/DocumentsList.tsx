import { FileText, File, Trash2, RefreshCw, AlertCircle, CheckCircle, Loader2, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Document {
  id: string;
  title: string;
  source_type: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at?: string;
  error_message?: string;
}

interface DocumentsListProps {
  documents: Document[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}

export function DocumentsList({ documents, isLoading, onDelete, onRetry }: DocumentsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhum documento</h3>
          <p className="text-sm text-muted-foreground">
            Faça upload de PDFs ou arquivos de texto para construir a base de conhecimento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getProcessingDuration = (createdAt: string) => {
    const created = new Date(createdAt);
    return formatDistanceToNow(created, { locale: ptBR, addSuffix: false });
  };

  const isStuck = (doc: Document) => {
    if (doc.status !== 'processing') return false;
    const created = new Date(doc.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes > 5; // Consider stuck after 5 minutes
  };

  const getStatusBadge = (doc: Document) => {
    const stuck = isStuck(doc);
    
    switch (doc.status) {
      case 'ready':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pronto
          </Badge>
        );
      case 'processing':
        if (stuck) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    <Clock className="w-3 h-3 mr-1" />
                    Travado há {getProcessingDuration(doc.created_at)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>O processamento pode ter falhado. Clique em reprocessar.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Processando
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Processando há {getProcessingDuration(doc.created_at)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">{doc.status}</Badge>;
    }
  };

  const getFileIcon = (sourceType: string) => {
    if (sourceType === 'pdf') {
      return <FileText className="w-10 h-10 text-red-500" />;
    }
    return <File className="w-10 h-10 text-blue-500" />;
  };

  return (
    <div className="space-y-3">
      {documents.map((doc) => {
        const stuck = isStuck(doc);
        
        return (
          <Card key={doc.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="py-4">
              <div className="flex items-start gap-4">
                {getFileIcon(doc.source_type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{doc.title}</h4>
                    {getStatusBadge(doc)}
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Adicionado em {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  
                  {doc.status === 'failed' && doc.error_message && (
                    <p className="text-xs text-destructive mt-1">{doc.error_message}</p>
                  )}
                  
                  {stuck && (
                    <p className="text-xs text-orange-400 mt-1">
                      O processamento parece ter travado. Clique em reprocessar para tentar novamente.
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {(doc.status === 'failed' || stuck) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onRetry(doc.id)}
                            title="Reprocessar documento"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reprocessar documento</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover documento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{doc.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(doc.id)}>
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
