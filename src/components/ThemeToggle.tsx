import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'compact' | 'full' | 'dropdown';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dropdown', className = '' }) => {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'full') {
    return (
      <div className={`p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            theme === 'light'
              ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Light Mode"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            theme === 'dark'
              ? 'bg-neutral-900 text-indigo-400 shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Dark Mode"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            theme === 'system'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Sync with Device Dark/Light Settings"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Device</span>
        </button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => {
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
        }}
        className={`p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-all active:scale-95 flex items-center gap-1.5 ${className}`}
        title={`Theme: ${theme.toUpperCase()} (${effectiveTheme} active) — Click to cycle`}
      >
        {theme === 'light' && <Sun className="w-4 h-4 text-amber-500" />}
        {theme === 'dark' && <Moon className="w-4 h-4 text-indigo-400" />}
        {theme === 'system' && <Laptop className="w-4 h-4 text-emerald-500" />}
        <span className="text-xs font-bold capitalize hidden sm:inline">
          {theme === 'system' ? 'Device' : theme}
        </span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
        title="Toggle Light / Dark / Device Theme"
      >
        {effectiveTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
        <span className="capitalize text-xs hidden md:inline">
          {theme === 'system' ? `Device (${effectiveTheme})` : theme}
        </span>
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
            Theme Preference
          </div>

          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              theme === 'light' ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Light Mode
            </span>
            {theme === 'light' && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">ACTIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              Dark Mode
            </span>
            {theme === 'dark' && <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-black">ACTIVE</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-xs font-bold flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
              theme === 'system' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-500" />
              Sync with Device
            </span>
            {theme === 'system' && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">SYNCED</span>}
          </button>
        </div>
      )}
    </div>
  );
};
