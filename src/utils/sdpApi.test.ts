import { describe, it, expect } from 'vitest';
import { parseSdpTimestamp } from './sdpApi';

describe('parseSdpTimestamp', () => {
  it('returns empty object for null or undefined', () => {
    expect(parseSdpTimestamp(null)).toEqual({});
    expect(parseSdpTimestamp(undefined)).toEqual({});
    expect(parseSdpTimestamp('')).toEqual({});
  });

  it('parses object with value millis and display_value', () => {
    const obj = {
      value: '1725247200000',
      display_value: 'Sep 2, 2026, 10:00 AM'
    };
    const res = parseSdpTimestamp(obj);
    expect(res.time).toBe(1725247200000);
    expect(res.formatted).toBe('Sep 2, 2026, 10:00 AM');
  });

  it('parses numeric epoch milliseconds', () => {
    const ms = 1725247200000;
    const res = parseSdpTimestamp(ms);
    expect(res.time).toBe(ms);
    expect(res.formatted).toBeDefined();
  });

  it('parses string epoch milliseconds', () => {
    const res = parseSdpTimestamp('1725247200000');
    expect(res.time).toBe(1725247200000);
    expect(res.formatted).toBeDefined();
  });

  it('parses ISO date string', () => {
    const iso = '2026-09-02T10:00:00Z';
    const res = parseSdpTimestamp(iso);
    expect(res.time).toBe(new Date(iso).getTime());
    expect(res.formatted).toBeDefined();
  });
});
