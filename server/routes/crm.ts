import express from 'express';
import crypto from 'crypto';
import { requireAuth, requirePermission } from '../auth/rbac';
import { Permission, UserRole } from '../auth/types';
import { isValidId, isValidUuid } from '../config/constants';
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '../security/tokens';
import { emailSendLimiter, emailTestLimiter, unsubscribeLimiter } from '../middleware/rateLimiters';
import { serverSupabase, readCmsData, writeCmsData } from '../services/supabase';
import { campaignEmailService } from '../../src/services/campaignEmailService';
import { escapeHtml } from '../../src/lib/htmlSanitizer';
import { executeSequenceProcessingCycle } from '../services/sequenceProcessor';
import {
  getSupabaseCrmLeads,
  saveSupabaseCrmLeads,
  getSupabaseCrmSequences,
  saveSupabaseCrmSequences,
  getSupabaseSequenceSteps,
  saveSupabaseSequenceSteps,
  getSupabaseSequenceLeads,
  saveSupabaseSequenceLeads,
  getSupabaseSequenceDeliveries,
  saveSupabaseSequenceDeliveries
} from '../services/crmStorage';

export {
  getSupabaseCrmLeads,
  saveSupabaseCrmLeads,
  getSupabaseCrmSequences,
  saveSupabaseCrmSequences,
  getSupabaseSequenceSteps,
  saveSupabaseSequenceSteps,
  getSupabaseSequenceLeads,
  saveSupabaseSequenceLeads,
  getSupabaseSequenceDeliveries,
  saveSupabaseSequenceDeliveries
};

const router = express.Router();

// Helper to query Supabase Lead Campaigns with relational source of truth
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

    if (tblErr) {
      console.error('[CRM Campaigns Read Diagnostic]', {
        operation: 'GET_CAMPAIGNS',
        errorCode: tblErr.code || 'DB_ERROR',
        errorMessage: tblErr.message
      });

      // Legacy fallback ONLY if relational table does not exist in schema
      if (tblErr.code === '42P01' || tblErr.code === 'PGRST205' || String(tblErr.message || '').includes('does not exist')) {
        const { data: row, error: rowErr } = await serverSupabase
          .from('settings')
          .select('value')
          .eq('key', 'crm_lead_campaigns')
          .maybeSingle();

        if (!rowErr && row && Array.isArray(row.value?.campaigns)) {
          return row.value.campaigns;
        }
      }
      throw new Error(`Database query failed for lead campaigns: ${tblErr.message}`);
    }

    // Authoritative relational query succeeded: return result, including empty array []
    return Array.isArray(dbCamps) ? dbCamps : [];
  } catch (err: any) {
    console.error('[CRM Campaigns Read Exception]', {
      operation: 'GET_CAMPAIGNS',
      errorMessage: err?.message || String(err)
    });
    throw err;
  }
}

// Helper to save Supabase Lead Campaigns (Primary: public.lead_campaigns, non-blocking backup: settings)
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

  // Primary authoritative storage: public.lead_campaigns table
  const { error: tblErr } = await serverSupabase.from('lead_campaigns').upsert(normalizedCampaigns);
  if (tblErr) {
    console.error('[Supabase Save CRM Campaigns Error]', {
      operation: 'SAVE_CAMPAIGNS',
      errorCode: tblErr.code,
      errorMessage: tblErr.message
    });
    throw new Error(`Failed to persist lead campaigns to primary database: ${tblErr.message}`);
  }

  // Non-authoritative legacy recovery backup: settings
  try {
    const now = new Date().toISOString();
    await serverSupabase.from('settings').upsert({
      key: 'crm_lead_campaigns',
      value: { campaigns: normalizedCampaigns, updated_at: now },
      updated_at: now
    });
  } catch (backupErr) {
    console.warn('[CRM Campaigns Backup Warning] Settings backup write failed:', backupErr);
  }
}

// Helper to query Supabase Campaign Leads (Recipient Outreach History)
export async function getSupabaseCrmRecipients(): Promise<any[]> {
  if (!serverSupabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase database client is required in production environment.');
    }
    const data = readCmsData();
    return data.campaign_leads || [];
  }

  try {
    const { data, error } = await serverSupabase
      .from('campaign_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CRM Recipients Read Diagnostic]', {
        operation: 'GET_RECIPIENTS',
        errorCode: error.code || 'DB_ERROR',
        errorMessage: error.message
      });

      // Legacy fallback ONLY if the relational table does not exist in schema
      if (error.code === '42P01' || error.code === 'PGRST205' || String(error.message || '').includes('does not exist')) {
        const { data: row } = await serverSupabase
          .from('settings')
          .select('value')
          .eq('key', 'crm_campaign_leads')
          .maybeSingle();

        if (row && Array.isArray(row.value?.recipients)) {
          return row.value.recipients;
        }
      }
      throw new Error(`Database query failed for campaign recipients: ${error.message}`);
    }

    // Authoritative relational query succeeded: return result, including empty array []
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.error('[CRM Recipients Read Exception]', {
      operation: 'GET_RECIPIENTS',
      errorMessage: err?.message || String(err)
    });
    throw err;
  }
}

// ==================== CRM ROUTES ====================

// GET /api/admin/leads - List and filter leads
router.get('/admin/leads', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { status, lead_priority, industry, search, follow_up } = req.query;
    let leads: any[] = [];

    if (serverSupabase) {
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
      if (error) {
        console.error('[GET /api/admin/leads Query Error]', {
          errorCode: error.code,
          errorMessage: error.message
        });
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      leads = data || [];
    } else {
      const data = readCmsData();
      leads = data.leads || [];
    }

    // Apply memory/json filters if retrieved via dev cache
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
      const { data: dbLead, error: leadErr } = await serverSupabase.from('leads').select('*').eq('id', id).single();
      if (leadErr) {
        if (leadErr.code === 'PGRST116' || String(leadErr.message || '').includes('0 rows')) {
          return res.status(404).json({ error: 'Lead not found' });
        }
        console.error('[GET /api/admin/leads/:id DB Error]', leadErr);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      lead = dbLead;

      const { data: hist, error: histErr } = await serverSupabase
        .from('campaign_leads')
        .select('*, lead_campaigns(name, subject, sent_at)')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });

      if (histErr) {
        console.error('[GET /api/admin/leads/:id Outreach Error]', histErr);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      outreachHistory = hist || [];
    } else {
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
    const dbPayload: any = { ...leadRecord, id: leadId };
    const { data, error } = await serverSupabase.from('leads').upsert(dbPayload).select().single();
    if (error) {
      console.error('[POST /api/admin/leads DB Error]', {
        operation: 'UPSERT_LEAD',
        leadId,
        errorCode: error.code,
        errorMessage: error.message
      });
      return res.status(500).json({ error: 'Failed to persist lead to Supabase database' });
    }

    // Non-blocking backup to settings
    try {
      const existingLeads = await getSupabaseCrmLeads().catch(() => []);
      const idx = existingLeads.findIndex((l: any) => l.id === leadId);
      if (idx >= 0) existingLeads[idx] = data;
      else existingLeads.unshift(data);
      await serverSupabase.from('settings').upsert({
        key: 'crm_leads',
        value: { leads: existingLeads, updated_at: now },
        updated_at: now
      });
    } catch (bgErr) {
      // Background backup failure does not fail the primary write
    }

    return res.json({ success: true, lead: data });
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
    const { data, error } = await serverSupabase.from('leads').update(updates).eq('id', id).select().single();
    if (error) {
      console.error('[PATCH /api/admin/leads/:id/status Error]', error);
      return res.status(500).json({ error: 'Failed to update lead in database' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Non-blocking background settings update
    try {
      const leads = await getSupabaseCrmLeads().catch(() => []);
      const idx = leads.findIndex((l: any) => l.id === id);
      if (idx >= 0) {
        leads[idx] = data;
        await serverSupabase.from('settings').upsert({
          key: 'crm_leads',
          value: { leads, updated_at: updates.updated_at },
          updated_at: updates.updated_at
        });
      }
    } catch (bgErr) {
      // Ignored
    }

    return res.json({ success: true, lead: data });
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
    const { error } = await serverSupabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/admin/leads/:id Error]', error);
      return res.status(500).json({ error: 'Failed to delete lead from database' });
    }

    // Non-blocking background settings update
    try {
      const leads = await getSupabaseCrmLeads().catch(() => []);
      const filtered = leads.filter((l: any) => l.id !== id);
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_leads',
        value: { leads: filtered, updated_at: now },
        updated_at: now
      });
    } catch (bgErr) {
      // Ignored
    }

    return res.json({ success: true });
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
    const { error } = await serverSupabase.from('leads').delete().in('id', ids);
    if (error) {
      console.error('[POST /api/admin/leads/batch-delete Error]', error);
      return res.status(500).json({ error: 'Failed to batch delete leads from database' });
    }

    // Non-blocking background settings update
    try {
      const leads = await getSupabaseCrmLeads().catch(() => []);
      const idSet = new Set(ids);
      const filtered = leads.filter((l: any) => !idSet.has(l.id));
      const now = new Date().toISOString();
      await serverSupabase.from('settings').upsert({
        key: 'crm_leads',
        value: { leads: filtered, updated_at: now },
        updated_at: now
      });
    } catch (bgErr) {
      // Ignored
    }

    return res.json({ success: true, count: ids.length });
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
    let campaign: any = null;
    let recipients: any[] = [];

    if (serverSupabase) {
      const { data: dbCamp, error: campErr } = await serverSupabase
        .from('lead_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campErr) {
        if (campErr.code === 'PGRST116' || String(campErr.message || '').includes('0 rows')) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
        console.error('[GET /api/admin/lead-campaigns/:id DB Error]', campErr);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      campaign = dbCamp;

      const { data: dbRecipients, error: recErr } = await serverSupabase
        .from('campaign_leads')
        .select('*, leads(company_name, contact_person, email, industry)')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false });

      if (recErr) {
        console.error('[GET /api/admin/lead-campaigns/:id Recipients Error]', recErr);
        return res.status(503).json({ error: 'Database service unavailable' });
      }
      recipients = dbRecipients || [];
    } else {
      const campaigns = await getSupabaseCrmCampaigns();
      campaign = campaigns.find((c: any) => c.id === id);
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

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
      const unsubUrl = `${reqProtocol}://${reqHost}/api/crm/unsubscribe?token=${unsubToken}`;

      const sendRes = await campaignEmailService.sendLeadSingleRecipient({
        toEmail: lead.email,
        subject: personalizedSubject,
        preheader: campaign.preheader || '',
        contentHtml: personalizedHtml,
        lead: lead,
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

    if (serverSupabase && recipientsLog.length > 0) {
      const { error: logErr } = await serverSupabase.from('campaign_leads').insert(recipientsLog);
      if (logErr) {
        console.error('[CRM Send Recipients Insert Error]', {
          operation: 'INSERT_CAMPAIGN_LEADS',
          campaignId: id,
          errorCode: logErr.code,
          errorMessage: logErr.message
        });
        throw new Error(`Failed to record outreach recipients in database: ${logErr.message}`);
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

// ==================== LEAD SEQUENCES ROUTES ====================

// GET /api/admin/lead-sequences - List all sequences with comprehensive metrics
router.get('/admin/lead-sequences', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const sequences = await getSupabaseCrmSequences();
    const allSteps = await getSupabaseSequenceSteps();
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const allDeliveries = await getSupabaseSequenceDeliveries();

    const result = sequences.map(seq => {
      const steps = allSteps
        .filter(s => s.sequence_id === seq.id)
        .sort((a, b) => (Number(a.step_number) || 0) - (Number(b.step_number) || 0));
      const leads = allSequenceLeads.filter(l => l.sequence_id === seq.id);
      const deliveries = allDeliveries.filter(d => d.sequence_id === seq.id);

      const activeLeads = leads.filter(l => l.status === 'Active');
      const completedLeads = leads.filter(l => l.status === 'Completed');
      const stoppedLeads = leads.filter(l => l.status === 'Stopped' || l.status === 'Replied' || l.status === 'Paused');
      const sentDeliveries = deliveries.filter(d => d.status === 'sent');
      const failedDeliveries = deliveries.filter(d => d.status === 'failed');

      // Find earliest scheduled next send among active leads
      let nextScheduledSend: string | null = null;
      for (const al of activeLeads) {
        if (al.next_send_at) {
          if (!nextScheduledSend || new Date(al.next_send_at).getTime() < new Date(nextScheduledSend).getTime()) {
            nextScheduledSend = al.next_send_at;
          }
        }
      }

      return {
        ...seq,
        step_count: steps.length,
        lead_count: leads.length,
        total_steps: steps.length,
        total_leads: leads.length,
        active_leads: activeLeads.length,
        completed_leads: completedLeads.length,
        stopped_leads: stoppedLeads.length,
        emails_sent: sentDeliveries.length,
        emails_failed: failedDeliveries.length,
        next_scheduled_send: nextScheduledSend,
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

// GET /api/admin/lead-sequences/:id - Single sequence with steps, hydrated enrolled leads & delivery history
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
    const allDeliveries = await getSupabaseSequenceDeliveries();
    const allCrmLeads = await getSupabaseCrmLeads();

    const crmLeadMap = new Map(allCrmLeads.map(l => [l.id, l]));

    const steps = allSteps
      .filter(s => s.sequence_id === id)
      .sort((a, b) => (Number(a.step_number) || 0) - (Number(b.step_number) || 0));

    const rawLeads = allSequenceLeads.filter(l => l.sequence_id === id);
    const seqDeliveries = allDeliveries.filter(d => d.sequence_id === id);

    // Hydrate enrolled leads with relational CRM lead data and delivery history
    const hydratedLeads = rawLeads.map(sl => {
      const crmLead = crmLeadMap.get(sl.lead_id) || null;
      const leadDeliveries = seqDeliveries.filter(d => d.sequence_lead_id === sl.id || d.lead_id === sl.lead_id);
      return {
        ...sl,
        lead: crmLead,
        deliveries: leadDeliveries
      };
    });

    const activeLeads = hydratedLeads.filter(l => l.status === 'Active');
    const completedLeads = hydratedLeads.filter(l => l.status === 'Completed');
    const stoppedLeads = hydratedLeads.filter(l => l.status === 'Stopped' || l.status === 'Replied' || l.status === 'Paused');
    const sentDeliveries = seqDeliveries.filter(d => d.status === 'sent');
    const failedDeliveries = seqDeliveries.filter(d => d.status === 'failed');

    let nextScheduledSend: string | null = null;
    for (const al of activeLeads) {
      if (al.next_send_at) {
        if (!nextScheduledSend || new Date(al.next_send_at).getTime() < new Date(nextScheduledSend).getTime()) {
          nextScheduledSend = al.next_send_at;
        }
      }
    }

    return res.json({
      ...seq,
      step_count: steps.length,
      lead_count: hydratedLeads.length,
      total_steps: steps.length,
      total_leads: hydratedLeads.length,
      active_leads: activeLeads.length,
      completed_leads: completedLeads.length,
      stopped_leads: stoppedLeads.length,
      emails_sent: sentDeliveries.length,
      emails_failed: failedDeliveries.length,
      next_scheduled_send: nextScheduledSend,
      steps,
      leads: hydratedLeads,
      deliveries: seqDeliveries
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
        preheader: s.preheader || '',
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
      preheader: s.preheader || '',
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
router.post(['/admin/lead-sequences/:id/enroll', '/api/admin/lead-sequences/:id/enroll'], requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { leadIds } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs are required for enrollment' });
    }

    const sequences = await getSupabaseCrmSequences();
    const seq = sequences.find(s => s.id === id);
    if (!seq) {
      return res.status(404).json({ error: 'Sequence not found' });
    }

    const allCrmLeads = await getSupabaseCrmLeads();
    const validLeadMap = new Map(allCrmLeads.map(l => [l.id, l]));

    const allSequenceLeads = await getSupabaseSequenceLeads();
    const now = new Date().toISOString();

    let enrolledCount = 0;
    let alreadyEnrolledCount = 0;
    let invalidCount = 0;
    let validCount = 0;

    for (const rawId of leadIds) {
      const leadId = String(rawId).trim();
      if (!validLeadMap.has(leadId)) {
        invalidCount++;
        continue;
      }

      validCount++;

      const existingIndex = allSequenceLeads.findIndex(
        sl => sl.sequence_id === id && sl.lead_id === leadId
      );

      if (existingIndex !== -1) {
        const existing = allSequenceLeads[existingIndex];
        if (existing.status === 'Active') {
          alreadyEnrolledCount++;
          continue;
        }
        // Reactivate enrollment
        allSequenceLeads[existingIndex] = {
          ...existing,
          status: 'Active',
          current_step: 1,
          last_sent_at: null,
          next_send_at: now,
          stop_reason: undefined,
          stopped_at: undefined,
          completed_at: undefined,
          updated_at: now
        };
        enrolledCount++;
      } else {
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
    }

    // Persist enrolled leads
    await saveSupabaseSequenceLeads(allSequenceLeads);

    // Update sequence total leads statistics
    seq.total_leads = allSequenceLeads.filter(sl => sl.sequence_id === id && sl.status !== 'Stopped').length;
    seq.updated_at = now;
    await saveSupabaseCrmSequences(sequences);

    return res.json({
      success: true,
      message: `Enrolled ${enrolledCount} of ${leadIds.length} requested lead(s). (${alreadyEnrolledCount} already active, ${invalidCount} invalid)`,
      requested: leadIds.length,
      valid: validCount,
      enrolled: enrolledCount,
      already_enrolled: alreadyEnrolledCount,
      invalid: invalidCount,
      enrolledCount,
      skippedCount: alreadyEnrolledCount + invalidCount,
      totalSelected: leadIds.length
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/:id/enroll Error]', err);
    return res.status(500).json({ error: err?.message || 'Failed to enroll leads' });
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

// POST /api/admin/lead-sequences/:id/pause-lead - Pause specific lead in sequence
router.post('/admin/lead-sequences/:id/pause-lead', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId } = req.body || {};
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const sl = allSequenceLeads.find(l => l.sequence_id === id && l.lead_id === leadId);
    if (!sl) {
      return res.status(404).json({ error: 'Lead sequence enrollment not found' });
    }

    sl.status = 'Paused';
    sl.updated_at = new Date().toISOString();
    await saveSupabaseSequenceLeads(allSequenceLeads);

    return res.json({ success: true, message: 'Lead sequence status paused.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to pause lead in sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/resume-lead - Resume specific lead in sequence
router.post('/admin/lead-sequences/:id/resume-lead', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const { leadId } = req.body || {};
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const sl = allSequenceLeads.find(l => l.sequence_id === id && l.lead_id === leadId);
    if (!sl) {
      return res.status(404).json({ error: 'Lead sequence enrollment not found' });
    }

    const now = new Date().toISOString();
    sl.status = 'Active';
    sl.stop_reason = undefined;
    sl.stopped_at = undefined;
    if (!sl.next_send_at || new Date(sl.next_send_at).getTime() < Date.now()) {
      sl.next_send_at = now;
    }
    sl.updated_at = now;
    await saveSupabaseSequenceLeads(allSequenceLeads);

    return res.json({ success: true, message: 'Lead sequence status resumed to Active.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resume lead in sequence' });
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

    const now = new Date().toISOString();
    sl.status = reason === 'Replied' ? 'Replied' : 'Stopped';
    sl.stop_reason = reason || 'Manually stopped by admin';
    sl.stopped_at = now;
    sl.updated_at = now;
    await saveSupabaseSequenceLeads(allSequenceLeads);

    return res.json({ success: true, message: 'Lead sequence status updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to stop lead in sequence' });
  }
});

// POST /api/admin/lead-sequences/:id/test - Send sequence test email
router.post(['/admin/lead-sequences/:id/test', '/api/admin/lead-sequences/:id/test'], requireAuth, requirePermission(Permission.MANAGE_CRM), emailTestLimiter, async (req, res) => {
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

    const unsubToken = generateUnsubscribeToken(testEmail);
    const reqProtocol = req.headers['x-forwarded-proto'] || req.protocol;
    const reqHost = req.headers['x-forwarded-host'] || req.headers.host;
    const unsubUrl = `${reqProtocol}://${reqHost}/api/crm/unsubscribe?token=${unsubToken}`;

    const sendRes = await campaignEmailService.sendLeadTestEmail({
      testEmail: testEmail,
      subject: step.subject,
      preheader: step.preheader || `Test delivery for Step ${stepNumber}`,
      contentHtml: step.html_content || '',
      lead: sampleLead,
      unsubscribeUrl: unsubUrl
    });

    if (!sendRes.success) {
      return res.status(500).json({ error: sendRes.message || 'Failed to dispatch test email' });
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

// POST /api/admin/lead-sequences/process - Trigger sequence processing cycle
router.post(['/admin/lead-sequences/process', '/api/admin/lead-sequences/process'], requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { targetEmail, targetLeadId, forceProductionSend, batchLimit } = req.body || {};
    const reqProtocol = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
    const reqHost = (req.headers['x-forwarded-host'] || req.headers.host || 'probitian.ai.studio').toString();

    const result = await executeSequenceProcessingCycle({
      reqProtocol,
      reqHost,
      batchLimit: typeof batchLimit === 'number' ? batchLimit : 25,
      targetEmail,
      targetLeadId,
      forceProductionSend: Boolean(forceProductionSend)
    });

    return res.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      details: result.details
    });
  } catch (err: any) {
    console.error('[POST /api/admin/lead-sequences/process Error]', err);
    return res.status(500).json({ error: 'Failed to process lead sequences: ' + (err?.message || String(err)) });
  }
});

// POST /api/cron/process-sequences - Scheduled webhook endpoint for external schedulers
router.post(['/cron/process-sequences', '/api/cron/process-sequences'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const cronKey = req.headers['x-cron-key'] || req.query.key;
    const expectedSecret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check authorization: Bearer token, x-cron-key, or session
    const isAuthorized =
      (expectedSecret && (authHeader === `Bearer ${expectedSecret}` || cronKey === expectedSecret)) ||
      Boolean((req as any).session && (req as any).session.user);

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized: Invalid cron key or session.' });
    }

    const reqProtocol = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
    const reqHost = (req.headers['x-forwarded-host'] || req.headers.host || 'probitian.ai.studio').toString();

    const result = await executeSequenceProcessingCycle({
      reqProtocol,
      reqHost,
      batchLimit: 30
    });

    return res.json({
      success: result.success,
      message: result.message,
      stats: result.stats,
      details: result.details
    });
  } catch (err: any) {
    console.error('[POST /api/cron/process-sequences Error]', err);
    return res.status(500).json({ error: 'Cron sequence processing error: ' + (err?.message || String(err)) });
  }
});

// GET /api/admin/leads/:id/sequences - Get sequences for a specific lead
router.get('/admin/leads/:id/sequences', requireAuth, requirePermission(Permission.MANAGE_CRM), async (req, res) => {
  try {
    const { id } = req.params;
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const sequences = await getSupabaseCrmSequences();
    const allDeliveries = await getSupabaseSequenceDeliveries();

    const leadEnrollments = allSequenceLeads.filter(sl => sl.lead_id === id);

    const result = leadEnrollments.map(sl => {
      const seq = sequences.find(s => s.id === sl.sequence_id);
      const deliveries = allDeliveries.filter(d => d.sequence_lead_id === sl.id || d.lead_id === id);
      return {
        ...sl,
        sequence_name: seq?.name || 'Unknown Sequence',
        sequence_status: seq?.status || 'Unknown',
        deliveries
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(503).json({ error: 'Failed to load lead sequences' });
  }
});

// GET /api/crm/unsubscribe (Public with rate limiter: Lead Outreach Unsubscribe)
router.get('/crm/unsubscribe', unsubscribeLimiter, async (req, res) => {
  const token = (req.query.token || '').toString().trim();
  let verifiedEmail: string | null = null;
  if (token) {
    verifiedEmail = verifyUnsubscribeToken(token);
  }

  if (!verifiedEmail) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Unsubscribe Link - ProBitian</title>
          <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);}</style>
        </head>
        <body>
          <div class="card">
            <h2 style="color:#ef4444;margin-top:0;">Invalid or Expired Link</h2>
            <p style="color:#64748b;">The unsubscribe link you followed is invalid or has expired.</p>
            <p style="margin-top:20px;"><a href="/" style="color:#7c3aed;text-decoration:none;font-weight:600;">Return to Home</a></p>
          </div>
        </body>
      </html>
    `);
  }

  // Update lead status in Supabase relational table to 'Do Not Contact'
  let unsubscribedLeadId: string | null = null;
  if (serverSupabase) {
    try {
      const { data: updatedLeads } = await serverSupabase
        .from('leads')
        .update({ status: 'Do Not Contact', updated_at: new Date().toISOString() })
        .ilike('email', verifiedEmail)
        .select('id');
      if (Array.isArray(updatedLeads) && updatedLeads.length > 0) {
        unsubscribedLeadId = updatedLeads[0].id;
      }
    } catch (dbErr) {
      console.error('[CRM Unsubscribe Error]', dbErr);
    }
  }

  // Also immediately stop any active sequence enrollments for this lead
  try {
    const allSeqLeads = await getSupabaseSequenceLeads();
    let seqLeadsChanged = false;
    const nowIso = new Date().toISOString();

    for (const sl of allSeqLeads) {
      if (sl.status === 'Active' && unsubscribedLeadId && sl.lead_id === unsubscribedLeadId) {
        sl.status = 'Stopped';
        sl.stop_reason = 'Unsubscribed by recipient';
        sl.stopped_at = nowIso;
        sl.updated_at = nowIso;
        seqLeadsChanged = true;
      }
    }

    if (seqLeadsChanged) {
      await saveSupabaseSequenceLeads(allSeqLeads);
    }
  } catch (seqStopErr) {
    console.error('[CRM Unsubscribe Sequence Stop Error]', seqStopErr);
  }

  // Also update local / fallback data if present
  try {
    const data = readCmsData();
    if (Array.isArray(data.leads)) {
      for (const lead of data.leads) {
        if (lead.email?.toLowerCase() === verifiedEmail.toLowerCase()) {
          lead.status = 'Do Not Contact';
          lead.updated_at = new Date().toISOString();
        }
      }
      writeCmsData(data);
    }
  } catch (localErr) {
    // ignore
  }

  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed - ProBitian Outreach</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;text-align:center;padding:50px 20px;background:#f8fafc;color:#1e293b;}.card{max-width:480px;margin:auto;background:white;padding:32px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);}a{color:#7c3aed;text-decoration:none;font-weight:600;}</style>
      </head>
      <body>
        <div class="card">
          <h2 style="color:#10b981;margin-top:0;">Unsubscribed Successfully</h2>
          <p style="color:#475569;">You have been unsubscribed from B2B outreach communications from ProBitian.</p>
          <p style="color:#64748b;font-size:14px;">Email: <strong>${escapeHtml(verifiedEmail)}</strong> has been updated to Do Not Contact.</p>
          <p style="margin-top:24px;"><a href="/">Return to ProBitian Home</a></p>
        </div>
      </body>
    </html>
  `);
});

export default router;
