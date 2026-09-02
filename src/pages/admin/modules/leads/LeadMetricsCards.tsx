import React from 'react';
import { LeadMetrics } from './types';

interface LeadMetricsCardsProps {
  metrics: LeadMetrics;
}

export const LeadMetricsCards: React.FC<LeadMetricsCardsProps> = ({ metrics }) => {
  const { totalLeads, contactedCount, highPriorityCount, convertedCount, followUpDueCount } = metrics;
  const outreachRate = totalLeads > 0 ? Math.round((contactedCount / totalLeads) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Leads</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalLeads}</p>
        <span className="text-[10px] text-slate-500">In database</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-500">Contacted</p>
        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{contactedCount}</p>
        <span className="text-[10px] text-slate-500">{outreachRate}% outreach rate</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-red-500">High Priority</p>
        <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{highPriorityCount}</p>
        <span className="text-[10px] text-slate-500">Enterprise targets</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">Converted</p>
        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{convertedCount}</p>
        <span className="text-[10px] text-slate-500">Clients closed</span>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-500">Follow-ups Due</p>
        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{followUpDueCount}</p>
        <span className="text-[10px] text-slate-500">Today / Overdue</span>
      </div>
    </div>
  );
};
