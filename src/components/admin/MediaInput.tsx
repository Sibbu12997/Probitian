import React, { useState } from 'react';
import { Image as ImageIcon, X, UploadCloud, RefreshCw } from 'lucide-react';
import { MediaPicker } from './MediaPicker';

interface MediaInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  className?: string;
  placeholder?: string;
}

export function MediaInput({ 
  label, 
  value, 
  onChange, 
  className = '',
  placeholder = 'https://...' 
}: MediaInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleClear = () => {
    onChange('');
    setImgError(false);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}</label>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
            title="Remove image reference (keeps asset in Media Library)"
          >
            <X className="w-3 h-3" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
        {value ? (
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl flex-1">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 border border-slate-300 dark:border-slate-600 flex items-center justify-center">
              {!imgError ? (
                <img
                  src={value}
                  alt="Selected Asset"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  setImgError(false);
                }}
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white font-mono truncate focus:outline-none"
                placeholder={placeholder}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              title="Replace image from Media Library"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replace</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setImgError(false);
              }}
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:border-purple-500 focus:outline-none font-mono"
              placeholder={placeholder}
            />
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
              title="Select or upload from Media Library"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Media Library</span>
            </button>
          </div>
        )}
      </div>
      
      {showPicker && (
        <MediaPicker 
          selectedUrl={value}
          onSelect={(url) => {
            onChange(url);
            setImgError(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
