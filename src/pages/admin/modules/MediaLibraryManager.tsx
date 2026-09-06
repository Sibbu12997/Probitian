import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Search,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  File,
  Image as ImageIcon,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  ExternalLink,
  ShieldAlert,
  Folder,
  Layers,
  FileText,
  Eye,
  Info
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { MediaItem, MediaReference, MediaBulkDeleteResult } from '../../../types';

export const MediaLibraryManager: React.FC = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFolder, setActiveFolder] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification banners
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
    details?: string[];
  } | null>(null);

  // Modals & Dialogs
  const [confirmSingleDelete, setConfirmSingleDelete] = useState<MediaItem | null>(null);
  const [singleDeleteChecking, setSingleDeleteChecking] = useState(false);
  const [singleDeleteReferences, setSingleDeleteReferences] = useState<MediaReference[] | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkResult, setBulkResult] = useState<MediaBulkDeleteResult | null>(null);

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await cmsService.getMedia();
      setMedia(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load media:', err);
      setMessage({
        type: 'error',
        text: 'Failed to load media library from server.',
        details: [err?.message || 'Network or server error']
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload handler (supporting multiple files, drag-and-drop, and file input)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadStatus(`Uploading ${files.length} file(s)...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatus(`Uploading (${i + 1}/${files.length}): ${file.name}`);

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const targetFolder = activeFolder === 'all' ? 'general' : activeFolder;
        const res = await cmsService.uploadMediaFile({
          fileData: dataUrl,
          filename: file.name,
          category: targetFolder,
          folder: targetFolder,
          altText: file.name
        });

        if (res.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${file.name}: ${res.error || 'Upload rejected by server'}`);
        }
      } catch (err: any) {
        failCount++;
        errors.push(`${file.name}: ${err?.message || 'Failed to read or upload file'}`);
      }
    }

    setIsUploading(false);
    setUploadStatus(null);

    if (failCount === 0 && successCount > 0) {
      setMessage({
        type: 'success',
        text: `Successfully uploaded ${successCount} file(s) to Supabase Storage!`
      });
    } else if (successCount > 0 && failCount > 0) {
      setMessage({
        type: 'warning',
        text: `Uploaded ${successCount} file(s), but ${failCount} failed.`,
        details: errors
      });
    } else {
      setMessage({
        type: 'error',
        text: 'Upload failed.',
        details: errors
      });
    }

    await loadMedia();
    setTimeout(() => setMessage(null), 7000);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Selection handlers
  const filteredMedia = media.filter((m) => {
    const filenameMatch = m.filename.toLowerCase().includes(search.toLowerCase());
    const folderMatch = activeFolder === 'all' || m.folder === activeFolder;
    return filenameMatch && folderMatch;
  });

  const allFilteredIds = filteredMedia.map((m) => m.id);
  const isAllSelected =
    filteredMedia.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const isSomeSelected =
    filteredMedia.some((m) => selectedIds.has(m.id)) && !isAllSelected;

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Single Delete Flow with Reference Verification
  const initiateSingleDelete = async (item: MediaItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmSingleDelete(item);
    setSingleDeleteChecking(true);
    setSingleDeleteReferences(null);

    try {
      const refCheck = await cmsService.checkMediaReferences(item.id);
      if (refCheck && refCheck.references) {
        setSingleDeleteReferences(refCheck.references);
      } else {
        setSingleDeleteReferences([]);
      }
    } catch (err) {
      console.warn('Reference check error:', err);
      setSingleDeleteReferences([]);
    } finally {
      setSingleDeleteChecking(false);
    }
  };

  const executeSingleDelete = async () => {
    if (!confirmSingleDelete) return;

    setIsDeletingSingle(true);
    const itemToDelete = confirmSingleDelete;

    try {
      const res = await cmsService.deleteMediaItem(itemToDelete.id);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Media "${itemToDelete.filename}" was permanently deleted from storage and database.`
        });
        // Remove from local state
        setMedia((prev) => prev.filter((m) => m.id !== itemToDelete.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(itemToDelete.id);
          return next;
        });
        setConfirmSingleDelete(null);
      } else if (res.in_use && res.references && res.references.length > 0) {
        // Backend blocked because it is in use
        setSingleDeleteReferences(res.references);
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Failed to delete asset.'
        });
        setConfirmSingleDelete(null);
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Network error during media deletion.'
      });
      setConfirmSingleDelete(null);
    } finally {
      setIsDeletingSingle(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  // Bulk Delete Flow with In-Use Protection
  const initiateBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmBulkDelete(true);
  };

  const executeBulkDelete = async () => {
    const idsToProcess: string[] = Array.from(selectedIds);
    if (idsToProcess.length === 0) return;

    setIsBulkDeleting(true);

    try {
      const result = await cmsService.bulkDeleteMedia(idsToProcess);
      setBulkResult(result);
      setConfirmBulkDelete(false);

      // Remove successfully deleted items from local state
      if (result.deleted && result.deleted.length > 0) {
        const deletedIdSet = new Set(result.deleted.map((d) => d.id));
        setMedia((prev) => prev.filter((m) => !deletedIdSet.has(m.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedIdSet.forEach((id) => next.delete(id));
          return next;
        });
      }

      // If all deleted without skips
      if (result.skipped_count === 0 && result.failed_count === 0) {
        setMessage({
          type: 'success',
          text: `Successfully deleted ${result.deleted_count} unused asset(s).`
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (err: any) {
      setConfirmBulkDelete(false);
      setMessage({
        type: 'error',
        text: err?.message || 'Bulk delete operation failed.'
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            id="media-library-heading"
            className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent"
          >
            Media Library Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise media management with real-time content reference protection and synchronized Supabase Storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-media-btn"
            onClick={loadMedia}
            disabled={loading || isUploading}
            title="Refresh media library"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <label
            id="upload-media-label"
            className={`px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all ${
              isUploading ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.zip,video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Drag & Drop Banner (Active when dragging) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-800 hover:border-purple-400/50 bg-slate-50/50 dark:bg-slate-950/30'
        }`}
      >
        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Drag & drop images, PDFs, or videos here to upload
          </p>
          <p className="text-[11px] text-slate-400">
            Automatic SHA-256 sanitization, MIME verification, and sync to Supabase bucket
          </p>
          {uploadStatus && (
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 animate-pulse mt-1">
              {uploadStatus}
            </p>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          id="media-notification-banner"
          className={`p-4 rounded-xl text-xs font-semibold flex items-start justify-between gap-3 shadow-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : message.type === 'warning'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300'
              : message.type === 'info'
              ? 'bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : message.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            ) : message.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{message.text}</p>
              {message.details && message.details.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] opacity-90">
                  {message.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Selection Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Folder Filter */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
            {['all', 'branding', 'projects', 'blogs', 'general'].map((folder) => (
              <button
                key={folder}
                id={`filter-folder-${folder}`}
                onClick={() => setActiveFolder(folder)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeFolder === folder
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>{folder}</span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="search-media-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or format..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Selection Action Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-3">
            {/* Master Select All / Deselect All */}
            <button
              id="select-all-media-btn"
              onClick={handleSelectAllToggle}
              disabled={filteredMedia.length === 0}
              className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-purple-600" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 rounded border-2 border-purple-600 bg-purple-600/30 flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-purple-600 rounded-sm" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{isAllSelected ? 'Deselect All' : `Select All (${filteredMedia.length})`}</span>
            </button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 pl-3 border-l border-slate-300 dark:border-slate-700">
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-extrabold text-[11px]">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={handleClearSelection}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Bulk Actions Button */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                id="bulk-delete-media-btn"
                onClick={initiateBulkDelete}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-sm shadow-red-600/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Media Grid / Loading / Empty States */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading media assets...</p>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {search ? 'No matching media assets' : 'Media library is empty'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? `No files matched "${search}". Try checking your spelling or clearing the search query.`
              : 'Upload images, banners, icons, or PDF documents to build your asset library.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const isImage = item.mime_type?.startsWith('image/') || item.filename.match(/\.(png|jpe?g|webp|gif|svg|avif)$/i);
            const isPdf = item.mime_type === 'application/pdf' || item.filename.endsWith('.pdf');

            return (
              <div
                key={item.id}
                id={`media-card-${item.id}`}
                onClick={() => toggleSelect(item.id)}
                className={`p-3 rounded-xl bg-white dark:bg-slate-900 border transition-all relative group shadow-sm flex flex-col justify-between cursor-pointer select-none ${
                  isSelected
                    ? 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-50/40 dark:bg-purple-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Selection Checkbox (Top Left) */}
                <button
                  type="button"
                  id={`select-media-checkbox-${item.id}`}
                  onClick={(e) => toggleSelect(item.id, e)}
                  aria-label={`Select ${item.filename}`}
                  className={`absolute top-4 left-4 z-10 p-1 rounded-md transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/90 dark:bg-slate-900/90 text-slate-400 opacity-70 group-hover:opacity-100 hover:text-purple-600 shadow-sm'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                {/* Quick Preview Button (Top Right) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewItem(item);
                  }}
                  aria-label={`Preview ${item.filename}`}
                  className="absolute top-4 right-4 z-10 p-1 rounded-md bg-white/90 dark:bg-slate-900/90 text-slate-500 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                  title="Preview asset"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                {/* Thumbnail Display */}
                <div className="aspect-square rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center overflow-hidden mb-2 relative">
                  {isImage ? (
                    <img
                      src={item.url}
                      alt={item.alt_text || item.filename}
                      className="w-full h-full object-contain p-1.5 transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : isPdf ? (
                    <div className="flex flex-col items-center gap-1 text-red-500">
                      <FileText className="w-10 h-10" />
                      <span className="text-[10px] font-bold uppercase">PDF</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-purple-500">
                      <File className="w-10 h-10" />
                      <span className="text-[10px] font-bold uppercase">FILE</span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-1 mb-2">
                  <p
                    className="text-xs font-bold text-slate-900 dark:text-white truncate"
                    title={item.filename}
                  >
                    {item.filename}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{((item.size_bytes || item.file_size || 0) / 1024).toFixed(1)} KB</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 capitalize">
                      {item.folder || 'general'}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.url, item.id)}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedId === item.id ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    type="button"
                    id={`delete-media-btn-${item.id}`}
                    onClick={(e) => initiateSingleDelete(item, e)}
                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Delete media asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION & REFERENCE CHECK MODAL */}
      {confirmSingleDelete && (
        <div
          id="single-delete-modal-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !isDeletingSingle && setConfirmSingleDelete(null)}
        >
          <div
            id="single-delete-modal-content"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  singleDeleteReferences && singleDeleteReferences.length > 0
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  {singleDeleteReferences && singleDeleteReferences.length > 0 ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <Trash2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {singleDeleteReferences && singleDeleteReferences.length > 0
                      ? 'Asset Is In Use (Protected)'
                      : 'Delete Media Asset'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {singleDeleteReferences && singleDeleteReferences.length > 0
                      ? 'This file cannot be deleted because it is referenced in content.'
                      : 'Verify usage before permanent removal from Supabase Storage.'}
                  </p>
                </div>
              </div>

              {!isDeletingSingle && (
                <button
                  onClick={() => setConfirmSingleDelete(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Asset Preview Card */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {confirmSingleDelete.mime_type?.startsWith('image/') ||
                confirmSingleDelete.filename.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? (
                  <img
                    src={confirmSingleDelete.url}
                    alt={confirmSingleDelete.filename}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <File className="w-6 h-6 text-purple-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {confirmSingleDelete.filename}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {((confirmSingleDelete.size_bytes || confirmSingleDelete.file_size || 0) / 1024).toFixed(1)} KB •{' '}
                  <span className="capitalize">{confirmSingleDelete.folder || 'general'}</span>
                </p>
              </div>
            </div>

            {/* Status of Reference Check */}
            {singleDeleteChecking ? (
              <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 flex items-center gap-3 text-xs text-purple-700 dark:text-purple-300">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <span>Scanning database & content models for active references...</span>
              </div>
            ) : singleDeleteReferences && singleDeleteReferences.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Referenced in {singleDeleteReferences.length} location(s):</span>
                  </p>
                  <p className="text-[11px] opacity-90">
                    To prevent broken images or missing content on your live website, remove or replace this asset in the following locations before deleting:
                  </p>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  {singleDeleteReferences.map((ref, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2"
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{ref.location}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{ref.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Safe to delete: No active content references found.</span>
                </p>
                <p className="text-[11px]">
                  This action will permanently delete both the database record and the Supabase Storage object.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmSingleDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {singleDeleteReferences && singleDeleteReferences.length > 0 ? 'Close' : 'Cancel'}
              </button>

              {(!singleDeleteReferences || singleDeleteReferences.length === 0) && (
                <button
                  type="button"
                  id="confirm-delete-media-button"
                  onClick={executeSingleDelete}
                  disabled={singleDeleteChecking || isDeletingSingle}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingSingle ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION DIALOG */}
      {confirmBulkDelete && (
        <div
          id="bulk-delete-modal-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => !isBulkDeleting && setConfirmBulkDelete(false)}
        >
          <div
            id="bulk-delete-modal-content"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete {selectedIds.size} Selected Asset(s)?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Safe bulk deletion with automated reference preservation
                  </p>
                </div>
              </div>

              {!isBulkDeleting && (
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Automated In-Use Protection Active</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                The server will check each selected file individually. Files currently in use across blogs, projects, courses, or site settings will be <strong>safely skipped</strong> and reported in the completion summary.
              </p>
              <p className="text-[11px] leading-relaxed">
                All unused files will be permanently removed from both Supabase Storage and the database.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmBulkDelete(false)}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-bulk-delete-button"
                onClick={executeBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing {selectedIds.size} files...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Bulk Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE RESULTS SUMMARY MODAL */}
      {bulkResult && (
        <div
          id="bulk-result-modal-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setBulkResult(null)}
        >
          <div
            id="bulk-result-modal-content"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bulk Deletion Summary
                  </h3>
                  <p className="text-xs text-slate-500">
                    Processed {bulkResult.total_requested} media assets
                  </p>
                </div>
              </div>

              <button
                onClick={() => setBulkResult(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-center">
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {bulkResult.deleted_count}
                </p>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Deleted</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-center">
                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  {bulkResult.skipped_count}
                </p>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Protected / In Use</p>
              </div>

              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-center">
                <p className="text-xl font-extrabold text-red-600 dark:text-red-400">
                  {bulkResult.failed_count}
                </p>
                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Errors</p>
              </div>
            </div>

            {/* Skipped Items Details */}
            {bulkResult.skipped && bulkResult.skipped.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Protected Files (Preserved because they are in active use):</span>
                </p>

                <div className="max-h-52 overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                  {bulkResult.skipped.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {s.filename}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">
                          {s.references?.length || 0} active link(s)
                        </span>
                      </div>
                      {s.references && s.references.length > 0 && (
                        <ul className="text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside space-y-0.5 pl-1">
                          {s.references.slice(0, 3).map((r, rIdx) => (
                            <li key={rIdx}>
                              <strong className="text-slate-700 dark:text-slate-300">{r.location}</strong> ({r.details})
                            </li>
                          ))}
                          {s.references.length > 3 && (
                            <li className="text-slate-400 italic">
                              ...and {s.references.length - 3} more references
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Items Details */}
            {bulkResult.failed && bulkResult.failed.length > 0 && (
              <div className="space-y-1 text-xs text-red-600 dark:text-red-400">
                <p className="font-bold">Errors encountered:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {bulkResult.failed.map((f, idx) => (
                    <li key={idx}>
                      {f.filename || f.id}: {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBulkResult(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 cursor-pointer"
              >
                Dismiss Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSET PREVIEW MODAL */}
      {previewItem && (
        <div
          id="asset-preview-modal-backdrop"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewItem(null)}
        >
          <div
            id="asset-preview-modal-content"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="min-w-0 pr-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {previewItem.filename}
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {((previewItem.size_bytes || previewItem.file_size || 0) / 1024).toFixed(1)} KB • {previewItem.mime_type || 'Unknown MIME'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              {previewItem.mime_type?.startsWith('image/') ||
              previewItem.filename.match(/\.(png|jpe?g|webp|gif|svg)$/i) ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.filename}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                />
              ) : (
                <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                  <File className="w-16 h-16 text-purple-500" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Preview not available for this file type
                  </p>
                  <a
                    href={previewItem.url}
                    download={previewItem.filename}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
                  >
                    Download Asset
                  </a>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
              <button
                onClick={() => handleCopyUrl(previewItem.url, previewItem.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedId === previewItem.id ? 'URL Copied!' : 'Copy Public Link'}</span>
              </button>

              <button
                onClick={() => {
                  const item = previewItem;
                  setPreviewItem(null);
                  initiateSingleDelete(item);
                }}
                className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
