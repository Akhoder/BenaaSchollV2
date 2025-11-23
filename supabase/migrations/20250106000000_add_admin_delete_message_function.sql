-- Add function to allow admins to delete any message
CREATE OR REPLACE FUNCTION public.delete_message_admin(
  p_message_id uuid
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  is_deleted boolean,
  updated_at timestamptz
) AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_role text;
  v_message_sender_id uuid;
BEGIN
  -- Check authentication
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get user role
  select role into v_user_role
  from profiles
  where profiles.id = v_user_id;

  -- Get message sender
  select messages.sender_id into v_message_sender_id
  from messages
  where messages.id = p_message_id;

  if v_message_sender_id is null then
    raise exception 'Message not found';
  end if;

  -- Allow deletion if user is admin OR if message belongs to the user
  if v_user_role != 'admin' and v_message_sender_id != v_user_id then
    raise exception 'Not authorized to delete this message';
  end if;

  -- Soft delete by marking as deleted
  update public.messages
  set is_deleted = true,
      content = '[Message deleted]',
      updated_at = now()
  where public.messages.id = p_message_id;

  -- Return updated message using RETURN QUERY with explicit column selection
  RETURN QUERY
  SELECT 
    public.messages.id,
    public.messages.conversation_id,
    public.messages.sender_id,
    public.messages.content,
    public.messages.is_deleted,
    public.messages.updated_at
  FROM public.messages
  WHERE public.messages.id = p_message_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.delete_message_admin(uuid) TO anon, authenticated;

