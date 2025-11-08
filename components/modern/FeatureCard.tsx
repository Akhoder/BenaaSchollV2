'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: 'primary' | 'accent' | 'success' | 'info';
  variant?: 'default' | 'glass' | 'gradient';
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  title,
  description,
  color = 'primary',
  variant = 'default'
}) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border-primary/20',
    accent: 'text-accent bg-accent/10 border-accent/20',
    success: 'text-success bg-success/10 border-success/20',
    info: 'text-info bg-info/10 border-info/20'
  };

  const variantClasses = {
    default: 'card-interactive',
    glass: 'glass-card',
    gradient: 'card-featured'
  };

  return (
    <div className={`group ${variantClasses[variant]}`}>
      {/* Icon */}
      <div className={`inline-flex p-3 rounded-xl ${colorClasses[color]} mb-4 transition-transform group-hover:scale-110`}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-heading font-bold mb-3 text-foreground">
        {title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Hover Effect Line */}
      <div className="mt-4 h-1 w-0 bg-gradient-to-r from-primary to-accent rounded-full group-hover:w-full transition-all duration-500" />
    </div>
  );
};

export default FeatureCard;

