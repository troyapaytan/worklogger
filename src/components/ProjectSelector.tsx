import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Check, ChevronDown, Filter, Plus, Tag } from 'lucide-react';

export interface CategoryOption {
  key: string;
  name: string;
  color?: string;
  ticketId?: string;
  urlTicketId?: string;
  ownerId?: string;
  status?: string;
}

interface ProjectSelectorProps {
  value: string;
  categories: CategoryOption[];
  onChange: (categoryKey: string) => void;
  accentColor?: string;
  disabled?: boolean;
}

/**
 * Returns Tailwind color classes for ticket status badges.
 */
export function getStatusBadgeStyle(status?: string): string {
  if (!status) {
    return 'bg-surface-700/60 text-text-muted border-surface-600/40';
  }
  const s = status.toLowerCase();
  if (s.includes('closed') || s.includes('resolved') || s.includes('completed') || s.includes('done')) {
    return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
  if (s.includes('hold') || s.includes('pending') || s.includes('wait') || s.includes('pause')) {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
  }
  if (
    s.includes('progress') ||
    s.includes('open') ||
    s.includes('assign') ||
    s.includes('dev') ||
    s.includes('test') ||
    s.includes('active')
  ) {
    return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
  }
  if (s.includes('cancel') || s.includes('reject') || s.includes('fail')) {
    return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }
  return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
}

/**
 * Highlights matching search substrings inside text.
 */
function highlightMatch(text: string, query: string) {
  if (!query.trim() || !text) return text;
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[#]/, '').trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return text;

  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-accent-500/25 text-accent-600 dark:text-accent-300 rounded px-0.5 font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

/**
 * Intuitive multi-token search for tickets.
 * Matches name, key, ticketId (with or without #/CH- prefixes), urlTicketId, and status.
 */
function matchesCategorySearch(cat: CategoryOption, query: string): boolean {
  if (!query.trim()) return true;

  const cleanQuery = query.toLowerCase().trim();
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);

  const name = (cat.name || '').toLowerCase();
  const key = (cat.key || '').toLowerCase();
  const ticketId = (cat.ticketId || '').toLowerCase();
  const ticketIdAlnum = ticketId.replace(/[^a-z0-9]/g, '');
  const urlTicketId = (cat.urlTicketId || '').toLowerCase();
  const status = (cat.status || '').toLowerCase();

  return tokens.every((token) => {
    const cleanToken = token.replace(/^[#]/, '');
    const tokenAlnum = cleanToken.replace(/[^a-z0-9]/g, '');

    return (
      name.includes(cleanToken) ||
      key.includes(cleanToken) ||
      ticketId.includes(cleanToken) ||
      (tokenAlnum.length > 0 && ticketIdAlnum.includes(tokenAlnum)) ||
      urlTicketId.includes(cleanToken) ||
      status.includes(cleanToken)
    );
  });
}

/**
 * Relevance scoring to order search matches intuitively.
 */
function getSearchScore(cat: CategoryOption, query: string): number {
  if (!query.trim()) return 0;
  const q = query.toLowerCase().trim();
  const qAlnum = q.replace(/[^a-z0-9]/g, '');
  const ticketId = (cat.ticketId || '').toLowerCase();
  const ticketIdAlnum = ticketId.replace(/[^a-z0-9]/g, '');
  const name = (cat.name || '').toLowerCase();
  const status = (cat.status || '').toLowerCase();

  // Exact ticket ID match
  if (ticketId === q || (qAlnum.length > 0 && ticketIdAlnum === qAlnum)) return 100;
  // Ticket ID starts with query
  if (ticketId.startsWith(q) || (qAlnum.length > 0 && ticketIdAlnum.startsWith(qAlnum))) return 80;
  // Project name exact match
  if (name === q) return 70;
  // Project name starts with query
  if (name.startsWith(q)) return 60;
  // Ticket ID contains query
  if (ticketId.includes(q)) return 50;
  // Name contains query
  if (name.includes(q)) return 40;
  // Status matches query
  if (status.includes(q)) return 30;
  return 10;
}

export default function ProjectSelector({
  value,
  categories,
  onChange,
  accentColor = '#0030FF',
  disabled = false,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Selected Category details
  const selectedCat = useMemo(() => {
    if (!value) return undefined;
    return categories.find(
      (c) =>
        c.key === value ||
        c.key.toLowerCase() === value.toLowerCase() ||
        c.name.toLowerCase() === value.toLowerCase()
    );
  }, [value, categories]);

  // Extract all distinct statuses and count tickets per status
  const statusOptions = useMemo(() => {
    const statusCounts = new Map<string, number>();
    let noStatusCount = 0;

    for (const cat of categories) {
      const s = cat.status?.trim();
      if (s) {
        statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
      } else {
        noStatusCount++;
      }
    }

    const list: { status: string; label: string; count: number }[] = [];
    list.push({ status: 'all', label: 'All', count: categories.length });

    // Sort statuses by count descending
    const sorted = Array.from(statusCounts.entries()).sort((a, b) => b[1] - a[1]);
    for (const [st, count] of sorted) {
      list.push({ status: st, label: st, count });
    }

    if (noStatusCount > 0 && statusCounts.size > 0) {
      list.push({ status: 'none', label: 'No Status', count: noStatusCount });
    }

    return list;
  }, [categories]);

  // Filtered & Ranked Categories
  const filteredCategories = useMemo(() => {
    let list = categories.filter((cat) => {
      // 1. Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'none') {
          if (cat.status && cat.status.trim() !== '') return false;
        } else {
          if ((cat.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
        }
      }
      // 2. Search Query
      return matchesCategorySearch(cat, searchQuery);
    });

    // 3. Relevance ranking if search query active
    if (searchQuery.trim()) {
      list = [...list].sort((a, b) => getSearchScore(b, searchQuery) - getSearchScore(a, searchQuery));
    }

    return list;
  }, [categories, statusFilter, searchQuery]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCategories.length, searchQuery, statusFilter]);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const children = listRef.current.children;
      const el = children[highlightedIndex] as HTMLElement;
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({
          block: 'nearest',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (cat: CategoryOption) => {
      onChange(cat.key);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleSelectCustom = useCallback(
    (customName: string) => {
      const trimmed = customName.trim();
      if (!trimmed) return;
      onChange(trimmed);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onChange]
  );

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredCategories.length === 0 ? 0 : (prev + 1) % filteredCategories.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredCategories.length === 0
          ? 0
          : (prev - 1 + filteredCategories.length) % filteredCategories.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCategories.length > 0 && filteredCategories[highlightedIndex]) {
        handleSelect(filteredCategories[highlightedIndex]);
      } else if (searchQuery.trim()) {
        handleSelectCustom(searchQuery.trim());
      }
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    searchInputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full min-w-0 flex items-center justify-between px-3 py-2 rounded-xl bg-surface-800 dark:bg-surface-700/60 border border-surface-400/80 dark:border-surface-500 text-left transition-all cursor-pointer shadow-xs hover:border-surface-400 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-accent-500/40"
        style={{
          borderColor: isOpen ? accentColor : `${accentColor}60`,
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2 overflow-hidden">
          {/* Color Indicator Dot */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 border transition-colors"
            style={{
              backgroundColor: value ? selectedCat?.color || accentColor : 'transparent',
              borderColor: value ? selectedCat?.color || accentColor : 'rgba(156, 163, 175, 0.6)',
            }}
          />

          {value ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <span
                className="text-sm font-semibold text-text-primary truncate min-w-0 flex-1"
                title={selectedCat?.name || value}
              >
                {selectedCat?.name || value}
              </span>
              {selectedCat?.ticketId && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-500/15 text-accent-500 dark:text-accent-400 font-mono font-medium shrink-0 border border-accent-500/20">
                  {selectedCat.ticketId}
                </span>
              )}
              {selectedCat?.status && (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${getStatusBadgeStyle(
                    selectedCat.status
                  )}`}
                >
                  {selectedCat.status}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-text-muted italic truncate min-w-0">— Select Project —</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-text-muted">
          {value && (
            <span
              onClick={handleClearSelection}
              className="p-0.5 hover:text-text-primary hover:bg-surface-600/50 rounded-full transition-colors cursor-pointer mr-0.5"
              title="Clear selection"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-accent-500' : ''}`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-800 dark:bg-surface-800/95 border border-surface-600/80 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-2 backdrop-blur-xl"
            style={{
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}
          >
            {/* Search Input Bar */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, ticket #, or status..."
                className="w-full pl-8 pr-16 py-1.5 rounded-xl bg-surface-700/60 dark:bg-surface-700/50 border border-surface-500/60 text-xs text-text-primary font-medium placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/40 focus:border-accent-500 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-600/60 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X size={11} />
                  </button>
                )}
                <span className="text-[10px] text-text-muted font-mono px-1 bg-surface-700 rounded border border-surface-600/40">
                  {filteredCategories.length}
                </span>
              </div>
            </div>

            {/* Status Filter Pills (if any statuses exist) */}
            {statusOptions.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-[11px] border-b border-surface-700/60">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider pl-1 shrink-0 flex items-center gap-1">
                  <Filter size={10} />
                  Status:
                </span>
                {statusOptions.map((item) => {
                  const isSelected = statusFilter === item.status;
                  return (
                    <button
                      key={item.status}
                      type="button"
                      onClick={() =>
                        setStatusFilter((prev) => (prev === item.status ? 'all' : item.status))
                      }
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border active:scale-95 ${
                        isSelected
                          ? 'bg-accent-500 text-white border-accent-600 shadow-xs'
                          : 'bg-surface-700/40 hover:bg-surface-700/80 text-text-secondary border-surface-600/40'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`text-[9px] px-1 py-0 rounded-full font-mono font-normal ${
                          isSelected
                            ? 'bg-white/30 text-white'
                            : 'bg-surface-600/60 text-text-muted'
                        }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Categories List */}
            <div
              ref={listRef}
              className="space-y-1 max-h-56 overflow-y-auto pr-1 select-none"
              role="listbox"
            >
              {filteredCategories.map((cat, index) => {
                const isSelected =
                  cat.key === value || cat.key.toLowerCase() === value.toLowerCase();
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={cat.key}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(cat)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-accent-500/15 border-accent-500/40 text-text-primary'
                        : isHighlighted
                        ? 'bg-surface-700/70 border-surface-600/60 text-text-primary'
                        : 'bg-transparent border-transparent hover:bg-surface-700/40 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      {/* Color dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0 border"
                        style={{
                          backgroundColor: cat.color || '#0030FF',
                          borderColor: cat.color || '#0030FF',
                        }}
                      />

                      {/* Name and Ticket ID */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                          <span
                            className="text-xs font-semibold truncate min-w-0 flex-1"
                            title={cat.name}
                          >
                            {highlightMatch(cat.name, searchQuery)}
                          </span>
                          {cat.ticketId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-700 border border-surface-600/60 font-mono text-accent-500 dark:text-accent-400 font-semibold shrink-0">
                              {highlightMatch(cat.ticketId, searchQuery)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {cat.status && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 border ${getStatusBadgeStyle(
                            cat.status
                          )}`}
                        >
                          {highlightMatch(cat.status, searchQuery)}
                        </span>
                      )}
                      {isSelected && (
                        <Check size={13} className="text-accent-500 shrink-0 stroke-[2.5]" />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Zero-results empty state */}
              {filteredCategories.length === 0 && (
                <div className="py-4 text-center space-y-2">
                  <p className="text-xs text-text-muted">
                    No tickets match{' '}
                    {searchQuery ? (
                      <span className="font-semibold text-text-primary">"{searchQuery}"</span>
                    ) : (
                      'the selected filter'
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs text-accent-500 hover:text-accent-400 font-medium underline underline-offset-2 cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => handleSelectCustom(searchQuery.trim())}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-500/15 hover:bg-accent-500/25 border border-accent-500/30 text-xs font-semibold text-accent-500 dark:text-accent-400 transition-colors cursor-pointer"
                      >
                        <Plus size={11} />
                        Use "{searchQuery.trim()}"
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick helper footer if search is active */}
            {searchQuery.trim() && filteredCategories.length > 0 && (
              <div className="pt-1.5 border-t border-surface-700/60 flex items-center justify-between text-[10px] text-text-muted">
                <span>
                  Press <kbd className="px-1 py-0.5 rounded bg-surface-700 text-text-primary font-mono">↵</kbd> to select
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectCustom(searchQuery.trim())}
                  className="hover:text-accent-400 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} />
                  Custom: "{searchQuery.trim()}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
