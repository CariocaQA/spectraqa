import { useState, useEffect } from 'react';
import { Shield, Ban, CheckCircle, Clock, X, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  last_login_at: string | null;
  is_blocked: boolean | null;
  trial_expires_at: string | null;
  isAdmin?: boolean;
}

// Helper to get activity indicator based on last login
const getActivityIndicator = (lastLogin: string | null) => {
  if (!lastLogin) {
    return { color: 'text-destructive', label: '🔴', tooltip: 'Nunca acessou' };
  }

  const lastLoginDate = new Date(lastLogin);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return { color: 'text-success', label: '🟢', tooltip: 'Ativo recentemente' };
  } else if (diffDays <= 30) {
    return { color: 'text-warning', label: '🟡', tooltip: 'Pouco ativo' };
  } else {
    return { color: 'text-destructive', label: '🔴', tooltip: 'Inativo' };
  }
};

export default function Admin() {
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trialDays, setTrialDays] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check admin status for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .rpc('has_role', { _user_id: profile.id, _role: 'admin' });
          return { ...profile, isAdmin: roleData === true };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Filter Logic
  const filteredUsers = users.filter(user => {
    if (filterPeriod === 'all') return true;

    if (filterPeriod === 'never') return !user.last_login_at;

    if (!user.last_login_at) return false;

    const lastLogin = new Date(user.last_login_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastLogin.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (filterPeriod === '1d') return diffDays <= 1;
    if (filterPeriod === '2d') return diffDays <= 2;
    if (filterPeriod === '5d') return diffDays <= 5;
    if (filterPeriod === 'never') return !user.last_login_at;

    return true;
  });

  const getStatusBadge = (user: UserProfile) => {
    if (user.isAdmin) {
      return <Badge className="bg-primary/20 text-primary border-primary/30">👑 Admin</Badge>;
    }
    if (user.is_blocked) {
      return <Badge variant="destructive">🚫 Bloqueado</Badge>;
    }
    if (user.trial_expires_at) {
      const expiresAt = new Date(user.trial_expires_at);
      const now = new Date();
      if (expiresAt <= now) {
        return <Badge variant="outline" className="border-destructive text-destructive">⏰ Expirado</Badge>;
      }
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return <Badge variant="outline" className="border-warning text-warning">⏳ {daysLeft}d restantes</Badge>;
    }
    return <Badge variant="outline" className="border-success text-success">✅ Ativo</Badge>;
  };

  const handleBlockToggle = async (user: UserProfile, blocked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: blocked })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: `${user.full_name || user.email} foi ${blocked ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o usuário.',
        variant: 'destructive',
      });
    }
  };

  const handleSetTrial = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      let trialExpiresAt: string | null = null;

      if (trialDays && parseInt(trialDays) > 0) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + parseInt(trialDays));
        trialExpiresAt = expirationDate.toISOString();
      }

      const { error } = await supabase
        .from('profiles')
        .update({ trial_expires_at: trialExpiresAt })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: trialExpiresAt ? 'Prazo definido' : 'Prazo removido',
        description: trialExpiresAt
          ? `${selectedUser.full_name || selectedUser.email} terá acesso por ${trialDays} dias.`
          : `${selectedUser.full_name || selectedUser.email} agora tem acesso ilimitado.`,
      });

      setDialogOpen(false);
      setSelectedUser(null);
      setTrialDays('');
      fetchUsers();
    } catch (error) {
      console.error('Error setting trial:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir o prazo.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openTrialDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setTrialDays('');
    setDialogOpen(true);
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie usuários e controle de acesso
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Usuários Cadastrados
                <Badge variant="secondary">{filteredUsers.length}</Badge>
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os usuários do sistema
              </CardDescription>
            </div>

            <div className="w-[180px]">
              <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="1d">Últimas 24 horas</SelectItem>
                  <SelectItem value="2d">Últimos 2 dias</SelectItem>
                  <SelectItem value="5d">Últimos 5 dias</SelectItem>
                  <SelectItem value="never">Nunca Acessou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const activity = getActivityIndicator(user.last_login_at);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.created_at
                          ? format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2" title={activity.tooltip}>
                          <span>{activity.label}</span>
                          <span>
                            {user.last_login_at
                              ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : 'Nunca'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user)}</TableCell>
                      <TableCell className="text-right">
                        {!user.isAdmin && (
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.is_blocked || false}
                                onCheckedChange={(checked) => handleBlockToggle(user, checked)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {user.is_blocked ? 'Bloqueado' : 'Ativo'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTrialDialog(user)}
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Prazo
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Trial Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Prazo de Uso</DialogTitle>
            <DialogDescription>
              Configure o período de acesso para {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="trialDays">Dias de acesso</Label>
              <Input
                id="trialDays"
                type="number"
                min="0"
                placeholder="Ex: 7, 30, 90..."
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio ou 0 para remover o limite de prazo
              </p>
            </div>

            {selectedUser?.trial_expires_at && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  Prazo atual: {format(new Date(selectedUser.trial_expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetTrial} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
