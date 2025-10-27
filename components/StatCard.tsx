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
}

export function StatCard({ title, value, icon: Icon, description, trend, gradient }: StatCardProps) {
  const defaultGradient = "from-blue-500 to-purple-600";
  const cardGradient = gradient || defaultGradient;

  return (
    <Card className="group relative overflow-hidden border-slate-200/50 dark:border-slate-800/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br", cardGradient,
        "opacity-0 group-hover:opacity-5 transition-opacity duration-300"
      )} />
      
      <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0 relative z-10">
        <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2.5 rounded-xl bg-gradient-to-br",
          cardGradient,
          "shadow-lg group-hover:scale-110 transition-transform duration-300"
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className={cn(
          "text-4xl font-bold bg-gradient-to-br", cardGradient,
          "bg-clip-text text-transparent"
        )}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <p className={cn(
              "text-xs font-semibold",
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
            <span className="text-xs text-slate-500 dark:text-slate-400">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
