'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatInterfaceProps {
  conversationId?: string;
  className?: string;
}

export function AIChatInterface({ conversationId: initialConversationId, className }: AIChatInterfaceProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history if conversationId is provided
  useEffect(() => {
    if (conversationId && user) {
      loadConversationHistory();
    }
  }, [conversationId, user]);

  const loadConversationHistory = async () => {
    if (!conversationId || !user) return;

    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(
          data.map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
          }))
        );
      }
    } catch (error: any) {
      console.error('Error loading conversation history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        // Replace temp message with real one
        const filtered = prev.filter((m) => m.id !== userMessage.id);
        return [...filtered, userMessage, assistantMessage];
      });

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to send message';
      
      if (error.message?.includes('quota') || error.message?.includes('insufficient_quota')) {
        errorMessage = language === 'ar' 
          ? 'تم تجاوز الحصة المخصصة. يرجى التحقق من إعدادات API أو استخدام Google Gemini.'
          : language === 'fr'
          ? 'Quota dépassé. Veuillez vérifier les paramètres API ou utiliser Google Gemini.'
          : 'Quota exceeded. Please check API settings or use Google Gemini.';
      } else if (error.message?.includes('API key not configured')) {
        errorMessage = language === 'ar'
          ? 'مفتاح API غير مُعد. يرجى إضافة OPENAI_API_KEY أو GEMINI_API_KEY في ملف .env.local'
          : language === 'fr'
          ? 'Clé API non configurée. Veuillez ajouter OPENAI_API_KEY ou GEMINI_API_KEY dans .env.local'
          : 'API key not configured. Please add OPENAI_API_KEY or GEMINI_API_KEY in .env.local';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      // Remove the user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span>AI Assistant</span>
          <Sparkles className="h-4 w-4 text-purple-500 ml-auto" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <div className="p-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 mb-4">
                <Bot className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ar' 
                  ? 'مرحباً! كيف يمكنني مساعدتك اليوم؟'
                  : language === 'fr'
                  ? 'Bonjour! Comment puis-je vous aider aujourd\'hui?'
                  : 'Hello! How can I help you today?'}
              </h3>
              <p className="text-sm max-w-md">
                {language === 'ar'
                  ? 'أنا مساعدك الذكي. يمكنني مساعدتك في الإجابة على الأسئلة الأكاديمية، شرح المفاهيم، وتقديم تلميحات للواجبات.'
                  : language === 'fr'
                  ? 'Je suis votre assistant intelligent. Je peux vous aider à répondre aux questions académiques, expliquer les concepts et fournir des indices pour les devoirs.'
                  : 'I\'m your intelligent assistant. I can help you answer academic questions, explain concepts, and provide hints for assignments.'}
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border-2 border-purple-200 dark:border-purple-800">
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'rounded-lg px-4 py-2 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 border-2 border-purple-200 dark:border-purple-800">
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === 'ar'
                  ? 'اكتب سؤالك هنا...'
                  : language === 'fr'
                  ? 'Tapez votre question ici...'
                  : 'Type your question here...'
              }
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="self-end"
              size="icon"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {language === 'ar'
              ? 'اضغط Enter للإرسال، Shift+Enter للسطر الجديد'
              : language === 'fr'
              ? 'Appuyez sur Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne'
              : 'Press Enter to send, Shift+Enter for new line'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

