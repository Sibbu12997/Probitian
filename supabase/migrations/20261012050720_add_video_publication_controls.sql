-- ==============================================================================
-- add_video_publication_controls
-- Reconciles the repository schema with the production migration applied on
-- 2026-10-12. Public API routes must also enforce published=true because the
-- server-side service-role client bypasses RLS.
-- ==============================================================================

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Public clients can only read published videos. Admin/editor access remains
-- governed by the existing private.is_admin_or_editor() helper.
DROP POLICY IF EXISTS "Public read videos" ON public.videos;
DROP POLICY IF EXISTS "Public read published videos" ON public.videos;
CREATE POLICY "Public read published videos"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

CREATE INDEX IF NOT EXISTS idx_videos_published_created_at
  ON public.videos (created_at DESC)
  WHERE published = true;
