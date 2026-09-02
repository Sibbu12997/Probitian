import { LeadSequence, SequenceStep, SequenceLead, Lead, SequenceStatus } from '../../../../types';

export interface LeadSequencesManagerProps {
  onNavigateToLeads?: () => void;
}

export interface TemplateTag {
  tag: string;
  label: string;
  desc: string;
}

export const TEMPLATE_TAGS: TemplateTag[] = [
  { tag: '{{company_name}}', label: 'Company Name', desc: 'Target company name' },
  { tag: '{{contact_person}}', label: 'Contact Person', desc: 'Name of key decision-maker' },
  { tag: '{{industry}}', label: 'Industry', desc: 'Operating business vertical' },
  { tag: '{{location}}', label: 'Location', desc: 'City or industrial cluster' },
  { tag: '{{powerbi_use_case}}', label: 'Power BI Scope', desc: 'Tailored analytics use case' },
  { tag: '{{phone}}', label: 'Phone', desc: 'Phone number if available' },
];

export interface SequenceStats {
  total: number;
  active: number;
  paused: number;
  totalLeadsEnrolled: number;
  totalSent: number;
  totalFailed: number;
}

export type SequenceFilterStatus = 'All' | SequenceStatus;
export type SequenceLeadTabFilter = 'All' | 'Active' | 'Completed' | 'Stopped';
export type SequenceActiveTab = 'steps' | 'leads' | 'analytics';
export type PreviewDevice = 'desktop' | 'mobile';

export interface ToastMessage {
  type: 'success' | 'error';
  text: string;
}
