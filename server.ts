import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// Server Modules & Middleware
import { PORT } from './server/config/constants';
import { securityHeadersMiddleware } from './server/security/headers';
import { corsMiddleware } from './server/security/cors';
import { csrfMiddleware } from './server/security/csrf';
import { apiErrorHandler, apiNotFoundHandler } from './server/middleware/errorHandler';
import { serverSupabase } from './server/services/supabase';
import { getRouteSeo, injectSeoIntoHtml } from './server/seo/prerender';

// Route Modules
import authRouter from './server/routes/auth';
import crmRouter from './server/routes/crm';
import newsletterRouter from './server/routes/newsletter';
import analyticsRouter from './server/routes/analytics';
import cmsRouter from './server/routes/cms';
import seoRouter from './server/routes/seo';

dotenv.config();

const app = express();

// Disable X-Powered-By technology disclosure
app.disable('x-powered-by');

// Trust reverse proxy for accurate client IP resolution in rate limiting
app.set('trust proxy', 1);

// Baseline JSON & URL-encoded body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Global Security Middleware
app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(csrfMiddleware);

// SEO direct routes (robots.txt & sitemap.xml)
app.use(seoRouter);

// API Route Handlers
app.use('/api', authRouter);
app.use('/api', crmRouter);
app.use('/api', newsletterRouter);
app.use('/api', analyticsRouter);
app.use('/api', cmsRouter);

// 404 Handler for undefined API routes
app.all('/api/*', apiNotFoundHandler);

// Centralized API Error Handler
app.use(apiErrorHandler);

// Frontend SPA & Dynamic Server-Side Prerendering Handler
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    // Vite development asset middleware
    app.use(vite.middlewares);

    // Dynamic SEO HTML prerender during development
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        const seo = await getRouteSeo(url, serverSupabase);
        const transformedHtml = injectSeoIntoHtml(template, seo);

        res.status(seo.httpStatus || 200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(transformedHtml);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const publicPath = path.resolve(process.cwd(), 'public');
    const distPath = path.resolve(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');

    // Static asset serving with caching (dist build artifacts and public root assets)
    app.use(express.static(distPath, { index: false }));
    app.use(express.static(publicPath, { index: false }));

    // Dynamic SEO HTML prerendering for all public SPA routes (Express 4 compatible)
    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const seo = await getRouteSeo(url, serverSupabase);
        const status = seo.httpStatus || 200;

        if (fs.existsSync(indexHtmlPath)) {
          const rawHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
          const html = injectSeoIntoHtml(rawHtml, seo);
          return res.status(status).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(html);
        }

        return res.status(status).sendFile(indexHtmlPath);
      } catch (err) {
        console.error('[Production SSR Error]', err);
        return next(err);
      }
    });
  }
}

export const serverReady = setupFrontend().then(() => {
  if (process.env.NODE_ENV !== 'test' && !process.argv.some(arg => arg.includes('--test') || arg.includes('test'))) {
    const serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[ProBitian Server] Running at http://0.0.0.0:${PORT} (env: ${process.env.NODE_ENV || 'development'})`);
    });
    return serverInstance;
  }
}).catch((err) => {
  console.error('[Server Startup Fatal Error]', err);
  if (process.env.NODE_ENV !== 'test' && !process.argv.some(arg => arg.includes('--test') || arg.includes('test'))) {
    process.exit(1);
  }
  throw err;
});

export default app;
