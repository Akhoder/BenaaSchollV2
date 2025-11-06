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
  const statusColors = {
    success: {
      gradient: 'from-success to-success/80',
      bg: 'bg-success/10',
      text: 'text-success'
    },
    warning: {
      gradient: 'from-warning to-warning/80',
      bg: 'bg-warning/10',
      text: 'text-warning'
    },
    error: {
      gradient: 'from-error to-error/80',
      bg: 'bg-error/10',
      text: 'text-error'
    },
    info: {
      gradient: 'from-info to-info/80',
      bg: 'bg-info/10',
      text: 'text-info'
    }
  };

  const colors = statusColors[status];

  if (loading) {
    return (
      <Card className="card-interactive">
        <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
          <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
          <div className="h-12 w-12 bg-muted rounded-xl animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-10 w-20 bg-muted rounded animate-pulse mb-2"></div>
          <div className="h-3 w-24 bg-muted rounded animate-pulse"></div>
          {progress !== undefined && (
            <div className="mt-3 h-2 bg-muted rounded animate-pulse"></div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-featured group">
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
          colors.gradient
        )}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="text-4xl font-bold text-foreground">
          {value}
        </div>
        
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التقدم</span>
              <span className={cn("font-medium", colors.text)}>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {trend && (
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
              trend.isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">{trend.period}</span>
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
    success: {
      icon: 'bg-gradient-to-br from-success to-success/80',
      bg: 'bg-success/5 hover:bg-success/10',
      text: 'text-success'
    },
    warning: {
      icon: 'bg-gradient-to-br from-warning to-warning/80',
      bg: 'bg-warning/5 hover:bg-warning/10',
      text: 'text-warning'
    },
    error: {
      icon: 'bg-gradient-to-br from-error to-error/80',
      bg: 'bg-error/5 hover:bg-error/10',
      text: 'text-error'
    },
    info: {
      icon: 'bg-gradient-to-br from-info to-info/80',
      bg: 'bg-info/5 hover:bg-info/10',
      text: 'text-info'
    }
  };

  const colors = typeColors[type];

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:shadow-md border border-border",
      colors.bg
    )}>
      {Icon && (
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shadow-lg flex-shrink-0",
          colors.icon
        )}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{time}</p>
      </div>
    </div>
  );
}
