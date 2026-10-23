import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, Link, HelpCircle, ChevronDown, List, Save } from 'lucide-react';
import type { SdpConfig } from '../db';
import { copyToClipboard } from '../utils/sdpFormatter';

interface SdpSettingsModalProps {
  isOpen: boolean;
  config?: SdpConfig;
  onSave: (config: Omit<SdpConfig, 'worklogTypeMap'>) => void;
  onImportFullConfig: (config: Partial<SdpConfig>) => void;
  onOpenTypeMap: () => void;
  onClose: () => void;
}

export default function SdpSettingsModal({
  isOpen,
  config,
  onSave,
  onImportFullConfig,
  onOpenTypeMap,
  onClose,
}: SdpSettingsModalProps) {
  const [cookieString, setCookieString] = useState(config?.cookieString || '');
  const [csrfToken, setCsrfToken] = useState(config?.csrfToken || '');
  const [appId, setAppId] = useState(config?.appId || '696655712');
  const [ownerId, setOwnerId] = useState(config?.ownerId || '');
  const [ownerName, setOwnerName] = useState(config?.ownerName || '');
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (isOpen && config) {
      setCookieString(config.cookieString || '');
      setCsrfToken(config.csrfToken || '');
      setAppId(config.appId || '696655712');
      setOwnerId(config.ownerId || '');
      setOwnerName(config.ownerName || '');
    }
  }, [isOpen, config]);

  // Auto-extract CSRF token from cookies if possible
  const handleCookieChange = (val: string) => {
    setCookieString(val);
    const match = val.match(/sdpcscook=([^;]+)/);
    if (match && match[1]) {
      setCsrfToken(match[1]);
    }
  };

  const handleSave = () => {
    onSave({
      cookieString: cookieString.trim(),
      csrfToken: csrfToken.trim(),
      appId: appId.trim(),
      ownerId: ownerId.trim(),
      ownerName: ownerName.trim(),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/50 dark:bg-black/70"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card relative w-full max-w-xl max-h-[90vh] p-6 shadow-2xl z-10 rounded-2xl flex flex-col border border-surface-600/50"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-700/60 text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-accent-500/15 border border-accent-500/30 rounded-xl flex items-center justify-center text-accent-500 shadow-sm">
                <Settings size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary tracking-tight leading-tight">
                  Manage Engine Settings
                </h2>
                <p className="text-[12px] text-text-secondary mt-0.5 font-normal">
                  Configure authentication and global settings for posting worklogs to Manage Engine.
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-1">
              
              {/* Tutorial Accordion */}
              <div className="bg-surface-700/20 border border-surface-600/40 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-text-primary hover:bg-surface-600/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle size={14} className="text-accent-500" />
                    <span>How to get your Session Cookie and CSRF Token?</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-text-muted transition-transform duration-200 ${showTutorial ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {showTutorial && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 text-[11px] text-text-secondary leading-relaxed space-y-2 border-t border-surface-600/40">
                        <p>1. Open Manage Engine in your browser and log in.</p>
                        <p>2. Open Developer Tools (Press <strong className="text-text-primary">F12</strong> or <strong className="text-text-primary">Ctrl+Shift+I</strong>).</p>
                        <p>3. Go to the <strong className="text-text-primary">Network</strong> tab.</p>
                        <p>4. Perform any action in Manage Engine (like clicking a ticket or refreshing the page).</p>
                        <p>5. Click on any of the new network requests that appear.</p>
                        <p>6. Scroll down to the <strong className="text-text-primary">Request Headers</strong> section.</p>
                        <p>7. Find the <strong className="text-text-primary">Cookie</strong> header, right-click its value, and select <strong className="text-text-primary">Copy value</strong>.</p>
                        <p>8. Paste it below. The CSRF Token will extract automatically.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Cookie String */}
              <div>
                <label className="block text-[11px] font-bold text-text-primary/80 dark:text-text-secondary mb-1.5 uppercase tracking-wider">
                  Session Cookie String
                </label>
                <p className="text-[11px] text-text-secondary dark:text-text-muted mb-2 leading-relaxed font-normal">
                  Paste the full <code className="bg-surface-700/50 px-1.5 py-0.5 rounded text-accent-500 font-mono text-[10px]">Cookie</code> header from your browser DevTools (Network tab) for any recent Manage Engine request.
                </p>
                <textarea
                  value={cookieString}
                  onChange={(e) => handleCookieChange(e.target.value)}
                  placeholder="zalb_b5de...=...; sdpcscook=...;"
                  rows={4}
                  className="w-full px-3 py-2.5 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 text-xs font-mono font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl resize-none transition-all shadow-xs"
                />
              </div>

              {/* CSRF Token */}
              <div>
                <label className="block text-[11px] font-bold text-text-primary/80 dark:text-text-secondary mb-1.5 uppercase tracking-wider">
                  CSRF Token (x-zcsrftoken)
                </label>
                <p className="text-[11px] text-text-secondary dark:text-text-muted mb-2 leading-relaxed font-normal">
                  Usually auto-extracted from the <code className="bg-surface-700/50 px-1.5 py-0.5 rounded text-accent-500 font-mono text-[10px]">sdpcscook</code> in the cookie string.
                </p>
                <input
                  type="text"
                  value={csrfToken}
                  onChange={(e) => setCsrfToken(e.target.value)}
                  placeholder="CSRF token..."
                  className="w-full px-3 py-2 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 text-xs font-mono font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 rounded-xl transition-all shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* App ID & Owner ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-primary/80 dark:text-text-secondary mb-1.5 uppercase tracking-wider">
                      App ID
                    </label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="e.g. 696655712"
                      className="w-full px-3 py-2 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 rounded-xl text-xs text-text-primary font-mono font-medium focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all shadow-xs"
                    />
                    <p className="mt-1 text-[10px] text-text-secondary dark:text-text-muted">
                      Typically 696655712.
                    </p>
                  </div>
                  
                  <div>
                    <label className="flex items-center text-[11px] font-bold text-text-primary/80 dark:text-text-secondary mb-1.5 uppercase tracking-wider gap-2">
                      Owner ID
                      {ownerName && <span className="bg-accent-500/15 text-accent-500 px-2 py-0.5 rounded-full text-[10px] normal-case truncate max-w-[150px]">{ownerName}</span>}
                    </label>
                    <input
                      type="text"
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      placeholder="e.g. 108026001157415656"
                      className="w-full px-3 py-2 bg-surface-800 dark:bg-surface-700/40 border border-surface-400/80 dark:border-surface-500/50 rounded-xl text-xs text-text-primary font-mono font-medium focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all shadow-xs"
                    />
                    <p className="mt-1 text-[10px] text-text-secondary dark:text-text-muted">
                      Your Manage Engine Technician ID. Required for worklogs.
                    </p>
                  </div>
                </div>    

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onOpenTypeMap}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 w-full bg-surface-800 dark:bg-surface-700/40 hover:bg-surface-700/60 dark:hover:bg-surface-600/50 border border-surface-400/80 dark:border-surface-500/50 text-xs font-semibold text-text-primary rounded-xl transition-all cursor-pointer active:scale-[0.98] shadow-xs"
                  >
                    <List size={14} className="text-accent-500" />
                    <span>Map Worklog Types to Manage Engine IDs</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between border-t border-surface-600/40 pt-4 shrink-0">
              <p className="text-[11px] text-text-muted flex items-center gap-1.5">
                <Link size={11} />
                Stored locally in worklogger_data.json
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
                  Save Settings
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
