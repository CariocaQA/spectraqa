import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Eye, EyeOff, AlertTriangle, Mail } from 'lucide-react';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'link-error' | 'forgot-success';

function parseHashParams(hash: string): Record<string, string> {
  if (!hash || hash.length <= 1) return {};
  const params: Record<string, string> = {};
  const pairs = hash.substring(1).split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return params;
}

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  const { signIn, signUp, resetPassword, updatePassword, user, isRecoveryMode, clearRecoveryMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: Location })?.from?.pathname || '/';

  // Detect mode from URL and auth state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hasResetParam = searchParams.get('reset') === 'true';
    const hashParams = parseHashParams(location.hash);

    // Check for error in hash (link expired/invalid)
    if (hasResetParam && (hashParams.error || hashParams.error_code)) {
      setMode('link-error');
      setInitialCheckDone(true);
      return;
    }

    // Check if in recovery mode (from Supabase event)
    if (isRecoveryMode) {
      setMode('reset-password');
      setInitialCheckDone(true);
      return;
    }

    // Normal flow - if user is logged in and not in recovery, redirect
    if (user && !isRecoveryMode && initialCheckDone) {
      navigate(from, { replace: true });
      return;
    }

    setInitialCheckDone(true);
  }, [location.search, location.hash, isRecoveryMode, user, navigate, from, initialCheckDone]);

  // Clear URL params after processing
  useEffect(() => {
    if (initialCheckDone && (location.search || location.hash)) {
      const searchParams = new URLSearchParams(location.search);
      const hasResetParam = searchParams.get('reset') === 'true';

      if (hasResetParam && mode !== 'link-error') {
        // Keep the URL clean but don't navigate away if in reset mode
        window.history.replaceState({}, '', '/auth');
      }
    }
  }, [initialCheckDone, location.search, location.hash, mode]);

  const validateForm = useCallback(() => {
    try {
      if (mode === 'forgot-password') {
        z.object({ email: z.string().email('Email inválido') }).parse({ email });
      } else if (mode === 'reset-password') {
        resetPasswordSchema.parse({ password, confirmPassword });
      } else if (mode === 'login') {
        loginSchema.parse({ email, password });
      } else if (mode === 'signup') {
        signupSchema.parse({ email, password, fullName });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            fieldErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  }, [mode, email, password, confirmPassword, fullName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (mode === 'forgot-password') {
        // Always show success message to prevent email enumeration
        await resetPassword(email);
        setMode('forgot-success');
      } else if (mode === 'reset-password') {
        const { error } = await updatePassword(password);
        if (error) {
          console.error('Password update error:', error);

          // Handle specific error codes
          let errorMessage = 'Não foi possível atualizar sua senha. Tente novamente em alguns instantes.';

          if (error.message.includes('same_password') || error.message.includes('should be different')) {
            errorMessage = 'A nova senha deve ser diferente da senha atual.';
          } else if (error.message.includes('weak_password') || error.message.includes('too weak')) {
            errorMessage = 'A senha é muito fraca. Use uma combinação de letras, números e caracteres especiais.';
          } else if (error.message.includes('session_expired') || error.message.includes('not authenticated')) {
            errorMessage = 'Sua sessão expirou. Solicite um novo link de redefinição de senha.';
            // Switch to link error mode
            setTimeout(() => setMode('link-error'), 1500);
          }

          toast({
            title: 'Erro ao atualizar senha',
            description: errorMessage,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Senha atualizada!',
            description: 'Sua senha foi alterada com sucesso. Redirecionando...',
          });
          // Small delay before redirect for UX
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 1500);
        }
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Erro ao entrar',
              description: 'Email ou senha incorretos',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro ao entrar',
              description: error.message,
              variant: 'destructive',
            });
          }
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'Erro ao criar conta',
              description: 'Este email já está cadastrado',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Erro ao criar conta',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Verifique seu email para confirmar o cadastro',
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrors({});
    setPassword('');
    setConfirmPassword('');
    if (newMode === 'login' || newMode === 'signup') {
      clearRecoveryMode();
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'signup': return 'Criar conta';
      case 'forgot-password': return 'Redefinir senha';
      case 'forgot-success': return 'Email enviado';
      case 'reset-password': return 'Definir nova senha';
      case 'link-error': return 'Link inválido';
      default: return 'Entrar';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Entre com sua conta para continuar';
      case 'signup': return 'Crie uma conta para começar';
      case 'forgot-password': return 'Informe o email cadastrado no SpectraQA para enviarmos um link de redefinição de senha.';
      case 'forgot-success': return '';
      case 'reset-password': return 'Você está redefinindo a senha da sua conta no SpectraQA. Escolha uma nova senha para continuar.';
      case 'link-error': return '';
      default: return '';
    }
  };

  // Render different content based on mode
  const renderContent = () => {
    // Success state after requesting password reset
    if (mode === 'forgot-success') {
      return (
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mx-auto">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Se este email estiver cadastrado, enviamos um link para redefinir sua senha.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => switchMode('login')}
            className="mt-4"
          >
            Voltar ao login
          </Button>
        </div>
      );
    }

    // Error state for invalid/expired link
    if (mode === 'link-error') {
      return (
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/20 mx-auto">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Este link de redefinição não é mais válido</h3>
            <p className="text-sm text-muted-foreground">
              O link que você usou já foi utilizado ou expirou. Para continuar, solicite um novo email de redefinição de senha.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => switchMode('forgot-password')}>
              Enviar novo email de redefinição
            </Button>
            <Button variant="ghost" onClick={() => switchMode('login')}>
              Voltar ao login
            </Button>
          </div>
        </div>
      );
    }

    // Reset password form
    if (mode === 'reset-password') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
            <PasswordStrengthMeter password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={errors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atualizar senha e entrar
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </form>
      );
    }

    // Login, Signup, and Forgot Password forms
    return (
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
              autoFocus={mode === 'forgot-password'}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {mode !== 'forgot-password' && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode('forgot-password')}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' && 'Entrar'}
            {mode === 'signup' && 'Criar conta'}
            {mode === 'forgot-password' && 'Enviar link de redefinição'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'forgot-password' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar ao login
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === 'login' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-4 glow">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">SpectraQA</h1>
          <p className="text-muted-foreground mt-2">QA Copilot inteligente</p>
        </div>

        <Card className="glass">
          <CardHeader className="text-center pb-4">
            <CardTitle>{getTitle()}</CardTitle>
            {getDescription() && (
              <CardDescription>{getDescription()}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
