/*
# Create all tables for Waaha platform

## Overview
Creates 11 tables for the Waaha rural services platform serving Al Qua'a, Al Ain.
Replaces localStorage with Supabase persistence.

## New Tables

1. **profiles** - User profile data linked to auth.users
   - id (uuid PK, references auth.users)
   - full_name, phone, whatsapp_enabled, email, location, user_type, created_at

2. **services** - Public service locations (clinics, mosques, schools, etc.)
   - id, name, type, address, phone, whatsapp_enabled, whatsapp_phone
   - latitude, longitude, working_hours, description, created_at

3. **products** - Market items for sale (with auction support)
   - id, user_id (references auth.users), owner_name, owner_phone, owner_whatsapp_enabled
   - title, category, price, unit, description, location, image_url
   - is_auction, current_bid, status, created_at

4. **product_bids** - Bids on auction products
   - id, product_id (references products), user_id (references auth.users)
   - bidder_name, bid_amount, created_at

5. **community_reports** - Community issue reports
   - id, user_id, owner_name, owner_phone, owner_whatsapp_enabled
   - report_type, description, location, latitude, longitude
   - urgency, elderly_related, status, created_at

6. **announcements** - Community announcements
   - id, user_id, owner_name, owner_phone, owner_whatsapp_enabled
   - title, category, event_date, event_time, description, created_at

7. **health_requests** - Health consultation requests
   - id, user_id, owner_name, owner_phone, owner_whatsapp_enabled
   - age, symptoms, urgency, location, status, created_at

8. **agriculture_requests** - Agricultural advice requests
   - id, user_id, owner_name, owner_phone, owner_whatsapp_enabled
   - crop_type, problem_description, image_url, ai_diagnosis, status, created_at

9. **rides** - Available shared rides from drivers
   - id, user_id, driver_name, driver_phone, whatsapp_enabled
   - from_location, to_location, departure_time, available_seats
   - uae_pass_verified, notes, created_at

10. **ride_requests** - Passenger ride requests
    - id, user_id, requester_name, requester_phone, whatsapp_enabled
    - from_location, to_location, requested_time, passengers, notes, status, created_at

11. **emergency_requests** - SOS emergency location logs
    - id, user_id, owner_name, owner_phone
    - latitude, longitude, emergency_type, status, created_at

## Security (RLS)
- **services**: Public read (anon + authenticated), no writes from frontend
- **products**: Public read, owner-scoped insert/update/delete
- **product_bids**: Public read, authenticated insert (owner-scoped)
- **announcements**: Public read, owner-scoped insert/update/delete
- **rides**: Public read, owner-scoped insert/update/delete
- **ride_requests**: Public read, owner-scoped insert/update/delete
- **community_reports**: Public read, owner-scoped insert/update/delete (guest can insert with null user_id)
- **health_requests**: Public read, owner-scoped insert/update/delete
- **agriculture_requests**: Public read, owner-scoped insert/update/delete
- **emergency_requests**: Owner-scoped read/insert
- **profiles**: Owner-scoped read/update only

## Notes
1. All owner columns default to auth.uid() so inserts work without passing user_id
2. community_reports allows guest inserts (user_id can be null)
3. Email confirmation is OFF
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  whatsapp_enabled boolean DEFAULT false,
  email text,
  location text,
  user_type text DEFAULT 'individual',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

-- 2. services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text,
  address text,
  phone text,
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_phone text,
  latitude double precision,
  longitude double precision,
  working_hours text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_read_all" ON services;
CREATE POLICY "services_read_all" ON services FOR SELECT
  TO anon, authenticated USING (true);

-- 3. products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text,
  owner_phone text,
  owner_whatsapp_enabled boolean DEFAULT false,
  title text NOT NULL,
  category text,
  price text,
  unit text,
  description text,
  location text,
  image_url text,
  is_auction boolean DEFAULT false,
  current_bid numeric,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_read_all" ON products;
CREATE POLICY "products_read_all" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "products_insert_own" ON products;
CREATE POLICY "products_insert_own" ON products FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_update_own" ON products;
CREATE POLICY "products_update_own" ON products FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_delete_own" ON products;
CREATE POLICY "products_delete_own" ON products FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4. product_bids
CREATE TABLE IF NOT EXISTS product_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bidder_name text,
  bid_amount numeric,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE product_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bids_read_all" ON product_bids;
CREATE POLICY "bids_read_all" ON product_bids FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "bids_insert_own" ON product_bids;
CREATE POLICY "bids_insert_own" ON product_bids FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. community_reports
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  owner_phone text,
  owner_whatsapp_enabled boolean DEFAULT false,
  report_type text,
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  urgency text DEFAULT 'متوسط',
  elderly_related boolean DEFAULT false,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_read_all" ON community_reports;
CREATE POLICY "reports_read_all" ON community_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "reports_insert_own" ON community_reports;
CREATE POLICY "reports_insert_own" ON community_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "reports_insert_anon" ON community_reports;
CREATE POLICY "reports_insert_anon" ON community_reports FOR INSERT
  TO anon WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "reports_update_own" ON community_reports;
CREATE POLICY "reports_update_own" ON community_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reports_delete_own" ON community_reports;
CREATE POLICY "reports_delete_own" ON community_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 6. announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text,
  owner_phone text,
  owner_whatsapp_enabled boolean DEFAULT false,
  title text NOT NULL,
  category text,
  event_date date,
  event_time text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_read_all" ON announcements;
CREATE POLICY "announcements_read_all" ON announcements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "announcements_insert_own" ON announcements;
CREATE POLICY "announcements_insert_own" ON announcements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "announcements_update_own" ON announcements;
CREATE POLICY "announcements_update_own" ON announcements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "announcements_delete_own" ON announcements;
CREATE POLICY "announcements_delete_own" ON announcements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 7. health_requests
CREATE TABLE IF NOT EXISTS health_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text,
  owner_phone text,
  owner_whatsapp_enabled boolean DEFAULT false,
  age integer,
  symptoms text,
  urgency text DEFAULT 'متوسط',
  location text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE health_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_read_all" ON health_requests;
CREATE POLICY "health_read_all" ON health_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "health_insert_own" ON health_requests;
CREATE POLICY "health_insert_own" ON health_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_update_own" ON health_requests;
CREATE POLICY "health_update_own" ON health_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "health_delete_own" ON health_requests;
CREATE POLICY "health_delete_own" ON health_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 8. agriculture_requests
CREATE TABLE IF NOT EXISTS agriculture_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text,
  owner_phone text,
  owner_whatsapp_enabled boolean DEFAULT false,
  crop_type text,
  problem_description text,
  image_url text,
  ai_diagnosis text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE agriculture_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agri_read_all" ON agriculture_requests;
CREATE POLICY "agri_read_all" ON agriculture_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "agri_insert_own" ON agriculture_requests;
CREATE POLICY "agri_insert_own" ON agriculture_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "agri_update_own" ON agriculture_requests;
CREATE POLICY "agri_update_own" ON agriculture_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "agri_delete_own" ON agriculture_requests;
CREATE POLICY "agri_delete_own" ON agriculture_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 9. rides
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_name text,
  driver_phone text,
  whatsapp_enabled boolean DEFAULT false,
  from_location text,
  to_location text,
  departure_time text,
  available_seats integer DEFAULT 1,
  uae_pass_verified boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rides_read_all" ON rides;
CREATE POLICY "rides_read_all" ON rides FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "rides_insert_own" ON rides;
CREATE POLICY "rides_insert_own" ON rides FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rides_update_own" ON rides;
CREATE POLICY "rides_update_own" ON rides FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rides_delete_own" ON rides;
CREATE POLICY "rides_delete_own" ON rides FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 10. ride_requests
CREATE TABLE IF NOT EXISTS ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text,
  requester_phone text,
  whatsapp_enabled boolean DEFAULT false,
  from_location text,
  to_location text,
  requested_time text,
  passengers integer DEFAULT 1,
  notes text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ride_reqs_read_all" ON ride_requests;
CREATE POLICY "ride_reqs_read_all" ON ride_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ride_reqs_insert_own" ON ride_requests;
CREATE POLICY "ride_reqs_insert_own" ON ride_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ride_reqs_update_own" ON ride_requests;
CREATE POLICY "ride_reqs_update_own" ON ride_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ride_reqs_delete_own" ON ride_requests;
CREATE POLICY "ride_reqs_delete_own" ON ride_requests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 11. emergency_requests
CREATE TABLE IF NOT EXISTS emergency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text,
  owner_phone text,
  latitude double precision,
  longitude double precision,
  emergency_type text,
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emergency_insert_own" ON emergency_requests;
CREATE POLICY "emergency_insert_own" ON emergency_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "emergency_read_own" ON emergency_requests;
CREATE POLICY "emergency_read_own" ON emergency_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON community_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_user_id ON announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_health_user_id ON health_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_agri_user_id ON agriculture_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rides_user_id ON rides(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_reqs_user_id ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_product_id ON product_bids(product_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
