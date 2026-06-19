
-- ============================================================
-- NOTIFICATIONS
-- Written by Edge Functions (service_role). Read/updated by
-- authenticated users via NotificationContext + notification-center.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  title      text        NOT NULL DEFAULT '',
  body       text,
  data       jsonb,
  is_read    boolean     NOT NULL DEFAULT false,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx  ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS notifications_created_idx  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No INSERT policy for authenticated — only service_role writes
-- No DELETE policy — notifications are immutable by users

-- ============================================================
-- SOS DISPATCH LOG
-- One row per broadcast-sos invocation. Mirrors driver_match_log
-- but scoped to SOS alert dispatch.
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_dispatch_log (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id           uuid        NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  attempt_number     integer     NOT NULL DEFAULT 1,
  alert_type         text        NOT NULL CHECK (alert_type IN ('health', 'security')),
  lat                double precision NOT NULL,
  lng                double precision NOT NULL,
  radius_m           double precision NOT NULL,
  candidates         jsonb       NOT NULL DEFAULT '[]',
  notifications_sent integer     NOT NULL DEFAULT 0,
  status             text        NOT NULL DEFAULT 'dispatched'
                                 CHECK (status IN ('dispatched', 'no_responders', 'error')),
  error_message      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sos_dispatch_log_alert_id_idx ON sos_dispatch_log (alert_id);

ALTER TABLE sos_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Users can read dispatch logs for their own alerts
CREATE POLICY "sos_dispatch_log_select_own_user"
  ON sos_dispatch_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sos_alerts
      WHERE id = alert_id AND user_id = auth.uid()
    )
  );

-- Responders and admins can read all logs
CREATE POLICY "sos_dispatch_log_select_responder_admin"
  ON sos_dispatch_log FOR SELECT TO authenticated
  USING (get_my_role() IN ('medical_responder', 'security_responder', 'super_admin'));

-- ============================================================
-- Grant service_role execute on find_nearby_responders
-- ============================================================
GRANT EXECUTE ON FUNCTION find_nearby_responders(double precision, double precision, sos_type, double precision)
  TO service_role;
