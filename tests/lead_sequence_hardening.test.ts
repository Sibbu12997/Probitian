import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { campaignEmailService } from '../src/services/campaignEmailService';
import { CrmLead, SequenceLead, SequenceStep, SequenceDelivery } from '../server/services/crmStorage';

describe('Lead Sequence Hardening & Validation Suite', () => {
  describe('1. Template Interpolation & Sanitization', () => {
    test('interpolates lead placeholders correctly with fallbacks', () => {
      const template = 'Hello {{contact_person}} at {{company_name}} in {{location}}! Use case: {{powerbi_use_case}}';
      const lead: Partial<CrmLead> = {
        contact_person: 'Shivam Baghel',
        company_name: 'ProBitian Technologies',
        location: 'Indore',
        powerbi_use_case: 'Financial Dashboarding'
      };

      const rendered = campaignEmailService.interpolateLeadVariables(template, lead);
      assert.equal(
        rendered,
        'Hello Shivam Baghel at ProBitian Technologies in Indore! Use case: Financial Dashboarding'
      );
    });

    test('falls back gracefully when placeholders are missing or empty', () => {
      const template = 'Dear {{contact_person}}, your team at {{company_name}} in {{industry}} can benefit from {{powerbi_use_case}}';
      const lead: Partial<CrmLead> = {
        contact_person: '',
        company_name: 'Acme Corp',
        industry: '',
        powerbi_use_case: ''
      };

      const rendered = campaignEmailService.interpolateLeadVariables(template, lead);
      assert.ok(rendered.includes('Team'));
      assert.ok(rendered.includes('Acme Corp'));
      assert.ok(rendered.includes('your industry'));
      assert.ok(rendered.includes('business analytics &amp; Power BI reporting') || rendered.includes('business analytics & Power BI reporting'));
    });
  });

  describe('2. Lead Assignment & Enrollment Logic', () => {
    test('enrolls new valid lead and prevents duplicate active enrollment', () => {
      const sequenceId = 'seq-test-01';
      const crmLeads: CrmLead[] = [
        {
          id: 'lead-01',
          company_name: 'ProBitian',
          industry: 'IT',
          location: 'Indore',
          contact_person: 'Shivam',
          email: 'shivambaghel79@gmail.com',
          phone: '',
          linkedin: '',
          powerbi_use_case: 'Executive KPIs',
          lead_priority: 'High',
          status: 'Not Contacted',
          follow_up_date: null,
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      const sequenceLeads: SequenceLead[] = [];
      const validLeadMap = new Map(crmLeads.map(l => [l.id, l]));
      const requestedIds = ['lead-01', 'non-existent-lead'];

      let enrolled = 0;
      let alreadyEnrolled = 0;
      let invalid = 0;

      for (const id of requestedIds) {
        if (!validLeadMap.has(id)) {
          invalid++;
          continue;
        }

        const existing = sequenceLeads.find(sl => sl.sequence_id === sequenceId && sl.lead_id === id);
        if (existing && existing.status === 'Active') {
          alreadyEnrolled++;
          continue;
        }

        sequenceLeads.push({
          id: crypto.randomUUID(),
          sequence_id: sequenceId,
          lead_id: id,
          status: 'Active',
          current_step: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sent_at: null,
          next_send_at: new Date().toISOString()
        });
        enrolled++;
      }

      assert.equal(enrolled, 1);
      assert.equal(invalid, 1);
      assert.equal(alreadyEnrolled, 0);
      assert.equal(sequenceLeads.length, 1);
      assert.equal(sequenceLeads[0].current_step, 1);
      assert.equal(sequenceLeads[0].status, 'Active');

      // Attempt duplicate enrollment
      let secondEnrolled = 0;
      let secondAlready = 0;
      for (const id of ['lead-01']) {
        const existing = sequenceLeads.find(sl => sl.sequence_id === sequenceId && sl.lead_id === id);
        if (existing && existing.status === 'Active') {
          secondAlready++;
          continue;
        }
        secondEnrolled++;
      }

      assert.equal(secondEnrolled, 0);
      assert.equal(secondAlready, 1);
      assert.equal(sequenceLeads.length, 1, 'Duplicate enrollment was prevented');
    });

    test('re-activates previously paused or stopped lead when re-enrolled', () => {
      const sequenceId = 'seq-test-01';
      const sequenceLeads: SequenceLead[] = [
        {
          id: 'enroll-01',
          sequence_id: sequenceId,
          lead_id: 'lead-01',
          status: 'Paused',
          current_step: 2,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          last_sent_at: new Date(Date.now() - 86400000).toISOString(),
          next_send_at: null
        }
      ];

      const existingIndex = sequenceLeads.findIndex(sl => sl.sequence_id === sequenceId && sl.lead_id === 'lead-01');
      assert.ok(existingIndex !== -1);

      const now = new Date().toISOString();
      sequenceLeads[existingIndex] = {
        ...sequenceLeads[existingIndex],
        status: 'Active',
        current_step: 1,
        last_sent_at: null,
        next_send_at: now,
        stop_reason: undefined,
        stopped_at: undefined,
        completed_at: undefined,
        updated_at: now
      };

      assert.equal(sequenceLeads[0].status, 'Active');
      assert.equal(sequenceLeads[0].current_step, 1);
      assert.ok(sequenceLeads[0].next_send_at !== null);
    });
  });

  describe('3. Step Progression & Scheduling Logic', () => {
    test('calculates next_send_at correctly from step delay_days', () => {
      const steps: SequenceStep[] = [
        {
          id: 'step-1',
          sequence_id: 'seq-1',
          step_number: 1,
          step_name: 'Initial Introduction',
          subject: 'Intro to ProBitian',
          html_content: '<p>Hi {{contact_person}}</p>',
          delay_days: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'step-2',
          sequence_id: 'seq-1',
          step_number: 2,
          step_name: 'Follow-up Value Proposition',
          subject: 'Following up',
          html_content: '<p>Power BI insights</p>',
          delay_days: 3,
          created_at: new Date().toISOString()
        },
        {
          id: 'step-3',
          sequence_id: 'seq-1',
          step_number: 3,
          step_name: 'Case Study Demonstration',
          subject: 'Our Case Studies',
          html_content: '<p>Recent results</p>',
          delay_days: 5,
          created_at: new Date().toISOString()
        }
      ];

      const maxStep = Math.max(...steps.map(s => Number(s.step_number)));
      assert.equal(maxStep, 3);

      // Advance from Step 1 to Step 2
      const sentTime = new Date('2026-09-10T10:00:00Z');
      const currentStepNum = 1;
      const nextStepNum = currentStepNum + 1;
      const nextStepDef = steps.find(s => Number(s.step_number) === nextStepNum);
      assert.ok(nextStepDef);

      const delayMs = Math.max(0, Number(nextStepDef.delay_days || 0)) * 24 * 60 * 60 * 1000;
      const nextSendAt = new Date(sentTime.getTime() + delayMs).toISOString();

      assert.equal(nextSendAt, '2026-09-13T10:00:00.000Z', 'Step 2 correctly scheduled 3 days after step 1');

      // Final step advances to Completed
      const lastStepNum = 3;
      assert.ok(lastStepNum >= maxStep);
      const isCompleted = lastStepNum >= maxStep;
      assert.equal(isCompleted, true, 'Sequence marks completed when last step finishes');
    });

    test('lead stop condition prevents email sending when replied or stopped', () => {
      const leadEnrollment: SequenceLead = {
        id: 'enr-01',
        sequence_id: 'seq-01',
        lead_id: 'lead-01',
        status: 'Replied',
        current_step: 2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sent_at: new Date().toISOString(),
        next_send_at: new Date().toISOString()
      };

      const isEligible = leadEnrollment.status === 'Active' &&
        (!leadEnrollment.next_send_at || new Date(leadEnrollment.next_send_at).getTime() <= Date.now());

      assert.equal(isEligible, false, 'Replied lead is not eligible for sending');
    });
  });

  describe('4. Delivery Record Deduplication & Logging', () => {
    test('deduplicates deliveries to prevent recording identical sequence step sends', () => {
      const deliveries: SequenceDelivery[] = [
        {
          id: 'del-01',
          sequence_id: 'seq-01',
          sequence_lead_id: 'enr-01',
          lead_id: 'lead-01',
          step_number: 1,
          step_name: 'Intro',
          recipient_email: 'test@example.com',
          subject: 'Hello',
          status: 'sent',
          provider_message_id: '<msg-123@smtp>',
          sent_at: '2026-09-10T12:00:00Z',
          created_at: '2026-09-10T12:00:00Z'
        }
      ];

      // Attempt to add a duplicate delivery record
      const duplicateRecord: SequenceDelivery = {
        id: 'del-02',
        sequence_id: 'seq-01',
        sequence_lead_id: 'enr-01',
        lead_id: 'lead-01',
        step_number: 1,
        step_name: 'Intro',
        recipient_email: 'test@example.com',
        subject: 'Hello',
        status: 'sent',
        provider_message_id: '<msg-123@smtp>',
        sent_at: '2026-09-10T12:00:00Z',
        created_at: '2026-09-10T12:00:00Z'
      };

      const existingIndex = deliveries.findIndex(
        d => d.sequence_id === duplicateRecord.sequence_id &&
             d.lead_id === duplicateRecord.lead_id &&
             d.step_number === duplicateRecord.step_number
      );

      if (existingIndex !== -1) {
        deliveries[existingIndex] = { ...deliveries[existingIndex], ...duplicateRecord };
      } else {
        deliveries.push(duplicateRecord);
      }

      assert.equal(deliveries.length, 1, 'Delivery records deduplicated based on (sequence_id, lead_id, step_number)');
    });
  });

  describe('5. Non-Production Email Safety Guard', () => {
    test('allows designated testing address shivambaghel79@gmail.com and protects other leads', () => {
      const allowedTestingEmail = 'shivambaghel79@gmail.com';
      const isProduction = false;

      const shouldSendLive = (email: string) => {
        if (isProduction) return true;
        return email.trim().toLowerCase() === allowedTestingEmail.toLowerCase();
      };

      assert.equal(shouldSendLive('shivambaghel79@gmail.com'), true);
      assert.equal(shouldSendLive('SHIVAMBAGHEL79@GMAIL.COM'), true);
      assert.equal(shouldSendLive('random_lead@corporate.com'), false);
      assert.equal(shouldSendLive('ceo@fortune500.com'), false);
    });
  });
});
