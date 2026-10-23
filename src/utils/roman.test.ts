import { describe, it, expect } from 'vitest';
import { toRoman } from './roman';

describe('toRoman', () => {
  it('correctly converts small numbers to Roman numerals', () => {
    expect(toRoman(1)).toBe('I');
    expect(toRoman(2)).toBe('II');
    expect(toRoman(3)).toBe('III');
    expect(toRoman(4)).toBe('IV');
    expect(toRoman(5)).toBe('V');
    expect(toRoman(6)).toBe('VI');
    expect(toRoman(9)).toBe('IX');
    expect(toRoman(10)).toBe('X');
  });

  it('correctly converts achievement tier milestones', () => {
    expect(toRoman(1)).toBe('I');     // Tier I: first time
    expect(toRoman(2)).toBe('II');    // Tier II: fifth time
    expect(toRoman(3)).toBe('III');   // Tier III: tenth time
    expect(toRoman(4)).toBe('IV');    // Tier IV: fifteenth time
    expect(toRoman(5)).toBe('V');     // Tier V: twentieth time
    expect(toRoman(6)).toBe('VI');    // Tier VI: 25th time
    expect(toRoman(10)).toBe('X');    // Tier X
    expect(toRoman(20)).toBe('XX');
    expect(toRoman(50)).toBe('L');
  });

  it('handles zero, negative, and edge values gracefully', () => {
    expect(toRoman(0)).toBe('');
    expect(toRoman(-5)).toBe('');
    expect(toRoman(NaN)).toBe('');
  });
});
