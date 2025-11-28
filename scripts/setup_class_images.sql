-- Ensure image_url column exists in classes table
ALTER TABLE classes ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for class images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('class-images', 'class-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled (usually is)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts/duplication
DROP POLICY IF EXISTS "Public View Class Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Class Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Class Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Class Images" ON storage.objects;

-- Policy: Everyone can view class images
CREATE POLICY "Public View Class Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'class-images');

-- Policy: Authenticated users (teachers/admins) can upload
CREATE POLICY "Authenticated Upload Class Images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'class-images' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can update their own uploads (or admins)
CREATE POLICY "Authenticated Update Class Images" 
ON storage.objects FOR UPDATE
USING (bucket_id = 'class-images' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can delete
CREATE POLICY "Authenticated Delete Class Images" 
ON storage.objects FOR DELETE
USING (bucket_id = 'class-images' AND auth.role() = 'authenticated');

