import { useState, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit3, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { Worklog } from '../db';
import {
  getHourMarkers,
  minutesToPercent,
  pointerPosToMinutes,
  formatMinutesToTime,
  formatDuration,
  calculateDuration,
  START_HOUR,
  END_HOUR,
} from '../utils/ganttMath';
import { findAllConflicts } from '../utils/conflicts';
import { formatDateFull, formatDateKey, getDayShortName } from '../utils/dateUtils';
import { addDays, subDays } from 'date-fns';
import WorklogBlock from './WorklogBlock';
import { useInertiaScroll } from '../hooks/useInertiaScroll';

interface DailyGanttProps {
  selectedDate: Date;
  worklogs: Worklog[];
  categories: { key: string; name: string; color?: string }[];
  zoom: number;
  use24h: boolean;
  theme?: 'light' | 'dark';
  onCreateWorklog: (date: string, startTime: number, endTime: number) => void;
  onEditWorklog: (log: Worklog) => void;
  onResizeWorklog: (id: number, newStart: number, newEnd: number) => void;
  onDeleteWorklog: (id: number) => void;
  onDateChange: (date: Date) => void;
  onBackToWeek: () => void;
  onWorklogContextMenu: (e: React.MouseEvent, log: Worklog) => void;
  onCanvasContextMenu: (e: React.MouseEvent, date: string, time: number) => void;
}

export default function DailyGantt({
  selectedDate,
  worklogs,
  categories,
  zoom,
  use24h,
  theme,
  onCreateWorklog,
  onEditWorklog,
  onResizeWorklog,
  onDeleteWorklog,
  onDateChange,
  onBackToWeek,
  onWorklogContextMenu,
  onCanvasContextMenu,
}: DailyGanttProps) {
  const hourMarkers = getHourMarkers(START_HOUR, END_HOUR, use24h);
  const dateKey = formatDateKey(selectedDate);
  const containerRef = useRef<HTMLDivElement>(null);

  const { containerRef: scrollContainerRef, bindDrag } = useInertiaScroll<HTMLDivElement>({
    direction: 'x',
    friction: 0.95,
    smoothWheel: true,
  });

  const dayLogs = useMemo(
    () =>
      worklogs
        .filter((l) => l.date === dateKey)
        .sort((a, b) => a.startTime - b.startTime),
    [worklogs, dateKey]
  );

  const conflicts = useMemo(() => findAllConflicts(dayLogs), [dayLogs]);

  const totalMinutes = useMemo(
    () =>
      dayLogs.reduce(
        (sum, l) => sum + calculateDuration(l.startTime, l.endTime),
        0
      ),
    [dayLogs]
  );

  // Drag-to-create
  const [dragState, setDragState] = useState<{
    active: boolean;
    startMin: number;
    endMin: number;
  }>({ active: false, startMin: 0, endMin: 0 });
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const minutes = pointerPosToMinutes(e.clientX, rect);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({ active: true, startMin: minutes, endMin: minutes });
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const minutes = pointerPosToMinutes(e.clientX, rect);

      if (dragState.active) {
        setDragState((prev) => ({ ...prev, endMin: minutes }));
      }
      setHoverMinutes(minutes);
    },
    [dragState.active]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragState.active) return;
    const start = Math.min(dragState.startMin, dragState.endMin);
    const end = Math.max(dragState.startMin, dragState.endMin);
    setDragState({ active: false, startMin: 0, endMin: 0 });
    if (end - start >= 15) {
      onCreateWorklog(dateKey, start, end);
    }
  }, [dragState, dateKey, onCreateWorklog]);

  const dragLeft = minutesToPercent(Math.min(dragState.startMin, dragState.endMin));
  const dragRight = minutesToPercent(Math.max(dragState.startMin, dragState.endMin));
  const dragWidth = dragRight - dragLeft;

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isToday = dateKey === formatDateKey(new Date());
  const showCurrentTime =
    isToday && currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;
  const currentTimePercent = minutesToPercent(currentMinutes);

  return (
    <div className="glass-card w-full overflow-hidden">
      {/* Day Header (Apple Translucent Toolbar) */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-600/40 bg-surface-800/85 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWeek}
            className="text-xs text-accent-400 hover:text-accent-300 transition-colors cursor-pointer font-medium active:scale-95 flex items-center gap-1"
          >
            ← Week View
          </button>
          <div className="h-4 w-px bg-surface-600/40" />
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-secondary hover:text-text-primary"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-text-primary">
              {formatDateFull(selectedDate)}
            </h2>
          </div>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-secondary hover:text-text-primary"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted font-medium">
            {dayLogs.length} entries · {formatDuration(totalMinutes)}
          </span>
          <button
            onClick={() => {
              const midMorning = 9 * 60;
              onCreateWorklog(dateKey, midMorning, midMorning + 60);
            }}
            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-xl bg-accent-500/15 text-accent-400 hover:bg-accent-500/25 active:scale-95 border border-accent-500/30 transition-all cursor-pointer shadow-sm"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>

      {/* Timeline with hour markers */}
      <div ref={scrollContainerRef} className="overflow-x-auto inertia-scroll-x">
        <div style={{ minWidth: `${zoom * 100}%` }} className="px-5 pt-3">
          {/* Hour labels (with horizontal inertia pan drag) */}
          <div
            className="relative h-5 ml-0 cursor-grab active:cursor-grabbing select-none"
            {...bindDrag}
            title="Drag horizontally to pan timeline with inertia"
          >
          {hourMarkers.map((marker) => (
            <div
              key={marker.hour}
              className="absolute flex items-center"
              style={{ left: `${marker.percent}%` }}
            >
              <span className="text-[10px] text-text-muted font-medium -translate-x-1/2">
                {marker.label}
              </span>
            </div>
          ))}
        </div>

        {/* Gantt canvas */}
        <div
          ref={containerRef}
          className="relative h-[64px] cursor-crosshair mb-4"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setHoverMinutes(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const minutes = pointerPosToMinutes(e.clientX, rect);
              onCanvasContextMenu(e, dateKey, minutes);
            }
          }}
        >
          {/* Grid lines */}
          {hourMarkers.map((marker) => (
            <div
              key={marker.hour}
              className="absolute top-0 bottom-0 w-px bg-surface-600/30 pointer-events-none"
              style={{ left: `${marker.percent}%` }}
            />
          ))}

          {/* Current time line (Apple Precision Laser) */}
          {showCurrentTime && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 current-time-line z-20 pointer-events-none"
              style={{ left: `${currentTimePercent}%` }}
            >
              <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            </div>
          )}

          {/* Hover preview line */}
          {hoverMinutes !== null && !dragState.active && (
            <div
              className="absolute top-0 bottom-0 w-px bg-accent-400/50 border-dashed border-r border-accent-400/40 z-20 pointer-events-none"
              style={{ left: `${minutesToPercent(hoverMinutes)}%` }}
            >
              <div className="absolute -top-4 -translate-x-1/2 bg-accent-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap">
                {formatMinutesToTime(hoverMinutes, use24h)}
              </div>
            </div>
          )}

          {/* Drag preview */}
          {dragState.active && (
            <div
              className={`absolute top-1 bottom-1 drag-preview ${dragWidth === 0 ? 'hidden' : ''}`}
              style={{ left: `${dragLeft}%`, width: dragWidth > 0 ? `${dragWidth}%` : '1px' }}
            >
              {/* Start time label (upper-left) */}
              <div className="absolute -top-4 left-0 -translate-y-1/2 bg-accent-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap z-30 pointer-events-none">
                {formatMinutesToTime(Math.min(dragState.startMin, dragState.endMin), use24h)}
              </div>
              {/* End time label (upper-right) */}
              {dragWidth > 0 && (
                <div className="absolute -top-4 right-0 -translate-y-1/2 bg-accent-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow-md whitespace-nowrap z-30 pointer-events-none">
                  {formatMinutesToTime(Math.max(dragState.startMin, dragState.endMin), use24h)}
                </div>
              )}
            </div>
          )}

          {/* Worklog blocks */}
          <div className="worklog-block-area absolute inset-0">
            <AnimatePresence>
            {dayLogs.map((log) => {
              const categoryData = categories.find(
                (c) =>
                  c.key === log.category ||
                  c.key.toLowerCase() === log.category?.toLowerCase() ||
                  c.name.toLowerCase() === log.category?.toLowerCase()
              );
              return (
                <WorklogBlock
                  key={log.id}
                  log={log}
                  color={categoryData?.color}
                  theme={theme}
                  hasConflict={conflicts.has(log.id!)}
                  containerRef={containerRef}
                  onClick={onEditWorklog}
                  onResize={onResizeWorklog}
                  onContextMenu={onWorklogContextMenu}
                  use24h={use24h}
                />
              );
            })}
            </AnimatePresence>
          </div>
        </div>
      </div>
      </div>

      {/* Detailed log list */}
      <div className="border-t border-surface-600">
        <AnimatePresence>
          {dayLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-5 py-8 text-center"
            >
              <p className="text-sm text-text-muted">
                No worklogs for this day. Drag on the timeline above to create one.
              </p>
            </motion.div>
          ) : (
            dayLogs.map((log, i) => {
              const duration = calculateDuration(log.startTime, log.endTime);
              const hasConflict = conflicts.has(log.id!);
              const catObj = categories.find(
                (c) =>
                  c.key === log.category ||
                  c.key.toLowerCase() === log.category?.toLowerCase() ||
                  c.name.toLowerCase() === log.category?.toLowerCase()
              );
              const catColor = catObj?.color || '#0ea5e9';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-4 px-5 py-3 border-b border-surface-700/30 last:border-b-0 hover:bg-surface-700/30 transition-colors relative ${
                    hasConflict ? 'bg-rose-500/5' : ''
                  }`}
                  style={{
                    borderLeft: `4px solid ${catColor}`,
                  }}
                >
                  {/* Time column */}
                  <div className="w-[120px] shrink-0">
                    <div className="text-xs font-semibold text-text-primary">
                      {formatMinutesToTime(log.startTime, use24h)} – {formatMinutesToTime(log.endTime, use24h)}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {formatDuration(duration)}
                    </div>
                  </div>

                  {/* Info column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2.5 py-0.5 rounded font-bold shrink-0 border transition-all shadow-xs flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${catColor}20`,
                          color: catColor,
                          borderColor: `${catColor}40`,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor }}
                        />
                        {catObj?.name || log.category || log.title}
                      </span>

                      {log.worklogType && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface-700 border border-surface-500 text-text-secondary font-semibold shrink-0">
                          {log.worklogType}
                        </span>
                      )}

                      {log.ticketId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-400 font-mono font-medium shrink-0">
                          {log.ticketId}
                        </span>
                      )}

                      {log.sdpPosted && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 font-bold shrink-0 flex items-center gap-1 border border-teal-500/30">
                          <CheckCircle2 size={10} />
                          SDP
                        </span>
                      )}

                      {hasConflict && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-medium shrink-0">
                          Overlap
                        </span>
                      )}
                    </div>
                    {log.description && (
                      <p className="text-xs text-text-secondary mt-1 truncate">
                        {log.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditWorklog(log)}
                      className="p-1.5 rounded hover:bg-surface-600 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 size={13} className="text-text-muted" />
                    </button>
                    <button
                      onClick={() => onDeleteWorklog(log.id!)}
                      className="p-1.5 rounded hover:bg-rose-500/15 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={13} className="text-text-muted hover:text-rose-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
