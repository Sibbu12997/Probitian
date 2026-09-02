import { Lead, LeadStatus, LeadPriority, LeadSequence } from '../../../../types';

export type { Lead, LeadStatus, LeadPriority, LeadSequence };

export interface LeadsManagerProps {
  onNavigateToOutreach?: (selectedLeadIds?: string[]) => void;
  onLaunchCampaign?: (selectedLeadIds?: string[]) => void;
  onNavigateToSequences?: () => void;
}

export const STATUS_OPTIONS: LeadStatus[] = [
  'Not Contacted',
  'Contacted',
  'Opened',
  'Replied',
  'Interested',
  'Demo Requested',
  'Proposal Sent',
  'Converted',
  'Not Interested',
  'Bounced',
  'Do Not Contact'
];

export const PRIORITY_OPTIONS: LeadPriority[] = ['High', 'Medium', 'Low'];

export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  'Not Contacted': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' },
  'Contacted': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'Opened': { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  'Replied': { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'Interested': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'Demo Requested': { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'Proposal Sent': { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  'Converted': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  'Not Interested': { bg: 'bg-stone-100 dark:bg-stone-900', text: 'text-stone-600 dark:text-stone-400', border: 'border-stone-200 dark:border-stone-800' },
  'Bounced': { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  'Do Not Contact': { bg: 'bg-red-100 dark:bg-red-950/50', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-800' }
};

export const PRIORITY_COLORS: Record<LeadPriority, { bg: string; text: string; border: string }> = {
  High: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  Medium: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Low: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' }
};

export interface LeadMetrics {
  totalLeads: number;
  contactedCount: number;
  highPriorityCount: number;
  convertedCount: number;
  followUpDueCount: number;
}

export interface FeedbackMessage {
  type: 'success' | 'error';
  message: string;
}

export interface LeadOutreachHistoryItem {
  id?: string;
  lead_campaigns?: {
    name?: string;
    subject?: string;
  };
  subject?: string;
  status: string;
  sent_at?: string;
  created_at?: string;
}

export interface LeadSequenceEnrollmentItem {
  id?: string;
  sequence_id: string;
  lead_sequences?: {
    name?: string;
  };
  current_step?: number;
  next_send_at?: string;
  status: string;
}

export interface DetailedLead extends Lead {
  outreach_history?: LeadOutreachHistoryItem[];
}

export interface CsvImportResult {
  success: boolean;
  totalProvided?: number;
  importedCount?: number;
  skippedCount?: number;
  updatedCount?: number;
  invalidCount?: number;
  errors?: any[];
  error?: string;
}
