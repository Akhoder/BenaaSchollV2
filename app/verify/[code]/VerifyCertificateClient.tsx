'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle2, XCircle, QrCode, ShieldCheck, Share2, Copy } from 'lucide-react';

// Client component - generateStaticParams handled in page.tsx
// Force dynamic rendering - this page requires runtime params
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default function VerifyCertificateClient() {
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
          <h1 className="text-xl font-semibold">╪د┘╪ز╪ص┘é┘é ┘à┘ ╪د┘╪┤┘ç╪د╪»╪ر</h1>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /> ╪┤┘ç╪د╪»╪ر ╪╡╪د┘╪ص╪ر ┘ê┘à┘╪┤┘ê╪▒╪ر</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-slate-500">╪▒┘é┘à ╪د┘╪┤┘ç╪د╪»╪ر</div>
                <div className="font-semibold">{result.certificate_number}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-slate-500">╪د┘┘à╪د╪»╪ر</div>
                <div className="font-semibold">{result.subject_name}</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 col-span-2">
                <div className="text-slate-500">╪د┘╪╖╪د┘╪ذ</div>
                <div className="font-semibold">{result.student_name}</div>
              </div>
              {result.published_at && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 col-span-2">
                  <div className="text-slate-500">╪ز╪د╪▒┘è╪« ╪د┘┘╪┤╪▒</div>
                  <div className="font-semibold">{new Date(result.published_at).toLocaleString('ar-LB')}</div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <QrCode className="h-4 w-4" />
              ╪د╪ص╪ز┘╪╕ ╪ذ╪▒┘é┘à ╪د┘╪┤┘ç╪د╪»╪ر ┘┘╪▒╪ش┘ê╪╣ ╪ح┘┘è┘ç ┘╪د╪ص┘é╪د┘ï.
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-sm flex items-center gap-2"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.href : '';
                  navigator.clipboard?.writeText(url).catch(() => {});
                }}
              >
                <Copy className="h-4 w-4" /> ┘╪│╪« ╪د┘╪▒╪د╪ذ╪╖
              </button>
              {typeof window !== 'undefined' && (navigator as any).share && (
                <button
                  className="px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-50 text-sm flex items-center gap-2"
                  onClick={() => {
                    const url = window.location.href;
                    (navigator as any).share({ title: '╪د┘╪ز╪ص┘é┘é ┘à┘ ╪د┘╪┤┘ç╪د╪»╪ر', url }).catch(() => {});
                  }}
                >
                  <Share2 className="h-4 w-4" /> ┘à╪┤╪د╪▒┘â╪ر
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600"><XCircle className="h-5 w-5" /> ┘┘à ┘è╪ز┘à ╪د┘╪╣╪س┘ê╪▒ ╪╣┘┘ë ╪┤┘ç╪د╪»╪ر ┘à┘╪┤┘ê╪▒╪ر ╪ذ┘ç╪░╪د ╪د┘╪▒┘à╪▓</div>
            <div className="text-slate-500 text-sm">╪ز╪ص┘é┘é ┘à┘ ╪╡╪ص╪ر ╪د┘╪▒╪د╪ذ╪╖ ╪ث┘ê QR.</div>
          </div>
        )}
      </div>
    </main>
  );
}