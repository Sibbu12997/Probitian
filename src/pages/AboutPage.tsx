import React, { useState, useEffect } from 'react';
import { NavPage } from '../types';
import { cmsService } from '../services/cmsService';
import { BannerGraphic } from '../components/BannerGraphic';
import { 
  BookOpen, 
  FolderKanban, 
  Lightbulb, 
  Compass, 
  BarChart3, 
  Database, 
  FileSpreadsheet, 
  Cpu, 
  Sparkles, 
  Briefcase, 
  ArrowRight, 
  Youtube, 
  Instagram, 
  Linkedin,
  Mail, 
  GraduationCap 
} from 'lucide-react';
import { XIcon } from '../components/icons/XIcon';
import { trackSocialClick, trackContactClick } from '../lib/analytics';

interface AboutPageProps {
  onNavigate: (page: NavPage) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const [contactEmail, setContactEmail] = useState<string>('probitianofficial@gmail.com');

  useEffect(() => {
    cmsService.getGeneralSettings().then((g) => {
      if (g?.contact_email) setContactEmail(g.contact_email);
    }).catch(() => {});
  }, []);

  const valueCards = [
    {
      title: 'Beginner to Advanced Concepts',
      description: 'Structured tutorials covering fundamental concepts up to complex enterprise DAX and data modelling techniques.',
      icon: BookOpen,
      targetPage: 'learn' as NavPage,
      badge: 'Skill Path'
    },
    {
      title: 'Real-world Projects',
      description: 'Hands-on portfolio dashboard builds designed to mirror actual industry challenges and datasets.',
      icon: FolderKanban,
      targetPage: 'projects' as NavPage,
      badge: 'Portfolio'
    },
    {
      title: 'Tips, Tricks & Best Practices',
      description: 'Actionable guides, DAX optimization patterns, and SQL queries to write efficient analytics code.',
      icon: Lightbulb,
      targetPage: 'blog' as NavPage,
      badge: 'Insights'
    },
    {
      title: 'Career Guidance & Interview Help',
      description: 'Resume advice, portfolio showcase strategies, and mock technical interview preparation for analysts.',
      icon: Compass,
      targetPage: 'learn' as NavPage,
      badge: 'Career'
    }
  ];

  const whatYouCanLearn = [
    {
      title: 'Power BI',
      description: 'Dashboards, DAX, Power Query and data modeling.',
      icon: BarChart3,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-500 border-amber-500/30'
    },
    {
      title: 'SQL',
      description: 'Queries, databases and real-world data analysis.',
      icon: Database,
      color: 'from-blue-500/20 to-blue-500/5 text-blue-500 border-blue-500/30'
    },
    {
      title: 'Excel',
      description: 'Advanced Excel, reporting and practical analytics.',
      icon: FileSpreadsheet,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-500 border-emerald-500/30'
    },
    {
      title: 'Microsoft Fabric',
      description: 'Modern analytics and data platform concepts.',
      icon: Cpu,
      color: 'from-purple-500/20 to-purple-500/5 text-purple-500 border-purple-500/30'
    },
    {
      title: 'AI for Data Professionals',
      description: 'Practical AI tools and workflows for analytics.',
      icon: Sparkles,
      color: 'from-pink-500/20 to-pink-500/5 text-pink-500 border-pink-500/30'
    },
    {
      title: 'Career Growth',
      description: 'Projects, interviews and professional development.',
      icon: Briefcase,
      color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-500 border-indigo-500/30'
    }
  ];

  return (
    <div className="space-y-16 pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* About Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
          About Pro<span className="text-amber-500 font-black">BI</span>tian
        </span>

        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Empowering the Next Generation of <span className="text-gradient">Data Leaders</span>
        </h1>

        <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg font-medium leading-relaxed">
          ProBitian is a practical learning platform for data professionals and aspiring analysts, focused on real-world skills, projects, and career growth.
        </p>
      </div>

      {/* Main Banner Graphic Showcase */}
      <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <BannerGraphic type="about" />
      </div>

      {/* Core Value Pillars - Clickable Cards */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Our Learning Pillars
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Click any pillar below to jump directly into tailored courses, projects, or guides.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {valueCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.title}
                onClick={() => onNavigate(card.targetPage)}
                className="group text-left card-radius bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 shadow-soft hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore {card.badge}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* What You Can Learn Section */}
      <div className="space-y-8 bg-slate-50 dark:bg-slate-900/60 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Comprehensive Skills
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            What You Can Learn
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Master essential tools and methodologies required in modern Business Intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {whatYouCanLearn.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border w-fit`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Community Connect Bar */}
      <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 shadow-xl">
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
            className="btn-radius px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            aria-label="ProBitian on YouTube"
          >
            <Youtube className="w-4 h-4" /> YouTube
          </a>
          <a
            href="https://instagram.com/probitian"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick('instagram', 'https://instagram.com/probitian')}
            className="btn-radius px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            aria-label="ProBitian on Instagram"
          >
            <Instagram className="w-4 h-4" /> Instagram
          </a>
          <a
            href="https://x.com/Probitian"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick('x', 'https://x.com/Probitian')}
            className="btn-radius px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-sm"
            aria-label="ProBitian on X"
          >
            <XIcon className="w-4 h-4" /> X
          </a>
          <a
            href="https://www.linkedin.com/company/probitian/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackSocialClick('linkedin', 'https://www.linkedin.com/company/probitian/')}
            className="btn-radius px-5 py-2.5 bg-[#0077b5] hover:bg-[#006396] text-white text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            aria-label="ProBitian on LinkedIn"
          >
            <Linkedin className="w-4 h-4" /> LinkedIn
          </a>
          <a
            href={`mailto:${contactEmail}`}
            onClick={() => trackContactClick('about_page_email')}
            className="btn-radius px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
            aria-label="Direct Email ProBitian"
          >
            <Mail className="w-4 h-4" /> Email Us
          </a>
        </div>
      </div>

      {/* Ready to Build Your Data Skills? - CTA Section */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-900/90 via-slate-900 to-slate-950 text-white border border-purple-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
            Start Your Journey
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Build Your Data Skills?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Explore practical learning resources, real-world projects and career-focused content.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('learn')}
            className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Start Learning</span>
          </button>

          <button
            onClick={() => onNavigate('projects')}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FolderKanban className="w-4 h-4 text-amber-400" />
            <span>Explore Projects</span>
          </button>
        </div>
      </div>
    </div>
  );
};
