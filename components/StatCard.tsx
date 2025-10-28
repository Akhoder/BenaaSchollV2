import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon: Icon, description, trend, gradient, loading = false }: StatCardProps) {
  const defaultGradient = "from-emerald-500 to-teal-500";
  const cardGradient = gradient || defaultGradient;

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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group relative overflow-hidden border-slate-200/50 dark:border-slate-800/50 card-hover bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      {/* خلفية متدرجة متحركة */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br", cardGradient,
        "opacity-0 group-hover:opacity-10 transition-all duration-500 animate-shimmer"
      )} />
      
      {/* تأثير الضوء المتحرك */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
      
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 relative z-10">
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br shadow-lg",
          cardGradient,
          "group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 animate-pulse-glow"
        )}>
          <Icon className="h-5 w-5 text-white drop-shadow-sm" />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className={cn(
          "text-4xl font-bold bg-gradient-to-br text-shadow",
          cardGradient,
          "bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300"
        )}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              trend.isPositive 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            )}>
              <span className={cn(
                "transition-transform duration-300",
                trend.isPositive ? 'group-hover:translate-y-[-2px]' : 'group-hover:translate-y-[2px]'
              )}>
                {trend.isPositive ? '↗' : '↘'}
              </span>
              {Math.abs(trend.value)}%
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">من الشهر الماضي</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
