'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  gradient?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl p-6 md:p-8 mb-6 animate-fade-in-down",
      "bg-card/80 backdrop-blur-sm",
      "border border-primary/15",
      "shadow-lg shadow-primary/5",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-l from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            {/* Icon with gradient */}
            <div className="p-3 md:p-4 bg-gradient-to-br from-primary to-primary-dark rounded-xl shadow-lg shadow-primary/20">
              <Icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>

            {/* Text */}
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                {title}
              </h1>
              {description && (
                <p className="text-sm md:text-base text-muted-foreground mt-1 max-w-xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {children && (
            <div className="flex gap-3 flex-wrap">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-l from-transparent via-primary/30 to-transparent" />
    </div>
  );
}
