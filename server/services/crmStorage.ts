import crypto from 'crypto';
import { serverSupabase, readCmsData, writeCmsData } from './supabase';
import { isValidUuid } from '../config/constants';

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

    if (row && Array.isArray(row.value?.sequences)) {
      return row.value.sequences;
    }
    return [];
  } catch (err) {
    console.error('[Supabase Sequences Read Exception]', err);
    return [];
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
  await serverSupabase.from('settings').upsert({
    key: 'crm_lead_sequences',
    value: { sequences, updated_at: now },
    updated_at: now
  });
}

// Helper to query sequence steps from public.settings
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

// Helper to save sequence steps to public.settings
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

// Helper to query sequence lead enrollments from public.settings
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

// Helper to save sequence lead enrollments to public.settings
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

// Helper to query sequence deliveries from public.settings
export async function getSupabaseSequenceDeliveries(): Promise<any[]> {
  if (!serverSupabase) {
    const data = readCmsData();
    return data.sequence_deliveries || [];
  }
  try {
    const { data: row } = await serverSupabase
      .from('settings')
      .select('value')
      .eq('key', 'crm_sequence_deliveries')
      .maybeSingle();

    if (row && Array.isArray(row.value?.deliveries)) {
      return row.value.deliveries;
    }
    return [];
  } catch (err) {
    console.error('[Supabase Sequence Deliveries Read Exception]', err);
    return [];
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
  await serverSupabase.from('settings').upsert({
    key: 'crm_sequence_deliveries',
    value: { deliveries, updated_at: now },
    updated_at: now
  });
}
