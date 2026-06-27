/*
# Phase 4 — Product images table + location columns on products

1. New Tables
- `product_images`: stores additional images per product (up to 5 per product)
  - id uuid primary key
  - product_id uuid references products(id) on delete cascade
  - image_url text not null
  - sort_order int default 0
  - created_at timestamptz default now()

2. Modified Tables
- `products`: add latitude / longitude for GPS-based distance display
  - latitude  double precision nullable
  - longitude double precision nullable
  - auction_status text default 'active' (active | ended | closed_by_seller)

3. Security
- RLS enabled on product_images
- anon + authenticated can read (market is public)
- authenticated can insert own images (joined through product ownership)
- authenticated can delete own images
*/

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_product_images" ON product_images;
CREATE POLICY "anon_read_product_images" ON product_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_product_images" ON product_images;
CREATE POLICY "auth_insert_product_images" ON product_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM products WHERE products.id = product_images.product_id
        AND products.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "auth_delete_product_images" ON product_images;
CREATE POLICY "auth_delete_product_images" ON product_images FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM products WHERE products.id = product_images.product_id
        AND products.user_id = auth.uid()
    )
  );

-- Add location columns to products if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE products ADD COLUMN latitude double precision;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE products ADD COLUMN longitude double precision;
  END IF;
END $$;

-- Add auction_status column to products if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'auction_status'
  ) THEN
    ALTER TABLE products ADD COLUMN auction_status text DEFAULT 'active';
  END IF;
END $$;
