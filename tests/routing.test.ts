import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, slugify, getBlogSlug, getPageCanonicalUrl } from '../src/lib/routing';
import { getPageTitle, getPageDescription } from '../src/app/seo/usePageSeo';
import { BlogArticle } from '../src/types';

describe('11. Routing & Canonical URL Resolution', () => {
  test('slugify converts titles to clean lowercase alphanumeric hyphenated slugs', () => {
    assert.strictEqual(slugify('Mastering Advanced DAX: Calculation Groups!'), 'mastering-advanced-dax-calculation-groups');
    assert.strictEqual(slugify('Power Query & M Optimizations 2026'), 'power-query-m-optimizations-2026');
    assert.strictEqual(slugify('  Leading Whitespace and Special #$% Chars  '), 'leading-whitespace-and-special-chars');
  });

  test('getBlogSlug extracts clean slug from article metadata', () => {
    const articleWithSlug: Partial<BlogArticle> = {
      id: '123',
      title: 'Ignored Title',
      slug: 'my-custom-slug'
    };
    assert.strictEqual(getBlogSlug(articleWithSlug), 'my-custom-slug');

    const articleWithoutSlug: Partial<BlogArticle> = {
      id: '456',
      title: 'Automatic Slug From Title'
    };
    assert.strictEqual(getBlogSlug(articleWithoutSlug), 'automatic-slug-from-title');
  });

  test('getPageCanonicalUrl builds normalized canonical URLs without query params or trailing slashes', () => {
    assert.strictEqual(getPageCanonicalUrl('home'), 'https://probitian.ai.studio/');
    assert.strictEqual(getPageCanonicalUrl('about'), 'https://probitian.ai.studio/about');
    assert.strictEqual(getPageCanonicalUrl('projects'), 'https://probitian.ai.studio/projects');
    assert.strictEqual(getPageCanonicalUrl('blog'), 'https://probitian.ai.studio/blog');
    assert.strictEqual(getPageCanonicalUrl('blog', 'mastering-dax'), 'https://probitian.ai.studio/blog/mastering-dax');
    assert.strictEqual(getPageCanonicalUrl('learn'), 'https://probitian.ai.studio/learn');
    assert.strictEqual(getPageCanonicalUrl('contact'), 'https://probitian.ai.studio/contact');
    assert.strictEqual(getPageCanonicalUrl('privacy'), 'https://probitian.ai.studio/privacy');
    assert.strictEqual(getPageCanonicalUrl('terms'), 'https://probitian.ai.studio/terms');
  });

  test('parseRoute handles standard HTML5 pathname routes', () => {
    const home = parseRoute('/', '');
    assert.strictEqual(home.page, 'home');
    assert.strictEqual(home.slug, null);
    assert.strictEqual(home.isLegacyHash, false);

    const about = parseRoute('/about', '');
    assert.strictEqual(about.page, 'about');

    const blogPost = parseRoute('/blog/advanced-dax', '');
    assert.strictEqual(blogPost.page, 'blog');
    assert.strictEqual(blogPost.slug, 'advanced-dax');

    const unknownRoute = parseRoute('/nonexistent-route-xyz', '');
    assert.strictEqual(unknownRoute.page, '404');
  });

  test('parseRoute detects and migrates legacy hash URLs gracefully', () => {
    const legacyHash = parseRoute('/', '#/about');
    assert.strictEqual(legacyHash.page, 'about');
    assert.strictEqual(legacyHash.isLegacyHash, true);
    assert.strictEqual(legacyHash.targetCanonicalPath, '/about');

    const legacyBlog = parseRoute('/', '#/blog/my-slug');
    assert.strictEqual(legacyBlog.page, 'blog');
    assert.strictEqual(legacyBlog.slug, 'my-slug');
    assert.strictEqual(legacyBlog.isLegacyHash, true);
    assert.strictEqual(legacyBlog.targetCanonicalPath, '/blog/my-slug');
  });
});

describe('12. Page SEO Metadata & Title Generation', () => {
  test('getPageTitle returns specific contextual titles for all known routes', () => {
    assert.strictEqual(getPageTitle('home', null), 'ProBItian | Master Business Intelligence, Power BI & SQL');
    assert.strictEqual(getPageTitle('about', null), 'About ProBItian | Learn Data, Build Skills, Grow Your Career');
    assert.strictEqual(getPageTitle('projects', null), 'Portfolio Projects & BI Dashboards | ProBItian');
    assert.strictEqual(getPageTitle('blog', null), 'Data Analytics Blog & DAX Guides | ProBItian');
    assert.strictEqual(getPageTitle('learn', null), 'Learn Power BI, SQL, Excel & AI Analytics | ProBItian');
    assert.strictEqual(getPageTitle('contact', null), 'Contact Shivam Singh | ProBItian Community Hub');
    assert.strictEqual(getPageTitle('privacy', null), 'Privacy Policy | ProBItian Data Protection');
    assert.strictEqual(getPageTitle('terms', null), 'Terms of Service | ProBItian');
    assert.strictEqual(getPageTitle('404', null), 'Page Not Found (404) | ProBItian');
  });

  test('getPageTitle uses article title dynamically when viewing a blog article', () => {
    const article: BlogArticle = {
      id: '1',
      title: 'Calculation Groups in DAX',
      metaTitle: 'Master Calculation Groups in Power BI',
      excerpt: 'Learn calculation groups',
      content: 'Full content',
      category: 'Power BI',
      date: '2026-08-15',
      readTime: '5 min',
      author: 'Shivam Singh',
      imageUrl: '/banner.svg'
    };
    assert.strictEqual(getPageTitle('blog', article), 'Master Calculation Groups in Power BI | ProBItian Blog');
  });

  test('getPageDescription returns accurate non-empty meta descriptions', () => {
    const desc = getPageDescription('home', null);
    assert.ok(desc.length > 20);
    assert.ok(desc.includes('Power BI'));
  });
});
