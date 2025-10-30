/*
  # Extend schedule_events: mode and zoom_url
*/

ALTER TABLE schedule_events
  ADD COLUMN IF NOT EXISTS mode text DEFAULT 'in_person' CHECK (mode IN ('in_person','online','hybrid')),
  ADD COLUMN IF NOT EXISTS zoom_url text;

-- Optional: small index if filtering by mode
CREATE INDEX IF NOT EXISTS idx_schedule_events_mode ON schedule_events(mode);


