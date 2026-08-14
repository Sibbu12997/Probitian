-- ============================================================
-- MIGRATION 0004: Grant Table Permissions & Ensure RLS Security Policies
-- ============================================================

-- Grant schema level usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant SELECT only on public content tables for anon and authenticated visitors
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

-- Grant INSERT only on contact messages and newsletter for public visitors
GRANT INSERT ON TABLE public.messages TO anon, authenticated;
GRANT INSERT ON TABLE public.newsletter TO anon, authenticated;

-- Grant full table & sequence privileges strictly to service_role (server-side backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- Set default privileges for any future tables created in public schema strictly for service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- Ensure RLS Policies for email_campaigns and email_campaign_recipients
ALTER TABLE IF EXISTS public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Campaign data is administrative only - accessed server-side via service_role or authenticated admin session
DO $
BEGIN
  -- Drop any legacy public select policies if they exist
  DROP POLICY IF EXISTS "Public select email_campaigns" ON public.email_campaigns;
  DROP POLICY IF EXISTS "Public select email_campaign_recipients" ON public.email_campaign_recipients;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Admin all email_campaigns'
  ) THEN
    CREATE POLICY "Admin all email_campaigns" ON public.email_campaigns FOR ALL USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaign_recipients' AND policyname = 'Admin all email_campaign_recipients'
  ) THEN
    CREATE POLICY "Admin all email_campaign_recipients" ON public.email_campaign_recipients FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $;

