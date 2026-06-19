
-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- profile-images : public  — avatar photos shown in ride/order cards
-- driver-documents: private — permits and license scans (sensitive)
-- vendor-assets  : public  — logos, covers, gallery (marketplace display)
-- product-images : public  — product photos (marketplace display)
-- sos-attachments: private — photos sent with emergency alerts
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'profile-images',
    'profile-images',
    true,
    5242880,                            -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
  ),
  (
    'driver-documents',
    'driver-documents',
    false,
    10485760,                           -- 10 MB
    ARRAY['image/jpeg','image/png','application/pdf']
  ),
  (
    'vendor-assets',
    'vendor-assets',
    true,
    10485760,                           -- 10 MB
    ARRAY['image/jpeg','image/png','image/webp']
  ),
  (
    'product-images',
    'product-images',
    true,
    5242880,                            -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp']
  ),
  (
    'sos-attachments',
    'sos-attachments',
    false,
    20971520,                           -- 20 MB
    ARRAY['image/jpeg','image/png','image/webp','video/mp4']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PATH CONVENTIONS
-- ============================================================
-- profile-images/{user_id}/avatar.{ext}
-- driver-documents/{driver_id}/license.{ext}
-- driver-documents/{driver_id}/permit.{ext}
-- vendor-assets/{vendor_id}/logo.{ext}
-- vendor-assets/{vendor_id}/cover.{ext}
-- vendor-assets/{vendor_id}/gallery/{index}.{ext}
-- product-images/{vendor_id}/{product_id}.{ext}
-- sos-attachments/{alert_id}/{filename}
-- ============================================================

-- ============================================================
-- STORAGE RLS — profile-images (public bucket)
-- ============================================================
CREATE POLICY "profile_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "profile_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "profile_images_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- STORAGE RLS — driver-documents (private bucket)
-- ============================================================

-- Driver sees only their own documents; admin sees all
CREATE POLICY "driver_docs_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'super_admin'
    )
  );

CREATE POLICY "driver_docs_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() = 'driver'
  );

CREATE POLICY "driver_docs_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "driver_docs_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- STORAGE RLS — vendor-assets (public bucket)
-- ============================================================
CREATE POLICY "vendor_assets_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vendor-assets');

CREATE POLICY "vendor_assets_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vendor-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() = 'vendor'
  );

CREATE POLICY "vendor_assets_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vendor-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "vendor_assets_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'vendor-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- STORAGE RLS — product-images (public bucket)
-- ============================================================
CREATE POLICY "product_images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Path: product-images/{vendor_id}/{product_id}.ext
-- Vendor may only upload into their own vendor_id folder
CREATE POLICY "product_images_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.get_my_role() = 'vendor'
  );

CREATE POLICY "product_images_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- STORAGE RLS — sos-attachments (private bucket)
-- ============================================================

-- User sees attachments for their own alerts
-- Responders see attachments for alerts assigned to them or their pool
-- Admin sees everything
CREATE POLICY "sos_attachments_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sos-attachments'
    AND (
      -- uploader (path starts with alert_id belonging to the user)
      EXISTS (
        SELECT 1 FROM public.sos_alerts
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
      )
      -- assigned responder
      OR EXISTS (
        SELECT 1 FROM public.sos_alerts
        WHERE id::text = (storage.foldername(name))[1]
          AND responder_id = auth.uid()
      )
      -- medical responder can see health alerts
      OR (
        public.get_my_role() = 'medical_responder'
        AND EXISTS (
          SELECT 1 FROM public.sos_alerts
          WHERE id::text = (storage.foldername(name))[1]
            AND type = 'health'
        )
      )
      -- security responder can see security alerts
      OR (
        public.get_my_role() = 'security_responder'
        AND EXISTS (
          SELECT 1 FROM public.sos_alerts
          WHERE id::text = (storage.foldername(name))[1]
            AND type = 'security'
        )
      )
      -- admin sees all
      OR public.get_my_role() = 'super_admin'
    )
  );

-- Users may upload to alert folders they own
CREATE POLICY "sos_attachments_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sos-attachments'
    AND EXISTS (
      SELECT 1 FROM public.sos_alerts
      WHERE id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "sos_attachments_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'sos-attachments'
    AND (
      EXISTS (
        SELECT 1 FROM public.sos_alerts
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
      )
      OR public.get_my_role() = 'super_admin'
    )
  );
