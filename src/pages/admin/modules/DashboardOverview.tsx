import React, { useEffect, useState } from 'react';
import { 
  FolderKanban, 
  Newspaper, 
  GraduationCap, 
  Youtube, 
  Mail, 
  Users, 
  Image as ImageIcon,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Sparkles,
  Building2,
  SendHorizontal
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { ProjectItem, BlogArticle, LearnTopic, YouTubeVideo, ContactMessage, NewsletterSubscriber, MediaItem } from '../../../types';

interface DashboardOverviewProps {
  onNavigate: (module: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    projectsCount: 0,
    blogsCount: 0,
    coursesCount: 0,
    videosCount: 0,
    messagesCount: 0,
    subscribersCount: 0,
    mediaCount: 0,
    leadsCount: 0,
    leadCampaignsCount: 0
  });
  const [recentMessages, setRecentMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const [projects, blogs, courses, videos, messages, subscribers, media, leads, leadCampaigns] = await Promise.all([
      cmsService.getProjects(),
      cmsService.getBlogs(),
      cmsService.getCourses(),
      cmsService.getVideos(),
      cmsService.getMessages(),
      cmsService.getNewsletterSubscribers(),
      cmsService.getMediaItems(),
      cmsService.getLeads().catch(() => []),
      cmsService.getLeadCampaigns().catch(() => [])
    ]);

    setStats({
      projectsCount: projects.length,
      blogsCount: blogs.length,
      coursesCount: courses.length,
      videosCount: videos.length,
      messagesCount: messages.length,
      subscribersCount: subscribers.length,
      mediaCount: media.length,
      leadsCount: leads.length,
      leadCampaignsCount: leadCampaigns.length
    });

    setRecentMessages(messages.slice(0, 5));
    setLoading(false);
  };

  const statCards = [
    { label: 'B2B Leads', count: stats.leadsCount, icon: Building2, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', module: 'leads' },
    { label: 'Outreach Campaigns', count: stats.leadCampaignsCount, icon: SendHorizontal, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', module: 'lead_campaigns' },
    { label: 'Projects', count: stats.projectsCount, icon: FolderKanban, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', module: 'projects' },
    { label: 'Blog Articles', count: stats.blogsCount, icon: Newspaper, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', module: 'blog' },
    { label: 'Learn Courses', count: stats.coursesCount, icon: GraduationCap, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', module: 'learn' },
    { label: 'YouTube Videos', count: stats.videosCount, icon: Youtube, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', module: 'videos' },
    { label: 'Contact Inquiries', count: stats.messagesCount, icon: Mail, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', module: 'messages' },
    { label: 'Subscribers', count: stats.subscribersCount, icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', module: 'subscribers' },
    { label: 'Media Files', count: stats.mediaCount, icon: ImageIcon, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10', module: 'media' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden text-slate-900 dark:text-white">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 dark:border-amber-400/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ProBI tian Content Management System</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome to Your Admin Command Center
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm max-w-2xl">
            Manage home page content, portfolio projects, tutorials, blog guides, YouTube videos, contact inquiries, and database backups seamlessly.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => onNavigate(card.module)}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-purple-300 dark:hover:border-slate-700 transition-all text-left group cursor-pointer space-y-3 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-lg ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{card.count}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{card.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Contact Messages */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Contact Inquiries</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct user messages sent via website contact form</p>
          </div>
          <button
            onClick={() => onNavigate('messages')}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMessages.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No contact inquiries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {recentMessages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                      <div>{msg.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">{msg.email}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">{msg.subject || 'General Inquiry'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        msg.status === 'new' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20' :
                        msg.status === 'read' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {msg.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(msg.created_at).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
