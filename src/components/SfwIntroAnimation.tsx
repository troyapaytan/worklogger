import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSfwIntroAudio } from '../utils/sfwAudio';

interface SfwIntroAnimationProps {
  onComplete?: () => void;
}

export default function SfwIntroAnimation({ onComplete }: SfwIntroAnimationProps) {
  const [stage, setStage] = useState<'intro' | 'punch' | 'tagline' | 'exit'>('intro');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Play the actual sound file (with Web Audio synthesizer fallback)
    playSfwIntroAudio();

    // Visual sequence synced with the authentic intro sound
    const tPunch = setTimeout(() => {
      setStage('punch');
    }, 950);

    const tTagline = setTimeout(() => {
      setStage('tagline');
    }, 1300);

    const tExit = setTimeout(() => {
      setStage('exit');
      setVisible(false);
    }, 2800);

    const tComplete = setTimeout(() => {
      onComplete?.();
    }, 3200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        setVisible(false);
        onComplete?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(tPunch);
      clearTimeout(tTagline);
      clearTimeout(tExit);
      clearTimeout(tComplete);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  const handleDismiss = () => {
    setVisible(false);
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          onClick={handleDismiss}
          className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden font-sans"
        >
          {/* Radial Glow Burst */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: stage === 'punch' || stage === 'tagline' ? 1.35 : 1,
              opacity: stage === 'punch' || stage === 'tagline' ? 0.35 : 0.15,
            }}
            transition={{ duration: 0.4 }}
            className="absolute w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,_rgba(255,153,0,0.6)_0%,_rgba(255,153,0,0.06)_50%,_transparent_75%)] pointer-events-none"
          />

          {/* Center Logo Container */}
          <motion.div
            className="relative flex items-center gap-2 sm:gap-3 text-4xl sm:text-6xl md:text-7xl font-black tracking-tight z-10"
            animate={
              stage === 'punch' || stage === 'tagline'
                ? {
                  scale: [1, 1.1, 1],
                  transition: { duration: 0.28, ease: 'easeOut' },
                }
                : {}
            }
          >
            {/* "WORK" White Text */}
            <motion.span
              initial={{ x: -140, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            >
              WORK
            </motion.span>

            {/* "LOGGER" Orange Pill Badge */}
            <motion.div
              initial={{ x: 140, opacity: 0, scale: 0.7 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                delay: 0.6,
                type: 'spring',
                stiffness: 320,
                damping: 20,
              }}
              className="bg-[#f90] text-black px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center shadow-[0_4px_24px_rgba(255,153,0,0.6)]"
            >
              <span className="text-black">LOGGER</span>
            </motion.div>
          </motion.div>

          {/* Subtitle / Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{
              opacity: stage === 'tagline' ? 1 : 0,
              y: stage === 'tagline' ? 0 : 15,
            }}
            transition={{ duration: 0.4 }}
            className="mt-6 sm:mt-8 text-[11px] sm:text-xs font-bold tracking-[0.25em] text-[#999999] uppercase text-center"
          >
            Log me, Daddy!
          </motion.div>

          {/* Skip prompt */}
          <div className="absolute bottom-6 text-[10px] text-[#555555] tracking-wider uppercase font-semibold">
            Click anywhere to skip
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
