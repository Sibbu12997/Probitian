-- ==============================================================================
-- 0016: Dedicated Feedback and Testimonials Table & Public Moderation Flow
-- ==============================================================================

-- 1. Create the dedicated feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT,
    company TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT NOT NULL,
    service TEXT,
    consent_public BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance indexes for filtering by moderation status, featured priority, and recency
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_featured ON public.feedback (featured);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_public_approved ON public.feedback (status, featured DESC, created_at DESC) WHERE status = 'approved';

-- 3. Row Level Security (RLS) enforcement
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 4. Restrict table privileges: revoke all direct writes from public roles
REVOKE ALL ON TABLE public.feedback FROM anon, authenticated;

-- Public roles may only SELECT approved records directly if using client libraries
GRANT SELECT ON TABLE public.feedback TO anon, authenticated;

-- Service role retains full administrative privileges for Express backend
GRANT ALL ON TABLE public.feedback TO service_role;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Public read approved feedback" ON public.feedback;
CREATE POLICY "Public read approved feedback" ON public.feedback
    FOR SELECT TO anon, authenticated
    USING (status = 'approved');

DROP POLICY IF EXISTS "Service role full access on feedback" ON public.feedback;
CREATE POLICY "Service role full access on feedback" ON public.feedback
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
