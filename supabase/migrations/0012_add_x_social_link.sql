-- Migration: 0012_add_x_social_link.sql
-- Description: Ensure official ProBitian X profile (https://x.com/Probitian) is seeded in social_links table

INSERT INTO public.social_links (platform, url, icon, is_active, display_order)
VALUES (
  'x',
  'https://x.com/Probitian',
  'X',
  true,
  5
)
ON CONFLICT (platform) DO UPDATE
SET url = EXCLUDED.url,
    icon = EXCLUDED.icon,
    is_active = EXCLUDED.is_active;

-- Update LinkedIn display order to 6 and Email to 7 for consistent sorting
UPDATE public.social_links SET display_order = 6 WHERE platform = 'linkedin';
UPDATE public.social_links SET display_order = 7 WHERE platform = 'email';
