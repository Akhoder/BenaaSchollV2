import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  gradient: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ 
  icon: Icon, 
  title, 
  description, 
  gradient, 
  children,
  className 
}: PageHeaderProps) {
  return (
    <div className={cn(
      "rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden border border-white/20",
      `bg-gradient-to-br ${gradient}`,
      className
    )}>
      {/* خلفية متحركة محسنة */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%)'
      }}></div>
      
      {/* عناصر متحركة محسنة */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20 animate-float blur-2xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float blur-2xl" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white/5 rounded-full animate-float blur-xl" style={{animationDelay: '2s'}}></div>
      
      <div className="relative z-10">
        {/* Icon و Title */}
        <div className="flex items-start gap-4 md:gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-2xl blur-md"></div>
            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
              <Icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </div>
          </div>
          <div className="flex-1 pt-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent drop-shadow-lg">
                {title}
              </span>
            </h1>
            {description && (
              <p className="text-white/90 mt-2 text-lg md:text-xl font-medium font-sans">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        {children && (
          <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

