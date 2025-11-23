'use client';

import CertificateViewClient from './CertificateViewClient';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, Download, Award } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import * as api from '@/lib/supabase';
import type { Certificate } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getCertificateTemplateCSS } from '@/lib/certificateTemplates';

export const dynamic = 'force-static';


export default function CertificateViewPage() {
  const params = useParams();
  const router = useRouter();
  const certificateId = (params?.certificateId as string) || '';
  const { profile, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [principalName, setPrincipalName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<'classic' | 'modern' | 'royal'>((typeof window !== 'undefined' && (localStorage.getItem('cert_template') as any)) || 'classic');
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [signatureSrc, setSignatureSrc] = useState<string | null>(null);
  const [stampSrc, setStampSrc] = useState<string | null>(null);
  const [branding, setBranding] = useState<{ watermark_enabled?: boolean; watermark_opacity?: number; watermark_use_logo?: boolean; watermark_use_stamp?: boolean; royal_gold?: string; royal_bg_tint?: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !profile) {
      router.push('/login');
      return;
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (certificateId) {
      void loadCertificate();
    }
  }, [certificateId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('branding_settings').select('*').eq('id', 1).single();
        if (data) {
          if (data.template && (['classic','modern','royal'] as any).includes(data.template)) {
            setTemplate(data.template);
          }
          if (data.logo_url) setLogoSrc(data.logo_url);
          if (data.signature_url) setSignatureSrc(data.signature_url);
          if (data.stamp_url) setStampSrc(data.stamp_url);
          // store watermark/palette in dataset for later use
          const b = {
            royal_gold: data.royal_gold,
            royal_bg_tint: data.royal_bg_tint,
            watermark_enabled: data.watermark_enabled,
            watermark_opacity: data.watermark_opacity,
            watermark_use_logo: data.watermark_use_logo,
            watermark_use_stamp: data.watermark_use_stamp,
          };
          setBranding(b);
          (window as any).__branding = b;
        }
      } catch {}
    })();
  }, []);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      
      // Load certificate
      const { data: cert, error } = await api.fetchCertificateById(certificateId);
      if (error || !cert) {
        console.error(error);
        toast.error('Error loading certificate');
        router.push('/dashboard');
        return;
      }

      // Check permissions
      if (profile?.role === 'student' && cert.status !== 'published') {
        toast.error('Certificate not available');
        router.push('/dashboard');
        return;
      }

      if (profile?.role === 'student' && cert.student_id !== profile.id) {
        toast.error('Unauthorized');
        router.push('/dashboard');
        return;
      }

      setCertificate(cert);

      // Load student name
      const { data: student } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', cert.student_id)
        .single();
      
      if (student) {
        setStudentName(student.full_name);
      }

      // Load subject name
      const { data: subject } = await supabase
        .from('class_subjects')
        .select('subject_name')
        .eq('id', cert.subject_id)
        .single();
      
      if (subject) {
        setSubjectName(subject.subject_name);
      }

      // Load teacher name
      if (cert.teacher_id) {
        const { data: teacher } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', cert.teacher_id)
          .single();
        
        if (teacher) {
          setTeacherName(teacher.full_name);
        }
      }

      // Load principal name (admin)
      const { data: principal } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('role', 'admin')
        .limit(1)
        .single();
      
      if (principal) {
        setPrincipalName(principal.full_name);
      }

      // Load template from branding settings
      const { data } = await supabase
        .from('branding_settings')
        .select('template')
        .single();
      
      if (data) {
        if (data.template && (['classic','modern','royal'] as any).includes(data.template)) {
          setTemplate(data.template);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading certificate');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!certificateRef.current) {
      toast.error('Error generating PDF');
      return;
    }

    try {
      setDownloading(true);
      
      // A4 dimensions in pixels at 96 DPI
      const DPI = 96;
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const A4_WIDTH_PX = Math.round((A4_WIDTH_MM / 25.4) * DPI);  // ~794px
      const A4_HEIGHT_PX = Math.round((A4_HEIGHT_MM / 25.4) * DPI); // ~1123px

      // Create an offscreen root and an A4-sized page
      const root = document.createElement('div');
      root.id = 'pdf-root';
      root.style.position = 'fixed';
      root.style.left = '-10000px';
      root.style.top = '0';
      root.style.width = `${A4_WIDTH_PX}px`;
      root.style.height = `${A4_HEIGHT_PX}px`;
      root.style.background = '#ffffff';
      root.style.display = 'flex';
      root.style.alignItems = 'center';
      root.style.justifyContent = 'center';
      root.style.boxSizing = 'border-box';

      const page = document.createElement('div');
      page.style.width = `${A4_WIDTH_PX}px`;
      page.style.height = `${A4_HEIGHT_PX}px`;
      page.style.background = '#ffffff';
      page.style.display = 'flex';
      page.style.alignItems = 'center';
      page.style.justifyContent = 'center';
      page.style.overflow = 'hidden';
      page.style.boxSizing = 'border-box';

      // Clone the certificate into the page and scale to fit with padding
      const clone = certificateRef.current.cloneNode(true) as HTMLElement;
      clone.setAttribute('dir', 'rtl');
      clone.setAttribute('lang', 'ar');
      clone.style.margin = '0';
      // keep template borders/shadows intact to match on-screen appearance
      clone.style.boxSizing = 'border-box';
      // Enforce Arabic-friendly text rendering
      clone.style.fontFamily = "Cairo, system-ui, sans-serif";
      clone.style.letterSpacing = 'normal';
      clone.style.wordSpacing = 'normal';
      clone.style.unicodeBidi = 'isolate-override';
      clone.style.direction = 'rtl';

      // Disable gradient text (can break Arabic shaping in rasterization)
      const gradientNodes = clone.querySelectorAll<HTMLElement>('.text-gradient, [style*="background-clip: text"], [style*="-webkit-background-clip: text"]');
      gradientNodes.forEach((el) => {
        el.style.background = 'none';
        el.style.backgroundImage = 'none';
        (el.style as any).webkitBackgroundClip = 'initial';
        (el.style as any).backgroundClip = 'initial';
        (el.style as any).webkitTextFillColor = '#111827';
        el.style.color = '#111827';
        el.style.letterSpacing = '0';
      });

      // Target likely problematic elements and enforce Cairo font
      const problematicSelectors = [
        'h2', // شهادة إتمام
        '.text-3xl.font-display.font-bold', // student name
        '.text-lg.font-display.font-semibold', // names, titles
      ];
      problematicSelectors.forEach((sel) => {
        clone.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          el.style.fontFamily = "Cairo, system-ui, sans-serif";
          el.style.letterSpacing = 'normal';
          el.style.wordSpacing = 'normal';
          el.style.textTransform = 'none';
        });
      });


      page.appendChild(clone);
      root.appendChild(page);

      // Inject fonts for the clone
      const style = document.createElement('style');
      style.textContent = `
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-variant-ligatures: normal; -webkit-font-feature-settings: 'liga' 1, 'calt' 1; font-feature-settings: 'liga' 1, 'calt' 1; }
        [dir="rtl"], [lang="ar"] { direction: rtl !important; text-align: right !important; }
        h1, h2, h3, .font-display { font-family: 'Cairo', system-ui, sans-serif !important; letter-spacing: normal; }
        p, span, div { letter-spacing: normal; word-spacing: normal; }
      `;
      root.appendChild(style);
      // Ensure Arabic fonts are available globally (in <head>)
      const ensureFontLink = (id: string, href: string) => {
        let link = document.getElementById(id) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement('link');
          link.id = id;
          link.rel = 'stylesheet';
          link.href = href;
          document.head.appendChild(link);
        }
      };
      ensureFontLink('pdf-fonts-cairo', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');

      // Apply template CSS and class
      const templateCSS = getCertificateTemplateCSS(template, { royalGold: branding.royal_gold, royalBgTint: branding.royal_bg_tint });
      const templateStyle = document.createElement('style');
      templateStyle.textContent = templateCSS;
      root.appendChild(templateStyle);
      clone.classList.add(template === 'modern' ? 'cert-template-modern' : template === 'royal' ? 'cert-template-royal' : 'cert-template-classic');

      // Ensure score value and grade are present and visible
      const ensureText = (selector: string, text: string) => {
        const el = clone.querySelector(selector) as HTMLElement | null;
        if (el) {
          if (!el.textContent || el.textContent.trim().length === 0) {
            el.textContent = text;
          }
          el.style.color = '#111827';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
          el.style.filter = 'none';
          (el.style as any).webkitTextFillColor = '#111827';
        }
      };
      ensureText('.score-value', `${(certificate?.final_score ?? 0).toFixed(1)} / 100`);
      ensureText('.score-grade', `${certificate?.grade ?? ''}`);

      // Watermark (export only)
      if (branding.watermark_enabled) {
        const wmImgSrc = branding.watermark_use_logo && logoSrc ? logoSrc : (branding.watermark_use_stamp && stampSrc ? stampSrc : null);
        if (wmImgSrc) {
          const wm = document.createElement('img');
          wm.src = wmImgSrc;
          wm.style.position = 'absolute';
          wm.style.left = '50%';
          wm.style.top = '50%';
          wm.style.transform = 'translate(-50%, -50%)';
          wm.style.opacity = String(branding.watermark_opacity ?? 0.08);
          wm.style.pointerEvents = 'none';
          wm.style.zIndex = '0';
          wm.style.maxWidth = '60%';
          wm.style.filter = 'grayscale(20%)';
          clone.appendChild(wm);
        }
      }

      // Ensure score card exists and is visible in clone
      const cloneScoreRoot = clone.querySelector('[data-score-root="1"]') as HTMLElement | null;
      if (cloneScoreRoot && !cloneScoreRoot.querySelector('.score-card')) {
        const sc = document.createElement('div');
        sc.className = 'score-card inline-block';
        sc.style.background = '#ffffff';
        sc.style.border = '2px solid #3B82F6';
        sc.style.borderRadius = '12px';
        sc.style.padding = '24px';
        sc.style.textAlign = 'center';
        const label = document.createElement('div');
        label.className = 'score-label mb-2';
        label.textContent = ((t('finalScore') as any) || 'العلامة النهائية:') as string;
        label.style.fontSize = '14px';
        label.style.color = '#111827';
        label.style.opacity = '0.9';
        const value = document.createElement('div');
        value.className = 'score-value font-display';
        value.textContent = `${(certificate?.final_score ?? 0).toFixed(1)} / 100`;
        value.style.fontSize = '40px';
        value.style.fontWeight = '800';
        value.style.lineHeight = '1.2';
        value.style.color = '#111827';
        const grade = document.createElement('div');
        grade.className = 'score-grade font-display mt-2';
        grade.textContent = `${certificate?.grade ?? ''}`;
        grade.style.fontSize = '24px';
        grade.style.fontWeight = '700';
        grade.style.color = '#111827';
        sc.appendChild(label);
        sc.appendChild(value);
        sc.appendChild(grade);
        cloneScoreRoot.appendChild(sc);
      }

      document.body.appendChild(root);

      // Wait for layout and fonts
      await new Promise((r) => setTimeout(r, 300));
      await document.fonts.ready;
      
      const cloneRect = clone.getBoundingClientRect();
      const pad = 0; // maximize content area
      const widthScale = (A4_WIDTH_PX - pad * 2) / cloneRect.width;
      const heightScale = (A4_HEIGHT_PX - pad * 2) / cloneRect.height;
      let scale = widthScale; // prefer fitting width to reduce side margins
      if (cloneRect.height * scale > (A4_HEIGHT_PX - pad * 2)) {
        scale = Math.min(widthScale, heightScale);
      }
      clone.style.transform = `scale(${scale})`;
      clone.style.transformOrigin = 'center center';
      clone.style.unicodeBidi = 'plaintext';
      clone.style.textRendering = 'optimizeLegibility';
      clone.style.letterSpacing = 'normal';
      clone.style.wordSpacing = 'normal';

      // Render page to canvas with stable settings
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(page, {
        scale: 2, // stable high quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        windowWidth: A4_WIDTH_PX,
        windowHeight: A4_HEIGHT_PX,
      });

      // Clean up the offscreen DOM
      if (root && root.parentNode) {
        root.parentNode.removeChild(root);
      }

      // Create and save the PDF
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 1.0);
      pdf.addImage(imgData, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
      const filename = `Certificate-${certificate?.certificate_number || 'cert'}-${Date.now()}.pdf`;
      pdf.save(filename);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!certificate) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {(t('certificateNotFound') as any) || 'Certificate not found'}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in print:space-y-0">
        {mounted && (
          (() => {
            const css = getCertificateTemplateCSS(template, { royalGold: branding.royal_gold, royalBgTint: branding.royal_bg_tint });
            const liveCss = css.replaceAll('#pdf-root ', '');
            return <style>{liveCss}</style>;
          })()
        )}
        {/* Actions */}
        <div className="flex items-center justify-between pt-1 print:hidden">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {(t('back') as any) || 'Back'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {(t('print') as any) || 'Print'}
            </Button>
            <Button 
              className="btn-gradient" 
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {(t('downloading') as any) || 'Downloading...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {(t('download') as any) || 'Download PDF'}
                </>
              )}
            </Button>
            {(profile?.role === 'admin' || profile?.role === 'teacher') && (
              <div className="hidden md:flex items-center gap-1 mr-2">
                <Button variant={template==='classic' ? 'default' : 'outline'} size="sm" onClick={() => setTemplate('classic')}>Classic</Button>
                <Button variant={template==='modern' ? 'default' : 'outline'} size="sm" onClick={() => setTemplate('modern')}>Modern</Button>
                <Button variant={template==='royal' ? 'default' : 'outline'} size="sm" onClick={() => setTemplate('royal')}>Royal</Button>
              </div>
            )}
          </div>
        </div>

        {/* Certificate */}
        <div className="max-w-4xl mx-auto">
          <div 
            ref={certificateRef}
            className={`${template==='modern' ? 'cert-template-modern' : template==='royal' ? 'cert-template-royal' : 'cert-template-classic'} relative rounded-lg shadow-2xl p-12 print:p-16 print:shadow-none`}
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}
          >
            {branding?.watermark_enabled && (
              (() => {
                const wmImgSrc = (branding?.watermark_use_logo && logoSrc) ? logoSrc : ((branding?.watermark_use_stamp && stampSrc) ? stampSrc : null);
                return wmImgSrc ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
                    <img src={wmImgSrc} alt="wm" style={{ opacity: branding?.watermark_opacity ?? 0.08, maxWidth: '60%', filter: 'grayscale(20%)' }} />
                  </div>
                ) : null;
              })()
            )}
            {/* Header */}
            <div className="text-center mb-8 print:mb-12">
              <div className="flex items-center justify-center mb-4">
                <Award className="h-16 w-16 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-4xl font-display font-bold text-gradient mb-2 print:text-5xl">
                {(t('appName') as any) || 'Madrasat Al-Binaa Al-Ilmi'}
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 print:text-xl">
                {(t('schoolLocation') as any) || 'Al-Beddawi - Tripoli'}
              </p>
              <div className="mt-6 pt-6 border-t-2 border-amber-400 dark:border-amber-600">
                <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-200 print:text-4xl">
                  {(t('certificateOfCompletion') as any) || 'شهادة إتمام'}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-6 mb-8 print:mb-12">
              <div className="text-center">
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-4 print:text-xl">
                  {(t('certificateText') as any) || 'هذه الشهادة تمنح إلى:'}
                </p>
                <p className="text-3xl font-display font-bold text-gradient mb-8 print:text-4xl">
                  {studentName}
                </p>
              </div>

              <div className="text-center space-y-4 print:space-y-6">
                <div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-2 print:text-xl">
                    {(t('forCompletionOf') as any) || 'لإتمامه/إتمامها مادة:'}
                  </p>
                  <p className="text-2xl font-display font-semibold text-slate-800 dark:text-slate-200 print:text-3xl">
                    {subjectName}
                  </p>
                </div>

                <div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-2 print:text-xl">
                    {(t('teacher') as any) || 'أستاذ المادة:'}
                  </p>
                  <p className="text-xl font-display font-semibold text-slate-700 dark:text-slate-300 print:text-2xl">
                    {teacherName || '-'}
                  </p>
                </div>

                <div className="mt-8 print:mt-12" data-score-root="1" style={{ position: 'relative' }}>
                  <div className="score-card inline-block" style={{ background: 'rgba(255,255,255,0.98)', border: '2px solid #3B82F6', borderRadius: 12, padding: 24, textAlign: 'center', position: 'relative', zIndex: 2 }}>
                    <p className="score-label mb-2" style={{ fontSize: 14, color: '#111827', opacity: 0.9 }}>
                      {(t('finalScore') as any) || 'العلامة النهائية:'}
                    </p>
                    <p className="score-value font-display" style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.2, color: '#111827' }}>
                      {certificate.final_score.toFixed(1)} / 100
                    </p>
                    <p className="score-grade font-display mt-2" style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                      {certificate.grade}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t-2 border-amber-400 dark:border-amber-600 print:mt-16 print:pt-12">
              <div className="grid grid-cols-2 gap-8 print:gap-12">
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 print:text-base">
                    {(t('certificateNumber') as any) || 'رقم الشهادة:'}
                  </p>
                  <p className="text-lg font-mono font-semibold text-slate-700 dark:text-slate-300 print:text-xl">
                    {certificate.certificate_number}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 print:text-base">
                    {new Date(certificate.completion_date).toLocaleDateString('ar-LB', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 print:text-base print:mb-12">
                    {(t('principalSignature') as any) || 'توقيع مدير المدرسة'}
                  </p>
                  <div className="border-t-2 border-slate-700 dark:border-slate-300 pt-2 print:border-t-4">
                    <p className="text-lg font-display font-semibold text-slate-800 dark:text-slate-200 print:text-xl">
                      {principalName || '-'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 print:text-base">
                      {(t('principal') as any) || 'مدير المدرسة'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { height: auto; margin: 0; padding: 0; }
          body { background: white; }
          /* Hide everything except print root */
          body > *:not(#print-root) { display: none !important; }
          #print-root { display: block !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
