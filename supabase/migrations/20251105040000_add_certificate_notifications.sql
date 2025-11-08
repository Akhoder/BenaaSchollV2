-- Add trigger to create notification when certificate is published

-- Function to create notification when certificate is published
create or replace function notify_certificate_published()
returns trigger as $$
declare
  v_subject_name text;
begin
  -- Only create notification when status changes to 'published'
  if new.status = 'published' and (old.status is null or old.status != 'published') then
    -- Get subject name
    select subject_name into v_subject_name
    from public.class_subjects
    where id = new.subject_id;
    
    -- Create notification
    insert into public.notifications (
      recipient_id,
      title,
      body,
      type,
      link_url,
      created_by
    ) values (
      new.student_id,
      'شهادة جديدة',
      'تم إصدار شهادة إتمام لك في مادة ' || coalesce(v_subject_name, ''),
      'certificate',
      '/dashboard/certificates/' || new.id || '/view',
      new.issued_by
    );
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger
drop trigger if exists certificate_published_notification on public.certificates;
create trigger certificate_published_notification
after insert or update on public.certificates
for each row
when (new.status = 'published')
execute function notify_certificate_published();

