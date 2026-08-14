import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Activity,
  RefreshCw,
  Globe,
  Smartphone,
  Search,
  ShieldCheck,
  AlertCircle,
  MousePointerClick,
  Sparkles,
  FileText,
  Calendar,
  Compass,
  Laptop,
  CheckCircle2,
  UserPlus,
  UserCheck,
  CalendarDays,
  Send,
  Youtube,
  Instagram,
  Facebook,
  Github,
  BookOpen,
  FolderGit2,
  Newspaper,
  MessageSquare
} from 'lucide-react';

interface AnalyticsManagerProps {
  // Optional prop
}

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = () => {
  const [range, setRange] = useState<'today' | 'yesterday' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [searchPageQuery, setSearchPageQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'views' | 'users' | 'engagement'>('views');

  // GA4 Status and Data from Server API
  const [ga4Status, setGa4Status] = useState<{
    hasTrackingId: boolean;
    hasReportingCredentials: boolean;
    measurementId: string | null;
  }>({
    hasTrackingId: false,
    hasReportingCredentials: false,
    measurementId: null,
  });

  const [realtimeUsers, setRealtimeUsers] = useState<number>(0);
  const [reportData, setReportData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Check GA4 Config Status
      const statusRes = await fetch('/api/analytics/status', { credentials: 'include' });
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setGa4Status({
          hasTrackingId: statusJson.hasTrackingId,
          hasReportingCredentials: statusJson.hasReportingCredentials,
          measurementId: statusJson.measurementId,
        });
      }

      // 2. Fetch Realtime Active Users
      const realtimeRes = await fetch('/api/analytics/realtime', { credentials: 'include' });
      if (realtimeRes.ok) {
        const realtimeJson = await realtimeRes.json();
        if (realtimeJson.configured) {
          setRealtimeUsers(realtimeJson.activeUsers || 0);
        }
      }

      // 3. Fetch Full Analytics Report
      let url = `/api/analytics/report?range=${range}`;
      if (range === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }

      const reportRes = await fetch(url, { credentials: 'include' });
      if (reportRes.ok) {
        const reportJson = await reportRes.json();
        setReportData(reportJson);
      }

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error('Failed to load GA4 analytics data:', err);
      setErrorMsg('Could not connect to Analytics server endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [range]);

  const overview = reportData?.overview || {
    activeUsers: 0,
    newUsers: 0,
    returningUsers: 0,
    sessions: 0,
    pageViews: 0,
    engagementRate: '0%',
    avgEngagementTime: '0s',
  };

  const timeframeUsers = reportData?.timeframeUsers || {
    usersToday: 0,
    users7d: 0,
    users30d: 0,
  };

  // Aggregated Pages Safeguard
  const rawPages = reportData?.pages || [];
  const clientPageMap = new Map<string, any>();
  for (const page of rawPages) {
    const existing = clientPageMap.get(page.path);
    if (!existing) {
      clientPageMap.set(page.path, { ...page });
    } else {
      existing.users = Math.max(existing.users, page.users);
      existing.views += page.views;
      if (page.title && page.title !== 'Untitled Page' && page.title.length > existing.title.length) {
        existing.title = page.title;
      }
    }
  }

  const pagesList = Array.from(clientPageMap.values())
    .filter((p: any) =>
      p.path.toLowerCase().includes(searchPageQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchPageQuery.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortField === 'views') return b.views - a.views;
      if (sortField === 'users') return b.users - a.users;
      if (sortField === 'engagement') return parseFloat(b.engagement) - parseFloat(a.engagement);
      return 0;
    });

  const customEvents = reportData?.events || [];
  const trafficSources = reportData?.sources || [];
  const devices = reportData?.devices || [];
  const browsers = reportData?.browsers || [];
  const geography = reportData?.geography || [];

  // Helper to find and sum specific event counts from GA4 events
  const getEventCount = (patterns: string[]) => {
    return customEvents
      .filter((evt: any) =>
        patterns.some((p) => evt.eventName.toLowerCase().includes(p.toLowerCase()))
      )
      .reduce((sum: number, evt: any) => sum + (Number(evt.count) || 0), 0);
  };

  const youtubeClicks = getEventCount(['youtube_click', 'youtube', 'yt_click']);
  const instagramClicks = getEventCount(['instagram_click', 'instagram', 'ig_click']);
  const facebookClicks = getEventCount(['facebook_click', 'facebook', 'fb_click']);
  const githubClicks = getEventCount(['github_click', 'github']);
  const courseClicks = getEventCount(['course_click', 'course', 'enroll']);
  const projectClicks = getEventCount(['project_click', 'project']);
  const blogClicks = getEventCount(['blog_click', 'blog', 'article']);
  const contactClicks = getEventCount(['contact_click', 'contact_open']);
  const contactFormSubmissions = getEventCount(['contact_form_submit', 'message_sent', 'form_submit']);

  return (
    <div className="space-y-8 font-sans">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black  dark:text-slate-900 dark:text-white  tracking-tight flex items-center gap-2">
                ProBitian Analytics Command Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Real-Time Google Analytics 4 Data API Reporting
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <div className="inline-flex flex-wrap rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
              { id: 'custom', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setRange(item.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  range === item.id
                    ? 'bg-purple-600 text-slate-900 dark:text-white  shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover: dark:hover:text-slate-900 dark:text-white '
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Refresh Analytics Button */}
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Analytics Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            <span>Refresh</span>
          </button>

          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
              Last updated: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {range === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 bg-purple-50 dark:bg-slate-800/80 p-4 rounded-xl border border-purple-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Calendar className="w-4 h-4 text-purple-600" />
            <span>Select Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900  dark:text-slate-900 dark:text-white  focus:ring-2 focus:ring-purple-500"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900  dark:text-slate-900 dark:text-white  focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={fetchAnalyticsData}
              disabled={!customStart || !customEnd || loading}
              className="px-3 py-1.5 bg-purple-600 text-slate-900 dark:text-white  font-bold text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* Connection Notice */}
      {ga4Status.hasReportingCredentials && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>GA4 Data API Connected to Property ID: <strong className="font-mono">{ga4Status.propertyId}</strong></span>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">Live Data Sync Active</span>
        </div>
      )}

      {/* OVERVIEW METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real-time Active Users Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-slate-900 dark:text-white  shadow-lg space-y-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
            <Activity className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
              Active Users Now
            </span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
          </div>
          <div className="text-3xl font-black tracking-tight">{realtimeUsers}</div>
          <p className="text-[11px] text-purple-200 font-medium">
            Active visitors in the last 30 minutes
          </p>
        </div>

        {/* Users Range Total */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Users ({range.toUpperCase()})</span>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black  dark:text-slate-900 dark:text-white  tracking-tight">
            {overview.activeUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <UserPlus className="w-3 h-3" /> {overview.newUsers} new
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {overview.returningUsers} returning
            </span>
          </div>
        </div>

        {/* Screen Page Views & Sessions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Page Views & Sessions</span>
            <Eye className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black  dark:text-slate-900 dark:text-white  tracking-tight">
            {overview.pageViews.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-700 dark:text-slate-300">{overview.sessions}</span> total sessions recorded
          </div>
        </div>

        {/* Engagement Rate & Time */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Engagement Rate</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black  dark:text-slate-900 dark:text-white  tracking-tight">
            {overview.engagementRate}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            Avg Duration: <span className="font-bold text-slate-700 dark:text-slate-300">{overview.avgEngagementTime}</span>
          </div>
        </div>
      </div>

      {/* TIMEFRAME COMPARISON CARDS (Users Today, 7d, 30d) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Users Today</span>
            <div className="text-xl font-black  dark:text-slate-900 dark:text-white ">{timeframeUsers.usersToday}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Users Last 7 Days</span>
            <div className="text-xl font-black  dark:text-slate-900 dark:text-white ">{timeframeUsers.users7d}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Users Last 30 Days</span>
            <div className="text-xl font-black  dark:text-slate-900 dark:text-white ">{timeframeUsers.users30d}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TRACKED CLICK & FORM EVENTS GRID */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold  dark:text-slate-900 dark:text-white  flex items-center gap-2">
              <MousePointerClick className="w-5 h-5 text-amber-500" />
              Targeted Click & Conversion Events
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time user engagement across courses, social links, and contact forms
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'YouTube Clicks', count: youtubeClicks, icon: Youtube, color: 'text-red-500 bg-red-500/10' },
            { label: 'Instagram Clicks', count: instagramClicks, icon: Instagram, color: 'text-pink-500 bg-pink-500/10' },
            { label: 'Facebook Clicks', count: facebookClicks, icon: Facebook, color: 'text-blue-600 bg-blue-600/10' },
            { label: 'GitHub Clicks', count: githubClicks, icon: Github, color: 'text-slate-800 dark:text-slate-200 bg-slate-500/10' },
            { label: 'Course Clicks', count: courseClicks, icon: BookOpen, color: 'text-purple-600 bg-purple-600/10' },
            { label: 'Project Clicks', count: projectClicks, icon: FolderGit2, color: 'text-indigo-600 bg-indigo-600/10' },
            { label: 'Blog Clicks', count: blogClicks, icon: Newspaper, color: 'text-amber-600 bg-amber-600/10' },
            { label: 'Contact Clicks', count: contactClicks, icon: MessageSquare, color: 'text-teal-600 bg-teal-600/10' },
            { label: 'Form Submissions', count: contactFormSubmissions, icon: Send, color: 'text-emerald-600 bg-emerald-600/10' },
          ].map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{item.label}</span>
                  <div className={`p-1.5 rounded-lg ${item.color}`}>
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-lg font-black  dark:text-slate-900 dark:text-white ">{item.count}</div>
              </div>
            );
          })}
        </div>

        {/* All Raw Custom Events Table */}
        {customEvents.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">All Recorded GA4 Events Log</h3>
            <div className="flex flex-wrap gap-2">
              {customEvents.map((evt: any, idx: number) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs"
                >
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{evt.eventName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-600 text-slate-900 dark:text-white  font-extrabold text-[10px]">
                    {evt.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TOP PAGES TABLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-extrabold  dark:text-slate-900 dark:text-white  flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Top Pages & Screen Views
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown of website pages visited by users
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search page path..."
                value={searchPageQuery}
                onChange={(e) => setSearchPageQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700  dark:text-slate-900 dark:text-white  focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700  dark:text-slate-900 dark:text-white  focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="views">Sort by Page Views</option>
              <option value="users">Sort by Users</option>
              <option value="engagement">Sort by Engagement</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs font-medium">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Page Path</th>
                <th className="p-3">Page Title</th>
                <th className="p-3 text-right">Users</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Engagement</th>
                <th className="p-3 text-right">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {pagesList.length > 0 ? (
                pagesList.map((page: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono text-purple-600 dark:text-purple-400 font-semibold">{page.path}</td>
                    <td className="p-3 font-semibold  dark:text-slate-900 dark:text-white ">{page.title}</td>
                    <td className="p-3 text-right font-bold">{page.users}</td>
                    <td className="p-3 text-right font-bold  dark:text-slate-900 dark:text-white ">{page.views}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{page.engagement}</td>
                    <td className="p-3 text-right font-mono">{page.avgTime}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400">
                    No page view records found for this time range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRAFFIC SOURCES & DEVICE / BROWSER / GEOGRAPHY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic Sources */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-extrabold  dark:text-slate-900 dark:text-white  flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-500" />
              Traffic Sources & Acquisition
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Where your website visitors originate
            </p>
          </div>

          <div className="space-y-2">
            {trafficSources.length > 0 ? (
              trafficSources.map((src: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold"
                >
                  <span className=" dark:text-slate-900 dark:text-white ">{src.source}</span>
                  <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                    <span>{src.users} Users</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{src.sessions} Sessions</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No traffic source data recorded yet for this timeframe.
              </div>
            )}
          </div>
        </div>

        {/* Devices & Browsers */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold  dark:text-slate-900 dark:text-white  flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              Devices & Browsers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hardware categories and web browser distribution
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Devices */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Laptop className="w-3.5 h-3.5 text-purple-600" /> Devices
              </h3>
              {devices.length > 0 ? (
                devices.map((dev: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <span className="capitalize font-semibold  dark:text-slate-900 dark:text-white ">{dev.device}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{dev.users} Users</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2">No device breakdown recorded.</p>
              )}
            </div>

            {/* Browsers */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-emerald-600" /> Browsers
              </h3>
              {browsers.length > 0 ? (
                browsers.map((b: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                    <span className="font-semibold  dark:text-slate-900 dark:text-white ">{b.browser}</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{b.users} Users</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-2">No browser data recorded.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GEOGRAPHIC LOCATIONS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold  dark:text-slate-900 dark:text-white  flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" />
          Geographic Demographics (Countries & Cities)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {geography.length > 0 ? (
            geography.map((geo: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="font-semibold  dark:text-slate-900 dark:text-white  truncate">
                  {geo.country} {geo.city !== 'Unknown' ? `(${geo.city})` : ''}
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400 shrink-0">{geo.users} Visitors</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 col-span-full py-4 text-center">
              Geographic location data will populate automatically as users visit the site.
            </p>
          )}
        </div>
      </div>

      {/* PRIVACY & SECURITY AUDIT FOOTER */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>
          <strong className=" dark:text-slate-900 dark:text-white  font-bold">Privacy & Credentials Audit:</strong> All Google Analytics Data API queries run strictly server-side using Google Cloud Service Account JWTs. Private keys and client emails are NEVER exposed to client browsers or bundled outputs.
        </p>
      </div>
    </div>
  );
};
