import express from 'express';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission } from '../auth/types';
import { isValidId, isValidUuid } from '../config/constants';
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '../security/tokens';
import { 
  newsletterLimiter, 
  unsubscribeLimiter, 
  emailSendLimiter, 
  emailTestLimiter 
} from '../middleware/rateLimiters';
import { serverSupabase, readCmsData, writeCmsData } from '../services/supabase';
import { emailService } from '../../src/services/emailService';
import { campaignEmailService } from '../../src/services/campaignEmailService';

const router = express.Router();

// Public Newsletter Subscription
router.post(['/newsletter', '/newsletter/subscribe'], newsletterLimiter, async (req, res) => {
  const { email } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  console.log(`[NEWSLETTER] Subscription request received for: ${cleanEmail}`);

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ success: false, message: 'Valid email address is required' });
  }

  let subscriberRecord: any = null;

  if (serverSupabase) {
    try {
      const { data: existing, error: checkErr } = await serverSupabase
        .from('newsletter')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (checkErr) {
        console.error(`[NEWSLETTER] Supabase query error checking subscriber: ${checkErr.message}`);
        return res.status(503).json({
          success: false,
          message: 'Database service unavailable. Unable to process subscription.'
        });
      }

      if (existing) {
        if (existing.status === 'active') {
          return res.status(200).json({
            success: true,
            message: 'You are already subscribed to ProBitian!',
            subscriber: existing
          });
        } else {
          // Reactivate unsubscribed user
          const { data: updated, error: updateErr } = await serverSupabase
            .from('newsletter')
            .update({ status: 'active' })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateErr || !updated) {
            return res.status(503).json({
              success: false,
              message: 'Database service unavailable. Failed to reactivate subscription.'
            });
          }
          subscriberRecord = updated;
        }
      } else {
        // Insert new subscriber
        const { data: inserted, error: insertErr } = await serverSupabase
          .from('newsletter')
          .insert({ email: cleanEmail, status: 'active' })
          .select()
          .single();

        if (insertErr || !inserted) {
          return res.status(503).json({
            success: false,
            message: 'Database service unavailable. Failed to save subscription.'
          });
        }
        subscriberRecord = inserted;
      }
    } catch (err: any) {
      console.error(`[NEWSLETTER] Supabase exception: ${err?.message || 'Unknown error'}`);
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Exception during subscription.'
      });
    }
  } else {
    // Local JSON fallback ONLY in development
    const data = readCmsData();
    data.subscribers = data.subscribers || [];
    const localIdx = data.subscribers.findIndex((s: any) => s.email.toLowerCase() === cleanEmail);

    if (localIdx >= 0) {
      const existingLocal = data.subscribers[localIdx];
      if (existingLocal.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to ProBitian!',
          subscriber: existingLocal
        });
      }
      existingLocal.status = 'active';
      subscriberRecord = existingLocal;
    } else {
      subscriberRecord = {
        id: 'sub-' + Date.now(),
        email: cleanEmail,
        status: 'active',
        created_at: new Date().toISOString()
      };
      data.subscribers.unshift(subscriberRecord);
    }
    writeCmsData(data);
  }

  // Generate signed unsubscribe URL
  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const unsubToken = generateUnsubscribeToken(cleanEmail);
  const unsubUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?token=${unsubToken}`;

  // Send welcome email with signed unsubscribe token
  console.log(`[NEWSLETTER] Sending welcome email for: ${cleanEmail}`);
  const emailRes = await emailService.sendWelcomeEmail(cleanEmail, unsubUrl);

  return res.status(200).json({
    success: true,
    message: emailRes.message || 'Successfully subscribed to the newsletter!',
    subscriber: subscriberRecord,
    emailSent: emailRes.success
  });
});

// Public Unsubscribe Endpoint
router.get('/newsletter/unsubscribe', unsubscribeLimiter, async (req, res) => {
  const token = (req.query.token || '').toString().trim();
  const rawEmail = (req.query.email || '').toString().trim();

  let verifiedEmail: string | null = null;

  if (token) {
    verifiedEmail = verifyUnsubscribeToken(token);
  } else if (rawEmail) {
    verifiedEmail = verifyUnsubscribeToken(rawEmail);
  }

  if (!verifiedEmail) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe - ProBitian</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;}</style></head>
        <body>
          <div class="card">
            <h2 style="color:#ef4444;">Invalid or Expired Request</h2>
            <p>The unsubscribe request is invalid, tampered with, or expired. Please use the original unsubscribe link provided in your newsletter email.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Update in Supabase
  if (serverSupabase) {
    try {
      await serverSupabase.from('newsletter').update({ status: 'unsubscribed' }).eq('email', verifiedEmail);
    } catch (e) {
      console.error('[Unsubscribe DB Error]', e);
    }
  } else {
    const data = readCmsData();
    data.subscribers = data.subscribers || [];
    const idx = data.subscribers.findIndex((s: any) => s.email.toLowerCase() === verifiedEmail!.toLowerCase());
    if (idx >= 0) {
      data.subscribers[idx].status = 'unsubscribed';
      writeCmsData(data);
    }
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Unsubscribed - ProBitian</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;}a{color:#0284c7;text-decoration:none;font-weight:bold;}</style></head>
      <body>
        <div class="card">
          <h2 style="color:#10b981;">Unsubscribed Successfully</h2>
          <p>You (${verifiedEmail}) have been successfully removed from ProBitian newsletter updates.</p>
          <a href="/">Return to ProBitian Home</a>
        </div>
      </body>
    </html>
  `);
});

// Admin Subscribers List
router.get('/admin/subscribers', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data || []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.subscribers || []);
});

// Admin Delete Subscriber
router.delete('/admin/subscribers/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid subscriber ID format' });
  }

  if (serverSupabase) {
    try {
      const { error } = await serverSupabase.from('newsletter').delete().eq('id', id);
      if (error) {
        return res.status(500).json({ error: 'Failed to delete subscriber' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete subscriber' });
    }
  }

  const data = readCmsData();
  if (data.subscribers) {
    data.subscribers = data.subscribers.filter((s: any) => s.id !== id);
    writeCmsData(data);
  }

  return res.json({ success: true });
});

// Admin Email Diagnostics Status
router.get('/admin/email/status', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const diag = emailService.getDiagnostics();
  if (!diag.GMAIL_CONFIGURED) {
    return res.status(400).json({
      success: false,
      ...emailService.getMissingCredentialsError(),
      ...diag,
      smtpConnected: false
    });
  }

  const verifyRes = await emailService.verifySmtp();
  return res.json({
    success: verifyRes.success,
    ...diag,
    smtpConnected: verifyRes.success,
    smtpMessage: verifyRes.message
  });
});

// Admin Email Verify SMTP
router.post('/admin/email/verify', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const diag = emailService.getDiagnostics();
  if (!diag.GMAIL_CONFIGURED) {
    return res.status(400).json({
      success: false,
      ...emailService.getMissingCredentialsError(),
      ...diag,
      smtpConnected: false
    });
  }

  const result = await emailService.verifySmtp();
  return res.json({
    ...diag,
    ...result,
    smtpConnected: result.success
  });
});

// Admin Email Audience Count
router.get('/admin/email-campaigns/audience-count', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  let count = 0;
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('id').eq('status', 'active');
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      count = data ? data.length : 0;
      return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  const subs = data.subscribers || [];
  count = subs.filter((s: any) => s.status === 'active').length;
  return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
});

// Admin Email Campaigns List
router.get('/admin/email-campaigns', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      return res.json(data || []);
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }
  const data = readCmsData();
  return res.json(data.campaigns || []);
});

// Admin Single Email Campaign
router.get('/admin/email-campaigns/:id', requireAuth, requirePermission(Permission.VIEW_ANALYTICS), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).maybeSingle();
      if (error) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      if (data) {
        const { data: recipients } = await serverSupabase.from('email_campaign_recipients').select('*').eq('campaign_id', id);
        return res.json({ ...data, recipients: recipients || [] });
      }
      return res.status(404).json({ error: 'Campaign not found' });
    } catch (err: any) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
  }

  const data = readCmsData();
  const campaign = (data.campaigns || []).find((c: any) => c.id === id);
  if (campaign) {
    const recipients = (data.campaign_recipients || []).filter((r: any) => r.campaign_id === id);
    return res.json({ ...campaign, recipients });
  }
  return res.status(404).json({ error: 'Campaign not found' });
});

// Admin Create Email Campaign
router.post('/admin/email-campaigns', requireAuth, requirePermission(Permission.PUBLISH_CONTENT), async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.subject || !payload.content) {
    return res.status(400).json({ error: 'Name, subject, and content are required' });
  }

  let savedCampaign = { ...payload };

  if (serverSupabase) {
    try {
      const dbPayload: any = {
        name: payload.name,
        subject: payload.subject,
        preview_text: payload.preview_text || '',
        content: payload.content,
        status: payload.status || 'draft',
        audience_type: payload.audience_type || 'all_active',
        scheduled_at: payload.scheduled_at || null,
        total_recipients: payload.total_recipients || 0,
        successful_count: payload.successful_count || 0,
        failed_count: payload.failed_count || 0,
        updated_at: new Date().toISOString()
      };

      if (isValidUuid(payload.id)) {
        dbPayload.id = payload.id;
      }

      const { data, error } = await serverSupabase.from('email_campaigns').upsert(dbPayload).select().single();
      if (error) {
        return res.status(500).json({ error: 'Failed to save campaign' });
      }
      if (data) {
        savedCampaign = { ...payload, id: data.id };
      }
      return res.json({ success: true, campaign: savedCampaign });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to save campaign' });
    }
  }

  if (!savedCampaign.id) savedCampaign.id = 'camp-' + Date.now();
  const data = readCmsData();
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c: any) => c.id === savedCampaign.id);
  if (idx >= 0) {
    data.campaigns[idx] = savedCampaign;
  } else {
    data.campaigns.unshift(savedCampaign);
  }
  writeCmsData(data);

  return res.json({ success: true, campaign: savedCampaign });
});

// Admin Broadcast Email Campaign
router.post('/admin/email-campaigns/:id/send', requireAuth, requirePermission(Permission.PUBLISH_CONTENT), emailSendLimiter, async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid campaign ID format' });
  }

  let campaign: any = null;

  if (serverSupabase) {
    try {
      const { data: sbCamp, error: campErr } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (campErr || !sbCamp) {
        return res.status(404).json({ success: false, message: 'Campaign record not found' });
      }
      campaign = sbCamp;
    } catch (e: any) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }
  } else {
    const data = readCmsData();
    campaign = (data.campaigns || []).find((c: any) => c.id === id);
  }

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign record not found' });
  }

  if (!campaignEmailService.isConfigured()) {
    return res.status(400).json({
      success: false,
      error: 'Gmail SMTP is not configured',
      message: 'GMAIL_APP_PASSWORD is not configured in the server environment.'
    });
  }

  let activeSubscribers: any[] = [];
  if (serverSupabase) {
    try {
      const { data: sbSubs, error: subErr } = await serverSupabase.from('newsletter').select('*').eq('status', 'active');
      if (subErr) {
        return res.status(503).json({ success: false, message: 'Database service unavailable' });
      }
      activeSubscribers = sbSubs || [];
    } catch (e: any) {
      return res.status(503).json({ success: false, message: 'Database service unavailable' });
    }
  } else {
    const data = readCmsData();
    const subs = data.subscribers || [];
    activeSubscribers = subs.filter((s: any) => s.status === 'active');
  }

  if (activeSubscribers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No active subscribers found in database to receive this campaign.'
    });
  }

  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${reqProtocol}://${reqHost}`;

  let successfulCount = 0;
  let failedCount = 0;
  const recipientsLog: any[] = [];

  for (const subscriber of activeSubscribers) {
    const subEmail = subscriber.email;
    const unsubToken = generateUnsubscribeToken(subEmail);
    const unsubUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${unsubToken}`;

    const sendRes = await campaignEmailService.sendSingleRecipient({
      toEmail: subEmail,
      subject: campaign.subject,
      previewText: campaign.preview_text,
      contentHtml: campaign.content,
      unsubscribeUrl: unsubUrl
    });

    const recipientRecord = {
      id: 'rec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      campaign_id: campaign.id,
      subscriber_id: subscriber.id,
      email: subEmail,
      status: sendRes.success ? 'sent' : 'failed',
      provider_message_id: sendRes.messageId || null,
      error_message: sendRes.error || null,
      sent_at: new Date().toISOString()
    };

    recipientsLog.push(recipientRecord);

    if (sendRes.success) {
      successfulCount++;
    } else {
      failedCount++;
    }
  }

  const sentAt = new Date().toISOString();
  const finalStatus = failedCount === 0 ? 'sent' : (successfulCount > 0 ? 'partially_sent' : 'failed');

  campaign.status = finalStatus;
  campaign.sent_at = sentAt;
  campaign.total_recipients = activeSubscribers.length;
  campaign.successful_count = successfulCount;
  campaign.failed_count = failedCount;
  campaign.updated_at = sentAt;

  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').upsert(campaign);
      await serverSupabase.from('email_campaign_recipients').insert(recipientsLog);
    } catch (e) {
      console.warn('[Supabase Campaign Send Update Warning]', e);
    }
  } else {
    const data = readCmsData();
    data.campaigns = data.campaigns || [];
    const cIdx = data.campaigns.findIndex((c: any) => c.id === campaign.id);
    if (cIdx >= 0) data.campaigns[cIdx] = campaign;
    data.campaign_recipients = data.campaign_recipients || [];
    data.campaign_recipients.push(...recipientsLog);
    writeCmsData(data);
  }

  return res.json({
    success: true,
    message: `Campaign broadcast completed! ${successfulCount} sent successfully, ${failedCount} failed out of ${activeSubscribers.length} active subscribers.`,
    campaign
  });
});

export default router;
