-- ==============================================================================
-- 0018: Security Privilege & Public RLS Policy Reconciliation
-- Target: Supabase PostgreSQL (Production Forward-Only Migration)
-- Reconciles least-privilege function execution permissions, feedback defaults,
-- and public read RLS policies on content tables.
-- ==============================================================================

-- 1. Restrict Function Privileges (anon = false, authenticated = false, service_role = true)

-- 1.1 Atomic rate limit function: strictly privileged backend helper
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) TO service_role;

-- 1.2 Session revocation pruning function: strictly privileged backend maintenance
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'prune_expired_session_revocations'
    ) THEN
        REVOKE ALL ON FUNCTION public.prune_expired_session_revocations(BIGINT) FROM anon, authenticated, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.prune_expired_session_revocations(BIGINT) TO service_role;
    END IF;
END $$;

-- 1.3 Automatic user profile trigger functions: system triggers, never public APIs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
    ) THEN
        REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'handle_auth_user_profile'
    ) THEN
        REVOKE ALL ON FUNCTION public.handle_auth_user_profile() FROM anon, authenticated, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.handle_auth_user_profile() TO service_role;
    END IF;
END $$;

-- 1.4 RLS auto enable function: internal schema helper, strictly restricted
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
    ) THEN
        REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon, authenticated, PUBLIC;
        GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
    END IF;
END $$;

-- 2. Feedback Table Reconciliation
-- Ensure default consent is false (opt-in requirement)
ALTER TABLE public.feedback ALTER COLUMN consent_public SET DEFAULT false;

-- Reconcile public feedback SELECT policy: only approved AND consented feedback can be read
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view approved feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Public read approved feedback" ON public.feedback;
    CREATE POLICY "Public read approved feedback" ON public.feedback
        FOR SELECT TO anon, authenticated
        USING (status = 'approved' AND consent_public = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Content Tables Public RLS Hardening
-- Enforce that draft/unpublished records can NEVER be read through direct Supabase Data API access

-- 3.1 Blogs: only published articles visible publicly
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read blogs" ON public.blogs;
    CREATE POLICY "Public read blogs" ON public.blogs
        FOR SELECT TO anon, authenticated
        USING (status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.2 Projects: only published projects visible publicly
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read projects" ON public.projects;
    CREATE POLICY "Public read projects" ON public.projects
        FOR SELECT TO anon, authenticated
        USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.3 Courses: only published courses visible publicly
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read courses" ON public.courses;
    CREATE POLICY "Public read courses" ON public.courses
        FOR SELECT TO anon, authenticated
        USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.4 Social Links: only active channels visible publicly
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read social_links" ON public.social_links;
    CREATE POLICY "Public read social_links" ON public.social_links
        FOR SELECT TO anon, authenticated
        USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3.5 Navigation: only visible menu items visible publicly
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public read navigation" ON public.navigation;
    CREATE POLICY "Public read navigation" ON public.navigation
        FOR SELECT TO anon, authenticated
        USING (is_visible = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Confirm Service Role Backend Access on All Tables
GRANT ALL ON TABLE public.feedback TO service_role;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.blogs TO service_role;
GRANT ALL ON TABLE public.projects TO service_role;
GRANT ALL ON TABLE public.courses TO service_role;
GRANT ALL ON TABLE public.videos TO service_role;
GRANT ALL ON TABLE public.pages TO service_role;
GRANT ALL ON TABLE public.settings TO service_role;
GRANT ALL ON TABLE public.navigation TO service_role;
GRANT ALL ON TABLE public.social_links TO service_role;
GRANT ALL ON TABLE public.media TO service_role;
