-- ============================================================
-- MIGRATION 0013: Atomic Distributed Rate Limiting
-- Target: Supabase PostgreSQL
-- Provides an atomic stored procedure to eliminate race conditions
-- in distributed multi-instance rate limit counters.
-- ============================================================

-- 1. Create rate_limits table if not exists
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_time BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Restrict direct table privileges (service_role only)
REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- 3. Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 4. Create service_role access policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rate_limits' AND policyname = 'Service role full access on rate_limits'
  ) THEN
    CREATE POLICY "Service role full access on rate_limits" ON public.rate_limits
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Atomic Rate Limit Increment Function (RPC)
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
$$;

-- 6. Grant execute permissions exclusively to service_role
REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, BIGINT, INT) TO service_role;
