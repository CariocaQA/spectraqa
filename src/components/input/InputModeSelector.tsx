import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, FileEdit } from 'lucide-react';

export type InputMode = 'jira' | 'manual';

interface InputModeSelectorProps {
  value: InputMode;
  onChange: (value: InputMode) => void;
}

export function InputModeSelector({ value, onChange }: InputModeSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Fonte dos dados:</span>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(v) => v && onChange(v as InputMode)}
        className="bg-muted/50 rounded-lg p-1"
      >
        <ToggleGroupItem 
          value="jira" 
          aria-label="Buscar do Jira"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1.5 text-sm"
        >
          <Search className="w-4 h-4 mr-2" />
          Buscar do Jira
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="manual" 
          aria-label="Entrada Manual"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1.5 text-sm"
        >
          <FileEdit className="w-4 h-4 mr-2" />
          Entrada Manual
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
