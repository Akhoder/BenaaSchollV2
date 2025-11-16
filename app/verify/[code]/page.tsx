'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, XCircle, QrCode, ShieldCheck, Share2, Copy } from 'lucide-react';


export default function VerifyCertificatePage() {
  const params = useParams();
  const code = (params?.code as string) || '';
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!code) return;
        const { data, error } = await supabase.rpc('public_verify_certificate', {
          p_verification_code: code,
        });
        if (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          setResult(null);
        } else {
          setResult(Array.isArray(data) ? data[0] : data);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [code]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
          <h1 className="text-xl font-semibold">التحقق من الشهادة</h1>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /> شهادة صالحة ومنشورة</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-slate-500">رقم الشهادة</div>
                <div className="font-semibold">{result.certificate_number}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-slate-500">المادة</div>
                <div className="font-semibold">{result.subject_name}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 col-span-2">
                <div className="text-slate-500">الطالب</div>
                <div className="font-semibold">{result.student_name}</div>
              </div>
              {result.published_at && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 col-span-2">
                  <div className="text-slate-500">تاريخ النشر</div>
                  <div className="font-semibold">{new Date(result.published_at).toLocaleString('ar-LB')}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <QrCode className="h-4 w-4" />
              احتفظ برقم الشهادة للرجوع إليه لاحقاً.
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-sm flex items-center gap-2"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  navigator.clipboard?.writeText(url).catch(() => {});
                }}
              >
                <Copy className="h-4 w-4" /> نسخ الرابط
              </button>
              {typeof window !== 'undefined' && (navigator as any).share && (
                <button
                  className="px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-sm flex items-center gap-2"
                  onClick={() => {
                    const url = window.location.href;
                    (navigator as any).share({ title: 'التحقق من الشهادة', url }).catch(() => {});
                  }}
                >
                  <Share2 className="h-4 w-4" /> مشاركة
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> لم يتم العثور على شهادة منشورة بهذا الرمز</div>
            <div className="text-slate-500 text-sm">تحقق من صحة الرابط أو QR.</div>
          </div>
        )}
      </div>
    </main>
  );
}
