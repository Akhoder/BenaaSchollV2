-- Add helper to ensure subject discussion conversation exists and user is a participant
CREATE OR REPLACE FUNCTION public.ensure_subject_conversation(
  p_subject_id uuid
)
RETURNS TABLE (
  conversation_id uuid
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  existing_id uuid;
BEGIN
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id
  into existing_id
  from conversations
  where conversations.type = 'subject'
    and conversations.subject_id = p_subject_id
  limit 1;

  if existing_id is null then
    insert into conversations (type, subject_id, created_by)
    values ('subject', p_subject_id, v_user_id)
    returning id into existing_id;
  end if;

  -- Only insert if participant doesn't already exist
  if not exists (
    select 1 from conversation_participants
    where conversation_participants.conversation_id = existing_id
      and conversation_participants.user_id = v_user_id
  ) then
    insert into conversation_participants (conversation_id, user_id, role)
    values (existing_id, v_user_id, 'member');
  end if;

  RETURN QUERY
  SELECT existing_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.ensure_subject_conversation(uuid) TO anon, authenticated;

