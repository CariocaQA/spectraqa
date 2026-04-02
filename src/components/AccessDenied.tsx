import { Lock, Mail, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AccessDeniedProps {
  isBlocked?: boolean;
  isTrialExpired?: boolean;
  title?: string;
  message?: string;
}

export function AccessDenied({
  isBlocked = false,
  isTrialExpired = false,
  title,
  message
}: AccessDeniedProps) {
  const adminEmail = 'silasuni@gmail.com';

  const getMessage = () => {
    if (message) return message;
    if (isBlocked) {
      return 'Seu acesso foi suspenso pelo administrador.';
    }
    if (isTrialExpired) {
      return 'Seu período de acesso ao Spectra expirou.';
    }
    return 'Seu acesso está temporariamente indisponível.';
  };

  const getTitle = () => {
    if (title) return title;
    return 'Acesso Restrito';
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:${adminEmail}?subject=Solicitação de Acesso - SpectraQA&body=Olá, gostaria de solicitar acesso/extensão do meu período de uso do SpectraQA.`;
  };

  const showContactInfo = isBlocked || isTrialExpired || (!title && !message);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            {isBlocked || isTrialExpired ? (
              <Lock className="w-8 h-8 text-destructive" />
            ) : (
              <ShieldAlert className="w-8 h-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
          <CardDescription className="text-base mt-2">
            {getMessage()}
          </CardDescription>
        </CardHeader>
        {showContactInfo && (
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Para continuar utilizando a ferramenta, entre em contato com o administrador:
            </p>

            <div className="flex items-center justify-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-medium text-primary">{adminEmail}</span>
            </div>

            <Button onClick={handleEmailClick} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Enviar e-mail
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
