import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  internalOnly: boolean;
  setInternalOnly: (value: boolean) => void;
  allowGeneralKnowledge: boolean;
  setAllowGeneralKnowledge: (value: boolean) => void;
}

export function ChatInput({
  onSend,
  isLoading,
  internalOnly,
  setInternalOnly,
  allowGeneralKnowledge,
  setAllowGeneralKnowledge,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [message]);

  return (
    <div className="border-t bg-background p-4 space-y-4">
      {/* Toggles */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Switch
            id="internal-only"
            checked={internalOnly}
            onCheckedChange={setInternalOnly}
          />
          <Label htmlFor="internal-only" className="text-muted-foreground cursor-pointer">
            Responder apenas com base no material interno
          </Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch
            id="allow-general"
            checked={allowGeneralKnowledge}
            onCheckedChange={setAllowGeneralKnowledge}
            disabled={!internalOnly}
          />
          <Label 
            htmlFor="allow-general" 
            className={`cursor-pointer ${!internalOnly ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
          >
            Permitir conhecimento geral quando a base não cobrir
          </Label>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua pergunta sobre QA, BDD, testes de performance..."
          className="min-h-[48px] max-h-[150px] resize-none flex-1"
          disabled={isLoading}
        />
        <Button type="submit" size="icon" disabled={!message.trim() || isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
