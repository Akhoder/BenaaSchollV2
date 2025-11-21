-- Add gender field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender) WHERE gender IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.gender IS 'User gender: male or female';

