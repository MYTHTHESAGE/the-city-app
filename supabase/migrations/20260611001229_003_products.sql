
-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid         NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  name         text         NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL CHECK (price >= 0),
  image_url    text,
  stock_status stock_status  NOT NULL DEFAULT 'in_stock',
  is_available boolean       NOT NULL DEFAULT true,
  sort_order   integer       NOT NULL DEFAULT 0,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);
