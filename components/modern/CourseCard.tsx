'use client';

import React from 'react';
import { Clock, Users, BookOpen, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CourseCardProps {
  title: string;
  description: string;
  image?: string;
  duration: string;
  students: number;
  lessons: number;
  rating?: number;
  price?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  instructor?: {
    name: string;
    avatar?: string;
  };
  onEnroll?: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  title,
  description,
  image,
  duration,
  students,
  lessons,
  rating,
  price,
  level = 'beginner',
  category,
  instructor,
  onEnroll
}) => {
  const levelColors = {
    beginner: 'badge-success',
    intermediate: 'badge-warning',
    advanced: 'badge-error'
  };

  const levelLabels = {
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم'
  };

  return (
    <div className="card-interactive group overflow-hidden h-full flex flex-col">
      {/* Image */}
      <div className="relative h-48 overflow-hidden rounded-t-xl -m-6 mb-0">
        {image ? (
          <img 
            src={image} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-primary/40" />
          </div>
        )}
        
        {/* Overlay Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {category && (
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
              {category}
            </Badge>
          )}
          
          {level && (
            <Badge className={levelColors[level]}>
              {levelLabels[level]}
            </Badge>
          )}
        </div>

        {/* Rating */}
        {rating && (
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6">
        {/* Title */}
        <h3 className="text-xl font-heading font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2 flex-grow">
          {description}
        </p>

        {/* Instructor */}
        {instructor && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            {instructor.avatar ? (
              <img 
                src={instructor.avatar}
                alt={instructor.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">
                  {instructor.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {instructor.name}
            </span>
          </div>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-xs">{duration}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-xs">{students}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs">{lessons}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border mt-auto">
          {price && (
            <div className="text-2xl font-bold text-primary">
              {price}
            </div>
          )}
          
          <Button 
            className="btn-gradient flex-1"
            onClick={onEnroll}
          >
            التسجيل الآن
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;

