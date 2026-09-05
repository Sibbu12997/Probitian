-- ==============================================================================
-- 0015: Distributed Admin Session Revocation & Multi-Instance Security
-- ==============================================================================

-- Distributed session revocation table for multi-instance Cloud Run deployments
CREATE TABLE IF NOT EXISTS public.admin_session_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revocation_type TEXT NOT NULL CHECK (revocation_type IN ('SESSION', 'USER', 'GLOBAL')),
    target TEXT NOT NULL, -- token_hash for SESSION, 'user:email:<email>' or 'user:id:<uuid>' for USER, 'GLOBAL' for GLOBAL
    revoked_at BIGINT NOT NULL, -- Epoch millisecond timestamp of revocation
    expires_at BIGINT, -- Epoch millisecond expiration for individual sessions (for auto-pruning)
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index so upserts by target are atomic and lookups are fast
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_revocations_target ON public.admin_session_revocations (target);
CREATE INDEX IF NOT EXISTS idx_admin_revocations_lookup ON public.admin_session_revocations (revocation_type, target);
CREATE INDEX IF NOT EXISTS idx_admin_revocations_expires_at ON public.admin_session_revocations (expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS and restrict access to service_role only
ALTER TABLE public.admin_session_revocations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_session_revocations FROM anon, authenticated;
GRANT ALL ON TABLE public.admin_session_revocations TO service_role;

DROP POLICY IF EXISTS "Service role full access on admin_session_revocations" ON public.admin_session_revocations;
CREATE POLICY "Service role full access on admin_session_revocations" ON public.admin_session_revocations
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Maintenance function to prune expired session records
CREATE OR REPLACE FUNCTION public.prune_expired_session_revocations(current_epoch_ms BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.admin_session_revocations
    WHERE expires_at IS NOT NULL AND expires_at < current_epoch_ms;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
