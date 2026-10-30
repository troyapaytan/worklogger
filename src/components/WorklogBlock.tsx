import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, CheckCircle2, Clock, AlertTriangle, Tag, FileText, ListTodo } from 'lucide-react';
import type { Worklog } from '../db';
import {
  minutesToPercent,
  formatMinutesToTime,
  formatDuration,
  calculateDuration,
  pointerPosToMinutes,
  clampMinutes,
} from '../utils/ganttMath';

interface WorklogBlockProps {
  log: Worklog;
  hasConflict: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onClick: (log: Worklog) => void;
  onResize: (id: number, newStart: number, newEnd: number) => void;
  onContextMenu?: (e: React.MouseEvent, log: Worklog) => void;
  use24h?: boolean;
  color?: string;
  theme?: 'light' | 'dark';
}

const categoryClass: Record<string, string> = {
  Dev: 'block-dev',
  Meeting: 'block-meeting',
  Support: 'block-support',
  Research: 'block-research',
  Other: 'block-other',
};

function parseColorToHsl(color: string): { h: number; s: number; l: number } {
  let r = 59, g = 130, b = 246; // fallback #3b82f6

  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      r = parseFloat(match[0]);
      g = parseFloat(match[1]);
      b = parseFloat(match[2]);
    }
  } else if (color.startsWith('hsl')) {
    const match = color.match(/\d+(\.\d+)?/g);
    if (match && match.length >= 3) {
      return {
        h: parseFloat(match[0]),
        s: parseFloat(match[1]),
        l: parseFloat(match[2]),
      };
    }
  }

  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        h = ((b - r) / d + 2) * 60;
        break;
      case b:
        h = ((r - g) / d + 4) * 60;
        break;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function getWorklogCardColors(color?: string, category?: string) {
  const fallbackCategoryColors: Record<string, string> = {
    Dev: '#3b82f6',
    Meeting: '#f59e0b',
    Support: '#10b981',
    Research: '#8b5cf6',
    Other: '#0ea5e9',
  };

  const rawColor = color || fallbackCategoryColors[category ?? 'Other'] || '#3b82f6';
  const { h, s, l } = parseColorToHsl(rawColor);

  // 20% reduced saturation
  const reducedS = Math.max(0, Math.round(s * 0.8));

  // Balanced lightness for high readability and vivid color identity
  const cardLightness = Math.max(16, Math.min(l, 32));
  const cardBg = `hsl(${h}, ${reducedS}%, ${cardLightness}%)`;
  const cardBorder = `hsl(${h}, ${reducedS}%, ${Math.min(cardLightness + 18, 58)}%)`;
  const innerBg = `hsl(${h}, ${reducedS}%, ${Math.max(cardLightness - 6, 9)}%, 0.75)`;

  return { cardBg, cardBorder, innerBg, rawColor };
}

export default function WorklogBlock({
  log,
  hasConflict,
  containerRef,
  onClick,
  onResize,
  onContextMenu,
  use24h = false,
  color,
  theme: _theme,
}: WorklogBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringBlock, setIsHoveringBlock] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupCoords, setPopupCoords] = useState<{ x: number; y: number; placeAbove: boolean }>({
    x: 0,
    y: 0,
    placeAbove: true,
  });

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragRef = useRef<{
    side: 'left' | 'right';
    originalStart: number;
    originalEnd: number;
  } | null>(null);
  const [previewStart, setPreviewStart] = useState(log.startTime);
  const [previewEnd, setPreviewEnd] = useState(log.endTime);

  const left = minutesToPercent(isDragging ? previewStart : log.startTime);
  const right = minutesToPercent(isDragging ? previewEnd : log.endTime);
  const width = right - left;

  const duration = calculateDuration(log.startTime, log.endTime);
  const cls = categoryClass[log.category ?? 'Other'] ?? 'block-other';
  const { cardBg, cardBorder, innerBg, rawColor } = getWorklogCardColors(color, log.category);

  const calculatePopupPosition = (clientX: number, clientY: number) => {
    const tooltipWidth = 320;
    const tooltipEstimatedHeight = 220;

    let x = clientX + 16;
    let placeAbove = true;
    let y = clientY - 12;

    // Check right edge collision
    if (x + tooltipWidth > window.innerWidth - 16) {
      if (clientX - tooltipWidth - 16 >= 16) {
        x = clientX - tooltipWidth - 16;
      } else {
        x = Math.max(16, window.innerWidth - tooltipWidth - 16);
      }
    }

    // Check top edge collision
    if (clientY - tooltipEstimatedHeight < 16) {
      placeAbove = false;
      y = clientY + 16;
    }

    return { x, y, placeAbove };
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;
    setIsHoveringBlock(true);
    mousePosRef.current = { x: e.clientX, y: e.clientY };

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    // 500ms delay before popping up hover details
    hoverTimerRef.current = setTimeout(() => {
      const pos = calculatePopupPosition(mousePosRef.current.x, mousePosRef.current.y);
      setPopupCoords(pos);
      setIsPopupVisible(true);
    }, 500);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
    if (isPopupVisible) {
      const pos = calculatePopupPosition(e.clientX, e.clientY);
      setPopupCoords(pos);
    }
  };

  const handleMouseLeave = () => {
    setIsHoveringBlock(false);
    setIsPopupVisible(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isHoveringBlock && !isPopupVisible) return;
    const handleScrollOrResize = () => {
      setIsHoveringBlock(false);
      setIsPopupVisible(false);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isHoveringBlock, isPopupVisible]);

  const resizeRafRef = useRef<number | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    return () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, side: 'left' | 'right') => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        side,
        originalStart: log.startTime,
        originalEnd: log.endTime,
      };
      if (containerRef.current) {
        cachedRectRef.current = containerRef.current.getBoundingClientRect();
      }
      setPreviewStart(log.startTime);
      setPreviewEnd(log.endTime);
      setIsDragging(true);
      setIsHoveringBlock(false);
      setIsPopupVisible(false);
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    },
    [log.startTime, log.endTime, containerRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const clientX = e.clientX;
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      resizeRafRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;
        const rect = cachedRectRef.current || containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const minutes = pointerPosToMinutes(clientX, rect);
        const clamped = clampMinutes(minutes);

        if (dragRef.current.side === 'left') {
          const newStart = Math.min(clamped, dragRef.current.originalEnd - 15);
          setPreviewStart(newStart);
        } else {
          const newEnd = Math.max(clamped, dragRef.current.originalStart + 15);
          setPreviewEnd(newEnd);
        }
      });
    },
    [containerRef]
  );

  const handlePointerUp = useCallback(() => {
    if (resizeRafRef.current !== null) {
      cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    cachedRectRef.current = null;
    if (!dragRef.current) return;
    setIsDragging(false);
    onResize(log.id!, previewStart, previewEnd);
    dragRef.current = null;
  }, [log.id, previewStart, previewEnd, onResize]);

  return (
    <>
      <div
        id={`worklog-${log.id}`}
        data-duration={duration}
        data-start-time={log.startTime}
        className={`absolute top-1 bottom-1 rounded-lg cursor-pointer select-none group flex items-center pointer-events-auto transition-[box-shadow,border-color] duration-150 ${cls} ${
          hasConflict ? 'conflict-stripe' : ''
        } ${
          isDragging
            ? 'z-40 shadow-lg ring-2 ring-accent-400/50'
            : isHoveringBlock
              ? 'z-30 ring-2 ring-white/90 shadow-xl'
              : 'z-10 hover:z-20 hover:shadow-md'
        }`}
        style={{
          left: `${left}%`,
          width: `${width}%`,
          backgroundColor: color,
          '--block-raw-color': rawColor,
          '--block-card-bg': cardBg,
          '--block-card-border': cardBorder,
          willChange: isDragging ? 'left, width' : undefined,
        } as React.CSSProperties}
        onClick={() => !isDragging && onClick(log)}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          setIsPopupVisible(false);
          if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
          }
          if (onContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e, log);
          }
        }}
      >
        {/* Subtle hover glow layer */}
        <div
          className={`absolute -inset-0.5 rounded-lg opacity-0 pointer-events-none transition-opacity duration-150 -z-10 ${
            isHoveringBlock ? 'opacity-100' : ''
          }`}
          style={{
            boxShadow: `0 0 10px 2px ${rawColor || '#3b82f6'}`,
          }}
        />

        {/* Visual Block Container */}
        <div className="absolute inset-0 rounded-lg overflow-hidden flex items-center">
          {/* Left resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => handlePointerDown(e, 'left')}
          >
            <GripVertical size={10} className="text-white/70" />
          </div>

          {/* Content */}
          <div className="px-2.5 py-0.5 flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-white truncate leading-tight flex items-center gap-1.5">
              <span className="shrink-0 flex items-center gap-1">
                {log.sdpPosted && (
                  <CheckCircle2 size={11} className="text-white drop-shadow-md" title="Posted to Manage Engine" />
                )}
                {log.category || log.title}
              </span>
              {log.description && (
                <span className="opacity-80 font-normal text-[10px] truncate">
                  · {log.description}
                </span>
              )}
            </div>
            {width > 6 && (
              <div className="text-[9px] text-white/75 truncate leading-tight font-medium">
                {formatMinutesToTime(log.startTime, use24h)} – {formatMinutesToTime(log.endTime, use24h)} · {formatDuration(duration)}
              </div>
            )}
          </div>

          {/* Right resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => handlePointerDown(e, 'right')}
          >
            <GripVertical size={10} className="text-white/70" />
          </div>
        </div>
      </div>

      {/* Hover Details Tooltip Card Portal - Renders directly in document.body above all elements */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isPopupVisible && !isDragging && (
              <div
                className="fixed z-[9999999] pointer-events-none w-72 sm:w-80"
                style={{
                  left: `${popupCoords.x}px`,
                  top: `${popupCoords.y}px`,
                  transform: popupCoords.placeAbove ? 'translateY(-100%)' : 'none',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: popupCoords.placeAbove ? 4 : -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: popupCoords.placeAbove ? 2 : -2 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                >
                <div
                  className="rounded-2xl p-3.5 shadow-xl text-left text-white text-xs flex flex-col gap-2.5 bg-surface-800"
                  style={{
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    borderWidth: '1.5px',
                    borderStyle: 'solid',
                  }}
                >
                  {/* Header row: Category / Title & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40 shadow-sm"
                          style={{ backgroundColor: rawColor }}
                        />
                        <span className="font-bold text-white text-xs truncate">
                          {log.category || 'General'}
                        </span>
                        {log.ticketId && (
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded text-white/90 shrink-0 border border-white/20"
                            style={{ backgroundColor: innerBg }}
                          >
                            #{log.ticketId}
                          </span>
                        )}
                      </div>
                      {log.title && (
                        <div className="text-xs font-semibold text-white mt-0.5 leading-snug">
                          {log.title}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {log.sdpPosted && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-400/40 px-1.5 py-0.5 rounded font-medium">
                          <CheckCircle2 size={11} />
                          Posted
                        </span>
                      )}
                      {hasConflict && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/60 border border-rose-400/40 px-1.5 py-0.5 rounded font-medium">
                          <AlertTriangle size={11} />
                          Conflict
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Details: Worklog Type & Time */}
                  <div
                    className="grid grid-cols-1 gap-1.5 py-2 text-[11px] px-2.5 rounded-lg border border-white/15"
                    style={{ backgroundColor: innerBg }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <Tag size={11} className="text-white/60" /> Type
                      </span>
                      <span className="font-semibold text-white">
                        {log.worklogType || log.category || 'General'}
                      </span>
                    </div>
                    {(log.taskTitle || log.taskId) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 shrink-0">
                          <ListTodo size={11} className="text-white/60" /> Task
                        </span>
                        <span
                          className="font-semibold text-white truncate text-right"
                          title={log.taskTitle || `Task #${log.taskId}`}
                        >
                          {log.taskTitle || `Task #${log.taskId}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white/70 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                        <Clock size={11} className="text-white/60" /> Time
                      </span>
                      <span className="font-semibold text-white">
                        {formatMinutesToTime(log.startTime, use24h)} – {formatMinutesToTime(log.endTime, use24h)} · {formatDuration(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Worklog Done (Description) */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
                      <FileText size={11} className="text-white/60" /> Worklog Done
                    </span>
                    <div
                      className="text-[11px] text-white/95 rounded-lg p-2.5 border border-white/15 whitespace-pre-wrap break-words max-h-28 overflow-y-auto leading-relaxed"
                      style={{ backgroundColor: innerBg }}
                    >
                      {log.description ? (
                        log.description
                      ) : (
                        <span className="italic text-white/50">No description entered</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
          document.body
        )}
    </>
  );
}
