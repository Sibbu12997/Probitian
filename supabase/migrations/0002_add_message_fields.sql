-- ============================================================
-- MIGRATION 0002: Add missing message fields for contact enquiries & admin replies
-- ============================================================

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS course_interested TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_message TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_status TEXT DEFAULT 'none';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email_sent_status TEXT;
