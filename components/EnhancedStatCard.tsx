import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  gradient?: string;
  loading?: boolean;
  progress?: number;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export function EnhancedStatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  gradient, 
  loading = false,
  progress,
  status = 'info'
}: EnhancedStatCardProps) {
  const defaultGradient = "from-blue-500 to-purple-600";
  const cardGradient = gradient || defaultGradient;

  const statusColors = {
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    error: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-purple-500'
  };

  const statusGradient = statusColors[status];

  if (loading) {
    return (
      <Card className="card-hover border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2"></div>
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          {progress !== undefined && (
            <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-slate-200/50 dark:border-slate-800/50 card-hover bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
      {/* خلفية متدرجة متحركة */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br", statusGradient,
        "opacity-0 group-hover:opacity-10 transition-all duration-500"
      )} />
      
      {/* تأثير الضوء المتحرك */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 relative z-10">
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
          statusGradient,
          "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
        )}>
          <Icon className="h-5 w-5 text-white drop-shadow-sm" />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className={cn(
          "text-4xl font-bold bg-gradient-to-br text-shadow",
          statusGradient,
          "bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300"
        )}>
          {value}
        </div>
        
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        )}
        
        {progress !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span>التقدم</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <Badge 
              variant={trend.isPositive ? "default" : "destructive"}
              className={cn(
                "text-xs font-semibold",
                trend.isPositive 
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              <span className={cn(
                "mr-1 transition-transform duration-300",
                trend.isPositive ? 'group-hover:translate-y-[-2px]' : 'group-hover:translate-y-[2px]'
              )}>
                {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              </span>
              {Math.abs(trend.value)}%
            </Badge>
            <span className="text-xs text-slate-500 dark:text-slate-400">{trend.period}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// مكون للإشعارات المحسنة
interface NotificationCardProps {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  time: string;
  icon?: LucideIcon;
}

export function NotificationCard({ title, message, type, time, icon: Icon }: NotificationCardProps) {
  const typeColors = {
    success: 'from-emerald-500 to-teal-500',
    warning: 'from-amber-500 to-orange-500',
    error: 'from-red-500 to-pink-500',
    info: 'from-blue-500 to-purple-500'
  };

  const typeBgColors = {
    success: 'from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20',
    warning: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
    error: 'from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20',
    info: 'from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20'
  };

  return (
    <div className={cn(
      "flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r transition-all duration-300 hover:shadow-md",
      typeBgColors[type]
    )}>
      <div className={cn(
        "w-10 h-10 bg-gradient-to-br rounded-full flex items-center justify-center shadow-lg",
        typeColors[type]
      )}>
        {Icon && <Icon className="h-5 w-5 text-white" />}
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{message}</p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{time}</p>
      </div>
    </div>
  );
}
