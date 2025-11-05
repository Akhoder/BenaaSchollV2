'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as api from '@/lib/supabase';
import type { Certificate } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Printer, Download, ArrowLeft, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

  useEffect(() => {
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
      clone.style.border = 'none';
      clone.style.boxShadow = 'none';
      clone.style.boxSizing = 'border-box';
      // Enforce Arabic-friendly text rendering
      clone.style.fontFamily = "Almarai, Tajawal, system-ui, sans-serif";
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
          el.style.fontFamily = "Cairo, Almarai, Tajawal, system-ui, sans-serif";
          el.style.letterSpacing = 'normal';
          el.style.wordSpacing = 'normal';
          el.style.textTransform = 'none';
        });
      });

      // Force visibility for the score card content (inside the blue gradient box)
      const scoreCard = (clone.querySelector('.from-emerald-500.to-blue-500') as HTMLElement) 
        || (clone.querySelector('[class*="from-emerald-500"][class*="to-blue-500"]') as HTMLElement);
      if (scoreCard) {
        // Replace with a simple, raster-friendly layout
        scoreCard.style.background = '#ffffff';
        scoreCard.style.backgroundImage = 'none';
        scoreCard.style.border = '2px solid #3B82F6';
        scoreCard.style.opacity = '1';
        scoreCard.style.filter = 'none';
        scoreCard.style.mixBlendMode = 'normal';
        scoreCard.style.boxShadow = 'none';
        scoreCard.style.padding = '24px';
        scoreCard.style.borderRadius = '12px';
        scoreCard.style.display = 'flex';
        scoreCard.style.flexDirection = 'column';
        scoreCard.style.alignItems = 'center';
        scoreCard.style.justifyContent = 'center';
        scoreCard.style.gap = '8px';

        // Clear current content and rebuild
        scoreCard.innerHTML = '';

        const label = document.createElement('div');
        label.textContent = (t('finalScore') as any) || 'العلامة النهائية:';
        label.style.fontSize = '14px';
        label.style.color = '#111827';
        label.style.opacity = '1';
        label.style.fontFamily = "Cairo, Almarai, Tajawal, system-ui, sans-serif";

        const value = document.createElement('div');
        const scoreStr = `${(certificate?.final_score ?? 0).toFixed(1)} / 100`;
        value.textContent = scoreStr;
        value.style.fontSize = '40px';
        value.style.fontWeight = '800';
        value.style.lineHeight = '1.2';
        value.style.color = '#111827';
        value.style.fontFamily = "Cairo, Almarai, Tajawal, system-ui, sans-serif";

        const grade = document.createElement('div');
        grade.textContent = `${certificate?.grade ?? ''}`;
        grade.style.fontSize = '24px';
        grade.style.fontWeight = '700';
        grade.style.color = '#111827';
        grade.style.fontFamily = "Cairo, Almarai, Tajawal, system-ui, sans-serif";

        scoreCard.appendChild(label);
        scoreCard.appendChild(value);
        scoreCard.appendChild(grade);
      }

      page.appendChild(clone);
      root.appendChild(page);

      // Inject fonts for the clone
      const style = document.createElement('style');
      style.textContent = `
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; font-variant-ligatures: normal; -webkit-font-feature-settings: 'liga' 1, 'calt' 1; font-feature-settings: 'liga' 1, 'calt' 1; }
        [dir="rtl"], [lang="ar"] { direction: rtl !important; text-align: right !important; }
        h1, h2, h3, .font-display { font-family: 'Cairo', 'Almarai', 'Tajawal', system-ui, sans-serif !important; letter-spacing: normal; }
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
      ensureFontLink('pdf-fonts-almarai-tajawal', 'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Tajawal:wght@400;500;700;800;900&display=swap');
      ensureFontLink('pdf-fonts-cairo', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

      document.body.appendChild(root);

      // Wait for layout and fonts
      await new Promise((r) => setTimeout(r, 300));
      await document.fonts.ready;

      const cloneRect = clone.getBoundingClientRect();
      const pad = 24; // px inner padding
      const scale = Math.min(
        (A4_WIDTH_PX - pad * 2) / cloneRect.width,
        (A4_HEIGHT_PX - pad * 2) / cloneRect.height,
        1
      );
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
          </div>
        </div>

        {/* Certificate */}
        <div className="max-w-4xl mx-auto">
          <div 
            ref={certificateRef}
            className="bg-gradient-to-br from-amber-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-4 border-amber-400 dark:border-amber-600 rounded-lg shadow-2xl p-12 print:p-16 print:shadow-none print:border-2"
            dir="rtl"
            lang="ar"
            style={{ fontFamily: "'Almarai', 'Tajawal', system-ui, sans-serif" }}
          >
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

                <div className="mt-8 print:mt-12">
                  <div className="inline-block bg-gradient-to-r from-emerald-500 to-blue-500 text-white px-8 py-4 rounded-lg shadow-lg print:px-12 print:py-6">
                    <p className="text-sm text-white/90 mb-2 print:text-base">
                      {(t('finalScore') as any) || 'العلامة النهائية:'}
                    </p>
                    <p className="text-4xl font-display font-bold print:text-5xl">
                      {certificate.final_score.toFixed(1)} / 100
                    </p>
                    <p className="text-2xl font-display font-semibold mt-2 print:text-3xl">
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

