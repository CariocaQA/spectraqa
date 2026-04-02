import { Bot, User, BookOpen, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface Source {
  documentTitle: string;
  excerpt: string;
  similarity: number;
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isLoading?: boolean;
  hasInternalSources?: boolean;
}

export function ChatMessage({ 
  role, 
  content, 
  sources = [], 
  isLoading = false,
  hasInternalSources = true 
}: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
        ${isAssistant ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
      `}>
        {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Message */}
      <div className={`flex-1 max-w-[85%] ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        <Card className={`
          p-4 
          ${isAssistant ? 'bg-muted/50' : 'bg-primary text-primary-foreground'}
        `}>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <div className={`prose prose-sm max-w-none ${isAssistant ? 'dark:prose-invert' : 'prose-invert'}`}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </Card>

        {/* Sources */}
        {isAssistant && !isLoading && sources.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpen className="w-3 h-3" />
              <span>Fontes consultadas:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((source, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs bg-muted/50"
                  title={source.excerpt}
                >
                  {source.documentTitle}
                  <span className="ml-1 text-muted-foreground">
                    ({Math.round(source.similarity * 100)}%)
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warning for no internal sources */}
        {isAssistant && !isLoading && !hasInternalSources && sources.length === 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-500">
            <AlertTriangle className="w-3 h-3" />
            <span>Resposta baseada em conhecimento geral</span>
          </div>
        )}
      </div>
    </div>
  );
}
