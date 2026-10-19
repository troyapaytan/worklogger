import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  db,
  initDB,
  getConfig,
  saveConfig,
  forceSyncToBackend,
  useLiveQuery,
  createWorklog,
  updateWorklog,
  deleteWorklog,
  getDefaultTarget,
  saveTarget,
  exportDataToJson,
  importDataFromJson,
  setAllCategoryColors,
  type Worklog,
  type SdpConfig,
  getAchievements,
} from './db';
import {
  getWeekStart,
  getWeekDays,
  formatDateKey,
  navigateWeek,
  getWeekRangeLabel,
} from './utils/dateUtils';
import { detectConflicts } from './utils/conflicts';
import { findAvailableGap } from './utils/conflicts';
import Header from './components/Header';
import WeeklyGantt from './components/WeeklyGantt';
import DailyGantt from './components/DailyGantt';
import WorklogModal from './components/WorklogModal';
import ConflictModal from './components/ConflictModal';
import ExportDrawer from './components/ExportDrawer';
import TargetEditor from './components/TargetEditor';
import ColorEditor from './components/ColorEditor';
import SdpSettingsModal from './components/SdpSettingsModal';
import WorklogTypeMapModal from './components/WorklogTypeMapModal';
import AchievementModal from './components/AchievementModal';
import AchievementsTrackerModal from './components/AchievementsTrackerModal';
import AppleSegmentedControl from './components/AppleSegmentedControl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { useAchievements } from './hooks/useAchievements';
import { useToast } from './components/Toast';

import type { ConflictInfo } from './utils/conflicts';
import { Edit3, Trash2, Plus, FileText, Calendar as CalendarIcon, Clock, FolderOpen, Copy, Clipboard } from 'lucide-react';
import { copyToClipboard } from './utils/sdpFormatter';
import { formatMinutesToTime, formatDuration } from './utils/ganttMath';
import { postWorklogToSdp } from './utils/sdpApi';
import pkg from '../package.json';

export const WORKLOG_TYPES = [
  'Assessment',
  'Coding',
  'Configuration',
  'Deployment',
  'DevOps Work',
  'Documentation',
  'Investigation',
  'Others',
  'Planning',
  'Project Meetings',
  'Project Support',
  'QA Defect Retest',
  'Test Closure',
  'Test Data Preparation',
  'Test Execution',
  'Test Planning',
  'Test Scenario Creation, Review and Update',
  'Unit Testing',
];

export default function App() {
  const { addToast } = useToast();

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    type: 'block' | 'canvas';
    log?: Worklog;
    canvasData?: {
      date: string;
      startTime: number;
      endTime: number;
    };
  }>({ x: 0, y: 0, visible: false, type: 'block' });
  const [copiedWorklog, setCopiedWorklog] = useState<Worklog | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // OTA Update state
  const currentVersion = pkg.version;
  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; releaseDate: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('http://LT-9472:8081/version.json');
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== currentVersion) {
            setUpdateAvailable(data);
          }
        }
      } catch (e) {
        // Silently fail if update server is not reachable
      }
    };
    checkUpdate();
    const interval = setInterval(checkUpdate, 3600000); // Check every hour
    return () => clearInterval(interval);
  }, [currentVersion]);

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch('http://localhost:8080/api/apply-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostUrl: 'http://LT-9472:8081' })
      });
      if (res.ok) {
        addToast('Update started. Application will restart shortly.', 'success');
        // Give the backend a few seconds to extract and restart, then reload the page
        // so the frontend fetches the new bundle with the updated version string.
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        setIsUpdating(false);
        addToast('Failed to start update.', 'error');
      }
    } catch (e) {
      setIsUpdating(false);
      addToast('Update request failed.', 'error');
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClose = () => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  const setThemeMode = useCallback((mode: 'dark' | 'light') => {
    setTheme(mode);
    localStorage.setItem('theme', mode);
  }, []);

  // Navigation state persisted across refreshes
  const [viewMode, setViewModeState] = useState<'weekly' | 'daily'>(() => {
    const saved = localStorage.getItem('viewMode');
    return saved === 'daily' || saved === 'weekly' ? saved : 'weekly';
  });

  const [selectedDate, setSelectedDateState] = useState<Date>(() => {
    const saved = localStorage.getItem('selectedDate');
    if (saved) {
      const parsed = new Date(saved);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(selectedDate));

  const setViewMode = useCallback((mode: 'weekly' | 'daily') => {
    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  }, []);

  const setSelectedDate = useCallback((date: Date) => {
    setSelectedDateState(date);
    setWeekStart(getWeekStart(date));
    localStorage.setItem('selectedDate', date.toISOString());
  }, []);

  const [zoom, setZoom] = useState<number>(1);
  const [use24h, setUse24h] = useState<boolean>(false);

  // Modal state
  const [worklogModal, setWorklogModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    initialData?: {
      date: string;
      startTime: number;
      endTime: number;
    };
    editWorklog?: Worklog;
  }>({ open: false, mode: 'create' });

  const [conflictModal, setConflictModal] = useState<{
    open: boolean;
    conflicts: ConflictInfo[];
    pendingData: {
      date: string;
      startTime: number;
      endTime: number;
      title: string;
      description: string;
      ticketId: string;
      urlTicketId?: string;
      category: string;
      worklogType: string;
    } | null;
  }>({ open: false, conflicts: [], pendingData: null });

  const [exportOpen, setExportOpen] = useState(false);
  const [targetEditorOpen, setTargetEditorOpen] = useState(false);
  const [categoryColorsOpen, setCategoryColorsOpen] = useState(false);
  const [sdpSettingsOpen, setSdpSettingsOpen] = useState(false);
  const [sdpTypeMapOpen, setSdpTypeMapOpen] = useState(false);
  const [achievementsTrackerOpen, setAchievementsTrackerOpen] = useState(false);

  const [sdpConfig, setSdpConfig] = useState<SdpConfig>({
    cookieString: '',
    csrfToken: '',
    appId: '696655712',
    worklogTypeMap: {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Initial load from backend API / file
  useEffect(() => {
    async function loadData() {
      try {
        await initDB();
        const cfg = getConfig() || {};
        if (cfg.sdpConfig) setSdpConfig(cfg.sdpConfig);
        if (cfg.theme) setTheme(cfg.theme);
        if (cfg.use24h !== undefined) setUse24h(cfg.use24h);
        if (cfg.zoom) setZoom(cfg.zoom);
        setIsLoaded(true);
      } catch (e) {
        console.error('Data loading failed. App rendering paused to prevent data overwrite.', e);
        setLoadError(true);
      }
    }
    loadData();

    const handleFocus = async () => {
      try {
        await initDB();
        const cfg = getConfig() || {};
        if (cfg.sdpConfig?.cookieUpdatedAt && cfg.sdpConfig.cookieUpdatedAt !== sdpConfig.cookieUpdatedAt) {
          setSdpConfig((prev) => ({ ...prev, ...cfg.sdpConfig }));
        }
      } catch (e) {
        console.warn('Failed to fetch config on focus', e);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [sdpConfig.cookieUpdatedAt]);

  // Save config to localStorage & backend
  useEffect(() => {
    if (!isLoaded) return;
    const cfg = { theme, use24h, zoom, sdpConfig };
    localStorage.setItem('appConfig', JSON.stringify(cfg));
    saveConfig({ ...cfg, ...sdpConfig });
  }, [isLoaded, theme, use24h, zoom, sdpConfig]);

  const handleSaveNow = useCallback(async () => {
    await forceSyncToBackend();
    addToast('All data saved to disk!', 'success');
  }, [addToast]);

  const handleBackup = useCallback(async () => {
    const config = {
      theme,
      use24h,
      zoom,
      selectedDate: selectedDate.toISOString(),
      viewMode,
      sdpConfig,
    };
    const jsonStr = await exportDataToJson(config);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worklogger-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Backup downloaded successfully');
  }, [theme, use24h, zoom, selectedDate, viewMode, sdpConfig, addToast]);

  const handleRestore = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const cfg = await importDataFromJson(content);
          if (cfg) {
            if (cfg.theme === 'dark' || cfg.theme === 'light') setTheme(cfg.theme);
            if (cfg.use24h !== undefined) setUse24h(cfg.use24h);
            if (cfg.zoom) setZoom(cfg.zoom);
            if (cfg.viewMode === 'daily' || cfg.viewMode === 'weekly') setViewModeState(cfg.viewMode);
            if (cfg.selectedDate) {
              const parsed = new Date(cfg.selectedDate);
              if (!isNaN(parsed.getTime())) {
                setSelectedDateState(parsed);
                setWeekStart(getWeekStart(parsed));
              }
            }
            if (cfg.sdpConfig) setSdpConfig(cfg.sdpConfig);
          }
          addToast('Backup restored successfully!');
        } catch (error) {
          console.error(error);
          addToast('Invalid backup file', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input
    },
    [addToast, setTheme, setUse24h, setZoom]
  );

  // ===== Live Queries =====
  const weekDays = getWeekDays(weekStart);
  const startDate = formatDateKey(weekDays[0]);
  const endDate = formatDateKey(weekDays[6]);

  const allWorklogs = useLiveQuery(() => db.worklogs.toArray(), [], []) || [];

  const weeklyWorklogs = useMemo(
    () => allWorklogs.filter((l) => l.date >= startDate && l.date <= endDate),
    [allWorklogs, startDate, endDate]
  );

  const target = useLiveQuery(() => getDefaultTarget(), [], {
    key: 'default',
    dailyMinutes: 480,
    weeklyMinutes: 2400,
  });

  // Calculate current week key (e.g., 2026-W35)
  const currentWeekKey = `${weekStart.getFullYear()}-W${Math.ceil(
    ((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
  ).toString().padStart(2, '0')}`;

  const weeklyTotalMinutes = useMemo(
    () => (weeklyWorklogs ?? []).reduce((acc, log) => acc + (log.endTime - log.startTime), 0),
    [weeklyWorklogs]
  );



  const { activeAchievement, clearActive } = useAchievements(
    allWorklogs,
    weeklyWorklogs,
    target?.weeklyMinutes ?? 0,
    currentWeekKey
  );

  const achievements = useLiveQuery(() => getAchievements(), [], getAchievements());

  const categoryColors = useLiveQuery(() => db.categoryColors.toArray(), [], []);

  const colorStyles = useMemo(() => {
    const styles: Record<string, string> = {};
    for (const c of categoryColors ?? []) {
      styles[`--color-cat-${c.category.toLowerCase()}`] = c.color;
    }
    return styles;
  }, [categoryColors]);

  const categories = useMemo(() => {
    const resolved: { key: string; name: string; color: string; ticketId: string; urlTicketId: string; ownerId: string; status?: string }[] = [];
    const knownKeys = new Set<string>();

    for (const c of categoryColors ?? []) {
      if (!knownKeys.has(c.category.toLowerCase())) {
        knownKeys.add(c.category.toLowerCase());
        resolved.push({
          key: c.category,
          name: c.customName || c.category,
          color: c.color,
          ticketId: c.ticketId ?? '',
          urlTicketId: c.urlTicketId ?? '',
          ownerId: c.ownerId ?? '',
          status: c.status ?? '',
        });
      }
    }

    const autoPalette = [
      '#0080ff',
      '#ff6600',
      '#00cc44',
      '#e60073',
      '#9900ef',
      '#14b8a6',
      '#f43f5e',
    ];
    let paletteIdx = 0;

    for (const log of allWorklogs ?? []) {
      if (log.category && !knownKeys.has(log.category.toLowerCase())) {
        knownKeys.add(log.category.toLowerCase());
        resolved.push({
          key: log.category,
          name: log.category,
          color: autoPalette[paletteIdx % autoPalette.length],
          ticketId: log.ticketId ?? '',
          urlTicketId: log.urlTicketId ?? '',
          ownerId: '',
        });
        paletteIdx++;
      }
    }

    return resolved;
  }, [categoryColors, allWorklogs]);



  const handlePrevWeek = useCallback(() => {
    const nextWeek = navigateWeek(weekStart, 'prev');
    setWeekStart(nextWeek);
    setSelectedDate(nextWeek);
  }, [weekStart, setSelectedDate]);

  const handleNextWeek = useCallback(() => {
    const nextWeek = navigateWeek(weekStart, 'next');
    setWeekStart(nextWeek);
    setSelectedDate(nextWeek);
  }, [weekStart, setSelectedDate]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, [setSelectedDate]);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setViewMode('daily');
  }, [setSelectedDate, setViewMode]);

  const handleBackToWeek = useCallback(() => {
    setViewMode('weekly');
  }, [setViewMode]);

  // ===== Worklog CRUD =====
  const handleCreateWorklog = useCallback(
    (date: string, startTime: number, endTime: number) => {
      setWorklogModal({
        open: true,
        mode: 'create',
        initialData: { date, startTime, endTime },
      });
    },
    []
  );

  const handleEditWorklog = useCallback((log: Worklog) => {
    setWorklogModal({
      open: true,
      mode: 'edit',
      editWorklog: log,
    });
  }, []);

  const handleSaveWorklog = useCallback(
    async (data: {
      date: string;
      startTime: number;
      endTime: number;
      title: string;
      description: string;
      ticketId: string;
      urlTicketId?: string;
      category: string;
      worklogType: string;
    }) => {
      // Check for conflicts
      const dayLogs = weeklyWorklogs?.filter((l) => l.date === data.date) ?? [];
      const excludeId =
        worklogModal.mode === 'edit' ? worklogModal.editWorklog?.id : undefined;
      const conflicts = detectConflicts(
        data.startTime,
        data.endTime,
        dayLogs,
        excludeId
      );

      if (conflicts.length > 0) {
        setWorklogModal((prev) => ({ ...prev, open: false }));
        setConflictModal({
          open: true,
          conflicts,
          pendingData: data,
        });
        return;
      }

      await commitWorklog(data);
    },
    [weeklyWorklogs, worklogModal]
  );

  const commitWorklog = useCallback(
    async (data: {
      date: string;
      startTime: number;
      endTime: number;
      title: string;
      description: string;
      ticketId: string;
      urlTicketId?: string;
      category: string;
      worklogType: string;
    }) => {
      const now = Date.now();

      if (worklogModal.mode === 'edit' && worklogModal.editWorklog?.id) {
        await updateWorklog(worklogModal.editWorklog.id, {
          ...data,
          updatedAt: now,
        });
        addToast('Worklog updated successfully');
      } else {
        const newId = await createWorklog({
          uuid: crypto.randomUUID(),
          ...data,
          createdAt: now,
          updatedAt: now,
        });
        addToast('Worklog created successfully');

      }

      setWorklogModal({ open: false, mode: 'create' });
      setConflictModal({ open: false, conflicts: [], pendingData: null });
    },
    [worklogModal, addToast]
  );

  const handleConflictProceed = useCallback(() => {
    if (conflictModal.pendingData) {
      commitWorklog(conflictModal.pendingData);
    }
  }, [conflictModal.pendingData, commitWorklog]);

  const handleConflictTrim = useCallback(() => {
    if (!conflictModal.pendingData) return;
    const data = conflictModal.pendingData;
    const dayLogs = weeklyWorklogs?.filter((l) => l.date === data.date) ?? [];
    const duration = data.endTime - data.startTime;
    const gap = findAvailableGap(data.startTime, duration, dayLogs);

    if (gap) {
      commitWorklog({ ...data, startTime: gap.start, endTime: gap.end });
      addToast('Worklog trimmed to available gap');
    } else {
      addToast('No available gap found', 'warning');
      setConflictModal({ open: false, conflicts: [], pendingData: null });
    }
  }, [conflictModal.pendingData, weeklyWorklogs, commitWorklog, addToast]);

  const handleResizeWorklog = useCallback(
    async (id: number, newStart: number, newEnd: number) => {
      await updateWorklog(id, { startTime: newStart, endTime: newEnd });
    },
    []
  );

  const handleDeleteWorklog = useCallback(
    async (id: number) => {
      await deleteWorklog(id);
      addToast('Worklog deleted');
      setWorklogModal({ open: false, mode: 'create' });
    },
    [addToast]
  );

  const handleDeleteFromModal = useCallback(() => {
    if (worklogModal.editWorklog?.id) {
      handleDeleteWorklog(worklogModal.editWorklog.id);
    }
  }, [worklogModal.editWorklog, handleDeleteWorklog]);

  // ===== Targets =====
  const handleSaveTargets = useCallback(
    async (daily: number, weekly: number) => {
      await saveTarget({
        key: 'default',
        dailyMinutes: daily,
        weeklyMinutes: weekly,
      });
      addToast('Targets updated');
      setTargetEditorOpen(false);
    },
    [addToast]
  );

  // ===== Category / Project Colors & Ticket IDs =====
  const handleSaveColors = useCallback(
    async (colorList: { category: string; name: string; color: string; ticketId?: string; urlTicketId?: string; ownerId?: string; status?: string }[]) => {
      await setAllCategoryColors(colorList);
    },
    []
  );

  // ===== Context Menu Options =====
  const handleWorklogContextMenu = useCallback((e: React.MouseEvent, log: Worklog) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
      type: 'block',
      log,
    });
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent, date: string, time: number) => {
    e.preventDefault();
    const start = time;
    const end = Math.min(1200, time + 60);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true,
      type: 'canvas',
      canvasData: {
        date,
        startTime: start,
        endTime: end,
      },
    });
  }, []);

  const handleExportSingleSDP = useCallback(async (log: Worklog) => {
    const duration = log.endTime - log.startTime;
    const ticketPrefix = log.ticketId ? `[${log.ticketId}] ` : '';
    const catName = categories.find((c) => c.key === log.category)?.name || log.category || 'Other';
    const text = `${ticketPrefix}${log.title} (${catName})\nTime: ${formatMinutesToTime(log.startTime, true)} - ${formatMinutesToTime(log.endTime, true)} (${formatDuration(duration)})\nNotes: ${log.description || 'No description provided.'}`;

    const success = await copyToClipboard(text);
    if (success) {
      addToast('Worklog SDP text copied!');
    } else {
      addToast('Failed to copy text', 'error');
    }
  }, [categories, addToast]);

  // ===== SDP Handlers =====
  const handleSaveSdpConfig = useCallback((config: Omit<SdpConfig, 'worklogTypeMap'>) => {
    setSdpConfig(prev => ({ ...prev, ...config, cookieUpdatedAt: Date.now() }));
    setSdpSettingsOpen(false);
    addToast('SDP Settings saved successfully');
  }, [addToast]);

  const handleImportFullConfig = useCallback((config: Partial<SdpConfig>) => {
    setSdpConfig(prev => ({ ...prev, ...config, cookieUpdatedAt: Date.now() }));
    setSdpSettingsOpen(false);
    addToast('SDP Config imported successfully');
  }, [addToast]);

  const handleSaveWorklogTypeMap = useCallback((map: Record<string, string>) => {
    setSdpConfig(prev => ({ ...prev, worklogTypeMap: map }));
    setSdpTypeMapOpen(false);
    addToast('Worklog Type Mapping saved');
  }, [addToast]);

  const handlePostToSdp = useCallback(async (log: Worklog) => {
    if (log.sdpPosted) return; // Already posted

    // Use global ownerId from sdpConfig
    const ownerId = sdpConfig.ownerId;

    const res = await postWorklogToSdp(
      {
        date: log.date,
        startTime: log.startTime,
        endTime: log.endTime,
        description: log.description,
        worklogType: log.worklogType || '',
        ticketId: log.ticketId || '',
        urlTicketId: log.urlTicketId || '',
      },
      sdpConfig,
      ownerId
    );

    if (res.success) {
      addToast('Worklog successfully posted to SDP!');
      await updateWorklog(log.id!, {
        ...log,
        sdpPosted: true,
        sdpPostedAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      addToast(`Failed to post to SDP: ${res.error}`, 'error');
    }
  }, [sdpConfig, categories, addToast]);

  // Batch post handler for WeeklyGantt
  const handleBatchPost = useCallback(
    async (dateKey: string) => {
      const logs = allWorklogs
        .filter((l) => l.date === dateKey && !l.sdpPosted)
        .sort((a, b) => a.startTime - b.startTime);

      if (logs.length === 0) {
        addToast('No pending worklogs to post for this day');
        return;
      }

      if (!sdpConfig?.cookieString || !sdpConfig?.csrfToken) {
        addToast('Please configure SDP Settings and Sync Cookies first', 'error');
        return;
      }

      addToast(`Starting batch post for ${logs.length} logs...`);

      let delayMs = 5000;
      let successCount = 0;

      for (let i = 0; i < logs.length; i++) {
        const log = logs[i];
        let attempt = 0;
        let done = false;

        while (attempt < 3 && !done) {
          try {
            if (i > 0 || attempt > 0) {
              await new Promise((res) => setTimeout(res, delayMs));
            }

            const cat = categories.find((c) => c.key === log.category);
            const ticketId = log.ticketId || cat?.ticketId || '';
            const urlTicketId = log.urlTicketId || cat?.urlTicketId || '';
            const ownerId = sdpConfig.ownerId;

            const res = await postWorklogToSdp(
              {
                date: log.date,
                startTime: log.startTime,
                endTime: log.endTime,
                description: log.description,
                worklogType: log.worklogType || '',
                ticketId,
                urlTicketId,
              },
              sdpConfig,
              ownerId
            );

            if (res.success) {
              await updateWorklog(log.id!, {
                ...log,
                sdpPosted: true,
                sdpPostedAt: Date.now(),
              });
              successCount++;
              done = true;
              delayMs = 5000;
            } else {
              throw new Error(res.error || 'Unknown error');
            }
          } catch (err: any) {
            attempt++;
            console.error(`Attempt ${attempt} failed for log ${log.id}:`, err);
            if (attempt < 3) {
              delayMs += 5000;
              addToast(`Error posting. Retrying in ${delayMs / 1000}s... (Attempt ${attempt + 1}/3)`, 'warning');
            } else {
              addToast('Failed to post log after 3 attempts. Aborting batch.', 'error');
              return;
            }
          }
        }
      }

      addToast(`Batch post complete! ${successCount} logs posted successfully.`);
    },
    [allWorklogs, sdpConfig, categories, addToast]
  );

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900 text-text-primary p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to load data</h2>
          <p className="text-sm text-text-secondary mb-4">
            There was an error loading your worklogger data from the server.
            To prevent overwriting your existing data, the application has paused loading.
          </p>
          <p className="text-sm font-semibold text-text-primary">
            Please check the server logs, ensure the Vite server is fully running, and refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-surface-900 text-text-primary transition-colors duration-200 relative overflow-hidden"
      style={colorStyles as React.CSSProperties}
    >


      <div className="max-w-7xl mx-auto w-full px-4 py-6 md:px-8 flex flex-col gap-6 relative z-10">
        
        {updateAvailable && (
          <div className="bg-accent-500/15 border border-accent-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="bg-accent-500 text-white rounded-full p-2 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-text-primary">Update Available: v{updateAvailable.version}</h3>
                <p className="text-xs text-text-secondary">A new version of Worklogger is available. You are currently on v{currentVersion}.</p>
              </div>
            </div>
            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="bg-accent-500 hover:bg-accent-600 active:scale-95 text-white px-4 py-2 rounded-xl font-semibold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
          </div>
        )}

        <Header
          weekStart={weekStart}
          viewMode={viewMode}
          weeklyWorklogs={weeklyWorklogs ?? []}
          dailyTarget={target?.dailyMinutes ?? 480}
          weeklyTarget={target?.weeklyMinutes ?? 2400}
          theme={theme}
          sdpConfig={sdpConfig}
          achievements={achievements}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onToday={handleToday}
          onViewModeChange={setViewMode}
          onSaveNow={handleSaveNow}
          onEditTargets={() => setTargetEditorOpen(true)}
          onEditColors={() => setCategoryColorsOpen(true)}
          onOpenSdpSettings={() => setSdpSettingsOpen(true)}
          onOpenAchievements={() => setAchievementsTrackerOpen(true)}
          onSetTheme={setThemeMode}
        />

        <main className="flex-1">
          {/* Zoom & Format Settings Toolbar (Apple Translucent Floating Bar) */}
          <div className="glass-card flex items-center justify-between px-4 py-2.5 mb-3.5 flex-wrap gap-3 select-none">
            <div className="flex items-center gap-5 flex-wrap">
              {/* View Mode selection (Apple Segmented Control) */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  View
                </span>
                <AppleSegmentedControl
                  layoutId="view-mode-pill"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: 'weekly', label: 'Week', icon: <CalendarIcon size={13} /> },
                    { value: 'daily', label: 'Day', icon: <Clock size={13} /> },
                  ]}
                />
              </div>

              {/* Zoom selection (Apple Segmented Control) */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Zoom
                </span>
                <AppleSegmentedControl
                  layoutId="zoom-level-pill"
                  size="sm"
                  value={zoom}
                  onChange={setZoom}
                  options={[
                    { value: 1, label: '1x' },
                    { value: 1.5, label: '1.5x' },
                    { value: 2, label: '2x' },
                    { value: 3, label: '3x' },
                  ]}
                />
              </div>

              {/* Time format selection (Apple Segmented Control) */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  Format
                </span>
                <AppleSegmentedControl
                  layoutId="time-format-pill"
                  size="sm"
                  value={use24h ? '24h' : '12h'}
                  onChange={(val) => setUse24h(val === '24h')}
                  options={[
                    { value: '12h', label: '12h' },
                    { value: '24h', label: '24h' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {zoom > 1 && (
                <span className="text-[10px] text-text-muted italic hidden lg:inline">
                  * Drag scrollbar or use Shift + Scroll to navigate horizontally
                </span>
              )}
              <button
                onClick={() => setCategoryColorsOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-surface-700/60 hover:bg-surface-700 active:scale-[0.98] text-text-primary transition-all cursor-pointer border border-surface-600/40 shadow-sm"
                title="Project Manager (Manage projects, ticket IDs & colors)"
              >
                <FolderOpen size={14} className="text-accent-400" />
                <span>Project Manager</span>
              </button>
            </div>
          </div>

          {viewMode === 'weekly' ? (
            <WeeklyGantt
              weekStart={weekStart}
              worklogs={weeklyWorklogs ?? []}
              zoom={zoom}
              use24h={use24h}
              categories={categories}
              theme={theme}
              onCreateWorklog={handleCreateWorklog}
              onEditWorklog={handleEditWorklog}
              onResizeWorklog={handleResizeWorklog}
              onDayClick={handleDayClick}
              onWorklogContextMenu={handleWorklogContextMenu}
              onCanvasContextMenu={handleCanvasContextMenu}
              onBatchPost={handleBatchPost}
            />
          ) : (
            <DailyGantt
              selectedDate={selectedDate}
              worklogs={weeklyWorklogs ?? []}
              categories={categories}
              zoom={zoom}
              use24h={use24h}
              theme={theme}
              onCreateWorklog={handleCreateWorklog}
              onEditWorklog={handleEditWorklog}
              onResizeWorklog={handleResizeWorklog}
              onDeleteWorklog={handleDeleteWorklog}
              onDateChange={setSelectedDate}
              onBackToWeek={handleBackToWeek}
              onWorklogContextMenu={handleWorklogContextMenu}
              onCanvasContextMenu={handleCanvasContextMenu}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setViewMode('weekly');
              }}
            />
          )}


        </main>
      </div>

      {/* --- Modals --- */}
      <WorklogModal
        isOpen={worklogModal.open}
        mode={worklogModal.mode}
        initialData={worklogModal.initialData}
        editWorklog={worklogModal.editWorklog}
        categories={categories}
        worklogTypes={WORKLOG_TYPES}
        onSave={handleSaveWorklog}
        onDelete={handleDeleteFromModal}
        onPostToSdp={
          worklogModal.mode === 'edit' && worklogModal.editWorklog
            ? () => handlePostToSdp(worklogModal.editWorklog!)
            : undefined
        }
        onClose={() => setWorklogModal({ open: false, mode: 'create' })}
      />

      <ConflictModal
        isOpen={conflictModal.open}
        conflicts={conflictModal.conflicts}
        candidateTitle={conflictModal.pendingData?.title ?? ''}
        candidateStart={conflictModal.pendingData?.startTime ?? 0}
        candidateEnd={conflictModal.pendingData?.endTime ?? 0}
        onProceed={handleConflictProceed}
        onTrim={handleConflictTrim}
        onCancel={() => setConflictModal({ open: false, conflicts: [], pendingData: null })}
      />

      <ExportDrawer
        isOpen={exportOpen}
        worklogs={weeklyWorklogs ?? []}
        onClose={() => setExportOpen(false)}
      />

      <TargetEditor
        isOpen={targetEditorOpen}
        dailyMinutes={target?.dailyMinutes ?? 480}
        weeklyMinutes={target?.weeklyMinutes ?? 2400}
        onSave={handleSaveTargets}
        onClose={() => setTargetEditorOpen(false)}
      />

      <ColorEditor
        isOpen={categoryColorsOpen}
        currentColors={categoryColors ?? []}
        categories={categories}
        sdpConfig={sdpConfig}
        theme={theme}
        onSave={handleSaveColors}
        onClose={() => setCategoryColorsOpen(false)}
      />

      <SdpSettingsModal
        isOpen={sdpSettingsOpen}
        config={sdpConfig}
        onSave={handleSaveSdpConfig}
        onImportFullConfig={handleImportFullConfig}
        onOpenTypeMap={() => {
          setSdpSettingsOpen(false);
          setSdpTypeMapOpen(true);
        }}
        onClose={() => setSdpSettingsOpen(false)}
      />

      <WorklogTypeMapModal
        isOpen={sdpTypeMapOpen}
        worklogTypes={WORKLOG_TYPES}
        initialMap={sdpConfig.worklogTypeMap || {}}
        onSave={handleSaveWorklogTypeMap}
        onClose={() => setSdpTypeMapOpen(false)}
      />

      <AchievementModal
        achievement={activeAchievement}
        onClose={clearActive}
      />

      <AchievementsTrackerModal
        isOpen={achievementsTrackerOpen}
        onClose={() => setAchievementsTrackerOpen(false)}
        achievements={achievements || {
          jackOfAllTrades: 0,
          ticketCruncher: 0,
          deepWork: 0,
          marathoner: 0,
          monthlyMaster: 0,
          consistencyIsKey: 0,
          ticketStarter: 0,
          weeklyTargetsHit: []
        }}
        allWorklogs={allWorklogs ?? []}
      />

      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-surface-800 border border-surface-600 shadow-2xl z-[150] w-44 py-1 text-left select-none pointer-events-auto rounded-lg"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px`, transform: 'translateZ(0)', willChange: 'transform, opacity' }}
        >
          {contextMenu.type === 'block' && contextMenu.log && (
            <>
              <button
                onClick={() => handleEditWorklog(contextMenu.log!)}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 text-[11px] text-text-primary flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Edit3 size={11} className="text-text-secondary" />
                Edit Entry
              </button>
              <button
                onClick={() => {
                  setCopiedWorklog(contextMenu.log!);
                  addToast('Worklog copied');
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 text-[11px] text-emerald-400 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Copy size={11} className="text-emerald-500" />
                Copy Worklog
              </button>
              <div className="h-px bg-surface-700 my-1" />
              <button
                onClick={() => handleDeleteWorklog(contextMenu.log!.id!)}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 text-[11px] text-rose-400 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Trash2 size={11} className="text-rose-500" />
                Delete Entry
              </button>
            </>
          )}

          {contextMenu.type === 'canvas' && contextMenu.canvasData && (
            <>
              <button
                onClick={() => {
                  setWorklogModal({
                    open: true,
                    mode: 'create',
                    initialData: {
                      date: contextMenu.canvasData!.date,
                      startTime: contextMenu.canvasData!.startTime,
                      endTime: contextMenu.canvasData!.endTime,
                    },
                  });
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-700 text-[11px] text-text-primary flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Plus size={11} className="text-text-secondary" />
                Add Entry Here
              </button>
              {copiedWorklog && (
                <button
                  onClick={() => {
                    const start = contextMenu.canvasData!.startTime;
                    const duration = copiedWorklog.endTime - copiedWorklog.startTime;
                    const end = start + duration;
                    const pastedData = {
                      date: contextMenu.canvasData!.date,
                      startTime: start,
                      endTime: end,
                      title: copiedWorklog.title,
                      description: copiedWorklog.description,
                      ticketId: copiedWorklog.ticketId,
                      urlTicketId: copiedWorklog.urlTicketId,
                      category: copiedWorklog.category,
                      worklogType: copiedWorklog.worklogType,
                    };
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                    setWorklogModal((prev) => ({ ...prev, mode: 'create', editWorklog: undefined }));
                    handleSaveWorklog(pastedData);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-surface-700 text-[11px] text-accent-400 flex items-center gap-2 cursor-pointer font-semibold"
                >
                  <Clipboard size={11} className="text-accent-500" />
                  Paste Worklog
                </button>
              )}
            </>
          )}
        </div>
      )}


    </div>
  );
}
