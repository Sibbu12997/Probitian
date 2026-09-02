import React from 'react';
import { Layers, Play, Pause, Users, Send, AlertCircle } from 'lucide-react';
import { SequenceStats } from './types';

interface SequenceMetricsCardsProps {
  stats: SequenceStats;
}

export const SequenceMetricsCards: React.FC<SequenceMetricsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Total Sequences</span>
          <Layers className="w-4 h-4 text-purple-500" />
        </div>
        <p className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Active Sequences</span>
          <Play className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Paused</span>
          <Pause className="w-4 h-4 text-amber-500" />
        </div>
        <p className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.paused}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Enrolled Leads</span>
          <Users className="w-4 h-4 text-indigo-500" />
        </div>
        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalLeadsEnrolled}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Emails Sent</span>
          <Send className="w-4 h-4 text-purple-500" />
        </div>
        <p className="text-xl font-black text-purple-600 dark:text-purple-400">{stats.totalSent}</p>
      </div>

      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[11px] font-semibold">Failed</span>
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <p className="text-xl font-black text-red-600 dark:text-red-400">{stats.totalFailed}</p>
      </div>
    </div>
  );
};
