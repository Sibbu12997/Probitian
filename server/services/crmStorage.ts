import crypto from 'crypto';
import { serverSupabase, readCmsData, writeCmsData } from './supabase';
import { isValidUuid } from '../config/constants';

export interface CrmLead {
  id: string;
  company_name: string;
  industry?: string;
  location?: string;
  contact_person?: string;
  email: string;
  phone?: string;
  linkedin?: string;
  powerbi_use_case?: string;
  lead_priority?: string;
  status: string;
  follow_up_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SequenceLead {
  id: string;
  sequence_id: string;
  lead_id: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Replied' | 'Stopped';
  current_step: number;
  last_sent_at?: string | null;
  next_send_at?: string | null;
  stop_reason?: string;
  stopped_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  step_name?: string;
  subject: string;
  preheader?: string;
  html_content: string;
  delay_days: number;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SequenceDelivery {
  id: string;
  sequence_id: string;
  sequence_lead_id: string;
  lead_id: string;
  step_id?: string;
  step_number: number;
  step_name?: string;
  email?: string;
  recipient_email?: string;
  subject: string;
  status: string;
  provider_message_id?: string | null;
  message_id?: string | null;
  error_message?: string | null;
  sent_at: string;
  created_at: string;
}

// Helper to query Supabase CRM Leads with relational source of truth (public.leads)
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

    if (tblErr) {
      console.error('[CRM Leads Read Diagnostic]', {
        operation: 'GET_LEADS',
        errorCode: tblErr.code || 'DB_ERROR',
        errorMessage: tblErr.message
      });

      // Legacy fallback ONLY if the relational table does not exist in schema (unmigrated)
      if (tblErr.code === '42P01' || tblErr.code === 'PGRST205' || String(tblErr.message || '').includes('does not exist')) {
        const { data: row, error: rowErr } = await serverSupabase
          .from('settings')
          .select('value')
          .eq('key', 'crm_leads')
          .maybeSingle();

        if (!rowErr && row && Array.isArray(row.value?.leads)) {
          return row.value.leads;
        }
      }
      throw new Error(`Database query failed for leads: ${tblErr.message}`);
    }

    // Authoritative relational query succeeded: return result, including empty array []
    return Array.isArray(dbLeads) ? dbLeads : [];
  } catch (err: any) {
    console.error('[CRM Leads Read Exception]', {
      operation: 'GET_LEADS',
      errorMessage: err?.message || String(err)
    });
    throw err;
  }
}

// Helper to save Supabase CRM Leads (Primary: public.leads, non-blocking backup: settings)
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

  // Primary authoritative storage: public.leads table
  const { error: tblErr } = await serverSupabase.from('leads').upsert(normalizedLeads);
  if (tblErr) {
    console.error('[Supabase Save CRM Leads Error]', {
      operation: 'SAVE_LEADS',
      errorCode: tblErr.code,
      errorMessage: tblErr.message
    });
    throw new Error(`Failed to persist leads to primary database: ${tblErr.message}`);
  }

  // Non-authoritative legacy recovery backup: settings
  try {
    const now = new Date().toISOString();
    await serverSupabase.from('settings').upsert({
      key: 'crm_leads',
      value: { leads: normalizedLeads, updated_at: now },
      updated_at: now
    });
  } catch (backupErr) {
    console.warn('[CRM Leads Backup Warning] Settings backup write failed:', backupErr);
  }
}

// Helper to query CRM Lead Sequences from public.settings
export async function getSupabaseCrmSequences(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.lead_sequences || [];
  }
  try {
    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_lead_sequences')
      .maybeSingle();

    if (rowErr) {
      console.error('[Supabase Sequences Read Error]', { code: rowErr.code, message: rowErr.message });
      throw new Error(`Failed to query crm_lead_sequences: ${rowErr.message}`);
    }

    if (row && Array.isArray(row.value?.sequences)) {
      return row.value.sequences;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequences Read Exception]', err?.message || err);
    throw err;
  }
}

// Helper to save CRM Lead Sequences to public.settings
export async function saveSupabaseCrmSequences(sequences: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.lead_sequences = sequences;
    writeCmsData(data);
    return;
  }
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_lead_sequences',
    value: { sequences, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Sequences Save Error]', { code: error.code, message: error.message });
    throw new Error(`Failed to save crm_lead_sequences to Supabase settings: ${error.message}`);
  }
}

// Helper to query sequence steps from public.settings
export async function getSupabaseSequenceSteps(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_steps || [];
  }
  try {
    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_steps')
      .maybeSingle();

    if (rowErr) {
      console.error('[Supabase Sequence Steps Read Error]', { code: rowErr.code, message: rowErr.message });
      throw new Error(`Failed to query crm_sequence_steps: ${rowErr.message}`);
    }

    if (row && Array.isArray(row.value?.steps)) {
      return row.value.steps;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Steps Read Exception]', err?.message || err);
    throw err;
  }
}

// Helper to save sequence steps to public.settings
export async function saveSupabaseSequenceSteps(steps: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.sequence_steps = steps;
    writeCmsData(data);
    return;
  }
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_steps',
    value: { steps, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Sequence Steps Save Error]', { code: error.code, message: error.message });
    throw new Error(`Failed to save crm_sequence_steps to Supabase settings: ${error.message}`);
  }
}

// Helper to query sequence lead enrollments from public.settings
export async function getSupabaseSequenceLeads(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_leads || [];
  }
  try {
    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_leads')
      .maybeSingle();

    if (rowErr) {
      console.error('[Supabase Sequence Leads Read Error]', { code: rowErr.code, message: rowErr.message });
      throw new Error(`Failed to query crm_sequence_leads: ${rowErr.message}`);
    }

    if (row && Array.isArray(row.value?.sequence_leads)) {
      return row.value.sequence_leads;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Leads Read Exception]', err?.message || err);
    throw err;
  }
}

// Helper to save sequence lead enrollments to public.settings
export async function saveSupabaseSequenceLeads(sequenceLeads: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.sequence_leads = sequenceLeads;
    writeCmsData(data);
    return;
  }
  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_leads',
    value: { sequence_leads: sequenceLeads, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Sequence Leads Save Error]', { code: error.code, message: error.message });
    throw new Error(`Failed to save crm_sequence_leads to Supabase settings: ${error.message}`);
  }
}

// Helper to query sequence deliveries from public.settings
export async function getSupabaseSequenceDeliveries(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_deliveries || [];
  }
  try {
    const { data: row, error: rowErr } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_deliveries')
      .maybeSingle();

    if (rowErr) {
      console.error('[Supabase Sequence Deliveries Read Error]', { code: rowErr.code, message: rowErr.message });
      throw new Error(`Failed to query crm_sequence_deliveries: ${rowErr.message}`);
    }

    if (row && Array.isArray(row.value?.deliveries)) {
      return row.value.deliveries;
    }
    return [];
  } catch (err: any) {
    console.error('[Supabase Sequence Deliveries Read Exception]', err?.message || err);
    throw err;
  }
}

// Helper to save sequence deliveries to public.settings
export async function saveSupabaseSequenceDeliveries(deliveries: any[]): Promise<void> {
  const now = new Date().toISOString();
  if (!serverSupabase) {
    const data = readCmsData();
    data.sequence_deliveries = deliveries;
    writeCmsData(data);
    return;
  }

  // Ensure deliveries are deduplicated by ID to prevent duplicates
  const seenIds = new Set<string>();
  const uniqueDeliveries = deliveries.filter(d => {
    if (!d || !d.id) return true;
    if (seenIds.has(d.id)) return false;
    seenIds.add(d.id);
    return true;
  });

  const { error } = await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_deliveries',
    value: { deliveries: uniqueDeliveries, updated_at: now },
    updated_at: now
  });
  if (error) {
    console.error('[Supabase Sequence Deliveries Save Error]', { code: error.code, message: error.message });
    throw new Error(`Failed to save crm_sequence_deliveries to Supabase settings: ${error.message}`);
  }
}
