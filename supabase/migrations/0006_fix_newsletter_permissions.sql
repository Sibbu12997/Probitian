-- ============================================================
-- MIGRATION 0006: Fix Newsletter Permissions & Least Privilege RLS
-- ============================================================

-- Ensure schema level usage for service_role
GRANT USAGE ON SCHEMA public TO service_role;

-- Revoke all direct privileges on public.newsletter from anon and authenticated roles
REVOKE ALL ON public.newsletter FROM anon, authenticated;

-- Grant explicit CRUD privileges on public.newsletter strictly to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Ensure RLS is strictly enabled on public.newsletter
ALTER TABLE IF EXISTS public.newsletter ENABLE ROW LEVEL SECURITY;

-- Clean up and drop overly permissive policies on public.newsletter for public/anon/authenticated
DROP POLICY IF EXISTS "Public select newsletter" ON public.newsletter;
DROP POLICY IF EXISTS "Public insert newsletter" ON public.newsletter;
DROP POLICY IF EXISTS "Public update newsletter" ON public.newsletter;
DROP POLICY IF EXISTS "Admin all newsletter" ON public.newsletter;

-- Create service_role policy for server-side access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Service role full access on newsletter'
  ) THEN
    CREATE POLICY "Service role full access on newsletter" ON public.newsletter
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
