import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const CMS_DATA_FILE = path.join(process.cwd(), 'data', 'cms_settings.json');

function readCmsData() {
  try {
    if (fs.existsSync(CMS_DATA_FILE)) {
      const content = fs.readFileSync(CMS_DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading CMS data file:', err);
  }
  return {};
}

function writeCmsData(data: any) {
  try {
    const dir = path.dirname(CMS_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CMS_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing CMS data file:', err);
  }
}

// Global Headers Middleware: Enables CORS and prevents HTML caching for stale deployment prevention
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Helper to acquire Google OAuth2 Access Token for GA4 Data API via Service Account
async function getGA4AccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (str: string) =>
    Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaimSet = base64Url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);

  const formattedKey = privateKey.replace(/\\n/g, '\n');
  const signature = signer
    .sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth Token Error: ${tokenRes.status} ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

// ----------------------------------------------------
// CMS BRANDING & SETTINGS API ENDPOINTS
// ----------------------------------------------------

app.get('/api/cms/settings/general', (req, res) => {
  const data = readCmsData();
  if (data.general) {
    return res.json(data.general);
  }
  return res.json(null);
});

app.post('/api/cms/settings/general', (req, res) => {
  const settings = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Missing settings payload' });
  }
  const data = readCmsData();
  data.general = settings;
  writeCmsData(data);
  return res.json({ success: true, settings });
});

app.get('/api/cms/settings/home', (req, res) => {
  const data = readCmsData();
  if (data.home) {
    return res.json(data.home);
  }
  return res.json(null);
});

app.post('/api/cms/settings/home', (req, res) => {
  const homeConfig = req.body;
  if (!homeConfig) {
    return res.status(400).json({ error: 'Missing home config payload' });
  }
  const data = readCmsData();
  data.home = homeConfig;
  writeCmsData(data);
  return res.json({ success: true, home: homeConfig });
});

// ----------------------------------------------------
// ANALYTICS API ENDPOINTS
// ----------------------------------------------------

// 1. Status Check
app.get('/api/analytics/status', (req, res) => {
  const measurementId = process.env.VITE_GA4_MEASUREMENT_ID || 'G-G3WJXY6THP';
  const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
  const clientEmail = process.env.GA4_CLIENT_EMAIL || '';
  const hasPrivateKey = Boolean(process.env.GA4_PRIVATE_KEY);

  const hasTrackingId = Boolean(measurementId && !measurementId.includes('G-XXXXXXXXXX'));
  const hasReportingCredentials = Boolean(propertyId && clientEmail && hasPrivateKey);

  res.json({
    status: 'ok',
    hasTrackingId,
    hasReportingCredentials,
    measurementId: hasTrackingId ? measurementId : null,
    propertyId: propertyId || null,
  });
});

// 2. Real-time Users Endpoint
app.get('/api/analytics/realtime', async (req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        configured: false,
        activeUsers: 0,
        message: 'GA4 Service Account credentials not configured.',
      });
    }

    const accessToken = await getGA4AccessToken(clientEmail, privateKey);
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(200).json({
        configured: false,
        activeUsers: 0,
        error: `GA4 Realtime API Error: ${response.status} - ${errText}`,
      });
    }

    const data = await response.json();
    const activeUsers = parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

    return res.json({
      configured: true,
      activeUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching GA4 realtime data:', error);
    return res.status(200).json({
      configured: false,
      activeUsers: 0,
      error: error?.message || 'Failed to connect to GA4 Realtime API.',
    });
  }
});

// 3. Complete Report Analytics Endpoint
app.get('/api/analytics/report', async (req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        configured: false,
        message: 'GA4 Service Account credentials not provided in environment variables.',
        instructions: {
          step1: 'Create a free GA4 Property in Google Analytics.',
          step2: 'Add VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX in .env',
          step3: 'Create a Google Cloud Service Account and download the JSON key.',
          step4: 'Add GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY in .env',
          step5: 'Grant Viewer permission to GA4_CLIENT_EMAIL inside GA4 Property User Management.',
        },
      });
    }

    const { range = '30d', startDate, endDate } = req.query as {
      range?: string;
      startDate?: string;
      endDate?: string;
    };

    let start = '30daysAgo';
    let end = 'today';

    if (range === 'today') {
      start = 'today';
      end = 'today';
    } else if (range === 'yesterday') {
      start = 'yesterday';
      end = 'yesterday';
    } else if (range === '7d') {
      start = '7daysAgo';
    } else if (range === '30d') {
      start = '30daysAgo';
    } else if (range === '90d') {
      start = '90daysAgo';
    } else if (range === 'custom' && startDate && endDate) {
      start = startDate;
      end = endDate;
    }

    const accessToken = await getGA4AccessToken(clientEmail, privateKey);

    // Fetch Overview Metrics
    const overviewRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'userEngagementDuration' },
          ],
        }),
      }
    );

    // Fetch Timeframe Comparison Metrics (Today, 7d, 30d users)
    const timeframesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            { startDate: 'today', endDate: 'today', name: 'today' },
            { startDate: '7daysAgo', endDate: 'today', name: '7d' },
            { startDate: '30daysAgo', endDate: 'today', name: '30d' },
          ],
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    // Fetch Page Analytics Table
    const pagesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'screenPageViews' },
            { name: 'engagementRate' },
            { name: 'userEngagementDuration' },
          ],
          limit: 25,
        }),
      }
    );

    // Fetch Traffic Sources
    const sourcesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
          limit: 10,
        }),
      }
    );

    // Fetch Custom Click Events
    const eventsRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          limit: 25,
        }),
      }
    );

    // Fetch Devices
    const devicesRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
      }
    );

    // Fetch Browsers
    const browsersRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'browser' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10,
        }),
      }
    );

    // Fetch Geography
    const geoRes = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: start, endDate: end }],
          dimensions: [{ name: 'country' }, { name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 15,
        }),
      }
    );

    const overviewData = overviewRes.ok ? await overviewRes.json() : null;
    const timeframesData = timeframesRes.ok ? await timeframesRes.json() : null;
    const pagesData = pagesRes.ok ? await pagesRes.json() : null;
    const sourcesData = sourcesRes.ok ? await sourcesRes.json() : null;
    const eventsData = eventsRes.ok ? await eventsRes.json() : null;
    const devicesData = devicesRes.ok ? await devicesRes.json() : null;
    const browsersData = browsersRes.ok ? await browsersRes.json() : null;
    const geoData = geoRes.ok ? await geoRes.json() : null;

    const activeUsersVal = parseInt(overviewData?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const newUsersVal = parseInt(overviewData?.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
    const returningUsersVal = Math.max(0, activeUsersVal - newUsersVal);

    // Parse timeframe comparison rows
    let usersToday = 0;
    let users7d = 0;
    let users30d = 0;

    if (timeframesData?.rows) {
      for (const r of timeframesData.rows) {
        const dRangeName = r.dimensionValues?.[0]?.value || r.dateRange || '';
        const val = parseInt(r.metricValues?.[0]?.value || '0', 10);
        if (dRangeName === 'today' || r.dateRange === 'date_range_0') usersToday = val;
        if (dRangeName === '7d' || r.dateRange === 'date_range_1') users7d = val;
        if (dRangeName === '30d' || r.dateRange === 'date_range_2') users30d = val;
      }
    }

    // Parse page analytics table & aggregate duplicate page paths
    const rawPagesList = pagesData?.rows?.map((r: any) => {
      const pagePath = r.dimensionValues?.[0]?.value || '/';
      const rawTitle = r.dimensionValues?.[1]?.value || 'Untitled Page';
      return {
        path: pagePath,
        title: rawTitle,
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
        views: parseInt(r.metricValues?.[1]?.value || '0', 10),
        engagementRateRaw: parseFloat(r.metricValues?.[2]?.value || '0'),
        engagementDurationRaw: parseFloat(r.metricValues?.[3]?.value || '0'),
      };
    }) || [];

    const pagePathMap = new Map<string, {
      path: string;
      title: string;
      users: number;
      views: number;
      totalRateWeighted: number;
      totalDuration: number;
    }>();

    const titleLookup: Record<string, string> = {
      '/': 'ProBitian - Master Business Intelligence',
      '/learn': 'Learn - Courses & Skill Modules',
      '/projects': 'Projects - Hands-on Portfolios',
      '/blog': 'Blog - Industry Insights & Articles',
      '/about': 'About ProBitian & Vision',
      '/contact': 'Contact Us & General Inquiries',
      '/admin': 'ProBitian Admin Command Center',
    };

    for (const item of rawPagesList) {
      const cleanTitle = titleLookup[item.path] || item.title;
      const existing = pagePathMap.get(item.path);

      if (!existing) {
        pagePathMap.set(item.path, {
          path: item.path,
          title: cleanTitle,
          users: item.users,
          views: item.views,
          totalRateWeighted: item.engagementRateRaw * item.views,
          totalDuration: item.engagementDurationRaw,
        });
      } else {
        existing.users = Math.max(existing.users, item.users);
        existing.views += item.views;
        existing.totalRateWeighted += item.engagementRateRaw * item.views;
        existing.totalDuration += item.engagementDurationRaw;
        if (cleanTitle && cleanTitle !== 'Untitled Page' && cleanTitle.length > existing.title.length) {
          existing.title = cleanTitle;
        }
      }
    }

    const aggregatedPages = Array.from(pagePathMap.values()).map((p) => {
      const avgRate = p.views > 0 ? p.totalRateWeighted / p.views : 0;
      const avgTimeSec = p.views > 0 ? Math.round(p.totalDuration / p.views) : 0;
      return {
        path: p.path,
        title: p.title,
        users: p.users,
        views: p.views,
        engagement: (avgRate * 100).toFixed(1) + '%',
        avgTime: avgTimeSec + 's',
      };
    });

    res.json({
      configured: true,
      timestamp: new Date().toISOString(),
      range: { start, end },
      timeframeUsers: {
        usersToday,
        users7d,
        users30d,
      },
      overview: {
        activeUsers: activeUsersVal,
        newUsers: newUsersVal,
        returningUsers: returningUsersVal,
        sessions: parseInt(overviewData?.rows?.[0]?.metricValues?.[2]?.value || '0', 10),
        pageViews: parseInt(overviewData?.rows?.[0]?.metricValues?.[3]?.value || '0', 10),
        engagementRate: (parseFloat(overviewData?.rows?.[0]?.metricValues?.[4]?.value || '0') * 100).toFixed(1) + '%',
        avgEngagementTime: Math.round(parseFloat(overviewData?.rows?.[0]?.metricValues?.[5]?.value || '0')) + 's',
      },
      pages: aggregatedPages,
      sources: sourcesData?.rows?.map((r: any) => ({
        source: r.dimensionValues?.[0]?.value || 'Direct / None',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
        sessions: parseInt(r.metricValues?.[1]?.value || '0', 10),
      })) || [],
      events: eventsData?.rows?.map((r: any) => ({
        eventName: r.dimensionValues?.[0]?.value || 'event',
        count: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      devices: devicesData?.rows?.map((r: any) => ({
        device: r.dimensionValues?.[0]?.value || 'Desktop',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      browsers: browsersData?.rows?.map((r: any) => ({
        browser: r.dimensionValues?.[0]?.value || 'Chrome',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
      geography: geoData?.rows?.map((r: any) => ({
        country: r.dimensionValues?.[0]?.value || 'Unknown',
        city: r.dimensionValues?.[1]?.value || 'Unknown',
        users: parseInt(r.metricValues?.[0]?.value || '0', 10),
      })) || [],
    });
  } catch (error: any) {
    console.error('Error fetching GA4 report data:', error);
    res.status(200).json({
      configured: false,
      error: error?.message || 'Failed to query GA4 Data API.',
    });
  }
});

// Serve public directory and documentation assets
app.use('/docs', express.static(path.join(process.cwd(), 'public', 'docs')));
app.use(express.static(path.join(process.cwd(), 'public')));

// Start Express and Vite server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
