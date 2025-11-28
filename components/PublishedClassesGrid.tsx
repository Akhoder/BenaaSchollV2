import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, enrollInClass, fetchMyClassEnrollments } from '@/lib/supabase';
import { OptimizedImage } from '@/components/OptimizedImage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BookOpen, User, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function PublishedClassesGrid() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [enrolledClassIds, setEnrolledClassIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Fetch published classes
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

  // Fetch user enrollments if logged in
  useEffect(() => {
    async function checkEnrollments() {
      if (!user) {
        setEnrolledClassIds(new Set());
        return;
      }

      try {
        const { data, error } = await fetchMyClassEnrollments();
        if (data) {
          const ids = new Set(data.map((e: any) => e.class_id));
          setEnrolledClassIds(ids);
        }
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      }
    }

    checkEnrollments();
  }, [user]);

  const handleEnroll = async (e: React.MouseEvent, classId: string) => {
    e.preventDefault(); // Prevent navigation if inside a link
    e.stopPropagation();
    
    if (!user) {
      router.push(`/login?redirect=/dashboard/classes`);
      return;
    }

    try {
      setEnrollingId(classId);
      const { error } = await enrollInClass(classId);
      
      if (error) {
        console.error('Enrollment error:', error);
        toast.error('حدث خطأ أثناء التسجيل في الفصل');
      } else {
        toast.success('تم التسجيل في الفصل بنجاح');
        setEnrolledClassIds(prev => new Set(prev).add(classId));
        router.push(`/dashboard/my-classes/${classId}`);
      }
    } catch (error) {
      console.error('Unexpected enrollment error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setEnrollingId(null);
    }
  };

  const handleCardClick = (classId: string) => {
    if (!user) {
      router.push(`/login?redirect=/dashboard/my-classes`);
      return;
    }

    if (enrolledClassIds.has(classId)) {
      router.push(`/dashboard/my-classes/${classId}`);
    }
    // If logged in but not enrolled, we don't navigate automatically to details
    // because they might not have access. But user asked to "take you to class details page".
    // We'll assume details page handles non-enrolled users or redirects back.
    // Or better: Trigger enrollment? User said "card click -> details page".
    // Let's try navigating to details page. If it fails/redirects, that's on the details page logic.
    // Actually, usually details page requires enrollment. 
    // But let's follow the instruction: "make the class card when pressed take you to the class details page".
    // We'll just link to it.
    else {
       router.push(`/dashboard/my-classes/${classId}`);
    }
  };

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
      {classes.map((cls) => {
        const isEnrolled = enrolledClassIds.has(cls.id);
        const isEnrolling = enrollingId === cls.id;

        return (
          <div 
            key={cls.id} 
            className="relative group h-full cursor-pointer"
            onClick={() => handleCardClick(cls.id)}
          >
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

                <div className="mt-auto pt-1" onClick={(e) => e.stopPropagation()}>
                  {user ? (
                    isEnrolled ? (
                      <Link href={`/dashboard/my-classes/${cls.id}`} className="block">
                        <Button className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/20 hover:border-secondary/50 transition-all duration-300 shadow-none hover:shadow-sm group/btn">
                          <span className="font-bold">الذهاب للفصل</span>
                          <ArrowRight className="w-4 h-4 mr-2 group-hover/btn:-translate-x-1 transition-transform" />
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        className="w-full bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all duration-300 shadow-none hover:shadow-lg group/btn"
                        onClick={(e) => handleEnroll(e, cls.id)}
                        disabled={isEnrolling}
                      >
                        {isEnrolling ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span className="font-bold">التسجيل في الفصل</span>
                            <ArrowRight className="w-4 h-4 mr-2 group-hover/btn:-translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    )
                  ) : (
                    <Link href={`/login?redirect=/dashboard/my-classes`} className="block">
                      <Button className="w-full bg-primary/5 hover:bg-primary text-primary hover:text-white border border-primary/20 hover:border-primary transition-all duration-300 shadow-none hover:shadow-lg group/btn">
                        <span className="font-bold">سجل الآن</span>
                        <ArrowRight className="w-4 h-4 mr-2 group-hover/btn:-translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
