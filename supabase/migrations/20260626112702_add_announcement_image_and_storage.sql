-- Add image_url and updated_at to announcements
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure proper RLS policies exist for announcements
-- Drop existing ones if they conflict, then re-create
DO $$
BEGIN
  -- Drop old policies if they exist with different names
  DROP POLICY IF EXISTS "announcements_select" ON announcements;
  DROP POLICY IF EXISTS "announcements_insert" ON announcements;
  DROP POLICY IF EXISTS "announcements_update" ON announcements;
  DROP POLICY IF EXISTS "announcements_delete" ON announcements;
  DROP POLICY IF EXISTS "Anyone can read announcements" ON announcements;
  DROP POLICY IF EXISTS "Authenticated users can insert announcements" ON announcements;
  DROP POLICY IF EXISTS "Users can update own announcements" ON announcements;
  DROP POLICY IF EXISTS "Users can delete own announcements" ON announcements;
END $$;

CREATE POLICY "select_all_announcements" ON announcements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "insert_own_announcements" ON announcements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_announcements" ON announcements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_announcements" ON announcements
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read announcement images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth users upload announcement images" ON storage.objects;
  DROP POLICY IF EXISTS "Users update own announcement images" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete own announcement images" ON storage.objects;
END $$;

CREATE POLICY "Public read announcement images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Auth users upload announcement images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcement-images');

CREATE POLICY "Users update own announcement images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'announcement-images');

CREATE POLICY "Users delete own announcement images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'announcement-images');
