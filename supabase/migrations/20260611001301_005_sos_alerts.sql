
-- ============================================================
-- SOS ALERTS
-- ============================================================
CREATE TABLE sos_alerts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  type                  sos_type    NOT NULL,
  location              geography(Point, 4326) NOT NULL,
  location_address      text,
  status                sos_status  NOT NULL DEFAULT 'pending',
  responder_id          uuid        REFERENCES responder_profiles(id) ON DELETE SET NULL,
  notes                 text,
  dispatched_at         timestamptz,
  responder_arrived_at  timestamptz,
  resolved_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);
