-- ============================================================
-- MIGRATION 0004: Grant Table Permissions & Ensure RLS Security Policies
-- ============================================================

-- Grant schema level usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table level privileges for Supabase API roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for any future tables created in public schema
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Ensure RLS Policies for email_campaigns and email_campaign_recipients
ALTER TABLE IF EXISTS public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Public select email_campaigns'
  ) THEN
    CREATE POLICY "Public select email_campaigns" ON public.email_campaigns FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaign_recipients' AND policyname = 'Public select email_campaign_recipients'
  ) THEN
    CREATE POLICY "Public select email_campaign_recipients" ON public.email_campaign_recipients FOR SELECT USING (true);
  END IF;
END $$;
