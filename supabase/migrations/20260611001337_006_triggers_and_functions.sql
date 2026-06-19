
-- ============================================================
-- HELPER: touch updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at          BEFORE UPDATE ON profiles           FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER user_profiles_updated_at     BEFORE UPDATE ON user_profiles      FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER driver_profiles_updated_at   BEFORE UPDATE ON driver_profiles    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER vendor_profiles_updated_at   BEFORE UPDATE ON vendor_profiles    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER responder_profiles_updated_at BEFORE UPDATE ON responder_profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER products_updated_at          BEFORE UPDATE ON products           FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile row on auth.users insert
-- role + full_name come from raw_user_meta_data at signup time
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: auto-create wallet on profile creation
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ============================================================
-- FUNCTION: debit wallet (atomic, prevents overdraft)
-- Returns the wallet_transaction id on success.
-- ============================================================
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id     uuid,
  p_amount      numeric,
  p_type        transaction_type,
  p_reference   text    DEFAULT NULL,
  p_description text    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_wallet_id uuid;
  v_txn_id    uuid;
BEGIN
  SELECT id INTO v_wallet_id
    FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  UPDATE wallets
     SET balance    = balance - p_amount,
         updated_at = now()
   WHERE id = v_wallet_id
     AND balance   >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'insufficient_balance'
      USING HINT = 'Wallet balance is too low for this transaction';
  END IF;

  INSERT INTO wallet_transactions
    (wallet_id, user_id, type, amount, status, reference, description, metadata)
  VALUES
    (v_wallet_id, p_user_id, p_type, p_amount, 'completed',
     p_reference, p_description, p_metadata)
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: credit wallet (atomic)
-- ============================================================
CREATE OR REPLACE FUNCTION credit_wallet(
  p_user_id     uuid,
  p_amount      numeric,
  p_type        transaction_type,
  p_reference   text    DEFAULT NULL,
  p_description text    DEFAULT NULL,
  p_metadata    jsonb   DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_wallet_id uuid;
  v_txn_id    uuid;
BEGIN
  SELECT id INTO v_wallet_id
    FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  UPDATE wallets
     SET balance    = balance + p_amount,
         updated_at = now()
   WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions
    (wallet_id, user_id, type, amount, status, reference, description, metadata)
  VALUES
    (v_wallet_id, p_user_id, p_type, p_amount, 'completed',
     p_reference, p_description, p_metadata)
  RETURNING id INTO v_txn_id;

  RETURN v_txn_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: get_my_role() — used in RLS policies
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCTION: find_nearby_drivers(lat, lng, radius_m, req_type)
-- Returns online/offline drivers within radius, ordered by proximity.
-- ============================================================
CREATE OR REPLACE FUNCTION find_nearby_drivers(
  p_lat      double precision,
  p_lng      double precision,
  p_radius_m double precision DEFAULT 5000
)
RETURNS TABLE (
  driver_id        uuid,
  full_name        text,
  vehicle_type     vehicle_type,
  license_plate    text,
  rating           numeric,
  distance_m       double precision,
  current_location geography
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    p.full_name,
    dp.vehicle_type,
    dp.license_plate,
    dp.rating,
    ST_Distance(dp.current_location,
                ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_m,
    dp.current_location
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.id
  WHERE dp.status = 'online'
    AND ST_DWithin(
          dp.current_location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- FUNCTION: find_nearby_responders(lat, lng, type, radius_m)
-- ============================================================
CREATE OR REPLACE FUNCTION find_nearby_responders(
  p_lat       double precision,
  p_lng       double precision,
  p_sos_type  sos_type,
  p_radius_m  double precision DEFAULT 3000
)
RETURNS TABLE (
  responder_id     uuid,
  full_name        text,
  role             user_role,
  distance_m       double precision,
  current_location geography
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rp.id,
    p.full_name,
    p.role,
    ST_Distance(rp.current_location,
                ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_m,
    rp.current_location
  FROM responder_profiles rp
  JOIN profiles p ON p.id = rp.id
  WHERE rp.status = 'online'
    AND (
      (p_sos_type = 'health'   AND p.role = 'medical_responder') OR
      (p_sos_type = 'security' AND p.role = 'security_responder')
    )
    AND ST_DWithin(
          rp.current_location,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
          p_radius_m
        )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
