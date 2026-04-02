import { useState, useEffect, useCallback } from 'react';
import { Server, Cloud, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConnectionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ConnectionForm({ onSuccess, onCancel }: ConnectionFormProps) {
  const [connectionType, setConnectionType] = useState<'server' | 'cloud'>('server');
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [email, setEmail] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cloudName, setCloudName] = useState('');
  const [cloudIsDefault, setCloudIsDefault] = useState(false);
  const [oauthPopup, setOauthPopup] = useState<Window | null>(null);
  const { toast } = useToast();

  // Handle OAuth popup message
  const handleOAuthMessage = useCallback((event: MessageEvent) => {
    // Validate message structure
    if (!event.data || typeof event.data !== 'object') return;
    if (!('success' in event.data)) return;

    console.log('OAuth message received:', event.data);

    // Close popup if still open
    if (oauthPopup && !oauthPopup.closed) {
      oauthPopup.close();
    }
    setOauthPopup(null);
    setIsLoading(false);

    if (event.data.success) {
      toast({
        title: 'Conexão criada!',
        description: `Conectado ao ${event.data.jiraSite || 'Jira Cloud'}`,
      });
      onSuccess();
    } else {
      toast({
        title: 'Erro na conexão',
        description: event.data.error || 'Falha na autenticação OAuth',
        variant: 'destructive',
      });
    }
  }, [oauthPopup, toast, onSuccess]);

  // Register message listener
  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

  // Monitor popup state
  useEffect(() => {
    if (!oauthPopup) return;

    const interval = setInterval(() => {
      if (oauthPopup.closed) {
        setIsLoading(false);
        setOauthPopup(null);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [oauthPopup]);

  const handleCloudConnect = async () => {
    if (!cloudName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Dê um nome para esta conexão.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Get current origin for callback redirect
      const currentOrigin = window.location.origin;

      // Get OAuth URL from backend
      const response = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-oauth-start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connectionName: cloudName.trim(),
            isDefault: cloudIsDefault,
            frontendUrl: currentOrigin, // Pass current origin for correct redirect
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar OAuth');
      }

      // Open OAuth in popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'jira-oauth',
        `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        throw new Error('Popup bloqueado! Permita popups para este site.');
      }

      setOauthPopup(popup);
      popup.focus();

    } catch (error) {
      console.error('OAuth start error:', error);
      toast({
        title: 'Erro ao conectar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !baseUrl.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e a URL do Jira.',
        variant: 'destructive',
      });
      return;
    }

    if (connectionType === 'server' && (!email.trim() || !apiToken.trim())) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o email e o API Token.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Save connection
      const saveResponse = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-save-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            connectionType,
            baseUrl: baseUrl.trim(),
            email: email.trim(),
            apiToken: apiToken.trim(),
            isDefault,
          }),
        }
      );

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.error || 'Erro ao salvar conexão');
      }

      // Test connection
      const testResponse = await fetch(
        `https://eswpduazihbpsohnuwtt.supabase.co/functions/v1/jira-test-connection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            connectionId: saveData.connection.id,
          }),
        }
      );

      const testData = await testResponse.json();

      if (!testData.success) {
        toast({
          title: 'Conexão salva com erro',
          description: testData.error || 'Não foi possível validar a conexão. Verifique as credenciais.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Conexão criada!',
          description: `Conectado como ${testData.user?.displayName || 'usuário'}`,
        });
      }

      onSuccess();

    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: 'Erro ao criar conexão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={connectionType} onValueChange={(v) => setConnectionType(v as 'server' | 'cloud')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="server" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Server / Data Center
          </TabsTrigger>
          <TabsTrigger value="cloud" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Cloud (OAuth)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Jira Server / Data Center</CardTitle>
              <CardDescription className="text-xs">
                Use seu email e um API Token gerado nas configurações do Jira.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da conexão *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Jira Produção"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseUrl">URL do Jira *</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://jira.empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@empresa.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token *</Label>
                <div className="relative">
                  <Input
                    id="apiToken"
                    type={showToken ? 'text' : 'password'}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Cole seu API Token aqui"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gere um token em: Jira → Perfil → Segurança → API Tokens
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="isDefault"
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                  Definir como conexão padrão
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Jira Cloud (OAuth 2.0)</CardTitle>
              <CardDescription className="text-xs">
                Conecte-se ao Jira Cloud usando autenticação segura via Atlassian.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cloudName">Nome da conexão *</Label>
                <Input
                  id="cloudName"
                  value={cloudName}
                  onChange={(e) => setCloudName(e.target.value)}
                  placeholder="Ex: Minha Empresa Cloud"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="cloudIsDefault"
                  checked={cloudIsDefault}
                  onCheckedChange={setCloudIsDefault}
                />
                <Label htmlFor="cloudIsDefault" className="text-sm cursor-pointer">
                  Definir como conexão padrão
                </Label>
              </div>

              <div className="pt-4">
                <Button
                  type="button"
                  onClick={handleCloudConnect}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aguardando autorização...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Conectar via Atlassian
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Uma janela será aberta para autorização na Atlassian
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {connectionType === 'server' && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Conexão'
            )}
          </Button>
        </div>
      )}

      {connectionType === 'cloud' && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
        </div>
      )}
    </form>
  );
}
