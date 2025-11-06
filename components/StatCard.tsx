'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  color?: 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
}

const colorConfig = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    glow: 'shadow-glow-primary',
  },
  accent: {
    bg: 'bg-accent/10',
    text: 'text-accent',
    glow: 'shadow-glow-accent',
  },
  secondary: {
    bg: 'bg-secondary/10',
    text: 'text-secondary',
    glow: 'shadow-glow-primary',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    glow: 'shadow-glow-primary',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    glow: 'shadow-glow-accent',
  },
  error: {
    bg: 'bg-error/10',
    text: 'text-error',
    glow: 'shadow-glow-accent',
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    glow: 'shadow-glow-primary',
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'primary',
  trend,
  loading = false,
  className
}: StatCardProps) {
  const config = colorConfig[color];

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-12 w-12 bg-muted rounded-2xl" />
          </div>
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "glass-card-hover p-6 group relative overflow-hidden",
      className
    )}>
      {/* Decorative Background */}
      <div className={cn(
        "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500",
        config.bg
      )} />

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {title}
          </h3>
          
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-2xl transition-all duration-300 group-hover:scale-110",
            config.bg
          )}>
            <Icon className={cn("w-6 h-6", config.text)} />
          </div>
        </div>

        {/* Value */}
        <div className={cn(
          "text-4xl font-bold font-display transition-all duration-300",
          config.text
        )}>
          {value}
        </div>

        {/* Description & Trend */}
        <div className="flex items-center justify-between">
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}

          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-error"
            )}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Border Glow */}
      <div className={cn(
        "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        "ring-1 ring-inset",
        color === 'primary' && "ring-primary/30",
        color === 'accent' && "ring-accent/30",
        color === 'secondary' && "ring-secondary/30",
        color === 'success' && "ring-success/30",
        color === 'warning' && "ring-warning/30",
        color === 'error' && "ring-error/30",
        color === 'info' && "ring-info/30"
      )} />
    </div>
  );
}

export default StatCard;
