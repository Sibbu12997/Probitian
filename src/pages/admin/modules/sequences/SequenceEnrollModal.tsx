import React from 'react';
import { Users, X, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Lead } from '../../../../types';

interface SequenceEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceName: string;
  eligibleLeads: Lead[];
  selectedLeadIds: string[];
  onSelectedLeadIdsChange: (ids: string[]) => void;
  enrollSearch: string;
  onEnrollSearchChange: (search: string) => void;
  onExecuteEnrollment: () => void;
  isEnrolling: boolean;
}

export const SequenceEnrollModal: React.FC<SequenceEnrollModalProps> = ({
  isOpen,
  onClose,
  sequenceName,
  eligibleLeads,
  selectedLeadIds,
  onSelectedLeadIdsChange,
  enrollSearch,
  onEnrollSearchChange,
  onExecuteEnrollment,
  isEnrolling
}) => {
  if (!isOpen) return null;

  const isAllSelected = eligibleLeads.length > 0 && selectedLeadIds.length === eligibleLeads.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      onSelectedLeadIdsChange([]);
    } else {
      onSelectedLeadIdsChange(eligibleLeads.map(l => l.id));
    }
  };

  const handleToggleLead = (leadId: string) => {
    if (selectedLeadIds.includes(leadId)) {
      onSelectedLeadIdsChange(selectedLeadIds.filter(id => id !== leadId));
    } else {
      onSelectedLeadIdsChange([...selectedLeadIds, leadId]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Enroll Leads into "{sequenceName}"</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select explicitly checked leads from CRM. Leads already enrolled are filtered out.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter available CRM leads..."
              value={enrollSearch}
              onChange={(e) => onEnrollSearchChange(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold"
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs font-bold text-purple-600">
              {selectedLeadIds.length} selected
            </span>
          </div>
        </div>

        {/* List of Available Leads */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800">
          {eligibleLeads.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No eligible unenrolled leads found matching your criteria.
            </div>
          ) : (
            eligibleLeads.map((lead) => {
              const isChecked = selectedLeadIds.includes(lead.id);
              return (
                <label
                  key={lead.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${
                    isChecked ? 'bg-purple-50 dark:bg-purple-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleLead(lead.id)}
                    className="rounded text-purple-600 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {lead.company_name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {lead.industry || 'General'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {lead.contact_person || '—'} &bull; <span className="font-mono text-[10px]">{lead.email}</span>
                    </span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">
            {selectedLeadIds.length} lead(s) ready to enroll in Step 1 (Immediate)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onExecuteEnrollment}
              disabled={selectedLeadIds.length === 0 || isEnrolling}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50"
            >
              {isEnrolling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Enroll {selectedLeadIds.length} Leads</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
