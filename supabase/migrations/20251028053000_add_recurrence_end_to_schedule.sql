/*
  # Add recurrence_end_at to schedule_events
*/

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS recurrence_end_at timestamptz;

-- Optional index to speed up range filters with recurrence end
CREATE INDEX IF NOT EXISTS idx_schedule_events_recur_end ON schedule_events(recurrence_end_at);


