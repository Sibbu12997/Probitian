import React, { useState, useEffect } from 'react';
import { Upload, Search, Trash2, Copy, CheckCircle2, File, Image as ImageIcon, FileText, Folder } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { MediaItem } from '../../../types';

export const MediaLibraryManager: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const data = await cmsService.getMediaItems();
    setMedia(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // In web applet, convert uploaded file to Object URL or Data URL for preview storage
      const objectUrl = URL.createObjectURL(file);
      await cmsService.addMediaItem({
        filename: file.name,
        url: objectUrl,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        folder: activeFolder === 'all' ? 'general' : activeFolder
      });
    }

    setMessage('Media files uploaded successfully!');
    loadMedia();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this media asset?')) {
      await cmsService.deleteMediaItem(id);
      setMessage('Media item deleted.');
      loadMedia();
      setTimeout(() => setMessage(null), 3000);
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
          <h2 className="text-xl font-bold text-white">Media Library Manager</h2>
          <p className="text-xs text-slate-400">Upload PNG, SVG, WEBP, JPG, PDF, ZIP & Video assets to Supabase Storage.</p>
        </div>

        <label className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all">
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
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          {['all', 'branding', 'projects', 'blogs', 'general'].map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                activeFolder === folder ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {folder}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filteredMedia.map((item) => (
          <div key={item.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 group relative">
            <div className="aspect-square rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
              {item.mime_type?.startsWith('image/') || item.filename.endsWith('.svg') ? (
                <img src={item.url} alt={item.filename} className="w-full h-full object-contain p-1" />
              ) : (
                <File className="w-8 h-8 text-purple-400" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-white truncate" title={item.filename}>{item.filename}</p>
              <p className="text-[10px] text-slate-400 font-mono">{(item.size_bytes / 1024).toFixed(1)} KB</p>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <button
                onClick={() => handleCopyUrl(item.url, item.id)}
                className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedId === item.id ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => handleDelete(item.id)}
                className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
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
