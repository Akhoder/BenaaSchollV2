'use client';

import { useEffect } from 'react';

/**
 * ✅ PWA: Component to add additional meta tags for PWA support
 * Next.js 13+ doesn't support <head> in layout, so we use this component
 */
export function PWAMetaTags() {
  useEffect(() => {
    // Add meta tags dynamically
    const addMetaTag = (name: string, content: string, attribute: string = 'name') => {
      if (typeof document === 'undefined') return;
      
      // Check if meta tag already exists
      const existing = document.querySelector(`meta[${attribute}="${name}"]`);
      if (existing) return;
      
      const meta = document.createElement('meta');
      meta.setAttribute(attribute, name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    };

    const addLinkTag = (rel: string, href: string, sizes?: string) => {
      if (typeof document === 'undefined') return;
      
      // Check if link tag already exists
      const existing = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ''}`);
      if (existing) return;
      
      const link = document.createElement('link');
      link.setAttribute('rel', rel);
      link.setAttribute('href', href);
      if (sizes) {
        link.setAttribute('sizes', sizes);
      }
      document.head.appendChild(link);
    };

    // ✅ PWA: iOS meta tags
    addMetaTag('apple-mobile-web-app-capable', 'yes');
    addMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    addMetaTag('apple-mobile-web-app-title', 'مدرسة البناء العلمي');
    addLinkTag('apple-touch-icon', '/icons/icon-144x144.png');
    addLinkTag('apple-touch-icon', '/icons/icon-144x144.png', '144x144');

    // ✅ PWA: Android meta tags
    addMetaTag('mobile-web-app-capable', 'yes');
    addMetaTag('application-name', 'مدرسة البناء العلمي');

    // ✅ PWA: Theme color
    addMetaTag('theme-color', '#115E3C');
    addMetaTag('msapplication-TileColor', '#115E3C', 'name');
    addLinkTag('manifest', '/manifest.json');
  }, []);

  return null;
}
