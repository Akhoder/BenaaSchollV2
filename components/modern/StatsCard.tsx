'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'info';
  description?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'primary',
  description
}) => {
  const colorClasses = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/20',
      gradient: 'from-primary/20 to-primary/5'
    },
    accent: {
      bg: 'bg-accent/10',
      text: 'text-accent',
      border: 'border-accent/20',
      gradient: 'from-accent/20 to-accent/5'
    },
    success: {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/20',
      gradient: 'from-success/20 to-success/5'
    },
    warning: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/20',
      gradient: 'from-warning/20 to-warning/5'
    },
    info: {
      bg: 'bg-info/10',
      text: 'text-info',
      border: 'border-info/20',
      gradient: 'from-info/20 to-info/5'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className="card-interactive group overflow-hidden">
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-foreground">
              {value}
            </h3>
          </div>
          
          <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border transition-transform group-hover:scale-110`}>
            <Icon className={`w-6 h-6 ${colors.text}`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2">
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-success' : 'text-error'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
          
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;

