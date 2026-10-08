-- ==============================================================================
-- 0019: Harden Settings Table Row Level Security (RLS) & Isolate Private/CRM Keys
-- Target: Supabase PostgreSQL (Production Forward-Only Migration)
-- Restricts public/anonymous SELECT access on public.settings to strictly
-- allowlisted public CMS configuration keys, protecting sensitive CRM, sequence,
-- audit, and system configuration data from direct Data API queries.
-- ==============================================================================

-- 1. Ensure RLS is active on public.settings
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;

-- 2. Revoke broad table privileges from anon, authenticated, and public
REVOKE ALL ON TABLE public.settings FROM anon, authenticated, PUBLIC;

-- 3. Grant SELECT privilege to anon and authenticated (RLS policy filters allowed rows)
GRANT SELECT ON TABLE public.settings TO anon, authenticated;

-- 4. Grant full administrative privileges strictly to service_role (Express backend)
GRANT ALL ON TABLE public.settings TO service_role;

-- 5. Drop obsolete permissive public read policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read settings" ON public.settings;
    DROP POLICY IF EXISTS "Public read settings allowlist" ON public.settings;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- 6. Create hardened public read policy with strict allowlist of public keys
CREATE POLICY "Public read settings allowlist" ON public.settings
    FOR SELECT TO anon, authenticated
    USING (
        key IN (
            'general',
            'seo',
            'legal',
            'home',
            'founder_message',
            'founder',
            'social_links',
            'navigation_items'
        )
    );

-- 7. Ensure service_role maintains full unrestricted access for backend operations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role all settings" ON public.settings;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Service role all settings" ON public.settings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
