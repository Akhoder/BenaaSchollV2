'use client';

import React from 'react';
import { Quote, Star } from 'lucide-react';

interface TestimonialCardProps {
  name: string;
  role: string;
  avatar?: string;
  content: string;
  rating?: number;
  date?: string;
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({
  name,
  role,
  avatar,
  content,
  rating = 5,
  date
}) => {
  return (
    <div className="card-interactive relative overflow-hidden h-full">
      {/* Quote Icon Background */}
      <div className="absolute -top-2 -right-2 w-20 h-20 text-primary/5">
        <Quote className="w-full h-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Rating */}
        {rating && (
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i}
                className={`w-4 h-4 ${
                  i < rating 
                    ? 'text-warning fill-warning' 
                    : 'text-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}

        {/* Testimonial Text */}
        <blockquote className="text-muted-foreground leading-relaxed mb-6 flex-grow">
          "{content}"
        </blockquote>

        {/* Author Info */}
        <div className="flex items-center gap-4 pt-4 border-t border-border mt-auto">
          {avatar ? (
            <img 
              src={avatar}
              alt={name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
              {name.charAt(0)}
            </div>
          )}
          
          <div className="flex-1">
            <div className="font-semibold text-foreground">
              {name}
            </div>
            <div className="text-sm text-muted-foreground">
              {role}
            </div>
          </div>

          {date && (
            <div className="text-xs text-muted-foreground">
              {date}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;

