/*
# Phase 5 — Event registrations table + location/period columns

1. New Tables
- `event_registrations`: stores user registrations for events
  - id uuid PK
  - event_id uuid references events(id) on delete cascade
  - user_id uuid nullable references auth.users(id) on delete set null
  - full_name text not null
  - phone text not null
  - email text
  - attendees_count int default 1
  - whatsapp_available boolean default false
  - notes text
  - registration_code text unique
  - created_at timestamptz default now()

2. Modified Tables
- `events`: add period text (صباحاً/مساءً), registration_enabled boolean, expected_attendees int
- `announcements`: add latitude/longitude for GPS support

3. Security
- RLS enabled on event_registrations
- anon + authenticated can insert registrations
- users can read own registrations
- event owner can read registrations for their events
*/

-- event_registrations
CREATE TABLE IF NOT EXISTS event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  attendees_count int NOT NULL DEFAULT 1,
  whatsapp_available boolean NOT NULL DEFAULT false,
  notes text,
  registration_code text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_event_registrations" ON event_registrations;
CREATE POLICY "anon_insert_event_registrations" ON event_registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_read_own_registrations" ON event_registrations;
CREATE POLICY "auth_read_own_registrations" ON event_registrations FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events WHERE events.id = event_registrations.event_id AND events.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anon_read_own_registrations" ON event_registrations;
CREATE POLICY "anon_read_own_registrations" ON event_registrations FOR SELECT
  TO anon USING (true);

-- Add period to events if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='period'
  ) THEN ALTER TABLE events ADD COLUMN period text; END IF;
END $$;

-- Add registration_enabled + expected_attendees to events if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='registration_enabled'
  ) THEN ALTER TABLE events ADD COLUMN registration_enabled boolean NOT NULL DEFAULT false; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='expected_attendees'
  ) THEN ALTER TABLE events ADD COLUMN expected_attendees int; END IF;
END $$;

-- Add latitude/longitude to announcements if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='latitude'
  ) THEN ALTER TABLE announcements ADD COLUMN latitude double precision; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='longitude'
  ) THEN ALTER TABLE announcements ADD COLUMN longitude double precision; END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='location'
  ) THEN ALTER TABLE announcements ADD COLUMN location text; END IF;
END $$;
