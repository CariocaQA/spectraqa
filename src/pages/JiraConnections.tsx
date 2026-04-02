import { useState, useEffect, useCallback } from 'react';
import { Link2, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionForm } from '@/components/jira/ConnectionForm';
import { ConnectionsList } from '@/components/jira/ConnectionsList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

const getOAuthErrorMessage = (error: string): string => {
  const messages: Record<string, string> = {
    'access_denied': 'Acesso negado. Você cancelou a autorização.',
    'missing_params': 'Parâmetros ausentes na resposta.',
    'invalid_state': 'Estado inválido. Tente novamente.',
    'token_exchange_failed': 'Falha na troca de tokens.',
    'resources_failed': 'Falha ao obter recursos do Jira.',
    'no_sites': 'Nenhum site Jira encontrado para sua conta.',
    'callback_failed': 'Falha no callback de autenticação.',
    'save_failed': 'Falha ao salvar conexão no banco de dados.',
    'missing_user': 'Usuário não identificado. Faça login novamente.',
  };
  return messages[error] || 'Erro desconhecido na autenticação.';
};

export default function JiraConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const [notifiedTokens, setNotifiedTokens] = useState<Set<string>>(new Set());
  const [refreshingTokens, setRefreshingTokens] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      // Usar função segura que retorna apenas conexões do próprio usuário
      const { data, error } = await supabase.rpc('get_my_jira_connections');

      if (error) throw error;
      
      // Ordenar por created_at desc
      const sorted = (data || []).sort((a: Connection, b: Connection) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setConnections(sorted);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: 'Erro ao carregar conexões',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Silent token refresh function
  const silentTokenRefresh = useCallback(async (connectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      console.log('Silent token refresh for:', connectionId);

      const response = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId }),
        }
      );

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Silent token refresh failed:', error);
      return false;
    }
  }, []);

  // Auto-refresh tokens expiring soon or already expired (every 5 minutes)
  useEffect(() => {
    const autoRefreshTokens = async () => {
      const FIFTEEN_MINUTES = 15 * 60 * 1000; // Refresh 15 min before expiry
      const now = new Date().getTime();

      for (const conn of connections) {
        if (
          conn.connection_type === 'cloud' &&
          conn.token_expires_at &&
          !refreshingTokens.has(conn.id)
        ) {
          const expiresAt = new Date(conn.token_expires_at).getTime();
          const timeUntilExpiry = expiresAt - now;

          // Auto-refresh if expiring within 15 minutes or already expired
          if (timeUntilExpiry <= FIFTEEN_MINUTES) {
            setRefreshingTokens((prev) => new Set(prev).add(conn.id));
            
            const success = await silentTokenRefresh(conn.id);
            
            if (success) {
              console.log('Token refreshed successfully for:', conn.name);
              // Only show toast if it was about to expire (not just proactive refresh)
              if (timeUntilExpiry <= 0) {
                toast({
                  title: 'Token renovado',
                  description: `A conexão "${conn.name}" foi renovada automaticamente.`,
                });
              }
              // Refresh list to show updated token expiry
              fetchConnections();
            } else if (timeUntilExpiry <= 0) {
              // Only notify if token is actually expired and refresh failed
              if (!notifiedTokens.has(conn.id)) {
                toast({
                  title: 'Token expirado',
                  description: `A conexão "${conn.name}" precisa ser reconectada manualmente.`,
                  variant: 'destructive',
                });
                setNotifiedTokens((prev) => new Set(prev).add(conn.id));
              }
            }

            // Remove from refreshing set after a delay to prevent rapid retries
            setTimeout(() => {
              setRefreshingTokens((prev) => {
                const newSet = new Set(prev);
                newSet.delete(conn.id);
                return newSet;
              });
            }, 60000); // Wait 1 minute before allowing retry
          }
        }
      }
    };

    // Check immediately after connections load and then every 5 minutes
    if (connections.length > 0 && !isLoading) {
      autoRefreshTokens();
    }
    
    const interval = setInterval(() => {
      if (connections.length > 0) {
        autoRefreshTokens();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [connections, isLoading, refreshingTokens, notifiedTokens, silentTokenRefresh, fetchConnections, toast]);

// Handle OAuth callback from URL params
  useEffect(() => {
    const oauthSuccess = searchParams.get('oauth');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      // If popup, notify parent and close immediately
      if (window.opener) {
        window.opener.postMessage({ success: false, error: oauthError }, '*');
        window.close();
        return;
      }
      toast({
        title: 'Erro na autenticação OAuth',
        description: getOAuthErrorMessage(oauthError),
        variant: 'destructive',
      });
      setSearchParams({});
    } else if (oauthSuccess === 'success') {
      // If popup, notify parent and close immediately
      if (window.opener) {
        window.opener.postMessage({ success: true }, '*');
        window.close();
        return;
      }
      // If not a popup (direct access), show toast and refresh
      toast({
        title: 'Conexão criada com sucesso!',
        description: 'Sua conexão com o Jira Cloud foi estabelecida.',
      });
      setSearchParams({});
      fetchConnections();
    }
  }, [searchParams, setSearchParams, toast, fetchConnections]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('jira_connections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Conexão removida' });
      fetchConnections();
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: 'Erro ao remover conexão',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ connectionId: id }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Conexão válida',
          description: `Conectado como ${data.user?.displayName || 'usuário'}`,
        });
      } else {
        toast({
          title: 'Erro na conexão',
          description: data.error || 'Não foi possível validar a conexão',
          variant: 'destructive',
        });
      }

      fetchConnections();
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: 'Erro ao testar conexão',
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('jira_connections')
        .update({ is_default: false })
        .neq('id', id);

      // Then set the new default
      const { error } = await supabase
        .from('jira_connections')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Conexão definida como padrão' });
      fetchConnections();
    } catch (error) {
      console.error('Error setting default:', error);
      toast({
        title: 'Erro ao definir padrão',
        variant: 'destructive',
      });
    }
  };

  const handleReconnectOAuth = async (id: string) => {
    setReconnectingId(id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Delete the old connection first
      const { error: deleteError } = await supabase
        .from('jira_connections')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Start new OAuth flow
      const oauthUrl = `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-oauth-start?userId=${session.user.id}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error('Error reconnecting OAuth:', error);
      toast({
        title: 'Erro ao reconectar',
        description: 'Não foi possível iniciar o processo de reconexão.',
        variant: 'destructive',
      });
      setReconnectingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Conexões Jira</h1>
            <p className="text-muted-foreground text-sm">Gerencie suas conexões com Jira</p>
          </div>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Conexão Jira</DialogTitle>
            </DialogHeader>
            <ConnectionForm 
              onSuccess={() => {
                setIsFormOpen(false);
                fetchConnections();
              }}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Connections List */}
      <ConnectionsList
        connections={connections}
        isLoading={isLoading}
        onDelete={handleDelete}
        onTest={handleTest}
        onSetDefault={handleSetDefault}
        onReconnectOAuth={handleReconnectOAuth}
        testingId={testingId}
        reconnectingId={reconnectingId}
      />

      {/* Info */}
      <div className="text-sm text-muted-foreground">
        <p className="mb-2">Tipos de conexão suportados:</p>
        <ul className="space-y-1">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span><strong>Jira Server/DC:</strong> Email + API Token</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span><strong>Jira Cloud:</strong> OAuth 2.0</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
