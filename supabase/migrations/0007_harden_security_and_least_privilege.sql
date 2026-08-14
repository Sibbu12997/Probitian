-- ============================================================
-- MIGRATION 0007: Comprehensive Security Hardening & Least-Privilege Enforcement
-- ============================================================

-- 1. Ensure schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Revoke all broad privileges from public / anon / authenticated roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 3. Grant explicit read-only access for public website visitors
GRANT SELECT ON TABLE public.projects TO anon, authenticated;
GRANT SELECT ON TABLE public.blogs TO anon, authenticated;
GRANT SELECT ON TABLE public.categories TO anon, authenticated;
GRANT SELECT ON TABLE public.videos TO anon, authenticated;
GRANT SELECT ON TABLE public.courses TO anon, authenticated;
GRANT SELECT ON TABLE public.social_links TO anon, authenticated;
GRANT SELECT ON TABLE public.media TO anon, authenticated;
GRANT SELECT ON TABLE public.pages TO anon, authenticated;
GRANT SELECT ON TABLE public.navigation TO anon, authenticated;
GRANT SELECT ON TABLE public.settings TO anon, authenticated;

-- 4. Grant explicit insert permissions for public submissions
GRANT INSERT ON TABLE public.messages TO anon, authenticated;
GRANT INSERT ON TABLE public.newsletter TO anon, authenticated;

-- 5. Grant full privileges strictly to service_role (Express backend with SUPABASE_SECRET_KEY)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 6. Ensure default privileges for future objects are restricted to service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 7. Ensure RLS is active across all application tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- 8. Clean up and ensure precise RLS policies
-- Drop any legacy overly permissive policies
DROP POLICY IF EXISTS "Public select email_campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Public select email_campaign_recipients" ON public.email_campaign_recipients;
DROP POLICY IF EXISTS "Public Upload to probitian-media" ON storage.objects;

-- Ensure service_role has explicit full access policies where applicable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Service role full access on email_campaigns'
  ) THEN
    CREATE POLICY "Service role full access on email_campaigns" ON public.email_campaigns
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaign_recipients' AND policyname = 'Service role full access on email_campaign_recipients'
  ) THEN
    CREATE POLICY "Service role full access on email_campaign_recipients" ON public.email_campaign_recipients
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public Access to probitian-media'
  ) THEN
    CREATE POLICY "Public Access to probitian-media" ON storage.objects
      FOR SELECT USING (bucket_id = 'probitian-media');
  END IF;
END $$;
