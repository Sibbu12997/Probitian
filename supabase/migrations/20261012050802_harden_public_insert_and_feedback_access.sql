-- ==============================================================================
-- harden_public_insert_and_feedback_access
-- Restrict anonymous/authenticated direct writes to user-submitted fields only.
-- Public feedback remains available through the server API, which selects safe
-- columns using the server-side Supabase client.
-- ==============================================================================

-- Do not allow public clients to query feedback directly.
REVOKE SELECT ON TABLE public.feedback FROM anon, authenticated;

-- Contact form: public callers may submit only user-provided contact fields.
-- Do not permit clients to write moderation, reply, or delivery metadata.
DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Public insert messages" ON public.messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND admin_notes IS NULL
    AND reply_message IS NULL
    AND replied_at IS NULL
    AND reply_status = 'none'
    AND email_sent_status IS NULL
  );

REVOKE INSERT ON TABLE public.messages FROM anon, authenticated;
GRANT INSERT (name, email, subject, message, phone, course_interested)
  ON TABLE public.messages TO anon, authenticated;

-- Newsletter: callers may submit only an email. Subscription state is server-owned.
DROP POLICY IF EXISTS "Public insert newsletter" ON public.newsletter;
CREATE POLICY "Public insert newsletter" ON public.newsletter
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'active');

REVOKE INSERT ON TABLE public.newsletter FROM anon, authenticated;
GRANT INSERT (email) ON TABLE public.newsletter TO anon, authenticated;
