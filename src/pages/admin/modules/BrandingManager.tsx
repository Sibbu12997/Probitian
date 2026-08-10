import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  ImageIcon, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  RotateCcw, 
  Eye, 
  Sparkles, 
  Check, 
  X,
  FileCode,
  ArrowRight,
  FolderOpen
} from 'lucide-react';
import { cmsService } from '../../../services/cmsService';
import { WebsiteGeneralSettings, HomePageConfig } from '../../../types';
import { sanitizeSvgContent } from '../../../lib/svgSanitizer';
import { MediaPicker } from '../../../components/admin/MediaPicker';

export const BrandingManager: React.FC = () => {
  const [settings, setSettings] = useState<WebsiteGeneralSettings | null>(null);
  const [homeConfig, setHomeConfig] = useState<HomePageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Media Library Pickers
  const [showLogoPicker, setShowLogoPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  // Staged pending SVGs / Media URLs
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [pendingLogoName, setPendingLogoName] = useState<string | null>(null);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [pendingBannerName, setPendingBannerName] = useState<string | null>(null);

  // Validation errors
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBrandingData();
  }, []);

  const loadBrandingData = async () => {
    setLoading(true);
    try {
      const [genSettings, hpConfig] = await Promise.all([
        cmsService.getGeneralSettings(),
        cmsService.getHomePageConfig()
      ]);
      setSettings(genSettings);
      setHomeConfig(hpConfig);
    } catch (err) {
      console.error('Failed to load branding data:', err);
    } finally {
      setLoading(false);
    }
  };

  // SVG Validator & Security Sanitizer Helper
  const validateAndReadSvg = (file: File): Promise<{ content: string; dataUri: string }> => {
    return new Promise((resolve, reject) => {
      if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
        return reject(new Error('Invalid file type: File must be an SVG (.svg) document.'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text || typeof text !== 'string') {
          return reject(new Error('File content could not be read.'));
        }

        const result = sanitizeSvgContent(text);
        if (!result.isValid || !result.dataUri) {
          return reject(new Error(result.error || 'Invalid or unsafe SVG file.'));
        }

        resolve({ content: result.sanitizedSvg || text, dataUri: result.dataUri });
      };

      reader.onerror = () => reject(new Error('Failed to read the uploaded SVG file.'));
      reader.readAsText(file);
    });
  };

  // Handler for Logo Upload / Replace
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUri } = await validateAndReadSvg(file);
      setPendingLogo(dataUri);
      setPendingLogoName(file.name);
    } catch (err: any) {
      setLogoError(err.message || 'SVG validation failed.');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  // Handler for Banner Upload / Replace
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { dataUri } = await validateAndReadSvg(file);
      setPendingBanner(dataUri);
      setPendingBannerName(file.name);
    } catch (err: any) {
      setBannerError(err.message || 'SVG validation failed.');
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  // Remove Logo (Resets pending or sets logo_url to empty / fallback)
  const handleRemoveLogo = () => {
    if (pendingLogo) {
      setPendingLogo(null);
      setPendingLogoName(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    } else if (settings) {
      setPendingLogo('/logo.svg');
      setPendingLogoName('Reset to Default Logo');
    }
  };

  // Remove Banner (Resets pending or sets banner_url to default)
  const handleRemoveBanner = () => {
    if (pendingBanner) {
      setPendingBanner(null);
      setPendingBannerName(null);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    } else if (settings) {
      setPendingBanner('/banner.svg');
      setPendingBannerName('Reset to Default Banner');
    }
  };

  // Save All Branding Changes
  const handleSaveBranding = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      let updatedLogoUrl = pendingLogo !== null ? pendingLogo : settings.logo_url;
      let updatedBannerUrl = pendingBanner !== null ? pendingBanner : settings.banner_url;

      // Upload pending base64 logo to Supabase Storage
      if (pendingLogo && pendingLogo.startsWith('data:')) {
        const logoRes = await cmsService.uploadMediaFile({
          fileData: pendingLogo,
          filename: pendingLogoName || 'logo.svg',
          category: 'logos',
          folder: 'logos',
          altText: 'Website Logo'
        });
        if (logoRes.success && logoRes.media) {
          updatedLogoUrl = logoRes.media.public_url || logoRes.media.url;
        }
      }

      // Upload pending base64 banner to Supabase Storage
      if (pendingBanner && pendingBanner.startsWith('data:')) {
        const bannerRes = await cmsService.uploadMediaFile({
          fileData: pendingBanner,
          filename: pendingBannerName || 'banner.svg',
          category: 'banners',
          folder: 'banners',
          altText: 'Hero Banner'
        });
        if (bannerRes.success && bannerRes.media) {
          updatedBannerUrl = bannerRes.media.public_url || bannerRes.media.url;
        }
      }

      const newSettings: WebsiteGeneralSettings = {
        ...settings,
        logo_url: updatedLogoUrl,
        favicon_url: updatedLogoUrl,
        banner_url: updatedBannerUrl
      };

      await cmsService.saveGeneralSettings(newSettings);

      if (homeConfig) {
        const newHomeConfig: HomePageConfig = {
          ...homeConfig,
          banner_url: updatedBannerUrl
        };
        await cmsService.saveHomePageConfig(newHomeConfig);
        setHomeConfig(newHomeConfig);
      }

      setSettings(newSettings);

      // Log into media library if new uploaded SVGs were saved
      if (pendingLogo && pendingLogoName && pendingLogo.startsWith('data:')) {
        await cmsService.addMediaItem({
          filename: pendingLogoName,
          url: pendingLogo,
          size_bytes: pendingLogo.length,
          mime_type: 'image/svg+xml',
          folder: 'branding'
        });
      }

      if (pendingBanner && pendingBannerName && pendingBanner.startsWith('data:')) {
        await cmsService.addMediaItem({
          filename: pendingBannerName,
          url: pendingBanner,
          size_bytes: pendingBanner.length,
          mime_type: 'image/svg+xml',
          folder: 'branding'
        });
      }

      // Clear pending states
      setPendingLogo(null);
      setPendingLogoName(null);
      setPendingBanner(null);
      setPendingBannerName(null);

      // Trigger global event so public website updates instantly
      window.dispatchEvent(new Event('probitian_branding_updated'));

      setMessage({ type: 'success', text: 'Website branding assets saved! The live website is updated.' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Failed to save branding:', err);
      setMessage({ type: 'error', text: 'Error saving branding settings. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Reset to Original Default ProBitian Logo & Banner
  const handleResetToDefault = async () => {
    if (!window.confirm('Reset Logo and Banner back to the original default ProBitian SVG designs?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const defaultLogo = '/logo.svg';
      const defaultBanner = '/banner.svg';

      if (settings) {
        const newSettings: WebsiteGeneralSettings = {
          ...settings,
          logo_url: defaultLogo,
          favicon_url: defaultLogo,
          banner_url: defaultBanner
        };
        await cmsService.saveGeneralSettings(newSettings);
        setSettings(newSettings);
      }

      if (homeConfig) {
        const newHomeConfig: HomePageConfig = {
          ...homeConfig,
          banner_url: defaultBanner
        };
        await cmsService.saveHomePageConfig(newHomeConfig);
        setHomeConfig(newHomeConfig);
      }

      setPendingLogo(null);
      setPendingLogoName(null);
      setPendingBanner(null);
      setPendingBannerName(null);
      setLogoError(null);
      setBannerError(null);

      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';

      window.dispatchEvent(new Event('probitian_branding_updated'));

      setMessage({ type: 'success', text: 'Restored original ProBitian Logo and Banner defaults!' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Reset error:', err);
      setMessage({ type: 'error', text: 'Failed to reset branding defaults.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
        Loading Website Branding Assets...
      </div>
    );
  }

  const activeLogo = pendingLogo || settings.logo_url || '/logo.svg';
  const activeBanner = pendingBanner || settings.banner_url || '/banner.svg';
  const hasPendingChanges = pendingLogo !== null || pendingBanner !== null;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 bg-clip-text text-transparent">
              Website Branding
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload, preview, and manage SVG brand vector assets for the ProBitian logo and official banner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <button
            type="button"
            disabled={!hasPendingChanges || saving}
            onClick={handleSaveBranding}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer ${
              hasPendingChanges
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 ring-2 ring-purple-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Branding Changes'}</span>
          </button>
        </div>
      </div>

      {/* Global Status Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={logoFileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleLogoFileChange}
      />
      <input
        ref={bannerFileInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleBannerFileChange}
      />

      {/* SECTION 1: LOGO MANAGEMENT */}
      <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Website Logo (SVG Asset)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The official ProBitian circular monogram logo displayed in navigation header and footer.
            </p>
          </div>
          {pendingLogo && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
              <Eye className="w-3 h-3" /> Staged Preview (Unsaved)
            </span>
          )}
        </div>

        {logoError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{logoError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Logo Preview Box */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 relative group min-h-[220px]">
            <span className="absolute top-3 left-3 text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {pendingLogo ? 'New Staged Preview' : 'Current Active Logo'}
            </span>

            <div className="w-32 h-32 rounded-full p-1 bg-white dark:bg-slate-900 shadow-md border border-purple-200 dark:border-purple-800/50 flex items-center justify-center overflow-hidden my-3">
              <img
                src={activeLogo}
                alt="ProBItian Logo Preview"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {pendingLogoName || 'ProBItian Logo SVG'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">500 × 500 Vector SVG • Preserve Aspect Ratio</p>
            </div>
          </div>

          {/* Logo Controls */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Logo Controls</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Upload a vector SVG logo. SVG files maintain crystal clarity across mobile, high-DPI desktop screens, and dark themes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New Logo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogoPicker(true)}
                className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Choose from Media Library</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveLogo}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-500/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{pendingLogo ? 'Discard Upload' : 'Remove / Reset Logo'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-700 dark:text-slate-300">SVG Format Guidelines:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>Valid XML <code>&lt;svg&gt;</code> file with viewBox defined</li>
                <li>Monogram features dark "P", bar-chart pillars, and golden "B" swoosh</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: BANNER MANAGEMENT */}
      <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              Official Website Banner (SVG Asset)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              The primary hero banner graphic featuring the ProBitian logo, headline, and tech stack badges.
            </p>
          </div>
          {pendingBanner && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
              <Eye className="w-3 h-3" /> Staged Preview (Unsaved)
            </span>
          )}
        </div>

        {bannerError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{bannerError}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Banner Preview Container */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 relative space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
              <span>{pendingBanner ? 'New Staged Banner Preview' : 'Current Active Banner'}</span>
              <span>1200 × 500 Aspect Ratio</span>
            </div>

            <div className="w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-md flex items-center justify-center p-2">
              <img
                src={activeBanner}
                alt="ProBItian Official Banner Preview"
                className="w-full h-auto max-h-[320px] object-contain"
              />
            </div>
          </div>

          {/* Banner Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => bannerFileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload New Banner</span>
              </button>

              <button
                type="button"
                onClick={() => setShowBannerPicker(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Choose from Media Library</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveBanner}
                className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs border border-rose-500/20 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{pendingBanner ? 'Discard Upload' : 'Remove / Reset Banner'}</span>
              </button>
            </div>

            {hasPendingChanges && (
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>You have unsaved branding changes!</span>
                <ArrowRight className="w-4 h-4 animate-bounce" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Media Library Selection Modals */}
      {showLogoPicker && (
        <MediaPicker
          selectedUrl={activeLogo}
          onSelect={(url) => {
            setPendingLogo(url);
            setPendingLogoName('Selected from Media Library');
            setShowLogoPicker(false);
          }}
          onClose={() => setShowLogoPicker(false)}
        />
      )}

      {showBannerPicker && (
        <MediaPicker
          selectedUrl={activeBanner}
          onSelect={(url) => {
            setPendingBanner(url);
            setPendingBannerName('Selected from Media Library');
            setShowBannerPicker(false);
          }}
          onClose={() => setShowBannerPicker(false)}
        />
      )}
    </div>
  );
};
