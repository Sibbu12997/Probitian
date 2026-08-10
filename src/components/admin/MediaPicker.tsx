import React, { useState, useEffect } from 'react';
import { X, Upload, Search, Image as ImageIcon, CheckCircle, Trash2 } from 'lucide-react';
import { MediaItem } from '../../types';
import { cmsService } from '../../services/cmsService';

interface MediaPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  selectedUrl?: string;
}

export function MediaPicker({ onSelect, onClose, selectedUrl }: MediaPickerProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const data = await cmsService.getMedia();
      setMedia(data);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setUploading(true);
      setErrorMessage(null);
      const file = e.target.files[0];

      // Convert file to Base64 Data URL for server processing
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const result = await cmsService.uploadMediaFile({
        fileData: dataUrl,
        filename: file.name,
        category: 'general',
        altText: file.name
      });

      if (!result.success || !result.media) {
        setErrorMessage(result.error || 'Upload failed.');
        return;
      }
      
      await fetchMedia();
      onSelect(result.media.public_url || result.media.url);
      onClose();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setErrorMessage(error?.message || 'Error processing upload.');
    } finally {
      setUploading(false);
    }
  };

  const filteredMedia = media.filter(item => 
    item.filename.toLowerCase().includes(search.toLowerCase()) || 
    item.folder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-500" />
            Media Library
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Actions */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'library' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Library
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'upload' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Upload New
            </button>
          </div>
          
          {activeTab === 'library' && (
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search media..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
          {activeTab === 'upload' ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                  <Upload className={`w-8 h-8 text-purple-600 dark:text-purple-400 ${uploading ? 'animate-bounce' : ''}`} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {uploading ? 'Uploading...' : 'Drop image here or click to upload'}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Supports JPG, PNG, WEBP, SVG
                </p>
              </div>
            </div>
          ) : (
            <>
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No media found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredMedia.map(item => {
                    const isSelected = item.url === selectedUrl;
                    return (
                      <div 
                        key={item.id}
                        onClick={() => {
                          onSelect(item.url);
                          onClose();
                        }}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-purple-500 ring-4 ring-purple-500/20' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-purple-400'
                        }`}
                      >
                        <img 
                          src={item.url} 
                          alt={item.filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] text-white truncate">{item.filename}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
