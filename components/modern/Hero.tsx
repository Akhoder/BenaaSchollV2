'use client';

import React from 'react';
import { ArrowRight, BookOpen, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
  title: string;
  subtitle: string;
  description: string;
  primaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCTA?: {
    text: string;
    href: string;
    onClick?: () => void;
  };
  stats?: Array<{
    icon: React.ReactNode;
    value: string;
    label: string;
  }>;
}

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  description,
  primaryCTA,
  secondaryCTA,
  stats = []
}) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern-dots opacity-50" />
      
      {/* Gradient Mesh */}
      <div className="absolute inset-0 gradient-mesh" />

      {/* Content */}
      <div className="container relative mx-auto px-4 py-16 md:py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-8 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium animate-bounce-in delay-100">
              <Award className="w-4 h-4" />
              <span className="text-sm">{subtitle}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
              <span className="text-gradient">{title}</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              {description}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              {primaryCTA && (
                <Button
                  size="lg"
                  className="btn-gradient group"
                  onClick={primaryCTA.onClick}
                >
                  {primaryCTA.text}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
              
              {secondaryCTA && (
                <Button
                  size="lg"
                  variant="outline"
                  className="btn-outline"
                  onClick={secondaryCTA.onClick}
                >
                  {secondaryCTA.text}
                </Button>
              )}
            </div>

            {/* Stats */}
            {stats.length > 0 && (
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="text-center animate-fade-in-up"
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <div className="flex justify-center mb-2 text-primary">
                      {stat.icon}
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Image/Illustration */}
          <div className="relative animate-fade-in-up delay-200">
            <div className="relative z-10">
              {/* Floating Card 1 */}
              <div className="absolute -top-8 -right-8 glass-card animate-float">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">دورات تفاعلية</div>
                    <div className="text-xs text-muted-foreground">+1000 درس</div>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -bottom-8 -left-8 glass-card animate-float delay-300">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">طلاب نشطون</div>
                    <div className="text-xs text-muted-foreground">+5000 طالب</div>
                  </div>
                </div>
              </div>

              {/* Main Image Container */}
              <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 p-8">
                <div className="absolute inset-0 bg-pattern-grid opacity-30 rounded-2xl" />
                <div className="relative h-full w-full flex items-center justify-center">
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary to-accent opacity-20 animate-pulse-glow" />
                </div>
              </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl blur-3xl -z-10 animate-gradient" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

