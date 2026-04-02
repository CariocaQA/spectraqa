import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordCriteria {
  label: string;
  test: (password: string) => boolean;
}

const criteria: PasswordCriteria[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Um número', test: (p) => /[0-9]/.test(p) },
  { label: 'Um caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const analysis = useMemo(() => {
    const passedCriteria = criteria.filter((c) => c.test(password));
    const strength = passedCriteria.length;
    
    let label: string;
    let colorClass: string;
    
    if (password.length === 0) {
      label = '';
      colorClass = 'bg-muted';
    } else if (strength <= 1) {
      label = 'Muito fraca';
      colorClass = 'bg-destructive';
    } else if (strength === 2) {
      label = 'Fraca';
      colorClass = 'bg-orange-500';
    } else if (strength === 3) {
      label = 'Média';
      colorClass = 'bg-yellow-500';
    } else if (strength === 4) {
      label = 'Forte';
      colorClass = 'bg-green-500';
    } else {
      label = 'Muito forte';
      colorClass = 'bg-emerald-500';
    }
    
    return { strength, label, colorClass, passedCriteria };
  }, [password]);

  if (password.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                level <= analysis.strength ? analysis.colorClass : 'bg-muted'
              )}
            />
          ))}
        </div>
        {analysis.label && (
          <p className={cn(
            'text-xs font-medium transition-colors',
            analysis.strength <= 1 && 'text-destructive',
            analysis.strength === 2 && 'text-orange-500',
            analysis.strength === 3 && 'text-yellow-500',
            analysis.strength === 4 && 'text-green-500',
            analysis.strength === 5 && 'text-emerald-500',
          )}>
            {analysis.label}
          </p>
        )}
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 gap-1">
        {criteria.map((criterion, index) => {
          const passed = criterion.test(password);
          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-2 text-xs transition-colors',
                passed ? 'text-green-500' : 'text-muted-foreground'
              )}
            >
              {passed ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              <span>{criterion.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
