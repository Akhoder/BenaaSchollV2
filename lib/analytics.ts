/**
 * Analytics and Performance Monitoring
 * Phase 3 UX Improvement: User Testing and Iteration
 * Provides analytics tracking and performance monitoring
 */

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4 (if configured)
  if (window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: path,
      page_title: title,
    });
  }

  // Custom analytics
  console.log('[Analytics] Page View:', { path, title, timestamp: new Date().toISOString() });
}

/**
 * Track event
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // Custom analytics
  console.log('[Analytics] Event:', {
    category,
    action,
    label,
    value,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track user action
 */
export function trackUserAction(action: string, details?: Record<string, any>) {
  trackEvent('user_action', action, undefined, undefined);
  
  if (details) {
    console.log('[Analytics] User Action Details:', details);
  }
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  trackEvent('error', error.name, error.message);
  
  console.error('[Analytics] Error:', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track performance metric
 */
export function trackPerformance(metric: string, value: number, unit: string = 'ms') {
  trackEvent('performance', metric, unit, value);
  
  console.log('[Analytics] Performance:', {
    metric,
    value,
    unit,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Web Vitals tracking
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: string;
}) {
  // Send to analytics
  trackPerformance(metric.name, metric.value, 'ms');
  
  // Log for debugging
  console.log('[Web Vitals]', metric);
}

/**
 * User feedback collection
 */
export function collectFeedback(
  type: 'rating' | 'comment' | 'bug' | 'feature',
  content: string,
  metadata?: Record<string, any>
) {
  trackEvent('feedback', type, content);
  
  console.log('[Feedback]', {
    type,
    content,
    metadata,
    timestamp: new Date().toISOString(),
  });
  
  // In production, send to your backend
  // await fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ type, content, metadata }) });
}

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

