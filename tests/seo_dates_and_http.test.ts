import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'fs';
import path from 'path';
import { parseValidIsoDate, getRouteSeo, injectSeoIntoHtml } from '../server/seo/prerender';
import app, { serverReady } from '../server';

describe('13. SEO Schema.org Date Accuracy & Fallback Verification', () => {
  test('TEST 1: Blog has valid created_at -> datePublished is that exact date', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-1',
                  slug: 'test-article-created-at',
                  title: 'Test Article with created_at',
                  excerpt: 'An article test',
                  created_at: '2026-05-10T14:30:00.000Z',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-created-at', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd['@type'], 'BlogPosting');
    assert.strictEqual(jsonLd.datePublished, '2026-05-10T14:30:00.000Z');
    assert.strictEqual(jsonLd.dateModified, undefined);
  });

  test('TEST 2: Blog has valid publication date field (published_at) -> datePublished uses the real publication date', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-2',
                  slug: 'test-article-published-at',
                  title: 'Test Article with published_at',
                  excerpt: 'An article test',
                  published_at: '2026-07-20T09:15:00.000Z',
                  created_at: '2026-01-01T00:00:00.000Z',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-published-at', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd.datePublished, '2026-07-20T09:15:00.000Z');
  });

  test('TEST 3: Blog has no valid publication date -> datePublished is absent', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-3',
                  slug: 'test-article-no-date',
                  title: 'Test Article with no publication date',
                  excerpt: 'An article test without date',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-no-date', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd['@type'], 'BlogPosting');
    assert.strictEqual(jsonLd.datePublished, undefined);
    assert.strictEqual('datePublished' in jsonLd, false);
  });

  test('TEST 4: Blog has invalid publication date -> datePublished is absent', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-4',
                  slug: 'test-article-invalid-date',
                  title: 'Test Article with invalid date string',
                  excerpt: 'An article test with invalid date',
                  created_at: 'NOT_A_VALID_DATE_TIMESTAMP',
                  date: 'random-gibberish',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-invalid-date', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd.datePublished, undefined);
    assert.strictEqual('datePublished' in jsonLd, false);
  });

  test('TEST 5: Blog has valid dateModified (updated_at) -> dateModified uses the real value', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-5',
                  slug: 'test-article-updated-at',
                  title: 'Test Article with updated_at',
                  excerpt: 'An article test',
                  created_at: '2026-01-15T00:00:00.000Z',
                  updated_at: '2026-08-25T18:00:00.000Z',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-updated-at', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd.datePublished, '2026-01-15T00:00:00.000Z');
    assert.strictEqual(jsonLd.dateModified, '2026-08-25T18:00:00.000Z');
  });

  test('TEST 6: Blog has no valid dateModified -> dateModified is absent', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-6',
                  slug: 'test-article-no-updated-at',
                  title: 'Test Article without updated_at',
                  excerpt: 'An article test',
                  created_at: '2026-03-10T12:00:00.000Z',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/test-article-no-updated-at', mockSupabase);
    assert.strictEqual(seo.httpStatus, 200);
    const jsonLd = seo.jsonLd as Record<string, any>;
    assert.strictEqual(jsonLd.dateModified, undefined);
    assert.strictEqual('dateModified' in jsonLd, false);
  });

  test('TEST 7: No SEO path generates a date using new Date().toISOString() as a fallback', () => {
    assert.strictEqual(parseValidIsoDate(null), undefined);
    assert.strictEqual(parseValidIsoDate(undefined), undefined);
    assert.strictEqual(parseValidIsoDate(''), undefined);
    assert.strictEqual(parseValidIsoDate('   '), undefined);
    assert.strictEqual(parseValidIsoDate('invalid-date'), undefined);
    assert.strictEqual(parseValidIsoDate(12345), undefined);
    assert.strictEqual(parseValidIsoDate({}), undefined);

    const validIso = '2026-08-28T12:00:00.000Z';
    assert.strictEqual(parseValidIsoDate(validIso), validIso);
    const validDate = new Date('2026-08-28T12:00:00.000Z');
    assert.strictEqual(parseValidIsoDate(validDate), validIso);
  });

  test('TEST 8: Generated JSON-LD remains valid JSON when injected into HTML', async () => {
    const mockSupabase: any = {
      from: () => ({
        select: () => ({
          or: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'article-8',
                  slug: 'valid-jsonld-test',
                  title: 'Valid JSON-LD "Quoted" & <Special> Title',
                  excerpt: 'Excerpts with "quotes" and <tags>',
                  created_at: '2026-06-01T00:00:00.000Z',
                  status: 'published'
                },
                error: null
              })
            })
          })
        })
      })
    };

    const seo = await getRouteSeo('/blog/valid-jsonld-test', mockSupabase);
    const template = '<html><head><title>Original</title></head><body><div id="root"></div></body></html>';
    const html = injectSeoIntoHtml(template, seo);

    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(jsonLdMatch, 'JSON-LD script tag must exist');
    const parsed = JSON.parse(jsonLdMatch[1]);
    assert.strictEqual(parsed['@type'], 'BlogPosting');
    assert.strictEqual(parsed.headline, 'Valid JSON-LD "Quoted" & <Special> Title');
    assert.strictEqual(parsed.datePublished, '2026-06-01T00:00:00.000Z');
  });
});

describe('14. Express 4 HTTP Regression & Routing Verification', () => {
  let server: http.Server;
  let baseUrl: string;

  before(async () => {
    // Ensure frontend is completely set up before listening
    await serverReady;

    // Ensure dist directory and index.html exist for production simulation
    const distPath = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    const indexHtml = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      fs.writeFileSync(indexHtml, '<!DOCTYPE html><html><head><title>ProBitian</title></head><body><div id="root"></div></body></html>');
    }

    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const addr: any = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('GET / returns HTTP 200 text/html with SEO metadata and application shell', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('text/html'));

    const html = await res.text();
    assert.ok(html.includes('ProBitian') && (html.includes('Business Intelligence &amp; Data Analytics Platform') || html.includes('Business Intelligence & Data Analytics Platform')));
    assert.ok(html.includes('canonical" href="https://probitian.ai.studio/"'));
    assert.ok(html.includes('probitian-home'));
  });

  test('GET /about returns HTTP 200 text/html with About SEO metadata', async () => {
    const res = await fetch(`${baseUrl}/about`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('About Shivam Singh & ProBitian'));
    assert.ok(html.includes('canonical" href="https://probitian.ai.studio/about"'));
  });

  test('GET /projects returns HTTP 200 text/html with Projects SEO metadata', async () => {
    const res = await fetch(`${baseUrl}/projects`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('Portfolio Projects'));
    assert.ok(html.includes('canonical" href="https://probitian.ai.studio/projects"'));
  });

  test('GET /blog returns HTTP 200 text/html with Blog SEO metadata', async () => {
    const res = await fetch(`${baseUrl}/blog`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('ProBitian Technical Blog') || html.includes('Business Intelligence, DAX & SQL Articles'));
    assert.ok(html.includes('canonical" href="https://probitian.ai.studio/blog"'));
  });

  test('GET /learn returns HTTP 200 text/html with Course SEO metadata', async () => {
    const res = await fetch(`${baseUrl}/learn`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('Learn Business Intelligence & Analytics'));
    assert.ok(html.includes('canonical" href="https://probitian.ai.studio/learn"'));
  });

  test('GET /contact returns HTTP 200 text/html with Contact SEO metadata', async () => {
    const res = await fetch(`${baseUrl}/contact`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('Contact ProBitian'));
  });

  test('GET /privacy returns HTTP 200 text/html', async () => {
    const res = await fetch(`${baseUrl}/privacy`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
  });

  test('GET /terms returns HTTP 200 text/html', async () => {
    const res = await fetch(`${baseUrl}/terms`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
  });

  test('GET /robots.txt returns HTTP 200 text/plain with crawler directives', async () => {
    const res = await fetch(`${baseUrl}/robots.txt`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/plain'));
    const text = await res.text();
    assert.ok(text.includes('User-agent: *'));
    assert.ok(text.includes('Disallow: /admin'));
    assert.ok(text.includes('Sitemap: https://probitian.ai.studio/sitemap.xml'));
  });

  test('GET /sitemap.xml returns HTTP 200 XML with public URLs', async () => {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(res.status, 200);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('xml'));
    const xml = await res.text();
    assert.ok(xml.includes('<urlset'));
    assert.ok(xml.includes('<loc>https://probitian.ai.studio/</loc>'));
    assert.ok(xml.includes('<loc>https://probitian.ai.studio/about</loc>'));
  });

  test('GET /api/nonexistent-endpoint returns HTTP 404 JSON and does not return HTML', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-endpoint-abc`);
    assert.strictEqual(res.status, 404);
    const contentType = res.headers.get('content-type') || '';
    assert.ok(contentType.includes('application/json'));
    const body = await res.json();
    assert.ok(body.error.includes('Endpoint GET /api/nonexistent-endpoint-abc not found'));
  });

  test('GET /this-route-does-not-exist returns HTTP 404 text/html with noindex, nofollow', async () => {
    const res = await fetch(`${baseUrl}/this-route-does-not-exist`);
    assert.strictEqual(res.status, 404);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('404 — Page Not Found') || html.includes('404 - Page Not Found'));
    assert.ok(html.includes('robots" content="noindex, nofollow"'));
  });

  test('GET /blog/nonexistent-article-slug-xyz returns HTTP 404 text/html with noindex, nofollow', async () => {
    const res = await fetch(`${baseUrl}/blog/nonexistent-article-slug-xyz`);
    assert.strictEqual(res.status, 404);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('Article Not Found'));
    assert.ok(html.includes('robots" content="noindex, nofollow"'));
  });

  test('GET /admin returns HTTP 200 with strict noindex, nofollow', async () => {
    const res = await fetch(`${baseUrl}/admin`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/html'));
    const html = await res.text();
    assert.ok(html.includes('robots" content="noindex, nofollow"'));
  });

  test('GET /banner.svg and /logo.svg return HTTP 200 image/svg+xml and serve canonical branding assets', async () => {
    const bannerRes = await fetch(`${baseUrl}/banner.svg`);
    assert.strictEqual(bannerRes.status, 200);
    assert.ok(bannerRes.headers.get('content-type')?.includes('image/svg+xml'));
    const bannerBuf = await bannerRes.arrayBuffer();
    assert.ok(bannerBuf.byteLength > 0);

    const logoRes = await fetch(`${baseUrl}/logo.svg`);
    assert.strictEqual(logoRes.status, 200);
    assert.ok(logoRes.headers.get('content-type')?.includes('image/svg+xml'));
    const logoBuf = await logoRes.arrayBuffer();
    assert.ok(logoBuf.byteLength > 0);
  });

  test('HTML routes inject canonical og:image and twitter:image referencing https://probitian.ai.studio/banner.svg', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();
    assert.ok(html.includes('property="og:image" content="https://probitian.ai.studio/banner.svg"'));
    assert.ok(html.includes('name="twitter:image" content="https://probitian.ai.studio/banner.svg"'));
    assert.ok(!html.includes('probitian-banner.png'));
    assert.ok(!html.includes('raw.githubusercontent.com/ShivamSinghPro'));
  });
});
