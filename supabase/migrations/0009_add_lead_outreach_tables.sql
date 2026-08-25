-- ============================================================
-- MIGRATION 0009: Add Business Leads & Lead Outreach Campaign Tables
-- Target: Supabase PostgreSQL (dlaehchzzkjsrarktfsf.supabase.co)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on leads for high performance querying
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(lead_priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 2. LEAD OUTREACH CAMPAIGNS TABLE
CREATE TABLE IF NOT EXISTS public.lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'lead_outreach',
  subject TEXT NOT NULL,
  preheader TEXT DEFAULT '',
  html_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'partially_sent', 'failed', 'cancelled')),
  total_recipients INT DEFAULT 0,
  successful_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on campaign status and created date
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_status ON public.lead_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_created_at ON public.lead_campaigns(created_at DESC);

-- 3. CAMPAIGN RECIPIENTS LOG (CAMPAIGN LEADS)
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.lead_campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_email TEXT NOT NULL,
  lead_company TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sent', 'failed', 'opened', 'clicked', 'replied', 'bounced')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on campaign_leads for fast lookup & idempotency checks
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON public.campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_email ON public.campaign_leads(lead_email);

-- Unique index to prevent duplicate sends to the same lead within the same campaign
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_leads_camp_lead ON public.campaign_leads(campaign_id, lead_id) WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_leads_camp_email ON public.campaign_leads(campaign_id, lead_email);

-- 4. ROW LEVEL SECURITY (RLS) HARDENING
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Revoke all direct public/anon access
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
REVOKE ALL ON TABLE public.lead_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_leads FROM anon, authenticated;

-- Drop existing policies if re-running migration to avoid conflict errors
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admin all leads" ON public.leads;
  DROP POLICY IF EXISTS "Admin all lead_campaigns" ON public.lead_campaigns;
  DROP POLICY IF EXISTS "Admin all campaign_leads" ON public.campaign_leads;
  DROP POLICY IF EXISTS "Authenticated users full access to leads" ON public.leads;
  DROP POLICY IF EXISTS "Authenticated users full access to lead_campaigns" ON public.lead_campaigns;
  DROP POLICY IF EXISTS "Authenticated users full access to campaign_leads" ON public.campaign_leads;
  DROP POLICY IF EXISTS "Service role full access on leads" ON public.leads;
  DROP POLICY IF EXISTS "Service role full access on lead_campaigns" ON public.lead_campaigns;
  DROP POLICY IF EXISTS "Service role full access on campaign_leads" ON public.campaign_leads;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Grant full privileges strictly to service_role (Express backend with server-side requireAdmin auth)
GRANT ALL ON TABLE public.leads TO service_role;
GRANT ALL ON TABLE public.lead_campaigns TO service_role;
GRANT ALL ON TABLE public.campaign_leads TO service_role;

CREATE POLICY "Service role full access on leads" ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_campaigns" ON public.lead_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on campaign_leads" ON public.campaign_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. DETERMINISTIC & RELATIONSHIP-PRESERVING DATA MIGRATION FROM SETTINGS TABLE
DO $$
DECLARE
  leads_json JSONB;
  campaigns_json JSONB;
  recipients_json JSONB;
  rec JSONB;
  target_id UUID;
  target_camp_id UUID;
  target_lead_id UUID;
  parsed_follow_up DATE;
  parsed_created_at TIMESTAMPTZ;
  parsed_updated_at TIMESTAMPTZ;
  parsed_sent_at TIMESTAMPTZ;
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'settings') THEN

    -- 5.1 MIGRATE LEADS
    SELECT value->'leads' INTO leads_json FROM public.settings WHERE key = 'crm_leads' LIMIT 1;
    IF leads_json IS NOT NULL AND jsonb_typeof(leads_json) = 'array' THEN
      FOR rec IN SELECT * FROM jsonb_array_elements(leads_json)
      LOOP
        -- Deterministic UUID mapping
        IF (rec->>'id') IS NOT NULL AND (rec->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          target_id := (rec->>'id')::UUID;
        ELSIF (rec->>'id') IS NOT NULL AND TRIM(rec->>'id') <> '' THEN
          target_id := md5(TRIM(rec->>'id'))::UUID;
        ELSE
          target_id := gen_random_uuid();
        END IF;

        BEGIN
          parsed_follow_up := (rec->>'follow_up_date')::DATE;
        EXCEPTION WHEN OTHERS THEN
          parsed_follow_up := NULL;
        END;

        BEGIN
          parsed_created_at := (rec->>'created_at')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
          parsed_created_at := timezone('utc'::text, now());
        END;

        BEGIN
          parsed_updated_at := (rec->>'updated_at')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
          parsed_updated_at := timezone('utc'::text, now());
        END;

        INSERT INTO public.leads (
          id,
          company_name,
          industry,
          location,
          contact_person,
          email,
          phone,
          linkedin,
          powerbi_use_case,
          lead_priority,
          status,
          follow_up_date,
          notes,
          created_at,
          updated_at
        ) VALUES (
          target_id,
          COALESCE(rec->>'company_name', 'Unknown Company'),
          COALESCE(rec->>'industry', ''),
          COALESCE(rec->>'location', ''),
          COALESCE(rec->>'contact_person', ''),
          TRIM(COALESCE(rec->>'email', '')),
          COALESCE(rec->>'phone', ''),
          COALESCE(rec->>'linkedin', ''),
          COALESCE(rec->>'powerbi_use_case', ''),
          CASE WHEN rec->>'lead_priority' IN ('High', 'Medium', 'Low') THEN rec->>'lead_priority' ELSE 'Medium' END,
          COALESCE(rec->>'status', 'Not Contacted'),
          parsed_follow_up,
          COALESCE(rec->>'notes', ''),
          COALESCE(parsed_created_at, timezone('utc'::text, now())),
          COALESCE(parsed_updated_at, timezone('utc'::text, now()))
        )
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          industry = EXCLUDED.industry,
          location = EXCLUDED.location,
          contact_person = EXCLUDED.contact_person,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          linkedin = EXCLUDED.linkedin,
          powerbi_use_case = EXCLUDED.powerbi_use_case,
          lead_priority = EXCLUDED.lead_priority,
          status = EXCLUDED.status,
          follow_up_date = EXCLUDED.follow_up_date,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at;
      END LOOP;
    END IF;

    -- 5.2 MIGRATE LEAD CAMPAIGNS
    SELECT value->'campaigns' INTO campaigns_json FROM public.settings WHERE key = 'crm_lead_campaigns' LIMIT 1;
    IF campaigns_json IS NOT NULL AND jsonb_typeof(campaigns_json) = 'array' THEN
      FOR rec IN SELECT * FROM jsonb_array_elements(campaigns_json)
      LOOP
        IF (rec->>'id') IS NOT NULL AND (rec->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          target_id := (rec->>'id')::UUID;
        ELSIF (rec->>'id') IS NOT NULL AND TRIM(rec->>'id') <> '' THEN
          target_id := md5(TRIM(rec->>'id'))::UUID;
        ELSE
          target_id := gen_random_uuid();
        END IF;

        BEGIN
          parsed_sent_at := (rec->>'sent_at')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
          parsed_sent_at := NULL;
        END;

        BEGIN
          parsed_created_at := (rec->>'created_at')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
          parsed_created_at := timezone('utc'::text, now());
        END;

        BEGIN
          parsed_updated_at := (rec->>'updated_at')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
          parsed_updated_at := timezone('utc'::text, now());
        END;

        INSERT INTO public.lead_campaigns (
          id,
          name,
          campaign_type,
          subject,
          preheader,
          html_content,
          status,
          total_recipients,
          successful_count,
          failed_count,
          sent_at,
          created_at,
          updated_at
        ) VALUES (
          target_id,
          COALESCE(rec->>'name', 'Untitled Campaign'),
          COALESCE(rec->>'campaign_type', 'lead_outreach'),
          COALESCE(rec->>'subject', 'Outreach Subject'),
          COALESCE(rec->>'preheader', ''),
          COALESCE(rec->>'html_content', ''),
          CASE WHEN rec->>'status' IN ('draft', 'scheduled', 'sending', 'sent', 'partially_sent', 'failed', 'cancelled') THEN rec->>'status' ELSE 'draft' END,
          COALESCE((rec->>'total_recipients')::INT, 0),
          COALESCE((rec->>'successful_count')::INT, 0),
          COALESCE((rec->>'failed_count')::INT, 0),
          parsed_sent_at,
          COALESCE(parsed_created_at, timezone('utc'::text, now())),
          COALESCE(parsed_updated_at, timezone('utc'::text, now()))
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          campaign_type = EXCLUDED.campaign_type,
          subject = EXCLUDED.subject,
          preheader = EXCLUDED.preheader,
          html_content = EXCLUDED.html_content,
          status = EXCLUDED.status,
          total_recipients = EXCLUDED.total_recipients,
          successful_count = EXCLUDED.successful_count,
          failed_count = EXCLUDED.failed_count,
          sent_at = EXCLUDED.sent_at,
          updated_at = EXCLUDED.updated_at;
      END LOOP;
    END IF;

    -- 5.3 MIGRATE CAMPAIGN RECIPIENTS (campaign_leads)
    SELECT COALESCE(value->'recipients', value->'campaign_leads', CASE WHEN jsonb_typeof(value) = 'array' THEN value ELSE NULL END)
    INTO recipients_json FROM public.settings WHERE key = 'crm_campaign_leads' LIMIT 1;

    IF recipients_json IS NOT NULL AND jsonb_typeof(recipients_json) = 'array' THEN
      FOR rec IN SELECT * FROM jsonb_array_elements(recipients_json)
      LOOP
        IF (rec->>'id') IS NOT NULL AND (rec->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          target_id := (rec->>'id')::UUID;
        ELSIF (rec->>'id') IS NOT NULL AND TRIM(rec->>'id') <> '' THEN
          target_id := md5(TRIM(rec->>'id'))::UUID;
        ELSE
          target_id := gen_random_uuid();
        END IF;

        IF (rec->>'campaign_id') IS NOT NULL AND (rec->>'campaign_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          target_camp_id := (rec->>'campaign_id')::UUID;
        ELSIF (rec->>'campaign_id') IS NOT NULL AND TRIM(rec->>'campaign_id') <> '' THEN
          target_camp_id := md5(TRIM(rec->>'campaign_id'))::UUID;
        ELSE
          target_camp_id := NULL;
        END IF;

        IF (rec->>'lead_id') IS NOT NULL AND (rec->>'lead_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          target_lead_id := (rec->>'lead_id')::UUID;
        ELSIF (rec->>'lead_id') IS NOT NULL AND TRIM(rec->>'lead_id') <> '' THEN
          target_lead_id := md5(TRIM(rec->>'lead_id'))::UUID;
        ELSE
          target_lead_id := NULL;
        END IF;

        -- Verify campaign existence
        IF target_camp_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.lead_campaigns WHERE id = target_camp_id) THEN
          -- Verify lead existence, set to null if lead doesn't exist to prevent FK violation
          IF target_lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.leads WHERE id = target_lead_id) THEN
            target_lead_id := NULL;
          END IF;

          BEGIN
            parsed_sent_at := (rec->>'sent_at')::TIMESTAMPTZ;
          EXCEPTION WHEN OTHERS THEN
            parsed_sent_at := NULL;
          END;

          BEGIN
            parsed_created_at := (rec->>'created_at')::TIMESTAMPTZ;
          EXCEPTION WHEN OTHERS THEN
            parsed_created_at := timezone('utc'::text, now());
          END;

          INSERT INTO public.campaign_leads (
            id,
            campaign_id,
            lead_id,
            lead_email,
            lead_company,
            status,
            provider_message_id,
            error_message,
            sent_at,
            created_at
          ) VALUES (
            target_id,
            target_camp_id,
            target_lead_id,
            TRIM(COALESCE(rec->>'lead_email', '')),
            COALESCE(rec->>'lead_company', ''),
            CASE WHEN rec->>'status' IN ('pending', 'queued', 'sent', 'failed', 'opened', 'clicked', 'replied', 'bounced') THEN rec->>'status' ELSE 'pending' END,
            rec->>'provider_message_id',
            rec->>'error_message',
            parsed_sent_at,
            COALESCE(parsed_created_at, timezone('utc'::text, now()))
          )
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            provider_message_id = EXCLUDED.provider_message_id,
            error_message = EXCLUDED.error_message,
            sent_at = EXCLUDED.sent_at;
        END IF;
      END LOOP;
    END IF;

  END IF;
END $$;
