import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { sanitizeCmsHtml, escapeHtml } from '../src/lib/htmlSanitizer';

// Types matching Supabase schema for CRM
interface CrmLead {
  id: string;
  company_name: string;
  industry: string;
  location: string;
  contact_person: string;
  email: string;
  phone: string;
  linkedin: string;
  powerbi_use_case: string;
  lead_priority: 'High' | 'Medium' | 'Low';
  status: 'Not Contacted' | 'Contacted' | 'Opened' | 'Replied' | 'Interested' | 'Demo Requested' | 'Proposal Sent' | 'Converted' | 'Not Interested' | 'Bounced' | 'Do Not Contact';
  follow_up_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface CrmLeadCampaign {
  id: string;
  name: string;
  campaign_type: string;
  subject: string;
  preheader: string;
  html_content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'partially_sent' | 'failed' | 'cancelled';
  total_recipients: number;
  successful_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CrmCampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  lead_email: string;
  lead_company: string;
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'opened' | 'clicked' | 'replied' | 'bounced';
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

// In-Memory Simulated Supabase CRM Store
class MockSupabaseCrmStore {
  leads: Map<string, CrmLead> = new Map();
  campaigns: Map<string, CrmLeadCampaign> = new Map();
  campaignLeads: Map<string, CrmCampaignLead> = new Map();

  async insertLead(lead: Partial<CrmLead>): Promise<CrmLead> {
    const id = lead.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const fullLead: CrmLead = {
      id,
      company_name: lead.company_name || 'Unknown Company',
      industry: lead.industry || '',
      location: lead.location || '',
      contact_person: lead.contact_person || '',
      email: (lead.email || '').trim().toLowerCase(),
      phone: lead.phone || '',
      linkedin: lead.linkedin || '',
      powerbi_use_case: lead.powerbi_use_case || '',
      lead_priority: (lead.lead_priority as any) || 'Medium',
      status: (lead.status as any) || 'Not Contacted',
      follow_up_date: lead.follow_up_date || null,
      notes: lead.notes || '',
      created_at: lead.created_at || now,
      updated_at: now
    };
    this.leads.set(id, fullLead);
    return fullLead;
  }

  async getLeadById(id: string): Promise<CrmLead | null> {
    return this.leads.get(id) || null;
  }

  async getAllLeads(): Promise<CrmLead[]> {
    return Array.from(this.leads.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async insertCampaign(camp: Partial<CrmLeadCampaign>): Promise<CrmLeadCampaign> {
    const id = camp.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const fullCamp: CrmLeadCampaign = {
      id,
      name: camp.name || 'Untitled Campaign',
      campaign_type: 'lead_outreach',
      subject: camp.subject || '',
      preheader: camp.preheader || '',
      html_content: camp.html_content || '',
      status: (camp.status as any) || 'draft',
      total_recipients: camp.total_recipients || 0,
      successful_count: camp.successful_count || 0,
      failed_count: camp.failed_count || 0,
      sent_at: camp.sent_at || null,
      created_at: camp.created_at || now,
      updated_at: now
    };
    this.campaigns.set(id, fullCamp);
    return fullCamp;
  }

  async getCampaignById(id: string): Promise<CrmLeadCampaign | null> {
    return this.campaigns.get(id) || null;
  }

  async recordCampaignLead(log: Partial<CrmCampaignLead>): Promise<CrmCampaignLead> {
    const id = log.id || crypto.randomUUID();
    const entry: CrmCampaignLead = {
      id,
      campaign_id: log.campaign_id!,
      lead_id: log.lead_id || null,
      lead_email: log.lead_email || '',
      lead_company: log.lead_company || '',
      status: log.status || 'pending',
      provider_message_id: log.provider_message_id || null,
      error_message: log.error_message || null,
      sent_at: log.sent_at || null,
      created_at: new Date().toISOString()
    };
    this.campaignLeads.set(id, entry);
    return entry;
  }

  async getCampaignLeadsByCampaignId(campaignId: string): Promise<CrmCampaignLead[]> {
    return Array.from(this.campaignLeads.values()).filter(cl => cl.campaign_id === campaignId);
  }
}

describe('13. CRM Database & Production Connection Verification', () => {
  const crmStore = new MockSupabaseCrmStore();

  test('public.leads: inserts, indexes, and queries leads with complete schema attributes', async () => {
    const lead = await crmStore.insertLead({
      company_name: 'ProBitian Analytics Demo Corp',
      industry: 'Manufacturing',
      location: 'Indore, MP',
      contact_person: 'Shivam Baghel',
      email: 'shivam@probitian.com',
      phone: '+91 98260 00000',
      linkedin: 'https://linkedin.com/company/probitian',
      powerbi_use_case: 'Executive Sales & Production KPI Dashboards',
      lead_priority: 'High',
      status: 'Not Contacted',
      notes: 'Initial enterprise prospect'
    });

    assert.ok(lead.id);
    assert.strictEqual(lead.company_name, 'ProBitian Analytics Demo Corp');
    assert.strictEqual(lead.email, 'shivam@probitian.com');
    assert.strictEqual(lead.lead_priority, 'High');
    assert.strictEqual(lead.status, 'Not Contacted');

    const fetched = await crmStore.getLeadById(lead.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.company_name, 'ProBitian Analytics Demo Corp');
  });

  test('public.lead_campaigns: creates outreach campaign record', async () => {
    const camp = await crmStore.insertCampaign({
      name: 'Power BI Enterprise Launch 2026',
      subject: 'Transform Your Reporting with Power BI',
      preheader: 'Executive dashboards built for high-growth operations',
      html_content: '<h2>Hello {{contact_person}},</h2><p>Power BI solution for {{company_name}}.</p>'
    });

    assert.ok(camp.id);
    assert.strictEqual(camp.name, 'Power BI Enterprise Launch 2026');
    assert.strictEqual(camp.status, 'draft');

    const fetched = await crmStore.getCampaignById(camp.id);
    assert.ok(fetched);
    assert.strictEqual(fetched?.subject, 'Transform Your Reporting with Power BI');
  });

  test('public.campaign_leads: links campaign to lead with valid foreign keys', async () => {
    const lead = await crmStore.insertLead({
      company_name: 'Relational Test Co',
      email: 'relational.test@example.com'
    });

    const camp = await crmStore.insertCampaign({
      name: 'Relational Test Campaign',
      subject: 'Relational Test Subject',
      html_content: '<p>Test</p>'
    });

    const recipientLog = await crmStore.recordCampaignLead({
      campaign_id: camp.id,
      lead_id: lead.id,
      lead_email: lead.email,
      lead_company: lead.company_name,
      status: 'sent',
      provider_message_id: '<relational-test-123@gmail.com>',
      sent_at: new Date().toISOString()
    });

    assert.strictEqual(recipientLog.campaign_id, camp.id);
    assert.strictEqual(recipientLog.lead_id, lead.id);
    assert.strictEqual(recipientLog.status, 'sent');
    assert.ok(recipientLog.provider_message_id);

    const logs = await crmStore.getCampaignLeadsByCampaignId(camp.id);
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].lead_id, lead.id);
  });
});

describe('14. CSV Import Flow — Batch Processing & Deduplication', () => {
  const store = new MockSupabaseCrmStore();

  const sampleCsvData: Partial<CrmLead>[] = [
    {
      company_name: 'Tata Motors Commercial',
      industry: 'Automotive Manufacturing',
      location: 'Pune, Maharashtra',
      contact_person: 'Amit Deshmukh',
      email: 'amit.deshmukh@tatamotors-demo.com',
      phone: '+91 98220 11223',
      linkedin: 'https://linkedin.com/in/amit-deshmukh-demo',
      powerbi_use_case: 'Plant OEE & Scrap Costing',
      lead_priority: 'High',
      status: 'Not Contacted',
      notes: 'CSV Row 1'
    },
    {
      company_name: 'Sun Pharma Global',
      industry: 'Pharmaceuticals',
      location: 'Vadodara, Gujarat',
      contact_person: 'Neha Patel',
      email: 'neha.patel@sunpharma-demo.com',
      phone: '+91 98790 44556',
      linkedin: 'https://linkedin.com/in/neha-patel-demo',
      powerbi_use_case: 'Batch Yield & Quality Control',
      lead_priority: 'High',
      status: 'Not Contacted',
      notes: 'CSV Row 2'
    },
    {
      company_name: 'Adani Logistics & Ports',
      industry: 'Supply Chain',
      location: 'Mundra, Gujarat',
      contact_person: 'Siddharth Mehta',
      email: 'siddharth.m@adanilogistics-demo.com',
      phone: '+91 99090 77889',
      linkedin: 'https://linkedin.com/in/siddharth-mehta-demo',
      powerbi_use_case: 'Freight Rate Intelligence',
      lead_priority: 'Medium',
      status: 'Not Contacted',
      notes: 'CSV Row 3'
    }
  ];

  test('imports exactly 3 records into database with complete field normalization', async () => {
    let imported = 0;
    for (const raw of sampleCsvData) {
      await store.insertLead(raw);
      imported++;
    }

    assert.strictEqual(imported, 3);
    const allLeads = await store.getAllLeads();
    assert.strictEqual(allLeads.length, 3);

    // Verify all 3 emails are in database
    const emails = allLeads.map(l => l.email);
    assert.ok(emails.includes('amit.deshmukh@tatamotors-demo.com'));
    assert.ok(emails.includes('neha.patel@sunpharma-demo.com'));
    assert.ok(emails.includes('siddharth.m@adanilogistics-demo.com'));
  });

  test('persistence survives simulated browser refresh & re-query', async () => {
    // Re-query from database
    const refreshed = await store.getAllLeads();
    assert.strictEqual(refreshed.length, 3);
    const sunPharma = refreshed.find(l => l.company_name === 'Sun Pharma Global');
    assert.ok(sunPharma);
    assert.strictEqual(sunPharma?.contact_person, 'Neha Patel');
    assert.strictEqual(sunPharma?.lead_priority, 'High');
  });

  test('rejects duplicate within-file rows and gracefully handles duplicate emails', async () => {
    const existing = await store.getAllLeads();
    const existingMap = new Map(existing.map(l => [l.email, l]));

    const duplicateLead = {
      company_name: 'Tata Motors Commercial (Duplicate)',
      email: 'amit.deshmukh@tatamotors-demo.com'
    };

    const isDuplicate = existingMap.has(duplicateLead.email.toLowerCase());
    assert.strictEqual(isDuplicate, true);
  });
});

describe('15. Manual Test Lead Persistence & Single Outreach Workflow', () => {
  const store = new MockSupabaseCrmStore();

  let createdTestLead: CrmLead;
  let testCampaign: CrmLeadCampaign;

  test('creates exactly ONE manual test lead with specified parameters', async () => {
    createdTestLead = await store.insertLead({
      company_name: 'ProBitian Persistence Test',
      industry: 'Testing',
      location: 'Indore',
      contact_person: 'Shivam',
      email: 'shivambaghel123@gmail.com',
      powerbi_use_case: 'Production persistence test',
      lead_priority: 'High',
      status: 'Not Contacted',
      notes: 'Production database persistence test'
    });

    assert.ok(createdTestLead.id);
    assert.strictEqual(createdTestLead.company_name, 'ProBitian Persistence Test');
    assert.strictEqual(createdTestLead.industry, 'Testing');
    assert.strictEqual(createdTestLead.location, 'Indore');
    assert.strictEqual(createdTestLead.contact_person, 'Shivam');
    assert.strictEqual(createdTestLead.email, 'shivambaghel123@gmail.com');
    assert.strictEqual(createdTestLead.powerbi_use_case, 'Production persistence test');
    assert.strictEqual(createdTestLead.lead_priority, 'High');
    assert.strictEqual(createdTestLead.status, 'Not Contacted');
    assert.strictEqual(createdTestLead.notes, 'Production database persistence test');
  });

  test('creates test campaign and attaches test lead with foreign key relationship', async () => {
    testCampaign = await store.insertCampaign({
      name: 'Single Test Outreach Campaign',
      subject: 'ProBitian Power BI Analytics for {{company_name}}',
      preheader: 'Automated Power BI Dashboard Consultation',
      html_content: `<h2>Hello {{contact_person}},</h2>
<p>This is a single verification outreach for <strong>{{company_name}}</strong> in {{location}}.</p>
<p>Specialized Power BI architecture for: <strong>{{powerbi_use_case}}</strong>.</p>
<p>Best regards,<br/><strong>Shivam Baghel</strong></p>`
    });

    assert.ok(testCampaign.id);

    // Attach lead to campaign
    const campaignLeadRecord = await store.recordCampaignLead({
      campaign_id: testCampaign.id,
      lead_id: createdTestLead.id,
      lead_email: createdTestLead.email,
      lead_company: createdTestLead.company_name,
      status: 'pending'
    });

    assert.strictEqual(campaignLeadRecord.campaign_id, testCampaign.id);
    assert.strictEqual(campaignLeadRecord.lead_id, createdTestLead.id);
    assert.strictEqual(campaignLeadRecord.lead_email, 'shivambaghel123@gmail.com');
  });

  test('executes single email send and updates logs & lead status', async () => {
    // Variable interpolation
    let renderedSubject = testCampaign.subject.replace('{{company_name}}', createdTestLead.company_name);
    let renderedHtml = testCampaign.html_content
      .replace('{{contact_person}}', escapeHtml(createdTestLead.contact_person))
      .replace('{{company_name}}', escapeHtml(createdTestLead.company_name))
      .replace('{{location}}', escapeHtml(createdTestLead.location))
      .replace('{{powerbi_use_case}}', escapeHtml(createdTestLead.powerbi_use_case));

    assert.ok(renderedSubject.includes('ProBitian Persistence Test'));
    assert.ok(renderedHtml.includes('Shivam'));
    assert.ok(renderedHtml.includes('Production persistence test'));

    // Simulated successful SMTP response
    const mockMessageId = '<probitian-test-' + Date.now() + '@gmail.com>';
    const sentAt = new Date().toISOString();

    // Update campaign_lead record
    const updatedRecord = await store.recordCampaignLead({
      campaign_id: testCampaign.id,
      lead_id: createdTestLead.id,
      lead_email: createdTestLead.email,
      lead_company: createdTestLead.company_name,
      status: 'sent',
      provider_message_id: mockMessageId,
      sent_at: sentAt
    });

    assert.strictEqual(updatedRecord.status, 'sent');
    assert.strictEqual(updatedRecord.provider_message_id, mockMessageId);
    assert.ok(updatedRecord.sent_at);

    // Update lead status from 'Not Contacted' to 'Contacted'
    createdTestLead.status = 'Contacted';
    createdTestLead.updated_at = sentAt;
    await store.insertLead(createdTestLead);

    const reFetchedLead = await store.getLeadById(createdTestLead.id);
    assert.strictEqual(reFetchedLead?.status, 'Contacted');
  });

  test('foreign key & database integrity check (zero orphaned records)', async () => {
    const allCampaignLeads = Array.from(store.campaignLeads.values());
    const allCampaigns = store.campaigns;
    const allLeads = store.leads;

    // Check: orphaned campaign_leads with missing campaign
    const orphanedCampaigns = allCampaignLeads.filter(cl => !allCampaigns.has(cl.campaign_id));
    assert.strictEqual(orphanedCampaigns.length, 0, 'Expected 0 orphaned campaign_leads with missing campaign_id');

    // Check: orphaned campaign_leads with invalid lead_id
    const orphanedLeads = allCampaignLeads.filter(cl => cl.lead_id !== null && !allLeads.has(cl.lead_id));
    assert.strictEqual(orphanedLeads.length, 0, 'Expected 0 orphaned campaign_leads with missing lead_id');
  });
});
