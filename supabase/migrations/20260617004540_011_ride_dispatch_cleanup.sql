
-- ============================================================
-- TRIGGER: auto-decline competing driver_requests when a ride
-- is accepted by one driver (ride_requests.status changes to
-- driver_assigned). This keeps the driver request pool clean
-- so competing drivers do not see a stale pending entry.
-- ============================================================

CREATE OR REPLACE FUNCTION decline_competing_driver_requests()
RETURNS trigger AS $$
BEGIN
  -- Only act when status transitions away from 'pending'
  IF OLD.status = 'pending' AND NEW.status != 'pending' AND NEW.status != 'cancelled' THEN
    UPDATE driver_requests
       SET status       = 'declined',
           responded_at = now()
     WHERE ride_id  = NEW.id
       AND driver_id != COALESCE(NEW.driver_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND status    = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ride_accepted
  AFTER UPDATE ON ride_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION decline_competing_driver_requests();

-- ============================================================
-- TRIGGER: same cleanup for delivery orders — when an order
-- is picked up by a driver, decline other pending driver_requests
-- ============================================================

CREATE OR REPLACE FUNCTION decline_competing_delivery_requests()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status NOT IN ('pending', 'cancelled') THEN
    UPDATE driver_requests
       SET status       = 'declined',
           responded_at = now()
     WHERE order_id  = NEW.id
       AND driver_id != COALESCE(NEW.driver_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND status    = 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_picked_up
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION decline_competing_delivery_requests();
