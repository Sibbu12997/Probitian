import React from 'react';
import { Users, Plus, Clock, Ban } from 'lucide-react';
import { SequenceLead } from '../../../../types';
import { SequenceLeadTabFilter } from './types';

interface SequenceEnrolledLeadsTableProps {
  sequenceLeads: SequenceLead[];
  totalSteps: number;
  leadTabFilter: SequenceLeadTabFilter;
  onLeadTabFilterChange: (filter: SequenceLeadTabFilter) => void;
  onOpenEnrollModal: () => void;
  onStopLead: (leadId: string, companyName: string) => void;
}

const TAB_FILTERS: SequenceLeadTabFilter[] = ['All', 'Active', 'Completed', 'Stopped'];

export const SequenceEnrolledLeadsTable: React.FC<SequenceEnrolledLeadsTableProps> = ({
  sequenceLeads,
  totalSteps,
  leadTabFilter,
  onLeadTabFilterChange,
  onOpenEnrollModal,
  onStopLead
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Targeted Leads Enrolled in this Sequence
          </span>
        </div>

        <div className="flex items-center gap-2">
          {TAB_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onLeadTabFilterChange(filter)}
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                leadTabFilter === filter
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {filter}
            </button>
          ))}

          <button
            type="button"
            onClick={onOpenEnrollModal}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-purple-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Enroll More Leads</span>
          </button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {sequenceLeads.length === 0 ? (
          <div className="py-16 text-center p-6 space-y-3">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs text-slate-500 font-semibold">No leads currently enrolled under this filter.</p>
            <button
              type="button"
              onClick={onOpenEnrollModal}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Leads Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Company & Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Current Progress</th>
                  <th className="py-3 px-4">Next Send Scheduled</th>
                  <th className="py-3 px-4">Last Sent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sequenceLeads.map((sl) => {
                  const lead = sl.lead || ({} as any);
                  return (
                    <tr key={sl.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {lead.company_name || '—'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {lead.contact_person || '—'} &bull; <span className="font-mono text-[10px]">{lead.email}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                            sl.status === 'Active' || sl.status === 'Pending'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                              : sl.status === 'Completed'
                              ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300'
                              : 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {sl.status}
                        </span>
                        {sl.stop_reason && (
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Reason: {sl.stop_reason}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          <span>Step {sl.current_step || 0}</span>
                          <span className="text-slate-400">/ {totalSteps}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {sl.next_send_at ? (
                          <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(sl.next_send_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {sl.last_sent_at ? (
                          <span className="font-mono text-[11px] text-slate-500">
                            {new Date(sl.last_sent_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not sent yet</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {sl.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => onStopLead(sl.lead_id, lead.company_name || 'this lead')}
                            className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-600 text-[11px] font-bold inline-flex items-center gap-1"
                            title="Stop sequence outreach for this lead"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Stop</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
