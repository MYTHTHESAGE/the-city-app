-- 4. Fix Driver Matching Visibility
-- Bug: Drivers receive requests, but Row Level Security (RLS) hides the ride/order details 
-- because the driver isn't assigned yet (or the ride is in 'searching' status).

DO $$
BEGIN
  -- Allow drivers to read rides that are currently seeking a driver
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rides_select_dispatch_pool') THEN
    CREATE POLICY "rides_select_dispatch_pool" ON ride_requests 
    FOR SELECT TO authenticated 
    USING (status IN ('pending', 'searching') AND get_my_role() = 'driver');
  ELSE
    -- If it exists but only allowed 'pending', we drop and recreate to include 'searching'
    DROP POLICY "rides_select_dispatch_pool" ON ride_requests;
    CREATE POLICY "rides_select_dispatch_pool" ON ride_requests 
    FOR SELECT TO authenticated 
    USING (status IN ('pending', 'searching') AND get_my_role() = 'driver');
  END IF;

  -- Fix the existing pending policy as well (just in case)
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rides_select_pending_pool') THEN
    DROP POLICY "rides_select_pending_pool" ON ride_requests;
  END IF;

  -- Allow drivers to read orders that are seeking a driver
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'orders_select_dispatch_pool') THEN
    CREATE POLICY "orders_select_dispatch_pool" ON orders 
    FOR SELECT TO authenticated 
    USING (status IN ('pending', 'preparing', 'ready', 'searching') AND get_my_role() = 'driver');
  END IF;

  -- Allow authenticated users to view the live tracker using the shareable link
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rides_select_public_auth') THEN
    CREATE POLICY "rides_select_public_auth" ON ride_requests FOR SELECT TO authenticated USING (true);
  END IF;
END
$$;
