import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, FileText } from 'lucide-react';
import type { Worklog } from '../db';
import { formatWeeklyWorklogsForSDP } from '../utils/sdpFormatter';
import { copyToClipboard } from '../utils/sdpFormatter';
import { useState } from 'react';

interface ExportDrawerProps {
  isOpen: boolean;
  worklogs: Worklog[];
  onClose: () => void;
}

export default function ExportDrawer({
  isOpen,
  worklogs,
  onClose,
}: ExportDrawerProps) {
  const [copied, setCopied] = useState(false);

  const exportText = useMemo(() => {
    const byDate = new Map<string, Worklog[]>();
    for (const log of worklogs) {
      const existing = byDate.get(log.date) ?? [];
      existing.push(log);
      byDate.set(log.date, existing);
    }
    return formatWeeklyWorklogsForSDP(byDate);
  }, [worklogs]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(exportText);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="glass-card relative w-full max-w-2xl p-6 shadow-2xl z-10 max-h-[85vh] flex flex-col rounded-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-700/60 active:scale-95 transition-all cursor-pointer text-text-muted hover:text-text-primary"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shadow-sm">
                <FileText size={18} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold tracking-tight text-text-primary">
                  ServiceDesk Plus Export
                </h2>
                <p className="text-xs text-text-muted">
                  Copy-ready worklog for SDP submission
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl bg-surface-700/40 border border-surface-600/40 p-4 mb-4">
              <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
                {exportText}
              </pre>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer active:scale-95 shadow-md ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-accent-500 text-white hover:bg-accent-600 shadow-accent-500/30'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
