
-- ============================================================
-- PROFILES (extends auth.users — one row per auth user)
-- ============================================================
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role    NOT NULL DEFAULT 'user',
  full_name   text         NOT NULL DEFAULT '',
  phone       text,
  avatar_url  text,
  is_verified boolean      NOT NULL DEFAULT false,
  is_active   boolean      NOT NULL DEFAULT true,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- USER PROFILE EXTENSION
-- ============================================================
CREATE TABLE user_profiles (
  id                       uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  location_in_camp         text,
  residential_address      text,
  blood_type               blood_type   DEFAULT 'unknown',
  allergies                text,
  health_info              text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  emergency_contact_rel    text,
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVER PROFILE EXTENSION
-- ============================================================
CREATE TABLE driver_profiles (
  id               uuid        PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type     vehicle_type NOT NULL,
  license_plate    text         NOT NULL,
  association_id   text,
  permit_info      text,
  base_location    text,
  current_location geography(Point, 4326),
  status           driver_status NOT NULL DEFAULT 'offline',
  rating           numeric(3,2)  NOT NULL DEFAULT 5.00 CHECK (rating BETWEEN 1 AND 5),
  total_trips      integer       NOT NULL DEFAULT 0,
  total_earnings   numeric(12,2) NOT NULL DEFAULT 0.00,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- VENDOR PROFILE EXTENSION
-- ============================================================
CREATE TABLE vendor_profiles (
  id               uuid          PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name    text          NOT NULL,
  category         vendor_category NOT NULL DEFAULT 'other',
  business_address text,
  pickup_location  geography(Point, 4326),
  location_in_camp text,
  tagline          text,
  description      text,
  logo_url         text,
  cover_url        text,
  display_style    display_style  NOT NULL DEFAULT 'grid',
  opening_hours    text,
  is_open          boolean        NOT NULL DEFAULT false,
  rating           numeric(3,2)   NOT NULL DEFAULT 5.00 CHECK (rating BETWEEN 1 AND 5),
  total_orders     integer        NOT NULL DEFAULT 0,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

-- Vendor gallery images (up to 6)
CREATE TABLE vendor_images (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid        NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  url        text        NOT NULL,
  sort_order integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RESPONDER PROFILE EXTENSION (security + medical share this)
-- ============================================================
CREATE TABLE responder_profiles (
  id               uuid          PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  badge_number     text          UNIQUE,
  current_location geography(Point, 4326),
  status           driver_status NOT NULL DEFAULT 'offline',
  assigned_zone    text,
  total_responses  integer       NOT NULL DEFAULT 0,
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- WALLETS (one per user, created via trigger)
-- ============================================================
CREATE TABLE wallets (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid         NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance    numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency   text         NOT NULL DEFAULT 'NGN',
  updated_at timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- WALLET TRANSACTIONS (immutable ledger)
-- ============================================================
CREATE TABLE wallet_transactions (
  id          uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id   uuid               NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  user_id     uuid               NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type        transaction_type   NOT NULL,
  amount      numeric(12,2)      NOT NULL CHECK (amount > 0),
  status      transaction_status NOT NULL DEFAULT 'pending',
  reference   text               UNIQUE,
  description text,
  metadata    jsonb,
  created_at  timestamptz        NOT NULL DEFAULT now()
);

-- ============================================================
-- PAYSTACK PAYMENT LOG (webhook source of truth)
-- ============================================================
CREATE TABLE paystack_payments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reference        text        NOT NULL UNIQUE,
  amount           numeric(12,2) NOT NULL,     -- NGN (not kobo)
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','success','failed','abandoned')),
  channel          text,                        -- card | bank | ussd | mobile_money
  gateway_response text,
  paid_at          timestamptz,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
