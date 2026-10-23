import { useState, useEffect } from 'react';

export interface Worklog {
  id?: number;
  uuid: string;
  date: string;           // YYYY-MM-DD
  startTime: number;      // Minutes from midnight
  endTime: number;        // Minutes from midnight
  title: string;
  description: string;
  ticketId?: string;
  urlTicketId?: string;
  category?: string;
  worklogType?: string;
  createdAt: number;
  updatedAt: number;
  sdpPosted?: boolean;
  sdpPostedAt?: number;
}

export interface UserTarget {
  id?: number;
  key: string;            // "default" or week key
  dailyMinutes: number;   // e.g. 480
  weeklyMinutes: number;  // e.g. 2400
}

export interface CategoryColor {
  id?: number;
  category: string;
  customName?: string;
  ticketId?: string;
  urlTicketId?: string;
  ownerId?: string;
  status?: string;
  color: string;
}

export interface SdpConfig {
  cookieString?: string;
  csrfToken?: string;
  appId?: string;
  ownerId?: string;
  ownerName?: string;
  cookieUpdatedAt?: number;
  worklogTypeMap?: Record<string, string>;
}

export interface AchievementsState {
  jackOfAllTrades: number; // Highest tier unlocked (0-5)
  ticketCruncher: number;
  deepWork: number;
  marathoner: number;
  monthlyMaster: number;
  consistencyIsKey: number;
  ticketStarter: number;
  geraldsGame: number;
  weeklyTargetsHit: string[]; // Store "YYYY-Wxx"
  otThanks: number; // "OT Thanks!" infinite tiers (1=1st, 2=5th, 3=10th, etc.)
}

export interface FullDataPayload {
  worklogs: Worklog[];
  targets: UserTarget[];
  categoryColors: CategoryColor[];
  config?: {
    theme?: 'dark' | 'light';
    use24h?: boolean;
    zoom?: number;
    selectedDate?: string;
    viewMode?: 'weekly' | 'daily';
    sdpConfig?: SdpConfig;
  };
  achievements?: AchievementsState;
  exportedAt?: string;
}

// In-memory state
let state: FullDataPayload = {
  worklogs: [],
  targets: [{ id: Date.now(), key: 'default', dailyMinutes: 480, weeklyMinutes: 2400 }],
  categoryColors: [],
  config: {},
  achievements: {
    jackOfAllTrades: 0,
    ticketCruncher: 0,
    deepWork: 0,
    marathoner: 0,
    monthlyMaster: 0,
    consistencyIsKey: 0,
    ticketStarter: 0,
    geraldsGame: 0,
    weeklyTargetsHit: [],
    otThanks: 0
  }
};

// Event emitter
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }

// Custom useLiveQuery to replace dexie-react-hooks
export function useLiveQuery<T>(queryFn: () => T | Promise<T>, deps: any[] = [], defaultVal?: T): T | undefined {
  const [data, setData] = useState<T | undefined>(defaultVal);
  
  useEffect(() => {
    let isActive = true;
    const update = async () => {
      try {
        const result = queryFn();
        if (result instanceof Promise) {
          const resolved = await result;
          if (isActive) setData(resolved);
        } else {
          if (isActive) setData(result);
        }
      } catch (e) {
        console.error('LiveQuery error:', e);
      }
    };
    update(); // Initial run
    listeners.add(update);
    return () => { 
      isActive = false;
      listeners.delete(update); 
    };
  }, deps);

  return data;
}

// API Sync (Debounced to prevent spamming file writes)
let syncTimeout: any;
async function syncToBackend() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch(e) {
      console.error('Failed to sync to backend', e);
    }
  }, 500);
}

export async function initDB() {
  let res;
  try {
    res = await fetch('/api/data');
  } catch (e) {
    console.error('Network error fetching /api/data:', e);
    throw e;
  }

  if (res.ok) {
    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error('Failed to parse worklogger_data.json (corrupted file?):', e);
      throw e;
    }

    state = {
      worklogs: data.worklogs || [],
      targets: data.targets || [{ id: Date.now(), key: 'default', dailyMinutes: 480, weeklyMinutes: 2400 }],
      categoryColors: data.categoryColors || [],
      config: data.config || {}
    };
    
    // Migrate old config root keys if necessary
    if (!data.config && data.theme) {
       state.config = {
         theme: data.theme,
         use24h: data.use24h,
         zoom: data.zoom,
         sdpConfig: data.sdpConfig || {}
       };
       if (data.cookieString || data.ownerId) {
          state.config!.sdpConfig = {
             ...state.config!.sdpConfig,
             cookieString: data.cookieString,
             csrfToken: data.csrfToken,
             ownerId: data.ownerId,
             ownerName: data.ownerName,
             appId: data.appId,
             worklogTypeMap: data.worklogTypeMap
          };
       }
    }
    
    if (data.achievements) {
      state.achievements = { ...state.achievements, ...data.achievements };
    }

    // Ensure IDs exist
    state.worklogs.forEach((w: any, i: number) => { if (!w.id) w.id = Date.now() + i; });
    state.targets.forEach((t: any, i: number) => { if (!t.id) t.id = Date.now() + i; });
    state.categoryColors.forEach((c: any, i: number) => { if (!c.id) c.id = Date.now() + i; });

    notify();
  } else if (res.status === 404) {
    console.log('No worklogger_data.json found, starting with defaults');
  } else {
    throw new Error(`Server returned status ${res.status} when fetching /api/data`);
  }
}

export function getConfig() {
  return state.config;
}

export function saveConfig(cfg: any) {
  state.config = { ...state.config, ...cfg };
  notify();
  syncToBackend();
}

export async function forceSyncToBackend() {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
}

export function getAchievements(): AchievementsState {
  return state.achievements || {
    jackOfAllTrades: 0,
    ticketCruncher: 0,
    deepWork: 0,
    marathoner: 0,
    monthlyMaster: 0,
    consistencyIsKey: 0,
    ticketStarter: 0,
    geraldsGame: 0,
    weeklyTargetsHit: [],
    otThanks: 0
  };
}

export function saveAchievements(ach: Partial<AchievementsState>) {
  if (!state.achievements) {
    state.achievements = {
      jackOfAllTrades: 0,
      ticketCruncher: 0,
      deepWork: 0,
      marathoner: 0,
      monthlyMaster: 0,
      consistencyIsKey: 0,
      ticketStarter: 0,
      geraldsGame: 0,
      weeklyTargetsHit: [],
      otThanks: 0
    };
  }
  state.achievements = { ...state.achievements, ...ach };
  notify();
  syncToBackend();
}

// ===== Repository helpers =====

export async function getWorklogsByDateRange(startDate: string, endDate: string): Promise<Worklog[]> {
  return state.worklogs.filter(l => l.date >= startDate && l.date <= endDate).sort((a,b) => a.startTime - b.startTime);
}

export async function getWorklogsByDate(date: string): Promise<Worklog[]> {
  return state.worklogs.filter(l => l.date === date).sort((a,b) => a.startTime - b.startTime);
}

export async function createWorklog(log: Omit<Worklog, 'id'>): Promise<number> {
  const id = Date.now();
  state.worklogs.push({ ...log, id });
  notify();
  syncToBackend();
  return id;
}

export async function updateWorklog(id: number, updates: Partial<Worklog>): Promise<number> {
  const idx = state.worklogs.findIndex(w => w.id === id);
  if (idx > -1) {
    state.worklogs[idx] = { ...state.worklogs[idx], ...updates, updatedAt: Date.now() };
    notify();
    syncToBackend();
  }
  return id;
}

export async function deleteWorklog(id: number): Promise<void> {
  state.worklogs = state.worklogs.filter(w => w.id !== id);
  notify();
  syncToBackend();
}

export async function getTargets(): Promise<UserTarget[]> {
  return state.targets;
}

export async function getDefaultTarget(): Promise<UserTarget> {
  return state.targets.find(t => t.key === 'default') || { key: 'default', dailyMinutes: 480, weeklyMinutes: 2400 };
}

export async function saveTarget(target: Partial<UserTarget> & { key: string }): Promise<number> {
  const idx = state.targets.findIndex(t => t.key === target.key);
  if (idx > -1) {
    state.targets[idx] = { ...state.targets[idx], ...target };
  } else {
    state.targets.push({ id: Date.now(), ...target } as UserTarget);
  }
  notify();
  syncToBackend();
  return Date.now();
}

export async function getCategoryColors(): Promise<CategoryColor[]> {
  return state.categoryColors;
}

export async function saveCategoryColor(
  category: string,
  color: string,
  customName?: string,
  ticketId?: string,
  urlTicketId?: string,
  ownerId?: string,
  status?: string
): Promise<void> {
  const idx = state.categoryColors.findIndex(c => c.category === category);
  if (idx > -1) {
    state.categoryColors[idx] = { ...state.categoryColors[idx], color, customName, ticketId, urlTicketId, ownerId, status };
  } else {
    state.categoryColors.push({ id: Date.now(), category, color, customName, ticketId, urlTicketId, ownerId, status });
  }
  notify();
  syncToBackend();
}

export async function setAllCategoryColors(
  list: { category: string; color: string; customName?: string; ticketId?: string; urlTicketId?: string; ownerId?: string; status?: string }[]
): Promise<void> {
  state.categoryColors = list.map((item, i) => ({
    id: Date.now() + i,
    category: item.category,
    color: item.color,
    customName: item.customName,
    ticketId: item.ticketId,
    urlTicketId: item.urlTicketId,
    ownerId: item.ownerId,
    status: item.status
  }));
  notify();
  syncToBackend();
}

export async function resetCategoryColorsToDefault(): Promise<void> {
  state.categoryColors = [];
  notify();
  syncToBackend();
}

export async function exportDataToJson(config?: FullDataPayload['config']): Promise<string> {
  if (config) state.config = config;
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export async function importDataFromJson(jsonString: string): Promise<FullDataPayload['config'] | undefined> {
  const data = JSON.parse(jsonString);
  if (data.worklogs) state.worklogs = data.worklogs;
  if (data.targets) state.targets = data.targets;
  if (data.categoryColors) state.categoryColors = data.categoryColors;
  if (data.config) state.config = data.config;
  if (data.achievements) state.achievements = { ...state.achievements, ...data.achievements };
  
  // ensure IDs exist
  state.worklogs.forEach((w, i) => { if (!w.id) w.id = Date.now() + i; });
  state.targets.forEach((t, i) => { if (!t.id) t.id = Date.now() + i; });
  state.categoryColors.forEach((c, i) => { if (!c.id) c.id = Date.now() + i; });
  
  notify();
  syncToBackend();
  return state.config;
}

export async function isDatabaseEmpty(): Promise<boolean> {
  return state.worklogs.length === 0;
}

// Emulate db.worklogs.clear() and db.categoryColors.clear() for App.tsx
export const db = {
  worklogs: {
    clear: async () => {
      state.worklogs = [];
      notify();
      syncToBackend();
    },
    toArray: () => [...state.worklogs]
  },
  categoryColors: {
    clear: async () => {
      state.categoryColors = [];
      notify();
      syncToBackend();
    },
    toArray: () => [...state.categoryColors]
  }
};

// ===== Seed data for development =====
export async function seedDemoData(): Promise<void> {
  if (state.worklogs.length > 0) return; // Already seeded

  const today = new Date();
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diff);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return fmt(d);
  });

  const now = Date.now();
  const demoLogs: Omit<Worklog, 'id'>[] = [
    { uuid: crypto.randomUUID(), date: days[0], startTime: 540, endTime: 660, title: 'Sprint Planning', description: 'Weekly sprint planning and backlog grooming', ticketId: 'SDP-4001', category: 'Meeting', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[0], startTime: 660, endTime: 720, title: 'Code Review', description: 'Reviewing PR #234 for authentication module', ticketId: 'SDP-4010', category: 'Dev', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[0], startTime: 780, endTime: 960, title: 'API Development', description: 'Building REST endpoints for user management', ticketId: 'SDP-4015', category: 'Dev', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[0], startTime: 960, endTime: 1020, title: 'Support Ticket Triage', description: 'Addressing critical production issues', ticketId: 'SDP-4020', category: 'Support', createdAt: now, updatedAt: now },

    { uuid: crypto.randomUUID(), date: days[1], startTime: 510, endTime: 630, title: 'Database Optimization', description: 'Query optimization and index tuning', ticketId: 'SDP-4025', category: 'Dev', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[1], startTime: 630, endTime: 690, title: 'Team Standup', description: 'Daily standup and blocker discussion', category: 'Meeting', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[1], startTime: 780, endTime: 900, title: 'Frontend Refactor', description: 'Migrating components to new design system', ticketId: 'SDP-4030', category: 'Dev', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[1], startTime: 900, endTime: 990, title: 'Documentation', description: 'Writing API docs for new endpoints', ticketId: 'SDP-4035', category: 'Research', createdAt: now, updatedAt: now },

    { uuid: crypto.randomUUID(), date: days[2], startTime: 540, endTime: 600, title: 'Client Call', description: 'Sprint demo and feedback session', ticketId: 'SDP-4040', category: 'Meeting', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[2], startTime: 600, endTime: 780, title: 'Feature Development', description: 'Implementing notification system', ticketId: 'SDP-4045', category: 'Dev', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[2], startTime: 780, endTime: 870, title: 'Performance Testing', description: 'Load testing and bottleneck analysis', ticketId: 'SDP-4050', category: 'Research', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[2], startTime: 900, endTime: 1020, title: 'Bug Fixes', description: 'Fixing critical UI bugs from QA', ticketId: 'SDP-4055', category: 'Support', createdAt: now, updatedAt: now },

    { uuid: crypto.randomUUID(), date: days[3], startTime: 540, endTime: 690, title: 'System Architecture Review', description: 'Microservices architecture planning', ticketId: 'SDP-4060', category: 'Research', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[3], startTime: 690, endTime: 750, title: 'Mentor Session', description: '1-on-1 mentoring with junior developer', category: 'Meeting', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[3], startTime: 780, endTime: 960, title: 'CI/CD Pipeline', description: 'Setting up automated deployment pipeline', ticketId: 'SDP-4065', category: 'Dev', createdAt: now, updatedAt: now },

    { uuid: crypto.randomUUID(), date: days[4], startTime: 540, endTime: 630, title: 'Retrospective', description: 'Sprint retrospective and action items', category: 'Meeting', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[4], startTime: 630, endTime: 780, title: 'Security Audit', description: 'Reviewing security vulnerabilities and patches', ticketId: 'SDP-4070', category: 'Research', createdAt: now, updatedAt: now },
    { uuid: crypto.randomUUID(), date: days[4], startTime: 840, endTime: 960, title: 'Integration Testing', description: 'End-to-end testing of new features', ticketId: 'SDP-4075', category: 'Dev', createdAt: now, updatedAt: now },
  ];

  demoLogs.forEach((l, i) => {
    state.worklogs.push({ ...l, id: now + i });
  });

  const idx = state.targets.findIndex(t => t.key === 'default');
  if (idx === -1) {
    state.targets.push({ id: Date.now(), key: 'default', dailyMinutes: 480, weeklyMinutes: 2400 });
  }

  notify();
  syncToBackend();
}
