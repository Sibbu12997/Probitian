-- ProBitian consolidated schema baseline
-- Catalog source: Supabase production project, inspected 2026-10-12.
-- FOR A NEW / EMPTY SUPABASE PROJECT ONLY. DO NOT APPLY TO EXISTING PRODUCTION.
-- Existing production has a separate nine-entry migration ledger; never reset or fake that history.
-- CMS content tables are intentionally empty; this file creates schema only and does not seed data.
-- Security note: profile role defaults to 'user' in this baseline (least privilege).

BEGIN;
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS private;
SET LOCAL search_path = public, auth, private, extensions;

CREATE TABLE public.admin_session_revocations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  revocation_type text NOT NULL,
  target text NOT NULL,
  revoked_at bigint NOT NULL,
  expires_at bigint,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_session_revocations_pkey PRIMARY KEY (id),
  CONSTRAINT admin_session_revocations_revocation_type_check CHECK (revocation_type = ANY (ARRAY['SESSION'::text, 'USER'::text, 'GLOBAL'::text]))
);

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  role text NOT NULL,
  action text NOT NULL,
  resource text NOT NULL,
  resource_id text,
  ip_address text,
  user_agent text,
  result text NOT NULL DEFAULT 'SUCCESS'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}'::text[],
  featured_image text,
  author text DEFAULT 'Shivam Baghel'::text,
  read_time text DEFAULT '5 min read'::text,
  status text DEFAULT 'published'::text,
  scheduled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT blogs_pkey PRIMARY KEY (id),
  CONSTRAINT blogs_slug_key UNIQUE (slug),
  CONSTRAINT blogs_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'scheduled'::text]))
);

CREATE TABLE public.campaign_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  lead_id uuid,
  lead_email text NOT NULL,
  lead_company text DEFAULT ''::text,
  status text NOT NULL DEFAULT 'pending'::text,
  provider_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT campaign_leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES lead_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT campaign_leads_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT campaign_leads_pkey PRIMARY KEY (id),
  CONSTRAINT campaign_leads_status_check CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'opened'::text, 'clicked'::text, 'bounced'::text]))
);

CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  slug text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_name_key UNIQUE (name),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_slug_key UNIQUE (slug),
  CONSTRAINT categories_type_check CHECK (type = ANY (ARRAY['project'::text, 'blog'::text, 'video'::text, 'course'::text]))
);

CREATE TABLE public.content_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id text NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  title text,
  status text NOT NULL DEFAULT 'DRAFT'::text,
  author text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_revisions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  icon text DEFAULT 'BarChart3'::text,
  level text DEFAULT 'All Levels'::text,
  description text NOT NULL,
  category text NOT NULL,
  thumbnail text,
  video_url text,
  pdf_url text,
  modules_count integer DEFAULT 5,
  duration text DEFAULT '3.5 Hours'::text,
  key_takeaways text[] DEFAULT '{}'::text[],
  syllabus jsonb DEFAULT '[]'::jsonb,
  resources jsonb DEFAULT '[]'::jsonb,
  published boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_level_check CHECK (level = ANY (ARRAY['Beginner'::text, 'Intermediate'::text, 'Advanced'::text, 'All Levels'::text])),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_slug_key UNIQUE (slug)
);

CREATE TABLE public.email_campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid,
  subscriber_id uuid,
  email text NOT NULL,
  status text DEFAULT 'pending'::text,
  provider_message_id text,
  error_message text,
  sent_at timestamp with time zone,
  CONSTRAINT email_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT email_campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaign_recipients_status_check CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))
);

CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  preview_text text DEFAULT ''::text,
  content text NOT NULL,
  status text DEFAULT 'draft'::text,
  audience_type text DEFAULT 'all_active'::text,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  total_recipients integer DEFAULT 0,
  successful_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaigns_status_check CHECK (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'sending'::text, 'sent'::text, 'partially_sent'::text, 'failed'::text]))
);

CREATE TABLE public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  role text,
  company text,
  rating integer NOT NULL,
  feedback text NOT NULL,
  service text,
  consent_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT feedback_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
);

CREATE TABLE public.lead_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  campaign_type text NOT NULL DEFAULT 'lead_outreach'::text,
  subject text NOT NULL,
  preheader text DEFAULT ''::text,
  html_content text NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text,
  total_recipients integer NOT NULL DEFAULT 0,
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lead_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT lead_campaigns_status_check CHECK (status = ANY (ARRAY['draft'::text, 'sending'::text, 'sent'::text, 'partially_sent'::text, 'failed'::text]))
);

CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  industry text DEFAULT ''::text,
  location text DEFAULT ''::text,
  contact_person text DEFAULT ''::text,
  email text NOT NULL,
  phone text DEFAULT ''::text,
  linkedin text DEFAULT ''::text,
  powerbi_use_case text DEFAULT ''::text,
  lead_priority text NOT NULL DEFAULT 'Medium'::text,
  status text NOT NULL DEFAULT 'Not Contacted'::text,
  follow_up_date date,
  notes text DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT leads_lead_priority_check CHECK (lead_priority = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text])),
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);

CREATE TABLE public.media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  url text NOT NULL,
  size_bytes bigint DEFAULT 0,
  mime_type text,
  folder text DEFAULT 'general'::text,
  created_at timestamp with time zone DEFAULT now(),
  original_filename text,
  storage_path text,
  public_url text,
  file_size bigint DEFAULT 0,
  alt_text text,
  category text DEFAULT 'general'::text,
  uploaded_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT media_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new'::text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  phone text,
  course_interested text,
  reply_message text,
  replied_at timestamp with time zone,
  reply_status text DEFAULT 'none'::text,
  email_sent_status text,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_status_check CHECK (status = ANY (ARRAY['new'::text, 'read'::text, 'replied'::text, 'archived'::text]))
);

CREATE TABLE public.navigation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  label text NOT NULL,
  path text NOT NULL,
  icon text,
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  CONSTRAINT navigation_pkey PRIMARY KEY (id)
);

CREATE TABLE public.newsletter (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT newsletter_email_key UNIQUE (email),
  CONSTRAINT newsletter_pkey PRIMARY KEY (id),
  CONSTRAINT newsletter_status_check CHECK (status = ANY (ARRAY['active'::text, 'unsubscribed'::text]))
);

CREATE TABLE public.pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  title text,
  hero_heading text,
  hero_description text,
  buttons jsonb DEFAULT '[]'::jsonb,
  banner_url text,
  statistics jsonb DEFAULT '[]'::jsonb,
  feature_cards jsonb DEFAULT '[]'::jsonb,
  testimonials jsonb DEFAULT '[]'::jsonb,
  cta jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pages_page_key_key UNIQUE (page_key),
  CONSTRAINT pages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text DEFAULT 'user'::text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'editor'::text, 'user'::text]))
);

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  full_description text,
  tools_used text[] DEFAULT '{}'::text[],
  image_url text,
  gallery_urls text[] DEFAULT '{}'::text[],
  kpis jsonb DEFAULT '[]'::jsonb,
  featured boolean DEFAULT false,
  published boolean DEFAULT true,
  github_url text,
  live_demo_url text,
  youtube_url text,
  tags text[] DEFAULT '{}'::text[],
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.rate_limits (
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  reset_time bigint NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (key)
);

CREATE TABLE public.settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT settings_pkey PRIMARY KEY (key)
);

CREATE TABLE public.social_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  url text NOT NULL,
  icon text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  CONSTRAINT social_links_pkey PRIMARY KEY (id),
  CONSTRAINT social_links_platform_key UNIQUE (platform)
);

CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  thumbnail text NOT NULL,
  duration text DEFAULT '10:00'::text,
  views text DEFAULT '1.2K'::text,
  category text DEFAULT 'Power BI'::text,
  playlist text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  published boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,
  CONSTRAINT videos_pkey PRIMARY KEY (id)
);

-- Non-constraint indexes

CREATE INDEX idx_admin_revocations_expires_at ON public.admin_session_revocations USING btree (expires_at) WHERE (expires_at IS NOT NULL);

CREATE UNIQUE INDEX idx_admin_revocations_target ON public.admin_session_revocations USING btree (target);

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs USING btree (actor);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_resource ON public.audit_logs USING btree (resource, resource_id);

CREATE INDEX idx_campaign_leads_campaign_id ON public.campaign_leads USING btree (campaign_id);

CREATE INDEX idx_campaign_leads_lead_id ON public.campaign_leads USING btree (lead_id);

CREATE INDEX idx_campaign_leads_status ON public.campaign_leads USING btree (status);

CREATE UNIQUE INDEX idx_campaign_leads_unique_campaign_lead ON public.campaign_leads USING btree (campaign_id, lead_id) WHERE (lead_id IS NOT NULL);

CREATE INDEX idx_content_revisions_created_at ON public.content_revisions USING btree (created_at DESC);

CREATE INDEX idx_content_revisions_lookup ON public.content_revisions USING btree (content_type, content_id, version_number DESC);

CREATE INDEX idx_email_campaign_recipients_campaign_id ON public.email_campaign_recipients USING btree (campaign_id);

CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at DESC);

CREATE INDEX idx_feedback_featured ON public.feedback USING btree (featured);

CREATE INDEX idx_feedback_public_approved ON public.feedback USING btree (status, featured DESC, created_at DESC) WHERE (status = 'approved'::text);

CREATE INDEX idx_feedback_status ON public.feedback USING btree (status);

CREATE INDEX idx_lead_campaigns_status ON public.lead_campaigns USING btree (status);

CREATE INDEX idx_leads_email ON public.leads USING btree (email);

CREATE INDEX idx_leads_follow_up ON public.leads USING btree (follow_up_date);

CREATE INDEX idx_leads_priority ON public.leads USING btree (lead_priority);

CREATE INDEX idx_leads_status ON public.leads USING btree (status);

CREATE INDEX idx_videos_published_created_at ON public.videos USING btree (created_at DESC) WHERE (published = true);

-- RLS state

ALTER TABLE public.admin_session_revocations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lead_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.navigation ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Function definitions precede policies that reference the private helper

CREATE OR REPLACE FUNCTION private.is_admin_or_editor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'editor')
  );
$function$

REVOKE ALL ON FUNCTION private.is_admin_or_editor() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.is_admin_or_editor() TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_admin_or_editor() TO service_role;

CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        lower(trim(NEW.email)),
        NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
        CASE
            WHEN NEW.raw_app_meta_data ->> 'role' IN ('admin', 'editor', 'user')
                THEN NEW.raw_app_meta_data ->> 'role'
            ELSE 'user'
        END
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$function$

REVOKE ALL ON FUNCTION public.handle_auth_user_profile() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.handle_auth_user_profile() TO service_role;

CREATE OR REPLACE FUNCTION public.increment_rate_limit(p_key text, p_window_ms bigint, p_max integer)
 RETURNS TABLE(count integer, reset_time bigint, allowed boolean, remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now BIGINT;
  v_count INT;
  v_reset_time BIGINT;
BEGIN
  -- Current epoch timestamp in milliseconds
  v_now := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Bounded table maintenance: prune stale records periodically (1% probabilistic execution)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE rate_limits.reset_time < (v_now - 3600000);
  END IF;

  -- Atomic upsert: serializes row-level locks on p_key
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
$function$

REVOKE ALL ON FUNCTION public.increment_rate_limit(p_key text, p_window_ms bigint, p_max integer) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.increment_rate_limit(p_key text, p_window_ms bigint, p_max integer) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_expired_session_revocations(current_epoch_ms bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.admin_session_revocations
    WHERE expires_at IS NOT NULL AND expires_at < current_epoch_ms;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$

REVOKE ALL ON FUNCTION public.prune_expired_session_revocations(current_epoch_ms bigint) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.prune_expired_session_revocations(current_epoch_ms bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$

REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

-- RLS policies

CREATE POLICY "Service role full access on admin_session_revocations" ON public.admin_session_revocations AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete blogs" ON public.blogs AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert blogs" ON public.blogs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update blogs" ON public.blogs AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read blogs" ON public.blogs AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (status = 'published'::text)));

CREATE POLICY "Public read published blogs" ON public.blogs AS PERMISSIVE FOR SELECT TO anon USING ((status = 'published'::text));

CREATE POLICY "Service role full access on campaign_leads" ON public.campaign_leads AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete categories" ON public.categories AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert categories" ON public.categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update categories" ON public.categories AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read categories" ON public.categories AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR true));

CREATE POLICY "Public read categories" ON public.categories AS PERMISSIVE FOR SELECT TO anon USING (true);

CREATE POLICY "Service role full access on content_revisions" ON public.content_revisions AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete courses" ON public.courses AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert courses" ON public.courses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update courses" ON public.courses AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read courses" ON public.courses AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (published = true)));

CREATE POLICY "Public read published courses" ON public.courses AS PERMISSIVE FOR SELECT TO anon USING ((published = true));

CREATE POLICY "Service role full access on email_campaign_recipients" ON public.email_campaign_recipients AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on email_campaigns" ON public.email_campaigns AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read approved feedback" ON public.feedback AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((status = 'approved'::text) AND (consent_public = true)));

CREATE POLICY "Service role full access on feedback" ON public.feedback AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on lead_campaigns" ON public.lead_campaigns AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on leads" ON public.leads AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete media" ON public.media AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert media" ON public.media AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update media" ON public.media AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read media" ON public.media AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR true));

CREATE POLICY "Public read media" ON public.media AS PERMISSIVE FOR SELECT TO anon USING (true);

CREATE POLICY "Admin/editor delete messages" ON public.messages AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert messages" ON public.messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR ((status = 'new'::text) AND (admin_notes IS NULL) AND (reply_message IS NULL) AND (replied_at IS NULL) AND (reply_status = 'none'::text) AND (email_sent_status IS NULL))));

CREATE POLICY "Admin/editor read messages" ON public.messages AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update messages" ON public.messages AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Public insert messages" ON public.messages AS PERMISSIVE FOR INSERT TO anon WITH CHECK (((status = 'new'::text) AND (admin_notes IS NULL) AND (reply_message IS NULL) AND (replied_at IS NULL) AND (reply_status = 'none'::text) AND (email_sent_status IS NULL)));

CREATE POLICY "Service role full access on messages" ON public.messages AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete navigation" ON public.navigation AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert navigation" ON public.navigation AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update navigation" ON public.navigation AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read navigation" ON public.navigation AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (is_visible = true)));

CREATE POLICY "Public read navigation" ON public.navigation AS PERMISSIVE FOR SELECT TO anon USING ((is_visible = true));

CREATE POLICY "Admin/editor delete newsletter" ON public.newsletter AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert newsletter" ON public.newsletter AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (status = 'active'::text)));

CREATE POLICY "Admin/editor read newsletter" ON public.newsletter AS PERMISSIVE FOR SELECT TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update newsletter" ON public.newsletter AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Public insert newsletter" ON public.newsletter AS PERMISSIVE FOR INSERT TO anon WITH CHECK ((status = 'active'::text));

CREATE POLICY "Service role full access on newsletter" ON public.newsletter AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete pages" ON public.pages AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert pages" ON public.pages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update pages" ON public.pages AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read pages" ON public.pages AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR true));

CREATE POLICY "Public read pages" ON public.pages AS PERMISSIVE FOR SELECT TO anon USING (true);

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Admin/editor delete projects" ON public.projects AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert projects" ON public.projects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update projects" ON public.projects AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read projects" ON public.projects AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (published = true)));

CREATE POLICY "Public read published projects" ON public.projects AS PERMISSIVE FOR SELECT TO anon USING ((published = true));

CREATE POLICY "Service role full access on rate_limits" ON public.rate_limits AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admin/editor delete settings" ON public.settings AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert settings" ON public.settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update settings" ON public.settings AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read settings" ON public.settings AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (key = ANY (ARRAY['general'::text, 'seo'::text, 'legal'::text, 'home'::text, 'founder_message'::text, 'founder'::text, 'social_links'::text, 'navigation_items'::text]))));

CREATE POLICY "Public read settings allowlist" ON public.settings AS PERMISSIVE FOR SELECT TO anon USING ((key = ANY (ARRAY['general'::text, 'seo'::text, 'legal'::text, 'home'::text, 'founder_message'::text, 'founder'::text, 'social_links'::text, 'navigation_items'::text])));

CREATE POLICY "Admin/editor delete social_links" ON public.social_links AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert social_links" ON public.social_links AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update social_links" ON public.social_links AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read social_links" ON public.social_links AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (is_active = true)));

CREATE POLICY "Public read social_links" ON public.social_links AS PERMISSIVE FOR SELECT TO anon USING ((is_active = true));

CREATE POLICY "Admin/editor delete videos" ON public.videos AS PERMISSIVE FOR DELETE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor insert videos" ON public.videos AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Admin/editor update videos" ON public.videos AS PERMISSIVE FOR UPDATE TO authenticated USING (( SELECT private.is_admin_or_editor() AS is_admin_or_editor)) WITH CHECK (( SELECT private.is_admin_or_editor() AS is_admin_or_editor));

CREATE POLICY "Authenticated read videos" ON public.videos AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT private.is_admin_or_editor() AS is_admin_or_editor) OR (published = true)));

CREATE POLICY "Public read published videos" ON public.videos AS PERMISSIVE FOR SELECT TO anon USING ((published = true));

-- Table-level grants

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_session_revocations TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.audit_logs TO service_role;

GRANT SELECT ON TABLE public.blogs TO anon;

GRANT SELECT ON TABLE public.blogs TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.blogs TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.campaign_leads TO service_role;

GRANT SELECT ON TABLE public.categories TO anon;

GRANT SELECT ON TABLE public.categories TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.categories TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.content_revisions TO service_role;

GRANT SELECT ON TABLE public.courses TO anon;

GRANT SELECT ON TABLE public.courses TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.courses TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.email_campaign_recipients TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.email_campaigns TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.feedback TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.lead_campaigns TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.leads TO service_role;

GRANT SELECT ON TABLE public.media TO anon;

GRANT SELECT ON TABLE public.media TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.media TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.messages TO service_role;

GRANT SELECT ON TABLE public.navigation TO anon;

GRANT SELECT ON TABLE public.navigation TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.navigation TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.newsletter TO service_role;

GRANT SELECT ON TABLE public.pages TO anon;

GRANT SELECT ON TABLE public.pages TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.pages TO service_role;

GRANT SELECT ON TABLE public.profiles TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;

GRANT SELECT ON TABLE public.projects TO anon;

GRANT SELECT ON TABLE public.projects TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.projects TO service_role;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.rate_limits TO service_role;

GRANT SELECT ON TABLE public.settings TO anon;

GRANT SELECT ON TABLE public.settings TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.settings TO service_role;

GRANT SELECT ON TABLE public.social_links TO anon;

GRANT SELECT ON TABLE public.social_links TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.social_links TO service_role;

GRANT SELECT ON TABLE public.videos TO anon;

GRANT SELECT ON TABLE public.videos TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.videos TO service_role;

-- Explicit column-level grants

GRANT INSERT ("course_interested", "email", "message", "name", "phone", "subject") ON TABLE public.messages TO anon;

GRANT INSERT ("course_interested", "email", "message", "name", "phone", "subject") ON TABLE public.messages TO authenticated;

GRANT INSERT ("email") ON TABLE public.newsletter TO anon;

GRANT INSERT ("email") ON TABLE public.newsletter TO authenticated;

-- Non-internal triggers, including the auth profile synchronization trigger

DROP TRIGGER IF EXISTS "on_auth_user_created_profile" ON auth.users;
CREATE TRIGGER on_auth_user_created_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_auth_user_profile();


COMMIT;
