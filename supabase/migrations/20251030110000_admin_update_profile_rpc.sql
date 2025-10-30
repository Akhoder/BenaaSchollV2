-- Secure function for admins to update profiles bypassing RLS
-- Only allows callers with role 'admin' in public.profiles

create or replace function public.admin_update_profile(
  p_id uuid,
  p_full_name text default null,
  p_email text default null,
  p_phone text default null,
  p_language text default null,
  p_role text default null
)
returns void
language plpgsql
security definer
as $$
declare
  is_admin boolean;
begin
  -- Ensure caller is admin
  select exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid() and pr.role = 'admin'
  ) into is_admin;

  if not is_admin then
    raise exception 'not authorized';
  end if;

  update public.profiles
  set
    full_name = coalesce(p_full_name, full_name),
    email = coalesce(p_email, email),
    phone = coalesce(p_phone, phone),
    language_preference = coalesce(p_language, language_preference),
    role = coalesce(p_role, role),
    updated_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.admin_update_profile(uuid, text, text, text, text, text) from public;
grant execute on function public.admin_update_profile(uuid, text, text, text, text, text) to authenticated;


