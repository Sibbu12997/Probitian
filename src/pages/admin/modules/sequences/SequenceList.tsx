import React from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { LeadSequence } from '../../../../types';

interface SequenceListProps {
  sequences: LeadSequence[];
  loading: boolean;
  onSelectSequence: (id: string) => void;
  onToggleStatus: (seq: LeadSequence) => void;
  onDeleteSequence: (id: string, name: string) => void;
  onOpenCreateModal: () => void;
}

export const SequenceList: React.FC<SequenceListProps> = ({
  sequences,
  loading,
  onSelectSequence,
  onToggleStatus,
  onDeleteSequence,
  onOpenCreateModal
}) => {
  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
        <p className="text-xs font-semibold">Loading sequences from Supabase...</p>
      </div>
    );
  }

  if (sequences.length === 0) {
    return (
      <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-4">
        <Workflow className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white">No Email Sequences Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Create your first multi-step automated email outreach sequence or customize the default sequence.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-purple-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create First Sequence</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sequences.map((seq) => (
        <div
          key={seq.id}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:border-purple-500/50 dark:hover:border-purple-500/50 transition-all flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                  seq.status === 'Active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : seq.status === 'Paused'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {seq.status}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleStatus(seq)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                  title={seq.status === 'Active' ? 'Pause Sequence' : 'Resume Sequence'}
                >
                  {seq.status === 'Active' ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteSequence(seq.id, seq.name)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500"
                  title="Delete Sequence"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-purple-600 transition-colors">
                {seq.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                {seq.description || 'No description provided.'}
              </p>
            </div>

            {/* Step Pipeline Pills Preview */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Steps:</span>
              {(seq.steps || []).map((step, idx) => (
                <span
                  key={step.id || idx}
                  className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200 dark:border-purple-800/60"
                >
                  S{step.step_number} ({step.delay_days}d)
                </span>
              ))}
              {(!seq.steps || seq.steps.length === 0) && (
                <span className="text-[10px] text-slate-400 italic">No steps configured</span>
              )}
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Enrolled</span>
                <span className="font-black text-xs text-slate-800 dark:text-slate-200">{seq.total_leads || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Active</span>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{seq.active_leads || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Sent</span>
                <span className="font-black text-xs text-purple-600 dark:text-purple-400">{seq.emails_sent || 0}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectSequence(seq.id)}
            className="w-full mt-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Configure Pipeline & Leads</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        </div>
      ))}
    </div>
  );
};
