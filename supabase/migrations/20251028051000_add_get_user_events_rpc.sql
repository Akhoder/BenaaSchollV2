/*
  # Add get_user_events RPC (RLS-safe)
*/

CREATE OR REPLACE FUNCTION get_user_events(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS SETOF schedule_events
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM schedule_events
  WHERE (
    -- direct overlap
    (start_at < p_end AND end_at > p_start)
  ) OR (
    -- include recurring seeds even if outside range (for client expansion)
    recurrence_rule IS NOT NULL AND start_at <= p_end
  )
  ORDER BY start_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_user_events(timestamptz, timestamptz) TO authenticated;


