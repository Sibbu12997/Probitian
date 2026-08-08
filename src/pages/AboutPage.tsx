import React from 'react';
import { NavPage } from '../types';
import { BannerGraphic } from '../components/BannerGraphic';
import { Sparkles, Youtube, Instagram, Mail, Github, CheckCircle2, Award, Users, BookOpen } from 'lucide-react';
import { trackSocialClick, trackContactClick } from '../lib/analytics';

interface AboutPageProps {
  onNavigate: (page: NavPage) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-16 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          About Pro<span className="text-amber-500 font-black">BI</span>tian
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Empowering the Next Generation of <span className="text-gradient">Data Leaders</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium">
          Pro<span className="text-amber-500 font-bold">BI</span>tian is a modern learning platform focused on Data Analytics, Power BI, SQL, Excel, AI and Career Growth.
        </p>
      </div>

      {/* Main Banner Showcase Component */}
      <BannerGraphic type="about" />

      {/* Story & Philosophy Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
        <div className="card-radius bg-white dark:bg-slate-800/90 p-6 border border-slate-200 dark:border-slate-700 shadow-soft space-y-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 w-fit">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Practical Over Theory</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We believe the best way to master Business Intelligence is by building real projects. Every lesson teaches you how to solve messy, real-world business challenges.
          </p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-6 border border-slate-200 dark:border-slate-700 shadow-soft space-y-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 w-fit">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Community Driven</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Pro<span className="text-amber-500 font-semibold">BI</span>tian is more than videos—it's an active community of data enthusiasts sharing dashboard feedback, SQL optimizations, and interview prep strategies.
          </p>
        </div>

        <div className="card-radius bg-white dark:bg-slate-800/90 p-6 border border-slate-200 dark:border-slate-700 shadow-soft space-y-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 w-fit">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Career Acceleration</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            From crafting a standout LinkedIn profile to building portfolio dashboards that impress hiring managers, we focus on helping you get hired.
          </p>
        </div>
      </div>

      {/* Community Connect Bar */}
      <div className="p-8 rounded-[20px] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-bold">Connect with Pro<span className="text-amber-400">BI</span>tian</h3>
          <p className="text-xs text-slate-400">Follow our channels for weekly tutorials, DAX tips, and live Q&A sessions.</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://youtube.com/@probitian"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick('youtube', 'https://youtube.com/@probitian')}
            className="btn-radius px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2"
          >
            <Youtube className="w-4 h-4" /> YouTube
          </a>
          <a
            href="https://instagram.com/probitian"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
            className="btn-radius px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-2"
          >
            <Instagram className="w-4 h-4" /> Instagram
          </a>
          <a
            href="mailto:Probitianofficial@gmail.com"
            onClick={() => trackContactClick('about_page_email')}
            className="btn-radius px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <Mail className="w-4 h-4" /> Email Me
          </a>
        </div>
      </div>
    </div>
  );
};
