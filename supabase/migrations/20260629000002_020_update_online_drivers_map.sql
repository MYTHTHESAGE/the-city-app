-- Update get_online_drivers_map to include driver's full name from profiles table

CREATE OR REPLACE FUNCTION get_online_drivers_map()
RETURNS TABLE (
  driver_id    uuid,
  lat          double precision,
  lng          double precision,
  vehicle_type text,
  rating       numeric,
  full_name    text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id                                             AS driver_id,
    ST_Y(dp.current_location::geometry)               AS lat,
    ST_X(dp.current_location::geometry)               AS lng,
    dp.vehicle_type::text                             AS vehicle_type,
    dp.rating                                         AS rating,
    p.full_name                                       AS full_name
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.id
  WHERE dp.status = 'online'
    AND dp.current_location IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_online_drivers_map() TO authenticated;
