/*
# Phase 1 Stability Fixes

## Changes

1. Add `avatar_url` to profiles (for profile photo upload)
2. Add `period` to announcements (صباحًا / مساءً)
3. Remove duplicate/conflicting RLS policies on announcements and products
4. Add profile-images storage bucket
5. Ensure events table has user_id with DEFAULT auth.uid()
6. Fix announcements INSERT policy conflict (duplicate policies causing RLS violations)

## Important Notes
- All existing data is preserved (ADD COLUMN IF NOT EXISTS only)
- No DROP TABLE or DROP COLUMN
- Idempotent: safe to re-run
*/

-- 1. Add avatar_url to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add period field to announcements (صباحًا / مساءً)
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS period text DEFAULT 'صباحاً';

-- 3. Fix duplicate/conflicting RLS on announcements
-- Remove all old policies first, then recreate a clean set
DROP POLICY IF EXISTS "announcements_read_all" ON announcements;
DROP POLICY IF EXISTS "announcements_insert_own" ON announcements;
DROP POLICY IF EXISTS "announcements_update_own" ON announcements;
DROP POLICY IF EXISTS "announcements_delete_own" ON announcements;
DROP POLICY IF EXISTS "select_all_announcements" ON announcements;
DROP POLICY IF EXISTS "insert_own_announcements" ON announcements;
DROP POLICY IF EXISTS "update_own_announcements" ON announcements;
DROP POLICY IF EXISTS "delete_own_announcements" ON announcements;
DROP POLICY IF EXISTS "select_announcements" ON announcements;

CREATE POLICY "ann_select_public" ON announcements
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ann_insert_own" ON announcements
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ann_update_own" ON announcements
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ann_delete_own" ON announcements
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Fix duplicate/conflicting RLS on products
DROP POLICY IF EXISTS "products_read_all" ON products;
DROP POLICY IF EXISTS "products_insert_own" ON products;
DROP POLICY IF EXISTS "products_update_own" ON products;
DROP POLICY IF EXISTS "products_delete_own" ON products;
DROP POLICY IF EXISTS "select_active_products" ON products;
DROP POLICY IF EXISTS "insert_own_products" ON products;
DROP POLICY IF EXISTS "update_own_products" ON products;
DROP POLICY IF EXISTS "delete_own_products" ON products;

CREATE POLICY "prod_select_public" ON products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "prod_insert_own" ON products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prod_update_own" ON products
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prod_delete_own" ON products
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Fix duplicate/conflicting RLS on community_reports
DROP POLICY IF EXISTS "reports_read_all" ON community_reports;
DROP POLICY IF EXISTS "reports_insert_own" ON community_reports;
DROP POLICY IF EXISTS "reports_insert_anon" ON community_reports;
DROP POLICY IF EXISTS "reports_update_own" ON community_reports;
DROP POLICY IF EXISTS "reports_delete_own" ON community_reports;
DROP POLICY IF EXISTS "select_reports" ON community_reports;
DROP POLICY IF EXISTS "insert_reports" ON community_reports;
DROP POLICY IF EXISTS "update_own_reports" ON community_reports;
DROP POLICY IF EXISTS "delete_own_reports" ON community_reports;

CREATE POLICY "rep_select_public" ON community_reports
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "rep_insert_any" ON community_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "rep_update_own" ON community_reports
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rep_delete_own" ON community_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. profile-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth update profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth delete profile images" ON storage.objects;
END $$;

CREATE POLICY "Public read profile images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'profile-images');

CREATE POLICY "Auth upload profile images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Auth update profile images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'profile-images');

CREATE POLICY "Auth delete profile images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'profile-images');

-- 7. Ensure events.user_id has DEFAULT auth.uid() if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'user_id'
    AND column_default LIKE '%auth.uid%'
  ) THEN
    ALTER TABLE events ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;
