import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Zap, Clock, Award, X, Crown, Shield, Star, Medal, Flame } from 'lucide-react';
import type { AchievementsState, Worklog } from '../db';
import { toRoman } from '../utils/roman';

interface AchievementsTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementsState;
  allWorklogs: Worklog[]; // Pass this to calculate current progress
  dailyTargetMinutes?: number;
}

export default function AchievementsTrackerModal({
  isOpen,
  onClose,
  achievements,
  allWorklogs,
  dailyTargetMinutes = 480,
}: AchievementsTrackerModalProps) {
  // Let's quickly calculate the current metrics so we can show exact progress numbers!
  const progress = useMemo(() => {
    let maxCategories = 0;
    let maxLogs = 0;
    let maxDuration = 0;
    let maxWeeklyMinutes = 0;
    let maxMonthlyMinutes = 0;
    let totalAllTimeMinutes = 0;
    const allUniqueTickets = new Set<string>();

    const categoriesPerDay: Record<string, Set<string>> = {};
    const logsPerDay: Record<string, number> = {};
    const minutesPerWeek: Record<string, number> = {};
    const minutesPerMonth: Record<string, number> = {};
    const minutesPerDay: Record<string, number> = {};

    for (const log of allWorklogs) {
      if (!categoriesPerDay[log.date]) categoriesPerDay[log.date] = new Set();
      if (log.category) categoriesPerDay[log.date].add(log.category);
      maxCategories = Math.max(maxCategories, categoriesPerDay[log.date].size);

      logsPerDay[log.date] = (logsPerDay[log.date] || 0) + 1;
      maxLogs = Math.max(maxLogs, logsPerDay[log.date]);

      const duration = log.endTime - log.startTime;
      maxDuration = Math.max(maxDuration, duration);

      // Re-implement simplified getIsoWeekStr
      const d = new Date(log.date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      const weekStr = `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
      
      minutesPerWeek[weekStr] = (minutesPerWeek[weekStr] || 0) + duration;
      maxWeeklyMinutes = Math.max(maxWeeklyMinutes, minutesPerWeek[weekStr]);

      const monthStr = log.date.substring(0, 7);
      minutesPerMonth[monthStr] = (minutesPerMonth[monthStr] || 0) + duration;
      maxMonthlyMinutes = Math.max(maxMonthlyMinutes, minutesPerMonth[monthStr]);

      minutesPerDay[log.date] = (minutesPerDay[log.date] || 0) + duration;

      totalAllTimeMinutes += duration;

      if (log.ticketId) allUniqueTickets.add(log.ticketId);
    }

    const uniqueTicketsCount = allUniqueTickets.size;

    let otDaysCount = 0;
    if (dailyTargetMinutes > 0) {
      for (const date in minutesPerDay) {
        if (minutesPerDay[date] > dailyTargetMinutes) {
          otDaysCount++;
        }
      }
    }

    let maxStreak = 0;
    const getWeekDiff = (w1: string, w2: string) => {
      const [y1, wk1] = w1.split('-W').map(Number);
      const [y2, wk2] = w2.split('-W').map(Number);
      return (y2 - y1) * 52 + (wk2 - wk1);
    };
    
    const sortedHits = Array.from(new Set(achievements.weeklyTargetsHit)).sort();
    if (sortedHits.length > 0) {
      let currStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < sortedHits.length; i++) {
        const diff = getWeekDiff(sortedHits[i-1], sortedHits[i]);
        if (diff === 1) {
          currStreak++;
          maxStreak = Math.max(maxStreak, currStreak);
        } else if (diff > 1) {
          currStreak = 1;
        }
      }
    }

    return {
      maxCategories,
      maxLogs,
      maxDuration,
      maxWeeklyMinutes,
      maxMonthlyMinutes,
      totalAllTimeMinutes,
      uniqueTicketsCount,
      maxStreak,
      otDaysCount,
    };
  }, [allWorklogs, achievements.weeklyTargetsHit, dailyTargetMinutes]);

  const cards = [
    {
      id: 'otThanks',
      title: 'OT Thanks!',
      description: 'Log work past your daily target on a single day.',
      icon: Flame,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      glow: 'from-amber-500/20',
      tiers: [1, 5, 10, 15, 20],
      currentTier: achievements.otThanks || 0,
      currentValue: progress.otDaysCount,
      unit: 'days',
      isInfinite: true,
    },
    {
      id: 'jack',
      title: 'Jack of All Trades',
      description: 'Log work across different unique ticket types in a single day.',
      icon: Award,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30',
      glow: 'from-purple-500/20',
      tiers: [4, 8, 12],
      currentTier: achievements.jackOfAllTrades,
      currentValue: progress.maxCategories,
      unit: 'types',
    },
    {
      id: 'cruncher',
      title: 'Ticket Cruncher',
      description: 'Create a massive amount of separate worklogs in a single day.',
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      glow: 'from-yellow-500/20',
      tiers: [5, 10, 20, 40, 80],
      currentTier: achievements.ticketCruncher,
      currentValue: progress.maxLogs,
      unit: 'logs',
    },
    {
      id: 'deep',
      title: 'Deep Work',
      description: 'Log a single continuous block of focused time.',
      icon: Clock,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      glow: 'from-blue-500/20',
      tiers: [2, 4, 8, 16, 32],
      currentTier: achievements.deepWork,
      currentValue: progress.maxDuration / 60,
      unit: 'hrs',
    },
    {
      id: 'marathon',
      title: 'Marathoner',
      description: 'Log an impressive total number of hours in a single week.',
      icon: Trophy,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      glow: 'from-orange-500/20',
      tiers: [10, 20, 40, 80, 160],
      currentTier: achievements.marathoner,
      currentValue: progress.maxWeeklyMinutes / 60,
      unit: 'hrs',
    },
    {
      id: 'monthly',
      title: 'Monthly Master',
      description: 'Rack up the hours logged across an entire calendar month.',
      icon: Crown,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      glow: 'from-rose-500/20',
      tiers: [40, 80, 120, 160, 200],
      currentTier: achievements.monthlyMaster,
      currentValue: progress.maxMonthlyMinutes / 60,
      unit: 'hrs',
    },
    {
      id: 'consistency',
      title: 'Consistency is Key',
      description: 'Meet your weekly target hours for consecutive weeks.',
      icon: Target,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      glow: 'from-emerald-500/20',
      tiers: [2, 4, 6, 8],
      currentTier: achievements.consistencyIsKey,
      currentValue: progress.maxStreak,
      unit: 'wks',
    },
    {
      id: 'starter',
      title: 'Ticket Starter',
      description: 'Log work against different unique tickets across all time.',
      icon: Medal,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      glow: 'from-cyan-500/20',
      tiers: [10, 25, 50, 100, 200],
      currentTier: achievements.ticketStarter,
      currentValue: progress.uniqueTicketsCount,
      unit: 'tks',
    },
    {
      id: 'gerald',
      title: "Gerald's Game",
      description: 'Achieve a grand total of 72 hours of work logged.',
      icon: Star,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      glow: 'from-indigo-500/20',
      tiers: [72],
      currentTier: achievements.geraldsGame || 0,
      currentValue: progress.totalAllTimeMinutes / 60,
      unit: 'hrs',
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 dark:bg-black/70 cursor-pointer"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 6 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card relative w-full max-w-4xl border border-surface-600/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-surface-600/40 bg-surface-800/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-500 shadow-sm">
                <Trophy size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary tracking-tight leading-tight">
                  Achievement Tracker
                </h2>
                <p className="text-xs text-text-secondary mt-0.5 font-normal">Track your progress and unlock legendary tiers.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:bg-surface-700/60 hover:text-text-primary rounded-full transition-all active:scale-95 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cards.map((card) => {
                const nextRequirement = card.isInfinite
                  ? card.currentTier === 0
                    ? 1
                    : card.currentTier * 5
                  : card.currentTier < card.tiers.length
                  ? card.tiers[card.currentTier]
                  : card.tiers[card.tiers.length - 1];

                const isMaxed = !card.isInfinite && card.currentTier === card.tiers.length;
                const progressPercent = isMaxed
                  ? 100
                  : Math.min(100, (card.currentValue / nextRequirement) * 100);

                // Compute markers
                let markerTiers: { tierNum: number; value: number; isReached: boolean }[] = [];
                let maxMarkerVal = 1;

                if (!card.isInfinite) {
                  maxMarkerVal = card.tiers[card.tiers.length - 1] || 1;
                  markerTiers = card.tiers.map((t, i) => ({
                    tierNum: i + 1,
                    value: t,
                    isReached: card.currentTier > i,
                  }));
                } else {
                  // Infinite tiers sliding window
                  const currentT = card.currentTier;
                  const startT = currentT < 5 ? 1 : currentT - 3;
                  const tierNums = [startT, startT + 1, startT + 2, startT + 3, startT + 4];
                  const getReq = (t: number) => (t === 1 ? 1 : (t - 1) * 5);
                  maxMarkerVal = getReq(tierNums[tierNums.length - 1]);
                  markerTiers = tierNums.map((t) => ({
                    tierNum: t,
                    value: getReq(t),
                    isReached: currentT >= t,
                  }));
                }

                return (
                  <div key={card.id} className={`relative rounded-2xl border ${isMaxed ? card.border : 'border-surface-600/40'} ${card.bg} p-5 overflow-hidden flex flex-col gap-4 transition-all duration-300 hover:shadow-lg`}>
                    {isMaxed && (
                      <div className={`absolute inset-0 bg-gradient-to-tr ${card.glow} via-transparent to-transparent opacity-30`} />
                    )}
                    
                    <div className="flex items-start gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl ${isMaxed ? card.bg : 'bg-surface-800/80'} border ${isMaxed ? card.border : 'border-surface-600/50'} flex items-center justify-center shrink-0 shadow-sm`}>
                        <card.icon size={22} className={isMaxed ? card.color : 'text-text-secondary'} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h3 className={`font-semibold text-sm tracking-tight truncate ${isMaxed ? card.color : 'text-text-primary'}`}>
                              {card.title}
                            </h3>
                            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed font-normal">
                              {card.description}
                            </p>
                          </div>
                          
                          {card.currentTier > 0 ? (
                            <div className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold font-mono border shrink-0 ${isMaxed ? card.border + ' ' + card.color : 'border-surface-600/60 text-text-secondary bg-surface-800/80'}`}>
                              TIER {toRoman(card.currentTier)}
                            </div>
                          ) : (
                            <div className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold font-mono border border-surface-600/50 text-text-muted bg-surface-800/80 shrink-0">
                              LOCKED
                            </div>
                          )}
                        </div>

                        {/* Progress Bar Area */}
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] font-semibold text-text-secondary mb-1.5 font-mono uppercase tracking-wider">
                            <span>Progress</span>
                            <span>{isMaxed ? 'MAX TIER REACHED' : `${card.currentValue.toFixed(card.unit === 'hrs' ? 1 : 0)} / ${nextRequirement} ${card.unit}`}</span>
                          </div>
                          <div className="h-2 bg-surface-800/80 rounded-full overflow-hidden border border-surface-600/40 p-px">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out relative ${isMaxed ? 'bg-gradient-to-r from-accent-600 to-accent-400' : 'bg-surface-500'}`}
                              style={{ width: `${progressPercent}%` }}
                            >
                              {isMaxed && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
                            </div>
                          </div>
                          
                          {/* Segment markers */}
                          <div className="flex justify-between mt-1.5 px-1 relative h-3">
                            {markerTiers.map((marker, i) => (
                              <div
                                key={i}
                                className="absolute flex flex-col items-center -translate-x-1/2"
                                style={{
                                  left: `${Math.max(4, Math.min(96, (marker.value / maxMarkerVal) * 100))}%`,
                                }}
                              >
                                <div
                                  className={`w-0.5 h-1 ${
                                    marker.isReached ? card.color : 'bg-surface-600'
                                  }`}
                                />
                                <span
                                  className={`text-[8px] font-mono mt-0.5 ${
                                    marker.isReached ? card.color : 'text-surface-500'
                                  }`}
                                >
                                  T{marker.tierNum}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
