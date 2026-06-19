
-- ============================================================
-- Extend sos_status enum with the full lifecycle values
-- ============================================================
ALTER TYPE sos_status ADD VALUE IF NOT EXISTS 'responder_assigned';
ALTER TYPE sos_status ADD VALUE IF NOT EXISTS 'on_scene';
ALTER TYPE sos_status ADD VALUE IF NOT EXISTS 'escalated';

-- ============================================================
-- SOS STATUS HISTORY
-- Immutable audit trail — one row per status transition.
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_status_history (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id     uuid        NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  status       sos_status  NOT NULL,
  changed_by   uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sos_status_history_alert_id_idx ON sos_status_history (alert_id);

-- ============================================================
-- RLS — sos_status_history
-- ============================================================
ALTER TABLE sos_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sos_history_select_own_user"
  ON sos_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sos_alerts WHERE id = alert_id AND user_id = auth.uid()
  ));

CREATE POLICY "sos_history_select_responder"
  ON sos_status_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sos_alerts WHERE id = alert_id AND responder_id = auth.uid()
  ));

CREATE POLICY "sos_history_select_medical"
  ON sos_status_history FOR SELECT TO authenticated
  USING (
    get_my_role() = 'medical_responder' AND
    EXISTS (SELECT 1 FROM sos_alerts WHERE id = alert_id AND type = 'health')
  );

CREATE POLICY "sos_history_select_security"
  ON sos_status_history FOR SELECT TO authenticated
  USING (
    get_my_role() = 'security_responder' AND
    EXISTS (SELECT 1 FROM sos_alerts WHERE id = alert_id AND type = 'security')
  );

CREATE POLICY "sos_history_select_admin"
  ON sos_status_history FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "sos_history_insert_auth"
  ON sos_status_history FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = changed_by AND (
      EXISTS (SELECT 1 FROM sos_alerts WHERE id = alert_id AND user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM sos_alerts WHERE id = alert_id AND responder_id = auth.uid()) OR
      get_my_role() IN ('medical_responder', 'security_responder', 'super_admin')
    )
  );

-- ============================================================
-- TRIGGER: auto-write sos_status_history on sos_alerts UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION record_sos_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO sos_status_history (alert_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_sos_status_change
  AFTER UPDATE ON sos_alerts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION record_sos_status_change();

-- ============================================================
-- Extend existing responder UPDATE policy to include WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "sos_update_responder" ON sos_alerts;

CREATE POLICY "sos_update_responder"
  ON sos_alerts FOR UPDATE TO authenticated
  USING (
    get_my_role() IN ('medical_responder', 'security_responder', 'super_admin')
  )
  WITH CHECK (
    get_my_role() IN ('medical_responder', 'security_responder', 'super_admin')
  );
