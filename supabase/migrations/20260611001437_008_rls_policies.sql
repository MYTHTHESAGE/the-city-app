
-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE responder_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- USER PROFILES
-- ============================================================
CREATE POLICY "user_profiles_select_own"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "user_profiles_delete_admin"
  ON user_profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- DRIVER PROFILES (semi-public — users need to see nearby drivers)
-- ============================================================
CREATE POLICY "driver_profiles_select_authenticated"
  ON driver_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "driver_profiles_insert_own"
  ON driver_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "driver_profiles_update_own"
  ON driver_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "driver_profiles_delete_admin"
  ON driver_profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- VENDOR PROFILES (public marketplace — all authenticated can read)
-- ============================================================
CREATE POLICY "vendor_profiles_select_public"
  ON vendor_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vendor_profiles_insert_own"
  ON vendor_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "vendor_profiles_update_own"
  ON vendor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "vendor_profiles_delete_admin"
  ON vendor_profiles FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- VENDOR IMAGES
-- ============================================================
CREATE POLICY "vendor_images_select_public"
  ON vendor_images FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "vendor_images_insert_own"
  ON vendor_images FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "vendor_images_update_own"
  ON vendor_images FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "vendor_images_delete_own"
  ON vendor_images FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

-- ============================================================
-- RESPONDER PROFILES
-- ============================================================
CREATE POLICY "responder_profiles_select_own_or_admin"
  ON responder_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin');

CREATE POLICY "responder_profiles_insert_own"
  ON responder_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "responder_profiles_update_own"
  ON responder_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR get_my_role() = 'super_admin')
  WITH CHECK (auth.uid() = id OR get_my_role() = 'super_admin');

-- ============================================================
-- WALLETS
-- ============================================================
CREATE POLICY "wallets_select_own"
  ON wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR get_my_role() = 'super_admin');

CREATE POLICY "wallets_insert_own"
  ON wallets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wallets_update_own"
  ON wallets FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR get_my_role() = 'super_admin');

-- ============================================================
-- WALLET TRANSACTIONS (immutable — no UPDATE or DELETE)
-- ============================================================
CREATE POLICY "wallet_txns_select_own"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR get_my_role() = 'super_admin');

CREATE POLICY "wallet_txns_insert_own"
  ON wallet_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PAYSTACK PAYMENTS
-- ============================================================
CREATE POLICY "paystack_select_own"
  ON paystack_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR get_my_role() = 'super_admin');

CREATE POLICY "paystack_insert_own"
  ON paystack_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PRODUCTS (public catalog — all authenticated can read)
-- ============================================================
CREATE POLICY "products_select_public"
  ON products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "products_insert_own_vendor"
  ON products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "products_update_own_vendor"
  ON products FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "products_delete_own_vendor"
  ON products FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ) OR get_my_role() = 'super_admin');

-- ============================================================
-- RIDE REQUESTS
-- ============================================================
CREATE POLICY "rides_select_own_user"
  ON ride_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "rides_select_own_driver"
  ON ride_requests FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

-- Drivers can see unassigned pending rides to decide whether to accept
CREATE POLICY "rides_select_pending_pool"
  ON ride_requests FOR SELECT TO authenticated
  USING (status = 'pending' AND get_my_role() = 'driver');

CREATE POLICY "rides_select_admin"
  ON ride_requests FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "rides_insert_user"
  ON ride_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND get_my_role() = 'user');

CREATE POLICY "rides_update_own_user"
  ON ride_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "rides_update_own_driver"
  ON ride_requests FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "rides_update_admin"
  ON ride_requests FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- DRIVER REQUESTS (request pool)
-- ============================================================
-- Drivers only see their own dispatch entries
CREATE POLICY "driver_requests_select_own"
  ON driver_requests FOR SELECT TO authenticated
  USING (auth.uid() = driver_id OR get_my_role() = 'super_admin');

-- Insert is done via Edge Function with service role key; allow service role only
-- Authenticated users cannot insert directly
CREATE POLICY "driver_requests_update_own"
  ON driver_requests FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE POLICY "orders_select_own_user"
  ON orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "orders_select_own_vendor"
  ON orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "orders_select_own_driver"
  ON orders FOR SELECT TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "orders_select_admin"
  ON orders FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "orders_insert_user"
  ON orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND get_my_role() = 'user');

CREATE POLICY "orders_update_user"
  ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "orders_update_vendor"
  ON orders FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vendor_profiles WHERE id = vendor_id AND id = auth.uid()
  ));

CREATE POLICY "orders_update_driver"
  ON orders FOR UPDATE TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "orders_update_admin"
  ON orders FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE POLICY "order_items_select_user"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()
  ));

CREATE POLICY "order_items_select_vendor"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders o
    JOIN vendor_profiles v ON v.id = o.vendor_id
    WHERE o.id = order_id AND v.id = auth.uid()
  ));

CREATE POLICY "order_items_select_driver"
  ON order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND driver_id = auth.uid()
  ));

CREATE POLICY "order_items_select_admin"
  ON order_items FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "order_items_insert_user"
  ON order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid()
  ));

-- ============================================================
-- SOS ALERTS
-- ============================================================
CREATE POLICY "sos_select_own_user"
  ON sos_alerts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "sos_select_own_responder"
  ON sos_alerts FOR SELECT TO authenticated
  USING (auth.uid() = responder_id);

-- Medical responders see all health alerts
CREATE POLICY "sos_select_health_responders"
  ON sos_alerts FOR SELECT TO authenticated
  USING (type = 'health' AND get_my_role() = 'medical_responder');

-- Security responders see all security alerts
CREATE POLICY "sos_select_security_responders"
  ON sos_alerts FOR SELECT TO authenticated
  USING (type = 'security' AND get_my_role() = 'security_responder');

CREATE POLICY "sos_select_admin"
  ON sos_alerts FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "sos_insert_user"
  ON sos_alerts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND get_my_role() = 'user');

CREATE POLICY "sos_update_responder"
  ON sos_alerts FOR UPDATE TO authenticated
  USING (auth.uid() = responder_id);

CREATE POLICY "sos_update_admin"
  ON sos_alerts FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin');
