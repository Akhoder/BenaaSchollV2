'use client';

import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingFeature {
  text: string;
  included: boolean;
  tooltip?: string;
}

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: PricingFeature[];
  popular?: boolean;
  ctaText?: string;
  onSelect?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period = 'شهرياً',
  description,
  features,
  popular = false,
  ctaText = 'اشترك الآن',
  onSelect
}) => {
  return (
    <div className={`relative ${
      popular 
        ? 'card-featured scale-105 shadow-2xl' 
        : 'card-interactive'
    } h-full flex flex-col`}>
      {/* Popular Badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-primary to-accent text-white px-4 py-1.5 shadow-lg">
            <Sparkles className="w-4 h-4 mr-1" />
            الأكثر شعبية
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-heading font-bold mb-2 text-foreground">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {description}
        </p>
        
        {/* Price */}
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-5xl font-bold text-gradient">
            {price}
          </span>
          <span className="text-lg text-muted-foreground">
            / {period}
          </span>
        </div>
      </div>

      {/* Features */}
      <div className="space-y-3 mb-8 flex-grow">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="flex items-start gap-3"
          >
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
              feature.included
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground'
            }`}>
              {feature.included ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </div>
            <span className={`text-sm ${
              feature.included 
                ? 'text-foreground' 
                : 'text-muted-foreground line-through'
            }`}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <Button
        className={popular ? 'btn-gradient w-full' : 'btn-outline w-full'}
        size="lg"
        onClick={onSelect}
      >
        {ctaText}
      </Button>
    </div>
  );
};

export default PricingCard;

