
-- ============================================================
-- DRIVER MATCH LOG
-- One row per match-driver invocation. Used for observability,
-- duplicate-dispatch prevention, and debugging.
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_match_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id        uuid        NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  attempt_number integer     NOT NULL DEFAULT 1,
  pickup_lat     double precision NOT NULL,
  pickup_lng     double precision NOT NULL,
  radius_m       double precision NOT NULL,
  candidates     jsonb       NOT NULL DEFAULT '[]',  -- snapshot of returned drivers
  requests_sent  integer     NOT NULL DEFAULT 0,
  status         text        NOT NULL DEFAULT 'dispatched'
                             CHECK (status IN ('dispatched','no_drivers','error')),
  error_message  text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS driver_match_log_ride_id_idx ON driver_match_log (ride_id);

ALTER TABLE driver_match_log ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) writes; users can read their own
CREATE POLICY "match_log_select_own"
  ON driver_match_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE id = ride_id AND user_id = auth.uid()
    )
  );

-- Drivers and admins can also read logs for their requests
CREATE POLICY "match_log_select_driver_admin"
  ON driver_match_log FOR SELECT TO authenticated
  USING (get_my_role() IN ('driver', 'super_admin'));

-- ============================================================
-- Grant service_role execute on find_nearby_drivers
-- (already SECURITY DEFINER but explicit grant is cleaner)
-- ============================================================
GRANT EXECUTE ON FUNCTION find_nearby_drivers(double precision, double precision, double precision)
  TO service_role;
