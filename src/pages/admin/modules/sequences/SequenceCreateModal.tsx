import React from 'react';
import { Workflow, X, ShieldCheck, RefreshCw, Plus } from 'lucide-react';

interface SequenceCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  onNameChange: (val: string) => void;
  description: string;
  onDescriptionChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isCreating: boolean;
}

export const SequenceCreateModal: React.FC<SequenceCreateModalProps> = ({
  isOpen,
  onClose,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  onSubmit,
  isCreating
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Create Automated Sequence
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Sequence Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Manufacturing MIS Outreach — 14 Day"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Description / Objective
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="e.g. Automated multi-step outreach for manufacturing plant heads & directors"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-xs text-purple-800 dark:text-purple-300">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Automatic Safety Protocols Included</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Sequences will automatically halt sending if a lead replies, books a demo, or is flagged as Do Not Contact.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {isCreating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create Sequence</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
