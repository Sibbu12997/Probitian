-- Migration: 0008_add_linkedin_social_link.sql
-- Description: Ensure official ProBitian LinkedIn company page is seeded in social_links table

INSERT INTO public.social_links (platform, url, icon, is_active, display_order)
VALUES (
  'linkedin',
  'https://www.linkedin.com/company/probitian/',
  'Linkedin',
  true,
  5
)
ON CONFLICT (platform) DO UPDATE
SET url = EXCLUDED.url,
    icon = EXCLUDED.icon,
    is_active = EXCLUDED.is_active;
