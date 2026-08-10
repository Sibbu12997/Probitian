import React, { useState, useEffect } from 'react';
import { Upload, Search, Trash2, Copy, CheckCircle2, File, Image as ImageIcon, FileText, Folder } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { MediaItem } from '../../../types';

export const MediaLibraryManager: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const data = await cmsService.getMedia();
    setMedia(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let lastError = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const targetCategory = activeFolder === 'all' ? 'general' : activeFolder;
        const res = await cmsService.uploadMediaFile({
          fileData: dataUrl,
          filename: file.name,
          category: targetCategory,
          folder: targetCategory,
          altText: file.name
        });

        if (res.success) {
          successCount++;
        } else {
          failCount++;
          lastError = res.error || 'Upload error';
        }
      } catch (err: any) {
        failCount++;
        lastError = err?.message || 'Upload exception';
      }
    }

    if (failCount > 0 && successCount === 0) {
      setMessage({ type: 'error', text: `Upload failed: ${lastError}` });
    } else if (failCount > 0) {
      setMessage({ type: 'error', text: `Uploaded ${successCount} file(s), but ${failCount} failed (${lastError}).` });
    } else {
      setMessage({ type: 'success', text: `Successfully uploaded ${successCount} file(s) to Supabase Storage!` });
    }

    loadMedia();
    setTimeout(() => setMessage(null), 4000);
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this media asset from Supabase Storage?')) {
      const res = await cmsService.deleteMedia(id);
      if (res.success) {
        setMessage({ type: 'success', text: 'Media asset deleted successfully.' });
        loadMedia();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to delete asset.' });
      }
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const filteredMedia = media.filter((m) => {
    const matchesSearch = m.filename.toLowerCase().includes(search.toLowerCase());
    const matchesFolder = activeFolder === 'all' || m.folder === activeFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
            Media Library Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Upload and manage PNG, SVG, WEBP, JPG, PDF & Video assets for your website.</p>
        </div>

        <label className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all">
          <Upload className="w-4 h-4" />
          <span>Upload Files</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.zip,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
          <CheckCircle2 className={`w-4 h-4 ${message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {['all', 'branding', 'projects', 'blogs', 'general'].map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                activeFolder === folder
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMedia.map((item) => (
          <div key={item.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 group relative shadow-sm">
            <div className="aspect-square rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden">
              {item.mime_type?.startsWith('image/') || item.filename.endsWith('.svg') ? (
                <img src={item.url} alt={item.filename} className="w-full h-full object-contain p-1" />
              ) : (
                <File className="w-8 h-8 text-purple-500" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={item.filename}>{item.filename}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{(item.size_bytes / 1024).toFixed(1)} KB</p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleCopyUrl(item.url, item.id)}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedId === item.id ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
