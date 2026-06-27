/*
# Add image fields and auction improvements

1. New columns
   - `products.image_url` TEXT - main product image
   - `products.auction_end_time` TIMESTAMPTZ - when auction closes
   - `products.bid_increment` NUMERIC DEFAULT 5 - min bid step in AED
   - `community_reports.image_url` TEXT - optional report photo

2. Storage buckets
   - product-images (public)
   - report-images (public)
   - agriculture-images (public)

3. Storage RLS policies for new buckets

4. Fix products RLS to allow public read of active products
   and allow anon insert for guests
*/

-- Add columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS auction_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bid_increment NUMERIC DEFAULT 5;

-- Add image to community_reports
ALTER TABLE community_reports
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Fix products RLS: allow anon to read active products
DROP POLICY IF EXISTS "select_active_products" ON products;
DROP POLICY IF EXISTS "Anyone can read active products" ON products;
DROP POLICY IF EXISTS "Public can read active products" ON products;
CREATE POLICY "select_active_products" ON products
  FOR SELECT TO anon, authenticated USING (status = 'active' OR status IS NULL);

DROP POLICY IF EXISTS "insert_own_products" ON products;
DROP POLICY IF EXISTS "Authenticated can insert" ON products;
CREATE POLICY "insert_own_products" ON products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_products" ON products;
CREATE POLICY "update_own_products" ON products
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_products" ON products;
CREATE POLICY "delete_own_products" ON products
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix product_bids RLS
DROP POLICY IF EXISTS "select_bids" ON product_bids;
CREATE POLICY "select_bids" ON product_bids
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_bids" ON product_bids;
CREATE POLICY "insert_bids" ON product_bids
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix community_reports RLS
DROP POLICY IF EXISTS "select_reports" ON community_reports;
DROP POLICY IF EXISTS "Anyone can read reports" ON community_reports;
CREATE POLICY "select_reports" ON community_reports
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reports" ON community_reports;
DROP POLICY IF EXISTS "Anyone can insert reports" ON community_reports;
CREATE POLICY "insert_reports" ON community_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_reports" ON community_reports;
CREATE POLICY "update_own_reports" ON community_reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_reports" ON community_reports;
CREATE POLICY "delete_own_reports" ON community_reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('product-images', 'product-images', true),
  ('report-images', 'report-images', true),
  ('agriculture-images', 'agriculture-images', true),
  ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload product images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth update product images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth delete product images" ON storage.objects;
END $$;

CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product-images');
CREATE POLICY "Auth upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Auth update product images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Auth delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- Storage policies for report-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read report images" ON storage.objects;
  DROP POLICY IF EXISTS "Upload report images" ON storage.objects;
END $$;

CREATE POLICY "Public read report images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'report-images');
CREATE POLICY "Upload report images" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'report-images');

-- Storage policies for agriculture-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read agri images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload agri images" ON storage.objects;
END $$;

CREATE POLICY "Public read agri images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'agriculture-images');
CREATE POLICY "Auth upload agri images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agriculture-images');

-- Storage policies for event-images
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public read event images" ON storage.objects;
  DROP POLICY IF EXISTS "Auth upload event images" ON storage.objects;
END $$;

CREATE POLICY "Public read event images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'event-images');
CREATE POLICY "Auth upload event images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-images');
