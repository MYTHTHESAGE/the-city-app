
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'user',
  'driver',
  'vendor',
  'security_responder',
  'medical_responder',
  'super_admin'
);

CREATE TYPE vehicle_type AS ENUM (
  'car',
  'motorbike',
  'tricycle',
  'bicycle',
  'van',
  'truck'
);

CREATE TYPE vendor_category AS ENUM (
  'food_drink',
  'groceries',
  'fashion_beauty',
  'electronics',
  'books_stationery',
  'health_pharmacy',
  'services',
  'other'
);

CREATE TYPE blood_type AS ENUM (
  'a_pos', 'a_neg',
  'b_pos', 'b_neg',
  'ab_pos', 'ab_neg',
  'o_pos', 'o_neg',
  'unknown'
);

CREATE TYPE driver_status AS ENUM ('online', 'offline', 'busy');

CREATE TYPE ride_status AS ENUM (
  'pending',
  'searching',
  'driver_assigned',
  'driver_enroute',
  'driver_arrived',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

CREATE TYPE sos_type AS ENUM ('health', 'security');

CREATE TYPE sos_status AS ENUM (
  'pending',
  'dispatched',
  'responder_enroute',
  'resolved',
  'false_alarm',
  'cancelled'
);

CREATE TYPE transaction_type AS ENUM (
  'deposit',
  'withdrawal',
  'ride_payment',
  'ride_refund',
  'order_payment',
  'order_refund',
  'tip',
  'driver_earning',
  'vendor_earning'
);

CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'reversed'
);

CREATE TYPE payment_method AS ENUM ('wallet', 'cash', 'paystack');

CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');

CREATE TYPE display_style AS ENUM ('grid', 'list', 'featured');

CREATE TYPE delivery_method AS ENUM ('delivery', 'pickup');

CREATE TYPE driver_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
