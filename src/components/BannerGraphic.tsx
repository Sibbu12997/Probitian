import React, { useState, useEffect } from 'react';
import { BarChart3, Database, Table, Filter, BrainCircuit, Sparkles, TrendingUp, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { cmsService } from '../services/cmsService';

interface BannerGraphicProps {
  type?: 'hero' | 'about' | 'logo';
  className?: string;
  bannerUrl?: string;
  logoUrl?: string;
}

export const BannerGraphic: React.FC<BannerGraphicProps> = ({ type = 'hero', className = '', bannerUrl, logoUrl }) => {
  const [dynamicLogo, setDynamicLogo] = useState<string>('/logo.svg');
  const [dynamicBanner, setDynamicBanner] = useState<string>('/banner.svg');

  const loadBranding = async () => {
    try {
      const settings = await cmsService.getGeneralSettings();
      if (settings?.logo_url) setDynamicLogo(settings.logo_url);
      if (settings?.banner_url) setDynamicBanner(settings.banner_url);
    } catch (e) {}
  };

  useEffect(() => {
    loadBranding();
    const handleBrandingUpdate = () => loadBranding();
    window.addEventListener('probitian_branding_updated', handleBrandingUpdate);
    return () => window.removeEventListener('probitian_branding_updated', handleBrandingUpdate);
  }, []);

  const activeLogo = logoUrl || dynamicLogo;
  const activeBanner = bannerUrl || dynamicBanner;

  if (type === 'logo') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <img 
          src={activeLogo} 
          alt="ProBItian Logo" 
          onError={(e) => { e.currentTarget.src = '/logo.svg'; }}
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 hover:scale-105"
        />
      </div>
    );
  }

  if (type === 'about') {
    return (
      <div className={`relative w-full rounded-[20px] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-6 md:p-8 text-white shadow-soft-lg border border-purple-800/30 ${className}`}>
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column Text Content */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/20 text-purple-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Meets The Instructor
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Hello, <span className="text-gradient">I'm behind Pro<span className="text-amber-400">BI</span>tian.</span>
              </h2>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed">
                Welcome to your destination for mastering <strong className="text-white">Business Intelligence & Data Analytics</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 backdrop-blur-md space-y-2">
              <p className="text-sm text-slate-300">
                I'm passionate about data and everything it can do. <strong className="text-purple-300">Pro<span className="text-amber-400">BI</span>tian</strong> is my way of sharing knowledge, real-world experience, and practical insights to help you grow as a confident BI professional.
              </p>
            </div>

            {/* Mission Statement */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 border border-purple-500/30 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">My Mission</h4>
                <p className="text-sm font-medium text-slate-200">
                  Make Business Intelligence easy to understand, practical to apply, and impactful in your career.
                </p>
              </div>
            </div>

            {/* Focus List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-200">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Beginner to Advanced Concepts
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Real-world Projects
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Tips, Tricks & Best Practices
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Career Guidance & Interview Help
              </div>
            </div>
          </div>

          {/* Right Column Interactive Laptop/Mug Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm rounded-2xl bg-slate-800 p-3 shadow-2xl border border-slate-700">
              {/* Laptop Screen Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <span className="font-mono text-[10px]">probitian.powerbi.com</span>
              </div>

              {/* Laptop Screen Content - Live Dashboard Preview */}
              <div className="space-y-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>Executive BI Overview</span>
                  <span className="text-emerald-400 font-mono text-[10px]">+20.5% YoY</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded bg-slate-800/90 border border-slate-700/50">
                    <p className="text-[9px] text-slate-400">Total Sales</p>
                    <p className="text-xs font-extrabold text-amber-400">$24.8M</p>
                  </div>
                  <div className="p-2 rounded bg-slate-800/90 border border-slate-700/50">
                    <p className="text-[9px] text-slate-400">Total Profit</p>
                    <p className="text-xs font-extrabold text-emerald-400">$4.3M</p>
                  </div>
                  <div className="p-2 rounded bg-slate-800/90 border border-slate-700/50">
                    <p className="text-[9px] text-slate-400">Orders</p>
                    <p className="text-xs font-extrabold text-purple-400">18,245</p>
                  </div>
                </div>

                {/* Simulated Mini Chart Bars */}
                <div className="h-20 bg-slate-800/60 rounded p-2 flex items-end justify-between gap-1 border border-slate-700/30">
                  <div className="w-full bg-purple-500/80 rounded-t h-[40%]" />
                  <div className="w-full bg-purple-500/80 rounded-t h-[65%]" />
                  <div className="w-full bg-purple-500/80 rounded-t h-[50%]" />
                  <div className="w-full bg-purple-500/80 rounded-t h-[85%]" />
                  <div className="w-full bg-amber-500/90 rounded-t h-[100%]" />
                  <div className="w-full bg-purple-500/80 rounded-t h-[70%]" />
                </div>
              </div>
            </div>

            {/* Notebook & Mug Badge Overlays */}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md text-amber-300 text-xs font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Data Insights Growth
              </div>
              <a 
                href="https://instagram.com/probitian" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                @probitian <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hero Main Banner Graphic - Official ProBItian Brand Banner
  const imgSrc = activeBanner || '/banner.svg';

  return (
    <div className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl transition-all duration-300 ${className}`}>
      {/* Background Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-transparent to-amber-500/10 pointer-events-none" />

      <div className="relative w-full p-2 sm:p-4 flex items-center justify-center">
        <img 
          src={imgSrc} 
          alt="ProBItian Official Brand Banner - Master Business Intelligence" 
          decoding="async"
          loading="eager"
          onError={(e) => { e.currentTarget.src = '/banner.svg'; }}
          className="w-full h-auto max-h-[380px] object-contain rounded-xl drop-shadow-md transition-transform duration-500 hover:scale-[1.01]"
        />
      </div>
    </div>
  );
};
