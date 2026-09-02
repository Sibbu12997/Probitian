import React from 'react';
import { Send, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SequenceStep, Lead } from '../../../../types';

interface SequenceTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: SequenceStep[];
  testStepNumber: number;
  onTestStepNumberChange: (stepNum: number) => void;
  testRecipientEmail: string;
  onTestRecipientEmailChange: (email: string) => void;
  sampleLeadId: string;
  onSampleLeadIdChange: (id: string) => void;
  crmLeads: Lead[];
  testFeedback: { success: boolean; message: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  sendingTest: boolean;
}

export const SequenceTestEmailModal: React.FC<SequenceTestEmailModalProps> = ({
  isOpen,
  onClose,
  steps,
  testStepNumber,
  onTestStepNumberChange,
  testRecipientEmail,
  onTestRecipientEmailChange,
  sampleLeadId,
  onSampleLeadIdChange,
  crmLeads,
  testFeedback,
  onSubmit,
  sendingTest
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Send Sequence Test Email
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Target Sequence Step
            </label>
            <select
              value={testStepNumber}
              onChange={(e) => onTestStepNumberChange(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
            >
              {steps.map((st) => (
                <option key={st.step_number} value={st.step_number}>
                  Step #{st.step_number}: {st.subject} ({st.delay_days}d delay)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Test Recipient Address *
            </label>
            <input
              type="email"
              required
              value={testRecipientEmail}
              onChange={(e) => onTestRecipientEmailChange(e.target.value)}
              placeholder="shivambaghel79@gmail.com"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Simulate Variable Replacement With Lead:
            </label>
            <select
              value={sampleLeadId}
              onChange={(e) => onSampleLeadIdChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              {crmLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company_name} — {l.contact_person || 'No Contact'} ({l.industry || 'General'})
                </option>
              ))}
            </select>
          </div>

          {testFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testFeedback.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-950/50 border border-red-300 text-red-700 dark:text-red-300'
              }`}
            >
              {testFeedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{testFeedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={sendingTest}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Test Email</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
