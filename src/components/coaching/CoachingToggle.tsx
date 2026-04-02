import { GraduationCap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface CoachingToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function CoachingToggle({ enabled, onToggle }: CoachingToggleProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
      enabled 
        ? 'border-primary/50 bg-primary/5' 
        : 'border-border/50 bg-muted/30'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
        enabled ? 'bg-primary/20' : 'bg-muted'
      }`}>
        <GraduationCap className={`w-4 h-4 transition-colors ${
          enabled ? 'text-primary' : 'text-muted-foreground'
        }`} />
      </div>
      <div className="flex-1">
        <Label htmlFor="coaching-mode" className="text-sm font-medium cursor-pointer">
          Modo Coaching
        </Label>
        <p className="text-xs text-muted-foreground">
          Explicações detalhadas sobre técnicas de teste
        </p>
      </div>
      <div className="flex items-center gap-2">
        {enabled && (
          <Badge variant="secondary" className="text-xs">
            Ativo
          </Badge>
        )}
        <Switch 
          id="coaching-mode"
          checked={enabled}
          onCheckedChange={onToggle}
        />
      </div>
    </div>
  );
}
