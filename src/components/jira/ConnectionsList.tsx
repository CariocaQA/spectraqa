import { Link2, Trash2, RefreshCw, CheckCircle, AlertCircle, Loader2, Star, RotateCcw } from 'lucide-react';
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Connection {
  id: string;
  name: string;
  connection_type: string;
  base_url: string;
  email: string | null;
  status: string;
  is_default: boolean;
  created_at: string;
  token_expires_at?: string | null;
  updated_at?: string | null;
}

interface ConnectionsListProps {
  connections: Connection[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onSetDefault: (id: string) => void;
  onReconnectOAuth?: (id: string) => void;
  testingId: string | null;
  reconnectingId?: string | null;
}

export function ConnectionsList({ 
  connections, 
  isLoading, 
  onDelete, 
  onTest,
  onSetDefault,
  onReconnectOAuth,
  testingId,
  reconnectingId 
}: ConnectionsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Link2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma conexão</h3>
          <p className="text-sm text-muted-foreground">
            Configure uma conexão com Jira para buscar tickets e gerar sugestões de QA.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expirado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {connections.map((conn) => (
        <Card key={conn.id} className="hover:border-primary/30 transition-colors">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium truncate">{conn.name}</h4>
                  {conn.is_default && (
                    <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                      <Star className="w-3 h-3 mr-1" />
                      Padrão
                    </Badge>
                  )}
                  {getStatusBadge(conn.status)}
                </div>
                
                <p className="text-sm text-muted-foreground truncate mb-1">
                  {conn.base_url}
                </p>
                
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {conn.connection_type === 'server' ? 'Server/DC' : 'Cloud'}
                  </span>
                  {conn.email && (
                    <>
                      <span>•</span>
                      <span>{conn.email}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>
                    {format(new Date(conn.created_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  {conn.connection_type === 'cloud' && conn.token_expires_at && (
                    <>
                      <span>•</span>
                      <span className={new Date(conn.token_expires_at) < new Date() ? 'text-yellow-400' : 'text-green-400'}>
                        Token: {new Date(conn.token_expires_at) < new Date() 
                          ? 'expirado' 
                          : `válido até ${format(new Date(conn.token_expires_at), "dd/MM HH:mm", { locale: ptBR })}`
                        }
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {!conn.is_default && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault(conn.id)}
                    title="Definir como padrão"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}

                {/* Reconnect OAuth button for Cloud connections with expired/error status */}
                {conn.connection_type === 'cloud' && (conn.status === 'expired' || conn.status === 'error') && onReconnectOAuth && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onReconnectOAuth(conn.id)}
                    disabled={reconnectingId === conn.id}
                    title="Reconectar OAuth"
                    className="bg-primary hover:bg-primary/90"
                  >
                    {reconnectingId === conn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reconectar
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTest(conn.id)}
                  disabled={testingId === conn.id}
                  title="Testar conexão"
                >
                  {testingId === conn.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover conexão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja remover a conexão "{conn.name}"? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(conn.id)}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
