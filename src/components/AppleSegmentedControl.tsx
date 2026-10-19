import React from 'react';
import { motion } from 'framer-motion';

export interface AppleSegmentedOption<T extends string | number> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
}

export interface AppleSegmentedControlProps<T extends string | number> {
  options: AppleSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  layoutId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function AppleSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
  size = 'md',
  className = '',
}: AppleSegmentedControlProps<T>) {
  const isSm = size === 'sm';

  return (
    <div
      role="tablist"
      className={`apple-segmented-track relative inline-flex items-center p-0.5 rounded-full bg-surface-800/80 border border-surface-600/40 select-none ${className}`}
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`relative flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer font-medium z-10 ${
              isSm ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1 text-xs'
            } ${
              isActive
                ? 'text-text-primary font-semibold'
                : 'text-text-secondary hover:text-text-primary'
            } active:scale-[0.97]`}
          >
            {/* Fluid sliding active pill */}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-surface-600/90 shadow-[0_1px_3px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.12)] -z-10"
                style={{ willChange: 'transform', transform: 'translateZ(0)' }}
                transition={{
                  type: 'spring',
                  stiffness: 480,
                  damping: 34,
                  mass: 0.8,
                }}
              />
            )}
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
