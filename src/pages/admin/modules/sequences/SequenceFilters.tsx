import React from 'react';
import { Search } from 'lucide-react';
import { SequenceFilterStatus } from './types';

interface SequenceFiltersProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  statusFilter: SequenceFilterStatus;
  onStatusFilterChange: (status: SequenceFilterStatus) => void;
}

const STATUS_OPTIONS: SequenceFilterStatus[] = ['All', 'Active', 'Paused', 'Draft', 'Completed'];

export const SequenceFilters: React.FC<SequenceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search sequences..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
        {STATUS_OPTIONS.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => onStatusFilterChange(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === st
                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>
    </div>
  );
};
