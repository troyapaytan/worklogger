import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSdpTimestamp,
  detectTicketType,
  formatChangeTaskLabel,
  fetchChangeTasks,
  clearChangeTasksCache,
  postWorklogToSdp,
} from './sdpApi';
import type { SdpConfig } from '../db';

describe('parseSdpTimestamp', () => {
  it('returns empty object for null or undefined', () => {
    expect(parseSdpTimestamp(null)).toEqual({});
    expect(parseSdpTimestamp(undefined)).toEqual({});
    expect(parseSdpTimestamp('')).toEqual({});
  });

  it('parses object with value millis and display_value', () => {
    const obj = {
      value: '1725247200000',
      display_value: 'Sep 2, 2026, 10:00 AM',
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

describe('detectTicketType & formatChangeTaskLabel', () => {
  it('detects CH vs SR ticket prefixes case-insensitively', () => {
    expect(detectTicketType('CH-4233')).toBe('CH');
    expect(detectTicketType('ch-100')).toBe('CH');
    expect(detectTicketType('7318427')).toBe('SR');
    expect(detectTicketType('SR-7318427')).toBe('SR');
  });

  it('formats Change Task label with stage suffix when stage is present', () => {
    expect(
      formatChangeTaskLabel({
        title: 'SM Markets - BDO Credit Tender_SMCO/PSI',
        changeStage: 'Build',
      })
    ).toBe('SM Markets - BDO Credit Tender_SMCO/PSI [Build]');

    expect(
      formatChangeTaskLabel({
        title: 'Create and Upload Final Requirements Document',
      })
    ).toBe('Create and Upload Final Requirements Document');
  });
});

describe('fetchChangeTasks & postWorklogToSdp', () => {
  const mockSdpConfig: SdpConfig = {
    cookieString: 'JSESSIONID=test;',
    csrfToken: 'sdpcsparam=testcsrf',
    appId: '696655712',
    ownerId: '108026001157415656',
    worklogTypeMap: {
      Coding: '108026000424780182',
    },
  };

  beforeEach(() => {
    clearChangeTasksCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches, filters deleted tasks, sorts by stageIndex then index, and caches results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response_status: [{ status_code: 2000, status: 'success' }],
        list_info: { has_more_rows: false, start_index: 1, row_count: 3 },
        tasks: [
          {
            id: '108026001228664467',
            title: 'SM Markets - BDO Credit Tender',
            index: 2,
            deleted: false,
            change_stage: { name: 'Build', stage_index: 5 },
            status: { name: 'In Progress', in_progress: true },
            owner: { id: '108026001157415656', name: 'Test Dev' },
          },
          {
            id: '108026001143121360',
            title: 'Create and Upload Final Requirements Document',
            index: 1,
            deleted: false,
            change_stage: { name: 'Analyze', stage_index: 3 },
            status: { name: 'Open', in_progress: true },
            owner: null,
            marked_technician: { id: '999', name: 'Lead Analyst' },
          },
          {
            id: '108026009999999999',
            title: 'Deleted Task Should Be Ignored',
            index: 1,
            deleted: true,
            change_stage: { name: 'Analyze', stage_index: 1 },
          },
        ],
      }),
    } as Response);

    const res1 = await fetchChangeTasks('108026001133988859', mockSdpConfig);
    expect(res1.error).toBeUndefined();
    expect(res1.tasks).toHaveLength(2);
    // Stage 3 (Analyze) comes before Stage 5 (Build)
    expect(res1.tasks![0].id).toBe('108026001143121360');
    expect(res1.tasks![0].changeStage).toBe('Analyze');
    expect(res1.tasks![0].ownerName).toBe('Lead Analyst');
    expect(res1.tasks![1].id).toBe('108026001228664467');
    expect(res1.tasks![1].changeStage).toBe('Build');
    expect(res1.tasks![1].ownerId).toBe('108026001157415656');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(bodySent.url).toContain(
      'https://servicedeskplus.smretailinc.com/api/v3/changes/108026001133988859/tasks?input_data='
    );

    // Repeat call uses cache without hitting network
    const res2 = await fetchChangeTasks('108026001133988859', mockSdpConfig);
    expect(res2.tasks).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // forceRefresh bypasses cache
    await fetchChangeTasks('108026001133988859', mockSdpConfig, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('posts worklog to Change Task endpoint when CH ticket has taskId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response_status: { status_code: 2000, status: 'success' },
      }),
    } as Response);

    const res = await postWorklogToSdp(
      {
        date: '2026-10-30',
        startTime: 540,
        endTime: 600,
        description: 'Implemented tender reconciliation',
        worklogType: 'Coding',
        ticketId: 'CH-4233',
        urlTicketId: '108026001133988859',
        taskId: '108026001228664467',
      },
      mockSdpConfig,
      mockSdpConfig.ownerId
    );

    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(sent.url).toBe(
      'https://servicedeskplus.smretailinc.com/api/v3/changes/108026001133988859/tasks/108026001228664467/worklogs'
    );
    expect(sent.payload.worklog.time_spent).toEqual({ hours: '1', minutes: '0' });
    expect(sent.payload.worklog.owner).toEqual({ id: '108026001157415656' });
    expect(sent.payload.worklog.worklog_type).toEqual({ id: '108026000424780182' });
  });

  it('posts worklog to main Change endpoint when CH ticket has empty taskId', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response_status: { status_code: 2000, status: 'success' },
      }),
    } as Response);

    const res = await postWorklogToSdp(
      {
        date: '2026-10-30',
        startTime: 540,
        endTime: 600,
        description: 'Main change update',
        worklogType: 'Coding',
        ticketId: 'CH-4233',
        urlTicketId: '108026001133988859',
        taskId: '',
      },
      mockSdpConfig,
      mockSdpConfig.ownerId
    );

    expect(res.success).toBe(true);
    const sent = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(sent.url).toBe(
      'https://servicedeskplus.smretailinc.com/api/v3/changes/108026001133988859/worklogs'
    );
  });

  it('posts SR ticket to requests endpoint even if taskId is passed', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        response_status: { status_code: 2000, status: 'success' },
      }),
    } as Response);

    const res = await postWorklogToSdp(
      {
        date: '2026-10-30',
        startTime: 540,
        endTime: 600,
        description: 'SR investigation',
        worklogType: 'Coding',
        ticketId: '7318427',
        urlTicketId: '108026005555555555',
        taskId: '108026001228664467',
      },
      mockSdpConfig,
      mockSdpConfig.ownerId
    );

    expect(res.success).toBe(true);
    const sent = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(sent.url).toBe(
      'https://servicedeskplus.smretailinc.com/api/v3/requests/108026005555555555/worklogs'
    );
  });
});
