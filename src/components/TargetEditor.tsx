import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target } from 'lucide-react';

interface TargetEditorProps {
  isOpen: boolean;
  dailyMinutes: number;
  weeklyMinutes: number;
  onSave: (daily: number, weekly: number) => void;
  onClose: () => void;
}

export default function TargetEditor({
  isOpen,
  dailyMinutes,
  weeklyMinutes,
  onSave,
  onClose,
}: TargetEditorProps) {
  const [daily, setDaily] = useState(dailyMinutes / 60);
  const [weekly, setWeekly] = useState(weeklyMinutes / 60);

  useEffect(() => {
    if (isOpen) {
      setDaily(dailyMinutes / 60);
      setWeekly(weeklyMinutes / 60);
    }
  }, [isOpen, dailyMinutes, weeklyMinutes]);

  const handleSave = () => {
    onSave(Math.round(daily * 60), Math.round(weekly * 60));
  };

  return (
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
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            className="glass-card relative w-full max-w-sm p-6 shadow-2xl z-10 rounded-2xl border border-surface-600/50"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-accent-500/15 flex items-center justify-center shadow-sm">
                <Target size={18} className="text-accent-400" />
              </div>
              <h2 className="text-base font-semibold tracking-tight text-text-primary">
                Edit Targets
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                  Daily Target (hours)
                </label>
                <input
                  type="number"
                  value={daily}
                  onChange={(e) => setDaily(Number(e.target.value))}
                  min={0}
                  max={24}
                  step={0.5}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-700/60 border border-surface-600/40 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text-secondary mb-1.5 block">
                  Weekly Target (hours)
                </label>
                <input
                  type="number"
                  value={weekly}
                  onChange={(e) => setWeekly(Number(e.target.value))}
                  min={0}
                  max={168}
                  step={0.5}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-700/60 border border-surface-600/40 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer border border-surface-600/40"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-accent-500 text-white hover:bg-accent-600 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                Save Targets
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
