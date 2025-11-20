'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, Loader2, Users, School, BookOpen, FileText, Mic, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  description?: string;
  url: string;
  relevance: number;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  student: Users,
  class: School,
  subject: BookOpen,
  assignment: FileText,
  announcement: FileText,
};

const typeLabels: Record<string, Record<string, string>> = {
  student: { en: 'Student', ar: 'طالب', fr: 'Étudiant' },
  class: { en: 'Class', ar: 'فصل', fr: 'Classe' },
  subject: { en: 'Subject', ar: 'مادة', fr: 'Matière' },
  assignment: { en: 'Assignment', ar: 'واجب', fr: 'Devoir' },
  announcement: { en: 'Announcement', ar: 'إعلان', fr: 'Annonce' },
};

interface IntelligentSearchProps {
  className?: string;
}

export function IntelligentSearch({ className }: IntelligentSearchProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Debounce search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;

    setIsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          filters: { type: 'all' },
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('Search results:', data);
      setResults(data.results || []);
      
      // If no results, log for debugging
      if (!data.results || data.results.length === 0) {
        console.warn('No search results found for query:', searchQuery);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    router.push(result.url);
  };

  // Voice search
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(language === 'ar' 
        ? 'البحث الصوتي غير مدعوم في متصفحك'
        : 'Voice search is not supported in your browser');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      performSearch(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                language === 'ar'
                  ? 'ابحث عن طلاب، فصول، مواد...'
                  : language === 'fr'
                  ? 'Rechercher des étudiants, classes, matières...'
                  : 'Search students, classes, subjects...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              className="pl-10 pr-20 w-full sm:w-64 md:w-80 lg:w-96"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6', isListening && 'text-red-500 animate-pulse')}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isListening) {
                    stopVoiceSearch();
                  } else {
                    startVoiceSearch();
                  }
                }}
                title={language === 'ar' ? 'بحث صوتي' : 'Voice search'}
              >
                <Mic className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        sideOffset={5}
      >
        <Command>
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
                </span>
              </div>
            ) : results.length === 0 && query ? (
              <CommandEmpty>
                {language === 'ar' 
                  ? 'لا توجد نتائج'
                  : language === 'fr'
                  ? 'Aucun résultat'
                  : 'No results found'}
              </CommandEmpty>
            ) : results.length > 0 ? (
              <>
                {Object.entries(
                  results.reduce((acc, result) => {
                    if (!acc[result.type]) acc[result.type] = [];
                    acc[result.type].push(result);
                    return acc;
                  }, {} as Record<string, SearchResult[]>)
                ).map(([type, items]) => {
                  const Icon = typeIcons[type] || Search;
                  const label = typeLabels[type]?.[language] || type;

                  return (
                    <CommandGroup key={type} heading={label}>
                      {items.map((result) => (
                        <CommandItem
                          key={result.id}
                          onSelect={() => handleSelect(result)}
                          className="cursor-pointer"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="font-medium">{result.title}</span>
                            {result.description && (
                              <span className="text-xs text-muted-foreground">
                                {result.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
              </>
            ) : (
              <CommandEmpty>
                {language === 'ar'
                  ? 'ابدأ الكتابة للبحث...'
                  : language === 'fr'
                  ? 'Commencez à taper pour rechercher...'
                  : 'Start typing to search...'}
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

