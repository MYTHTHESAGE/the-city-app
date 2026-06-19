
-- ============================================================
-- RIDE REQUESTS
-- ============================================================
CREATE TABLE ride_requests (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid         NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  driver_id         uuid         REFERENCES driver_profiles(id) ON DELETE SET NULL,
  pickup_address    text         NOT NULL,
  pickup_location   geography(Point, 4326) NOT NULL,
  dropoff_address   text         NOT NULL,
  dropoff_location  geography(Point, 4326) NOT NULL,
  status            ride_status  NOT NULL DEFAULT 'pending',
  fare              numeric(10,2),
  payment_method    payment_method NOT NULL DEFAULT 'cash',
  rating            smallint     CHECK (rating BETWEEN 1 AND 5),
  rating_comment    text,
  cancelled_by      text         CHECK (cancelled_by IN ('user','driver','system')),
  cancel_reason     text,
  accepted_at       timestamptz,
  driver_arrived_at timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDERS (food delivery)
-- ============================================================
CREATE TABLE orders (
  id               uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  vendor_id        uuid           NOT NULL REFERENCES vendor_profiles(id) ON DELETE RESTRICT,
  driver_id        uuid           REFERENCES driver_profiles(id) ON DELETE SET NULL,
  status           order_status   NOT NULL DEFAULT 'pending',
  method           delivery_method NOT NULL DEFAULT 'delivery',
  delivery_address text,
  delivery_location geography(Point, 4326),
  subtotal         numeric(10,2)  NOT NULL CHECK (subtotal >= 0),
  delivery_fee     numeric(10,2)  NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
  total            numeric(10,2)  NOT NULL CHECK (total >= 0),
  payment_method   payment_method NOT NULL DEFAULT 'cash',
  payment_status   text           NOT NULL DEFAULT 'pending'
                                  CHECK (payment_status IN ('pending','paid','refunded')),
  notes            text,
  confirmed_at     timestamptz,
  ready_at         timestamptz,
  picked_up_at     timestamptz,
  delivered_at     timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDER ITEMS (price/name snapshot at order time)
-- ============================================================
CREATE TABLE order_items (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    uuid         REFERENCES products(id) ON DELETE SET NULL,
  product_name  text         NOT NULL,
  product_price numeric(10,2) NOT NULL CHECK (product_price >= 0),
  quantity      integer       NOT NULL CHECK (quantity > 0),
  subtotal      numeric(10,2) NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVER REQUEST POOL (unified for rides + deliveries)
-- Dispatched by Edge Function; drivers accept/decline here.
-- ============================================================
CREATE TABLE driver_requests (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id    uuid                 NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  request_type text                 NOT NULL CHECK (request_type IN ('ride','delivery')),
  ride_id      uuid                 REFERENCES ride_requests(id) ON DELETE CASCADE,
  order_id     uuid                 REFERENCES orders(id) ON DELETE CASCADE,
  status       driver_request_status NOT NULL DEFAULT 'pending',
  distance_m   numeric(10,2),
  created_at   timestamptz          NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT one_linked_request CHECK (
    (ride_id IS NOT NULL AND order_id IS NULL) OR
    (ride_id IS NULL  AND order_id IS NOT NULL)
  )
);
