-- ============================================================
-- ProBItian COMPLETE REFERENCE DATABASE SCHEMA BASELINE
-- Target: Supabase PostgreSQL (Production)
-- Consolidates Migrations 0001 through 0013
-- Includes Relational CMS, CRM, Sequences, Rate Limits & RLS
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE CMS & AUTH TABLES
-- ============================================================

-- 1.1 Profiles / Users Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'editor', 'user')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Settings Table (Key-Value JSONB storage)
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Projects Portfolio Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT,
  tools_used TEXT[] DEFAULT '{}',
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  kpis JSONB DEFAULT '[]',
  featured BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT TRUE,
  github_url TEXT,
  live_demo_url TEXT,
  youtube_url TEXT,
  tags TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Technical Blog Articles Table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  featured_image TEXT,
  author TEXT DEFAULT 'Shivam Baghel',
  read_time TEXT DEFAULT '5 min read',
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'scheduled')),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('project', 'blog', 'video', 'course')),
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 YouTube Videos Table
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  duration TEXT DEFAULT '10:00',
  views TEXT DEFAULT '1.2K',
  category TEXT DEFAULT 'Power BI',
  playlist TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 Learn Courses & Learning Pathways Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT 'BarChart3',
  level TEXT DEFAULT 'All Levels' CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  thumbnail TEXT,
  video_url TEXT,
  pdf_url TEXT,
  modules_count INT DEFAULT 5,
  duration TEXT DEFAULT '3.5 Hours',
  key_takeaways TEXT[] DEFAULT '{}',
  syllabus JSONB DEFAULT '[]',
  resources JSONB DEFAULT '[]',
  published BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 Contact & Inquiries Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  course_interested TEXT DEFAULT '',
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS public.newsletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  source TEXT DEFAULT 'website_footer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 Social Channels Links Table
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0
);

-- 1.11 Media Library Metadata Table
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  mime_type TEXT,
  folder TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.12 Dynamic Page Configurations Table
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT UNIQUE NOT NULL,
  title TEXT,
  hero_heading TEXT,
  hero_description TEXT,
  buttons JSONB DEFAULT '[]',
  banner_url TEXT,
  statistics JSONB DEFAULT '[]',
  feature_cards JSONB DEFAULT '[]',
  testimonials JSONB DEFAULT '[]',
  cta JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.13 Header Navigation Links Table
CREATE TABLE IF NOT EXISTS public.navigation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  path TEXT NOT NULL,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- 2. EMAIL CAMPAIGNS & BROADCASTS
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

-- ============================================================
-- 3. CRM & BUSINESS LEADS OUTREACH
-- ============================================================

-- 3.1 Leads Table
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

-- 3.2 Lead Outreach Campaigns Table
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

-- 3.3 Campaign Leads Log Table
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

-- 3.4 Automated Lead Drip Sequences Table
CREATE TABLE IF NOT EXISTS public.lead_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 Sequence Steps Table
CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.lead_sequences(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  delay_hours INT NOT NULL DEFAULT 24,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 Lead Sequence Progress Table
CREATE TABLE IF NOT EXISTS public.lead_sequence_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES public.lead_sequences(id) ON DELETE CASCADE,
  current_step INT NOT NULL DEFAULT 0,
  next_step_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 Centralized Email Dispatch Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'queued')),
  provider_message_id TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. DISTRIBUTED RATE LIMITING TABLE & ATOMIC RPC
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_time BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic Rate Limit Increment Function (RPC)
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_key TEXT,
  p_window_ms BIGINT,
  p_max INT
)
RETURNS TABLE (
  count INT,
  reset_time BIGINT,
  allowed BOOLEAN,
  remaining INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now BIGINT;
  v_count INT;
  v_reset_time BIGINT;
BEGIN
  v_now := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Probabilistic pruning of expired records (1% execution frequency)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE rate_limits.reset_time < (v_now - 3600000);
  END IF;

  -- Atomic upsert: serializes concurrent writes on p_key
  INSERT INTO public.rate_limits (key, count, reset_time, updated_at)
  VALUES (p_key, 1, v_now + p_window_ms, NOW())
  ON CONFLICT (key) DO UPDATE
  SET
    count = CASE
      WHEN rate_limits.reset_time <= v_now THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_time = CASE
      WHEN rate_limits.reset_time <= v_now THEN v_now + p_window_ms
      ELSE rate_limits.reset_time
    END,
    updated_at = NOW()
  RETURNING rate_limits.count, rate_limits.reset_time INTO v_count, v_reset_time;

  IF v_count <= p_max THEN
    RETURN QUERY SELECT v_count, v_reset_time, TRUE, GREATEST(0, p_max - v_count);
  ELSE
    RETURN QUERY SELECT v_count, v_reset_time, FALSE, 0;
  END IF;
END;
$$;

-- ============================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(lead_priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_status ON public.lead_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead ON public.campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON public.blogs(status);
CREATE INDEX IF NOT EXISTS idx_projects_published ON public.projects(published);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(published);

-- ============================================================
-- 6. STRICT ROW LEVEL SECURITY (RLS) & PRIVILEGES
-- ============================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sequence_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Revoke all table privileges from untrusted client roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Public content tables (SELECT only for website visitors)
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

-- Public inbound form submissions (INSERT only)
GRANT INSERT ON TABLE public.messages TO anon, authenticated;
GRANT INSERT ON TABLE public.newsletter TO anon, authenticated;

-- Grant full privileges exclusively to service_role (Express backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) TO service_role;

-- Public RLS Policies
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (published = true);
CREATE POLICY "Public read blogs" ON public.blogs FOR SELECT USING (status = 'published');
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Public read courses" ON public.courses FOR SELECT USING (published = true);
CREATE POLICY "Public read social_links" ON public.social_links FOR SELECT USING (is_active = true);
CREATE POLICY "Public read media" ON public.media FOR SELECT USING (true);
CREATE POLICY "Public read pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Public read navigation" ON public.navigation FOR SELECT USING (is_visible = true);

-- Inbound form submission policies
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public insert newsletter" ON public.newsletter FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Service role full access policies
CREATE POLICY "Service role all settings" ON public.settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all projects" ON public.projects FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all blogs" ON public.blogs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all categories" ON public.categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all videos" ON public.videos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all courses" ON public.courses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all messages" ON public.messages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all newsletter" ON public.newsletter FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all social_links" ON public.social_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all media" ON public.media FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all pages" ON public.pages FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all navigation" ON public.navigation FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all email_campaigns" ON public.email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all email_campaign_recipients" ON public.email_campaign_recipients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all lead_campaigns" ON public.lead_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all campaign_leads" ON public.campaign_leads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all lead_sequences" ON public.lead_sequences FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all sequence_steps" ON public.sequence_steps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all lead_sequence_progress" ON public.lead_sequence_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all email_logs" ON public.email_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role all rate_limits" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 7. INITIAL SEED DATA
-- ============================================================

-- 7.1 General Website Settings
INSERT INTO public.settings (key, value) VALUES
('general', '{
  "website_name": "ProBItian",
  "tagline": "Master Business Intelligence",
  "contact_email": "probitianofficial@gmail.com",
  "logo_url": "/logo.svg",
  "favicon_url": "/logo.svg",
  "banner_url": "/banner.svg",
  "theme_color": "purple",
  "footer_copyright": "© 2026 ProBItian. All Rights Reserved."
}') ON CONFLICT (key) DO NOTHING;

-- 7.2 SEO Settings
INSERT INTO public.settings (key, value) VALUES
('seo', '{
  "meta_title": "ProBItian | Master Business Intelligence, Power BI & SQL",
  "meta_description": "Master Power BI, SQL, Excel, Power Query, AI Tools, and Dashboard Design through practical projects and industry-focused tutorials.",
  "keywords": "Power BI, SQL, DAX, Power Query, Data Analytics, Business Intelligence, Excel, AI, ProBItian",
  "og_image": "/banner.svg",
  "twitter_handle": "@probitian",
  "robots_txt": "User-agent: *\nAllow: /"
}') ON CONFLICT (key) DO NOTHING;

-- 7.3 Official Social Channels (All 7 Channels)
INSERT INTO public.social_links (platform, url, icon, is_active, display_order) VALUES
('youtube', 'https://youtube.com/@probitian', 'Youtube', true, 1),
('instagram', 'https://instagram.com/probitian', 'Instagram', true, 2),
('facebook', 'https://facebook.com/probitian', 'Facebook', true, 3),
('github', 'https://github.com/probitian', 'Github', true, 4),
('x', 'https://x.com/Probitian', 'X', true, 5),
('linkedin', 'https://www.linkedin.com/company/probitian/', 'Linkedin', true, 6),
('email', 'mailto:probitianofficial@gmail.com', 'Mail', true, 7)
ON CONFLICT (platform) DO NOTHING;

-- 7.4 Navigation Menu Links
INSERT INTO public.navigation (label, path, icon, display_order, is_visible) VALUES
('Home', 'home', 'Home', 1, true),
('Learn', 'learn', 'BookOpen', 2, true),
('Projects', 'projects', 'FolderKanban', 3, true),
('Blog', 'blog', 'Newspaper', 4, true),
('About', 'about', 'User', 5, true),
('Contact', 'contact', 'Mail', 6, true)
ON CONFLICT DO NOTHING;

-- 7.5 Home Page Configuration
INSERT INTO public.pages (page_key, title, hero_heading, hero_description, buttons, banner_url, statistics) VALUES
('home', 'Home Page Configuration',
 'Master Business Intelligence with Real-World Projects',
 'Learn Power BI, SQL, Excel, Power Query, DAX, Microsoft Fabric, and AI Tools through practical hands-on portfolio projects built by industry experts.',
 '[{"label": "Explore Courses", "path": "learn", "primary": true}, {"label": "View Projects", "path": "projects", "primary": false}]',
 '/banner.svg',
 '[{"label": "Active Learners", "value": "15,000+"}, {"label": "Tutorial Hours", "value": "120+"}, {"label": "Portfolio Projects", "value": "25+"}, {"label": "Community Rating", "value": "4.9/5"}]'
) ON CONFLICT (page_key) DO NOTHING;
