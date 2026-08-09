import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Youtube, ExternalLink, CheckCircle2, Play, X, AlertCircle, RefreshCw } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { YouTubeVideo } from '../../../types';

export const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Power BI');
  const [duration, setDuration] = useState('20m');
  const [views, setViews] = useState('1K views');
  const [message, setMessage] = useState<string | null>(null);

  // Edit State
  const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null);

  // Preview Modal
  const [previewingVideo, setPreviewingVideo] = useState<YouTubeVideo | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cmsService.getVideos();
      setVideos(data || []);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
      setError('Unable to load YouTube showcase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeId = (youtubeUrl: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = youtubeUrl.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    const youtubeId = extractYoutubeId(url) || 'pbi-mastery';
    const autoThumbnail = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    const newVideo: YouTubeVideo = {
      id: 'vid-' + Date.now(),
      title: title || 'Power BI Tutorial',
      description,
      thumbnail: autoThumbnail,
      duration: duration || '20m',
      views: views || '1K views',
      url,
      youtubeId,
      category
    };

    await cmsService.saveVideo(newVideo);
    setUrl('');
    setTitle('');
    setDescription('');
    setMessage('YouTube video added successfully to showcase!');
    loadVideos();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    const youtubeId = extractYoutubeId(editingVideo.url) || editingVideo.youtubeId || 'video-id';
    const autoThumbnail = editingVideo.thumbnail || `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    const updated: YouTubeVideo = {
      ...editingVideo,
      youtubeId,
      thumbnail: autoThumbnail
    };

    await cmsService.saveVideo(updated);
    setEditingVideo(null);
    setMessage('Video updated successfully!');
    loadVideos();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this video from the showcase?')) {
      await cmsService.deleteVideo(id);
      setMessage('Video removed.');
      loadVideos();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
          YouTube Videos & Playlists Manager
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage featured YouTube tutorials and project walkthroughs. Thumbnails and video IDs are extracted automatically.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadVideos}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-red-500 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Add Form */}
      <form onSubmit={handleAddVideo} className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
          <Youtube className="w-4 h-4" /> Add New YouTube Video
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">YouTube Video URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Video Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Complete Power BI DAX Masterclass..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="Power BI">Power BI</option>
              <option value="SQL">SQL</option>
              <option value="Excel">Excel</option>
              <option value="DAX">DAX</option>
              <option value="Python">Python</option>
              <option value="Career">Career Guidance</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Short Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Learn step-by-step how to build dynamic dashboard reports..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Video to Showcase</span>
        </button>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
          Loading YouTube videos...
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="p-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
          <Youtube className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No YouTube Videos in Showcase</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add a YouTube video link above to populate your video gallery.</p>
        </div>
      )}

      {/* Video Cards Grid */}
      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((vid) => (
            <div key={vid.id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 relative group shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div
                  onClick={() => setPreviewingVideo(vid)}
                  className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer group-hover:border-red-500/50 transition-colors"
                >
                  <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-white font-medium">
                    {vid.duration || '20m'}
                  </span>
                </div>

                <div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase tracking-wider">
                    {vid.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 mt-1">{vid.title}</h4>
                  {vid.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{vid.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => setPreviewingVideo(vid)}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" /> Preview
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingVideo(vid)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/10 text-slate-600 dark:text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                    title="Edit Video"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(vid.id)}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/10 text-slate-600 dark:text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-600" /> Edit YouTube Video Details
              </h3>
              <button
                onClick={() => setEditingVideo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateVideo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={editingVideo.title}
                  onChange={(e) => setEditingVideo({ ...editingVideo, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">YouTube URL</label>
                <input
                  type="url"
                  required
                  value={editingVideo.url}
                  onChange={(e) => setEditingVideo({ ...editingVideo, url: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={editingVideo.category}
                    onChange={(e) => setEditingVideo({ ...editingVideo, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="Power BI">Power BI</option>
                    <option value="SQL">SQL</option>
                    <option value="Excel">Excel</option>
                    <option value="DAX">DAX</option>
                    <option value="Python">Python</option>
                    <option value="Career">Career Guidance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Duration</label>
                  <input
                    type="text"
                    value={editingVideo.duration || ''}
                    onChange={(e) => setEditingVideo({ ...editingVideo, duration: e.target.value })}
                    placeholder="25m"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={3}
                  value={editingVideo.description || ''}
                  onChange={(e) => setEditingVideo({ ...editingVideo, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewingVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl relative">
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-600" /> {previewingVideo.title}
              </h3>
              <button
                onClick={() => setPreviewingVideo(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {previewingVideo.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${previewingVideo.youtubeId}?autoplay=1`}
                  title={previewingVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  Invalid YouTube Video ID
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

