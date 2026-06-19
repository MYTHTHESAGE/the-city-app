
-- ============================================================
-- 2. Fix mutable search_path on all custom functions
-- ============================================================
ALTER FUNCTION public.touch_updated_at()
  SET search_path = public;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public;

ALTER FUNCTION public.handle_new_profile()
  SET search_path = public;

ALTER FUNCTION public.debit_wallet(uuid, numeric, public.transaction_type, text, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.credit_wallet(uuid, numeric, public.transaction_type, text, text, jsonb)
  SET search_path = public;

ALTER FUNCTION public.get_my_role()
  SET search_path = public;

ALTER FUNCTION public.find_nearby_drivers(double precision, double precision, double precision)
  SET search_path = public;

ALTER FUNCTION public.find_nearby_responders(double precision, double precision, public.sos_type, double precision)
  SET search_path = public;

-- ============================================================
-- 3. Revoke direct EXECUTE from wallet and trigger functions
-- ============================================================

-- Wallet functions — only service_role should call these
REVOKE EXECUTE ON FUNCTION public.credit_wallet(uuid, numeric, public.transaction_type, text, text, jsonb)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.debit_wallet(uuid, numeric, public.transaction_type, text, text, jsonb)
  FROM anon, authenticated;

-- Trigger-only functions — nobody should call these directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_profile()
  FROM anon, authenticated;

-- Revoke anon from query functions (authenticated users still need them)
REVOKE EXECUTE ON FUNCTION public.get_my_role()
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.find_nearby_drivers(double precision, double precision, double precision)
  FROM anon;

REVOKE EXECUTE ON FUNCTION public.find_nearby_responders(double precision, double precision, public.sos_type, double precision)
  FROM anon;

-- PostGIS st_estimatedextent — internal function, revoke from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean)
  FROM anon, authenticated;

-- ============================================================
-- 4. Fix public storage bucket listing policies
--    Drop broad SELECT policies and replace with ones that
--    require authentication for listing via the API.
--    Public URL access (CDN) is unaffected by RLS.
-- ============================================================

DROP POLICY IF EXISTS "profile_images_select_public" ON storage.objects;
CREATE POLICY "profile_images_select_public"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-images');

DROP POLICY IF EXISTS "vendor_assets_select_public" ON storage.objects;
CREATE POLICY "vendor_assets_select_public"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vendor-assets');

DROP POLICY IF EXISTS "product_images_select_public" ON storage.objects;
CREATE POLICY "product_images_select_public"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-images');
