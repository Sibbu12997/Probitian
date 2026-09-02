import React from 'react';
import { ArrowRight, Pause, Play, Users, Layers } from 'lucide-react';
import { LeadSequence } from '../../../../types';
import { SequenceActiveTab } from './types';

interface SequenceDetailHeaderProps {
  sequence: LeadSequence;
  stepCount: number;
  leadCount: number;
  activeTab: SequenceActiveTab;
  onTabChange: (tab: SequenceActiveTab) => void;
  onBack: () => void;
  onToggleStatus: (seq: LeadSequence) => void;
  onOpenEnrollModal: () => void;
}

export const SequenceDetailHeader: React.FC<SequenceDetailHeaderProps> = ({
  sequence,
  stepCount,
  leadCount,
  activeTab,
  onTabChange,
  onBack,
  onToggleStatus,
  onOpenEnrollModal
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {sequence.name}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  sequence.status === 'Active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                }`}
              >
                {sequence.status}
              </span>
            </div>
            <p className="text-xs text-slate-500">{sequence.description || 'Enterprise Automated Outreach Sequence'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleStatus(sequence)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              sequence.status === 'Active'
                ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {sequence.status === 'Active' ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Sequence</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Sequence</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenEnrollModal}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Enroll Leads from CRM</span>
          </button>
        </div>
      </div>

      {/* Sequence Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pt-2">
        <button
          type="button"
          onClick={() => onTabChange('steps')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'steps'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sequence Steps ({stepCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('leads')}
          className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'leads'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Enrolled Leads ({leadCount})</span>
        </button>
      </div>
    </div>
  );
};
