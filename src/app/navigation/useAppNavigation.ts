import { useState, useEffect, useCallback } from 'react';

export interface ThemeControls {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function useTheme(): ThemeControls {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('probitian_theme');
      if (saved !== null) {
        return saved === 'dark';
      }
    }
    return false;
  });

  // Sync theme class to document and localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('probitian_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('probitian_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return {
    isDarkMode,
    toggleDarkMode,
  };
}
