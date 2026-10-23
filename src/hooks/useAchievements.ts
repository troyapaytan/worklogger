import { useState, useEffect, useRef } from 'react';
import type { Worklog } from '../db';
import { getAchievements, saveAchievements } from '../db';
import type { AchievementsState } from '../db';
import type { AchievementData } from '../components/AchievementModal';

// Helper to get ISO week year and week number
function getIsoWeekStr(dateStr: string) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Calculates the tier for "OT Thanks!" achievement.
 * Tier 0: 0 OT days (Locked)
 * Tier 1: 1 OT day (first time)
 * Tier 2: 5 OT days (fifth time)
 * Tier 3: 10 OT days (tenth time)
 * Tier N (N >= 2): (N - 1) * 5 OT days
 * Infinite tiers, incrementing every 5.
 */
export function calculateOtThanksTier(otDaysCount: number): number {
  if (otDaysCount < 1) return 0;
  if (otDaysCount < 5) return 1;
  return Math.floor(otDaysCount / 5) + 1;
}

export function getOtThanksRequirement(tier: number): number {
  if (tier <= 1) return 1;
  return (tier - 1) * 5;
}

export function useAchievements(
  allWorklogs: Worklog[],
  weeklyWorklogs: Worklog[],
  weeklyTargetMinutes: number,
  currentWeekKey: string,
  dailyTargetMinutes: number = 480
) {
  const [activeAchievement, setActiveAchievement] = useState<AchievementData | null>(null);
  const queueRef = useRef<AchievementData[]>([]);
  const isProcessingRef = useRef(false);
  const shownAchievementsRef = useRef<Set<string>>(new Set());

  const enqueue = (ach: AchievementData) => {
    if (shownAchievementsRef.current.has(ach.id)) return;
    shownAchievementsRef.current.add(ach.id);
    queueRef.current.push(ach);
    processQueue();
  };

  const processQueue = () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const next = queueRef.current.shift()!;
    setActiveAchievement(next);
  };

  const clearActive = () => {
    setActiveAchievement(null);
    isProcessingRef.current = false;
    // Add a slight delay before showing the next one
    setTimeout(processQueue, 500);
  };

  // Run calculation whenever worklogs change
  useEffect(() => {
    if (!allWorklogs || allWorklogs.length === 0) return;

    const achState = getAchievements();
    const newAchState: Partial<AchievementsState> = {};
    let unlocked = false;

    // --- 1. Jack of All Trades (Daily Unique Categories) ---
    const categoriesPerDay: Record<string, Set<string>> = {};
    let maxCategories = 0;

    // --- 2. Ticket Cruncher (Daily Logs Count) ---
    const logsPerDay: Record<string, number> = {};
    let maxLogs = 0;

    // --- 3. Deep Work (Max Duration in Minutes) ---
    let maxDuration = 0;

    // --- 4. Marathoner (Weekly Total Minutes) ---
    const minutesPerWeek: Record<string, number> = {};
    let maxWeeklyMinutes = 0;

    // --- NEW: Monthly Master (Monthly Total Minutes) ---
    const minutesPerMonth: Record<string, number> = {};
    let maxMonthlyMinutes = 0;

    // --- NEW: Ticket Starter (Unique tickets) ---
    const allUniqueTickets = new Set<string>();

    // --- NEW: Gerald's Game (All-time total 72 hours) ---
    let totalAllTimeMinutes = 0;

    // --- NEW: OT Thanks! (Daily minutes) ---
    const minutesPerDay: Record<string, number> = {};

    for (const log of allWorklogs) {
      // Jack of All Trades
      if (!categoriesPerDay[log.date]) categoriesPerDay[log.date] = new Set();
      if (log.category) categoriesPerDay[log.date].add(log.category);
      maxCategories = Math.max(maxCategories, categoriesPerDay[log.date].size);

      // Ticket Cruncher
      logsPerDay[log.date] = (logsPerDay[log.date] || 0) + 1;
      maxLogs = Math.max(maxLogs, logsPerDay[log.date]);

      // Deep Work
      const duration = log.endTime - log.startTime;
      maxDuration = Math.max(maxDuration, duration);

      // Marathoner
      const weekStr = getIsoWeekStr(log.date);
      minutesPerWeek[weekStr] = (minutesPerWeek[weekStr] || 0) + duration;
      maxWeeklyMinutes = Math.max(maxWeeklyMinutes, minutesPerWeek[weekStr]);

      // Monthly Master
      const monthStr = log.date.substring(0, 7); // YYYY-MM
      minutesPerMonth[monthStr] = (minutesPerMonth[monthStr] || 0) + duration;
      maxMonthlyMinutes = Math.max(maxMonthlyMinutes, minutesPerMonth[monthStr]);

      // Ticket Starter
      if (log.ticketId) allUniqueTickets.add(log.ticketId);

      // Gerald's Game
      totalAllTimeMinutes += duration;

      // OT Thanks
      minutesPerDay[log.date] = (minutesPerDay[log.date] || 0) + duration;
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

    // --- NEW: Consistency is Key (Consecutive weeks met) ---
    let maxStreak = 0;
    // Helper to get week number difference
    const getWeekDiff = (w1: string, w2: string) => {
      const [y1, wk1] = w1.split('-W').map(Number);
      const [y2, wk2] = w2.split('-W').map(Number);
      return (y2 - y1) * 52 + (wk2 - wk1); // Approximation for streaks, works fine generally
    };
    
    // Sort and calculate longest streak from achState.weeklyTargetsHit + current week if just hit
    const allHits = new Set([...achState.weeklyTargetsHit]);
    if (weeklyWorklogs.length > 0 && weeklyTargetMinutes > 0) {
      const currentWeekTotal = weeklyWorklogs.reduce((acc, log) => acc + (log.endTime - log.startTime), 0);
      if (currentWeekTotal >= weeklyTargetMinutes) {
        allHits.add(currentWeekKey);
      }
    }
    
    const sortedHits = Array.from(allHits).sort();
    if (sortedHits.length > 0) {
      let currStreak = 1;
      maxStreak = 1;
      for (let i = 1; i < sortedHits.length; i++) {
        if (getWeekDiff(sortedHits[i-1], sortedHits[i]) === 1) {
          currStreak++;
          maxStreak = Math.max(maxStreak, currStreak);
        } else if (getWeekDiff(sortedHits[i-1], sortedHits[i]) > 1) {
          currStreak = 1;
        }
      }
    }

    // Evaluate Custom Tiers (array-based)
    const evaluateCustomTier = (requirements: number[], currentMax: number, currentTier: number): number => {
      let newTier = currentTier;
      while (newTier < requirements.length) {
        if (currentMax >= requirements[newTier]) {
          newTier++;
        } else {
          break;
        }
      }
      return newTier;
    };

    // Evaluate Tiers (Base * 2^(tier-1))
    const evaluateTier = (base: number, currentMax: number, currentTier: number): number => {
      let newTier = currentTier;
      while (newTier < 5) {
        const requirement = base * Math.pow(2, newTier); // tier 0 -> base * 1, tier 1 -> base * 2, etc.
        if (currentMax >= requirement) {
          newTier++;
        } else {
          break;
        }
      }
      return newTier;
    };

    // Jack of All Trades -> 4, 8, 12
    const jackReqs = [4, 8, 12];
    const newJackTier = evaluateCustomTier(jackReqs, maxCategories, achState.jackOfAllTrades || 0);
    if (newJackTier > (achState.jackOfAllTrades || 0)) {
      newAchState.jackOfAllTrades = newJackTier;
      unlocked = true;
      enqueue({
        id: `jack_${newJackTier}`,
        title: 'Jack of All Trades',
        description: `Logged work across ${jackReqs[newJackTier - 1]} unique ticket types in a single day!`,
        tier: newJackTier,
        icon: 'award'
      });
    }

    // Ticket Cruncher (Base 5) -> 5, 10, 20, 40, 80
    const newCruncherTier = evaluateTier(5, maxLogs, achState.ticketCruncher);
    if (newCruncherTier > achState.ticketCruncher) {
      newAchState.ticketCruncher = newCruncherTier;
      unlocked = true;
      enqueue({
        id: `cruncher_${newCruncherTier}`,
        title: 'Ticket Cruncher',
        description: `Created ${5 * Math.pow(2, newCruncherTier - 1)} separate worklogs in a single day!`,
        tier: newCruncherTier,
        icon: 'zap'
      });
    }

    // Deep Work (Base 2h = 120m) -> 2h, 4h, 8h, 16h, 32h
    const newDeepTier = evaluateTier(120, maxDuration, achState.deepWork);
    if (newDeepTier > achState.deepWork) {
      newAchState.deepWork = newDeepTier;
      unlocked = true;
      enqueue({
        id: `deep_${newDeepTier}`,
        title: 'Deep Work',
        description: `Logged a single continuous block of ${2 * Math.pow(2, newDeepTier - 1)} hours!`,
        tier: newDeepTier,
        icon: 'clock'
      });
    }

    // Marathoner (Base 10h = 600m) -> 10h, 20h, 40h, 80h, 160h
    const newMarathonTier = evaluateTier(600, maxWeeklyMinutes, achState.marathoner || 0);
    if (newMarathonTier > (achState.marathoner || 0)) {
      newAchState.marathoner = newMarathonTier;
      unlocked = true;
      enqueue({
        id: `marathon_${newMarathonTier}`,
        title: 'Marathoner',
        description: `Logged a total of ${10 * Math.pow(2, newMarathonTier - 1)} hours in a single week!`,
        tier: newMarathonTier,
        icon: 'trophy'
      });
    }

    // Monthly Master (Base 40h = 2400m) -> 40h, 80h, 120h, 160h, 200h (arithmetic)
    const monthlyReqs = [2400, 4800, 7200, 9600, 12000]; // in minutes
    const newMonthlyTier = evaluateCustomTier(monthlyReqs, maxMonthlyMinutes, achState.monthlyMaster || 0);
    if (newMonthlyTier > (achState.monthlyMaster || 0)) {
      newAchState.monthlyMaster = newMonthlyTier;
      unlocked = true;
      enqueue({
        id: `monthly_${newMonthlyTier}`,
        title: 'Monthly Master',
        description: `Logged ${monthlyReqs[newMonthlyTier - 1] / 60} hours in a single calendar month!`,
        tier: newMonthlyTier,
        icon: 'trophy'
      });
    }

    // Consistency is Key -> 2, 4, 6, 8 weeks
    const consistencyReqs = [2, 4, 6, 8];
    const newConsistencyTier = evaluateCustomTier(consistencyReqs, maxStreak, achState.consistencyIsKey || 0);
    if (newConsistencyTier > (achState.consistencyIsKey || 0)) {
      newAchState.consistencyIsKey = newConsistencyTier;
      unlocked = true;
      enqueue({
        id: `consistency_${newConsistencyTier}`,
        title: 'Consistency is Key',
        description: `Met your weekly target for ${consistencyReqs[newConsistencyTier - 1]} consecutive weeks!`,
        tier: newConsistencyTier,
        icon: 'target'
      });
    }

    // Ticket Starter -> 10, 25, 50, 100, 200
    const ticketReqs = [10, 25, 50, 100, 200];
    const newTicketTier = evaluateCustomTier(ticketReqs, uniqueTicketsCount, achState.ticketStarter || 0);
    if (newTicketTier > (achState.ticketStarter || 0)) {
      newAchState.ticketStarter = newTicketTier;
      unlocked = true;
      enqueue({
        id: `ticket_${newTicketTier}`,
        title: 'Ticket Starter',
        description: `Logged work against ${ticketReqs[newTicketTier - 1]} unique tickets overall!`,
        tier: newTicketTier,
        icon: 'zap'
      });
    }

    // Gerald's Game -> 72 hours (4320 mins)
    if ((achState.geraldsGame || 0) === 0 && totalAllTimeMinutes >= 4320) {
      newAchState.geraldsGame = 1;
      unlocked = true;
      enqueue({
        id: `geralds_game_1`,
        title: "Gerald's Game",
        description: `Achieved a grand total of 72 hours of work logged!`,
        tier: 1,
        icon: 'star'
      });
    }

    // --- OT Thanks! (Infinite tiers: 1st, 5th, 10th, 15th, etc.) ---
    const newOtTier = calculateOtThanksTier(otDaysCount);
    if (newOtTier > (achState.otThanks || 0)) {
      newAchState.otThanks = newOtTier;
      unlocked = true;
      enqueue({
        id: `ot_thanks_${newOtTier}`,
        title: 'OT Thanks!',
        description:
          newOtTier === 1
            ? 'Logged overtime past your daily target for the first time!'
            : `Logged overtime past your daily target on ${(newOtTier - 1) * 5} different days!`,
        tier: newOtTier,
        icon: 'flame',
      });
    }

    // --- 5. Weekly Target Hit ---
    if (weeklyWorklogs.length > 0 && weeklyTargetMinutes > 0) {
      const currentWeekTotal = weeklyWorklogs.reduce((acc, log) => acc + (log.endTime - log.startTime), 0);
      if (currentWeekTotal >= weeklyTargetMinutes) {
        if (!achState.weeklyTargetsHit.includes(currentWeekKey)) {
          newAchState.weeklyTargetsHit = [...achState.weeklyTargetsHit, currentWeekKey];
          unlocked = true;
          enqueue({
            id: `target_${currentWeekKey}`,
            title: 'Target Hit!',
            description: `You reached your goal of ${(weeklyTargetMinutes / 60).toFixed(1)} hours this week! Awesome job!`,
            tier: 0,
            icon: 'target'
          });
        }
      }
    }

    // Save if any new achievements unlocked
    if (unlocked) {
      saveAchievements(newAchState);
    }
  }, [allWorklogs, weeklyWorklogs, weeklyTargetMinutes, currentWeekKey, dailyTargetMinutes]);

  return { activeAchievement, clearActive };
}
