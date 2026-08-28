import express from 'express';
import { generateRobotsTxt, generateSitemapXml } from '../seo/sitemap';
import { serverSupabase } from '../services/supabase';

const router = express.Router();

// GET /robots.txt
router.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(generateRobotsTxt());
});

// GET /sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = await generateSitemapXml(serverSupabase);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (err) {
    console.error('[Sitemap Generation Error]', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
});

export default router;
