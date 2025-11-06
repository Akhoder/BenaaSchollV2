'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import Cropper from 'react-easy-crop';
import Image from 'next/image';
import { getCertificateTemplateCSS } from '@/lib/certificateTemplates';

export default function BrandingSettingsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [template, setTemplate] = useState<'classic' | 'modern' | 'royal'>('classic');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [stampUrl, setStampUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [cropKind, setCropKind] = useState<'logo' | 'signature' | 'stamp' | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [uploadingKind, setUploadingKind] = useState<null | 'logo' | 'signature' | 'stamp'>(null);
  const [royalGold, setRoyalGold] = useState('#d4af37');
  const [royalBgTint, setRoyalBgTint] = useState('#fffaf0');
  const [wmEnabled, setWmEnabled] = useState(false);
  const [wmOpacity, setWmOpacity] = useState(0.08);
  const [wmUseLogo, setWmUseLogo] = useState(true);
  const [wmUseStamp, setWmUseStamp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [brandingMissing, setBrandingMissing] = useState(false);

  const templateCSS = getCertificateTemplateCSS(template);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = (_: any, areaPixels: any) => setCroppedAreaPixels(areaPixels);

  const readFileAsDataURL = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  async function getCroppedImage(imageSrc: string, pixelCrop: { x: number; y: number; width: number; height: number; }) {
    const img = document.createElement('img');
    img.src = imageSrc;
    await new Promise((res, rej) => { img.onload = () => res(null); img.onerror = rej; });
    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(
      img,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png', 1));
  }

  const startCrop = async (kind: 'logo' | 'signature' | 'stamp', file: File) => {
    const dataUrl = await readFileAsDataURL(file);
    setCropKind(kind);
    setCropSrc(dataUrl);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setCroppedAreaPixels(null);
    setCropOpen(true);
  };

  const confirmCrop = async () => {
    if (!cropKind || !cropSrc || !croppedAreaPixels) return;
    try {
      setSaving(true);
      const blob = await getCroppedImage(cropSrc, croppedAreaPixels);
      const file = new File([blob], `${cropKind}-${Date.now()}.png`, { type: 'image/png' });
      await uploadAsset(cropKind, file);
      toast.success('تم حفظ الصورة');
      setCropOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'فشل القص');
    } finally {
      setSaving(false);
    }
  };

  const getBrandingPathFromPublicUrl = (url?: string | null) => {
    if (!url) return null;
    const idx = url.indexOf('/storage/v1/object/public/branding/');
    if (idx === -1) return null;
    return url.substring(idx + '/storage/v1/object/public/branding/'.length);
  };

  const uploadAsset = async (kind: 'logo' | 'signature' | 'stamp', file: File) => {
    if (!['image/png','image/jpeg','image/webp','image/jpg','image/svg+xml'].includes(file.type)) {
      throw new Error('صيغة غير مدعومة. الصيغ المسموحة: PNG, JPG, WEBP');
    }
    if (file.size > 3 * 1024 * 1024) { // 3MB
      throw new Error('الحجم كبير. الحد الأقصى 3MB');
    }
    setUploadingKind(kind);
    const ext = (file.name.split('.').pop() || (file.type==='image/svg+xml'?'svg':'png')).toLowerCase();
    const name = `${kind}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('branding').upload(name, file, { upsert: true, cacheControl: '3600' });
    if (uploadErr) { setUploadingKind(null); throw uploadErr; }
    const { data } = supabase.storage.from('branding').getPublicUrl(name);
    const url = data.publicUrl;
    // delete old if belongs to branding
    try {
      const old = kind === 'logo' ? logoUrl : kind === 'signature' ? signatureUrl : stampUrl;
      const oldPath = getBrandingPathFromPublicUrl(old);
      if (oldPath) {
        await supabase.storage.from('branding').remove([oldPath]);
      }
    } catch {}
    if (kind === 'logo') setLogoUrl(url);
    if (kind === 'signature') setSignatureUrl(url);
    if (kind === 'stamp') setStampUrl(url);
    setUploadingKind(null);
  };

  const removeAsset = async (kind: 'logo' | 'signature' | 'stamp') => {
    try {
      setSaving(true);
      const current = kind === 'logo' ? logoUrl : kind === 'signature' ? signatureUrl : stampUrl;
      const p = getBrandingPathFromPublicUrl(current);
      if (p) { await supabase.storage.from('branding').remove([p]); }
      if (kind === 'logo') setLogoUrl('');
      if (kind === 'signature') setSignatureUrl('');
      if (kind === 'stamp') setStampUrl('');
      toast.success('تم حذف الصورة');
    } catch (e:any) {
      toast.error(e.message || 'فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  const resetBranding = async () => {
    try {
      setSaving(true);
      setTemplate('classic');
      setLogoUrl('');
      setSignatureUrl('');
      setStampUrl('');
      const { error } = await supabase.from('branding_settings').update({
        template: 'classic',
        logo_url: null,
        signature_url: null,
        stamp_url: null,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);
      if (error) throw error;
      toast.success('تمت الاستعادة للوضع الافتراضي');
    } catch (e:any) {
      toast.error(e.message || 'فشل الاستعادة');
    } finally {
      setSaving(false);
    }
  };

  const setModernDefault = async () => {
    try {
      setSaving(true);
      setTemplate('modern');
      const { error } = await supabase.from('branding_settings').update({
        template: 'modern',
        updated_at: new Date().toISOString(),
      }).eq('id', 1);
      if (error) throw error;
      toast.success('تم تعيين Modern كقالب افتراضي');
    } catch (e:any) {
      toast.error(e.message || 'فشل التعيين');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('branding_settings').select('*').eq('id', 1).single();
        if (error) {
          if ((error as any).status === 404) {
            setBrandingMissing(true);
            return;
          }
          throw error;
        }
        if (data) {
          setTemplate((data.template as any) || 'classic');
          setLogoUrl(data.logo_url || '');
          setSignatureUrl(data.signature_url || '');
          setStampUrl(data.stamp_url || '');
          setRoyalGold(data.royal_gold || '#d4af37');
          setRoyalBgTint(data.royal_bg_tint || '#fffaf0');
          setWmEnabled(!!data.watermark_enabled);
          setWmOpacity(typeof data.watermark_opacity === 'number' ? data.watermark_opacity : 0.08);
          setWmUseLogo(!!data.watermark_use_logo);
          setWmUseStamp(!!data.watermark_use_stamp);
        }
      } catch (e:any) {
        console.error(e);
        toast.error('تعذر تحميل إعدادات الهوية');
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      if (brandingMissing) {
        toast.error('جدول إعدادات الهوية غير موجود. يرجى تشغيل هجرة قاعدة البيانات الخاصة به.');
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('branding_settings').update({
        template,
        logo_url: logoUrl || null,
        signature_url: signatureUrl || null,
        stamp_url: stampUrl || null,
        royal_gold: royalGold,
        royal_bg_tint: royalBgTint,
        watermark_enabled: wmEnabled,
        watermark_opacity: wmOpacity,
        watermark_use_logo: wmUseLogo,
        watermark_use_stamp: wmUseStamp,
        updated_at: new Date().toISOString(),
      }).eq('id', 1);
      if (error) throw error;
      toast.success('Branding saved');
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              إعدادات الهوية البصرية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">القالب الافتراضي</label>
                <Select value={template} onValueChange={(v) => setTemplate(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="القالب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic (إطار كلاسيكي)</SelectItem>
                    <SelectItem value="modern">Modern (حديث)</SelectItem>
                    <SelectItem value="royal">Royal (ملكي)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">يُستخدم أيضاً عند التصدير إلى PDF/PNG.</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Royal Palette</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Gold</span>
                    <input type="color" value={royalGold} onChange={(e)=>setRoyalGold(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Background</span>
                    <input type="color" value={royalBgTint} onChange={(e)=>setRoyalBgTint(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">الشعار</label>
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                  <div className="aspect-square rounded-lg bg-white border flex items-center justify-center overflow-hidden relative">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="logo" fill sizes="120px" className="object-contain" />
                    ) : (
                      <div className="text-xs text-slate-400">اسحب الشعار هنا أو استخدم زر الرفع</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={!!uploadingKind}> {uploadingKind==='logo' ? 'جارٍ الرفع...' : 'رفع'} </Button>
                    {logoUrl && <Button variant="destructive" size="sm" onClick={() => removeAsset('logo')} disabled={saving}>حذف</Button>}
                    <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={async (e) => { const f=e.target.files?.[0]; if (!f) return; await startCrop('logo', f); }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">يفضل مربع PNG/SVG بخلفية شفافة. حد أقصى 3MB.</p>
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">التوقيع</label>
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                  <div className="aspect-[3/1] rounded-lg bg-white border flex items-center justify-center overflow-hidden relative">
                    {signatureUrl ? (
                      <Image src={signatureUrl} alt="signature" fill sizes="180px" className="object-contain" />
                    ) : (
                      <div className="text-xs text-slate-400">اسحب التوقيع هنا أو استخدم زر الرفع</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => signatureInputRef.current?.click()} disabled={!!uploadingKind}> {uploadingKind==='signature' ? 'جارٍ الرفع...' : 'رفع'} </Button>
                    {signatureUrl && <Button variant="destructive" size="sm" onClick={() => removeAsset('signature')} disabled={saving}>حذف</Button>}
                    <input ref={signatureInputRef} type="file" accept="image/*" hidden onChange={async (e) => { const f=e.target.files?.[0]; if (!f) return; await startCrop('signature', f); }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">يفضل مستطيل عريض بخلفية شفافة. حد أقصى 3MB.</p>
                </div>
              </div>

              {/* Stamp */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">الختم</label>
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                  <div className="aspect-square rounded-lg bg-white border flex items-center justify-center overflow-hidden relative">
                    {stampUrl ? (
                      <Image src={stampUrl} alt="stamp" fill sizes="120px" className="object-contain" />
                    ) : (
                      <div className="text-xs text-slate-400">اسحب الختم هنا أو استخدم زر الرفع</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => stampInputRef.current?.click()} disabled={!!uploadingKind}> {uploadingKind==='stamp' ? 'جارٍ الرفع...' : 'رفع'} </Button>
                    {stampUrl && <Button variant="destructive" size="sm" onClick={() => removeAsset('stamp')} disabled={saving}>حذف</Button>}
                    <input ref={stampInputRef} type="file" accept="image/*" hidden onChange={async (e) => { const f=e.target.files?.[0]; if (!f) return; await startCrop('stamp', f); }} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">مربع، بخلفية شفافة يفضل. حد أقصى 3MB.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">العلامة المائية</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wmEnabled} onChange={(e)=>setWmEnabled(e.target.checked)} /> تفعيل
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wmUseLogo} onChange={(e)=>setWmUseLogo(e.target.checked)} /> شعار
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wmUseStamp} onChange={(e)=>setWmUseStamp(e.target.checked)} /> ختم
                </label>
                <div className="flex items-center gap-2 text-sm">
                  <span>الشفافية</span>
                  <input type="range" min={0.02} max={0.3} step={0.01} value={wmOpacity} onChange={(e)=>setWmOpacity(parseFloat(e.target.value))} />
                  <span className="text-xs text-slate-500">{Math.round(wmOpacity*100)}%</span>
                </div>
              </div>
            </div>

            {/* Missing table notice */}
            {brandingMissing && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 text-sm">
                لم يتم العثور على جدول إعدادات الهوية (<code>branding_settings</code>). يرجى تشغيل هجرة قاعدة البيانات
                الخاصة بإنشاء الجدول ثم إعادة تحميل الصفحة.
              </div>
            )}

            {/* Live Preview */}
            <div>
              <label className="text-sm font-medium text-slate-700">معاينة الشهادة</label>
              {mounted && (<style>{getCertificateTemplateCSS(template, { royalGold, royalBgTint })}</style>)}
              <div className={template==='modern' ? 'cert-template-modern' : template==='royal' ? 'cert-template-royal' : 'cert-template-classic'}>
                <div className="p-6 rounded-xl relative">
                  {wmEnabled && (wmUseLogo || wmUseStamp) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {(wmUseLogo && logoUrl) ? (
                        <Image src={logoUrl} alt="wm" width={220} height={220} style={{opacity: wmOpacity, filter: 'grayscale(20%)'}} />
                      ) : (wmUseStamp && stampUrl) ? (
                        <Image src={stampUrl} alt="wm" width={220} height={220} style={{opacity: wmOpacity, filter: 'grayscale(20%)'}} />
                      ) : null}
                    </div>
                  )}
                  <div className="text-center mb-4">
                    {logoUrl && (
                      <div className="flex items-center justify-center mb-2">
                        <Image src={logoUrl} alt="logo" width={56} height={56} className="object-contain" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold">مدرسة البناء العلمي</h3>
                    <div className="cert-header-ribbon" />
                    <p className="text-sm text-slate-600">شهادة إتمام</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">اسم الطالب</p>
                      <p className="font-semibold">عبد الرحمن خضر</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">المادة</p>
                      <p className="font-semibold">الفقه الشافعي</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    {signatureUrl && <Image src={signatureUrl} alt="signature" width={120} height={40} className="object-contain inline-block" />}
                    {stampUrl && <Image src={stampUrl} alt="stamp" width={56} height={56} className="object-contain inline-block ml-4" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={save} disabled={saving || !!uploadingKind} className="btn-gradient">حفظ</Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>رجوع</Button>
            </div>

            {cropOpen && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
                <div className="bg-white rounded-xl w-full max-w-lg p-4">
                  <div className="relative w-full h-[360px] bg-slate-900">
                    <Cropper
                      image={cropSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={cropKind === 'signature' ? 3 : 1}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Zoom</span>
                      <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setCropOpen(false)}>إلغاء</Button>
                      <Button className="btn-gradient" onClick={confirmCrop} disabled={saving}>تأكيد</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
