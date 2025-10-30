-- Create public storage bucket for lesson attachments and policies
-- Note: Supabase allows creating buckets by inserting into storage.buckets

insert into storage.buckets (id, name, public)
values ('lesson-attachments', 'lesson-attachments', true)
on conflict (id) do nothing;

-- Note: Storage policies on storage.objects require table ownership privileges.
-- Apply the policies from the Supabase Dashboard SQL editor (or as the table owner).


