'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Search,
  CircleDot,
  User,
  Users
} from 'lucide-react';
import { 
  getMyConversations, 
  Conversation,
  getConversationMessages,
  sendMessage as apiSendMessage,
  subscribeToMessages,
  MessageWithSender,
  markMessagesAsRead
} from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
    if (profile) {
      loadConversations().catch(() => {});
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      markAsRead();
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await getMyConversations();
      if (error) {
        console.error(error);
        toast.error('Error loading conversations');
        return;
      }
      setConversations((data || []) as Conversation[]);
      if (data && data.length > 0) {
        setSelectedConversation(data[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Error loading conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const { data, error } = await getConversationMessages(selectedConversation.id);
      if (error) {
        console.error(error);
        toast.error('Error loading messages');
        return;
      }
      setMessages((data || []) as MessageWithSender[]);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Subscribe to new messages
      const unsubscribe = subscribeToMessages(selectedConversation.id, (newMessage) => {
        setMessages((prev) => [...prev, newMessage]);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        markAsRead();
      });
      
      return unsubscribe;
    } catch (e) {
      console.error(e);
      toast.error('Error loading messages');
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation) return;
    await markMessagesAsRead(selectedConversation.id);
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConversation || sending) return;
    
    try {
      setSending(true);
      const { error } = await apiSendMessage(
        selectedConversation.id,
        messageInput.trim(),
        'text'
      );
      if (error) {
        console.error(error);
        toast.error('Error sending message');
        return;
      }
      setMessageInput('');
    } catch (e) {
      console.error(e);
      toast.error('Error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.type === 'direct') return 'Direct Message';
    if (conv.type === 'class') return 'Class Chat';
    if (conv.type === 'subject') return 'Subject Chat';
    return 'Conversation';
  };

  const filteredConversations = conversations.filter(conv => 
    getConversationTitle(conv).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Messages"
          description="Chat with teachers and classmates"
          icon={MessageSquare}
        />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Conversations List */}
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 dark:border-gray-700"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[calc(100vh-280px)] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
                        selectedConversation?.id === conv.id && "bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-600"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                          {conv.type === 'direct' ? (
                            <User className="h-5 w-5 text-white" />
                          ) : (
                            <Users className="h-5 w-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                            {getConversationTitle(conv)}
                          </h3>
                          {conv.last_message_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(conv.last_message_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages Area */}
          <Card className="border-slate-200 dark:border-slate-800 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Messages */}
                <CardContent 
                  ref={messagesContainerRef}
                  className="flex-1 p-6 overflow-y-auto max-h-[calc(100vh-400px)]"
                >
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-center">
                        <div>
                          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.sender_id === profile.id && "flex-row-reverse"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">
                              {msg.sender.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className={cn(
                            "flex-1 max-w-[70%]",
                            msg.sender_id === profile.id && "flex flex-col items-end"
                          )}>
                            {msg.sender_id !== profile.id && (
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                {msg.sender.full_name}
                              </p>
                            )}
                            <div className={cn(
                              "rounded-2xl px-4 py-2",
                              msg.sender_id === profile.id
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                            )}>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {msg.content}
                              </p>
                              {msg.is_edited && (
                                <p className="text-xs opacity-70 mt-1">(edited)</p>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>

                {/* Input */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 border-gray-300 dark:border-gray-700"
                      disabled={sending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96 text-center">
                <div>
                  <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

