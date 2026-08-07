import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Youtube, ExternalLink, CheckCircle2, Play } from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { YouTubeVideo } from '../../../types';

export const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Power BI');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    const data = await cmsService.getVideos();
    setVideos(data);
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
      duration: '25m',
      views: '1K views',
      url,
      youtubeId,
      category
    };

    await cmsService.saveVideo(newVideo);
    setUrl('');
    setTitle('');
    setDescription('');
    setMessage('YouTube video added successfully with auto-generated thumbnail!');
    loadVideos();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this video link?')) {
      await cmsService.deleteVideo(id);
      setMessage('Video removed.');
      loadVideos();
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white">YouTube Videos & Playlists Manager</h2>
        <p className="text-xs text-slate-400">Add YouTube URLs. Thumbnails and video IDs are extracted automatically.</p>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {/* Add Form */}
      <form onSubmit={handleAddVideo} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
          <Youtube className="w-4 h-4" /> Add New Video
        </h3>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">YouTube Video URL</label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Video Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Power BI DAX Tutorial..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
            >
              <option value="Power BI">Power BI</option>
              <option value="SQL">SQL</option>
              <option value="Excel">Excel</option>
              <option value="DAX">DAX</option>
              <option value="Career">Career</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Video to Showcase</span>
        </button>
      </form>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {videos.map((vid) => (
          <div key={vid.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
              <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-white line-clamp-2">{vid.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{vid.category}</p>
              </div>
              <button
                onClick={() => handleDelete(vid.id)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
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
