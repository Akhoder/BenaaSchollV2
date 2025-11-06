'use client';

import React from 'react';

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  description?: string;
  align?: 'left' | 'center' | 'right';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  subtitle,
  description,
  align = 'center'
}) => {
  const alignClasses = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  };

  return (
    <div className={`flex flex-col gap-4 mb-12 ${alignClasses[align]}`}>
      {/* Badge */}
      {badge && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium animate-fade-in-down">
          <span className="text-sm">{badge}</span>
        </div>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm font-medium text-primary uppercase tracking-wider animate-fade-in-down delay-100">
          {subtitle}
        </p>
      )}

      {/* Title */}
      <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold animate-fade-in-down delay-200">
        <span className="text-gradient">{title}</span>
      </h2>

      {/* Description */}
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed animate-fade-in-down delay-300">
          {description}
        </p>
      )}

      {/* Decorative Line */}
      <div className="h-1 w-20 bg-gradient-to-r from-primary to-accent rounded-full animate-fade-in-down delay-500" />
    </div>
  );
};

export default SectionHeader;

