-- ============================================================
-- MIGRATION 0009: Add Business Leads & Lead Outreach Campaign Tables
-- ============================================================

-- 1. BUSINESS LEADS TABLE
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  industry TEXT DEFAULT '',
  location TEXT DEFAULT '',
  contact_person TEXT DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  linkedin TEXT DEFAULT '',
  powerbi_use_case TEXT DEFAULT '',
  lead_priority TEXT DEFAULT 'Medium' CHECK (lead_priority IN ('High', 'Medium', 'Low')),
  status TEXT DEFAULT 'Not Contacted' CHECK (status IN (
    'Not Contacted',
    'Contacted',
    'Opened',
    'Replied',
    'Interested',
    'Demo Requested',
    'Proposal Sent',
    'Converted',
    'Not Interested',
    'Bounced',
    'Do Not Contact'
  )),
  follow_up_date DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on email and company for fast search and duplicate checks
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(lead_priority);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON public.leads(follow_up_date);

-- 2. LEAD OUTREACH CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT DEFAULT 'lead_outreach',
  subject TEXT NOT NULL,
  preheader TEXT DEFAULT '',
  html_content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'partially_sent', 'failed', 'cancelled')),
  total_recipients INT DEFAULT 0,
  successful_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CAMPAIGN LEADS (RECIPIENT & STATUS LOG) TABLE
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lead_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_email TEXT NOT NULL,
  lead_company TEXT DEFAULT '',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'opened', 'clicked', 'replied', 'bounced')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on campaign_id and lead_id for fast lookup & idempotency checks
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON public.campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(status);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Admins (authenticated) and server-side backend (service_role) have full access
CREATE POLICY "Admin all leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all lead_campaigns" ON public.lead_campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all campaign_leads" ON public.campaign_leads FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access on leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on lead_campaigns" ON public.lead_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on campaign_leads" ON public.campaign_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
