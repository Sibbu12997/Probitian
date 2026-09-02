import React from 'react';
import {
  Sparkles,
  Plus,
  Check,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Send,
  Eye,
  Edit,
  Trash2,
  Monitor,
  Smartphone
} from 'lucide-react';
import { SequenceStep, Lead } from '../../../../types';
import { TEMPLATE_TAGS, PreviewDevice } from './types';

interface SequenceStepEditorProps {
  steps: SequenceStep[];
  onStepsChange: React.Dispatch<React.SetStateAction<SequenceStep[]>>;
  savingSteps: boolean;
  onSaveSteps: () => void;
  onAddStep: () => void;
  onDeleteStep: (idx: number) => void;
  onMoveStep: (idx: number, direction: 'up' | 'down') => void;
  editingStepIndex: number | null;
  onToggleEditStep: (idx: number) => void;
  previewStepIndex: number | null;
  onTogglePreviewStep: (idx: number) => void;
  previewDevice: PreviewDevice;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
  onOpenTestModal: (stepNum: number) => void;
  crmLeads: Lead[];
  sampleLeadId: string;
  onSampleLeadChange: (leadId: string) => void;
  getInterpolatedHtml: (rawHtml: string, rawSubject: string) => {
    subject: string;
    html: string;
    sampleLead: any;
  };
}

export const SequenceStepEditor: React.FC<SequenceStepEditorProps> = ({
  steps,
  onStepsChange,
  savingSteps,
  onSaveSteps,
  onAddStep,
  onDeleteStep,
  onMoveStep,
  editingStepIndex,
  onToggleEditStep,
  previewStepIndex,
  onTogglePreviewStep,
  previewDevice,
  onPreviewDeviceChange,
  onOpenTestModal,
  crmLeads,
  sampleLeadId,
  onSampleLeadChange,
  getInterpolatedHtml
}) => {
  return (
    <div className="space-y-4">
      {/* Step Pipeline Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Step Pipeline Configuration (Sent sequentially based on scheduled delays)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddStep}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>

          <button
            type="button"
            onClick={onSaveSteps}
            disabled={savingSteps}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            {savingSteps ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Save Pipeline</span>
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isEditing = editingStepIndex === idx;
          const isPreviewing = previewStepIndex === idx;

          return (
            <div
              key={step.id || idx}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm transition-all ${
                isEditing
                  ? 'border-purple-500 ring-2 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Step Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-xs">
                    #{step.step_number}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {step.subject || `Step #${step.step_number}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold">
                        {idx === 0 ? 'Immediate (0d)' : `+${step.delay_days} days delay`}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {step.preheader || 'No preheader text'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Reorder buttons */}
                  <button
                    type="button"
                    onClick={() => onMoveStep(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    title="Move Up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveStep(idx, 'down')}
                    disabled={idx === steps.length - 1}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-30"
                    title="Move Down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Test email button */}
                  <button
                    type="button"
                    onClick={() => onOpenTestModal(step.step_number)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Test</span>
                  </button>

                  {/* Preview button */}
                  <button
                    type="button"
                    onClick={() => onTogglePreviewStep(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                      isPreviewing
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{isPreviewing ? 'Hide Preview' : 'Preview'}</span>
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => onToggleEditStep(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                      isEditing
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Edit className="w-3 h-3" />
                    <span>{isEditing ? 'Collapse' : 'Edit'}</span>
                  </button>

                  {/* Delete button */}
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onDeleteStep(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-slate-400 hover:text-red-500"
                      title="Delete Step"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* EDIT STEP FORM */}
              {isEditing && (
                <div className="pt-4 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Delay Days (After Previous Step)
                      </label>
                      <input
                        type="number"
                        min={idx === 0 ? 0 : 1}
                        value={step.delay_days}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          onStepsChange(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], delay_days: val };
                            return updated;
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Email Subject Line
                      </label>
                      <input
                        type="text"
                        value={step.subject}
                        onChange={(e) => {
                          const val = e.target.value;
                          onStepsChange(prev => {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], subject: val };
                            return updated;
                          });
                        }}
                        placeholder="e.g. Power BI Analytics for {{company_name}}"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Preheader Text (Snippet shown in inbox)
                    </label>
                    <input
                      type="text"
                      value={step.preheader || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onStepsChange(prev => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], preheader: val };
                          return updated;
                        });
                      }}
                      placeholder="e.g. Quick check-in regarding Power BI initiatives"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    />
                  </div>

                  {/* Variable Helper Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Insert Lead Personalization Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {TEMPLATE_TAGS.map((t) => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => {
                            onStepsChange(prev => {
                              const updated = [...prev];
                              updated[idx] = {
                                ...updated[idx],
                                html_content: (updated[idx].html_content || '') + ` ${t.tag} `
                              };
                              return updated;
                            });
                          }}
                          className="px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-800"
                          title={t.desc}
                        >
                          + {t.tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Body Editor */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Email HTML Content
                    </label>
                    <textarea
                      rows={8}
                      value={step.html_content}
                      onChange={(e) => {
                        const val = e.target.value;
                        onStepsChange(prev => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], html_content: val };
                          return updated;
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* LIVE PREVIEW BOX */}
              {isPreviewing && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Simulated with Lead:
                      </span>
                      <select
                        value={sampleLeadId}
                        onChange={(e) => onSampleLeadChange(e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                      >
                        {crmLeads.slice(0, 20).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.company_name} ({l.contact_person || 'No Contact'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => onPreviewDeviceChange('desktop')}
                        className={`p-1 rounded-md text-xs ${
                          previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onPreviewDeviceChange('mobile')}
                        className={`p-1 rounded-md text-xs ${
                          previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-400'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Email Preview Frame */}
                  {(() => {
                    const { subject, html } = getInterpolatedHtml(step.html_content, step.subject);
                    return (
                      <div
                        className={`mx-auto border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white shadow-lg ${
                          previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
                        }`}
                      >
                        <div className="p-3 bg-slate-100 border-b text-slate-800 text-xs space-y-1">
                          <p className="font-bold">Subject: {subject}</p>
                          <p className="text-[10px] text-slate-500">
                            Preheader: {step.preheader || '—'}
                          </p>
                        </div>
                        <div
                          className="p-5 text-slate-800 text-xs leading-relaxed space-y-3"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
