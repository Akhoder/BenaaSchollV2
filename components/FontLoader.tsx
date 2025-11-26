'use client';

import { useEffect } from 'react';

/**
 * Font Loader Component - Islamic Scholarly Edition
 * مُحمِّل الخطوط الإسلامية العلمية
 * 
 * Loads beautiful Arabic fonts optimized for Islamic educational content:
 * - Tajawal: Modern Arabic sans-serif for body text
 * - Amiri: Classical Naskh-style for headings and Quran
 * - Scheherazade New: Elegant for special decorative text
 */
export function FontLoader() {
  useEffect(() => {
    // Preconnect to Google Fonts for faster loading
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    // Load Islamic Scholarly Fonts
    // Tajawal - Clean modern Arabic (body text)
    // Amiri - Traditional Naskh (headings, Quranic text)
    // Scheherazade New - Elegant traditional (decorative)
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    fontLink.media = 'print';
    fontLink.onload = () => {
      fontLink.media = 'all';
      // Set CSS variables once fonts are loaded
      document.documentElement.style.setProperty('--font-tajawal', "'Tajawal', system-ui, sans-serif");
      document.documentElement.style.setProperty('--font-amiri', "'Amiri', Georgia, serif");
      document.documentElement.style.setProperty('--font-scheherazade', "'Scheherazade New', 'Amiri', serif");
    };
    document.head.appendChild(fontLink);

    // Cleanup function
    return () => {
      // Optional: cleanup links if component unmounts (usually not needed)
    };
  }, []);

  return null;
}
