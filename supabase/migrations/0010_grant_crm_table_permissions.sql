-- ============================================================
-- MIGRATION 0010: Grant CRM Table Permissions & Configure RLS Policies
-- Target: Supabase PostgreSQL (dlaehchzzkjsrarktfsf.supabase.co)
-- ============================================================

-- Grant schema level usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table-level CRUD permissions on all CRM tables
GRANT ALL ON TABLE public.leads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lead_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campaign_leads TO anon, authenticated, service_role;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure RLS is enabled on all CRM tables
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Service role full access on leads" ON public.leads;
DROP POLICY IF EXISTS "Service role full access on lead_campaigns" ON public.lead_campaigns;
DROP POLICY IF EXISTS "Service role full access on campaign_leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Allow all on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow all on lead_campaigns" ON public.lead_campaigns;
DROP POLICY IF EXISTS "Allow all on campaign_leads" ON public.campaign_leads;

-- Create full access policies for server-side backend operations
CREATE POLICY "Allow all on leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on lead_campaigns" ON public.lead_campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on campaign_leads" ON public.campaign_leads FOR ALL USING (true) WITH CHECK (true);
