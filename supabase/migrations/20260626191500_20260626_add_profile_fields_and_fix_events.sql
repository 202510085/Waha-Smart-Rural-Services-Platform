/*
# Add profile extra fields + fix events default

1. Modified Tables
- `profiles`: add gender, date_of_birth, country_code columns (all optional)
- `events`: add DEFAULT auth.uid() to user_id so inserts without explicit user_id still work

2. No destructive changes, idempotent with IF NOT EXISTS
*/

-- Add optional profile fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='gender') THEN
    ALTER TABLE profiles ADD COLUMN gender TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='date_of_birth') THEN
    ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='country_code') THEN
    ALTER TABLE profiles ADD COLUMN country_code TEXT DEFAULT '+971';
  END IF;
END $$;

-- Fix events user_id to default to auth.uid() so inserts always satisfy RLS
ALTER TABLE events ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop and recreate events insert policy to allow DEFAULT auth.uid() pattern
DROP POLICY IF EXISTS "insert_own_events" ON events;
CREATE POLICY "insert_own_events" ON events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Ensure announcements user_id also defaults to auth.uid()
ALTER TABLE announcements ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Drop and recreate announcements policies safely
DROP POLICY IF EXISTS "select_announcements" ON announcements;
CREATE POLICY "select_announcements" ON announcements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_announcements" ON announcements;
CREATE POLICY "insert_own_announcements" ON announcements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "update_own_announcements" ON announcements;
CREATE POLICY "update_own_announcements" ON announcements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_announcements" ON announcements;
CREATE POLICY "delete_own_announcements" ON announcements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
