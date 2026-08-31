import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCw,
  BarChart3,
  Layers,
  SlidersHorizontal,
  Sparkles,
  Info,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { cmsService } from '../services/cmsService';
import { trackCtaClick } from '../lib/analytics';

interface PowerBIDemoProps {
  onNavigate?: (page: any) => void;
}

export const PowerBIDemo: React.FC<PowerBIDemoProps> = ({ onNavigate }) => {
  const [demoUrl, setDemoUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let mounted = true;
    cmsService.getPowerBiDemoUrl().then((url) => {
      if (mounted) {
        setDemoUrl(url);
      }
    }).catch(() => {
      if (mounted) {
        setDemoUrl('https://app.powerbi.com/view?r=eyJrIjoiNzUyNDk1ZjgtNTA1OS00MDUxLTgyNmEtMjVhYmM2NTlkOGJjIiwidCI6ImU2YmVkMTFkLWM2YzMtNDFkMC05NzU3LTkxNWQwZjIzZmQ4NyJ9');
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    if (iframeRef.current && demoUrl) {
      iframeRef.current.src = demoUrl;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen?.().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const keyFeatures = [
    {
      icon: <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Dynamic Slicing & Filtering',
      description: 'Interact with visual date pickers, category filters, and regional selectors to slice metrics in real time.'
    },
    {
      icon: <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Visual Cross-Filtering',
      description: 'Click on any chart element or bar to automatically filter and highlight connected metrics across the entire canvas.'
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'DAX Time Intelligence',
      description: 'Experience instant Year-over-Year (YoY), Month-to-Date (MTD), and variance calculations computed on demand.'
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      title: 'Executive KPI Cards',
      description: 'High-contrast summary indicators with automated trend arrows and target achievement benchmarks.'
    }
  ];

  return (
    <div className="space-y-10">
      {/* Top Banner Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE INTERACTIVE POWER BI REPORT</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Experience Enterprise Power BI in Action
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          Explore this fully interactive business intelligence dashboard. Click charts, adjust slicers, and see how raw data transforms into high-impact executive decision support.
        </p>
      </div>

      {/* Interactive Embed Container */}
      <div
        ref={containerRef}
        className={`card-radius relative bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full'
        }`}
      >
        {/* Top Control Bar */}
        <div className="bg-slate-900/95 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-bold tracking-wide text-slate-200">
              Power BI Interactive Canvas
            </span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
              16:9 HD Display
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Reload report embed"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Reload</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackCtaClick('Open Power BI Fullscreen in New Tab', demoUrl)}
                className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Open in Power BI</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Embed Frame Body */}
        <div className={`relative w-full ${isFullscreen ? 'flex-1 h-full' : 'aspect-[16/9] min-h-[420px] sm:min-h-[580px] lg:min-h-[680px]'}`}>
          {/* Loading Skeleton */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-4 z-10">
              <div className="w-12 h-12 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">Loading Interactive Power BI Report...</p>
                <p className="text-xs text-slate-400">Fetching live visual tiles and semantic models</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4 z-10">
              <Info className="w-10 h-10 text-amber-400" />
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-white">Live Embed Loading Notice</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The Power BI service embed is taking longer than expected to connect. You can open the live report directly or retry loading.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Retry Embed
                </button>
                {demoUrl && (
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span>Open in Power BI Service</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Power BI iframe */}
          {demoUrl && (
            <iframe
              ref={iframeRef}
              src={demoUrl}
              title="ProBitian Interactive Power BI Showcase"
              className="w-full h-full border-0"
              allowFullScreen
              onLoad={() => {
                setIsLoading(false);
                setHasError(false);
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )}
        </div>

        {/* Disclaimer Footer */}
        <div className="bg-slate-950 px-4 py-2.5 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Interactive sandbox: All filters and clicks are isolated to your local browser session.</span>
          </div>
          <span className="text-slate-500">Public illustrative dataset</span>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            What to Explore in This Live Demo
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Four key enterprise design patterns showcased in this report
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {keyFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="card-radius bg-white dark:bg-slate-800/90 p-5 border border-slate-200 dark:border-slate-700/80 shadow-soft hover:shadow-soft-lg transition-all duration-300 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 w-fit">
                  {feat.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {feat.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Banner */}
      {onNavigate && (
        <div className="card-radius bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 text-white p-8 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-extrabold">
              Want to Build Dashboards Like This?
            </h3>
            <p className="text-xs sm:text-sm text-purple-100 max-w-xl">
              Master DAX formulas, SQL data modeling, Power Query transformations, and dashboard storytelling with our end-to-end courses and portfolio guides.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={() => {
                trackCtaClick('Power BI Demo CTA - View Projects', 'projects');
                onNavigate('projects');
              }}
              className="btn-radius px-5 py-3 bg-white text-purple-900 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Explore All Projects</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                trackCtaClick('Power BI Demo CTA - Learn Power BI', 'learn');
                onNavigate('learn');
              }}
              className="btn-radius px-5 py-3 bg-purple-900/40 hover:bg-purple-900/60 text-white border border-white/20 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              Start Learning Free
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
