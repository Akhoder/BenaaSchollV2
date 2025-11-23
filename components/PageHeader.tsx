'use client';

import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  gradient?: string; // tailwind gradient stops classes e.g. "from-indigo-600 via-purple-600 to-indigo-700"
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
  gradient
}: PageHeaderProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl p-8 mb-8 animate-fade-in-down",
      "glass-card-gradient",
      className
    )}>
      {/* Background Orbs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float delay-500" />

      {/* Dots Pattern */}
      <div className="absolute inset-0 bg-dots opacity-20" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="relative group">
              <div className="absolute inset-0 bg-primary rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative p-4 bg-primary rounded-2xl">
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Text */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  {title}
                </h1>
                <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              </div>
              {description && (
                <p className="text-lg text-muted-foreground max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {children && (
            <div className="flex gap-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
