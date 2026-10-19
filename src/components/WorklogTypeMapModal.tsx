import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, Save, RotateCcw } from 'lucide-react';

interface WorklogTypeMapModalProps {
  isOpen: boolean;
  worklogTypes: string[];
  initialMap: Record<string, string>;
  onSave: (map: Record<string, string>) => void;
  onClose: () => void;
}

export default function WorklogTypeMapModal({
  isOpen,
  worklogTypes,
  initialMap,
  onSave,
  onClose,
}: WorklogTypeMapModalProps) {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, string> = {};
      worklogTypes.forEach(type => {
        init[type] = initialMap[type] || '';
      });
      // Pre-fill known default if empty
      if (!init['Coding'] && !initialMap['Coding']) {
        init['Coding'] = '108026000424780182';
      }
      setMap(init);
    }
  }, [isOpen, worklogTypes, initialMap]);

  const handleSave = () => {
    // Only save non-empty strings
    const finalMap: Record<string, string> = {};
    for (const [key, val] of Object.entries(map)) {
      if (val && val.trim() !== '') {
        finalMap[key] = val.trim();
      }
    }
    onSave(finalMap);
  };

  const handleChange = (type: string, val: string) => {
    setMap(prev => ({ ...prev, [type]: val }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="glass-card relative w-full max-w-2xl p-6 shadow-2xl z-10 rounded-2xl flex flex-col max-h-[90vh] border border-surface-600/50"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-700/60 text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className="w-10 h-10 bg-accent-500/15 border border-accent-500/30 rounded-xl flex items-center justify-center text-accent-500 shadow-sm">
                <Wrench size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary tracking-tight leading-tight">
                  Worklog Type SDP Mapping
                </h2>
                <p className="text-[12px] text-text-secondary mt-0.5 font-normal">
                  Map each Worklog Type to its numeric SDP ID (shared between Change and Service Request tickets).
                </p>
              </div>
            </div>

            {/* Headers row */}
            <div className="grid grid-cols-12 gap-4 text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2 shrink-0 border-b border-surface-600/40 pb-2">
              <span className="col-span-5">Worklog Type</span>
              <span className="col-span-7">SDP ID (e.g. 108026...)</span>
            </div>

            {/* List */}
            <div className="space-y-1.5 mb-6 overflow-y-auto pr-2 flex-1">
              {worklogTypes.map((type, idx) => (
                <div
                  key={type}
                  className={`grid grid-cols-12 gap-4 items-center py-2 px-2.5 rounded-xl ${idx % 2 === 0 ? 'bg-surface-700/20' : ''} hover:bg-surface-700/40 transition-colors`}
                >
                  <span className="col-span-5 text-xs font-medium text-text-primary">
                    {type}
                  </span>
                  
                  <input
                    type="text"
                    value={map[type] || ''}
                    onChange={(e) => handleChange(type, e.target.value)}
                    placeholder="Omitted if empty"
                    className="col-span-7 px-3 py-1.5 bg-surface-700/40 border border-surface-500/50 text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl placeholder:text-text-muted/50 transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between border-t border-surface-600/40 pt-4 shrink-0">
              <p className="text-[11px] text-text-muted">
                Changes apply only locally and to new SDP posts.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-700/60 transition-all cursor-pointer rounded-xl active:scale-[0.97]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-all cursor-pointer shadow-sm rounded-xl active:scale-[0.97]"
                >
                  <Save size={14} />
                  Save Mapping
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
