
-- ============================================================
-- FUNCTION: get_online_drivers_map
-- Returns lat/lng for all online drivers for map display.
-- Any authenticated user can call this (drivers are semi-public
-- per the existing driver_profiles_select_authenticated policy).
-- ============================================================
CREATE OR REPLACE FUNCTION get_online_drivers_map()
RETURNS TABLE (
  driver_id    uuid,
  lat          double precision,
  lng          double precision,
  vehicle_type text,
  rating       numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id                                             AS driver_id,
    ST_Y(dp.current_location::geometry)               AS lat,
    ST_X(dp.current_location::geometry)               AS lng,
    dp.vehicle_type::text                             AS vehicle_type,
    dp.rating
  FROM driver_profiles dp
  WHERE dp.status = 'online'
    AND dp.current_location IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_online_drivers_map() TO authenticated;

-- ============================================================
-- FUNCTION: get_pending_sos_alerts_map
-- Returns active SOS alerts with lat/lng for the responder map.
-- Filters by the caller's role (same logic as fetchPendingSosAlerts).
-- ============================================================
CREATE OR REPLACE FUNCTION get_pending_sos_alerts_map()
RETURNS TABLE (
  alert_id   uuid,
  alert_type text,
  status     text,
  lat        double precision,
  lng        double precision
) AS $$
DECLARE
  v_role text;
BEGIN
  v_role := get_my_role()::text;

  RETURN QUERY
  SELECT
    sa.id                             AS alert_id,
    sa.type::text                     AS alert_type,
    sa.status::text                   AS status,
    ST_Y(sa.location::geometry)       AS lat,
    ST_X(sa.location::geometry)       AS lng
  FROM sos_alerts sa
  WHERE sa.status IN ('pending', 'dispatched', 'responder_assigned', 'responder_enroute', 'on_scene', 'escalated')
    AND (
      v_role = 'super_admin'
      OR (v_role = 'medical_responder'  AND sa.type = 'health')
      OR (v_role = 'security_responder' AND sa.type = 'security')
    )
  ORDER BY sa.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_pending_sos_alerts_map() TO authenticated;

-- ============================================================
-- FUNCTION: get_responder_location
-- Returns the caller's own responder lat/lng for map centering.
-- ============================================================
CREATE OR REPLACE FUNCTION get_responder_location()
RETURNS TABLE (lat double precision, lng double precision) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_Y(rp.current_location::geometry) AS lat,
    ST_X(rp.current_location::geometry) AS lng
  FROM responder_profiles rp
  WHERE rp.id = auth.uid()
    AND rp.current_location IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_responder_location() TO authenticated;
