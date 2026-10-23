import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  calculateOtThanksTier,
  getOtThanksRequirement,
  useAchievements,
} from './useAchievements';
import * as dbModule from '../db';
import type { Worklog, AchievementsState } from '../db';

describe('useAchievements - OT Thanks!', () => {
  describe('calculateOtThanksTier', () => {
    it('returns tier 0 when 0 days of overtime achieved', () => {
      expect(calculateOtThanksTier(0)).toBe(0);
    });

    it('returns tier 1 (first time) for 1 to 4 days of overtime', () => {
      expect(calculateOtThanksTier(1)).toBe(1);
      expect(calculateOtThanksTier(2)).toBe(1);
      expect(calculateOtThanksTier(3)).toBe(1);
      expect(calculateOtThanksTier(4)).toBe(1);
    });

    it('returns tier 2 (fifth time) for 5 to 9 days of overtime', () => {
      expect(calculateOtThanksTier(5)).toBe(2);
      expect(calculateOtThanksTier(6)).toBe(2);
      expect(calculateOtThanksTier(9)).toBe(2);
    });

    it('returns tier 3 (tenth time) for 10 to 14 days of overtime', () => {
      expect(calculateOtThanksTier(10)).toBe(3);
      expect(calculateOtThanksTier(14)).toBe(3);
    });

    it('supports infinite tiers with increments of 5', () => {
      expect(calculateOtThanksTier(15)).toBe(4);
      expect(calculateOtThanksTier(20)).toBe(5);
      expect(calculateOtThanksTier(25)).toBe(6);
      expect(calculateOtThanksTier(50)).toBe(11);
      expect(calculateOtThanksTier(100)).toBe(21);
    });
  });

  describe('getOtThanksRequirement', () => {
    it('returns correct requirement thresholds', () => {
      expect(getOtThanksRequirement(1)).toBe(1);
      expect(getOtThanksRequirement(2)).toBe(5);
      expect(getOtThanksRequirement(3)).toBe(10);
      expect(getOtThanksRequirement(4)).toBe(15);
      expect(getOtThanksRequirement(5)).toBe(20);
      expect(getOtThanksRequirement(6)).toBe(25);
    });
  });

  describe('useAchievements hook integration', () => {
    let mockAchState: AchievementsState;

    beforeEach(() => {
      mockAchState = {
        jackOfAllTrades: 5,
        ticketCruncher: 5,
        deepWork: 5,
        marathoner: 5,
        monthlyMaster: 5,
        consistencyIsKey: 5,
        ticketStarter: 5,
        geraldsGame: 1,
        weeklyTargetsHit: [],
        otThanks: 0,
      };

      vi.spyOn(dbModule, 'getAchievements').mockImplementation(() => mockAchState);
      vi.spyOn(dbModule, 'saveAchievements').mockImplementation((updates) => {
        mockAchState = { ...mockAchState, ...updates };
      });
    });

    it('unlocks OT Thanks! Tier 1 when total worklog duration on a day exceeds daily target', () => {
      // Daily target: 510 minutes (8.5 hours). Day log: 540 minutes (9.0 hours).
      const worklogs: Worklog[] = [
        {
          id: 1,
          date: '2026-10-23',
          startTime: 540, // 9:00 AM
          endTime: 1080,  // 6:00 PM (540 mins = 9 hrs)
          title: 'Project Task',
          description: 'Dev work',
          category: 'Dev',
          worklogType: 'Development',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const { result } = renderHook(() =>
        useAchievements(worklogs, worklogs, 2400, '2026-W43', 510)
      );

      expect(mockAchState.otThanks).toBe(1);
      expect(result.current.activeAchievement).not.toBeNull();
      expect(result.current.activeAchievement?.title).toBe('OT Thanks!');
      expect(result.current.activeAchievement?.tier).toBe(1);
      expect(result.current.activeAchievement?.icon).toBe('flame');
    });

    it('does NOT unlock OT Thanks! when daily worklog duration is less than or equal to daily target', () => {
      // Daily target: 480 minutes (8 hours). Day log: 480 minutes (8.0 hours).
      const worklogs: Worklog[] = [
        {
          id: 1,
          date: '2026-10-23',
          startTime: 540,
          endTime: 1020, // 480 mins
          title: 'Project Task',
          description: 'Dev work',
          category: 'Dev',
          worklogType: 'Development',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      renderHook(() =>
        useAchievements(worklogs, worklogs, 2400, '2026-W43', 480)
      );

      expect(mockAchState.otThanks).toBe(0);
    });

    it('unlocks Tier 2 (fifth time) when 5 different days exceed the daily target', () => {
      mockAchState.otThanks = 1; // Already unlocked Tier 1

      const worklogs: Worklog[] = [
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-22',
        '2026-10-23',
      ].map((date, idx) => ({
        id: idx + 1,
        date,
        startTime: 540,
        endTime: 1080, // 540 mins > 480 mins daily target
        title: 'Project Task',
        description: 'Overtime work',
        category: 'Dev',
        worklogType: 'Development',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));

      const { result } = renderHook(() =>
        useAchievements(worklogs, worklogs, 2400, '2026-W43', 480)
      );

      expect(mockAchState.otThanks).toBe(2);
      expect(result.current.activeAchievement?.title).toBe('OT Thanks!');
      expect(result.current.activeAchievement?.tier).toBe(2);
      expect(result.current.activeAchievement?.description).toContain('5 different days');
    });
  });
});
