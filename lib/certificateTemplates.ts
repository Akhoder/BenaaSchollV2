export type CertificateTemplate = 'classic' | 'modern' | 'royal';

export function getCertificateTemplateCSS(
  template: CertificateTemplate = 'classic',
  opts?: { royalGold?: string; royalBgTint?: string }
): string {
  if (template === 'modern') {
    return `
      #pdf-root .cert-template-modern {
        background: linear-gradient(135deg, #fafafa 0%, #ffffff 40%, #fafafa 100%);
        border: 6px solid #fbbf24; /* amber-400 */
        border-radius: 20px;
        box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        position: relative;
      }
      #pdf-root .cert-template-modern .cert-header-ribbon {
        width: 100%;
        height: 8px;
        background: linear-gradient(90deg, #0ea5e9, #10b981);
        border-radius: 9999px;
        margin: 8px 0 24px 0;
      }
      #pdf-root .score-card {
        background: #ffffff;
        border: 2px solid #3B82F6; /* blue-500 */
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        box-shadow: none;
      }
      #pdf-root .score-label { font-size: 14px; color: #111827; opacity: 0.9; }
      #pdf-root .score-value { font-size: 40px; font-weight: 800; line-height: 1.2; color: #111827; }
      #pdf-root .score-grade { font-size: 24px; font-weight: 700; color: #111827; }
    `;
  }
  if (template === 'royal') {
    const gold = opts?.royalGold || '#d4af37';
    const tint = opts?.royalBgTint || '#fffaf0';
    const dot = '%23f3e8d2';
    return `
      #pdf-root .cert-template-royal {
        background: radial-gradient(circle at 20% 20%, #fffdf5, ${tint} 40%, #fffdf7), url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><defs><pattern id=\"p\" width=\"20\" height=\"20\" patternUnits=\"userSpaceOnUse\"><circle cx=\"1\" cy=\"1\" r=\"1\" fill=\"${dot}\"/></pattern></defs><rect width=\"100%\" height=\"100%\" fill=\"url(%23p)\"/></svg>');
        border: 12px double ${gold};
        border-radius: 24px;
        position: relative;
        box-shadow: 0 16px 40px rgba(0,0,0,0.10);
      }
      #pdf-root .cert-template-royal:before, #pdf-root .cert-template-royal:after {
        content: '';
        position: absolute; inset: 18px;
        border: 1px solid ${gold}99;
        border-radius: 16px;
        pointer-events: none;
      }
      #pdf-root .cert-template-royal .cert-header-ribbon {
        width: 100%; height: 10px; margin: 10px 0 28px 0; border-radius: 9999px;
        background: linear-gradient(90deg, #b45309, #d97706, #f59e0b);
      }
      #pdf-root .score-card {
        background: #ffffff;
        border: 2px solid #3B82F6;
        border-radius: 12px;
        padding: 24px;
        text-align: center;
        box-shadow: none;
      }
      #pdf-root .score-label { font-size: 14px; color: #111827; opacity: 0.9; }
      #pdf-root .score-value { font-size: 40px; font-weight: 800; line-height: 1.2; color: #111827; }
      #pdf-root .score-grade { font-size: 24px; font-weight: 700; color: #111827; }
    `;
  }
  // classic
  return `
    #pdf-root .cert-template-classic {
      background: #fffef8;
      border: 10px double #eab308; /* amber-500 */
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
      position: relative;
    }
    #pdf-root .cert-template-classic:before {
      content: '';
      position: absolute; inset: 16px;
      border: 1px solid #f59e0b; /* amber-600 */
      border-radius: 10px;
      pointer-events: none;
    }
    #pdf-root .score-card {
      background: #ffffff;
      border: 2px solid #3B82F6;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      box-shadow: none;
    }
    #pdf-root .score-label { font-size: 14px; color: #111827; opacity: 0.9; }
    #pdf-root .score-value { font-size: 40px; font-weight: 800; line-height: 1.2; color: #111827; }
    #pdf-root .score-grade { font-size: 24px; font-weight: 700; color: #111827; }
  `;
}

