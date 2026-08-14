-- ============================================================
-- MIGRATION 0005: Upgrade Media Storage & Table Schema
-- ============================================================

-- Ensure additional storage metadata columns on public.media
ALTER TABLE IF EXISTS public.media
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alt_text TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Grant SELECT on public.media to visitors, and full privileges strictly to service_role
GRANT SELECT ON TABLE public.media TO anon, authenticated;
GRANT ALL ON TABLE public.media TO service_role;

-- Ensure storage bucket exists in storage schema
INSERT INTO storage.buckets (id, name, public)
VALUES ('probitian-media', 'probitian-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public storage bucket read policy (uploads are strictly handled server-side via service_role)
DO $
BEGIN
  -- Drop any legacy public upload policy
  DROP POLICY IF EXISTS "Public Upload to probitian-media" ON storage.objects;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access to probitian-media'
  ) THEN
    CREATE POLICY "Public Access to probitian-media" ON storage.objects
      FOR SELECT USING (bucket_id = 'probitian-media');
  END IF;
END $;
