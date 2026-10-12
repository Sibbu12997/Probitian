-- Consolidate overlapping permissive RLS policies without changing intended access.
-- Public/anonymous reads remain available under the existing public predicates.
-- Authenticated users get one SELECT policy: admins/editors can preview all rows,
-- while other authenticated users see only rows allowed by the public predicate.
-- Admin/editor write permissions remain command-specific. Public form INSERT checks
-- remain unchanged for anon and authenticated users.

-- blogs
DROP POLICY IF EXISTS "Admin/editor all blogs" ON public.blogs;
DROP POLICY IF EXISTS "Public read published blogs" ON public.blogs;
CREATE POLICY "Public read published blogs" ON public.blogs FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Authenticated read blogs" ON public.blogs FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR status = 'published');
CREATE POLICY "Admin/editor insert blogs" ON public.blogs FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update blogs" ON public.blogs FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete blogs" ON public.blogs FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- categories
DROP POLICY IF EXISTS "Admin/editor all categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated read categories" ON public.categories FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR true);
CREATE POLICY "Admin/editor insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update categories" ON public.categories FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete categories" ON public.categories FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- courses
DROP POLICY IF EXISTS "Admin/editor all courses" ON public.courses;
DROP POLICY IF EXISTS "Public read published courses" ON public.courses;
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT TO anon USING (published = true);
CREATE POLICY "Authenticated read courses" ON public.courses FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR published = true);
CREATE POLICY "Admin/editor insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update courses" ON public.courses FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete courses" ON public.courses FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- media
DROP POLICY IF EXISTS "Admin/editor all media" ON public.media;
DROP POLICY IF EXISTS "Public read media" ON public.media;
CREATE POLICY "Public read media" ON public.media FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated read media" ON public.media FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR true);
CREATE POLICY "Admin/editor insert media" ON public.media FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update media" ON public.media FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete media" ON public.media FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- messages: preserve public form constraints while combining authenticated INSERT paths.
DROP POLICY IF EXISTS "Admin/editor all messages" ON public.messages;
DROP POLICY IF EXISTS "Public insert messages" ON public.messages;
CREATE POLICY "Admin/editor read messages" ON public.messages FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  (SELECT private.is_admin_or_editor()) OR
  (status = 'new' AND admin_notes IS NULL AND reply_message IS NULL AND replied_at IS NULL
   AND reply_status = 'none' AND email_sent_status IS NULL)
);
CREATE POLICY "Admin/editor update messages" ON public.messages FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete messages" ON public.messages FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Public insert messages" ON public.messages FOR INSERT TO anon WITH CHECK (
  status = 'new' AND admin_notes IS NULL AND reply_message IS NULL AND replied_at IS NULL
  AND reply_status = 'none' AND email_sent_status IS NULL
);

-- navigation
DROP POLICY IF EXISTS "Admin/editor all navigation" ON public.navigation;
DROP POLICY IF EXISTS "Public read navigation" ON public.navigation;
CREATE POLICY "Public read navigation" ON public.navigation FOR SELECT TO anon USING (is_visible = true);
CREATE POLICY "Authenticated read navigation" ON public.navigation FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR is_visible = true);
CREATE POLICY "Admin/editor insert navigation" ON public.navigation FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update navigation" ON public.navigation FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete navigation" ON public.navigation FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- newsletter: preserve public active-subscription check while combining authenticated INSERT paths.
DROP POLICY IF EXISTS "Admin/editor all newsletter" ON public.newsletter;
DROP POLICY IF EXISTS "Public insert newsletter" ON public.newsletter;
CREATE POLICY "Admin/editor read newsletter" ON public.newsletter FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor insert newsletter" ON public.newsletter FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()) OR status = 'active');
CREATE POLICY "Admin/editor update newsletter" ON public.newsletter FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete newsletter" ON public.newsletter FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Public insert newsletter" ON public.newsletter FOR INSERT TO anon WITH CHECK (status = 'active');

-- pages
DROP POLICY IF EXISTS "Admin/editor all pages" ON public.pages;
DROP POLICY IF EXISTS "Public read pages" ON public.pages;
CREATE POLICY "Public read pages" ON public.pages FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated read pages" ON public.pages FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR true);
CREATE POLICY "Admin/editor insert pages" ON public.pages FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update pages" ON public.pages FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete pages" ON public.pages FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- projects
DROP POLICY IF EXISTS "Admin/editor all projects" ON public.projects;
DROP POLICY IF EXISTS "Public read published projects" ON public.projects;
CREATE POLICY "Public read published projects" ON public.projects FOR SELECT TO anon USING (published = true);
CREATE POLICY "Authenticated read projects" ON public.projects FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR published = true);
CREATE POLICY "Admin/editor insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update projects" ON public.projects FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete projects" ON public.projects FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- settings
DROP POLICY IF EXISTS "Admin/editor all settings" ON public.settings;
DROP POLICY IF EXISTS "Public read settings allowlist" ON public.settings;
CREATE POLICY "Public read settings allowlist" ON public.settings FOR SELECT TO anon USING (key = ANY (ARRAY['general','seo','legal','home','founder_message','founder','social_links','navigation_items']));
CREATE POLICY "Authenticated read settings" ON public.settings FOR SELECT TO authenticated USING (
  (SELECT private.is_admin_or_editor()) OR key = ANY (ARRAY['general','seo','legal','home','founder_message','founder','social_links','navigation_items'])
);
CREATE POLICY "Admin/editor insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update settings" ON public.settings FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete settings" ON public.settings FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- social_links
DROP POLICY IF EXISTS "Admin/editor all social_links" ON public.social_links;
DROP POLICY IF EXISTS "Public read social_links" ON public.social_links;
CREATE POLICY "Public read social_links" ON public.social_links FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated read social_links" ON public.social_links FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR is_active = true);
CREATE POLICY "Admin/editor insert social_links" ON public.social_links FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update social_links" ON public.social_links FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete social_links" ON public.social_links FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- videos
DROP POLICY IF EXISTS "Admin/editor all videos" ON public.videos;
DROP POLICY IF EXISTS "Public read published videos" ON public.videos;
CREATE POLICY "Public read published videos" ON public.videos FOR SELECT TO anon USING (published = true);
CREATE POLICY "Authenticated read videos" ON public.videos FOR SELECT TO authenticated USING ((SELECT private.is_admin_or_editor()) OR published = true);
CREATE POLICY "Admin/editor insert videos" ON public.videos FOR INSERT TO authenticated WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor update videos" ON public.videos FOR UPDATE TO authenticated USING ((SELECT private.is_admin_or_editor())) WITH CHECK ((SELECT private.is_admin_or_editor()));
CREATE POLICY "Admin/editor delete videos" ON public.videos FOR DELETE TO authenticated USING ((SELECT private.is_admin_or_editor()));

-- The CMS tables intentionally empty by owner are not seeded or modified.
