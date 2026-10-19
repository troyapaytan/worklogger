import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Target,
  Sun,
  Moon,
  Settings,
  Check,
  User,
  Trophy,
} from 'lucide-react';
import type { Worklog, SdpConfig, AchievementsState } from '../db';
import { getWeekRangeLabel, getWeekKey } from '../utils/dateUtils';
import { calculateDuration } from '../utils/ganttMath';

function formatCookieAge(timestamp?: number): string {
  if (!timestamp) return 'No cookie';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface HeaderProps {
  weekStart: Date;
  viewMode: 'weekly' | 'daily';
  weeklyWorklogs: Worklog[];
  dailyTarget: number;
  weeklyTarget: number;
  theme: 'light' | 'dark';
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSaveNow: () => void;
  onEditTargets: () => void;
  onEditColors: () => void;
  onOpenSdpSettings: () => void;
  onOpenAchievements: () => void;
  onSetTheme: (theme: 'light' | 'dark') => void;
  sdpConfig?: SdpConfig;
  achievements?: AchievementsState;
}

export default function Header({
  weekStart,
  weeklyWorklogs,
  weeklyTarget,
  theme,
  onPrevWeek,
  onNextWeek,
  onSaveNow,
  onEditTargets,
  onOpenSdpSettings,
  onOpenAchievements,
  onSetTheme,
  sdpConfig,
}: HeaderProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (themeMenuOpen || profileMenuOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [themeMenuOpen, profileMenuOpen]);

  const weekLabel = getWeekRangeLabel(weekStart);
  const weekKey = getWeekKey(weekStart);

  const totalWeeklyMinutes = useMemo(
    () =>
      weeklyWorklogs.reduce(
        (sum, log) => sum + calculateDuration(log.startTime, log.endTime),
        0
      ),
    [weeklyWorklogs]
  );

  const weeklyPercent = Math.min(
    100,
    (totalWeeklyMinutes / weeklyTarget) * 100
  );

  const weeklyHours = (totalWeeklyMinutes / 60).toFixed(1);
  const targetHours = (weeklyTarget / 60).toFixed(1);

  return (
    <header className="glass-card px-6 py-3.5 w-full relative z-50 transition-all">
      {/* Main Header Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: Weekly Target (Apple Activity Ring) */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
            <svg className="w-9 h-9 transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="14.5"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="transparent"
                className="text-surface-600/40"
              />
              <circle
                cx="18"
                cy="18"
                r="14.5"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="transparent"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${
                  weeklyPercent >= 100
                    ? 'text-emerald-500 drop-shadow-[0_0_4px_rgba(48,209,88,0.5)]'
                    : weeklyPercent >= 80
                      ? 'text-accent-500 drop-shadow-[0_0_4px_rgba(10,132,255,0.4)]'
                      : weeklyPercent >= 50
                        ? 'text-amber-500 drop-shadow-[0_0_4px_rgba(255,159,10,0.4)]'
                        : 'text-rose-500 drop-shadow-[0_0_4px_rgba(255,69,58,0.4)]'
                }`}
                strokeDasharray={2 * Math.PI * 14.5}
                strokeDashoffset={2 * Math.PI * 14.5 * (1 - Math.min(weeklyPercent, 100) / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-text-primary">
                {Math.round(weeklyPercent)}%
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider leading-tight">
              Weekly Target
            </span>
            <span className="text-xs font-semibold text-text-primary leading-tight mt-0.5">
              {weeklyHours} / {targetHours} hrs
            </span>
            <button
              onClick={onEditTargets}
              className="mt-1 flex items-center gap-1 text-[9px] text-accent-400 hover:text-accent-300 transition-colors cursor-pointer w-fit uppercase font-semibold active:scale-95"
            >
              <Target size={10} />
              Edit Targets
            </button>
          </div>
        </div>

        {/* Middle: Week Navigation (Positioned at absolute center) */}
        <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 order-3 sm:order-none sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-10">
          <button
            onClick={onPrevWeek}
            className="p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-secondary hover:text-text-primary"
            title="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center min-w-[190px] px-2 py-0.5">
            <div className="text-sm font-semibold tracking-tight text-text-primary">
              {weekLabel}
            </div>
            <div className="text-[11px] font-medium text-text-muted mt-0.5">{weekKey}</div>
          </div>
          <button
            onClick={onNextWeek}
            className="p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-secondary hover:text-text-primary"
            title="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 z-30 ml-auto sm:ml-0">
          {/* Theme Dropdown */}
          <div className="relative z-50" ref={themeMenuRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="p-2 hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer rounded-full"
              title="Change Theme"
            >
              {theme === 'light' ? (
                <Sun size={16} className="text-amber-500 drop-shadow-[0_0_4px_rgba(255,149,0,0.4)]" />
              ) : (
                <Moon size={16} className="text-accent-400 drop-shadow-[0_0_4px_rgba(10,132,255,0.4)]" />
              )}
            </button>

            <AnimatePresence>
              {themeMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.7 }}
                  className="absolute right-0 mt-2.5 w-44 bg-surface-800/90 backdrop-blur-2xl border border-surface-600/60 rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5 origin-top-right"
                >
                  <div className="space-y-0.5">
                    {(['dark', 'light'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          onSetTheme(t);
                          setThemeMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs font-medium rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                          theme === t
                            ? 'bg-accent-500 text-white font-semibold shadow-sm'
                            : 'text-text-primary hover:bg-surface-700/60 active:scale-[0.98]'
                        }`}
                      >
                        <span className="capitalize">{t}</span>
                        {theme === t && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-5 w-px bg-surface-600/50 my-auto" />

          {/* User Profile Dropdown */}
          <div className="relative z-50" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="p-1 hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer rounded-full flex items-center justify-center"
              title="User Profile & Settings"
            >
              <div className="w-7 h-7 rounded-full bg-surface-700/80 border border-surface-500/40 flex items-center justify-center shadow-sm">
                <User size={14} className="text-text-secondary" />
              </div>
            </button>

            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.7 }}
                  className="absolute right-0 mt-2.5 w-72 bg-surface-800/90 backdrop-blur-2xl border border-surface-600/60 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col p-2 origin-top-right"
                >
                  <div className="px-3.5 py-3 rounded-xl bg-surface-700/40 border border-surface-600/30 mb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-primary truncate">
                        {sdpConfig?.ownerName || 'User Profile'}
                      </span>
                      {sdpConfig?.ownerId && (
                        <span
                          className="text-[9px] text-text-muted bg-surface-700 border border-surface-600 px-1.5 py-0.5 rounded-md font-mono shrink-0 select-none"
                        >
                          {sdpConfig.ownerId}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-text-secondary">
                      <div className={`w-1.5 h-1.5 rounded-full ${!sdpConfig?.cookieUpdatedAt ? 'bg-red-500' : (Date.now() - sdpConfig.cookieUpdatedAt > 86400000 * 2 ? 'bg-amber-500' : 'bg-emerald-500')}`}></div>
                      Cookie: {formatCookieAge(sdpConfig?.cookieUpdatedAt)}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* Autosaving Indicator */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-surface-700/30 rounded-xl border border-surface-600/30">
                      <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        Autosaving
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active</span>
                    </div>

                    {/* Save to Disk Button */}
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onSaveNow();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-accent-500/15 hover:bg-accent-500/25 active:scale-[0.98] border border-accent-500/30 text-accent-400 hover:text-accent-300 rounded-xl transition-all cursor-pointer"
                      title="Force Save all data to Disk"
                    >
                      <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Save size={14} className="text-accent-400" />
                        Save to Disk
                      </span>
                      <span className="text-[10px] text-accent-400 font-semibold bg-accent-500/15 px-1.5 py-0.5 rounded-md">Sync Now</span>
                    </button>

                    <div className="h-px bg-surface-600/30 my-1" />

                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onOpenAchievements();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-surface-700/60 hover:bg-surface-700 active:scale-[0.98] border border-surface-600/40 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy size={14} className="text-accent-400" />
                        View Achievements
                      </span>
                      <ChevronRight size={14} className="text-text-secondary" />
                    </button>

                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        onOpenSdpSettings();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 bg-surface-700/60 hover:bg-surface-700 active:scale-[0.98] border border-surface-600/40 rounded-xl transition-all cursor-pointer"
                    >
                      <span className="text-[11px] font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Settings size={14} className="text-teal-400" />
                        SDP Settings
                      </span>
                      <ChevronRight size={14} className="text-text-secondary" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
