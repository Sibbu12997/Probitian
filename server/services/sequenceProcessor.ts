import crypto from 'crypto';
import {
  getSupabaseCrmSequences,
  getSupabaseSequenceSteps,
  getSupabaseSequenceLeads,
  saveSupabaseSequenceLeads,
  getSupabaseSequenceDeliveries,
  saveSupabaseSequenceDeliveries,
  getSupabaseCrmLeads
} from './crmStorage';
import { serverSupabase } from './supabase';
import { campaignEmailService } from '../../src/services/campaignEmailService';
import { generateUnsubscribeToken } from '../security/tokens';

export interface SequenceProcessingStats {
  totalSequences: number;
  eligibleEnrollments: number;
  processed: number;
  sent: number;
  failed: number;
  completed: number;
  stopped: number;
  skipped: number;
}

export interface SequenceProcessingDetail {
  sequenceId: string;
  sequenceName: string;
  leadId: string;
  companyName: string;
  email: string;
  stepNumber: number;
  action: 'sent' | 'failed' | 'completed' | 'stopped' | 'skipped';
  reason?: string;
  nextSendAt?: string | null;
}

export interface SequenceProcessingResult {
  success: boolean;
  message?: string;
  stats: SequenceProcessingStats;
  details: SequenceProcessingDetail[];
}

// In-process mutex as fast local guard
let isLocalProcessingActive = false;

/**
 * Acquire a distributed atomic lock for sequence processing cycle across all worker instances.
 */
async function acquireDistributedCycleLock(timeoutSeconds: number = 30): Promise<boolean> {
  if (!serverSupabase) return true;
  try {
    const { data, error } = await serverSupabase.rpc('increment_rate_limit', {
      p_key: 'crm_seq_worker_cycle_lock',
      p_window_ms: timeoutSeconds * 1000,
      p_max_requests: 1
    });
    if (error) {
      console.warn('[Distributed Cycle Lock RPC Warning]', error.message);
      return true; // Fallback to local mutex if RPC unavailable
    }
    return Boolean(data?.allowed);
  } catch (err: any) {
    console.warn('[Distributed Cycle Lock Exception]', err?.message || err);
    return true;
  }
}

/**
 * Acquire an atomic lock for a specific sequence enrollment step send to prevent duplicate sends across workers.
 */
async function acquireEnrollmentStepClaim(sequenceLeadId: string, stepNumber: number): Promise<boolean> {
  if (!serverSupabase) return true;
  try {
    const claimKey = `crm_claim_sl_${sequenceLeadId}_s${stepNumber}`;
    // Claim window: 10 minutes (600,000 ms)
    const { data, error } = await serverSupabase.rpc('increment_rate_limit', {
      p_key: claimKey,
      p_window_ms: 10 * 60 * 1000,
      p_max_requests: 1
    });
    if (error) {
      console.warn('[Step Claim RPC Warning]', error.message);
      return true;
    }
    return Boolean(data?.allowed);
  } catch (err: any) {
    console.warn('[Step Claim Exception]', err?.message || err);
    return true;
  }
}

/**
 * Execute a single cycle of sequence processing across all active sequences and eligible leads.
 */
export async function executeSequenceProcessingCycle(options?: {
  reqProtocol?: string;
  reqHost?: string;
  batchLimit?: number;
  targetEmail?: string;
  targetLeadId?: string;
  forceProductionSend?: boolean;
}): Promise<SequenceProcessingResult> {
  if (isLocalProcessingActive) {
    return {
      success: true,
      message: 'Sequence processing cycle is currently already running in local process.',
      stats: {
        totalSequences: 0,
        eligibleEnrollments: 0,
        processed: 0,
        sent: 0,
        failed: 0,
        completed: 0,
        stopped: 0,
        skipped: 0
      },
      details: []
    };
  }

  const hasCycleLock = await acquireDistributedCycleLock(30);
  if (!hasCycleLock) {
    return {
      success: true,
      message: 'Sequence processing cycle is currently active on another server instance.',
      stats: {
        totalSequences: 0,
        eligibleEnrollments: 0,
        processed: 0,
        sent: 0,
        failed: 0,
        completed: 0,
        stopped: 0,
        skipped: 0
      },
      details: []
    };
  }

  isLocalProcessingActive = true;
  const startTime = Date.now();

  try {
    const protocol = options?.reqProtocol || 'https';
    const host = options?.reqHost || 'probitian.ai.studio';
    const baseUrl = `${protocol}://${host}`;
    const batchLimit = options?.batchLimit || 20;

    // 1. Fetch data from Supabase
    const allSequences = await getSupabaseCrmSequences();
    const activeSequences = allSequences.filter(s => s.status === 'Active');
    const activeSeqMap = new Map(activeSequences.map(s => [s.id, s]));

    const allSteps = await getSupabaseSequenceSteps();
    const allSequenceLeads = await getSupabaseSequenceLeads();
    const allDeliveries = await getSupabaseSequenceDeliveries();
    const allCrmLeads = await getSupabaseCrmLeads();

    // Map leads by id for instant relational lookup
    const crmLeadMap = new Map(allCrmLeads.map(l => [l.id, l]));

    // Group steps by sequence id, sorted ascending by step_number
    const stepsBySeq = new Map<string, any[]>();
    for (const st of allSteps) {
      if (!stepsBySeq.has(st.sequence_id)) {
        stepsBySeq.set(st.sequence_id, []);
      }
      stepsBySeq.get(st.sequence_id)!.push(st);
    }
    for (const steps of stepsBySeq.values()) {
      steps.sort((a, b) => (Number(a.step_number) || 0) - (Number(b.step_number) || 0));
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // 2. Identify eligible enrollments
    // Criteria:
    // - status is 'Active'
    // - Parent sequence is Active
    // - next_send_at is null (immediate) OR next_send_at <= now
    // - Optional filtering by targetEmail or targetLeadId
    const eligibleEnrollments = allSequenceLeads.filter(sl => {
      if (sl.status !== 'Active') return false;
      if (!activeSeqMap.has(sl.sequence_id)) return false;

      if (options?.targetLeadId && sl.lead_id !== options.targetLeadId) {
        return false;
      }

      if (options?.targetEmail) {
        const lead = crmLeadMap.get(sl.lead_id);
        if (!lead || (lead.email || '').trim().toLowerCase() !== options.targetEmail.toLowerCase()) {
          return false;
        }
      }

      if (!sl.next_send_at) return true; // immediate
      return new Date(sl.next_send_at).getTime() <= now.getTime();
    });

    const stats: SequenceProcessingStats = {
      totalSequences: activeSequences.length,
      eligibleEnrollments: eligibleEnrollments.length,
      processed: 0,
      sent: 0,
      failed: 0,
      completed: 0,
      stopped: 0,
      skipped: 0
    };

    const details: SequenceProcessingDetail[] = [];

    // Apply batch limit to prevent massive parallel burst / SMTP throttling
    const toProcess = eligibleEnrollments.slice(0, batchLimit);

    for (const sl of toProcess) {
      stats.processed++;
      const seq = activeSeqMap.get(sl.sequence_id);
      const seqName = seq?.name || 'Unknown Sequence';
      const crmLead = crmLeadMap.get(sl.lead_id);

      // Lead existence check
      if (!crmLead) {
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName: 'Unknown',
          email: 'Unknown',
          stepNumber: sl.current_step,
          action: 'skipped',
          reason: 'Lead record not found in public.leads table'
        });
        continue;
      }

      const companyName = crmLead.company_name || 'Lead';
      const leadEmail = (crmLead.email || '').trim();

      // Section 5: Automatic stop logic
      const stopStatuses = ['Converted', 'Not Interested', 'Do Not Contact', 'Bounced'];
      if (stopStatuses.includes(crmLead.status)) {
        sl.status = 'Stopped';
        sl.stop_reason = `Lead marked as ${crmLead.status}`;
        sl.stopped_at = nowIso;
        sl.updated_at = nowIso;
        stats.stopped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: sl.current_step,
          action: 'stopped',
          reason: `Lead status changed to ${crmLead.status}`
        });
        continue;
      }

      // Check email validity
      if (!leadEmail || !leadEmail.includes('@')) {
        sl.status = 'Stopped';
        sl.stop_reason = 'Invalid or missing email address';
        sl.stopped_at = nowIso;
        sl.updated_at = nowIso;
        stats.stopped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: sl.current_step,
          action: 'stopped',
          reason: 'Missing or invalid email address'
        });
        continue;
      }

      // Steps check for this sequence
      const seqSteps = stepsBySeq.get(sl.sequence_id) || [];
      if (seqSteps.length === 0) {
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: sl.current_step,
          action: 'skipped',
          reason: 'No steps configured for sequence'
        });
        continue;
      }

      // Check if current_step exceeds total steps
      const currentStepNum = Number(sl.current_step) || 1;
      const currentStep = seqSteps.find(s => Number(s.step_number) === currentStepNum);

      if (!currentStep) {
        // If current step is past the last step, mark Completed
        if (currentStepNum > seqSteps.length) {
          sl.status = 'Completed';
          sl.completed_at = nowIso;
          sl.next_send_at = null;
          sl.updated_at = nowIso;
          stats.completed++;
          details.push({
            sequenceId: sl.sequence_id,
            sequenceName: seqName,
            leadId: sl.lead_id,
            companyName,
            email: leadEmail,
            stepNumber: currentStepNum,
            action: 'completed',
            reason: 'All sequence steps already finished'
          });
          continue;
        }

        // Missing step in the middle
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'skipped',
          reason: `Step #${currentStepNum} template not found`
        });
        continue;
      }

      // Check if current step is explicitly disabled
      if (currentStep.enabled === false) {
        // Advance to next step
        const nextStepNum = currentStepNum + 1;
        const nextStep = seqSteps.find(s => Number(s.step_number) === nextStepNum);
        if (nextStep) {
          sl.current_step = nextStepNum;
          const delayDays = Number(nextStep.delay_days) || 0;
          sl.next_send_at = new Date(Date.now() + delayDays * 86400000).toISOString();
        } else {
          sl.status = 'Completed';
          sl.completed_at = nowIso;
          sl.next_send_at = null;
          stats.completed++;
        }
        sl.updated_at = nowIso;
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'skipped',
          reason: `Step #${currentStepNum} is disabled; advanced to next step`
        });
        continue;
      }

      // Section 6 & 9: Idempotency check against historical deliveries
      const alreadySent = allDeliveries.some(
        d => d.sequence_lead_id === sl.id &&
             Number(d.step_number) === currentStepNum &&
             d.status === 'sent'
      );

      if (alreadySent) {
        const nextStepNum = currentStepNum + 1;
        const nextStep = seqSteps.find(s => Number(s.step_number) === nextStepNum);
        if (nextStep) {
          sl.current_step = nextStepNum;
          const delayDays = Number(nextStep.delay_days) || 0;
          sl.next_send_at = new Date(Date.now() + delayDays * 86400000).toISOString();
        } else {
          sl.status = 'Completed';
          sl.completed_at = nowIso;
          sl.next_send_at = null;
          stats.completed++;
        }
        sl.updated_at = nowIso;
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'skipped',
          reason: `Step #${currentStepNum} was already sent previously; advancing pipeline`
        });
        continue;
      }

      // Section 6: Atomic Claim per Enrollment Step across multi-instance workers
      const stepClaimed = await acquireEnrollmentStepClaim(sl.id, currentStepNum);
      if (!stepClaimed) {
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'skipped',
          reason: `Step #${currentStepNum} is currently claimed by another concurrent worker instance`
        });
        continue;
      }

      // Section 15: EMAIL SAFETY GUARD
      // In development/test mode, only send to approved test recipient or explicitly targeted email
      const isApprovedRecipient = leadEmail.toLowerCase() === 'shivambaghel79@gmail.com' ||
        (options?.targetEmail && leadEmail.toLowerCase() === options.targetEmail.toLowerCase());

      if (process.env.NODE_ENV !== 'production' && !options?.forceProductionSend && !isApprovedRecipient) {
        stats.skipped++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'skipped',
          reason: `Email Safety Guard: Skipped real dispatch to ${leadEmail} in non-production mode.`
        });
        continue;
      }

      // Generate Unsubscribe token & URL
      const unsubToken = generateUnsubscribeToken(leadEmail);
      const unsubscribeUrl = `${baseUrl}/api/crm/unsubscribe?token=${unsubToken}`;

      // Section 7: Send sequence email using existing campaignEmailService
      try {
        const sendRes = await campaignEmailService.sendLeadSingleRecipient({
          toEmail: leadEmail,
          subject: currentStep.subject,
          preheader: currentStep.preheader,
          contentHtml: currentStep.html_content,
          lead: crmLead,
          unsubscribeUrl
        });

        const deliveryNow = new Date().toISOString();

        if (sendRes.success) {
          // Record successful delivery in crm_sequence_deliveries
          const deliveryRecord = {
            id: crypto.randomUUID(),
            sequence_id: sl.sequence_id,
            sequence_lead_id: sl.id,
            lead_id: sl.lead_id,
            step_id: currentStep.id,
            step_number: currentStepNum,
            email: leadEmail,
            subject: campaignEmailService.interpolateLeadVariables(currentStep.subject, crmLead, { isHtml: false }),
            status: 'sent',
            message_id: sendRes.messageId,
            sent_at: deliveryNow,
            created_at: deliveryNow
          };
          allDeliveries.push(deliveryRecord);

          // Update sequence lead record
          sl.last_sent_at = deliveryNow;
          sl.updated_at = deliveryNow;

          // Section 6: Step timing based on previous successful delivery time
          const nextStepNum = currentStepNum + 1;
          const nextStep = seqSteps.find(s => Number(s.step_number) === nextStepNum);

          if (nextStep) {
            sl.current_step = nextStepNum;
            const delayDays = Number(nextStep.delay_days) || 0;
            const nextSendTime = new Date(new Date(deliveryNow).getTime() + delayDays * 86400000);
            sl.next_send_at = nextSendTime.toISOString();
          } else {
            // All steps completed!
            sl.status = 'Completed';
            sl.completed_at = deliveryNow;
            sl.next_send_at = null;
            stats.completed++;
          }

          stats.sent++;
          details.push({
            sequenceId: sl.sequence_id,
            sequenceName: seqName,
            leadId: sl.lead_id,
            companyName,
            email: leadEmail,
            stepNumber: currentStepNum,
            action: 'sent',
            nextSendAt: sl.next_send_at
          });
        } else {
          // Section 3: If send fails, record delivery failure, DO NOT advance step, keep enrollment active
          const failedRecord = {
            id: crypto.randomUUID(),
            sequence_id: sl.sequence_id,
            sequence_lead_id: sl.id,
            lead_id: sl.lead_id,
            step_id: currentStep.id,
            step_number: currentStepNum,
            email: leadEmail,
            subject: campaignEmailService.interpolateLeadVariables(currentStep.subject, crmLead, { isHtml: false }),
            status: 'failed',
            error_message: sendRes.error || 'Failed to dispatch email',
            sent_at: deliveryNow,
            created_at: deliveryNow
          };
          allDeliveries.push(failedRecord);

          sl.updated_at = deliveryNow;
          stats.failed++;
          details.push({
            sequenceId: sl.sequence_id,
            sequenceName: seqName,
            leadId: sl.lead_id,
            companyName,
            email: leadEmail,
            stepNumber: currentStepNum,
            action: 'failed',
            reason: sendRes.error || 'Failed to dispatch email'
          });
        }
      } catch (err: any) {
        const deliveryNow = new Date().toISOString();
        const failedRecord = {
          id: crypto.randomUUID(),
          sequence_id: sl.sequence_id,
          sequence_lead_id: sl.id,
          lead_id: sl.lead_id,
          step_id: currentStep.id,
          step_number: currentStepNum,
          email: leadEmail,
          subject: campaignEmailService.interpolateLeadVariables(currentStep.subject, crmLead, { isHtml: false }),
          status: 'failed',
          error_message: err?.message || String(err),
          sent_at: deliveryNow,
          created_at: deliveryNow
        };
        allDeliveries.push(failedRecord);

        sl.updated_at = deliveryNow;
        stats.failed++;
        details.push({
          sequenceId: sl.sequence_id,
          sequenceName: seqName,
          leadId: sl.lead_id,
          companyName,
          email: leadEmail,
          stepNumber: currentStepNum,
          action: 'failed',
          reason: err?.message || 'Exception during email dispatch'
        });
      }

      // Safety throttle delay between sends (250ms) to respect SMTP rate limits
      await new Promise(r => setTimeout(r, 250));
    }

    // 3. Persist state changes back to Supabase settings
    try {
      await saveSupabaseSequenceDeliveries(allDeliveries);
      await saveSupabaseSequenceLeads(allSequenceLeads);
    } catch (persistErr: any) {
      console.error('[CRITICAL: Sequence State Persistence Error]', persistErr);
      return {
        success: false,
        message: `Dispatched ${stats.sent} email(s), but failed to persist sequence state to Supabase: ${persistErr?.message}`,
        stats,
        details
      };
    }

    const elapsedMs = Date.now() - startTime;
    return {
      success: true,
      message: `Sequence processing cycle completed in ${elapsedMs}ms: ${stats.sent} sent, ${stats.failed} failed, ${stats.completed} completed, ${stats.stopped} stopped, ${stats.skipped} skipped.`,
      stats,
      details
    };
  } catch (fatalErr: any) {
    console.error('[Sequence Processing Fatal Exception]', fatalErr);
    return {
      success: false,
      message: fatalErr?.message || 'Fatal error during sequence processing cycle',
      stats: {
        totalSequences: 0,
        eligibleEnrollments: 0,
        processed: 0,
        sent: 0,
        failed: 0,
        completed: 0,
        stopped: 0,
        skipped: 0
      },
      details: []
    };
  } finally {
    isLocalProcessingActive = false;
  }
}
