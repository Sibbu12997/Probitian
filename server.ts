import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Supabase Server-Side Client Configuration
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isServerSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('your-supabase-project') &&
    !supabaseUrl.includes('placeholder-project')
  );
};

const serverSupabase = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

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

// ADMIN PASSKEY AUTHENTICATION ENDPOINT (Server-Side Only)
app.post('/api/admin/verify-passkey', (req, res) => {
  const { passkey, email } = req.body || {};
  const serverPasskey = (process.env.ADMIN_PASSKEY || '').trim();
  const enteredPasskey = (passkey || '').trim();

  if (!serverPasskey) {
    console.warn('[SECURITY WARNING] ADMIN_PASSKEY environment variable is not configured on the server.');
    return res.status(500).json({ error: 'Admin passkey is not configured on the server environment. Please set ADMIN_PASSKEY.' });
  }

  if (enteredPasskey && enteredPasskey === serverPasskey) {
    return res.json({ success: true, email: (email || 'admin@probitian.com').trim() });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
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
// NEWSLETTER & MESSAGES API
// ----------------------------------------------------
import { emailService } from './src/services/emailService';
import { campaignEmailService } from './src/services/campaignEmailService';

app.post('/api/newsletter', async (req, res) => {
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email is required' });
  }

  const data = readCmsData();
  data.subscribers = data.subscribers || [];

  const existing = data.subscribers.find((s: any) => s.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.json({ success: true, message: 'You are already subscribed to ProBitian!' });
  }

  const newSub = {
    id: 'sub-' + Date.now(),
    email,
    status: 'active',
    created_at: new Date().toISOString()
  };

  data.subscribers.unshift(newSub);
  writeCmsData(data);

  const emailRes = await emailService.sendWelcomeEmail(email);

  res.json({
    success: true,
    message: emailRes.message || 'Successfully subscribed to the newsletter!',
    subscriber: newSub
  });
});

// ----------------------------------------------------
// CMS BRANDING & SETTINGS API ENDPOINTS (Supabase Authoritative + Local File System Fallback)
// ----------------------------------------------------

// CMS SYSTEM STATUS
app.get('/api/cms/status', (req, res) => {
  const isConfigured = isServerSupabaseConfigured();
  return res.json({
    status: 'ok',
    supabaseConfigured: isConfigured,
    primaryStore: isConfigured ? 'Supabase Database' : 'Local File System (/data/cms_settings.json)',
    fallbackActive: true
  });
});

// GENERAL SETTINGS
app.get('/api/cms/settings/general', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'general').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
    } catch (err) {
      console.warn('[Supabase GET General Settings Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.general || null);
});

app.post('/api/cms/settings/general', async (req, res) => {
  const settings = req.body;
  if (!settings) {
    return res.status(400).json({ error: 'Missing settings payload' });
  }

  const data = readCmsData();
  data.general = settings;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('settings').upsert({
        key: 'general',
        value: settings,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Supabase POST General Settings Error]', err);
    }
  }

  return res.json({ success: true, settings });
});

// SEO SETTINGS
app.get('/api/cms/settings/seo', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'seo').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
    } catch (err) {
      console.warn('[Supabase GET SEO Settings Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.seo || null);
});

app.post('/api/cms/settings/seo', async (req, res) => {
  const seo = req.body;
  if (!seo) {
    return res.status(400).json({ error: 'Missing SEO settings payload' });
  }

  const data = readCmsData();
  data.seo = seo;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('settings').upsert({
        key: 'seo',
        value: seo,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Supabase POST SEO Settings Error]', err);
    }
  }

  return res.json({ success: true, seo });
});

// LEGAL & POLICIES SETTINGS
app.get('/api/cms/settings/legal', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('settings').select('value').eq('key', 'legal_policies').single();
      if (!error && data?.value) {
        return res.json(data.value);
      }
    } catch (err) {
      console.warn('[Supabase GET Legal Settings Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.legal_policies || null);
});

app.post('/api/cms/settings/legal', async (req, res) => {
  const legal = req.body;
  if (!legal) {
    return res.status(400).json({ error: 'Missing legal settings payload' });
  }

  const data = readCmsData();
  data.legal_policies = legal;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('settings').upsert({
        key: 'legal_policies',
        value: legal,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Supabase POST Legal Settings Error]', err);
    }
  }

  return res.json({ success: true, legal });
});

// HOME PAGE CONFIG
app.get('/api/cms/settings/home', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('pages').select('*').eq('page_key', 'home').single();
      if (!error && data) {
        const homeConfig = {
          hero_heading: data.hero_heading,
          hero_description: data.hero_description,
          buttons: data.buttons,
          banner_url: data.banner_url,
          statistics: data.statistics,
          feature_cards: data.feature_cards,
          testimonials: data.testimonials,
          cta: data.cta
        };
        return res.json(homeConfig);
      }
    } catch (err) {
      console.warn('[Supabase GET Home Config Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.home || null);
});

app.post('/api/cms/settings/home', async (req, res) => {
  const homeConfig = req.body;
  if (!homeConfig) {
    return res.status(400).json({ error: 'Missing home config payload' });
  }

  const data = readCmsData();
  data.home = homeConfig;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('pages').upsert({
        page_key: 'home',
        title: 'Home Page Configuration',
        hero_heading: homeConfig.hero_heading,
        hero_description: homeConfig.hero_description,
        buttons: homeConfig.buttons,
        banner_url: homeConfig.banner_url,
        statistics: homeConfig.statistics,
        feature_cards: homeConfig.feature_cards,
        testimonials: homeConfig.testimonials,
        cta: homeConfig.cta,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[Supabase POST Home Config Error]', err);
    }
  }

  return res.json({ success: true, home: homeConfig });
});

// PROJECTS
app.get('/api/cms/projects', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Projects Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.projects || []);
});

app.post('/api/cms/projects', async (req, res) => {
  const project = req.body;
  if (!project || !project.id) {
    return res.status(400).json({ error: 'Invalid project payload' });
  }

  const data = readCmsData();
  data.projects = data.projects || [];
  const idx = data.projects.findIndex((p: any) => p.id === project.id);
  if (idx >= 0) {
    data.projects[idx] = project;
  } else {
    data.projects.unshift(project);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('projects').upsert(project);
    } catch (err) {
      console.error('[Supabase POST Project Error]', err);
    }
  }

  return res.json({ success: true, project });
});

app.delete('/api/cms/projects/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.projects) {
    data.projects = data.projects.filter((p: any) => p.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('projects').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Project Error]', err);
    }
  }

  return res.json({ success: true });
});

// BLOGS
app.get('/api/cms/blogs', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('blogs').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Blogs Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.blogs || []);
});

app.post('/api/cms/blogs', async (req, res) => {
  const blog = req.body;
  if (!blog || !blog.id) {
    return res.status(400).json({ error: 'Invalid blog payload' });
  }

  const data = readCmsData();
  data.blogs = data.blogs || [];
  const idx = data.blogs.findIndex((b: any) => b.id === blog.id);
  if (idx >= 0) {
    data.blogs[idx] = blog;
  } else {
    data.blogs.unshift(blog);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('blogs').upsert(blog);
    } catch (err) {
      console.error('[Supabase POST Blog Error]', err);
    }
  }

  return res.json({ success: true, blog });
});

app.delete('/api/cms/blogs/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.blogs) {
    data.blogs = data.blogs.filter((b: any) => b.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('blogs').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Blog Error]', err);
    }
  }

  return res.json({ success: true });
});

// COURSES
app.get('/api/cms/courses', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('courses').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Courses Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.courses || []);
});

app.post('/api/cms/courses', async (req, res) => {
  const course = req.body;
  if (!course || !course.id) {
    return res.status(400).json({ error: 'Invalid course payload' });
  }

  const data = readCmsData();
  data.courses = data.courses || [];
  const idx = data.courses.findIndex((c: any) => c.id === course.id);
  if (idx >= 0) {
    data.courses[idx] = course;
  } else {
    data.courses.unshift(course);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('courses').upsert(course);
    } catch (err) {
      console.error('[Supabase POST Course Error]', err);
    }
  }

  return res.json({ success: true, course });
});

app.delete('/api/cms/courses/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.courses) {
    data.courses = data.courses.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('courses').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Course Error]', err);
    }
  }

  return res.json({ success: true });
});

// YOUTUBE SHOWCASE / VIDEOS
app.get('/api/cms/videos', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('videos').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Videos Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.videos || []);
});

app.post('/api/cms/videos', async (req, res) => {
  const video = req.body;
  if (!video || !video.id) {
    return res.status(400).json({ error: 'Invalid video payload' });
  }

  const data = readCmsData();
  data.videos = data.videos || [];
  const idx = data.videos.findIndex((v: any) => v.id === video.id);
  if (idx >= 0) {
    data.videos[idx] = video;
  } else {
    data.videos.unshift(video);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('videos').upsert(video);
    } catch (err) {
      console.error('[Supabase POST Video Error]', err);
    }
  }

  return res.json({ success: true, video });
});

app.delete('/api/cms/videos/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.videos) {
    data.videos = data.videos.filter((v: any) => v.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('videos').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Video Error]', err);
    }
  }

  return res.json({ success: true });
});

// CONTACT MESSAGES / ENQUIRIES
app.get('/api/cms/messages', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('messages').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Messages Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.messages || []);
});

app.post('/api/cms/messages', async (req, res) => {
  const { name, email, phone, course_interested, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  const newMsg = {
    id: 'msg-' + Date.now(),
    name,
    email,
    phone: phone || '',
    course_interested: course_interested || '',
    subject: subject || 'Contact Inquiry',
    message,
    status: 'new',
    created_at: new Date().toISOString()
  };

  const data = readCmsData();
  data.messages = data.messages || [];
  data.messages.unshift(newMsg);
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('messages').insert(newMsg);
    } catch (err) {
      console.error('[Supabase POST Message Error]', err);
    }
  }

  return res.json({ success: true, message: newMsg });
});

app.post('/api/cms/messages/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { replyText, replySubject } = req.body;

  if (!replyText || !replyText.trim()) {
    return res.status(400).json({ success: false, message: 'Reply text is required.' });
  }

  const data = readCmsData();
  data.messages = data.messages || [];
  const targetIndex = data.messages.findIndex((m: any) => m.id === id);

  if (targetIndex === -1) {
    return res.status(404).json({ success: false, message: 'Enquiry message not found.' });
  }

  const targetMsg = data.messages[targetIndex];
  const finalSubject = replySubject || targetMsg.subject || 'Inquiry Reply';

  // Send email via emailService
  const emailRes = await emailService.sendAdminReply(targetMsg.email, finalSubject, replyText);

  // Update DB message
  targetMsg.status = 'replied';
  targetMsg.reply_message = replyText;
  targetMsg.replied_at = new Date().toISOString();
  targetMsg.reply_status = 'sent';
  targetMsg.email_sent_status = emailRes.message || `Reply dispatched to ${targetMsg.email}`;

  data.messages[targetIndex] = targetMsg;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('messages').update({
        status: 'replied',
        reply_message: replyText,
        replied_at: targetMsg.replied_at,
        reply_status: 'sent',
        email_sent_status: targetMsg.email_sent_status
      }).eq('id', id);
    } catch (err) {
      console.error('[Supabase REPLY Message Error]', err);
    }
  }

  return res.json({
    success: true,
    message: emailRes.message || `Reply sent to ${targetMsg.email}`,
    data: targetMsg
  });
});

app.patch('/api/cms/messages/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  const data = readCmsData();
  data.messages = data.messages || [];
  const target = data.messages.find((m: any) => m.id === id);
  if (target) {
    if (status) target.status = status;
    if (adminNotes !== undefined) target.admin_notes = adminNotes;
    writeCmsData(data);

    if (serverSupabase) {
      try {
        const updatePayload: any = {};
        if (status) updatePayload.status = status;
        if (adminNotes !== undefined) updatePayload.admin_notes = adminNotes;
        await serverSupabase.from('messages').update(updatePayload).eq('id', id);
      } catch (err) {
        console.error('[Supabase PATCH Message Status Error]', err);
      }
    }

    return res.json({ success: true, message: target });
  }
  return res.status(404).json({ error: 'Message not found' });
});

app.delete('/api/cms/messages/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.messages) {
    data.messages = data.messages.filter((m: any) => m.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('messages').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Message Error]', err);
    }
  }

  return res.json({ success: true });
});

// NEWSLETTER SUBSCRIBERS
app.get('/api/cms/subscribers', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Subscribers Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.subscribers || []);
});

app.post('/api/cms/subscribers', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const data = readCmsData();
  data.subscribers = data.subscribers || [];
  const existing = data.subscribers.find((s: any) => s.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.json({ success: true, message: 'Subscriber already exists' });
  }
  const newSub = {
    id: 'sub-' + Date.now(),
    email,
    status: 'active',
    created_at: new Date().toISOString()
  };
  data.subscribers.unshift(newSub);
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('newsletter').insert(newSub);
    } catch (err) {
      console.error('[Supabase POST Subscriber Error]', err);
    }
  }

  await emailService.sendWelcomeEmail(email);

  return res.json({ success: true, subscriber: newSub });
});

app.delete('/api/cms/subscribers/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.subscribers) {
    data.subscribers = data.subscribers.filter((s: any) => s.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('newsletter').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Subscriber Error]', err);
    }
  }

  return res.json({ success: true });
});

// ----------------------------------------------------
// EMAIL CAMPAIGNS API ENDPOINTS
// ----------------------------------------------------

// Audience Count
app.get('/api/admin/email-campaigns/audience-count', async (req, res) => {
  let count = 0;
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('newsletter').select('id').eq('status', 'active');
      if (!error && data) {
        count = data.length;
        return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
      }
    } catch (e) {}
  }
  const data = readCmsData();
  const subs = data.subscribers || [];
  count = subs.filter((s: any) => s.status === 'active').length;
  return res.json({ success: true, count, providerConfigured: campaignEmailService.isConfigured() });
});

// GET All Campaigns
app.get('/api/admin/email-campaigns', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return res.json(data);
      }
    } catch (e) {}
  }
  const data = readCmsData();
  return res.json(data.campaigns || []);
});

// GET Single Campaign
app.get('/api/admin/email-campaigns/:id', async (req, res) => {
  const { id } = req.params;
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (!error && data) {
        const { data: recipients } = await serverSupabase.from('email_campaign_recipients').select('*').eq('campaign_id', id);
        return res.json({ ...data, recipients: recipients || [] });
      }
    } catch (e) {}
  }
  const data = readCmsData();
  const campaign = (data.campaigns || []).find((c: any) => c.id === id);
  if (campaign) {
    const recipients = (data.campaign_recipients || []).filter((r: any) => r.campaign_id === id);
    return res.json({ ...campaign, recipients });
  }
  return res.status(404).json({ error: 'Campaign not found' });
});

// POST Create / Save Campaign
app.post('/api/admin/email-campaigns', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.subject || !payload.content) {
    return res.status(400).json({ error: 'Name, subject, and content are required' });
  }

  const campaign = {
    id: payload.id || ('camp-' + Date.now()),
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
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const data = readCmsData();
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c: any) => c.id === campaign.id);
  if (idx >= 0) {
    data.campaigns[idx] = campaign;
  } else {
    data.campaigns.unshift(campaign);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').upsert(campaign);
    } catch (e) {
      console.warn('[Supabase POST Campaign Warning]', e);
    }
  }

  return res.json({ success: true, campaign });
});

// PATCH Update Campaign
app.patch('/api/admin/email-campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  updates.updated_at = new Date().toISOString();

  const data = readCmsData();
  data.campaigns = data.campaigns || [];
  const idx = data.campaigns.findIndex((c: any) => c.id === id);
  if (idx >= 0) {
    data.campaigns[idx] = { ...data.campaigns[idx], ...updates };
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').update(updates).eq('id', id);
    } catch (e) {}
  }

  return res.json({ success: true, campaign: data.campaigns[idx] || updates });
});

// DELETE Campaign
app.delete('/api/admin/email-campaigns/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.campaigns) {
    data.campaigns = data.campaigns.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').delete().eq('id', id);
    } catch (e) {}
  }

  return res.json({ success: true });
});

// POST Send Test Email
app.post('/api/admin/email-campaigns/:id/test', async (req, res) => {
  const { id } = req.params;
  const { testEmail } = req.body;

  if (!testEmail || !testEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid test email is required' });
  }

  const data = readCmsData();
  let campaign = (data.campaigns || []).find((c: any) => c.id === id);

  if (!campaign && serverSupabase) {
    try {
      const { data: sbCamp } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (sbCamp) campaign = sbCamp;
    } catch (e) {}
  }

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign not found' });
  }

  const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
  const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
  const unsubscribeUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?email=${encodeURIComponent(testEmail)}`;

  const result = await campaignEmailService.sendTestEmail({
    testEmail,
    subject: campaign.subject,
    previewText: campaign.preview_text,
    contentHtml: campaign.content,
    unsubscribeUrl
  });

  return res.json(result);
});

// POST Send Bulk Campaign to Active Subscribers
app.post('/api/admin/email-campaigns/:id/send', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  let campaign = (data.campaigns || []).find((c: any) => c.id === id);

  if (!campaign && serverSupabase) {
    try {
      const { data: sbCamp } = await serverSupabase.from('email_campaigns').select('*').eq('id', id).single();
      if (sbCamp) campaign = sbCamp;
    } catch (e) {}
  }

  if (!campaign) {
    return res.status(404).json({ success: false, message: 'Campaign record not found' });
  }

  // Check Resend Configuration
  if (!campaignEmailService.isConfigured()) {
    return res.status(400).json({
      success: false,
      message: 'RESEND_API_KEY environment variable is not configured on the server. Please set RESEND_API_KEY in server environment to enable live bulk email delivery.'
    });
  }

  // Retrieve Active Subscribers ONLY
  let activeSubscribers: any[] = [];
  if (serverSupabase) {
    try {
      const { data: sbSubs } = await serverSupabase.from('newsletter').select('*').eq('status', 'active');
      if (sbSubs && sbSubs.length > 0) activeSubscribers = sbSubs;
    } catch (e) {}
  }

  if (activeSubscribers.length === 0) {
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
    const unsubUrl = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(subEmail)}`;

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

  // Update Campaign Status
  const sentAt = new Date().toISOString();
  const finalStatus = failedCount === 0 ? 'sent' : (successfulCount > 0 ? 'partially_sent' : 'failed');

  campaign.status = finalStatus;
  campaign.sent_at = sentAt;
  campaign.total_recipients = activeSubscribers.length;
  campaign.successful_count = successfulCount;
  campaign.failed_count = failedCount;
  campaign.updated_at = sentAt;

  // Save to CMS Data
  data.campaigns = data.campaigns || [];
  const cIdx = data.campaigns.findIndex((c: any) => c.id === campaign.id);
  if (cIdx >= 0) data.campaigns[cIdx] = campaign;

  data.campaign_recipients = data.campaign_recipients || [];
  data.campaign_recipients.push(...recipientsLog);
  writeCmsData(data);

  // Save to Supabase
  if (serverSupabase) {
    try {
      await serverSupabase.from('email_campaigns').upsert(campaign);
      await serverSupabase.from('email_campaign_recipients').insert(recipientsLog);
    } catch (e) {
      console.warn('[Supabase Campaign Send Update Warning]', e);
    }
  }

  return res.json({
    success: true,
    message: `Campaign broadcast completed! ${successfulCount} sent successfully, ${failedCount} failed out of ${activeSubscribers.length} active subscribers.`,
    campaign
  });
});

// PUBLIC UNSUBSCRIBE ENDPOINT
app.get('/api/newsletter/unsubscribe', async (req, res) => {
  const email = (req.query.email || req.query.token || '').toString().trim();

  if (!email || !email.includes('@')) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribe - ProBitian</title><style>body{font-family:sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;}</style></head>
        <body>
          <div class="card">
            <h2 style="color:#ef4444;">Invalid Unsubscribe Request</h2>
            <p>No valid subscriber email address was provided in the unsubscribe request.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Update in local file store
  const data = readCmsData();
  data.subscribers = data.subscribers || [];
  const target = data.subscribers.find((s: any) => s.email.toLowerCase() === email.toLowerCase());
  if (target) {
    target.status = 'unsubscribed';
    writeCmsData(data);
  }

  // Update in Supabase
  if (serverSupabase) {
    try {
      await serverSupabase.from('newsletter').update({ status: 'unsubscribed' }).eq('email', email);
    } catch (e) {}
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Unsubscribed - ProBitian</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 500px; width: 100%; padding: 40px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background-color: #f59e0b; color: #0f172a; font-weight: 900; padding: 6px 12px; border-radius: 8px; font-size: 16px; margin-bottom: 16px; }
          h1 { color: #ffffff; font-size: 24px; font-weight: 800; margin-bottom: 12px; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .email-highlight { color: #a78bfa; font-weight: 600; }
          .btn { display: inline-block; background-color: #7c3aed; color: #ffffff; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none; transition: all 0.2s; }
          .btn:hover { background-color: #6d28d9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">PB</div>
          <h1>You Have Been Unsubscribed</h1>
          <p><span class="email-highlight">${email}</span> has been removed from ProBitian newsletter and community campaign emails. You will no longer receive marketing or tutorial updates from us.</p>
          <a href="/" class="btn">Return to ProBitian Homepage</a>
        </div>
      </body>
    </html>
  `);
});

// SOCIAL LINKS
app.get('/api/cms/social', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('social_links').select('*').order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Social Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.social_links || []);
});

app.post('/api/cms/social', async (req, res) => {
  const links = req.body;
  if (!Array.isArray(links)) {
    return res.status(400).json({ error: 'Social links payload must be an array' });
  }
  const data = readCmsData();
  data.social_links = links;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      for (const link of links) {
        await serverSupabase.from('social_links').upsert(link);
      }
    } catch (err) {
      console.error('[Supabase POST Social Error]', err);
    }
  }

  return res.json({ success: true, links });
});

// NAVIGATION
app.get('/api/cms/navigation', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('navigation').select('*').order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Navigation Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.navigation || []);
});

app.post('/api/cms/navigation', async (req, res) => {
  const navItems = req.body;
  if (!Array.isArray(navItems)) {
    return res.status(400).json({ error: 'Navigation payload must be an array' });
  }
  const data = readCmsData();
  data.navigation = navItems;
  writeCmsData(data);

  if (serverSupabase) {
    try {
      for (const item of navItems) {
        await serverSupabase.from('navigation').upsert(item);
      }
    } catch (err) {
      console.error('[Supabase POST Navigation Error]', err);
    }
  }

  return res.json({ success: true, navigation: navItems });
});

// MEDIA LIBRARY
app.get('/api/cms/media', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('media').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Media Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.media || []);
});

app.post('/api/cms/media', async (req, res) => {
  const mediaItem = req.body;
  if (!mediaItem || !mediaItem.filename) {
    return res.status(400).json({ error: 'Invalid media item payload' });
  }
  const itemWithId = {
    ...mediaItem,
    id: mediaItem.id || ('m-' + Date.now()),
    created_at: mediaItem.created_at || new Date().toISOString()
  };
  const data = readCmsData();
  data.media = data.media || [];
  data.media.unshift(itemWithId);
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('media').insert(itemWithId);
    } catch (err) {
      console.error('[Supabase POST Media Error]', err);
    }
  }

  return res.json({ success: true, media: itemWithId });
});

app.delete('/api/cms/media/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.media) {
    data.media = data.media.filter((m: any) => m.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('media').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Media Error]', err);
    }
  }

  return res.json({ success: true });
});

// CATEGORIES
app.get('/api/cms/categories', async (req, res) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('categories').select('*');
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Supabase GET Categories Warning]', err);
    }
  }
  const data = readCmsData();
  return res.json(data.categories || []);
});

app.post('/api/cms/categories', async (req, res) => {
  const cat = req.body;
  if (!cat || !cat.id) {
    return res.status(400).json({ error: 'Invalid category payload' });
  }
  const data = readCmsData();
  data.categories = data.categories || [];
  const idx = data.categories.findIndex((c: any) => c.id === cat.id);
  if (idx >= 0) {
    data.categories[idx] = cat;
  } else {
    data.categories.push(cat);
  }
  writeCmsData(data);

  if (serverSupabase) {
    try {
      await serverSupabase.from('categories').upsert(cat);
    } catch (err) {
      console.error('[Supabase POST Category Error]', err);
    }
  }

  return res.json({ success: true, category: cat });
});

app.delete('/api/cms/categories/:id', async (req, res) => {
  const { id } = req.params;
  const data = readCmsData();
  if (data.categories) {
    data.categories = data.categories.filter((c: any) => c.id !== id);
    writeCmsData(data);
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('categories').delete().eq('id', id);
    } catch (err) {
      console.error('[Supabase DELETE Category Error]', err);
    }
  }

  return res.json({ success: true });
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
