import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BarChart3,
  Home, 
  FolderKanban, 
  Newspaper, 
  GraduationCap, 
  Youtube, 
  Image as ImageIcon, 
  Mail, 
  Users, 
  Share2, 
  Menu as MenuIcon, 
  Search as SearchIcon, 
  Sliders, 
  Database, 
  LogOut, 
  ExternalLink, 
  ArrowLeft,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Scale
} from 'lucide-react';

import { Palette } from 'lucide-react';
import { BrandingManager } from './modules/BrandingManager';
import { DashboardOverview } from './modules/DashboardOverview';
import { AnalyticsManager } from './modules/AnalyticsManager';
import { HomePageManager } from './modules/HomePageManager';
import { ProjectsManager } from './modules/ProjectsManager';
import { BlogManager } from './modules/BlogManager';
import { LearnManager } from './modules/LearnManager';
import { VideoManager } from './modules/VideoManager';
import { MediaLibraryManager } from './modules/MediaLibraryManager';
import { MessagesManager } from './modules/MessagesManager';
import { SubscribersManager } from './modules/SubscribersManager';
import { SocialLinksManager } from './modules/SocialLinksManager';
import { NavigationManager } from './modules/NavigationManager';
import { SeoManager } from './modules/SeoManager';
import { SettingsManager } from './modules/SettingsManager';
import { LegalManager } from './modules/LegalManager';
import { BackupManager } from './modules/BackupManager';

interface AdminPortalProps {
  userEmail: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLogout: () => void;
  onNavigateFront: (page: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  userEmail,
  isDarkMode = true,
  onToggleDarkMode,
  onLogout,
  onNavigateFront
}) => {
  const [activeModule, setActiveModule] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navGroups = [
    {
      group: 'Analytics & Overview',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'analytics', label: 'GA4 Analytics', icon: BarChart3 }
      ]
    },
    {
      group: 'Content Manager',
      items: [
        { id: 'homepage', label: 'Home Page Editor', icon: Home },
        { id: 'projects', label: 'Projects Portfolio', icon: FolderKanban },
        { id: 'blog', label: 'Blog & Articles', icon: Newspaper },
        { id: 'learn', label: 'Learn & Courses', icon: GraduationCap },
        { id: 'videos', label: 'YouTube Showcase', icon: Youtube },
        { id: 'media', label: 'Media Library', icon: ImageIcon }
      ]
    },
    {
      group: 'User Communication',
      items: [
        { id: 'messages', label: 'Contact Messages', icon: Mail },
        { id: 'subscribers', label: 'Subscribers', icon: Users }
      ]
    },
    {
      group: 'Site Settings & Admin',
      items: [
        { id: 'branding', label: 'Website Branding', icon: Palette },
        { id: 'social', label: 'Social Links', icon: Share2 },
        { id: 'navigation', label: 'Navigation Menu', icon: MenuIcon },
        { id: 'seo', label: 'SEO & Meta Tags', icon: SearchIcon },
        { id: 'legal', label: 'Legal & Policies', icon: Scale },
        { id: 'settings', label: 'Website Settings', icon: Sliders },
        { id: 'backup', label: 'Backup & Restore', icon: Database }
      ]
    }
  ];

  const renderModule = () => {
    switch (activeModule) {
      case 'overview': return <DashboardOverview onNavigate={(m) => setActiveModule(m)} />;
      case 'analytics': return <AnalyticsManager />;
      case 'homepage': return <HomePageManager />;
      case 'projects': return <ProjectsManager />;
      case 'blog': return <BlogManager />;
      case 'learn': return <LearnManager />;
      case 'videos': return <VideoManager />;
      case 'media': return <MediaLibraryManager />;
      case 'messages': return <MessagesManager />;
      case 'subscribers': return <SubscribersManager />;
      case 'branding': return <BrandingManager />;
      case 'social': return <SocialLinksManager />;
      case 'navigation': return <NavigationManager />;
      case 'seo': return <SeoManager />;
      case 'legal': return <LegalManager />;
      case 'settings': return <SettingsManager />;
      case 'backup': return <BackupManager />;
      default: return <DashboardOverview onNavigate={(m) => setActiveModule(m)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <MenuIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              PB
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight">Pro<span className="text-amber-500 dark:text-amber-400">BI</span>tian</span>
              <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono ml-2 font-bold">
                ADMIN CMS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigateFront('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
            title="Navigate to Website Homepage"
          >
            <ArrowLeft className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="hidden xs:inline">← Back to Website</span>
            <span className="xs:hidden">Website</span>
          </button>

          {/* Theme Toggle Button */}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-sm"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          )}

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            <span className="hidden md:inline">{userEmail}</span>
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } flex flex-col justify-between p-4 overflow-y-auto shadow-sm lg:shadow-none`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between lg:hidden border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="font-bold text-sm text-slate-900 dark:text-white">Navigation</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {navGroups.map((group) => (
              <div key={group.group} className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveModule(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-500">
            <p className="font-semibold text-slate-700 dark:text-slate-400">ProBItian CMS v2.5</p>
            <p>Supabase Auth & DB Configured</p>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
};

