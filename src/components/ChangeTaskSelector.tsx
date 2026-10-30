import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Check,
  ChevronDown,
  RefreshCw,
  ListTodo,
  Layers,
  User,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import type { SdpConfig } from '../db';
import {
  fetchChangeTasks,
  formatChangeTaskLabel,
  isTaskOwnedByUser,
  type SdpChangeTask,
} from '../utils/sdpApi';
import { getStatusBadgeStyle } from './ProjectSelector';

export interface ChangeTaskSelectorProps {
  urlTicketId: string;
  sdpConfig?: SdpConfig;
  taskId: string;
  taskTitle?: string;
  onChange: (taskId: string, taskTitle: string) => void;
  accentColor?: string;
  autoFetch?: boolean;
  compact?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

type TaskStatusFilter = 'all' | 'open';

const YOU_SEARCH_TOKENS = new Set([
  'you',
  '@you',
  'owner:you',
  'mine',
  'is:mine',
  'me',
  '@me',
]);

function hasYouSearchToken(query: string): boolean {
  if (!query.trim()) return false;
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .some((t) => YOU_SEARCH_TOKENS.has(t));
}

function isTaskOpen(status?: string): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return !(
    s.includes('closed') ||
    s.includes('completed') ||
    s.includes('resolved') ||
    s.includes('cancel') ||
    s.includes('reject') ||
    s.includes('done')
  );
}

function highlightTaskMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => !YOU_SEARCH_TOKENS.has(t) && !t.startsWith('@') && !t.includes(':'))
    .map((t) => t.replace(/^[#]/, '').trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return text;

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.match(new RegExp(`^(${escaped})$`, 'i')) ? (
          <mark
            key={i}
            className="bg-accent-500/25 text-accent-600 dark:text-accent-300 rounded px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function matchesTaskSearch(task: SdpChangeTask, query: string, isMine = false): boolean {
  if (!query.trim()) return true;
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const title = (task.title || '').toLowerCase();
  const stage = (task.changeStage || '').toLowerCase();
  const owner = (task.ownerName || '').toLowerCase();
  const status = (task.status || '').toLowerCase();
  const id = (task.id || '').toLowerCase();
  const group = (task.groupName || '').toLowerCase();
  const taskType = (task.taskType || '').toLowerCase();

  return tokens.every((rawToken) => {
    if (YOU_SEARCH_TOKENS.has(rawToken)) {
      return isMine;
    }
    const token = rawToken.replace(/^[#@]/, '');
    return (
      title.includes(token) ||
      stage.includes(token) ||
      owner.includes(token) ||
      status.includes(token) ||
      id.includes(token) ||
      group.includes(token) ||
      taskType.includes(token)
    );
  });
}

export default function ChangeTaskSelector({
  urlTicketId,
  sdpConfig,
  taskId,
  taskTitle,
  onChange,
  accentColor = '#0030FF',
  autoFetch = true,
  compact = false,
  emptyLabel = 'Main Change Ticket (No Sub-task)',
  disabled = false,
}: ChangeTaskSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tasks, setTasks] = useState<SdpChangeTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [popoverStyle, setPopoverStyle] = useState<{
    left: number;
    top: number;
    width: number;
    placeAbove: boolean;
  }>({ left: 0, top: 0, width: 360, placeAbove: false });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fetchedForChangeRef = useRef<string | null>(null);

  const cleanChangeId = urlTicketId.trim();
  const hasAuth = Boolean(sdpConfig?.cookieString);
  const hasOwnerIdentity = Boolean(
    sdpConfig?.ownerId?.trim() || sdpConfig?.ownerName?.trim()
  );

  const loadTasks = useCallback(
    async (forceRefresh = false) => {
      if (!cleanChangeId) {
        setTasks([]);
        setError('Enter the Change URL Ticket ID first to load tasks.');
        return;
      }
      if (!sdpConfig?.cookieString) {
        setError('Connect Manage Engine cookies in Manage Engine Settings to load tasks.');
        return;
      }

      setLoading(true);
      setError(null);
      const res = await fetchChangeTasks(cleanChangeId, sdpConfig, forceRefresh);
      if (res.error) {
        setError(res.error);
      } else {
        setTasks(res.tasks || []);
        fetchedForChangeRef.current = cleanChangeId;
      }
      setLoading(false);
    },
    [cleanChangeId, sdpConfig]
  );

  // Reset loaded task state when switching to a different CH URL ID
  useEffect(() => {
    if (fetchedForChangeRef.current && fetchedForChangeRef.current !== cleanChangeId) {
      setTasks([]);
      setError(null);
      fetchedForChangeRef.current = null;
    }
  }, [cleanChangeId]);

  // Auto-fetch in WorklogModal when urlTicketId & cookies are ready
  useEffect(() => {
    if (autoFetch && cleanChangeId && hasAuth && fetchedForChangeRef.current !== cleanChangeId) {
      loadTasks(false);
    }
  }, [autoFetch, cleanChangeId, hasAuth, loadTasks]);

  // Lazy-fetch when opening dropdown (e.g. inside Project Manager where autoFetch=false)
  useEffect(() => {
    if (isOpen && cleanChangeId && hasAuth && fetchedForChangeRef.current !== cleanChangeId && !loading) {
      loadTasks(false);
    }
  }, [isOpen, cleanChangeId, hasAuth, loading, loadTasks]);

  // Update portal popover coordinates relative to trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minWidth = compact ? 380 : 400;
    const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = 360;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const top = placeAbove ? rect.top - 6 : rect.bottom + 6;

    setPopoverStyle({ left, top, width, placeAbove });
  }, [compact]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScroll = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };
    const handleResize = () => updatePosition();

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, updatePosition]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
    }
  }, [isOpen]);

  // Close on outside click (checking both trigger and portal popover)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedTask = useMemo(
    () => (taskId ? tasks.find((t) => t.id === taskId) : undefined),
    [tasks, taskId]
  );

  // Sync formatted task title back if taskId was set manually or missing stage label
  const myTasksCount = useMemo(
    () => tasks.filter((t) => isTaskOwnedByUser(t, sdpConfig)).length,
    [tasks, sdpConfig]
  );

  const openTasksCount = useMemo(
    () => tasks.filter((t) => isTaskOpen(t.status)).length,
    [tasks]
  );

  const youTokenActive = useMemo(() => hasYouSearchToken(searchQuery), [searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const isMine = isTaskOwnedByUser(t, sdpConfig);
      if (onlyMine && !isMine) {
        return false;
      }
      if (statusFilter === 'open' && !isTaskOpen(t.status)) {
        return false;
      }
      return matchesTaskSearch(t, searchQuery, isMine);
    });
  }, [tasks, onlyMine, statusFilter, sdpConfig, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredTasks.length, searchQuery, statusFilter, onlyMine]);

  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectMainChange = useCallback(() => {
    onChange('', '');
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleSelectTask = useCallback(
    (task: SdpChangeTask) => {
      onChange(task.id, formatChangeTaskLabel(task));
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleUseManualTaskId = useCallback(
    (rawId: string) => {
      const cleaned = rawId.trim().replace(/^#/, '');
      if (!cleaned) return;
      const existing = tasks.find((t) => t.id === cleaned);
      if (existing) {
        handleSelectTask(existing);
      } else {
        onChange(cleaned, `Task #${cleaned}`);
        setIsOpen(false);
        setSearchQuery('');
      }
    },
    [tasks, handleSelectTask, onChange]
  );

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredTasks.length === 0 ? 0 : (prev + 1) % filteredTasks.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredTasks.length === 0
          ? 0
          : (prev - 1 + filteredTasks.length) % filteredTasks.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTasks.length > 0 && filteredTasks[highlightedIndex]) {
        handleSelectTask(filteredTasks[highlightedIndex]);
      } else if (/^#?\d{6,}$/.test(searchQuery.trim())) {
        handleUseManualTaskId(searchQuery.trim());
      }
    }
  };

  const displayLabel = useMemo(() => {
    if (!taskId) return null;
    if (selectedTask) return selectedTask.title;
    if (taskTitle) return taskTitle;
    return `Task #${taskId}`;
  }, [taskId, selectedTask, taskTitle]);

  return (
    <div className="relative w-full min-w-0">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-w-0 flex items-center justify-between rounded-xl bg-surface-800 dark:bg-surface-700/60 border border-surface-400/80 dark:border-surface-500 text-left transition-all cursor-pointer shadow-xs hover:border-surface-400 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-accent-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2.5 py-1.5' : 'px-3 py-2'
        }`}
        style={{
          borderColor: isOpen ? accentColor : `${accentColor}50`,
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 overflow-hidden">
          <ListTodo
            size={compact ? 12 : 13}
            className="shrink-0"
            style={{ color: taskId ? accentColor : undefined }}
          />

          {taskId ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span
                className={`${compact ? 'text-xs' : 'text-xs'} font-semibold text-text-primary truncate min-w-0 flex-1`}
                title={selectedTask ? formatChangeTaskLabel(selectedTask) : (displayLabel || taskId)}
              >
                {displayLabel}
              </span>
              {selectedTask?.changeStage && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-500 dark:text-accent-400 font-semibold shrink-0 border border-accent-500/25">
                  {selectedTask.changeStage}
                </span>
              )}
              {selectedTask?.status && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${getStatusBadgeStyle(
                    selectedTask.status
                  )}`}
                >
                  {selectedTask.status}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-text-muted truncate min-w-0 flex-1">
              {cleanChangeId ? emptyLabel : 'Enter Change URL Ticket ID to select a task'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-text-muted">
          {loading && <Loader2 size={12} className="animate-spin text-accent-500 mr-0.5" />}
          {!loading && tasks.length > 0 && !taskId && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-700/70 text-text-muted border border-surface-600/40">
              {tasks.length} tasks
            </span>
          )}
          {taskId && (
            <span
              onClick={handleClear}
              className="p-0.5 hover:text-text-primary hover:bg-surface-600/50 rounded-full transition-colors cursor-pointer mr-0.5"
              title="Reset to Main Change Ticket"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-500' : ''}`}
          />
        </div>
      </button>

      {/* Portal Popover Dropdown */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div
                ref={popoverRef}
                onKeyDown={handleKeyDown}
                className="fixed z-[220]"
                style={{
                  left: `${popoverStyle.left}px`,
                  top: `${popoverStyle.top}px`,
                  width: `${popoverStyle.width}px`,
                  transform: popoverStyle.placeAbove ? 'translateY(-100%)' : 'none',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: popoverStyle.placeAbove ? 4 : -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: popoverStyle.placeAbove ? 4 : -4, scale: 0.98 }}
                  transition={{ duration: 0.14, ease: 'easeOut' }}
                  className="bg-surface-800 dark:bg-surface-800/95 border border-surface-600/80 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 backdrop-blur-xl text-text-primary"
                  style={{
                    boxShadow:
                      '0 20px 45px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                  }}
                >
                  {/* Search Input + Refresh Button */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                      />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title, stage, owner, ID, or 'you'..."
                        className="w-full pl-8 pr-14 py-1.5 rounded-xl bg-surface-700/60 dark:bg-surface-700/50 border border-surface-500/60 text-xs text-text-primary font-medium placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              searchInputRef.current?.focus();
                            }}
                            className="p-0.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-600/60 transition-colors cursor-pointer"
                            title="Clear search"
                          >
                            <X size={11} />
                          </button>
                        )}
                        <span className="text-[10px] text-text-muted font-mono px-1 bg-surface-700 rounded border border-surface-600/40">
                          {filteredTasks.length}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => loadTasks(true)}
                      disabled={loading || !cleanChangeId}
                      className="p-1.5 rounded-xl bg-surface-700/60 hover:bg-surface-600/80 border border-surface-500/60 text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Refresh tasks from Manage Engine"
                    >
                      <RefreshCw size={13} className={loading ? 'animate-spin text-accent-500' : ''} />
                    </button>
                  </div>

                  {/* Quick Filter Pills */}
                  {tasks.length > 0 && (
                    <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-surface-700/60 flex-wrap">
                      <div className="flex items-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all');
                            setOnlyMine(false);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                            statusFilter === 'all' && !onlyMine
                              ? 'bg-accent-500 text-white border-accent-600 shadow-xs'
                              : 'bg-surface-700/40 hover:bg-surface-700/80 text-text-secondary border-surface-600/40'
                          }`}
                        >
                          <span>All</span>
                          <span
                            className={`text-[9px] px-1 rounded-full font-mono ${
                              statusFilter === 'all' && !onlyMine
                                ? 'bg-white/25 text-white'
                                : 'bg-surface-600/60 text-text-muted'
                            }`}
                          >
                            {tasks.length}
                          </span>
                        </button>

                        {/* Dedicated Owner: YOU filter toggle (combinable with Open) */}
                        <button
                          type="button"
                          aria-pressed={onlyMine}
                          disabled={!hasOwnerIdentity && myTasksCount === 0}
                          onClick={() => setOnlyMine((prev) => !prev)}
                          title={
                            hasOwnerIdentity
                              ? 'Filter tasks where you are the owner (YOU tag)'
                              : 'Set your Owner ID in Manage Engine Settings to filter tasks owned by YOU'
                          }
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border disabled:opacity-45 disabled:cursor-not-allowed ${
                            onlyMine
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs ring-2 ring-emerald-500/25'
                              : 'bg-emerald-500/12 hover:bg-emerald-500/22 text-emerald-700 dark:text-emerald-300 border-emerald-500/35'
                          }`}
                        >
                          <User size={10} className="shrink-0" />
                          <span>Owner:</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider ${
                              onlyMine
                                ? 'bg-white/25 text-white'
                                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            YOU
                          </span>
                          <span
                            className={`text-[9px] px-1 rounded-full font-mono ${
                              onlyMine
                                ? 'bg-black/20 text-white'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {myTasksCount}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={statusFilter === 'open'}
                          onClick={() =>
                            setStatusFilter((prev) => (prev === 'open' ? 'all' : 'open'))
                          }
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                            statusFilter === 'open'
                              ? 'bg-accent-500 text-white border-accent-600 shadow-xs'
                              : 'bg-surface-700/40 hover:bg-surface-700/80 text-text-secondary border-surface-600/40'
                          }`}
                        >
                          <span>Open</span>
                          <span
                            className={`text-[9px] px-1 rounded-full font-mono ${
                              statusFilter === 'open'
                                ? 'bg-white/25 text-white'
                                : 'bg-surface-600/60 text-text-muted'
                            }`}
                          >
                            {openTasksCount}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Option to post directly to Main Change Ticket */}
                  <button
                    type="button"
                    onClick={handleSelectMainChange}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer border ${
                      !taskId
                        ? 'bg-accent-500/15 border-accent-500/40 text-text-primary'
                        : 'bg-surface-700/25 border-surface-600/40 hover:bg-surface-700/60 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">
                        Main Change Ticket (No Sub-task)
                      </span>
                      <span className="text-[10px] text-text-muted truncate">
                        Post worklog directly to the parent CH ticket bucket
                      </span>
                    </div>
                    {!taskId && (
                      <Check size={13} className="text-accent-500 shrink-0 stroke-[2.5] ml-2" />
                    )}
                  </button>

                  {/* Loading / Error / Tasks List */}
                  {loading && tasks.length === 0 ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-text-muted">
                      <Loader2 size={18} className="animate-spin text-accent-500" />
                      <span>Loading tasks from Change ticket...</span>
                    </div>
                  ) : error && tasks.length === 0 ? (
                    <div className="py-4 px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-400">
                        <AlertCircle size={13} />
                        <span>{error}</span>
                      </div>
                      {cleanChangeId && hasAuth && (
                        <button
                          type="button"
                          onClick={() => loadTasks(true)}
                          className="px-2.5 py-1 rounded-lg bg-surface-700 hover:bg-surface-600 text-xs font-semibold text-text-primary transition-colors cursor-pointer"
                        >
                          Retry
                        </button>
                      )}
                      {searchQuery.trim() && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleUseManualTaskId(searchQuery)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-500/15 hover:bg-accent-500/25 border border-accent-500/30 text-xs font-semibold text-accent-400 transition-colors cursor-pointer"
                          >
                            <Plus size={11} />
                            Use Task ID "{searchQuery.trim()}"
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      ref={listRef}
                      className="space-y-1 max-h-56 overflow-y-auto pr-1 pt-0.5 border-t border-surface-700/40 select-none"
                      role="listbox"
                    >
                      {filteredTasks.map((task, idx) => {
                        const isSelected = task.id === taskId;
                        const isHighlighted = idx === highlightedIndex;
                        const isMine = isTaskOwnedByUser(task, sdpConfig);

                        return (
                          <div
                            key={task.id}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleSelectTask(task)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`flex items-start justify-between gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-accent-500/15 border-accent-500/40 text-text-primary'
                                : isHighlighted
                                  ? 'bg-surface-700/70 border-surface-600/60 text-text-primary'
                                  : 'bg-transparent border-transparent hover:bg-surface-700/40 text-text-secondary hover:text-text-primary'
                            }`}
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              {/* Task Title */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="text-xs font-semibold text-text-primary truncate"
                                  title={task.title}
                                >
                                  {highlightTaskMatch(task.title, searchQuery)}
                                </span>
                                {isMine && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider shrink-0 border transition-all ${
                                      onlyMine || youTokenActive
                                        ? 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/30'
                                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                    }`}
                                  >
                                    You
                                  </span>
                                )}
                              </div>

                              {/* Metadata Sub-row: Change Stage, Owner, Task ID */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                {task.changeStage && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-surface-700/80 border border-surface-600/60 text-accent-500 dark:text-accent-300 font-semibold">
                                    <Layers size={9} />
                                    {highlightTaskMatch(task.changeStage, searchQuery)}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-text-muted truncate max-w-[140px]">
                                  <User size={9} className="shrink-0" />
                                  {task.ownerName
                                    ? highlightTaskMatch(task.ownerName, searchQuery)
                                    : 'Unassigned'}
                                </span>
                                <span className="font-mono text-text-muted/80">
                                  #{highlightTaskMatch(task.id.slice(-6), searchQuery)}
                                </span>
                              </div>
                            </div>

                            {/* Status & Selected Check */}
                            <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                              {task.status && (
                                <span
                                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${getStatusBadgeStyle(
                                    task.status
                                  )}`}
                                >
                                  {highlightTaskMatch(task.status, searchQuery)}
                                </span>
                              )}
                              {isSelected && (
                                <Check size={13} className="text-accent-500 shrink-0 stroke-[2.5]" />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Empty State */}
                      {filteredTasks.length === 0 && (
                        <div className="py-4 text-center space-y-2">
                          <p className="text-xs text-text-muted">
                            {tasks.length === 0
                              ? 'No tasks found on this Change ticket.'
                              : onlyMine && myTasksCount === 0
                                ? 'You are not assigned as the owner of any tasks on this Change ticket.'
                                : 'No tasks match your current search or filter.'}
                          </p>
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {(searchQuery || statusFilter !== 'all' || onlyMine) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery('');
                                  setStatusFilter('all');
                                  setOnlyMine(false);
                                  searchInputRef.current?.focus();
                                }}
                                className="text-xs text-accent-500 hover:text-accent-400 font-medium underline underline-offset-2 cursor-pointer"
                              >
                                Clear filters
                              </button>
                            )}
                            {searchQuery.trim() && (
                              <button
                                type="button"
                                onClick={() => handleUseManualTaskId(searchQuery)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-500/15 hover:bg-accent-500/25 border border-accent-500/30 text-xs font-semibold text-accent-500 dark:text-accent-400 transition-colors cursor-pointer"
                              >
                                <Plus size={11} />
                                Use Task ID "{searchQuery.trim()}"
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
