-- Add verification_code to certificates for secure public verification
alter table if exists public.certificates
  add column if not exists verification_code text unique;

-- Generate a short random code for existing rows
update public.certificates
set verification_code = lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 12))
where verification_code is null;

-- Ensure not null moving forward
alter table if exists public.certificates
  alter column verification_code set not null;

