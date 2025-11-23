-- Add deleted_by column to messages table to track who deleted the message
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by ON public.messages(deleted_by);

-- Drop the old function first to change return type
DROP FUNCTION IF EXISTS public.delete_message_admin(uuid);

-- Update the delete_message_admin function to store who deleted the message
CREATE FUNCTION public.delete_message_admin(
  p_message_id uuid
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  content text,
  is_deleted boolean,
  deleted_by uuid,
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
  from public.profiles
  where public.profiles.id = v_user_id;

  -- Get message sender
  select public.messages.sender_id into v_message_sender_id
  from public.messages
  where public.messages.id = p_message_id;

  if v_message_sender_id is null then
    raise exception 'Message not found';
  end if;

  -- Allow deletion if user is admin OR if message belongs to the user
  if v_user_role != 'admin' and v_message_sender_id != v_user_id then
    raise exception 'Not authorized to delete this message';
  end if;

  -- Soft delete by marking as deleted and storing who deleted it
  update public.messages
  set is_deleted = true,
      content = '[Message deleted]',
      deleted_by = v_user_id,
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
    public.messages.deleted_by,
    public.messages.updated_at
  FROM public.messages
  WHERE public.messages.id = p_message_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.delete_message_admin(uuid) TO anon, authenticated;

