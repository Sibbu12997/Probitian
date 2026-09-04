import express from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission, UserRole } from '../auth/types';
import { isValidId, isValidUuid } from '../config/constants';
import { generateUnsubscribeToken } from '../security/tokens';
import { emailSendLimiter, emailTestLimiter } from '../middleware/rateLimiters';
import { serverSupabase, readCmsData, writeCmsData } from '../services/supabase';
import { campaignEmailService } from '../../src/services/campaignEmailService';

const router = express.Router();

// Helper to query Supabase CRM Leads with fallback
export async function getSupabaseCrmLeads(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    return data.leads || [];
  }

  try {
    const { data: dbLeads, error: tblErr } = await serverSupabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!tblErr && Array.isArray(dbLeads)) {
      return dbLeads;
    }

    // Fallback to Supabase settings table if leads table is empty/unmigrated
    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_leads')
      .maybeSingle();

    if (!rowErr && row && Array.isArray(row.value?.leads)) {
      return row.value.leads;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase CRM Leads Read Exception]', err);
    throw new Error('Supabase CRM database unavailable');
  }
}

// Helper to save Supabase CRM Leads with backup
export async function saveSupabaseCrmLeads(leads: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.leads = leads;
    writeCmsData(data);
    return;
  }

  const normalizedLeads = leads.map(l => ({
    ...l,
    id: isValidUuid(l.id) ? l.id : crypto.randomUUID()
  }));

  // 1. Primary storage: public.leads table
  try {
    const { error: tblErr } = await serverSupabase.from('leads').upsert(normalizedLeads);
    if (!tblErr) {
      // Also update settings table as backup
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_leads',
        value: { leads: normalizedLeads, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  // 2. Backup storage: public.settings table
  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_leads',
    value: { leads: normalizedLeads, updated_at: now },
    updated_at: now
  });

  if (error) {
    console.error('[Supabase Save CRM Leads Error]', error.message);
    throw new Error(`Failed to persist leads to Supabase: ${error.message}`);
  }
}

// Helper to query Supabase Lead Campaigns
export async function getSupabaseCrmCampaigns(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    return data.lead_campaigns || [];
  }

  try {
    const { data: dbCamps, error: tblErr } = await serverSupabase
      .from('lead_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (!tblErr && Array.isArray(dbCamps)) {
      return dbCamps;
    }

    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_lead_campaigns')
      .maybeSingle();

    if (!rowErr && row && Array.isArray(row.value?.campaigns)) {
      return row.value.campaigns;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase CRM Campaigns Read Exception]', err);
    throw new Error('Supabase CRM campaigns database unavailable');
  }
}

// Helper to save Supabase Lead Campaigns
export async function saveSupabaseCrmCampaigns(campaigns: any[]): Promise<void> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    data.lead_campaigns = campaigns;
    writeCmsData(data);
    return;
  }

  const normalizedCampaigns = campaigns.map(c => ({
    ...c,
    id: isValidUuid(c.id) ? c.id : crypto.randomUUID()
  }));

  try {
    const { error: tblErr } = await serverSupabase.from('lead_campaigns').upsert(normalizedCampaigns);
    if (!tblErr) {
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_lead_campaigns',
        value: { campaigns: normalizedCampaigns, updated_at: now },
        updated_at: now
      });
      return;
    }
  } catch (e) {
    // Fall back to settings
  }

  const now = new Date().toISOString();
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_lead_campaigns',
    value: { campaigns: normalizedCampaigns, updated_at: now },
    updated_at: now
  });

  if (error) {
    throw new Error(`Failed to persist lead campaigns: ${error.message}`);
  }
}

// Helper to query Supabase Campaign Leads (Recipient Outreach History)
export async function getSupabaseCrmRecipients(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.campaign_leads || [];
  }

  try {
    const { data, error } = await serverSupabase
      .from('campaign_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) return data;

    const { data: row } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_campaign_leads')
      .maybeSingle();

    if (row && Array.isArray(row.value?.recipients)) return row.value.recipients;
    return [];
  } catch (e) {
    return [];
  }
}

// ==================== CRM ROUTES ====================

// GET /api/admin/leads - List and filter leads
router.get('/admin/leads', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { status, lead_priority, industry, search, follow_up } = req.query;
    let leads: any[] = [];

    if (serverSupabase) {
      try {
        let query = serverSupabase.from('leads').select('*').order('created_at', { ascending: false });

        if (status && typeof status === 'string' && status !== 'all') {
          query = query.eq('status', status);
        }
        if (lead_priority && typeof lead_priority === 'string' && lead_priority !== 'all') {
          query = query.eq('lead_priority', lead_priority);
        }
        if (industry && typeof industry === 'string' && industry !== 'all') {
          query = query.ilike('industry', `%${industry}%`);
        }
        if (search && typeof search === 'string' && search.trim()) {
          const s = search.trim();
          query = query.or(`company_name.ilike.%${s}%,contact_person.ilike.%${s}%,email.ilike.%${s}%,industry.ilike.%${s}%,powerbi_use_case.ilike.%${s}%,location.ilike.%${s}%`);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          leads = data;
        } else {
          leads = await getSupabaseCrmLeads();
        }
      } catch (e) {
        leads = await getSupabaseCrmLeads();
      }
    } else {
      const data = readCmsData();
      leads = data.leads || [];
    }

    // Apply memory/json filters if retrieved via settings or dev cache
    if (status && typeof status === 'string' && status !== 'all') {
      leads = leads.filter((l: any) => l.status === status);
    }
    if (lead_priority && typeof lead_priority === 'string' && lead_priority !== 'all') {
      leads = leads.filter((l: any) => l.lead_priority === lead_priority);
    }
    if (industry && typeof industry === 'string' && industry !== 'all') {
      const ind = industry.toLowerCase();
      leads = leads.filter((l: any) => l.industry && l.industry.toLowerCase().includes(ind));
    }
    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim().toLowerCase();
      leads = leads.filter((l: any) =>
        (l.company_name && l.company_name.toLowerCase().includes(s)) ||
        (l.contact_person && l.contact_person.toLowerCase().includes(s)) ||
        (l.email && l.email.toLowerCase().includes(s)) ||
        (l.industry && l.industry.toLowerCase().includes(s)) ||
        (l.powerbi_use_case && l.powerbi_use_case.toLowerCase().includes(s)) ||
        (l.location && l.location.toLowerCase().includes(s))
      );
    }

    if (follow_up && typeof follow_up === 'string') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (follow_up === 'today') {
        leads = leads.filter((l: any) => l.follow_up_date === todayStr);
      } else if (follow_up === 'overdue') {
        leads = leads.filter((l: any) => l.follow_up_date && l.follow_up_date < todayStr && l.status !== 'Converted' && l.status !== 'Not Interested');
      } else if (follow_up === 'upcoming') {
        leads = leads.filter((l: any) => l.follow_up_date && l.follow_up_date > todayStr);
      } else if (follow_up === 'none') {
        leads = leads.filter((l: any) => !l.follow_up_date);
      }
    }

    return res.json(leads);
  } catch (err: any) {
    console.error('[GET /api/admin/leads Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// GET /api/admin/leads/:id - Single lead with full campaign outreach history
router.get('/admin/leads/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  try {
    let lead: any = null;
    let outreachHistory: any[] = [];

    if (serverSupabase) {
      try {
        const { data: dbLead, error: leadErr } = await serverSupabase.from('leads').select('*').eq('id', id).single();
        if (!leadErr && dbLead) {
          lead = dbLead;
          const { data: hist } = await serverSupabase
            .from('campaign_leads')
            .select('*, lead_campaigns(name, subject, sent_at)')
            .eq('lead_id', id)
            .order('created_at', { ascending: false });
          outreachHistory = hist || [];
        }
      } catch (e) {
        // Fallback to settings
      }
    }

    if (!lead) {
      const allLeads = await getSupabaseCrmLeads();
      lead = allLeads.find((l: any) => l.id === id);
      if (!lead) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      const allRecipients = await getSupabaseCrmRecipients();
      const allCampaigns = await getSupabaseCrmCampaigns();
      const campaignMap = new Map(allCampaigns.map(c => [c.id, { name: c.name, subject: c.subject, sent_at: c.sent_at }]));

      outreachHistory = allRecipients
        .filter((cl: any) => cl.lead_id === id || (cl.lead_email && cl.lead_email.toLowerCase() === lead.email.toLowerCase()))
        .map(cl => ({
          ...cl,
          lead_campaigns: campaignMap.get(cl.campaign_id) || null
        }));
    }

    return res.json({ ...lead, outreach_history: outreachHistory });
  } catch (err: any) {
    console.error('[GET /api/admin/leads/:id Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// POST /api/admin/leads - Create or update single lead
router.post('/admin/leads', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.company_name || !payload.email) {
    return res.status(400).json({ error: 'Company Name and Email are required.' });
  }

  const cleanEmail = payload.email.trim().toLowerCase();
  const now = new Date().toISOString();

  // If this is a new lead (no ID provided), check for existing duplicate email
  if (!payload.id) {
    try {
      const existingLeads = await getSupabaseCrmLeads();
      const duplicate = existingLeads.find((l: any) => l.email && l.email.toLowerCase() === cleanEmail);
      if (duplicate && !payload.allowUpdate) {
        return res.status(400).json({
          error: `A lead with email "${cleanEmail}" already exists (${duplicate.company_name}).`,
          existingLeadId: duplicate.id
        });
      }
    } catch (e) {
      // Continue
    }
  }

  const leadRecord = {
    company_name: payload.company_name.trim(),
    industry: (payload.industry || '').trim(),
    location: (payload.location || '').trim(),
    contact_person: (payload.contact_person || '').trim(),
    email: cleanEmail,
    phone: (payload.phone || '').trim(),
    linkedin: (payload.linkedin || '').trim(),
    powerbi_use_case: (payload.powerbi_use_case || '').trim(),
    lead_priority: ['High', 'Medium', 'Low'].includes(payload.lead_priority) ? payload.lead_priority : 'Medium',
    status: payload.status || 'Not Contacted',
    follow_up_date: payload.follow_up_date || null,
    notes: (payload.notes || '').trim(),
    updated_at: now
  };

  let leadId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();

  if (serverSupabase) {
    try {
      const dbPayload: any = { ...leadRecord, id: leadId };
      const { data, error } = await serverSupabase.from('leads').upsert(dbPayload).select().single();
      if (!error && data) {
        return res.json({ success: true, lead: data });
      }
    } catch (err: any) {
      // Continue to settings persistence
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idx = leads.findIndex((l: any) => l.id === leadId);
    let savedLead: any;
    if (idx >= 0) {
      savedLead = { ...leads[idx], ...leadRecord, id: leadId, updated_at: now };
      leads[idx] = savedLead;
    } else {
      savedLead = { id: leadId, created_at: now, ...leadRecord };
      leads.unshift(savedLead);
    }
    await saveSupabaseCrmLeads(leads);
    return res.json({ success: true, lead: savedLead });
  } catch (err: any) {
    console.error('[POST /api/admin/leads Error]', err);
    return res.status(500).json({ error: 'Failed to persist lead to Supabase database' });
  }
});

// POST /api/admin/leads/import - CSV Import with full validation & duplicate handling
router.post('/admin/leads/import', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { leads, skipDuplicates = true, updateDuplicates = false } = req.body || {};

  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No lead records provided for import.' });
  }

  const validStatuses = [
    'Not Contacted', 'Contacted', 'Opened', 'Replied', 'Interested',
    'Demo Requested', 'Proposal Sent', 'Converted', 'Not Interested', 'Bounced', 'Do Not Contact'
  ];
  const validPriorities = ['High', 'Medium', 'Low'];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const now = new Date().toISOString();

  const validatedLeads: any[] = [];
  const errors: { row: number; reason: string; email?: string }[] = [];
  const seenBatchEmails = new Set<string>();

  for (let i = 0; i < leads.length; i++) {
    const raw = leads[i];
    const rowNum = i + 1;

    const company_name = (raw.company_name || raw['Company Name'] || raw.company || '').trim();
    const rawEmail = (raw.email || raw['Email'] || raw['Contact Email'] || '').trim().toLowerCase();

    if (!company_name) {
      errors.push({ row: rowNum, reason: 'Missing Company Name', email: rawEmail });
      continue;
    }
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      errors.push({ row: rowNum, reason: 'Invalid or missing Email address', email: rawEmail });
      continue;
    }

    if (seenBatchEmails.has(rawEmail)) {
      errors.push({ row: rowNum, reason: 'Duplicate email within import file', email: rawEmail });
      continue;
    }
    seenBatchEmails.add(rawEmail);

    let priority = (raw.lead_priority || raw.priority || raw['Priority'] || raw['Lead Priority'] || 'Medium').trim();
    priority = priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
    if (!validPriorities.includes(priority)) priority = 'Medium';

    let status = (raw.status || raw['Status'] || raw['Lead Status'] || 'Not Contacted').trim();
    if (!validStatuses.includes(status)) status = 'Not Contacted';

    let follow_up_date = raw.follow_up_date || raw['Follow-up Date'] || raw['Followup Date'] || null;
    if (follow_up_date && isNaN(Date.parse(follow_up_date))) {
      follow_up_date = null;
    }

    validatedLeads.push({
      company_name,
      industry: (raw.industry || raw['Industry'] || '').trim(),
      location: (raw.location || raw['Location'] || raw.city || '').trim(),
      contact_person: (raw.contact_person || raw['Contact Person'] || raw['Name'] || raw.name || '').trim(),
      email: rawEmail,
      phone: (raw.phone || raw['Phone'] || raw['Mobile'] || '').trim(),
      linkedin: (raw.linkedin || raw['LinkedIn'] || raw['Linkedin URL'] || '').trim(),
      powerbi_use_case: (raw.powerbi_use_case || raw['Power BI Use Case'] || raw['Use Case'] || '').trim(),
      lead_priority: priority,
      status,
      follow_up_date,
      notes: (raw.notes || raw['Notes'] || '').trim(),
      created_at: now,
      updated_at: now
    });
  }

  let importedCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;

  try {
    const existingLeads = await getSupabaseCrmLeads();
    const existingEmailMap = new Map<string, any>();
    existingLeads.forEach(l => {
      if (l.email) existingEmailMap.set(l.email.toLowerCase(), l);
    });

    const toInsert: any[] = [];
    const updatedList = [...existingLeads];

    for (const lead of validatedLeads) {
      const existing = existingEmailMap.get(lead.email);
      if (existing) {
        if (updateDuplicates) {
          const idx = updatedList.findIndex(l => l.id === existing.id);
          if (idx >= 0) {
            updatedList[idx] = { ...existing, ...lead, id: existing.id, updated_at: now };
          }
          updatedCount++;
        } else if (skipDuplicates) {
          skippedCount++;
        }
      } else {
        const newId = crypto.randomUUID();
        const newLead = { id: newId, ...lead };
        toInsert.push(newLead);
        updatedList.unshift(newLead);
        importedCount++;
      }
    }

    await saveSupabaseCrmLeads(updatedList);

    // Also persist to public.leads table if Supabase is connected
    if (serverSupabase && toInsert.length > 0) {
      try {
        await serverSupabase.from('leads').insert(toInsert.map(l => ({ ...l, id: isValidUuid(l.id) ? l.id : crypto.randomUUID() })));
      } catch (e) {
        // Handled in settings backup
      }
    }

    return res.json({
      success: true,
      totalProvided: leads.length,
      importedCount,
      skippedCount,
      updatedCount,
      invalidCount: errors.length,
      errors: errors.slice(0, 50)
    });
  } catch (err: any) {
    console.error('[POST /api/admin/leads/import Error]', err);
    return res.status(500).json({ error: 'Database error importing leads.' });
  }
});

// PATCH /api/admin/leads/:id/status - Quick update lead status / follow-up / notes
router.patch('/admin/leads/:id/status', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  const { status, follow_up_date, notes, lead_priority } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (follow_up_date !== undefined) updates.follow_up_date = follow_up_date || null;
  if (notes !== undefined) updates.notes = notes;
  if (lead_priority) updates.lead_priority = lead_priority;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('leads').update(updates).eq('id', id).select().single();
      if (!error && data) {
        return res.json({ success: true, lead: data });
      }
    } catch (e) {
      // Continue to settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idx = leads.findIndex((l: any) => l.id === id);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...updates };
      await saveSupabaseCrmLeads(leads);
      return res.json({ success: true, lead: leads[idx] });
    }
    return res.status(404).json({ error: 'Lead not found' });
  } catch (err: any) {
    console.error('[PATCH /api/admin/leads/:id/status Error]', err);
    return res.status(500).json({ error: 'Failed to update lead in database' });
  }
});

// DELETE /api/admin/leads/:id - Delete single lead
router.delete('/admin/leads/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid lead ID format' });
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('leads').delete().eq('id', id);
    } catch (e) {
      // Handled in settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const filtered = leads.filter((l: any) => l.id !== id);
    await saveSupabaseCrmLeads(filtered);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/leads/:id Error]', err);
    return res.status(500).json({ error: 'Failed to delete lead from database' });
  }
});

// POST /api/admin/leads/batch-delete - Batch delete leads
router.post('/admin/leads/batch-delete', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of lead IDs is required' });
  }

  if (serverSupabase) {
    try {
      await serverSupabase.from('leads').delete().in('id', ids);
    } catch (e) {
      // Handled in settings
    }
  }

  try {
    const leads = await getSupabaseCrmLeads();
    const idSet = new Set(ids);
    const filtered = leads.filter((l: any) => !idSet.has(l.id));
    await saveSupabaseCrmLeads(filtered);
    return res.json({ success: true, count: ids.length });
  } catch (err: any) {
    console.error('[POST /api/admin/leads/batch-delete Error]', err);
    return res.status(500).json({ error: 'Failed to batch delete leads' });
  }
});

// GET /api/admin/lead-campaigns - List lead outreach campaigns
router.get('/admin/lead-campaigns', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const campaigns = await getSupabaseCrmCampaigns();
    return res.json(campaigns);
  } catch (err: any) {
    console.error('[GET /api/admin/lead-campaigns Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// GET /api/admin/lead-campaigns/:id - Single lead campaign with recipient results
router.get('/admin/lead-campaigns/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const campaign = campaigns.find((c: any) => c.id === id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let recipients: any[] = [];
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase
          .from('campaign_leads')
          .select('*, leads(company_name, contact_person, email, industry)')
          .eq('campaign_id', id)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          recipients = data;
        }
      } catch (e) {
        // Fallback
      }
    }

    if (recipients.length === 0) {
      const allRecipients = await getSupabaseCrmRecipients();
      recipients = allRecipients.filter((r: any) => r.campaign_id === id);
    }

    return res.json({ ...campaign, recipients });
  } catch (err: any) {
    console.error('[GET /api/admin/lead-campaigns/:id Error]', err);
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// POST /api/admin/lead-campaigns - Create / Save lead campaign
router.post('/admin/lead-campaigns', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.name || !payload.subject || !payload.html_content) {
    return res.status(400).json({ error: 'Campaign Name, Subject, and HTML Content are required.' });
  }

  const now = new Date().toISOString();
  const campaignId = isValidUuid(payload.id) ? payload.id : crypto.randomUUID();

  const campaignRecord = {
    id: campaignId,
    name: payload.name.trim(),
    campaign_type: 'lead_outreach',
    subject: payload.subject.trim(),
    preheader: (payload.preheader || '').trim(),
    html_content: payload.html_content,
    target_audience: payload.target_audience || 'filtered',
    audience_filters: payload.audience_filters || {},
    status: payload.status || 'draft',
    total_recipients: payload.total_recipients || 0,
    successful_count: payload.successful_count || 0,
    failed_count: payload.failed_count || 0,
    sent_at: payload.sent_at || null,
    updated_at: now
  };

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const idx = campaigns.findIndex((c: any) => c.id === campaignId);
    let saved: any;
    if (idx >= 0) {
      saved = { ...campaigns[idx], ...campaignRecord, updated_at: now };
      campaigns[idx] = saved;
    } else {
      saved = { ...campaignRecord, created_at: now };
      campaigns.unshift(saved);
    }

    await saveSupabaseCrmCampaigns(campaigns);
    return res.json({ success: true, campaign: saved });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-campaigns Error]', err);
    return res.status(500).json({ error: 'Failed to save outreach campaign' });
  }
});

// POST /api/admin/lead-campaigns/:id/send - Broadcast outreach campaign to selected leads
router.post('/admin/lead-campaigns/:id/send', requireAuth, requirePermission(Permission.MANAGE_CRM), emailSendLimiter, async (req, res) => {
  const { id } = req.params;
  const { leadIds, filters } = req.body || {};

  if (!isValidId(id)) {
    return res.status(400).json({ error: 'Invalid campaign ID format' });
  }

  try {
    const campaigns = await getSupabaseCrmCampaigns();
    const campaign = campaigns.find((c: any) => c.id === id);
    if (!campaign) {
      return res.status(404).json({ error: 'Outreach campaign not found' });
    }

    if (!campaignEmailService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Email SMTP is not configured',
        message: 'GMAIL_USER or GMAIL_APP_PASSWORD is not configured in the server environment.'
      });
    }

    // Determine target recipient leads
    const allLeads = await getSupabaseCrmLeads();
    let targetLeads: any[] = [];

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      const idSet = new Set(leadIds);
      targetLeads = allLeads.filter((l: any) => idSet.has(l.id));
    } else if (filters && typeof filters === 'object') {
      targetLeads = allLeads.filter((l: any) => {
        if (filters.status && filters.status !== 'all' && l.status !== filters.status) return false;
        if (filters.lead_priority && filters.lead_priority !== 'all' && l.lead_priority !== filters.lead_priority) return false;
        if (filters.industry && filters.industry !== 'all' && (!l.industry || !l.industry.toLowerCase().includes(filters.industry.toLowerCase()))) return false;
        return true;
      });
    } else {
      // Default: Leads not yet contacted or interested
      targetLeads = allLeads.filter((l: any) => l.status !== 'Do Not Contact' && l.status !== 'Bounced');
    }

    if (targetLeads.length === 0) {
      return res.status(400).json({ error: 'No matching leads found to receive this outreach campaign.' });
    }

    let successfulCount = 0;
    let failedCount = 0;
    const recipientsLog: any[] = [];
    const now = new Date().toISOString();

    for (const lead of targetLeads) {
      // Dynamic personalization tags replacement
      let personalizedSubject = campaign.subject
        .replace(/{{company_name}}/gi, lead.company_name || 'Your Company')
        .replace(/{{contact_person}}/gi, lead.contact_person || 'there')
        .replace(/{{industry}}/gi, lead.industry || 'Business Intelligence');

      let personalizedHtml = campaign.html_content
        .replace(/{{company_name}}/gi, lead.company_name || 'Your Company')
        .replace(/{{contact_person}}/gi, lead.contact_person || 'there')
        .replace(/{{industry}}/gi, lead.industry || 'Business Intelligence')
        .replace(/{{powerbi_use_case}}/gi, lead.powerbi_use_case || 'analytics reporting');

      const unsubToken = generateUnsubscribeToken(lead.email);
      const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
      const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
      const unsubUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?token=${unsubToken}`;

      const sendRes = await campaignEmailService.sendSingleRecipient({
        toEmail: lead.email,
        subject: personalizedSubject,
        previewText: campaign.preheader || '',
        contentHtml: personalizedHtml,
        unsubscribeUrl: unsubUrl
      });

      const recipientId = crypto.randomUUID();
      const recRecord = {
        id: recipientId,
        campaign_id: campaign.id,
        lead_id: lead.id,
        lead_email: lead.email,
        status: sendRes.success ? 'sent' : 'failed',
        provider_message_id: sendRes.messageId || null,
        error_message: sendRes.error || null,
        sent_at: now,
        created_at: now
      };

      recipientsLog.push(recRecord);

      if (sendRes.success) {
        successfulCount++;
        // Update lead status to 'Contacted' if it was 'Not Contacted'
        if (lead.status === 'Not Contacted') {
          lead.status = 'Contacted';
          lead.updated_at = now;
        }
      } else {
        failedCount++;
      }
    }

    // Update campaign record
    campaign.status = failedCount === 0 ? 'sent' : (successfulCount > 0 ? 'partially_sent' : 'failed');
    campaign.sent_at = now;
    campaign.total_recipients = targetLeads.length;
    campaign.successful_count = successfulCount;
    campaign.failed_count = failedCount;
    campaign.updated_at = now;

    // Save updated campaign, recipients log, and updated lead statuses
    await saveSupabaseCrmCampaigns(campaigns);
    await saveSupabaseCrmLeads(allLeads);

    if (serverSupabase) {
      try {
        await serverSupabase.from('campaign_leads').insert(recipientsLog);
      } catch (e) {
        // Fallback
      }
    }

    return res.json({
      success: true,
      message: `Outreach broadcast completed! ${successfulCount} sent successfully, ${failedCount} failed out of ${targetLeads.length} leads.`,
      campaign
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-campaigns/:id/send Error]', err);
    return res.status(500).json({ error: 'Failed to process outreach broadcast' });
  }
});

// GET /api/admin/crm/template - Download standard CSV template
router.get('/admin/crm/template', requireAuth, requirePermission(Permission.MANAGE_CRM), (req, res) => {
  const csvContent = [
    'Company Name,Contact Person,Email,Phone,Industry,Location,Power BI Use Case,Lead Priority,Status,Follow-up Date,Notes',
    'Acme Corp,John Doe,john@acmecorp.com,+1-555-0192,Manufacturing,Chicago IL,Executive Operations Dashboard,High,Not Contacted,2026-09-15,Needs real-time inventory tracking',
    'TechFlow Solutions,Sarah Connor,sarah@techflow.io,,SaaS & Cloud,San Francisco CA,Customer Churn & Retention Analytics,High,Not Contacted,,Interested in DAX star schema consulting'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="probitian_leads_import_template.csv"');
  return res.send(csvContent);
});

// GET /api/admin/crm/stats - Summary analytics for CRM dashboard
router.get('/admin/crm/stats', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const leads = await getSupabaseCrmLeads();
    const campaigns = await getSupabaseCrmCampaigns();

    const totalLeads = leads.length;
    const highPriority = leads.filter(l => l.lead_priority === 'High').length;
    const contacted = leads.filter(l => l.status === 'Contacted' || l.status === 'Opened' || l.status === 'Replied').length;
    const converted = leads.filter(l => l.status === 'Converted').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const followUpsToday = leads.filter(l => l.follow_up_date === todayStr).length;
    const followUpsOverdue = leads.filter(l => l.follow_up_date && l.follow_up_date < todayStr && l.status !== 'Converted' && l.status !== 'Not Interested').length;

    return res.json({
      totalLeads,
      highPriority,
      contacted,
      converted,
      followUpsToday,
      followUpsOverdue,
      totalCampaigns: campaigns.length,
      sentCampaigns: campaigns.filter(c => c.status === 'sent' || c.status === 'partially_sent').length
    });
  } catch (err: any) {
    return res.status(503).json({ error: 'Database service unavailable' });
  }
});

// ==================== LEAD SEQUENCES HELPERS & ROUTES ====================

export async function getSupabaseCrmSequences(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.lead_sequences || [];
  }
  try {
    const { data: row } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_lead_sequences')
      .maybeSingle();

    if (row && Array.isArray(row.value?.sequences)) {
      return row.value.sequences;
    }
    return [];
  } catch (err) {
    console.error('[Supabase CRM Sequences Read Exception]', err);
    return [];
  }
}

export async function saveSupabaseCrmSequences(sequences: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.lead_sequences = sequences;
    writeCmsData(data);
    return;
  }
  await serverSupabase.from('settings').upsert({
    key: 'crm_lead_sequences',
    value: { sequences, updated_at: now },
    updated_at: now
  });
}

export async function getSupabaseSequenceSteps(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_steps || [];
  }
  try {
    const { data: row } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_steps')
      .maybeSingle();

    if (row && Array.isArray(row.value?.steps)) {
      return row.value.steps;
    }
    return [];
  } catch (err) {
    console.error('[Supabase Sequence Steps Read Exception]', err);
    return [];
  }
}

export async function saveSupabaseSequenceSteps(steps: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.sequence_steps = steps;
    writeCmsData(data);
    return;
  }
  await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_steps',
    value: { steps, updated_at: now },
    updated_at: now
  });
}

export async function getSupabaseSequenceLeads(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_leads || [];
  }
  try {
    const { data: row } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_leads')
      .maybeSingle();

    if (row && Array.isArray(row.value?.sequence_leads)) {
      return row.value.sequence_leads;
    }
    return [];
  } catch (err) {
    console.error('[Supabase Sequence Leads Read Exception]', err);
    return [];
  }
}

export async function saveSupabaseSequenceLeads(sequenceLeads: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.sequence_leads = sequenceLeads;
    writeCmsData(data);
    return;
  }
  await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_leads',
    value: { sequence_leads: sequenceLeads, updated_at: now },
    updated_at: now
  });
}

// GET /api/admin/lead-sequences - List all sequences with stats
router.get('/admin/lead-sequences', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const sequences = await getSupabaseCrmSequences();
    const allSteps = await getSupabaseSequenceSteps();
    const allSequenceLeads = await getSupabaseSequenceLeads();

    const result = sequences.map(seq => {
      const steps = allSteps.filter(s => s.sequence_id === seq.id);
      const leads = allSequenceLeads.filter(l => l.sequence_id === seq.id);
      return {
        ...seq,
        step_count: steps.length,
        lead_count: leads.length,
        steps,
        leads
      };
    });

    return res.json(result);
  } catch (err: any) {
    console.error('[GET /api/admin/lead-sequences Error]', err);
    return res.status(503).json({ error: 'Failed to load lead sequences' });
  }
});

// GET /api/admin/lead-sequences/:id - Single sequence with steps & enrolled leads
router.get('/admin/lead-sequences/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const sequences = await getSupabaseCrmSequences();
    const seq = sequences.find(s => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Lead sequence not found' });
    }

    const allSteps = await getSupabaseSequenceSteps();
    const allSequenceLeads = await getSupabaseSequenceLeads();

    const steps = allSteps
      .filter(s => s.sequence_id === id)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0));

    const leads = allSequenceLeads.filter(l => l.sequence_id === id);

    return res.json({
      ...seq,
      step_count: steps.length,
      lead_count: leads.length,
      steps,
      leads
    });
  } catch (err: any) {
    console.error('[GET /api/admin/lead-sequences/:id Error]', err);
    return res.status(503).json({ error: 'Failed to load sequence details' });
  }
});

// POST /api/admin/lead-sequences - Create new sequence
router.post('/admin/lead-sequences', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { name, description, steps } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Sequence name is required' });
    }

    const now = new Date().toISOString();
    const newSeqId = crypto.randomUUID();

    const newSequence = {
      id: newSeqId,
      name: name.trim(),
      description: (description || '').trim(),
      status: 'Active',
      created_at: now,
      updated_at: now
    };

    const sequences = await getSupabaseCrmSequences();
    sequences.unshift(newSequence);
    await saveSupabaseCrmSequences(sequences);

    if (Array.isArray(steps) && steps.length > 0) {
      const allSteps = await getSupabaseSequenceSteps();
      const normalizedSteps = steps.map((s, idx) => ({
        id: crypto.randomUUID(),
        sequence_id: newSeqId,
        step_number: idx + 1,
        delay_days: Number(s.delay_days) || (idx === 0 ? 0 : 3),
        subject: s.subject || `Follow-up ${idx + 1}`,
        html_content: s.html_content || '',
        plain_text: s.plain_text || '',
        created_at: now,
        updated_at: now
      }));
      allSteps.push(...normalizedSteps);
      await saveSupabaseSequenceSteps(allSteps);
    }

    return res.json({ success: true, sequence: newSequence });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences Error]', err);
    return res.status(500).json({ error: 'Failed to create lead sequence' });
  }
});

// PATCH /api/admin/lead-sequences/:id - Update sequence properties
router.patch('/admin/lead-sequences/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const sequences = await getSupabaseCrmSequences();
    const index = sequences.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const now = new Date().toISOString();
    const updatedSeq = {
      ...sequences[index],
      ...updates,
      updated_at: now
    };
    sequences[index] = updatedSeq;
    await saveSupabaseCrmSequences(sequences);

    return res.json({ success: true, sequence: updatedSeq });
  } catch (err: any) {
    console.error('[PATCH /api/admin/lead-sequences/:id Error]', err);
    return res.status(500).json({ error: 'Failed to update lead sequence' });
  }
});

// DELETE /api/admin/lead-sequences/:id - Delete sequence and steps
router.delete('/admin/lead-sequences/:id', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const sequences = await getSupabaseCrmSequences();
    const filteredSequences = sequences.filter(s => s.id !== id);
    await saveSupabaseCrmSequences(filteredSequences);

    const allSteps = await getSupabaseSequenceSteps();
    const remainingSteps = allSteps.filter(s => s.sequence_id !== id);
    await saveSupabaseSequenceSteps(remainingSteps);

    const allSequenceLeads = await getSupabaseSequenceLeads();
    const remainingLeads = allSequenceLeads.filter(l => l.sequence_id !== id);
    await saveSupabaseSequenceLeads(remainingLeads);

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/admin/lead-sequences/:id Error]', err);
    return res.status(500).json({ error: 'Failed to delete sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/steps - Save steps for sequence
router.post('/admin/lead-sequences/:id/steps', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { steps } = req.body || {};
    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: 'Invalid steps payload' });
    }

    const now = new Date().toISOString();
    const allSteps = await getSupabaseSequenceSteps();
    const otherSteps = allSteps.filter(s => s.sequence_id !== id);

    const updatedSteps = steps.map((s, idx) => ({
      id: s.id || crypto.randomUUID(),
      sequence_id: id,
      step_number: s.step_number || idx + 1,
      delay_days: Number(s.delay_days) || 0,
      subject: s.subject || `Step ${idx + 1}`,
      html_content: s.html_content || '',
      plain_text: s.plain_text || '',
      created_at: s.created_at || now,
      updated_at: now
    }));

    const merged = [...otherSteps, ...updatedSteps];
    await saveSupabaseSequenceSteps(merged);

    return res.json({ success: true, steps: updatedSteps });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/steps Error]', err);
    return res.status(500).json({ error: 'Failed to save sequence steps' });
  }
});

// POST /api/admin/lead-sequences/:id/enroll - Enroll leads in sequence
router.post('/admin/lead-sequences/:id/enroll', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { leadIds } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs are required for enrollment' });
    }

    const allSequenceLeads = await getSupabaseSequenceLeads();
    const now = new Date().toISOString();

    let enrolledCount = 0;
    let skippedCount = 0;

    for (const leadId of leadIds) {
      const alreadyActive = allSequenceLeads.some(
        sl => sl.sequence_id === id && sl.lead_id === leadId && sl.status === 'Active'
      );
      if (alreadyActive) {
        skippedCount++;
        continue;
      }

      allSequenceLeads.push({
        id: crypto.randomUUID(),
        sequence_id: id,
        lead_id: leadId,
        status: 'Active',
        current_step: 1,
        created_at: now,
        updated_at: now,
        last_sent_at: null,
        next_send_at: now
      });
      enrolledCount++;
    }

    await saveSupabaseSequenceLeads(allSequenceLeads);

    return res.json({
      success: true,
      message: `Enrolled ${enrolledCount} leads (${skippedCount} already enrolled).`,
      enrolledCount,
      skippedCount,
      totalSelected: leadIds.length
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/enroll Error]', err);
    return res.status(500).json({ error: 'Failed to enroll leads' });
  }
});

// POST /api/admin/lead-sequences/:id/pause - Pause sequence
router.post('/admin/lead-sequences/:id/pause', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const sequences = await getSupabaseCrmSequences();
    const seq = sequences.find(s => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    seq.status = 'Paused';
    seq.updated_at = new Date().toISOString();
    await saveSupabaseCrmSequences(sequences);

    return res.json({ success: true, message: 'Sequence paused.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to pause sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/resume - Resume sequence
router.post('/admin/lead-sequences/:id/resume', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const sequences = await getSupabaseCrmSequences();
    const seq = sequences.find(s => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    seq.status = 'Active';
    seq.updated_at = new Date().toISOString();
    await saveSupabaseCrmSequences(sequences);

    return res.json({ success: true, message: 'Sequence resumed.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resume sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/stop-lead - Stop specific lead in sequence
router.post('/admin/lead-sequences/:id/stop-lead', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId, reason } = req.body || {};
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const sl = allSequenceLeads.find(l => l.sequence_id === id && l.lead_id === leadId);
    if (!sl) {
      return res.status(404).json({ error: 'Lead sequence enrollment not found' });
    }

    sl.status = reason === 'Replied' ? 'Replied' : 'Stopped';
    sl.updated_at = new Date().toISOString();
    await saveSupabaseSequenceLeads(allSequenceLeads);

    return res.json({ success: true, message: 'Lead sequence status updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to stop lead in sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/test - Send sequence test email
router.post('/api/admin/lead-sequences/:id/test', requireAuth, requirePermission(Permission.MANAGE_CRM), emailTestLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { stepNumber, testEmail, sampleLeadId } = req.body || {};
    if (!testEmail || typeof testEmail !== 'string' || !testEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid test email address is required' });
    }

    const allSteps = await getSupabaseSequenceSteps();
    const step = allSteps.find(s => s.sequence_id === id && Number(s.step_number) === Number(stepNumber));
    if (!step) {
      return res.status(404).json({ error: `Sequence step ${stepNumber} not found` });
    }

    const allLeads = await getSupabaseCrmLeads();
    const sampleLead = (sampleLeadId && allLeads.find(l => l.id === sampleLeadId)) || allLeads[0] || {
      company_name: 'Acme Enterprises',
      contact_person: 'Executive Leader',
      email: testEmail,
      industry: 'Business Intelligence & Operations'
    };

    let personalizedSubject = `[TEST STEP ${stepNumber}] ${step.subject}`
      .replace(/{{company_name}}/gi, sampleLead.company_name || 'Acme Enterprises')
      .replace(/{{contact_person}}/gi, sampleLead.contact_person || 'Leader');

    let personalizedHtml = (step.html_content || '')
      .replace(/{{company_name}}/gi, sampleLead.company_name || 'Acme Enterprises')
      .replace(/{{contact_person}}/gi, sampleLead.contact_person || 'Leader')
      .replace(/{{industry}}/gi, sampleLead.industry || 'Business Intelligence');

    const unsubToken = generateUnsubscribeToken(testEmail);
    const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    const unsubUrl = `${reqProtocol}://${reqHost}/api/newsletter/unsubscribe?token=${unsubToken}`;

    const sendRes = await campaignEmailService.sendSingleRecipient({
      toEmail: testEmail,
      subject: personalizedSubject,
      previewText: `Test delivery for Step ${stepNumber}`,
      contentHtml: personalizedHtml,
      unsubscribeUrl: unsubUrl
    });

    if (!sendRes.success) {
      return res.status(500).json({ error: sendRes.error || 'Failed to dispatch test email' });
    }

    return res.json({
      success: true,
      message: `Test email for Step ${stepNumber} successfully sent to ${testEmail}`
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/test Error]', err);
    return res.status(500).json({ error: 'Failed to send sequence test email' });
  }
});

// POST /api/admin/lead-sequences/process - Trigger queue evaluation
router.post('/api/admin/lead-sequences/process', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const sequences = await getSupabaseCrmSequences();
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const activeLeads = allSequenceLeads.filter(l => l.status === 'Active');

    return res.json({
      success: true,
      stats: {
        totalSequences: sequences.length,
        activeEnrollments: activeLeads.length,
        processed: 0,
        sent: 0
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process sequences' });
  }
});

// GET /api/admin/leads/:id/sequences - Get sequences for a specific lead
router.get('/admin/leads/:id/sequences', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const sequences = await getSupabaseCrmSequences();
    const leadEnrollments = allSequenceLeads.filter(sl => sl.lead_id === id);

    const result = leadEnrollments.map(sl => {
      const seq = sequences.find(s => s.id === sl.sequence_id);
      return {
        ...sl,
        sequence_name: seq?.name || 'Unknown Sequence',
        sequence_status: seq?.status || 'Unknown'
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(503).json({ error: 'Failed to load lead sequences' });
  }
});

export default router;
