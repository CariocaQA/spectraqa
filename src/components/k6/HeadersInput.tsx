import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface HeaderPair {
  key: string;
  value: string;
}

interface HeadersInputProps {
  headers: HeaderPair[];
  onChange: (headers: HeaderPair[]) => void;
}

export function HeadersInput({ headers, onChange }: HeadersInputProps) {
  const addHeader = () => {
    onChange([...headers, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    onChange(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = headers.map((header, i) => 
      i === index ? { ...header, [field]: value } : header
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {headers.map((header, index) => (
        <div key={index} className="flex gap-2 animate-fade-in">
          <Input
            placeholder="Header (ex: Authorization)"
            value={header.key}
            onChange={(e) => updateHeader(index, 'key', e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Valor"
            value={header.value}
            onChange={(e) => updateHeader(index, 'value', e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeHeader(index)}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addHeader}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Header
      </Button>
    </div>
  );
}
