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
router.get('/api/analytics/report', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID || '549083163';
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return res.status(200).json({
        configured: false,
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

    const accessToken = await getGA4AccessToken(clientEmail, privateKey);

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
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
          ],
        }),
      }
    );

    if (!overviewRes.ok) {
      const errText = await overviewRes.text();
      return res.status(500).json({ error: `GA4 Overview Query Error: ${errText}` });
    }

    const overviewData = (await overviewRes.json()) as any;
    const metricVals = overviewData.rows?.[0]?.metricValues || [];

    const stats = {
      activeUsers: parseInt(metricVals[0]?.value || '0', 10),
      newUsers: parseInt(metricVals[1]?.value || '0', 10),
      sessions: parseInt(metricVals[2]?.value || '0', 10),
      pageViews: parseInt(metricVals[3]?.value || '0', 10),
      avgSessionDuration: parseFloat(metricVals[4]?.value || '0'),
      bounceRate: parseFloat(metricVals[5]?.value || '0'),
    };

    return res.json({
      configured: true,
      stats,
      dateRange: { start, end },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching GA4 report data:', error);
    return res.status(500).json({ error: 'Failed to fetch GA4 report.' });
  }
});

export default router;
