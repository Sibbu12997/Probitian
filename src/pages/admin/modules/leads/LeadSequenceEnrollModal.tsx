import React, { useState, useEffect } from 'react';
import { X, Workflow, Play, Plus, AlertCircle } from 'lucide-react';
import { LeadSequence } from './types';
import { cmsService } from '../../../../services/cmsService';

interface LeadSequenceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onEnroll: (sequenceId: string) => Promise<boolean>;
  onNavigateToSequences?: () => void;
}

export const LeadSequenceEnrollModal: React.FC<LeadSequenceEnrollModalProps> = ({
  isOpen,
  onClose,
  selectedCount,
  onEnroll,
  onNavigateToSequences
}) => {
  const [sequences, setSequences] = useState<LeadSequence[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [loadingSeqs, setLoadingSeqs] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSequenceId('');
      return;
    }

    let isMounted = true;
    const fetchSequences = async () => {
      setLoadingSeqs(true);
      try {
        const data = await cmsService.getLeadSequences();
        if (isMounted) {
          setSequences(data || []);
          if (data && data.length > 0) {
            setSelectedSequenceId(data[0].id);
          }
        }
      } catch {
        if (isMounted) {
          setSequences([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSeqs(false);
        }
      }
    };

    fetchSequences();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSequenceId) return;
    setEnrolling(true);
    const ok = await onEnroll(selectedSequenceId);
    setEnrolling(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Enroll In Automated Sequence
              </h3>
              <p className="text-[11px] text-slate-500">
                Start multi-step outreach for {selectedCount} selected leads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleEnrollSubmit} className="p-6 space-y-4">
          {loadingSeqs ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Loading available email sequences...
            </div>
          ) : sequences.length === 0 ? (
            <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No Email Sequences Available
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Create automated multi-step sequences in the Sequence Builder before enrolling leads.
                </p>
              </div>
              {onNavigateToSequences && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToSequences();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Go to Sequence Builder</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Sequence
                </label>
                <select
                  value={selectedSequenceId}
                  onChange={(e) => setSelectedSequenceId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {sequences.map(seq => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name} ({seq.steps?.length || 0} steps) — {seq.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200">
                <p className="font-bold text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  How Sequence Enrollment Works:
                </p>
                <ul className="list-disc list-inside mt-1.5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>Step 1 email will be queued immediately or sent based on sequence schedule.</li>
                  <li>Follow-up steps will automatically advance according to day delays.</li>
                  <li>Leads will automatically stop if they reply, convert, or bounce.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enrolling || !selectedSequenceId}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{enrolling ? 'Enrolling...' : `Start Sequence for ${selectedCount} Leads`}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
