import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BookOpen, User, Calendar, AlertCircle } from 'lucide-react';

export function PublishedClassesGrid() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    async function loadClasses() {
      try {
        console.log('Fetching published classes...');
        
        // Try using the RPC function first (safe for public access)
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_published_classes_public');
        
        if (rpcError) {
          console.error('RPC Error:', rpcError);
          // Fallback to direct query will happen below
        } else {
          console.log('RPC Success, data:', rpcData);
          if (rpcData) {
            // Map RPC flat structure to expected nested structure
            const mappedData = rpcData.map((cls: any) => ({
              ...cls,
              teacher: { 
                full_name: cls.teacher_name,
                avatar_url: cls.teacher_avatar 
              }
            }));
            setClasses(mappedData);
            setLoading(false);
            return;
          }
        }

        console.log('RPC unavailable or returned null, falling back to direct query...');

        // Fallback to direct query (works if RLS allows it)
        const { data, error } = await supabase
          .from('classes')
          .select('id, class_name, teacher_id, level, image_url, created_at, teacher:profiles!teacher_id(full_name)')
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Direct query error:', error);
          setDebugInfo(error.message);
        } else if (data) {
          console.log('Direct query success, data:', data);
          setClasses(data);
        }
      } catch (error: any) {
        console.error('Unexpected error loading classes:', error);
        setDebugInfo(error.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }

    loadClasses();
  }, []);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[300px] bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-muted rounded-full">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">لا توجد دورات متاحة حالياً</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          يرجى التحقق مرة أخرى لاحقاً، نحن نعمل على إضافة دورات جديدة.
        </p>
        
        {/* Debug Info (Hidden in production usually, but helpful here) */}
        {debugInfo && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-left dir-ltr font-mono overflow-auto max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-2 font-bold">
              <AlertCircle className="w-4 h-4" />
              Debug Error:
            </div>
            {debugInfo}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {classes.map((cls) => (
        <div key={cls.id} className="relative group h-full">
          {/* Golden glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-secondary via-primary to-secondary rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500" />
          
          <div className="relative flex flex-col h-full glass-card border-2 border-transparent group-hover:border-secondary/40 transition-all duration-300 overflow-hidden rounded-2xl">
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden bg-muted">
              {cls.image_url ? (
                <OptimizedImage
                  src={cls.image_url}
                  alt={cls.class_name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-primary/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-4 right-4 text-white">
                <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-lg text-xs font-bold border border-white/10">
                  {cls.level ? `المستوى ${cls.level}` : 'عام'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col flex-grow p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-foreground font-display line-clamp-1 mb-1">
                  {cls.class_name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="w-3.5 h-3.5 text-secondary" />
                  <span className="line-clamp-1">
                    {cls.teacher?.full_name || 'مدرسة البناء العلمي'}
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-border/50" />

              <div className="mt-auto pt-1">
                <Link href={`/login?redirect=/dashboard/my-classes`} className="block">
                  <Button className="w-full bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all duration-300 shadow-none hover:shadow-lg group/btn">
                    <span className="font-bold">سجل الآن</span>
                    <ArrowRight className="w-4 h-4 mr-2 group-hover/btn:-translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
