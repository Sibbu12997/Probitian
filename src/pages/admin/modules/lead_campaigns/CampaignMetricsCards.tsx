import React from 'react';
import { CampaignStats } from './types';

interface CampaignMetricsCardsProps {
  stats: CampaignStats;
}

export const CampaignMetricsCards: React.FC<CampaignMetricsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outreach Campaigns</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalCampaigns}</p>
        <span className="text-[10px] text-slate-500">{stats.draftsCount} drafts created</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Emails Delivered</p>
        <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.totalSentDeliveries}</p>
        <span className="text-[10px] text-slate-500">To B2B prospect inboxes</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Delivery Rate</p>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.deliverySuccessRate}%</p>
        <span className="text-[10px] text-slate-500">SMTP delivery success</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Available Prospects</p>
        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.availableProspectsCount}</p>
        <span className="text-[10px] text-slate-500">Business leads in CRM</span>
      </div>
    </div>
  );
};
