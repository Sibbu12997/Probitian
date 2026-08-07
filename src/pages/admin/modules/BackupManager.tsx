import React, { useState } from 'react';
import { Download, Upload, Database, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { isSupabaseConfigured } from '../../../lib/supabase';

export const BackupManager: React.FC = () => {
  const [restoring, setRestoring] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleExportFullBackup = async () => {
    const backupData = await cmsService.exportFullDatabaseBackup();
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `ProBItian_Full_CMS_Backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setStatus('Full database JSON export downloaded successfully!');
    setTimeout(() => setStatus(null), 4000);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setRestoring(true);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const jsonContent = JSON.parse(event.target?.result as string);
        await cmsService.restoreFullDatabaseBackup(jsonContent);
        setStatus('CMS database restored from JSON backup successfully!');
      } catch (err: any) {
        setStatus(`Error restoring backup: ${err.message}`);
      } finally {
        setRestoring(false);
        setTimeout(() => setStatus(null), 5000);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-white">Database Backup & Disaster Recovery</h2>
        <p className="text-xs text-slate-400">Export or restore full JSON backups of projects, blogs, settings, and inquiries.</p>
      </div>

      {status && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{status}</span>
        </div>
      )}

      {/* Supabase Status Banner */}
      <div className={`p-5 rounded-2xl border ${
        isSupabaseConfigured() ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      } flex items-start gap-3`}>
        {isSupabaseConfigured() ? (
          <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1 text-xs">
          <h3 className="font-bold text-sm">
            {isSupabaseConfigured() ? 'Supabase Live Connection Active' : 'LocalStorage Cache Mode Active'}
          </h3>
          <p className="text-slate-300">
            {isSupabaseConfigured()
              ? 'All modifications sync directly with PostgreSQL database on Supabase cloud.'
              : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable instant cloud syncing.'}
          </p>
        </div>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
          <div className="p-3 rounded-xl bg-purple-500/10 w-fit text-purple-400">
            <Download className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Export Complete Backup</h3>
            <p className="text-xs text-slate-400 mt-1">Download a single structured JSON file containing all CMS tables and settings.</p>
          </div>
          <button
            onClick={handleExportFullBackup}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 cursor-pointer transition-all"
          >
            Download JSON Backup
          </button>
        </div>

        {/* Import Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
          <div className="p-3 rounded-xl bg-amber-500/10 w-fit text-amber-400">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Restore From Backup</h3>
            <p className="text-xs text-slate-400 mt-1">Import a JSON backup file to overwrite or seed the database tables.</p>
          </div>
          <label className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
            {restoring ? (
              <span>Restoring...</span>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Select Backup JSON File</span>
              </>
            )}
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              disabled={restoring}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
