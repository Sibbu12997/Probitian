import React from 'react';
import {
  Building2,
  Upload,
  Plus,
  CheckSquare,
  Square,
  Linkedin,
  Phone,
  MapPin,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Lead, LeadStatus, STATUS_OPTIONS, STATUS_COLORS, PRIORITY_COLORS } from './types';

interface LeadTableProps {
  leads: Lead[];
  loading: boolean;
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectOne: (id: string) => void;
  onQuickStatusChange: (leadId: string, newStatus: LeadStatus) => void;
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onOpenImportModal: () => void;
  onOpenCreateModal: () => void;
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  todayStr: string;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  loading,
  selectedIds,
  toggleSelectAll,
  toggleSelectOne,
  onQuickStatusChange,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onOpenImportModal,
  onOpenCreateModal,
  searchTerm,
  statusFilter,
  priorityFilter,
  todayStr
}) => {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-500" />
          <p className="text-xs font-medium">Loading business leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 px-4">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Business Leads Found</p>
          <p className="text-xs text-slate-500 max-w-md">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your search criteria or reset filters.'
              : 'Get started by uploading your CSV lead list or adding your first enterprise lead manually.'}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={onOpenCreateModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Single Lead</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3.5 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-purple-600 cursor-pointer"
                    title={selectedIds.size === leads.length ? 'Deselect All' : 'Select All'}
                  >
                    {selectedIds.size > 0 && selectedIds.size === leads.length ? (
                      <CheckSquare className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-3">Company & Contact</th>
                <th className="py-3.5 px-3">Industry & Location</th>
                <th className="py-3.5 px-3">Power BI Use Case</th>
                <th className="py-3.5 px-3">Priority</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Follow-up</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {leads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const statusStyling = STATUS_COLORS[lead.status] || STATUS_COLORS['Not Contacted'];
                const priorityStyling = PRIORITY_COLORS[lead.lead_priority] || PRIORITY_COLORS['Medium'];

                const isOverdue =
                  lead.follow_up_date &&
                  lead.follow_up_date < todayStr &&
                  lead.status !== 'Converted' &&
                  lead.status !== 'Not Interested';
                const isDueToday = lead.follow_up_date && lead.follow_up_date === todayStr;

                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' : ''
                    }`}
                  >
                    {/* Selection Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => toggleSelectOne(lead.id)}
                        className="text-slate-400 hover:text-purple-600 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

                    {/* Company & Contact */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{lead.company_name}</span>
                        {lead.linkedin && (
                          <a
                            href={lead.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-600 transition-colors"
                            title="LinkedIn Profile"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {lead.contact_person && (
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {lead.contact_person}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-400">{lead.email}</span>
                        {lead.phone && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Industry & Location */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {lead.industry || '—'}
                      </div>
                      {lead.location && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{lead.location}</span>
                        </div>
                      )}
                    </td>

                    {/* Power BI Use Case */}
                    <td className="py-3 px-3 max-w-xs">
                      <p
                        className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2"
                        title={lead.powerbi_use_case || 'No use case described'}
                      >
                        {lead.powerbi_use_case || <span className="text-slate-400 italic">No use case specified</span>}
                      </p>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${priorityStyling.bg} ${priorityStyling.text} ${priorityStyling.border}`}
                      >
                        {lead.lead_priority}
                      </span>
                    </td>

                    {/* Interactive Status Selector */}
                    <td className="py-3 px-3">
                      <select
                        value={lead.status}
                        onChange={(e) => onQuickStatusChange(lead.id, e.target.value as LeadStatus)}
                        className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition-colors cursor-pointer focus:outline-none ${statusStyling.bg} ${statusStyling.text} ${statusStyling.border}`}
                      >
                        {STATUS_OPTIONS.map(st => (
                          <option key={st} value={st} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Follow-up Date */}
                    <td className="py-3 px-3">
                      {lead.follow_up_date ? (
                        <div
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isOverdue
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 animate-pulse'
                              : isDueToday
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-black'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{lead.follow_up_date}</span>
                          {isOverdue && <span className="text-[9px]">(Overdue)</span>}
                          {isDueToday && <span className="text-[9px]">(Today)</span>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewLead(lead)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-500/10 text-slate-600 dark:text-slate-300 hover:text-purple-600 transition-colors"
                          title="View Lead Profile & Outreach History"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditLead(lead)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                          title="Edit Lead"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteLead(lead)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-colors"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
