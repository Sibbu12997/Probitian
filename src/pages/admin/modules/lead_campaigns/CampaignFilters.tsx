import React from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface CampaignFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const CampaignFilters: React.FC<CampaignFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  loading
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search lead outreach campaigns..."
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500 dark:text-white"
        />
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="sent">Sent</option>
          <option value="partially_sent">Partially Sent</option>
          <option value="failed">Failed</option>
        </select>

        <button
          onClick={onRefresh}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
