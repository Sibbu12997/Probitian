-- ==============================================================================
-- 0017: Production Schema Reconciliation
-- Target: Supabase PostgreSQL (Production)
-- Reconciles feedback, profiles auto-creation, RLS, and security definer functions
-- ==============================================================================

-- 1. Ensure feedback table exists with required production schema
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT,
    company TEXT,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL,
    service TEXT,
    consent_public BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_featured ON public.feedback (featured) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_public_approved ON public.feedback (status, featured DESC, created_at DESC) WHERE status = 'approved';

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view approved feedback" ON public.feedback;
    DROP POLICY IF EXISTS "Public read approved feedback" ON public.feedback;
    CREATE POLICY "Public read approved feedback" ON public.feedback
        FOR SELECT TO anon, authenticated
        USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access on feedback" ON public.feedback;
    CREATE POLICY "Service role full access on feedback" ON public.feedback
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Profiles Table & Automatic User Profile Synchronization
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'editor', 'user')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Synchronize trigger function for automatic profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        CASE
            WHEN LOWER(NEW.email) = 'probitianofficial@gmail.com' THEN 'admin'
            ELSE COALESCE(NEW.raw_app_meta_data->>'role', 'user')
        END
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        role = CASE
            WHEN LOWER(EXCLUDED.email) = 'probitianofficial@gmail.com' THEN 'admin'
            ELSE profiles.role
        END,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure probitianofficial@gmail.com is configured as admin
UPDATE public.profiles
SET role = 'admin', updated_at = NOW()
WHERE LOWER(email) = 'probitianofficial@gmail.com';

-- 3. Profiles RLS Policies (Never expose full profiles table publicly)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT TO authenticated
        USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
    CREATE POLICY "Service role full access profiles" ON public.profiles
        FOR ALL TO service_role
        USING (true)
        WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Permissions & RPC Grants
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) TO service_role, anon, authenticated;
GRANT ALL ON TABLE public.feedback TO service_role;
GRANT SELECT ON TABLE public.feedback TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.admin_session_revocations TO service_role;
GRANT ALL ON TABLE public.audit_logs TO service_role;
