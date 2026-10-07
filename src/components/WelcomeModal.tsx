import { motion, AnimatePresence } from 'framer-motion';
import { Play, FileText, Calendar, Cloud, Settings, Plus } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onCreateEmpty: () => void;
  onCreateDemo: () => void;
}

export default function WelcomeModal({ isOpen, onCreateEmpty, onCreateDemo }: WelcomeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.85 }}
            className="glass-card relative w-full max-w-3xl overflow-hidden shadow-2xl z-10 rounded-2xl flex flex-col max-h-[90vh] border border-surface-600/50"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-accent-600/20 to-accent-400/10 p-8 text-center border-b border-surface-600/30">
              <div className="w-16 h-16 bg-accent-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-accent-500/30 mb-4">
                <Calendar size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
                Welcome to Worklogger
              </h1>
              <p className="text-sm text-text-secondary max-w-md mx-auto">
                A visual timeline tracker built to effortlessly log your daily work and seamlessly sync it with ManageEngine ServiceDesk Plus.
              </p>
            </div>

            <div className="p-8 overflow-y-auto flex-1">
              <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-6 text-center">
                How it works
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Step 1 */}
                <div className="bg-surface-700/40 rounded-2xl p-5 border border-surface-600/30 relative shadow-sm">
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-surface-600 rounded-full flex items-center justify-center font-bold text-text-secondary text-sm border-2 border-surface-800 shadow-sm">
                    1
                  </div>
                  <Settings size={24} className="text-accent-400 mb-3" />
                  <h3 className="text-sm font-semibold tracking-tight text-text-primary mb-2">Set Up Projects</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Click the <strong>Folder icon</strong> in the header to create your projects and assign default SDP ticket numbers.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-surface-700/40 rounded-2xl p-5 border border-surface-600/30 relative shadow-sm">
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-surface-600 rounded-full flex items-center justify-center font-bold text-text-secondary text-sm border-2 border-surface-800 shadow-sm">
                    2
                  </div>
                  <Play size={24} className="text-emerald-400 mb-3" />
                  <h3 className="text-sm font-semibold tracking-tight text-text-primary mb-2">Log visually</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Click and drag anywhere on the timeline to create worklogs. Adjust their duration simply by dragging the edges.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-surface-700/40 rounded-2xl p-5 border border-surface-600/30 relative shadow-sm">
                  <div className="absolute -top-3 -left-3 w-8 h-8 bg-surface-600 rounded-full flex items-center justify-center font-bold text-text-secondary text-sm border-2 border-surface-800 shadow-sm">
                    3
                  </div>
                  <Cloud size={24} className="text-blue-400 mb-3" />
                  <h3 className="text-sm font-semibold tracking-tight text-text-primary mb-2">Sync to SDP</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Once you configure your Session Cookies in the settings, you can one-click push any worklog directly to SDP.
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 flex flex-col items-center justify-center">
                <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider m-0 mb-1.5">
                  Browser Storage
                </h3>
                <p className="text-[11px] text-text-secondary leading-relaxed max-w-md text-center m-0">
                  Your data is completely private and stored securely within your browser's internal storage. Since we couldn't find an existing tracker, how would you like to start?
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-surface-700/40 bg-surface-800/50 flex items-center justify-center gap-4">
              <button
                onClick={onCreateDemo}
                className="px-6 py-2.5 text-xs font-semibold text-text-primary bg-surface-700/70 hover:bg-surface-600 active:scale-95 border border-surface-600/40 rounded-xl transition-all cursor-pointer"
              >
                Start with Demo Data
              </button>
              <button
                onClick={onCreateEmpty}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 active:scale-95 rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Plus size={16} />
                Create Empty Tracker
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
