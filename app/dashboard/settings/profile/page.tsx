'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase, uploadUserAvatar } from '@/lib/supabase';
import { toast } from 'sonner';
import type { TranslationKey } from '@/lib/translations';
import {
  User,
  Upload,
  X,
  Loader2,
  Save,
  UserCircle,
} from 'lucide-react';

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Basic fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Teacher fields
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [bio, setBio] = useState('');

  // Student fields
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Admin/Supervisor fields
  const [appointmentDate, setAppointmentDate] = useState('');
  const [department, setDepartment] = useState('');

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setGender(profile.gender || '');
      setAddress(profile.address || '');
      setDateOfBirth(profile.date_of_birth || '');
      setSpecialization(profile.specialization || '');
      setYearsOfExperience(profile.years_of_experience?.toString() || '');
      setQualifications(profile.qualifications || '');
      setBio(profile.bio || '');
      setParentName(profile.parent_name || '');
      setParentPhone(profile.parent_phone || '');
      setEmergencyContact(profile.emergency_contact || '');
      setAppointmentDate(profile.appointment_date || '');
      setDepartment(profile.department || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarPreview(profile.avatar_url || null);
      setLoading(false);
    }
  }, [profile]);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageFile' as TranslationKey));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('imageTooLarge' as TranslationKey));
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleRemoveAvatar = useCallback(() => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarUrl('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!profile) return;

    try {
      setSaving(true);

      // Upload avatar if a new file was selected
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        setUploadingAvatar(true);
        const { data: uploadData, error: uploadError } = await uploadUserAvatar(avatarFile, profile.id);
        if (uploadError) {
          toast.error(uploadError.message || t('failedToUploadAvatar' as TranslationKey));
          setUploadingAvatar(false);
          return;
        }
        finalAvatarUrl = uploadData?.publicUrl || '';
        setUploadingAvatar(false);
      }

      const updateData: any = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        avatar_url: finalAvatarUrl || null,
        gender: gender || null,
        address: address.trim() || null,
        date_of_birth: dateOfBirth || null,
        specialization: specialization.trim() || null,
        years_of_experience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        qualifications: qualifications.trim() || null,
        bio: bio.trim() || null,
        parent_name: parentName.trim() || null,
        parent_phone: parentPhone.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        appointment_date: appointmentDate || null,
        department: department.trim() || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        console.error(error);
        toast.error(t('failedToSave' as TranslationKey));
        return;
      }

      // Refresh profile
      await refreshProfile();
      setAvatarFile(null);
      toast.success(t('profileUpdated' as TranslationKey));
    } catch (err) {
      console.error(err);
      toast.error(t('unexpectedError' as TranslationKey));
    } finally {
      setSaving(false);
      setUploadingAvatar(false);
    }
  }, [
    profile, fullName, phone, gender, avatarUrl, avatarFile,
    address, dateOfBirth,
    specialization, yearsOfExperience, qualifications, bio,
    parentName, parentPhone, emergencyContact,
    appointmentDate, department,
    t, refreshProfile
  ]);

  if (loading || !profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        icon={UserCircle}
        title={t('editProfile' as TranslationKey)}
        description={t('updateYourProfileInformation' as TranslationKey)}
      />

      <div className="space-y-6">
        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profilePicture' as TranslationKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-2 ring-blue-500/20">
                  <AvatarImage src={avatarPreview || avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-xl">
                    {fullName.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                {(avatarPreview || avatarUrl) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={handleRemoveAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  id="avatar-upload"
                />
                <label htmlFor="avatar-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingAvatar}
                    asChild
                  >
                    <span className="cursor-pointer">
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t('uploading' as TranslationKey)}
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          {avatarPreview || avatarUrl ? t('changePicture' as TranslationKey) : t('uploadPicture' as TranslationKey)}
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {t('imageUploadHint' as TranslationKey)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInformation' as TranslationKey)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('fullName')}</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('email')}</label>
                <Input
                  value={email}
                  disabled
                  className="mt-1 bg-slate-50 dark:bg-slate-900"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('emailCannotBeChanged' as TranslationKey)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('phone')}</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('gender' as TranslationKey)}</label>
                <Select value={gender} onValueChange={(v) => setGender(v as 'male' | 'female' | '')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('selectGender' as TranslationKey)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male' as TranslationKey)}</SelectItem>
                    <SelectItem value="female">{t('female' as TranslationKey)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t('address' as TranslationKey)}</label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('dateOfBirth' as TranslationKey)}</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher-specific fields */}
        {(profile.role === 'teacher') && (
          <Card>
            <CardHeader>
              <CardTitle>{t('teacherInformation' as TranslationKey)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('specialization' as TranslationKey)}</label>
                  <Input
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('yearsOfExperience' as TranslationKey)}</label>
                  <Input
                    type="number"
                    min="0"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('qualifications' as TranslationKey)}</label>
                <Textarea
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('bio' as TranslationKey)}</label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student-specific fields */}
        {(profile.role === 'student') && (
          <Card>
            <CardHeader>
              <CardTitle>{t('studentInformation' as TranslationKey)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('parentName' as TranslationKey)}</label>
                  <Input
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('parentPhone' as TranslationKey)}</label>
                  <Input
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t('emergencyContact' as TranslationKey)}</label>
                <Input
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin/Supervisor-specific fields */}
        {(profile.role === 'admin' || profile.role === 'supervisor') && (
          <Card>
            <CardHeader>
              <CardTitle>{t('administrativeInformation' as TranslationKey)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t('appointmentDate' as TranslationKey)}</label>
                  <Input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{t('department' as TranslationKey)}</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={handleSave}
            disabled={saving || uploadingAvatar}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving' as TranslationKey)}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('saveChanges' as TranslationKey)}
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

