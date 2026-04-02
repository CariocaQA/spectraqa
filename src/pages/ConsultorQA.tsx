import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAccessControl } from '@/hooks/useAccessControl';
import { AccessDenied } from '@/components/AccessDenied';
import { ChatInput } from '@/components/consultor/ChatInput';
import { ChatMessage } from '@/components/consultor/ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    documentTitle: string;
    excerpt: string;
    similarity: number;
  }>;
  hasInternalSources?: boolean;
}

export default function ConsultorQA() {
  const { canAccess, loading: accessLoading } = useAccessControl();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [internalOnly, setInternalOnly] = useState(true);
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (question: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add loading message
    const loadingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
    }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      // Build conversation history (last 10 messages)
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qa-consultor-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question,
            internalOnly,
            allowGeneralKnowledge,
            conversationHistory: history,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao consultar');
      }

      // Replace loading message with real response
      setMessages(prev => prev.map(m =>
        m.id === loadingId ? {
          ...m,
          content: data.answer,
          sources: data.sources,
          hasInternalSources: data.hasInternalSources,
        } : m
      ));

    } catch (error) {
      console.error('Chat error:', error);

      // Remove loading message
      setMessages(prev => prev.filter(m => m.id !== loadingId));

      toast({
        title: 'Erro na consulta',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Consultor QA
          </h1>
          <p className="text-muted-foreground text-sm">
            Tire dúvidas sobre QA com base no material interno
          </p>
        </div>

        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar conversa
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">Pergunte ao SpectraQA</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Faça perguntas sobre BDD, testes de performance, automação, processos de QA e mais.
                As respostas são baseadas nos materiais internos da sua organização.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 max-w-md justify-center">
                {[
                  'Como estruturar cenários BDD?',
                  'Quais são as boas práticas de K6?',
                  'O que testar em uma API REST?',
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  sources={message.sources}
                  isLoading={message.role === 'assistant' && !message.content}
                  hasInternalSources={message.hasInternalSources}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          internalOnly={internalOnly}
          setInternalOnly={setInternalOnly}
          allowGeneralKnowledge={allowGeneralKnowledge}
          setAllowGeneralKnowledge={setAllowGeneralKnowledge}
        />
      </Card>
    </div>
  );
}
