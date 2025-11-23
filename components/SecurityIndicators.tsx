'use client';

import { Shield, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Security Indicators Component
 * Phase 3 UX Improvement: Trust and Security
 * Displays security and trust indicators to users
 */

interface SecurityIndicatorProps {
  variant?: 'https' | 'verified' | 'secure' | 'warning';
  className?: string;
}

export function SecurityIndicator({ variant = 'https', className }: SecurityIndicatorProps) {
  const variants = {
    https: {
      icon: Lock,
      label: 'HTTPS',
      description: 'Secure connection',
      color: 'bg-success/10 text-success border-success/30',
    },
    verified: {
      icon: CheckCircle2,
      label: 'Verified',
      description: 'Verified account',
      color: 'bg-success/10 text-success border-success/30',
    },
    secure: {
      icon: Shield,
      label: 'Secure',
      description: 'Your data is protected',
      color: 'bg-primary/10 text-primary border-primary/30',
    },
    warning: {
      icon: AlertTriangle,
      label: 'Warning',
      description: 'Please verify',
      color: 'bg-warning/10 text-warning border-warning/30',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5',
        config.color,
        className
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{config.label}</span>
    </Badge>
  );
}

interface SecurityBannerProps {
  className?: string;
}

export function SecurityBanner({ className }: SecurityBannerProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg',
      className
    )}>
      <Lock className="h-4 w-4 text-primary" />
      <span className="text-sm text-muted-foreground">
        Your connection is secure and encrypted
      </span>
    </div>
  );
}

interface PrivacyNoticeProps {
  onAccept?: () => void;
  className?: string;
}

export function PrivacyNotice({ onAccept, className }: PrivacyNoticeProps) {
  return (
    <div className={cn(
      'p-4 bg-muted/50 border border-border rounded-lg space-y-3',
      className
    )}>
      <div className="flex items-start gap-3">
        <Shield className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-sm">Privacy & Security</h4>
          <p className="text-xs text-muted-foreground">
            We use encryption to protect your data. Your information is never shared with third parties.
          </p>
        </div>
      </div>
      {onAccept && (
        <button
          onClick={onAccept}
          className="text-xs text-primary hover:underline"
        >
          Learn more about our privacy policy
        </button>
      )}
    </div>
  );
}

