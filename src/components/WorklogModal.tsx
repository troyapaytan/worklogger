import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Plus, Minus, FileText, ChevronDown, FolderOpen, Wrench, Tag, ListTodo, Send, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import type { Worklog, SdpConfig } from '../db';
import { formatMinutesToTime, calculateDuration, clampMinutes } from '../utils/ganttMath';
import ProjectSelector, { type CategoryOption } from './ProjectSelector';
import ChangeTaskSelector from './ChangeTaskSelector';
export type { CategoryOption };

interface WorklogModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: {
    date?: string;
    startTime?: number;
    endTime?: number;
    title?: string;
    description?: string;
    ticketId?: string;
    urlTicketId?: string;
    taskId?: string;
    taskTitle?: string;
    category?: string;
    worklogType?: string;
  };
  editWorklog?: Worklog;
  categories: CategoryOption[];
  worklogTypes: string[];
  sdpConfig?: SdpConfig;
  onSave: (data: {
    date: string;
    startTime: number;
    endTime: number;
    title: string;
    description: string;
    ticketId: string;
    urlTicketId: string;
    taskId: string;
    taskTitle: string;
    category: string;
    worklogType: string;
  }) => void;
  onDelete?: () => void;
  onPostToSdp?: (draftData: {
    date: string;
    startTime: number;
    endTime: number;
    title: string;
    description: string;
    ticketId: string;
    urlTicketId: string;
    taskId: string;
    taskTitle: string;
    category: string;
    worklogType: string;
  }) => Promise<void>;
  onClose: () => void;
}

export default function WorklogModal({
  isOpen,
  mode,
  initialData,
  editWorklog,
  categories,
  worklogTypes,
  sdpConfig,
  onSave,
  onDelete,
  onPostToSdp,
  onClose,
}: WorklogModalProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [urlTicketId, setUrlTicketId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState('');
  const [projectError, setProjectError] = useState(false);
  const [worklogType, setWorklogType] = useState('Coding');
  const [startTime, setStartTime] = useState(540);
  const [endTime, setEndTime] = useState(600);
  const [date, setDate] = useState('');

  const modalSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      modalSessionRef.current = null;
      return;
    }

    const currentSessionKey =
      mode === 'edit' && editWorklog
        ? `edit-${editWorklog.id}-${editWorklog.updatedAt ?? ''}`
        : `create-${initialData?.date ?? ''}-${initialData?.startTime ?? ''}-${initialData?.endTime ?? ''}`;

    // Prevent resetting user edits if the modal is already open for this session (e.g. on window focus/tab switch)
    if (modalSessionRef.current === currentSessionKey) {
      return;
    }
    modalSessionRef.current = currentSessionKey;

    if (mode === 'edit' && editWorklog) {
      setDescription(editWorklog.description ?? '');
      setTicketId(editWorklog.ticketId ?? '');
      setUrlTicketId(editWorklog.urlTicketId ?? '');
      setCategory(editWorklog.category ?? '');
      setWorklogType(editWorklog.worklogType ?? 'Coding');
      setStartTime(editWorklog.startTime);
      setEndTime(editWorklog.endTime);
      setDate(editWorklog.date);

      const matchedEditCat = editWorklog.category
        ? categories.find(
            (c) =>
              c.key === editWorklog.category ||
              c.key.toLowerCase() === editWorklog.category?.toLowerCase()
          )
        : undefined;
      if (editWorklog.taskId !== undefined) {
        setTaskId(editWorklog.taskId);
        setTaskTitle(editWorklog.taskTitle ?? '');
      } else if (!editWorklog.sdpPosted && matchedEditCat?.defaultTaskId) {
        setTaskId(matchedEditCat.defaultTaskId);
        setTaskTitle(matchedEditCat.defaultTaskTitle ?? '');
      } else {
        setTaskId('');
        setTaskTitle('');
      }
    } else {
      setDescription(initialData?.description ?? '');
      // Default to empty string ("— Select Project —") rather than defaulting to first ticket (GCASH)
      const initCat = initialData?.category ?? '';
      setCategory(initCat);

      // Auto-fill ticket ID & URL ticket ID from category only if explicitly pre-selected
      const matchedCat = initCat
        ? categories.find(
            (c) => c.key === initCat || c.key.toLowerCase() === initCat.toLowerCase()
          )
        : undefined;
      setTicketId(initialData?.ticketId ?? matchedCat?.ticketId ?? '');
      setUrlTicketId(initialData?.urlTicketId ?? matchedCat?.urlTicketId ?? '');
      setTaskId(initialData?.taskId ?? matchedCat?.defaultTaskId ?? '');
      setTaskTitle(initialData?.taskTitle ?? matchedCat?.defaultTaskTitle ?? '');

      setWorklogType(initialData?.worklogType ?? 'Coding');
      setStartTime(initialData?.startTime ?? 540);
      setEndTime(initialData?.endTime ?? 600);
      setDate(initialData?.date ?? '');
    }
  }, [isOpen, mode, editWorklog, initialData, categories]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setProjectError(false);
    // Auto-fill ticket ID, URL ticket ID & default Change Task for the selected category/project, or clear if unselected
    const matchedCat = categories.find(
      (c) => c.key === newCat || c.key.toLowerCase() === newCat.toLowerCase()
    );
    setTicketId(matchedCat?.ticketId ?? '');
    setUrlTicketId(matchedCat?.urlTicketId ?? '');
    setTaskId(matchedCat?.defaultTaskId ?? '');
    setTaskTitle(matchedCat?.defaultTaskTitle ?? '');
  };

  const isChTicket = ticketId.trim().toUpperCase().startsWith('CH-');

  const bumpTime = useCallback(
    (field: 'start' | 'end', delta: number) => {
      if (field === 'start') {
        const newVal = clampMinutes(startTime + delta);
        if (newVal < endTime) setStartTime(newVal);
      } else {
        const newVal = clampMinutes(endTime + delta);
        if (newVal > startTime) setEndTime(newVal);
      }
    },
    [startTime, endTime]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category.trim();
    if (!finalCategory) {
      setProjectError(true);
      return;
    }
    setProjectError(false);
    // Title is automatically replaced by Category/Project name
    const finalTitle = finalCategory;
    const effectiveTaskId = isChTicket ? taskId.trim() : '';
    const effectiveTaskTitle = isChTicket && effectiveTaskId ? taskTitle.trim() : '';

    onSave({
      date,
      startTime,
      endTime,
      title: finalTitle,
      description: description.trim(),
      ticketId: ticketId.trim(),
      urlTicketId: urlTicketId.trim(),
      taskId: effectiveTaskId,
      taskTitle: effectiveTaskTitle,
      category: finalCategory,
      worklogType,
    });
  };

  const duration = calculateDuration(startTime, endTime);
  const durationHrs = Math.floor(duration / 60);
  const durationMins = duration % 60;

  const catColor = useMemo(() => {
    if (!category) return '#0030FF';
    const found = categories.find(
      (c) =>
        c.key === category ||
        c.key.toLowerCase() === category?.toLowerCase() ||
        c.name.toLowerCase() === category?.toLowerCase()
    );
    return found?.color || '#0030FF';
  }, [category, categories]);

  const sdpUrl = useMemo(() => {
    if (!urlTicketId) return null;
    const isCh = ticketId.toUpperCase().startsWith('CH-');
    if (isCh) {
      return `https://servicedeskplus.smretailinc.com/app/itdesk/ChangeDetails.cc?CHANGEID=${urlTicketId}&selectTab=worklogs&subTab=details`;
    } else {
      return `https://servicedeskplus.smretailinc.com/app/itdesk/ui/requests/${urlTicketId}/details?selectTab=workLogDetails`;
    }
  }, [ticketId, urlTicketId]);

  const catDisplayName = useMemo(() => {
    if (!category) return 'Select Project';
    const found = categories.find(
      (c) =>
        c.key === category ||
        c.key.toLowerCase() === category?.toLowerCase() ||
        c.name.toLowerCase() === category?.toLowerCase()
    );
    return found?.name || category;
  }, [category, categories]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card relative w-full max-w-xl shadow-2xl z-10 rounded-2xl border overflow-hidden transition-[background,border-color,box-shadow] duration-300"
            style={{
              background: category
                ? `linear-gradient(180deg, color-mix(in srgb, ${catColor} 18%, var(--bg-card)) 0%, color-mix(in srgb, ${catColor} 10%, var(--bg-card)) 100%)`
                : undefined,
              borderColor: category
                ? `color-mix(in srgb, ${catColor} 38%, var(--border-card))`
                : undefined,
              boxShadow: category
                ? `0 24px 50px -12px color-mix(in srgb, ${catColor} 28%, rgba(0,0,0,0.3)), 0 4px 16px rgba(0,0,0,0.1)`
                : undefined,
            }}
          >
            {/* Color accent top bar */}
            <div
              className="h-1.5 w-full transition-colors duration-300"
              style={{ backgroundColor: category ? catColor : 'transparent' }}
            />

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-3.5 transition-colors duration-300 border-b border-surface-600/30"
              style={{
                backgroundColor: category ? `color-mix(in srgb, ${catColor} 8%, transparent)` : undefined,
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm shrink-0"
                  style={{ backgroundColor: `${catColor}22` }}
                >
                  <FileText size={15} style={{ color: catColor }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
                    {mode === 'create' ? 'Add Worklog' : 'Edit Worklog'}
                  </h2>
                  <p
                    className="text-[11px] font-medium transition-colors duration-300 mt-0.5 truncate"
                    style={{ color: category ? catColor : undefined }}
                    title={category ? `Project: ${catDisplayName}` : undefined}
                  >
                    Project: <span className={category ? 'font-semibold' : 'text-text-muted italic'}>{category ? catDisplayName : '— Select Project —'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-muted hover:text-text-primary shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit}>
              <div className="px-5 py-4 space-y-0">

                {/* Category (Project Name) */}
                <div className="flex items-center border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0 flex items-center gap-1.5">
                    <FolderOpen size={12} />
                    Project / Category <span style={{ color: catColor }}>*</span>
                  </label>
                  <div className="flex-1 min-w-0 relative">
                    <ProjectSelector
                      value={category}
                      categories={categories}
                      onChange={handleCategoryChange}
                      accentColor={catColor}
                    />
                    {projectError && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-1">
                        Please select a project before saving.
                      </p>
                    )}
                  </div>
                </div>

                {/* Worklog Type */}
                <div className="flex items-center border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0 flex items-center gap-1.5">
                    <Wrench size={12} />
                    Worklog Type
                  </label>
                  <div className="flex-1 min-w-0 relative">
                    <select
                      value={worklogType}
                      onChange={(e) => setWorklogType(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-xl bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-500 text-sm font-medium text-text-primary focus:outline-none focus:ring-1 transition-all cursor-pointer appearance-none shadow-xs"
                      style={{
                        borderColor: `${catColor}50`,
                      }}
                    >
                      {worklogTypes.map((wt) => (
                        <option key={wt} value={wt}>
                          {wt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                  </div>
                </div>

                {/* Ticket ID & URL Ticket ID */}
                <div className="flex items-center border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0 flex items-center gap-1.5">
                    <Tag size={12} />
                    Ticket IDs
                  </label>
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ticketId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTicketId(val);
                        if (!val.trim().toUpperCase().startsWith('CH-')) {
                          setTaskId('');
                          setTaskTitle('');
                        }
                      }}
                      placeholder="Display # (CH-4233)"
                      className="px-3 py-2 rounded-xl bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-500 text-xs font-mono font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-all shadow-xs"
                      style={{ borderColor: `${catColor}50` }}
                      title="Display Ticket Reference Number"
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={urlTicketId}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim() !== urlTicketId.trim()) {
                            setTaskId('');
                            setTaskTitle('');
                          }
                          setUrlTicketId(val);
                        }}
                        placeholder="URL ID (108026...)"
                        className="w-full px-3 py-2 pr-8 rounded-xl bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-500 text-xs font-mono font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-all shadow-xs"
                        style={{ borderColor: `${catColor}50` }}
                        title="Internal Manage Engine Ticket ID in URL"
                      />
                      {sdpUrl && (
                        <a
                          href={sdpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-accent-500 hover:text-accent-400 transition-colors flex items-center justify-center p-0.5"
                          title="Open Ticket in Manage Engine"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Change Task Selector (only shown for CH- tickets) */}
                {isChTicket && (
                  <div className="flex items-center border-b border-surface-700/50 py-3">
                    <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0 flex items-center gap-1.5">
                      <ListTodo size={12} />
                      Change Task
                    </label>
                    <div className="flex-1 min-w-0 flex items-center gap-1.5">
                      <div className="flex-1 min-w-0">
                        <ChangeTaskSelector
                          urlTicketId={urlTicketId}
                          sdpConfig={sdpConfig}
                          taskId={taskId}
                          taskTitle={taskTitle}
                          onChange={(newTaskId, newTaskTitle) => {
                            setTaskId(newTaskId);
                            setTaskTitle(newTaskTitle);
                          }}
                          accentColor={catColor}
                          autoFetch={true}
                        />
                      </div>
                      {taskId.trim() && (
                        <a
                          href={`https://servicedeskplus.smretailinc.com/app/itdesk/ui/tasks/${taskId.trim()}/details?selectTab=worklog`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-surface-800 dark:bg-surface-700/70 border border-surface-400/80 dark:border-surface-500 text-accent-500 hover:text-accent-400 hover:border-accent-500/60 transition-all shrink-0 shadow-xs"
                          style={{ borderColor: `${catColor}50` }}
                          title="Open Task Worklogs in Manage Engine"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Executed Time */}
                <div className="flex items-center border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0">
                    Executed Time
                  </label>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* Start */}
                    <div className="flex items-center gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={() => bumpTime('start', -15)}
                        className="p-1 rounded hover:bg-surface-600 transition-colors cursor-pointer"
                      >
                        <Minus size={11} className="text-text-muted" />
                      </button>
                      <div
                        className="flex-1 text-center py-1.5 rounded text-xs font-semibold text-text-primary border transition-colors duration-300"
                        style={{
                          backgroundColor: `${catColor}08`,
                          borderColor: `${catColor}30`,
                        }}
                      >
                        {formatMinutesToTime(startTime, true)}
                      </div>
                      <button
                        type="button"
                        onClick={() => bumpTime('start', 15)}
                        className="p-1 rounded hover:bg-surface-600 transition-colors cursor-pointer"
                      >
                        <Plus size={11} className="text-text-muted" />
                      </button>
                    </div>

                    <span className="text-text-muted text-xs font-bold">–</span>

                    {/* End */}
                    <div className="flex items-center gap-0.5 flex-1">
                      <button
                        type="button"
                        onClick={() => bumpTime('end', -15)}
                        className="p-1 rounded hover:bg-surface-600 transition-colors cursor-pointer"
                      >
                        <Minus size={11} className="text-text-muted" />
                      </button>
                      <div
                        className="flex-1 text-center py-1.5 rounded text-xs font-semibold text-text-primary border transition-colors duration-300"
                        style={{
                          backgroundColor: `${catColor}08`,
                          borderColor: `${catColor}30`,
                        }}
                      >
                        {formatMinutesToTime(endTime, true)}
                      </div>
                      <button
                        type="button"
                        onClick={() => bumpTime('end', 15)}
                        className="p-1 rounded hover:bg-surface-600 transition-colors cursor-pointer"
                      >
                        <Plus size={11} className="text-text-muted" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0">
                    Duration
                  </label>
                  <div className="flex items-center gap-2">
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-colors duration-300"
                      style={{
                        backgroundColor: `${catColor}12`,
                        borderColor: `${catColor}30`,
                        color: catColor,
                      }}
                    >
                      <Clock size={11} />
                      {durationHrs > 0 && <span>{durationHrs}h</span>}
                      {durationMins > 0 && <span>{durationMins}m</span>}
                      {durationHrs === 0 && durationMins === 0 && <span>0m</span>}
                    </div>
                    <span className="text-[10px] text-text-muted">{date}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-start border-b border-surface-700/50 py-3">
                  <label className="text-xs font-semibold text-text-secondary w-[140px] shrink-0 pt-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did you work on?"
                    rows={3}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-800 dark:bg-surface-700 border border-surface-400/80 dark:border-surface-500 text-sm font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-all resize-none shadow-xs"
                    style={{ borderColor: `${catColor}50` }}
                  />
                </div>
              </div>

              {/* Footer / Actions */}
              <div
                className="flex items-center justify-between px-6 py-3.5 transition-colors duration-300 border-t border-surface-600/30"
                style={{
                  backgroundColor: category ? `color-mix(in srgb, ${catColor} 5%, transparent)` : undefined,
                }}
              >
                <div className="flex items-center gap-2">
                  {mode === 'edit' && onDelete && (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-rose-500 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer"
                    >
                      Delete Worklog
                    </button>
                  )}
                  
                  {mode === 'edit' && editWorklog && onPostToSdp && urlTicketId && (
                    editWorklog.sdpPosted ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/25 rounded-xl">
                        <CheckCircle2 size={13} />
                        Posted to Manage Engine
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const finalCategory = category.trim() || editWorklog.category || '';
                          const effectiveTaskId = isChTicket ? taskId.trim() : '';
                          const effectiveTaskTitle = isChTicket && effectiveTaskId ? taskTitle.trim() : '';
                          setIsPosting(true);
                          try {
                            await onPostToSdp({
                              date,
                              startTime,
                              endTime,
                              title: finalCategory || editWorklog.title,
                              description: description.trim(),
                              ticketId: ticketId.trim(),
                              urlTicketId: urlTicketId.trim(),
                              taskId: effectiveTaskId,
                              taskTitle: effectiveTaskTitle,
                              category: finalCategory,
                              worklogType,
                            });
                          } finally {
                            setIsPosting(false);
                          }
                        }}
                        disabled={isPosting}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-teal-600 hover:bg-teal-500 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                        {isPosting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                        {isPosting ? 'Posting...' : 'Post to Manage Engine'}
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-semibold rounded-xl text-text-primary dark:text-text-secondary hover:text-text-primary hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer border border-surface-400/70 dark:border-surface-600/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 text-xs font-semibold rounded-xl text-white transition-all cursor-pointer active:scale-95 shadow-md"
                    style={{
                      backgroundColor: catColor,
                      boxShadow: `0 2px 10px ${catColor}40`,
                    }}
                  >
                    {mode === 'create' ? 'Add Worklog' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
