import React from 'react';
import { Search, Filter, RefreshCw, Send, Workflow, Trash2 } from 'lucide-react';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from './types';

interface LeadFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  followUpFilter: string;
  setFollowUpFilter: (value: string) => void;
  onResetFilters: () => void;
  loading: boolean;
  totalLeadsCount: number;
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onOpenSequenceEnrollModal: () => void;
  onBatchDelete: () => void;
  launchOutreachHandler?: (selectedLeadIds?: string[]) => void;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  handleSearchSubmit,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  followUpFilter,
  setFollowUpFilter,
  onResetFilters,
  loading,
  totalLeadsCount,
  selectedIds,
  onClearSelection,
  onOpenSequenceEnrollModal,
  onBatchDelete,
  launchOutreachHandler
}) => {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, contact person, email, use case, city..."
            className="w-full pl-10 pr-24 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-200 text-[10px] font-bold transition-all"
          >
            Search
          </button>
        </form>

        {/* Quick Refresh */}
        <button
          onClick={onResetFilters}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
          title="Reset Filters & Reload"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Statuses ({totalLeadsCount})</option>
          {STATUS_OPTIONS.map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Priorities</option>
          {PRIORITY_OPTIONS.map(pr => (
            <option key={pr} value={pr}>{pr} Priority</option>
          ))}
        </select>

        {/* Follow-up Filter */}
        <select
          value={followUpFilter}
          onChange={(e) => setFollowUpFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Follow-ups</option>
          <option value="today">Due Today</option>
          <option value="overdue">Overdue</option>
          <option value="upcoming">Upcoming</option>
          <option value="none">No Follow-up Scheduled</option>
        </select>

        {/* Batch Actions Toolbar when leads selected */}
        {selectedIds.size > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 rounded-2xl">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300">
              {selectedIds.size} selected
            </span>

            {launchOutreachHandler && (
              <button
                onClick={() => launchOutreachHandler(Array.from(selectedIds))}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                title="Launch Outreach Campaign with selected leads"
              >
                <Send className="w-3 h-3 text-amber-300" />
                <span>Launch Campaign</span>
              </button>
            )}

            <button
              onClick={onOpenSequenceEnrollModal}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm"
              title="Enroll selected leads into an automated multi-step email sequence"
            >
              <Workflow className="w-3 h-3 text-white" />
              <span>Start Email Sequence</span>
            </button>

            <button
              onClick={onBatchDelete}
              className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
              title="Delete Selected Leads"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>

            <button
              onClick={onClearSelection}
              className="px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 text-[10px] font-bold"
              title="Clear Selection"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
