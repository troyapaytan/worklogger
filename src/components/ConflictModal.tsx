import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Clock } from 'lucide-react';
import type { ConflictInfo } from '../utils/conflicts';
import { formatMinutesToTime, formatDuration } from '../utils/ganttMath';

interface ConflictModalProps {
  isOpen: boolean;
  conflicts: ConflictInfo[];
  candidateTitle: string;
  candidateStart: number;
  candidateEnd: number;
  onProceed: () => void;
  onTrim: () => void;
  onCancel: () => void;
}

export default function ConflictModal({
  isOpen,
  conflicts,
  candidateTitle,
  candidateStart,
  candidateEnd,
  onProceed,
  onTrim,
  onCancel,
}: ConflictModalProps) {
  const totalOverlap = conflicts.reduce((sum, c) => sum + c.overlapMinutes, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            className="glass-card relative w-full max-w-md p-6 shadow-2xl z-10 rounded-2xl border border-surface-600/50"
          >
            {/* Close */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>

            {/* Warning icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shadow-sm">
                <AlertTriangle size={20} className="text-rose-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  Time Conflict Detected
                </h2>
                <p className="text-xs text-text-muted">
                  {conflicts.length} overlapping{' '}
                  {conflicts.length === 1 ? 'entry' : 'entries'} ·{' '}
                  {formatDuration(totalOverlap)} overlap
                </p>
              </div>
            </div>

            {/* Candidate info */}
            <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-accent-500/10 border border-accent-500/20">
              <div className="text-xs font-semibold text-accent-400">
                New Entry: {candidateTitle || 'Untitled'}
              </div>
              <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                <Clock size={11} />
                {formatMinutesToTime(candidateStart, true)} –{' '}
                {formatMinutesToTime(candidateEnd, true)}
              </div>
            </div>

            {/* Conflicting entries */}
            <div className="space-y-2 mb-5 max-h-[200px] overflow-y-auto">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.log.id}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/8 border border-rose-500/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary">
                      {conflict.log.title || 'Untitled'}
                    </span>
                    <span className="text-[10px] text-rose-400 font-medium">
                      {formatDuration(conflict.overlapMinutes)} overlap
                    </span>
                  </div>
                  <div className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                    <Clock size={10} />
                    {formatMinutesToTime(conflict.log.startTime, true)} –{' '}
                    {formatMinutesToTime(conflict.log.endTime, true)}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer border border-surface-600/40"
              >
                Cancel
              </button>
              <button
                onClick={onTrim}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 active:scale-95 border border-amber-500/30 transition-all cursor-pointer"
              >
                Trim to Gap
              </button>
              <button
                onClick={onProceed}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-accent-500 text-white hover:bg-accent-600 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Keep Overlap
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
