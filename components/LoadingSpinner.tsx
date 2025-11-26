'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * مكون Loading Spinner موحد لجميع الصفحات
 * تصميم إسلامي عصري مع animations سلسة
 */

interface LoadingSpinnerProps {
  /**
   * حجم الـ spinner
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg' | 'xl';
  
  /**
   * النص الذي يظهر تحت الـ spinner
   */
  text?: string;
  
  /**
   * نص ثانوي (اختياري)
   */
  subtext?: string;
  
  /**
   * نوع التصميم
   * @default 'primary'
   */
  variant?: 'primary' | 'accent' | 'secondary' | 'success';
  
  /**
   * وضع ملء الشاشة
   * @default false
   */
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 'default',
  text,
  subtext,
  variant = 'primary',
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const variantClasses = {
    primary: {
      spinner: 'text-primary',
      glow: 'bg-primary/20'
    },
    accent: {
      spinner: 'text-accent',
      glow: 'bg-accent/20'
    },
    secondary: {
      spinner: 'text-secondary',
      glow: 'bg-secondary/20'
    },
    success: {
      spinner: 'text-success',
      glow: 'bg-success/20'
    }
  };

  const content = (
    <div className="text-center animate-fade-in-up">
      <div className="relative inline-block mb-4">
        {/* Spinner */}
        <Loader2 
          className={`${sizeClasses[size]} animate-spin ${variantClasses[variant].spinner} animate-pulse-glow mx-auto`} 
        />
        
        {/* Glow effect */}
        <div 
          className={`absolute inset-0 ${variantClasses[variant].glow} rounded-full blur-2xl animate-pulse`}
        ></div>
        
        {/* Rotating border */}
        <div 
          className={`absolute inset-0 ${variantClasses[variant].glow} rounded-full animate-spin`}
          style={{ 
            animationDuration: '3s',
            background: `conic-gradient(from 0deg, transparent, ${variant === 'primary' ? 'hsl(var(--primary))' : variant === 'accent' ? 'hsl(var(--accent))' : variant === 'secondary' ? 'hsl(var(--secondary))' : 'hsl(var(--success))'}, transparent)`,
            maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
            WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))'
          }}
        ></div>
      </div>

      {/* Text */}
      {text && (
        <p className="text-lg font-semibold text-foreground font-display animate-fade-in-up" style={{animationDelay: '100ms'}}>
          {text}
        </p>
      )}
      
      {/* Subtext */}
      {subtext && (
        <p className="mt-2 text-sm text-muted-foreground font-sans animate-fade-in-up" style={{animationDelay: '200ms'}}>
          {subtext}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      {content}
    </div>
  );
}

/**
 * ✨ مكون تحميل الصفحة الموحد - التصميم الإسلامي
 * Unified Page Loading Component with Islamic Design
 */
interface PageLoadingProps {
  /**
   * نص التحميل الرئيسي
   */
  text?: string;
  
  /**
   * نص توضيحي ثانوي
   */
  subtext?: string;
  
  /**
   * عرض بطاقات الإحصائيات
   * @default true
   */
  showStats?: boolean;
  
  /**
   * عدد بطاقات الإحصائيات
   * @default 4
   */
  statsCount?: number;
  
  /**
   * عرض بطاقة المحتوى
   * @default true
   */
  showContent?: boolean;
  
  /**
   * نوع المحتوى
   * @default 'table'
   */
  contentType?: 'table' | 'grid' | 'list';
  
  /**
   * عدد صفوف الجدول أو عناصر القائمة
   * @default 5
   */
  contentRows?: number;
}

export function PageLoading({
  text = 'جاري التحميل...',
  subtext,
  showStats = true,
  statsCount = 4,
  showContent = true,
  contentType = 'table',
  contentRows = 5,
}: PageLoadingProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* ✨ Header Loading with Islamic Design */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-l from-background via-card to-background border border-border/50 shadow-lg">
        {/* Subtle Pattern Background */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23115E3C' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '30px 30px',
          }}
        />
        
        {/* Glow Effects */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '500ms' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Icon Skeleton */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/10">
              <Skeleton className="h-6 w-6 bg-primary/30" />
            </div>
            
            {/* Text Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-8 w-48 md:w-64 bg-primary/20" />
              <Skeleton className="h-4 w-64 md:w-96 bg-muted-foreground/20" />
            </div>
          </div>
          
          {/* Action Buttons Skeleton */}
          <div className="flex gap-3">
            <Skeleton className="h-11 w-32 rounded-xl bg-secondary/20" />
          </div>
        </div>
        
        {/* Bottom Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l from-transparent via-secondary/50 to-transparent" />
      </div>

      {/* ✨ Stats Cards Loading */}
      {showStats && (
        <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${statsCount}`}>
          {Array.from({ length: statsCount }).map((_, i) => (
            <Card 
              key={i} 
              className="glass-card-hover border-primary/10 animate-fade-in-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-20 bg-muted-foreground/20" />
                    <Skeleton className="h-8 w-16 bg-primary/20" />
                    <Skeleton className="h-3 w-24 bg-muted-foreground/10" />
                  </div>
                  <div className={`p-3 rounded-xl ${
                    i === 0 ? 'bg-gradient-to-br from-primary/20 to-accent/20' :
                    i === 1 ? 'bg-gradient-to-br from-success/20 to-primary/20' :
                    i === 2 ? 'bg-gradient-to-br from-secondary/20 to-secondary/10' :
                    'bg-gradient-to-br from-accent/20 to-primary/20'
                  }`}>
                    <Skeleton className="h-6 w-6 bg-white/30" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ✨ Content Loading */}
      {showContent && (
        <Card className="glass-card border-primary/10">
          {/* Card Header with Search Skeleton */}
          <CardHeader className="border-b border-primary/10 bg-gradient-to-l from-primary/5 to-secondary/5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Skeleton className="h-6 w-32 bg-primary/20" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-48 rounded-xl bg-muted/50" />
                <Skeleton className="h-10 w-24 rounded-xl bg-muted/50" />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {/* Loading Indicator */}
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                {/* Spinner */}
                <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                {/* Glow */}
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              </div>
              
              {text && (
                <p className="text-foreground font-display font-semibold animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                  {text}
                </p>
              )}
              {subtext && (
                <p className="text-sm text-muted-foreground animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                  {subtext}
                </p>
              )}
            </div>
            
            {/* Content Skeleton based on type */}
            <div className="px-6 pb-6">
              {contentType === 'table' && (
                <div className="space-y-3">
                  {/* Table Header */}
                  <div className="flex gap-4 pb-3 border-b border-primary/10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-4 flex-1 bg-muted-foreground/20" />
                    ))}
                  </div>
                  {/* Table Rows */}
                  {Array.from({ length: contentRows }).map((_, rowIdx) => (
                    <div 
                      key={rowIdx} 
                      className="flex gap-4 py-4 border-b border-border/30 animate-fade-in-up"
                      style={{ animationDelay: `${(rowIdx + 1) * 50}ms` }}
                    >
                      {/* Avatar */}
                      <Skeleton className="h-10 w-10 rounded-full bg-primary/20" />
                      {/* Content */}
                      {Array.from({ length: 4 }).map((_, colIdx) => (
                        <Skeleton key={colIdx} className="h-4 flex-1 bg-muted/50" />
                      ))}
                    </div>
                  ))}
                </div>
              )}
              
              {contentType === 'grid' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: contentRows }).map((_, i) => (
                    <Card 
                      key={i} 
                      className="border-primary/10 animate-fade-in-up"
                      style={{ animationDelay: `${i * 75}ms` }}
                    >
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full bg-primary/20" />
                          <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4 bg-muted" />
                            <Skeleton className="h-3 w-1/2 bg-muted/70" />
                          </div>
                        </div>
                        <Skeleton className="h-20 w-full rounded-xl bg-muted/50" />
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-16 rounded-full bg-primary/20" />
                          <Skeleton className="h-6 w-16 rounded-full bg-secondary/20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              
              {contentType === 'list' && (
                <div className="space-y-3">
                  {Array.from({ length: contentRows }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-4 p-4 border border-primary/10 rounded-xl animate-fade-in-up"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <Skeleton className="h-12 w-12 rounded-full bg-primary/20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4 bg-muted" />
                        <Skeleton className="h-3 w-1/2 bg-muted/70" />
                      </div>
                      <Skeleton className="h-8 w-20 rounded-lg bg-muted/50" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * مكون Loading Page كامل
 */
export function LoadingPage({
  text,
  subtext
}: {
  text?: string;
  subtext?: string;
}) {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <LoadingSpinner
        size="xl"
        text={text}
        subtext={subtext}
        variant="primary"
      />
    </div>
  );
}

/**
 * مكون Loading Inline صغير للاستخدام داخل الـ components
 */
export function LoadingInline({
  text,
  size = 'sm'
}: {
  text?: string;
  size?: 'sm' | 'default';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6'
  };

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

/**
 * مكون Loading للـ Dashboard Layout
 * @deprecated استخدم PageLoading بدلاً منه
 */
export function DashboardLoadingSpinner({
  text,
  subtext
}: {
  text?: string;
  subtext?: string;
}) {
  return (
    <PageLoading
      text={text}
      subtext={subtext}
      showStats={false}
      showContent={false}
    />
  );
}

/**
 * ✨ مكون تحميل بسيط للصفحات
 * Simple Page Loading Component
 */
export function SimplePageLoading({
  text = 'جاري التحميل...',
}: {
  text?: string;
}) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center animate-fade-in-up">
        <div className="relative inline-block mb-4">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          
          {/* Spinner Container */}
          <div className="relative p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full border border-primary/20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          
          {/* Rotating Ring */}
          <div 
            className="absolute inset-0 rounded-full animate-spin"
            style={{ 
              animationDuration: '3s',
              background: 'conic-gradient(from 0deg, transparent, hsl(var(--secondary)), transparent)',
              maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))',
              WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), black calc(100% - 2px))'
            }}
          />
        </div>
        
        <p className="text-foreground font-display font-semibold">
          {text}
        </p>
      </div>
    </div>
  );
}

