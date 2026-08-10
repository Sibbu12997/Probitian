-- ============================================================
-- MIGRATION 0003: Add email campaign tables for community newsletter broadcasting
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT DEFAULT '',
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'partially_sent', 'failed')),
  audience_type TEXT DEFAULT 'all_active',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  successful_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read email_campaigns" ON public.email_campaigns FOR SELECT USING (true);
CREATE POLICY "Public read email_campaign_recipients" ON public.email_campaign_recipients FOR SELECT USING (true);

CREATE POLICY "Admin all email_campaigns" ON public.email_campaigns FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin all email_campaign_recipients" ON public.email_campaign_recipients FOR ALL USING (auth.role() = 'authenticated');
