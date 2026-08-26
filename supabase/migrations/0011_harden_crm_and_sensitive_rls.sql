-- ============================================================
-- MIGRATION 0011: Strict Least-Privilege & RLS Policy Hardening
-- Target: Supabase PostgreSQL
-- Enforces zero-trust access: anon/authenticated cannot access CRM,
-- messages, or subscriber rosters; service_role holds exclusive backend access.
-- ============================================================

-- 1. Schema-level usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Revoke broad table privileges from untrusted client roles (anon, authenticated)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- 3. CRM & Outreach Tables: Strictly Private (Zero direct access for anon/authenticated)
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.lead_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.email_campaign_recipients FROM anon, authenticated;

-- 4. Public Content Tables: Read-Only for website visitors
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

-- 5. Public Inbound Submission Tables: INSERT only (No reading of inbox or subscriber rosters)
GRANT INSERT ON TABLE public.messages TO anon, authenticated;
GRANT INSERT ON TABLE public.newsletter TO anon, authenticated;

-- 6. Grant Full Privileges Exclusively to service_role (Express backend with SUPABASE_SECRET_KEY)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 7. Ensure Default Privileges for future objects are restricted to service_role
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

-- 8. Ensure Row Level Security (RLS) is strictly enabled across all application tables
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
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- 9. Clean up and replace overly permissive policies
DROP POLICY IF EXISTS "Allow all on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow all on lead_campaigns" ON public.lead_campaigns;
DROP POLICY IF EXISTS "Allow all on campaign_leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Public select email_campaigns" ON public.email_campaigns;
DROP POLICY IF EXISTS "Public select email_campaign_recipients" ON public.email_campaign_recipients;

-- 10. Service Role Policies for CRM & Campaigns
DO $$
BEGIN
  -- Leads Table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role full access on leads'
  ) THEN
    CREATE POLICY "Service role full access on leads" ON public.leads
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Lead Campaigns Table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lead_campaigns' AND policyname = 'Service role full access on lead_campaigns'
  ) THEN
    CREATE POLICY "Service role full access on lead_campaigns" ON public.lead_campaigns
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Campaign Leads Table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'campaign_leads' AND policyname = 'Service role full access on campaign_leads'
  ) THEN
    CREATE POLICY "Service role full access on campaign_leads" ON public.campaign_leads
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Email Campaigns Table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'Service role full access on email_campaigns'
  ) THEN
    CREATE POLICY "Service role full access on email_campaigns" ON public.email_campaigns
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Email Campaign Recipients Table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'email_campaign_recipients' AND policyname = 'Service role full access on email_campaign_recipients'
  ) THEN
    CREATE POLICY "Service role full access on email_campaign_recipients" ON public.email_campaign_recipients
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Messages Table (Public Insert, Service Role ALL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Public insert messages'
  ) THEN
    CREATE POLICY "Public insert messages" ON public.messages
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Service role full access on messages'
  ) THEN
    CREATE POLICY "Service role full access on messages" ON public.messages
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Newsletter Table (Public Insert, Service Role ALL)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Public insert newsletter'
  ) THEN
    CREATE POLICY "Public insert newsletter" ON public.newsletter
      FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Service role full access on newsletter'
  ) THEN
    CREATE POLICY "Service role full access on newsletter" ON public.newsletter
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
