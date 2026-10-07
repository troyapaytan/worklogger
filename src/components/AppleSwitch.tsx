import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface AppleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  activeColor?: string; // default emerald-500
  ariaLabel?: string;
}

export default function AppleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  activeColor = 'bg-emerald-500',
  ariaLabel,
}: AppleSwitchProps) {
  const [isPressed, setIsPressed] = useState(false);

  const isSm = size === 'sm';
  const trackWidth = isSm ? 'w-9' : 'w-11';
  const trackHeight = isSm ? 'h-5' : 'h-6';
  const knobSize = isSm ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5';
  const offsetChecked = isSm ? 16 : 20;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onPointerDown={() => !disabled && setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      className={`relative inline-flex shrink-0 ${trackWidth} ${trackHeight} rounded-full transition-colors duration-250 ease-in-out cursor-pointer select-none p-0.5 items-center ${
        checked
          ? activeColor
          : 'bg-surface-600/50 hover:bg-surface-600/70'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
      style={{
        boxShadow: checked
          ? '0 2px 8px rgba(16, 185, 129, 0.35)'
          : 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
      }}
    >
      <motion.span
        layout
        transition={{
          type: 'spring',
          stiffness: 550,
          damping: 32,
          mass: 0.7,
        }}
        animate={{
          x: checked ? offsetChecked : 2,
          scaleX: isPressed ? 1.2 : 1,
        }}
        className={`${knobSize} rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3),0_2px_6px_rgba(0,0,0,0.15)] pointer-events-none block`}
      />
    </button>
  );
}
