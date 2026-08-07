import React, { useState, useEffect } from 'react';
import { NavPage } from '../types';
import { Youtube, Sun, Moon, Menu, X, ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { page: NavPage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'learn', label: 'Learn' },
    { page: 'projects', label: 'Projects' },
    { page: 'blog', label: 'Blog' },
    { page: 'about', label: 'About' },
    { page: 'contact', label: 'Contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass-panel shadow-soft py-3 border-b border-slate-200/80 dark:border-slate-800'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Left: Brand Logo & Title */}
          <button
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 group text-left focus:outline-none"
            aria-label="ProBItian Home"
          >
            <div className="relative w-10 h-10 rounded-full bg-white dark:bg-slate-800 p-0.5 shadow-sm border border-purple-200 dark:border-purple-800/40 group-hover:scale-105 transition-transform duration-300 flex items-center justify-center overflow-hidden">
              <img src="/logo.svg" alt="ProBItian Official Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Pro<span className="text-amber-500 font-black">BI</span>tian
              </span>
              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 -mt-1 tracking-wider uppercase">
                Learn Data. Build Skills.
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 backdrop-blur-md">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => onNavigate(item.page)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: Dark Mode Toggle + Subscribe Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 border border-slate-200 dark:border-slate-700 transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>

            <a
              href="https://youtube.com/@probitian"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-radius px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-soft hover:shadow-soft-lg transition-all duration-300 flex items-center gap-2 group"
            >
              <Youtube className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
              <span>Subscribe</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-purple-600" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              aria-label="Open Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 mt-3 space-y-3 shadow-xl">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2.5 text-left text-sm font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <a
              href="https://youtube.com/@probitian"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-radius w-full py-3 bg-purple-600 text-white text-xs font-semibold shadow-soft flex items-center justify-center gap-2"
            >
              <Youtube className="w-4 h-4 text-red-400" />
              <span>Subscribe on YouTube</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
