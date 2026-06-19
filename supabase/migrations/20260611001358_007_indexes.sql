
-- ============================================================
-- SPATIAL INDEXES (GIST)
-- ============================================================
CREATE INDEX driver_profiles_location_gist    ON driver_profiles    USING GIST (current_location);
CREATE INDEX vendor_profiles_pickup_gist      ON vendor_profiles    USING GIST (pickup_location);
CREATE INDEX ride_requests_pickup_gist        ON ride_requests      USING GIST (pickup_location);
CREATE INDEX ride_requests_dropoff_gist       ON ride_requests      USING GIST (dropoff_location);
CREATE INDEX orders_delivery_location_gist    ON orders             USING GIST (delivery_location);
CREATE INDEX sos_alerts_location_gist         ON sos_alerts         USING GIST (location);
CREATE INDEX responder_profiles_location_gist ON responder_profiles USING GIST (current_location);

-- ============================================================
-- BTREE INDEXES — status columns (realtime subscriptions + querying)
-- ============================================================
CREATE INDEX ride_requests_status_idx       ON ride_requests    (status);
CREATE INDEX ride_requests_user_id_idx      ON ride_requests    (user_id);
CREATE INDEX ride_requests_driver_id_idx    ON ride_requests    (driver_id);
CREATE INDEX ride_requests_created_at_idx   ON ride_requests    (created_at DESC);

CREATE INDEX orders_status_idx              ON orders           (status);
CREATE INDEX orders_vendor_id_idx           ON orders           (vendor_id);
CREATE INDEX orders_user_id_idx             ON orders           (user_id);
CREATE INDEX orders_driver_id_idx           ON orders           (driver_id);
CREATE INDEX orders_created_at_idx          ON orders           (created_at DESC);

CREATE INDEX driver_requests_driver_id_idx  ON driver_requests  (driver_id);
CREATE INDEX driver_requests_status_idx     ON driver_requests  (status);
CREATE INDEX driver_requests_ride_id_idx    ON driver_requests  (ride_id);
CREATE INDEX driver_requests_order_id_idx   ON driver_requests  (order_id);

CREATE INDEX sos_alerts_status_idx          ON sos_alerts       (status);
CREATE INDEX sos_alerts_type_idx            ON sos_alerts       (type);
CREATE INDEX sos_alerts_user_id_idx         ON sos_alerts       (user_id);
CREATE INDEX sos_alerts_responder_id_idx    ON sos_alerts       (responder_id);
CREATE INDEX sos_alerts_created_at_idx      ON sos_alerts       (created_at DESC);

CREATE INDEX wallet_transactions_user_id_idx   ON wallet_transactions (user_id);
CREATE INDEX wallet_transactions_wallet_id_idx ON wallet_transactions (wallet_id);
CREATE INDEX wallet_transactions_created_at_idx ON wallet_transactions (created_at DESC);

CREATE INDEX products_vendor_id_idx         ON products         (vendor_id);
CREATE INDEX products_available_idx         ON products         (vendor_id, is_available);

CREATE INDEX driver_profiles_status_idx     ON driver_profiles  (status);

CREATE INDEX paystack_payments_user_id_idx  ON paystack_payments (user_id);
CREATE INDEX paystack_payments_status_idx   ON paystack_payments (status);

CREATE INDEX vendor_images_vendor_id_idx    ON vendor_images    (vendor_id, sort_order);
CREATE INDEX order_items_order_id_idx       ON order_items      (order_id);
