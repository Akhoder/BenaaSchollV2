'use client';

import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CTASectionProps {
  title: string;
  description: string;
  primaryCTA: {
    text: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    onClick?: () => void;
  };
  variant?: 'gradient' | 'solid' | 'glass';
}

export const CTASection: React.FC<CTASectionProps> = ({
  title,
  description,
  primaryCTA,
  secondaryCTA,
  variant = 'gradient'
}) => {
  const variantClasses = {
    gradient: 'bg-gradient-to-br from-primary via-primary/90 to-accent',
    solid: 'bg-primary',
    glass: 'glass-card'
  };

  const textColor = variant === 'glass' ? 'text-foreground' : 'text-white';

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className={`
          relative overflow-hidden rounded-3xl p-8 md:p-12 lg:p-16
          ${variantClasses[variant]}
        `}>
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-pattern-dots opacity-10" />
          
          {/* Animated Background Orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-float delay-700" />

          {/* Content */}
          <div className="relative z-10 text-center max-w-3xl mx-auto">
            {/* Icon */}
            <div className="inline-flex p-3 rounded-full bg-white/10 backdrop-blur-sm mb-6 animate-bounce-in">
              <Sparkles className={`w-8 h-8 ${variant === 'glass' ? 'text-primary' : 'text-white'}`} />
            </div>

            {/* Title */}
            <h2 className={`text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-6 ${textColor} animate-fade-in-up`}>
              {title}
            </h2>

            {/* Description */}
            <p className={`text-lg md:text-xl mb-8 ${
              variant === 'glass' 
                ? 'text-muted-foreground' 
                : 'text-white/90'
            } max-w-2xl mx-auto animate-fade-in-up delay-200`}>
              {description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
              <Button
                size="lg"
                className={variant === 'glass' ? 'btn-gradient' : 'bg-white text-primary hover:bg-white/90'}
                onClick={primaryCTA.onClick}
              >
                {primaryCTA.text}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>

              {secondaryCTA && (
                <Button
                  size="lg"
                  variant="outline"
                  className={variant === 'glass' ? 'btn-outline' : 'border-white text-white hover:bg-white/10'}
                  onClick={secondaryCTA.onClick}
                >
                  {secondaryCTA.text}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

