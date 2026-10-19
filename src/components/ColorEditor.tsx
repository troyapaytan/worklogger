import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FolderOpen,
  Plus,
  Trash2,
  Link,
  Download,
  Check,
  Loader2,
  Search,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Clock,
  Filter,
  ArrowUpDown,
  Minus,
  ChevronDown
} from 'lucide-react';
import type { CategoryColor, SdpConfig } from '../db';
import { fetchTicketDetails, fetchMyAssignedTickets, fetchTicketStatusesBatch } from '../utils/sdpApi';
import type { SdpTicketSummary } from '../utils/sdpApi';

interface ColorEditorProps {
  isOpen: boolean;
  currentColors: CategoryColor[];
  categories?: { key: string; name: string; color: string; ticketId?: string; urlTicketId?: string; status?: string }[];
  sdpConfig?: SdpConfig;
  theme?: 'light' | 'dark';
  onSave: (categories: { category: string; name: string; color: string; ticketId?: string; urlTicketId?: string; status?: string }[]) => void;
  onClose: () => void;
}

interface ProjectItem {
  id: string;
  key: string;
  name: string;
  ticketId: string;
  urlTicketId: string;
  color: string;
  status?: string;
  isCustom?: boolean;
}

const PRESET_COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6',
  '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  '#f97316', '#ef4444'
];

const getStatusBadgeStyle = (status?: string) => {
  if (!status) return 'bg-slate-100 dark:bg-surface-700/60 text-slate-700 dark:text-text-muted border-slate-300 dark:border-surface-600';
  const s = status.toLowerCase();
  if (s.includes('closed') || s.includes('resolved') || s.includes('completed')) {
    return 'bg-slate-100 dark:bg-surface-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-surface-600';
  }
  if (s.includes('hold') || s.includes('pending') || s.includes('wait')) {
    return 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
  }
  if (s.includes('progress') || s.includes('open') || s.includes('assign') || s.includes('develop') || s.includes('test') || s.includes('requir')) {
    return 'bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-500/40';
  }
  if (s.includes('cancel') || s.includes('reject')) {
    return 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-500/40';
  }
  return 'bg-teal-100 dark:bg-teal-500/20 text-teal-900 dark:text-teal-300 border-teal-300 dark:border-teal-500/40';
};

export default function ColorEditor({
  isOpen,
  currentColors,
  categories,
  sdpConfig,
  theme: _theme,
  onSave,
  onClose,
}: ColorEditorProps) {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [newInput, setNewInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncingStatuses, setIsSyncingStatuses] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkTickets, setBulkTickets] = useState<SdpTicketSummary[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<'SR' | 'CH'>('SR');
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Bulk filtering state
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkStatusFilter, setBulkStatusFilter] = useState<Set<string>>(new Set());
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const [bulkDatePreset, setBulkDatePreset] = useState<'all' | 'today' | '7d' | '14d' | '30d' | '90d' | 'custom'>('all');
  const [bulkDateFrom, setBulkDateFrom] = useState('');
  const [bulkDateTo, setBulkDateTo] = useState('');
  const [bulkSort, setBulkSort] = useState<'newest' | 'oldest' | 'id_desc' | 'id_asc'>('newest');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);

  const prevIsOpenRef = useRef(false);
  const hasSyncedOnOpenRef = useRef(false);
  const isSyncingRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  const latestItemsRef = useRef<ProjectItem[]>([]);

  latestItemsRef.current = items;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to persist list to parent and database
  const persistChanges = useCallback((updatedItems: ProjectItem[]) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const list = updatedItems.map((item) => ({
      category: item.name.trim() || item.key,
      name: item.name.trim() || item.key,
      ticketId: item.ticketId.trim(),
      urlTicketId: item.urlTicketId.trim(),
      color: item.color,
      status: item.status || '',
    }));
    onSave(list);
  }, [onSave]);

  // Debounced persist for typing in input fields
  const debouncedPersist = useCallback((updatedItems: ProjectItem[]) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      persistChanges(updatedItems);
      debounceTimerRef.current = null;
    }, 400);
  }, [persistChanges]);

  // Graceful batch status sync to prevent 429 Too Many Requests
  const syncAllTicketStatuses = useCallback(async (targetList?: ProjectItem[]) => {
    if (isSyncingRef.current || !sdpConfig?.cookieString) return;

    const list = targetList || latestItemsRef.current;
    const toSync = list.filter((i) => i.ticketId && i.ticketId.trim() !== '');
    if (toSync.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncingStatuses(true);
    setSyncProgress('Starting status sync...');

    try {
      const { updates } = await fetchTicketStatusesBatch(
        toSync,
        sdpConfig,
        (progressText) => setSyncProgress(progressText)
      );

      if (updates && Object.keys(updates).length > 0) {
        setItems((prev) => {
          const next = prev.map((it) => {
            if (updates[it.key]) {
              return {
                ...it,
                status: updates[it.key].status ?? it.status,
                urlTicketId: updates[it.key].urlTicketId ?? it.urlTicketId,
              };
            }
            return it;
          });
          persistChanges(next);
          return next;
        });
      }
    } catch (err) {
      console.warn('Batch status sync failed:', err);
    } finally {
      setIsSyncingStatuses(false);
      isSyncingRef.current = false;
      setSyncProgress(null);
    }
  }, [sdpConfig, persistChanges]);

  // Load items ONLY when modal opens (transition from closed to open)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      prevIsOpenRef.current = true;
      const resolved: ProjectItem[] = [];
      const addedKeys = new Set<string>();
      let idCounter = 1;

      // 1. Load custom database categories
      for (const c of currentColors) {
        const lowerKey = c.category.toLowerCase();
        if (!addedKeys.has(lowerKey)) {
          addedKeys.add(lowerKey);
          resolved.push({
            id: `proj-${c.id || idCounter++}`,
            key: c.category,
            name: c.customName || c.category,
            ticketId: c.ticketId ?? '',
            urlTicketId: c.urlTicketId ?? '',
            color: c.color,
            status: c.status ?? '',
            isCustom: true,
          });
        }
      }

      // 2. Append active categories dynamically discovered from worklogs
      if (categories) {
        for (const cat of categories) {
          const lowerKey = cat.key.toLowerCase();
          if (!addedKeys.has(lowerKey)) {
            addedKeys.add(lowerKey);
            resolved.push({
              id: `proj-${idCounter++}`,
              key: cat.key,
              name: cat.name,
              ticketId: cat.ticketId ?? '',
              urlTicketId: cat.urlTicketId ?? '',
              color: cat.color,
              status: cat.status ?? '',
              isCustom: true,
            });
          }
        }
      }

      setItems(resolved);
      setNewInput('');

      // Trigger automatic sync ONCE upon opening the modal
      if (!hasSyncedOnOpenRef.current && sdpConfig?.cookieString) {
        hasSyncedOnOpenRef.current = true;
        syncAllTicketStatuses(resolved);
      }
    } else if (!isOpen && prevIsOpenRef.current) {
      // Modal closed: flush any pending debounced change and reset refs
      prevIsOpenRef.current = false;
      hasSyncedOnOpenRef.current = false;
      isSyncingRef.current = false;
      setIsSyncingStatuses(false);
      setSyncProgress(null);

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
        persistChanges(latestItemsRef.current);
      }
    }
  }, [isOpen, currentColors, categories, sdpConfig, syncAllTicketStatuses, persistChanges]);

  // Handlers for instant updates
  const handleColorChange = (id: string, val: string) => {
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, color: val } : it));
      persistChanges(next);
      return next;
    });
  };

  const handleNameChange = (id: string, val: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, name: val } : item));
      debouncedPersist(next);
      return next;
    });
  };

  const handleTicketIdChange = (id: string, val: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ticketId: val } : item));
      debouncedPersist(next);
      return next;
    });
  };

  const handleUrlTicketIdChange = (id: string, val: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, urlTicketId: val } : item));
      debouncedPersist(next);
      return next;
    });
  };

  const handleAddProjectAsync = async () => {
    const trimmedInput = newInput.trim();
    if (!trimmedInput) return;

    setIsAdding(true);
    let finalName = trimmedInput;
    let finalTicketId = '';
    let finalUrlTicketId = '';
    let finalStatus = '';

    const isTicket = /^(CH-|SR-|\d+$)/i.test(trimmedInput);

    if (isTicket && sdpConfig?.cookieString) {
      finalTicketId = trimmedInput.toUpperCase();
      try {
        const res = await fetchTicketDetails(finalTicketId, sdpConfig);
        if (!res.error) {
          if (res.subject) finalName = res.subject;
          if (res.urlTicketId) finalUrlTicketId = res.urlTicketId;
          if (res.status) finalStatus = res.status;
        }
      } catch (e) {
        // Fallback to normal behavior on network errors
      }
    }

    const exists = items.some(
      (item) => item.name.toLowerCase() === finalName.toLowerCase()
    );
    if (exists) {
      alert('A project with this name already exists.');
      setIsAdding(false);
      return;
    }

    const newItem: ProjectItem = {
      id: `proj-${Date.now()}`,
      key: finalName,
      name: finalName,
      ticketId: finalTicketId,
      urlTicketId: finalUrlTicketId,
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      status: finalStatus,
      isCustom: true,
    };

    setItems((prev) => {
      const next = [...prev, newItem];
      persistChanges(next);
      return next;
    });
    setNewInput('');
    setIsAdding(false);
  };

  const handleBulkFetch = async (type: 'SR' | 'CH') => {
    setBulkType(type);
    setBulkLoading(true);
    setBulkError(null);
    setBulkTickets([]);
    setBulkSelected(new Set());

    if (!sdpConfig) {
      setBulkError('SDP is not configured.');
      setBulkLoading(false);
      return;
    }

    const res = await fetchMyAssignedTickets(sdpConfig, type);
    if (res.error) {
      setBulkError(res.error);
    } else if (res.tickets) {
      const existingIds = new Set(items.map((i) => i.urlTicketId));
      const existingDisplayIds = new Set(items.map((i) => i.ticketId.toUpperCase()));
      const filtered = res.tickets.filter(
        (t) => !existingIds.has(t.id) && !existingDisplayIds.has(t.displayId.toUpperCase())
      );
      setBulkTickets(filtered);
    }
    setBulkLoading(false);
  };

  const bulkAvailableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    bulkTickets.forEach((t) => {
      if (t.status && t.status.trim()) {
        statuses.add(t.status.trim());
      }
    });
    return Array.from(statuses).sort();
  }, [bulkTickets]);

  const filteredBulkTickets = useMemo(() => {
    let list = [...bulkTickets];

    // 1. Search Query
    if (bulkSearch.trim()) {
      const q = bulkSearch.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.displayId.toLowerCase().includes(q) ||
          (t.ticketType === 'CH' && `ch-${t.displayId}`.toLowerCase().includes(q))
      );
    }

    // 2. Status Filter
    if (bulkStatusFilter.size > 0) {
      list = list.filter(
        (t) => bulkStatusFilter.has((t.status || '').toLowerCase())
      );
    }

    // 3. Timestamp / Date Filter
    if (bulkDatePreset !== 'all') {
      const now = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      list = list.filter((t) => {
        if (!t.createdTime) return true;
        const time = t.createdTime;

        if (bulkDatePreset === 'today') {
          return time >= startOfToday.getTime();
        }
        if (bulkDatePreset === '7d') {
          return time >= now - 7 * 86400000;
        }
        if (bulkDatePreset === '14d') {
          return time >= now - 14 * 86400000;
        }
        if (bulkDatePreset === '30d') {
          return time >= now - 30 * 86400000;
        }
        if (bulkDatePreset === '90d') {
          return time >= now - 90 * 86400000;
        }
        if (bulkDatePreset === 'custom') {
          let matchFrom = true;
          let matchTo = true;
          if (bulkDateFrom) {
            const fromMs = new Date(`${bulkDateFrom}T00:00:00`).getTime();
            matchFrom = time >= fromMs;
          }
          if (bulkDateTo) {
            const toMs = new Date(`${bulkDateTo}T23:59:59.999`).getTime();
            matchTo = time <= toMs;
          }
          return matchFrom && matchTo;
        }
        return true;
      });
    }

    // 4. Sort
    list.sort((a, b) => {
      if (bulkSort === 'newest') {
        return (b.createdTime || 0) - (a.createdTime || 0);
      }
      if (bulkSort === 'oldest') {
        return (a.createdTime || 0) - (b.createdTime || 0);
      }
      if (bulkSort === 'id_desc') {
        const numA = Number(a.displayId.replace(/\D/g, '')) || 0;
        const numB = Number(b.displayId.replace(/\D/g, '')) || 0;
        return numB - numA;
      }
      if (bulkSort === 'id_asc') {
        const numA = Number(a.displayId.replace(/\D/g, '')) || 0;
        const numB = Number(b.displayId.replace(/\D/g, '')) || 0;
        return numA - numB;
      }
      return 0;
    });

    return list;
  }, [bulkTickets, bulkSearch, bulkStatusFilter, bulkDatePreset, bulkDateFrom, bulkDateTo, bulkSort]);

  const selectedFilteredCount = useMemo(() => {
    return filteredBulkTickets.filter((t) => bulkSelected.has(t.id)).length;
  }, [filteredBulkTickets, bulkSelected]);

  const isAllFilteredSelected =
    filteredBulkTickets.length > 0 && selectedFilteredCount === filteredBulkTickets.length;

  const isSomeFilteredSelected =
    selectedFilteredCount > 0 && selectedFilteredCount < filteredBulkTickets.length;

  const handleToggleAllFiltered = () => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        filteredBulkTickets.forEach((t) => next.delete(t.id));
      } else {
        filteredBulkTickets.forEach((t) => next.add(t.id));
      }
      return next;
    });
  };

  const handleBulkToggle = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearAllSelected = () => {
    setBulkSelected(new Set());
  };

  const handleBulkImport = () => {
    const selected = bulkTickets.filter((t) => bulkSelected.has(t.id));
    if (selected.length === 0) return;

    const newProjects: ProjectItem[] = selected.map((t, idx) => ({
      id: `proj-${Date.now()}-${idx}`,
      key: t.subject || t.displayId,
      name: t.subject || t.displayId,
      ticketId: t.ticketType === 'CH' ? `CH-${t.displayId}` : t.displayId,
      urlTicketId: t.id,
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      status: t.status || '',
      isCustom: true,
    }));

    setItems((prev) => {
      const next = [...prev, ...newProjects];
      persistChanges(next);
      return next;
    });
    setBulkOpen(false);
    setBulkTickets([]);
    setBulkSelected(new Set());
  };

  const handleDeleteCategory = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistChanges(next);
      return next;
    });
    setProjectToDelete(null);
  };

  const handleClose = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      persistChanges(latestItemsRef.current);
    }
    onClose();
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.85 }}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            className="glass-card relative w-full max-w-3xl p-6 shadow-2xl z-10 rounded-2xl border border-surface-600/50"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-700/60 text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-accent-500/15 border border-accent-500/30 rounded-xl flex items-center justify-center text-accent-500 shadow-sm">
                <FolderOpen size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary tracking-tight leading-tight">
                  Project Manager
                </h2>
                <p className="text-[12px] text-text-secondary mt-0.5 font-normal">
                  Manage project names, default ticket numbers, URL ticket IDs, and color styles
                </p>
              </div>
            </div>

            {/* Add Project Section */}
            <div className="flex flex-col gap-2 mb-4 bg-surface-700/20 p-2.5 border border-surface-600/40 rounded-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddProjectAsync()}
                  placeholder="Ticket # (e.g. CH-4233) or Project Name"
                  maxLength={50}
                  className="flex-1 px-3 py-2 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 text-xs font-semibold dark:font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                  disabled={isAdding}
                />
                <button
                  type="button"
                  onClick={handleAddProjectAsync}
                  disabled={isAdding || !newInput.trim()}
                  className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-accent-500 text-white hover:bg-accent-600 transition-all cursor-pointer rounded-xl active:scale-[0.97] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAdding ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {isAdding ? 'Adding...' : 'Add Project'}
                </button>
              </div>
            </div>

            {/* Toolbar Buttons: Bulk Import & Refresh Statuses */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {sdpConfig?.cookieString && sdpConfig?.ownerId && (
                <button
                  type="button"
                  onClick={() => { setBulkOpen(true); handleBulkFetch('SR'); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-800 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-200 transition-all cursor-pointer border border-teal-500/40 active:scale-[0.97]"
                >
                  <Download size={13} />
                  <span>Bulk Import My Tickets</span>
                </button>
              )}

              {sdpConfig?.cookieString && (
                <button
                  type="button"
                  onClick={() => syncAllTicketStatuses()}
                  disabled={isSyncingStatuses}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-surface-800 dark:bg-surface-700/50 hover:bg-surface-700/60 dark:hover:bg-surface-600/60 text-text-primary dark:text-text-secondary hover:text-text-primary transition-all cursor-pointer border border-surface-400/80 dark:border-surface-500/50 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  title="Fetch latest ticket statuses from SDP"
                >
                  <RefreshCw size={13} className={isSyncingStatuses ? 'animate-spin text-accent-500' : 'text-accent-500'} />
                  <span>{isSyncingStatuses ? (syncProgress || 'Syncing...') : 'Refresh Statuses'}</span>
                </button>
              )}
            </div>

            {/* Bulk Import Modal */}
            <AnimatePresence>
              {bulkOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] flex items-center justify-center px-4"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
                    onClick={() => setBulkOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 14 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.85 }}
                    className="glass-card relative w-full max-w-2xl border border-surface-600/50 rounded-2xl shadow-2xl z-10 p-5 max-h-[85vh] flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-surface-600/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-sm">
                          <Download size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary tracking-tight leading-tight">
                            Bulk Import Assigned Tickets
                          </h3>
                          <p className="text-[12px] text-text-secondary mt-0.5 font-normal">
                            Filter and select tickets assigned to you in ServiceDesk Plus
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setBulkOpen(false)}
                        className="p-2 rounded-full hover:bg-surface-700/60 text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer"
                        title="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* Type Tabs & Refresh */}
                    <div className="flex items-center justify-between gap-2 mt-3 mb-2 flex-wrap">
                      <div className="relative flex items-center p-1 rounded-xl bg-surface-900/60 border border-surface-700/60">
                        <button
                          type="button"
                          onClick={() => handleBulkFetch('SR')}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                            bulkType === 'SR'
                              ? 'text-white'
                              : 'text-text-secondary hover:text-text-primary'
                          } active:scale-[0.97]`}
                        >
                          {bulkType === 'SR' && (
                            <motion.div
                              layoutId="bulkType-pill"
                              className="absolute inset-0 bg-teal-500 rounded-lg shadow-sm -z-10"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span>Service Requests</span>
                          {bulkType === 'SR' && !bulkLoading && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                              {bulkTickets.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkFetch('CH')}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer z-10 ${
                            bulkType === 'CH'
                              ? 'text-white'
                              : 'text-text-secondary hover:text-text-primary'
                          } active:scale-[0.97]`}
                        >
                          {bulkType === 'CH' && (
                            <motion.div
                              layoutId="bulkType-pill"
                              className="absolute inset-0 bg-teal-500 rounded-lg shadow-sm -z-10"
                              transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            />
                          )}
                          <span>Changes</span>
                          {bulkType === 'CH' && !bulkLoading && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                              {bulkTickets.length}
                            </span>
                          )}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBulkFetch(bulkType)}
                        disabled={bulkLoading}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary bg-surface-700 hover:bg-surface-600 border border-surface-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Refetch tickets from SDP"
                      >
                        <RefreshCw size={12} className={bulkLoading ? 'animate-spin text-teal-400' : 'text-teal-400'} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {/* Filter Controls Row */}
                    {!bulkLoading && !bulkError && bulkTickets.length > 0 && (
                      <div className="bg-surface-700/20 dark:bg-surface-750/70 p-2.5 rounded-lg border border-surface-400/50 dark:border-surface-700 mb-2.5 space-y-2">
                        {/* Filter Bar: Search, Status, Date Preset */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          {/* Search Input */}
                          <div className="sm:col-span-5 relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                            <input
                              type="text"
                              value={bulkSearch}
                              onChange={(e) => setBulkSearch(e.target.value)}
                              placeholder="Search title, ticket #..."
                              className="w-full pl-8 pr-7 py-1.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded-md text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                            />
                            {bulkSearch && (
                              <button
                                type="button"
                                onClick={() => setBulkSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Status Filter Dropdown */}
                          <div className="sm:col-span-4 relative" ref={statusDropdownRef}>
                            <button
                              type="button"
                              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                              className="w-full flex items-center justify-between pl-7 pr-3 py-1.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded-md text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer text-left truncate shadow-xs"
                            >
                              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                                <Filter size={12} />
                              </div>
                              <span className="truncate">
                                {bulkStatusFilter.size === 0 
                                  ? `All Statuses (${bulkTickets.length})` 
                                  : `${bulkStatusFilter.size} Selected`}
                              </span>
                              <ChevronDown size={12} className="text-text-muted ml-2 shrink-0" />
                            </button>
                            
                            {isStatusDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-800 border border-surface-400/80 dark:border-surface-600 rounded-md shadow-xl z-50 max-h-48 overflow-y-auto py-1">
                                <label className="flex items-center px-3 py-1.5 hover:bg-surface-700 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={bulkStatusFilter.size === 0}
                                    onChange={() => setBulkStatusFilter(new Set())}
                                    className="mr-2 rounded border-surface-500 text-teal-500 focus:ring-teal-500 bg-surface-800 cursor-pointer"
                                  />
                                  <span className="text-xs text-text-primary group-hover:text-white">All Statuses ({bulkTickets.length})</span>
                                </label>
                                {bulkAvailableStatuses.map((st) => {
                                  const lowerSt = st.toLowerCase();
                                  const count = bulkTickets.filter((t) => (t.status || '').toLowerCase() === lowerSt).length;
                                  return (
                                    <label key={st} className="flex items-center px-3 py-1.5 hover:bg-surface-700 cursor-pointer group">
                                      <input
                                        type="checkbox"
                                        checked={bulkStatusFilter.has(lowerSt)}
                                        onChange={(e) => {
                                          const next = new Set(bulkStatusFilter);
                                          if (e.target.checked) {
                                            next.add(lowerSt);
                                          } else {
                                            next.delete(lowerSt);
                                          }
                                          setBulkStatusFilter(next);
                                        }}
                                        className="mr-2 rounded border-surface-500 text-teal-500 focus:ring-teal-500 bg-surface-800 cursor-pointer"
                                      />
                                      <span className="text-xs text-text-primary group-hover:text-white truncate">
                                        {st} ({count})
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Timestamp / Date Preset Dropdown */}
                          <div className="sm:col-span-3 relative">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                              <Calendar size={12} />
                            </div>
                            <select
                              value={bulkDatePreset}
                              onChange={(e) => setBulkDatePreset(e.target.value as any)}
                              className="w-full pl-7 pr-6 py-1.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded-md text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer appearance-none truncate shadow-xs"
                            >
                              <option value="all">All Time</option>
                              <option value="today">Today</option>
                              <option value="7d">Last 7 Days</option>
                              <option value="14d">Last 14 Days</option>
                              <option value="30d">Last 30 Days</option>
                              <option value="90d">Last 90 Days</option>
                              <option value="custom">Custom Range...</option>
                            </select>
                          </div>
                        </div>

                        {/* Custom Date Range & Sorting Options */}
                        <div className="flex items-center gap-2 pt-1.5 border-t border-surface-700/60 flex-wrap justify-between">
                          {bulkDatePreset === 'custom' ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-text-secondary">
                                <span className="text-[10px] text-text-muted font-medium">From:</span>
                                <input
                                  type="date"
                                  value={bulkDateFrom}
                                  onChange={(e) => setBulkDateFrom(e.target.value)}
                                  className="px-2 py-0.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                                />
                              </div>
                              <div className="flex items-center gap-1 text-xs text-text-secondary">
                                <span className="text-[10px] text-text-muted font-medium">To:</span>
                                <input
                                  type="date"
                                  value={bulkDateTo}
                                  onChange={(e) => setBulkDateTo(e.target.value)}
                                  className="px-2 py-0.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-text-secondary dark:text-text-muted font-medium">
                              Showing {filteredBulkTickets.length} of {bulkTickets.length} tickets
                            </div>
                          )}

                          {/* Sort */}
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary ml-auto">
                            <ArrowUpDown size={11} className="text-text-muted" />
                            <select
                              value={bulkSort}
                              onChange={(e) => setBulkSort(e.target.value as any)}
                              className="px-2 py-0.5 bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-600 rounded text-[11px] font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shadow-xs"
                            >
                              <option value="newest">Newest First</option>
                              <option value="oldest">Oldest First</option>
                              <option value="id_desc">Ticket ID (Desc)</option>
                              <option value="id_asc">Ticket ID (Asc)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Master All-Checkbox & Selection Stats Bar */}
                    {!bulkLoading && !bulkError && bulkTickets.length > 0 && (
                      <div className="flex items-center justify-between px-3 py-2 bg-surface-700/40 rounded-lg border border-surface-700 mb-2">
                        {/* All Checkbox */}
                        <button
                          type="button"
                          onClick={handleToggleAllFiltered}
                          className="flex items-center gap-2 cursor-pointer select-none group"
                        >
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isAllFilteredSelected
                                ? 'bg-teal-500 border-teal-500 text-white'
                                : isSomeFilteredSelected
                                  ? 'bg-teal-500/30 border-teal-400 text-teal-300'
                                  : 'border-surface-400 group-hover:border-surface-300'
                            }`}
                          >
                            {isAllFilteredSelected ? (
                              <Check size={11} className="stroke-[3]" />
                            ) : isSomeFilteredSelected ? (
                              <Minus size={11} className="stroke-[3]" />
                            ) : null}
                          </div>
                          <span className="text-xs font-semibold text-text-primary group-hover:text-teal-400 transition-colors">
                            Include all filtered ({filteredBulkTickets.length})
                          </span>
                        </button>

                        {/* Selection Count & Clear */}
                        <div className="flex items-center gap-2.5">
                          <span className="text-[11px] text-text-muted font-medium">
                            <span className="text-teal-400 font-bold">{selectedFilteredCount}</span> of {filteredBulkTickets.length} filtered selected
                            {bulkSelected.size > selectedFilteredCount && (
                              <span className="ml-1 text-[10px] text-text-muted">({bulkSelected.size} total)</span>
                            )}
                          </span>
                          {bulkSelected.size > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllSelected}
                              className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline transition-colors cursor-pointer font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ticket List Content */}
                    <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-1.5">
                      {bulkLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted text-xs">
                          <Loader2 size={22} className="animate-spin text-teal-400" />
                          <span>Fetching assigned tickets from ServiceDesk Plus...</span>
                        </div>
                      ) : bulkError ? (
                        <div className="text-center py-12 px-4 bg-rose-500/10 border border-rose-500/20 rounded-xl my-2">
                          <p className="text-xs font-semibold text-rose-400">{bulkError}</p>
                          <button
                            type="button"
                            onClick={() => handleBulkFetch(bulkType)}
                            className="mt-3 px-3 py-1.5 text-xs bg-surface-700 hover:bg-surface-600 text-text-primary rounded-md transition-colors cursor-pointer"
                          >
                            Retry
                          </button>
                        </div>
                      ) : bulkTickets.length === 0 ? (
                        <div className="text-center py-12 text-xs text-text-muted">
                          No new assigned tickets found (already imported tickets are hidden).
                        </div>
                      ) : filteredBulkTickets.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-surface-700/20 border border-surface-700/40 rounded-xl my-2">
                          <Filter size={20} className="mx-auto text-text-muted mb-2 opacity-60" />
                          <p className="text-xs font-semibold text-text-primary">No tickets match your filters</p>
                          <p className="text-[11px] text-text-muted mt-1">
                            Try adjusting your search query, status, or date range filter.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setBulkSearch('');
                              setBulkStatusFilter(new Set());
                              setBulkDatePreset('all');
                              setBulkDateFrom('');
                              setBulkDateTo('');
                            }}
                            className="mt-3 px-3 py-1 text-xs text-teal-400 hover:text-teal-300 hover:underline cursor-pointer"
                          >
                            Reset all filters
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filteredBulkTickets.map((t) => {
                            const isSelected = bulkSelected.has(t.id);
                            return (
                              <div
                                key={t.id}
                                onClick={() => handleBulkToggle(t.id)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer select-none group ${
                                  isSelected
                                    ? 'bg-teal-500/15 border-teal-500/40 shadow-sm'
                                    : 'bg-surface-700/40 border-surface-600/80 hover:bg-surface-700 hover:border-surface-500'
                                }`}
                              >
                                {/* Checkbox on the side */}
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-teal-500 border-teal-500 text-white'
                                      : 'border-surface-400 group-hover:border-teal-400'
                                  }`}
                                >
                                  {isSelected && <Check size={11} className="stroke-[3]" />}
                                </div>

                                {/* Ticket Details */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-text-primary truncate" title={t.subject}>
                                    {t.subject || 'Untitled Ticket'}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] font-mono text-text-muted bg-surface-800/80 px-1.5 py-0.5 rounded border border-surface-700">
                                      {t.ticketType === 'CH' ? `CH-${t.displayId}` : `#${t.displayId}`}
                                    </span>
                                    {t.status && (
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getStatusBadgeStyle(t.status)}`}>
                                        {t.status}
                                      </span>
                                    )}
                                    {t.createdTimeFormatted && (
                                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                                        <Clock size={10} className="text-text-muted" />
                                        {t.createdTimeFormatted}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer / Import Actions */}
                    <div className="mt-3 pt-3 border-t border-surface-700 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setBulkOpen(false)}
                        className="px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-700 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkImport}
                        disabled={bulkSelected.size === 0}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20"
                      >
                        <Download size={14} />
                        <span>
                          {bulkSelected.size > 0
                            ? `Import ${bulkSelected.size} Selected Ticket${bulkSelected.size > 1 ? 's' : ''}`
                            : 'Select Tickets to Import'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full pl-8 pr-3 py-1.5 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 text-xs font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl cursor-pointer transition-all shadow-xs"
              >
                <option value="all">All Status</option>
                {Array.from(new Set(items.map(i => i.status).filter(Boolean))).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="none">No Status</option>
              </select>
            </div>

            {/* Headers row */}
            <div className="grid grid-cols-[2fr_2fr_3fr_auto_auto_auto] gap-2.5 text-[11px] font-bold text-text-primary/75 dark:text-text-secondary uppercase tracking-wider mb-2 px-2 items-center">
              <span>Project Name</span>
              <span>Ticket #</span>
              <span className="flex items-center gap-1">
                <Link size={11} />
                URL Ticket ID
              </span>
              <span className="w-7 text-center">Color</span>
              <span className="min-w-[70px] text-center">Status</span>
              <span className="w-6"></span>
            </div>

            {/* Project List */}
            <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto pr-1">
              {items
                .filter(item => {
                  const q = searchQuery.toLowerCase();
                  const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.ticketId.toLowerCase().includes(q) || item.urlTicketId.toLowerCase().includes(q);
                  const matchesStatus = statusFilter === 'all' || (statusFilter === 'none' ? !item.status : item.status === statusFilter);
                  return matchesSearch && matchesStatus;
                })
                .map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_2fr_3fr_auto_auto_auto] gap-2.5 items-center py-1 border-b border-surface-600/30 dark:border-surface-700/30 last:border-0"
                >
                  {/* Editable Project Name field */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleNameChange(item.id, e.target.value)}
                    placeholder="Project Name"
                    maxLength={40}
                    className="w-full px-2.5 py-1.5 bg-surface-800 dark:bg-surface-700/50 border border-surface-400/80 dark:border-surface-500/50 text-xs font-semibold dark:font-medium text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                  />

                  {/* Editable Ticket ID field */}
                  <input
                    type="text"
                    value={item.ticketId}
                    onChange={(e) => handleTicketIdChange(item.id, e.target.value)}
                    placeholder="e.g. CH-4233"
                    maxLength={20}
                    className="w-full px-2.5 py-1.5 bg-surface-800 dark:bg-surface-700/50 border border-surface-400/80 dark:border-surface-500/50 text-xs font-mono font-bold dark:font-semibold text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                  />

                  {/* Editable URL Ticket ID field */}
                  <input
                    type="text"
                    value={item.urlTicketId}
                    onChange={(e) => handleUrlTicketIdChange(item.id, e.target.value)}
                    placeholder="108026..."
                    maxLength={30}
                    className="w-full px-2.5 py-1.5 bg-surface-800 dark:bg-surface-700/50 border border-surface-400/80 dark:border-surface-500/50 text-xs font-mono font-bold dark:font-semibold text-text-primary placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                    title="Internal SDP Ticket ID used in request/change URLs & API endpoints"
                  />

                  {/* Color Picker Swatch Only */}
                  <div className="relative w-7 h-7 cursor-pointer flex items-center justify-center border border-surface-400 dark:border-surface-500 overflow-hidden shrink-0 rounded-xl shadow-xs">
                    <input
                      type="color"
                      value={item.color}
                      onChange={(e) => handleColorChange(item.id, e.target.value)}
                      className="absolute inset-0 cursor-pointer w-12 h-12 -translate-x-2 -translate-y-2 p-0 border-0 bg-transparent"
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-center min-w-[70px]">
                    {item.status ? (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold whitespace-nowrap max-w-[90px] truncate text-center transition-colors ${getStatusBadgeStyle(item.status)}`}
                        title={item.status}
                      >
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-700/40 text-slate-600 dark:text-text-muted border border-slate-300 dark:border-surface-600 text-center font-mono">
                        —
                      </span>
                    )}
                  </div>

                  {/* Delete Action */}
                  <div className="flex items-center justify-center w-6">
                    {item.isCustom ? (
                      <button
                        type="button"
                        onClick={() => setProjectToDelete(item)}
                        className="p-1.5 hover:bg-rose-500/15 text-slate-500 dark:text-text-muted hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all active:scale-95 cursor-pointer"
                        title="Remove project"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span className="w-5" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons & Auto-save status footer */}
            <div className="flex items-center justify-between border-t border-surface-400/50 dark:border-surface-600/40 pt-4 mt-4">
              <div className="flex items-center gap-2">
                {isSyncingStatuses ? (
                  <div className="flex items-center gap-1.5 text-accent-500 text-[11px] font-semibold animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    <span>{syncProgress || 'Syncing ticket statuses from SDP...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    <CheckCircle2 size={13} />
                    <span className="text-text-secondary dark:text-text-muted">Changes saved automatically</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-text-primary dark:text-text-secondary hover:text-text-primary hover:bg-surface-700/60 border border-surface-400/70 dark:border-surface-600/60 transition-all cursor-pointer rounded-xl active:scale-[0.97]"
                >
                  Close
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-2 text-xs font-bold bg-accent-500 text-white hover:bg-accent-600 transition-all cursor-pointer rounded-xl shadow-xs active:scale-[0.97]"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Delete Confirmation Modal */}
    <AnimatePresence>
      {projectToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            onClick={() => setProjectToDelete(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.85 }}
            className="glass-card relative w-full max-w-sm border border-surface-600/50 rounded-2xl shadow-2xl z-10 p-6"
          >
            <h3 className="text-sm font-semibold text-text-primary tracking-tight mb-2">Delete Project</h3>
            <p className="text-xs text-text-secondary mb-5 leading-relaxed font-normal">
              Are you sure you want to delete <strong className="text-text-primary font-semibold">"{projectToDelete.name}"</strong>? This will remove it from your saved projects list.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-700/60 transition-all cursor-pointer rounded-xl active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCategory(projectToDelete.id)}
                className="px-4 py-2 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all cursor-pointer shadow-sm rounded-xl active:scale-[0.97]"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
