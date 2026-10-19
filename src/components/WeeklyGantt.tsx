import { useState, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2 } from 'lucide-react';
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
import { getWeekDays, formatDateKey, getDayShortName, getDayNumber, isDateToday } from '../utils/dateUtils';
import WorklogBlock from './WorklogBlock';
import { useInertiaScroll } from '../hooks/useInertiaScroll';

interface WeeklyGanttProps {
  weekStart: Date;
  worklogs: Worklog[];
  zoom: number;
  use24h: boolean;
  categories: { key: string; name: string; color: string }[];
  theme?: 'light' | 'dark';
  onCreateWorklog: (date: string, startTime: number, endTime: number) => void;
  onEditWorklog: (log: Worklog) => void;
  onResizeWorklog: (id: number, newStart: number, newEnd: number) => void;
  onDayClick: (date: Date) => void;
  onWorklogContextMenu: (e: React.MouseEvent, log: Worklog) => void;
  onCanvasContextMenu: (e: React.MouseEvent, date: string, time: number) => void;
  onBatchPost?: (dateKey: string) => Promise<void>;
}

export default function WeeklyGantt({
  weekStart,
  worklogs,
  zoom,
  use24h,
  categories,
  theme,
  onCreateWorklog,
  onEditWorklog,
  onResizeWorklog,
  onDayClick,
  onWorklogContextMenu,
  onCanvasContextMenu,
  onBatchPost,
}: WeeklyGanttProps) {
  const [postingDays, setPostingDays] = useState<Record<string, boolean>>({});
  const hourMarkers = getHourMarkers(START_HOUR, END_HOUR, use24h);
  const weekDays = getWeekDays(weekStart);

  const { containerRef, bindDrag, isPanning } = useInertiaScroll<HTMLDivElement>({
    direction: 'x',
    friction: 0.95,
    smoothWheel: true,
  });

  // Group worklogs by date
  const logsByDate = useMemo(() => {
    const map = new Map<string, Worklog[]>();
    for (const log of worklogs) {
      const existing = map.get(log.date) ?? [];
      existing.push(log);
      map.set(log.date, existing);
    }
    return map;
  }, [worklogs]);

  // Conflicts per day
  const conflictsByDate = useMemo(() => {
    const map = new Map<string, Map<number, number[]>>();
    for (const [date, logs] of logsByDate) {
      map.set(date, findAllConflicts(logs));
    }
    return map;
  }, [logsByDate]);

  return (
    <div className="glass-card w-full overflow-hidden flex flex-col">
      <div ref={containerRef} className="overflow-x-auto inertia-scroll-x">
        <div style={{ minWidth: `${zoom * 100}%` }} className="flex flex-col">
          {/* Hour Header (Apple Translucent Frosted Bar with Inertia Pan) */}
          <div
            className="flex border-b border-surface-600/50 bg-surface-800/85 backdrop-blur-md cursor-grab active:cursor-grabbing select-none"
            {...bindDrag}
            title="Drag horizontally to pan timeline with inertia"
          >
            <div className="w-[140px] shrink-0 px-4 py-2 border-r border-surface-600/50 sticky left-0 z-30 bg-surface-800/90 backdrop-blur-md">
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Day
              </span>
            </div>
            <div className="flex-1 relative h-8">
              {hourMarkers.map((marker) => (
                <div
                  key={marker.hour}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${marker.percent}%` }}
                >
                  <span className="text-[10px] text-text-muted font-medium -translate-x-1/2">
                    {marker.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day Rows */}
          {weekDays.map((day, index) => {
            const dateKey = formatDateKey(day);
            const dayLogs = logsByDate.get(dateKey) ?? [];
            const dayConflicts = conflictsByDate.get(dateKey) ?? new Map();
            const totalMinutes = dayLogs.reduce(
              (sum, log) => sum + calculateDuration(log.startTime, log.endTime),
              0
            );
            const today = isDateToday(dateKey);
            const allPosted = dayLogs.length > 0 && dayLogs.every(l => l.sdpPosted);

            return (
              <GanttRow
                key={dateKey}
                day={day}
                dateKey={dateKey}
                dayLogs={dayLogs}
                dayConflicts={dayConflicts}
                totalMinutes={totalMinutes}
                isToday={today}
                isEven={index % 2 === 0}
                hourMarkers={hourMarkers}
                use24h={use24h}
                categories={categories}
                onCreateWorklog={onCreateWorklog}
                onEditWorklog={onEditWorklog}
                onResizeWorklog={onResizeWorklog}
                onDayClick={onDayClick}
                onWorklogContextMenu={onWorklogContextMenu}
                onCanvasContextMenu={onCanvasContextMenu}
                onBatchPost={onBatchPost}
                postingDays={postingDays}
                setPostingDays={setPostingDays}
                allPosted={allPosted}
                theme={theme}
                isPanning={isPanning}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== Individual Day Row =====

interface GanttRowProps {
  day: Date;
  dateKey: string;
  dayLogs: Worklog[];
  dayConflicts: Map<number, number[]>;
  totalMinutes: number;
  isToday: boolean;
  isEven: boolean;
  hourMarkers: { hour: number; label: string; percent: number }[];
  use24h: boolean;
  categories: { key: string; name: string; color: string }[];
  theme?: string;
  isPanning?: boolean;
  onCreateWorklog: (date: string, startTime: number, endTime: number) => void;
  onEditWorklog: (log: Worklog) => void;
  onResizeWorklog: (id: number, newStart: number, newEnd: number) => void;
  onDayClick: (date: Date) => void;
  onWorklogContextMenu: (e: React.MouseEvent, log: Worklog) => void;
  onCanvasContextMenu: (e: React.MouseEvent, date: string, time: number) => void;
  onBatchPost?: (date: string) => Promise<void>;
  postingDays: Record<string, boolean>;
  setPostingDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  allPosted: boolean;
}

function GanttRow({
  day,
  dateKey,
  dayLogs,
  dayConflicts,
  totalMinutes,
  isToday,
  isEven,
  hourMarkers,
  use24h,
  categories,
  onCreateWorklog,
  onEditWorklog,
  onResizeWorklog,
  onWorklogContextMenu,
  onCanvasContextMenu,
  onBatchPost,
  postingDays,
  setPostingDays,
  allPosted,
  theme,
  isPanning,
}: GanttRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    active: boolean;
    startMin: number;
    endMin: number;
  }>({ active: false, startMin: 0, endMin: 0 });
  const [hoverMinutes, setHoverMinutes] = useState<number | null>(null);

  const moveRafRef = useRef<number | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    return () => {
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
      }
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      cachedRectRef.current = rect;
      const minutes = pointerPosToMinutes(e.clientX, rect);

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragState({ active: true, startMin: minutes, endMin: minutes });
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const clientX = e.clientX;
      if (moveRafRef.current !== null) {
        cancelAnimationFrame(moveRafRef.current);
      }
      moveRafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = cachedRectRef.current || containerRef.current.getBoundingClientRect();
        const minutes = pointerPosToMinutes(clientX, rect);

        if (dragState.active) {
          setDragState((prev) => ({ ...prev, endMin: minutes }));
        }
        setHoverMinutes(minutes);
      });
    },
    [dragState.active]
  );

  const handlePointerUp = useCallback(() => {
    if (moveRafRef.current !== null) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = null;
    }
    cachedRectRef.current = null;
    if (!dragState.active) return;
    const start = Math.min(dragState.startMin, dragState.endMin);
    const end = Math.max(dragState.startMin, dragState.endMin);
    setDragState({ active: false, startMin: 0, endMin: 0 });

    if (end - start >= 15) {
      onCreateWorklog(dateKey, start, end);
    }
  }, [dragState, dateKey, onCreateWorklog]);

  // Drag preview calculations
  const dragLeft = minutesToPercent(
    Math.min(dragState.startMin, dragState.endMin)
  );
  const dragRight = minutesToPercent(
    Math.max(dragState.startMin, dragState.endMin)
  );
  const dragWidth = dragRight - dragLeft;

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTime =
    isToday && currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;
  const currentTimePercent = minutesToPercent(currentMinutes);

  return (
    <div
      className={`flex border-b border-surface-600/30 last:border-b-0 transition-colors ${
        isEven ? 'gantt-row-even' : 'gantt-row-odd'
      } ${isToday ? 'ring-1 ring-inset ring-accent-500/30 bg-accent-500/[0.02]' : ''}`}
    >
      {/* Day Label */}
      <div
        className="w-[140px] shrink-0 px-4 py-3 border-r border-surface-600/50 flex flex-col justify-center cursor-pointer hover:bg-surface-700/50 transition-colors sticky left-0 z-30 bg-surface-800/90 backdrop-blur-md"
        onClick={() => onDayClick(day)}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold tracking-tight ${
              isToday ? 'text-accent-400' : 'text-text-primary'
            }`}
          >
            {getDayShortName(day)}
          </span>
          <span
            className={`text-xs w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isToday
                ? 'bg-accent-500 text-white font-bold shadow-sm'
                : 'text-text-muted bg-surface-700/50'
            }`}
          >
            {getDayNumber(day)}
          </span>
          {onBatchPost && dayLogs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (postingDays[dateKey]) return;
                setPostingDays(prev => ({ ...prev, [dateKey]: true }));
                onBatchPost(dateKey).finally(() => {
                  setPostingDays(prev => ({ ...prev, [dateKey]: false }));
                });
              }}
              disabled={allPosted || postingDays[dateKey]}
              className={`ml-auto shrink-0 p-1 rounded-full transition-all active:scale-95 ${
                allPosted
                  ? 'text-surface-500 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-600/50'
              }`}
              title={allPosted ? "All logs posted" : "Batch Post All"}
            >
              {postingDays[dateKey] ? (
                <div className="w-3.5 h-3.5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={14} className={allPosted ? 'opacity-50' : 'text-emerald-500'} />
              )}
            </button>
          )}
        </div>
        {totalMinutes > 0 && (
          <span className="text-[10px] text-text-muted mt-0.5 font-medium">
            {formatDuration(totalMinutes)}
          </span>
        )}
      </div>

      {/* Timeline Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 relative h-[52px] cursor-crosshair ${isPanning ? 'pointer-events-none select-none' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          cachedRectRef.current = null;
          setHoverMinutes(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const minutes = pointerPosToMinutes(e.clientX, rect);
            onCanvasContextMenu(e, dateKey, minutes);
          }
        }}
      >
        {/* Hour grid lines */}
        {hourMarkers.map((marker) => (
          <div
            key={marker.hour}
            className="absolute top-0 bottom-0 w-px bg-surface-600/30 pointer-events-none"
            style={{ left: `${marker.percent}%` }}
          />
        ))}

        {/* Current time indicator (Apple Precision Laser) */}
        {showCurrentTime && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 current-time-line z-20 pointer-events-none"
            style={{ left: `${currentTimePercent}%` }}
          >
            <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
          </div>
        )}

        {/* Hover Time Indicator */}
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
                  hasConflict={dayConflicts.has(log.id!)}
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
  );
}
