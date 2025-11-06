'use client';

import { Loader2 } from 'lucide-react';

/**
 * مكون Loading Spinner موحد لجميع الصفحات
 * تصميم عصري مع animations سلسة
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
 */
export function DashboardLoadingSpinner({
  text,
  subtext
}: {
  text?: string;
  subtext?: string;
}) {
  return (
    <div className="flex items-center justify-center h-96 w-full">
      <LoadingSpinner
        size="lg"
        text={text}
        subtext={subtext}
        variant="primary"
      />
    </div>
  );
}

