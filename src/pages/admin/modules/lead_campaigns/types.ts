import { LeadCampaign, Lead, CampaignLead, MediaItem } from '../../../../types';

export interface LeadCampaignsManagerProps {
  initialSelectedLeadIds?: string[];
}

export interface OutreachTemplate {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  content: string;
}

export interface VariableTag {
  tag: string;
  label: string;
  desc: string;
}

export interface ToastFeedback {
  type: 'success' | 'error';
  message: string;
}

export interface TestEmailResult {
  success: boolean;
  message: string;
}

export interface BroadcastResult {
  success: boolean;
  message: string;
  successfulCount?: number;
  failedCount?: number;
}

export interface CampaignStats {
  totalCampaigns: number;
  totalSentDeliveries: number;
  totalFailedDeliveries: number;
  totalDeliveries: number;
  deliverySuccessRate: number;
  draftsCount: number;
  availableProspectsCount: number;
}
