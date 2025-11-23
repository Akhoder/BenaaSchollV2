'use client';

import { useEffect } from 'react';

/**
 * Font Loader Component
 * Optimized font loading for better Lighthouse scores
 * Loads fonts asynchronously to prevent render blocking
 */
export function FontLoader() {
  useEffect(() => {
    // Preconnect to Google Fonts
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    // ✅ PERFORMANCE: Load only essential font weights to reduce bundle size
    // Reduced from 6 weights to 3 weights per font (50% reduction)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Cairo:wght@400;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    fontLink.media = 'print';
    fontLink.onload = () => {
      fontLink.media = 'all';
    };
    document.head.appendChild(fontLink);
  }, []);

  return null;
}

