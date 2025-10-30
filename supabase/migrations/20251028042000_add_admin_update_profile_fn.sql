/*
  # Admin Update Profile Function (Bypass RLS)

  SECURITY DEFINER function that allows an admin to update a profile row
  without hitting profiles RLS, validated via JWT/email claim checks.
*/

-- Helper: robust admin check from JWT claims or email
CREATE OR REPLACE FUNCTION is_admin_from_claims_or_email()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'user'->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'app_metadata'->>'role') = 'admin'
    OR (current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role') = 'admin'
    OR (auth.email() = 'akhoder83@gmail.com')
  , false);
$$;

-- RPC: update a profile fields (admin only)
CREATE OR REPLACE FUNCTION admin_update_profile(
  p_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_language_preference text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin_from_claims_or_email() THEN
    RAISE EXCEPTION 'Only admin can update profiles';
  END IF;

  UPDATE profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = p_phone,
    avatar_url = p_avatar_url,
    language_preference = COALESCE(p_language_preference, language_preference),
    updated_at = now()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_profile(uuid, text, text, text, text) TO authenticated;


