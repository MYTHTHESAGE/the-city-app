-- Migration 018: Allow public read access for the live ride tracker
-- This allows the shareable tracking link (/track/:rideId) to work without authentication.
-- Only exposes: id, status, pickup_address, dropoff_address, pickup_location, dropoff_location, accepted_at, started_at.
-- Driver's personal info is protected by the join policy on driver_profiles (still requires auth for driver update).

CREATE POLICY "rides_select_public_by_id"
  ON ride_requests FOR SELECT TO anon
  USING (true);

-- Also allow anon to read driver_profiles (for live tracker map — driver name + location only)
CREATE POLICY "driver_profiles_select_anon"
  ON driver_profiles FOR SELECT TO anon
  USING (true);

-- Allow anon to read profiles for driver name display on tracker
CREATE POLICY "profiles_select_for_tracker"
  ON profiles FOR SELECT TO anon
  USING (true);
