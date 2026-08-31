-- ==============================================================================
-- 0014: Production Governance, Audit Logs & Content Revision History
-- ==============================================================================

-- 1. Administrative Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    result TEXT NOT NULL DEFAULT 'SUCCESS',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Enable RLS and isolate audit_logs to service_role only
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;

DROP POLICY IF EXISTS "Service role full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Content Revisions Table (Governance & Rollback)
CREATE TABLE IF NOT EXISTS public.content_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- 'blogs', 'projects', 'courses', 'pages', 'settings'
    content_id TEXT NOT NULL,
    version_number INT NOT NULL DEFAULT 1,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'IN_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED'
    author TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_lookup ON public.content_revisions (content_type, content_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_content_revisions_created_at ON public.content_revisions (created_at DESC);

-- Enable RLS and isolate content_revisions to service_role only
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.content_revisions FROM anon, authenticated;
GRANT ALL ON TABLE public.content_revisions TO service_role;

DROP POLICY IF EXISTS "Service role full access on content_revisions" ON public.content_revisions;
CREATE POLICY "Service role full access on content_revisions" ON public.content_revisions
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
