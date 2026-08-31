import express from 'express';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission } from '../auth/types';
import { getGA4AccessToken, isGa4Configured } from '../services/analyticsService';

const router = express.Router();

// GET /api/analytics/status
router.get('/analytics/status', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), (req, res) => {
  const status = isGa4Configured();
  return res.json({
    status: 'ok',
    ...status
  });
});

// GET /api/analytics/realtime
router.get('/analytics/realtime', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
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
      return res.status(200).json({
        configured: false,
        activeUsers: 0,
        error: `GA4 Realtime API Error: ${response.status}`,
      });
    }

    const data = (await response.json()) as any;
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
      error: 'Failed to connect to GA4 Realtime API.',
    });
  }
});

// GET /api/analytics/report
router.get('/analytics/report', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const emptyReport = {
    configured: false,
    overview: {
      activeUsers: 0,
      newUsers: 0,
      returningUsers: 0,
      sessions: 0,
      pageViews: 0,
      engagementRate: '0%',
      avgEngagementTime: '0s',
    },
    timeframeUsers: {
      usersToday: 0,
      users7d: 0,
      users30d: 0,
    },
    pages: [],
    events: [],
    sources: [],
    devices: [],
    browsers: [],
    geography: [],
    stats: {
      activeUsers: 0,
      newUsers: 0,
      sessions: 0,
      pageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
    },
  };

  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        ...emptyReport,
        message: 'GA4 Service Account credentials not provided in environment variables.',
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

    let accessToken: string;
    try {
      accessToken = await getGA4AccessToken(clientEmail, privateKey);
    } catch (authErr: any) {
      return res.status(200).json({
        ...emptyReport,
        configured: false,
        error: `Google OAuth Token Error: ${authErr?.message || authErr}`,
      });
    }

    const runGa4Query = async (body: any) => {
      try {
        const response = await fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) {
          const errText = await response.text();
          console.warn('GA4 Query Warning:', response.status, errText);
          return null;
        }
        return await response.json();
      } catch (err: any) {
        console.warn('GA4 Query Fetch Error:', err?.message || err);
        return null;
      }
    };

    // Run parallel reports
    const [overviewData, pagesData, eventsData, sourcesData, devicesData, browsersData, geoData, todayData, weekData, monthData] = await Promise.all([
      // 1. Overview
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
        ],
      }),
      // 2. Pages
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'engagementRate' }, { name: 'userEngagementDuration' }],
        limit: 25,
      }),
      // 3. Custom Events
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        limit: 50,
      }),
      // 4. Traffic Sources
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        limit: 15,
      }),
      // 5. Devices
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10,
      }),
      // 6. Browsers
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'browser' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 10,
      }),
      // 7. Geography
      runGa4Query({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'country' }, { name: 'city' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 20,
      }),
      // 8. Users Today
      runGa4Query({
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 9. Users 7d
      runGa4Query({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // 10. Users 30d
      runGa4Query({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    ]);

    const metricVals = (overviewData as any)?.rows?.[0]?.metricValues || [];
    const activeUsers = parseInt(metricVals[0]?.value || '0', 10);
    const newUsers = parseInt(metricVals[1]?.value || '0', 10);
    const sessions = parseInt(metricVals[2]?.value || '0', 10);
    const pageViews = parseInt(metricVals[3]?.value || '0', 10);
    const avgDuration = parseFloat(metricVals[4]?.value || '0');
    const engagementRateVal = parseFloat(metricVals[5]?.value || '0');
    const bounceRateVal = parseFloat(metricVals[6]?.value || '0');

    const returningUsers = Math.max(0, activeUsers - newUsers);
    const formatDuration = (secs: number) => {
      if (secs < 60) return `${Math.round(secs)}s`;
      const mins = Math.floor(secs / 60);
      const remSecs = Math.round(secs % 60);
      return `${mins}m ${remSecs}s`;
    };

    const overview = {
      activeUsers,
      newUsers,
      returningUsers,
      sessions,
      pageViews,
      engagementRate: `${(engagementRateVal * 100).toFixed(1)}%`,
      avgEngagementTime: formatDuration(avgDuration),
    };

    const timeframeUsers = {
      usersToday: parseInt((todayData as any)?.rows?.[0]?.metricValues?.[0]?.value || '0', 10),
      users7d: parseInt((weekData as any)?.rows?.[0]?.metricValues?.[0]?.value || '0', 10),
      users30d: parseInt((monthData as any)?.rows?.[0]?.metricValues?.[0]?.value || '0', 10),
    };

    const pages = ((pagesData as any)?.rows || []).map((row: any) => ({
      path: row.dimensionValues?.[0]?.value || '/',
      title: row.dimensionValues?.[1]?.value || 'ProBitian',
      views: parseInt(row.metricValues?.[0]?.value || '0', 10),
      users: parseInt(row.metricValues?.[1]?.value || '0', 10),
      engagement: `${(parseFloat(row.metricValues?.[2]?.value || '0') * 100).toFixed(1)}%`,
      avgTime: formatDuration(parseFloat(row.metricValues?.[3]?.value || '0')),
    }));

    const events = ((eventsData as any)?.rows || []).map((row: any) => ({
      eventName: row.dimensionValues?.[0]?.value || 'custom_event',
      count: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const sources = ((sourcesData as any)?.rows || []).map((row: any) => ({
      source: row.dimensionValues?.[0]?.value || '(direct)',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
      sessions: parseInt(row.metricValues?.[1]?.value || '0', 10),
    }));

    const devices = ((devicesData as any)?.rows || []).map((row: any) => ({
      device: row.dimensionValues?.[0]?.value || 'desktop',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const browsers = ((browsersData as any)?.rows || []).map((row: any) => ({
      browser: row.dimensionValues?.[0]?.value || 'Chrome',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const geography = ((geoData as any)?.rows || []).map((row: any) => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      city: row.dimensionValues?.[1]?.value || 'Unknown',
      users: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const stats = {
      activeUsers,
      newUsers,
      sessions,
      pageViews,
      avgSessionDuration: avgDuration,
      bounceRate: bounceRateVal,
    };

    return res.json({
      configured: true,
      overview,
      timeframeUsers,
      pages,
      events,
      sources,
      devices,
      browsers,
      geography,
      stats,
      dateRange: { start, end },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching GA4 report data:', error);
    return res.status(200).json({
      ...emptyReport,
      configured: false,
      error: `Failed to fetch GA4 report: ${error?.message || error}`,
    });
  }
});

export default router;
