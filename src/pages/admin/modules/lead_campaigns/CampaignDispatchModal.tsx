import React from 'react';
import {
  Send,
  X,
  Search,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { LeadCampaign, Lead } from '../../../../types';
import { BroadcastResult } from './types';

interface CampaignDispatchModalProps {
  targetCampaign: LeadCampaign;
  selectedLeadIds: Set<string>;
  broadcastFilteredLeads: Lead[];
  broadcastStatusFilter: string;
  setBroadcastStatusFilter: (status: string) => void;
  broadcastPriorityFilter: string;
  setBroadcastPriorityFilter: (priority: string) => void;
  broadcastSearchTerm: string;
  setBroadcastSearchTerm: (term: string) => void;
  isSendingBulk: boolean;
  broadcastResult: BroadcastResult | null;
  onClose: () => void;
  onToggleLead: (id: string) => void;
  onSelectAllLeads: (ids: string[]) => void;
  onExecuteBroadcast: () => void;
}

export const CampaignDispatchModal: React.FC<CampaignDispatchModalProps> = ({
  targetCampaign,
  selectedLeadIds,
  broadcastFilteredLeads,
  broadcastStatusFilter,
  setBroadcastStatusFilter,
  broadcastPriorityFilter,
  setBroadcastPriorityFilter,
  broadcastSearchTerm,
  setBroadcastSearchTerm,
  isSendingBulk,
  broadcastResult,
  onClose,
  onToggleLead,
  onSelectAllLeads,
  onExecuteBroadcast
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Dispatch Outreach: {targetCampaign.name}
              </h3>
              <p className="text-[11px] text-slate-500">
                Select target B2B prospects for this outreach sequence.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Campaign summary card */}
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
            <p className="font-bold text-purple-900 dark:text-purple-200 text-xs">
              Subject: {targetCampaign.subject}
            </p>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              Each email will be dynamically customized with the recipient lead's Company Name, Use Case, and Contact Person.
            </p>
          </div>

          {/* Lead Audience Filters */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Select Recipient Leads ({selectedLeadIds.size} selected):
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={broadcastStatusFilter}
                  onChange={(e) => setBroadcastStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                >
                  <option value="all">All Statuses</option>
                  <option value="Not Contacted">Not Contacted Only</option>
                  <option value="Contacted">Already Contacted</option>
                  <option value="Opened">Opened</option>
                  <option value="Replied">Replied</option>
                </select>

                <select
                  value={broadcastPriorityFilter}
                  onChange={(e) => setBroadcastPriorityFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={broadcastSearchTerm}
                onChange={(e) => setBroadcastSearchTerm(e.target.value)}
                placeholder="Search in recipient list..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none dark:text-white"
              />
            </div>

            {/* Recipient Selection Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">
                      <button
                        onClick={() => onSelectAllLeads(broadcastFilteredLeads.map(l => l.id))}
                        className="text-slate-400 hover:text-purple-600 cursor-pointer"
                      >
                        {selectedLeadIds.size > 0 && selectedLeadIds.size === broadcastFilteredLeads.length ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-3">Company & Contact</th>
                    <th className="py-2 px-3">Email</th>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {broadcastFilteredLeads.map(lead => {
                    const isSelected = selectedLeadIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onToggleLead(lead.id)}
                        className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                          isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{lead.company_name}</span>
                          {lead.contact_person && (
                            <span className="text-slate-500 text-[10px] ml-1.5">({lead.contact_person})</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{lead.email}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-bold">{lead.lead_priority}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] text-slate-500">{lead.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Broadcast Result */}
          {broadcastResult && (
            <div
              className={`p-4 rounded-2xl text-xs space-y-1 ${
                broadcastResult.success
                  ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30'
              }`}
            >
              <p className="font-bold flex items-center gap-1.5">
                {broadcastResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span>{broadcastResult.message}</span>
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onExecuteBroadcast}
            disabled={isSendingBulk || selectedLeadIds.size === 0}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-600/20 disabled:opacity-50 cursor-pointer"
          >
            {isSendingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-amber-300" />}
            <span>Send to {selectedLeadIds.size} Leads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
