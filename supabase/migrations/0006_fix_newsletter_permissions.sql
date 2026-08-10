-- ============================================================
-- MIGRATION 0006: Fix Newsletter Permissions & RLS Policies
-- ============================================================

-- Ensure schema level usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant explicit table privileges for public.newsletter and all public tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure RLS is enabled on newsletter
ALTER TABLE IF EXISTS public.newsletter ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies creation
DO $$
BEGIN
  -- Service role full access policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Service role full access on newsletter'
  ) THEN
    CREATE POLICY "Service role full access on newsletter" ON public.newsletter
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- Public select policy for subscriber lookup
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Public select newsletter'
  ) THEN
    CREATE POLICY "Public select newsletter" ON public.newsletter
      FOR SELECT TO public USING (true);
  END IF;

  -- Public insert policy for new subscriptions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Public insert newsletter'
  ) THEN
    CREATE POLICY "Public insert newsletter" ON public.newsletter
      FOR INSERT TO public WITH CHECK (true);
  END IF;

  -- Public update policy for unsubscribed reactivation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'newsletter' AND policyname = 'Public update newsletter'
  ) THEN
    CREATE POLICY "Public update newsletter" ON public.newsletter
      FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;
