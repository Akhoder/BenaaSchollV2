-- Add new fields to class_subjects table
-- Fields: description, objectives (array), reference_url, image_url, updated_at

-- Add description field
ALTER TABLE IF EXISTS public.class_subjects
  ADD COLUMN IF NOT EXISTS description text;

-- Add objectives field (array of text)
ALTER TABLE IF EXISTS public.class_subjects
  ADD COLUMN IF NOT EXISTS objectives text[];

-- Add reference_url field (for Google Drive or other references)
ALTER TABLE IF EXISTS public.class_subjects
  ADD COLUMN IF NOT EXISTS reference_url text;

-- Add image_url field (for Supabase Storage)
ALTER TABLE IF EXISTS public.class_subjects
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add updated_at field with trigger
ALTER TABLE IF EXISTS public.class_subjects
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_class_subjects_updated_at_trigger ON public.class_subjects;
CREATE TRIGGER update_class_subjects_updated_at_trigger
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_class_subjects_updated_at();

-- Create storage bucket for subject images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subject-images',
  'subject-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for subject images
-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Subject images upload" ON storage.objects;
CREATE POLICY "Subject images upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'subject-images' AND
  (
    -- Admins can upload
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- Teachers can upload for their subjects
    EXISTS (
      SELECT 1 FROM public.class_subjects
      WHERE teacher_id = auth.uid()
    )
  )
);

-- Allow authenticated users to read images
DROP POLICY IF EXISTS "Subject images read" ON storage.objects;
CREATE POLICY "Subject images read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'subject-images');

-- Allow admins and subject teachers to update images
DROP POLICY IF EXISTS "Subject images update" ON storage.objects;
CREATE POLICY "Subject images update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'subject-images' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.class_subjects
      WHERE teacher_id = auth.uid()
    )
  )
);

-- Allow admins and subject teachers to delete images
DROP POLICY IF EXISTS "Subject images delete" ON storage.objects;
CREATE POLICY "Subject images delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'subject-images' AND
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.class_subjects
      WHERE teacher_id = auth.uid()
    )
  )
);

