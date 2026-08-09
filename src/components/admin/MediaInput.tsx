import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface MediaInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function MediaInput({ label, value, onChange, className = '' }: MediaInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none font-mono"
          placeholder="https://"
        />
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center transition-colors shadow-sm"
          title="Select from Media Library"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>
      
      {showPicker && (
        <MediaPicker 
          selectedUrl={value}
          onSelect={onChange}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
