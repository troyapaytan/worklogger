import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Volume2, VolumeX, Copy, Check, RefreshCw, Send, FastForward } from 'lucide-react';
import DragonBall from './DragonBall';
import { dragonBallAudio } from '../utils/dragonBallAudio';
import { PRESET_WISHES, getRandomFortune, type DragonBallFortune } from '../data/dragonBallFortunes';

interface ShenronModalProps {
  isOpen: boolean;
  onClose: () => void;
  weeklyHours?: string;
  targetHours?: string;
}

type Stage = 'gathering' | 'flying' | 'descending' | 'summoned' | 'granting' | 'granted';

export const ShenronModal: React.FC<ShenronModalProps> = ({
  isOpen,
  onClose,
  weeklyHours,
  targetHours,
}) => {
  const [stage, setStage] = useState<Stage>('gathering');
  const [customWish, setCustomWish] = useState('');
  const [selectedWish, setSelectedWish] = useState('');
  const [fortune, setFortune] = useState<DragonBallFortune | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(() => dragonBallAudio.getMuted());
  
  // Lightning & Storm state
  const [lightningFlash, setLightningFlash] = useState(false);
  const [lightningBoltType, setLightningBoltType] = useState<1 | 2 | 3>(2);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  };

  // Helper to trigger a lightning strike with thunder and optional screen shake
  const triggerLightningStrike = (boltType: 1 | 2 | 3 = 2, shake: boolean = true) => {
    setLightningBoltType(boltType);
    setLightningFlash(true);
    dragonBallAudio.playThunder();
    if (shake) {
      setIsScreenShaking(true);
      setTimeout(() => setIsScreenShaking(false), 260);
    }
    setTimeout(() => setLightningFlash(false), 160);
  };

  // Main cinematic sequence on modal open
  useEffect(() => {
    if (!isOpen) {
      clearAllTimeouts();
      setStage('gathering');
      setFortune(null);
      setSelectedWish('');
      setCustomWish('');
      setLightningFlash(false);
      setIsScreenShaking(false);
      return;
    }

    clearAllTimeouts();
    setStage('gathering');
    dragonBallAudio.playSkyDarkensRumble();

    // 1. First distant thunderclap (900ms)
    addTimeout(() => {
      triggerLightningStrike(1, false);
    }, 900);

    // 2. Second closer thunderclap (1800ms)
    addTimeout(() => {
      triggerLightningStrike(3, true);
    }, 1800);

    // 3. Golden Ki Pillar erupts (2100ms)
    addTimeout(() => {
      dragonBallAudio.playKiPillar();
    }, 2100);

    // 4. Massive lightning strike & Shenron takes flight! (2700ms)
    addTimeout(() => {
      triggerLightningStrike(2, true);
      setStage('flying');
      dragonBallAudio.playDragonFlightWhoosh();
      dragonBallAudio.playShenronRoar();
    }, 2700);

    // 5. Mid-flight sky thunderbolt (3900ms)
    addTimeout(() => {
      triggerLightningStrike(1, true);
    }, 3900);

    // 6. Second flight loop thunder strike + whoosh (5100ms)
    addTimeout(() => {
      triggerLightningStrike(3, true);
      dragonBallAudio.playDragonFlightWhoosh();
    }, 5100);

    // 7. Shenron finishes sky patrol and begins slow majestic descent
    addTimeout(() => {
      setStage('descending');
      dragonBallAudio.playDragonDescendHum();
    }, 6200);

    // 8. Eyes flash red and Shenron settles into place
    addTimeout(() => {
      dragonBallAudio.playShenronRoar();
    }, 7800);

    // 9. Fully summoned! Wish UI unfolds
    addTimeout(() => {
      setStage('summoned');
    }, 8200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearAllTimeouts();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus input when wish dialog is ready
  useEffect(() => {
    if (stage === 'summoned') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [stage]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    dragonBallAudio.setMuted(next);
  };

  const handleSkipAnimation = () => {
    clearAllTimeouts();
    setStage('summoned');
    dragonBallAudio.playShenronRoar();
  };

  const handleMakeWish = (wishText: string) => {
    if (!wishText.trim()) return;
    setSelectedWish(wishText.trim());
    setStage('granting');

    // Red eye flare & wish granted sound
    dragonBallAudio.playWishGranted();

    addTimeout(() => {
      const generatedFortune = getRandomFortune();
      setFortune(generatedFortune);
      setStage('granted');
      dragonBallAudio.playBallsScatter();
    }, 1600);
  };

  const handleCopyFortune = () => {
    if (!fortune) return;
    const text = `🐉 Shenron's Decree:\n"${fortune.quote}"\n\n📜 Wisdom: ${fortune.wisdom}\n⭐ Lucky Ball: ${fortune.luckyDragonBall}-Star | ⚡ Power Level: ${fortune.powerLevel.toLocaleString()} | 🥋 Patron: ${fortune.characterSign}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReSummon = () => {
    clearAllTimeouts();
    setStage('summoned');
    setFortune(null);
    setSelectedWish('');
    setCustomWish('');
    dragonBallAudio.playShenronRoar();
  };

  if (!isOpen) return null;

  // Orbital dragon ball radius
  const orbitalRadius = 140;
  const dragonBallAngles = [0, 51.4, 102.8, 154.2, 205.6, 257, 308.4];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] overflow-y-auto overflow-x-hidden select-none font-sans bg-[#03050a]">
        {/* ============================================================== */}
        {/* DARK STORMY SKY & LIGHTNING BACKDROP                           */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            x: isScreenShaking ? [-4, 4, -3, 3, -1, 1, 0] : 0,
            y: isScreenShaking ? [3, -3, 2, -2, 1, 0] : 0,
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: isScreenShaking ? 0.25 : 0.5 }}
          className="fixed inset-0 pointer-events-none z-0"
        >
          {/* Swirling Storm Clouds Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(28,40,70,0.85)_0%,_rgba(6,9,18,0.98)_70%)]" />

          {/* Electric Nebula Cloud Layer */}
          <div className="absolute inset-0 opacity-30 mix-blend-screen bg-[radial-gradient(circle_at_50%_30%,_rgba(255,170,0,0.3)_0%,_transparent_65%)]" />

          {/* Sinuous Atmospheric Storm Ribbons */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_bottom,_rgba(16,185,129,0.25)_0%,_transparent_60%)]" />

          {/* SVG Branching Lightning Bolts */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 1000 700">
            {lightningFlash && (
              <>
                {/* Bolt Type 1: Left Branching Strike */}
                {lightningBoltType === 1 && (
                  <>
                    <polyline
                      points="260,0 230,90 280,180 210,270 260,370 200,480 240,620"
                      stroke="#ffffff"
                      strokeWidth="5"
                      fill="none"
                      filter="drop-shadow(0 0 14px #67e8f9)"
                    />
                    <polyline
                      points="280,180 340,240 310,330 360,420"
                      stroke="#67e8f9"
                      strokeWidth="2.5"
                      fill="none"
                      filter="drop-shadow(0 0 10px #06b6d4)"
                    />
                    <polyline
                      points="210,270 150,330 180,410"
                      stroke="#ffe082"
                      strokeWidth="2"
                      fill="none"
                    />
                  </>
                )}

                {/* Bolt Type 2: Massive Center Ground Strike */}
                {lightningBoltType === 2 && (
                  <>
                    <polyline
                      points="500,0 480,110 540,190 490,290 535,380 475,510 510,680"
                      stroke="#ffffff"
                      strokeWidth="6"
                      fill="none"
                      filter="drop-shadow(0 0 18px #38bdf8)"
                    />
                    <polyline
                      points="490,290 420,360 450,440 390,530"
                      stroke="#bae6fd"
                      strokeWidth="3"
                      fill="none"
                      filter="drop-shadow(0 0 10px #38bdf8)"
                    />
                    <polyline
                      points="535,380 610,430 580,520 630,600"
                      stroke="#fde047"
                      strokeWidth="3"
                      fill="none"
                      filter="drop-shadow(0 0 10px #eab308)"
                    />
                  </>
                )}

                {/* Bolt Type 3: Right Branching Strike */}
                {lightningBoltType === 3 && (
                  <>
                    <polyline
                      points="780,0 810,120 750,210 820,330 770,440 830,580"
                      stroke="#ffffff"
                      strokeWidth="5"
                      fill="none"
                      filter="drop-shadow(0 0 14px #67e8f9)"
                    />
                    <polyline
                      points="750,210 690,280 720,370"
                      stroke="#fde047"
                      strokeWidth="2.5"
                      fill="none"
                      filter="drop-shadow(0 0 10px #f59e0b)"
                    />
                    <polyline
                      points="820,330 890,390 860,490"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      fill="none"
                    />
                  </>
                )}
              </>
            )}
          </svg>

          {/* Screen Flash Brightness Overlay */}
          {lightningFlash && (
            <div className="absolute inset-0 bg-white/40 pointer-events-none transition-opacity duration-100" />
          )}
        </motion.div>

        {/* Top Controls: Sound Mute, Skip & Close */}
        <div className="fixed top-4 right-4 sm:top-5 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
          {(stage === 'flying' || stage === 'descending') && (
            <button
              onClick={handleSkipAnimation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all"
              title="Skip animation to wish"
            >
              <FastForward size={14} className="text-amber-400" />
              <span>Skip Summon Animation &rarr;</span>
            </button>
          )}

          <button
            onClick={handleToggleMute}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-amber-400 border border-amber-500/40 shadow-lg cursor-pointer transition-all active:scale-95"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-gray-300 hover:text-white border border-slate-700 shadow-lg cursor-pointer transition-all active:scale-95"
            title="Dismiss (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* STAGE 1: GATHERING THE 7 DRAGON BALLS                          */}
        {/* ============================================================== */}
        {stage === 'gathering' && (
          <div className="relative min-h-screen w-full flex flex-col items-center justify-center text-center p-4 z-20">
            {/* Blinding Golden Ki Pillar shooting up */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1.2, 1], opacity: [0, 0.9, 0.5] }}
              transition={{ delay: 2.0, duration: 1.0, ease: 'easeOut' }}
              className="absolute w-28 h-[130vh] -top-[65vh] bg-gradient-to-r from-transparent via-[#fff59d] to-transparent pointer-events-none filter blur-sm"
              style={{ transformOrigin: 'bottom center' }}
            />
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1.4, 1], opacity: [0, 1, 0.9] }}
              transition={{ delay: 2.1, duration: 0.9, ease: 'easeOut' }}
              className="absolute w-10 h-[130vh] -top-[65vh] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none filter blur-[1px]"
              style={{ transformOrigin: 'bottom center' }}
            />

            {/* Orbiting 7 Dragon Balls */}
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
              {dragonBallAngles.map((angleDeg, idx) => {
                const rad = (angleDeg * Math.PI) / 180;
                const targetX = Math.cos(rad) * orbitalRadius;
                const targetY = Math.sin(rad) * orbitalRadius;

                // Flying in from outer space
                const startX = Math.cos(rad) * 600;
                const startY = Math.sin(rad) * 600;

                return (
                  <motion.div
                    key={idx}
                    initial={{ x: startX, y: startY, scale: 0.2, opacity: 0 }}
                    animate={{
                      x: [startX, targetX * 1.15, targetX],
                      y: [startY, targetY * 1.15, targetY],
                      scale: [0.2, 1.2, 1],
                      opacity: 1,
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: idx * 0.12,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="absolute"
                  >
                    <DragonBall count={idx + 1} size={50} glowing={true} />
                  </motion.div>
                );
              })}

              {/* Pulsing Core Energy */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.8, 1.4], opacity: [0, 0.8, 0.3] }}
                transition={{ delay: 1.8, duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-amber-400/40 via-yellow-300/60 to-orange-500/40 filter blur-xl pointer-events-none"
              />
            </div>

            {/* Dramatic Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="mt-8 z-30"
            >
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-wider text-amber-400 font-['Chakra_Petch',sans-serif] drop-shadow-[0_4px_12px_rgba(255,160,0,0.8)]">
                THE 7 DRAGON BALLS GATHER!
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium mt-2 max-w-md mx-auto">
                The sky darkens as ancient dragon magic stirs across the heavens...
              </p>
            </motion.div>

            {/* Skip Button */}
            <button
              onClick={handleSkipAnimation}
              className="mt-6 text-xs text-amber-400/80 hover:text-amber-300 underline cursor-pointer uppercase tracking-widest font-semibold flex items-center gap-1.5"
            >
              <span>Skip Summon Animation</span>
              <span>&rarr;</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 2: SHENRON FLYING AROUND THE SKY WITH THUNDER & LIGHTNING */}
        {/* ============================================================== */}
        {stage === 'flying' && (
          <div className="fixed inset-0 z-20 flex flex-col items-center justify-between p-6 pointer-events-none overflow-hidden">
            {/* Upper Sky Notification Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 text-center"
            >
              <span className="text-xs sm:text-sm font-black tracking-widest text-emerald-400 uppercase font-['Chakra_Petch',sans-serif] drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                ⚡ SHENRON SOARS THROUGH THE STORM ⚡
              </span>
              <p className="text-[11px] text-amber-300/80 font-medium">
                The Eternal Dragon winds through thunder and lightning...
              </p>
            </motion.div>

            {/* Shenron Flying Serpentine Body across the Sky */}
            <motion.div
              className="absolute pointer-events-none z-30"
              initial={{
                x: '-30vw',
                y: '40vh',
                scale: 0.45,
                rotate: -25,
                opacity: 0,
              }}
              animate={{
                x: ['-40vw', '30vw', '-20vw', '20vw', '0vw'],
                y: ['50vh', '-20vh', '-10vh', '20vh', '-15vh'],
                scale: [0.35, 1.2, 0.6, 1.4, 0.8],
                rotate: [-35, -5, 25, -15, 0],
                opacity: [0, 1, 1, 1, 1],
              }}
              transition={{
                duration: 3.5,
                times: [0, 0.3, 0.6, 0.85, 1],
                ease: 'easeInOut',
              }}
            >
              {/* Flying Dragon SVG */}
              <div className="relative w-[340px] sm:w-[500px] md:w-[620px] filter drop-shadow-[0_0_30px_rgba(16,185,129,0.7)]">
                <svg viewBox="0 0 680 340" className="w-full h-auto overflow-visible">
                  <defs>
                    {/* Emerald Flying Dragon Scales */}
                    <linearGradient id="fly-scales" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="35%" stopColor="#10b981" />
                      <stop offset="70%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#022c22" />
                    </linearGradient>

                    {/* Golden Underbelly Plates */}
                    <linearGradient id="fly-belly" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#fde047" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>

                    {/* Antler Horns Gradient */}
                    <linearGradient id="fly-horn" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a16207" />
                      <stop offset="50%" stopColor="#713f12" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>

                    <filter id="fly-eye-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Sinuous Dragon Body Spine */}
                  <path
                    fill="none"
                    stroke="url(#fly-scales)"
                    strokeWidth="38"
                    strokeLinecap="round"
                    opacity="0.95"
                  >
                    <animate attributeName="d" dur="0.3s" repeatCount="indefinite" values="
                      M 60 140 C 110 210, 150 270, 220 240 C 290 200, 310 110, 370 120 C 430 130, 420 230, 480 210 C 520 195, 535 155, 560 135;
                      M 60 130 C 110 180, 150 220, 220 250 C 290 280, 310 90, 370 100 C 430 110, 420 250, 480 230 C 520 215, 535 145, 560 135;
                      M 60 140 C 110 210, 150 270, 220 240 C 290 200, 310 110, 370 120 C 430 130, 420 230, 480 210 C 520 195, 535 155, 560 135
                    " />
                  </path>

                  {/* Golden Belly Plate Track */}
                  <path
                    fill="none"
                    stroke="url(#fly-belly)"
                    strokeWidth="14"
                    strokeDasharray="14 4"
                    opacity="0.85"
                  >
                    <animate attributeName="d" dur="0.3s" repeatCount="indefinite" values="
                      M 80 160 C 125 220, 160 260, 220 230 C 280 195, 305 125, 365 135 C 420 145, 415 215, 470 200;
                      M 80 150 C 125 190, 160 210, 220 240 C 280 275, 305 105, 365 115 C 420 125, 415 235, 470 220;
                      M 80 160 C 125 220, 160 260, 220 230 C 280 195, 305 125, 365 135 C 420 145, 415 215, 470 200
                    " />
                  </path>

                  {/* Dorsal Fin Spines along Dragon Spine */}
                  <g>
                    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-8; 0,0" dur="0.3s" repeatCount="indefinite" />
                    <path
                      d="M 120 165 L 126 140 L 138 175 M 190 245 L 198 275 L 210 240 M 270 205 L 278 180 L 288 200 M 330 115 L 340 85 L 352 118 M 410 145 L 420 115 L 430 150 M 460 215 L 472 245 L 480 210"
                      stroke="#34d399"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>

                  {/* Serpentine Flame Tail Tip */}
                  <path
                    fill="#10b981"
                    stroke="#022c22"
                    strokeWidth="2"
                  >
                    <animate attributeName="d" dur="0.3s" repeatCount="indefinite" values="
                      M 60 140 C 40 130, 25 145, 10 135 C 25 155, 35 170, 60 155 Z;
                      M 60 130 C 40 120, 25 135, 10 125 C 25 145, 35 160, 60 145 Z;
                      M 60 140 C 40 130, 25 145, 10 135 C 25 155, 35 170, 60 155 Z
                    " />
                  </path>

                  {/* Dragon Claws / Talons */}
                  <g stroke="#022c22" strokeWidth="2" fill="#047857">
                    <g>
                      <animateTransform attributeName="transform" type="translate" values="0,0; 0,-6; 0,0" dur="0.3s" repeatCount="indefinite" />
                      {/* Rear Claws */}
                      <path d="M 230 245 L 215 275 L 200 270 L 220 240 Z" />
                      {/* Front Claws reaching forward */}
                      <path d="M 470 215 L 490 250 L 510 245 L 485 210 Z" />
                      <path d="M 430 225 L 445 260 L 460 255 L 440 220 Z" />
                    </g>
                  </g>

                  {/* Flying Dragon Head */}
                  <g transform="translate(480, 50)">
                    <animateTransform attributeName="transform" type="translate" values="480,50; 480,42; 480,50" dur="0.3s" repeatCount="indefinite" additive="replace" />
                    {/* Swept Back Antler Horns */}
                    <path
                      d="M 50 65 C 20 45, -20 30, -50 40 C -25 55, -10 70, 20 80"
                      fill="url(#fly-horn)"
                      stroke="#1c1917"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 70 55 C 40 30, 0 10, -30 20 C -10 35, 10 50, 45 65"
                      fill="url(#fly-horn)"
                      stroke="#1c1917"
                      strokeWidth="2.5"
                    />

                    {/* Head Cranium */}
                    <path
                      d="M 30 75 C 20 40, 110 35, 120 70 C 135 100, 120 130, 95 145 C 65 155, 50 145, 35 130 C 20 110, 15 90, 30 75 Z"
                      fill="url(#fly-scales)"
                      stroke="#022c22"
                      strokeWidth="3"
                    />

                    {/* Glowing Ruby Eye */}
                    <polygon
                      points="65,75 88,72 82,85 62,82"
                      fill="#ef4444"
                      stroke="#b91c1c"
                      strokeWidth="2"
                      filter="url(#fly-eye-glow)"
                    />

                    {/* Flared Snout and Sharp Dragon Teeth */}
                    <ellipse cx="108" cy="118" rx="4" ry="6" fill="#022c22" />
                    <polygon points="85,130 92,142 98,130" fill="#ffffff" />
                    <polygon points="102,130 108,142 114,130" fill="#ffffff" />

                    {/* Flowing Whiskers swept back in the gale */}
                    <path
                      d="M 85 120 C 40 125, -20 140, -80 110 C -120 90, -80 60, -130 40"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 95 125 C 50 135, -10 160, -70 135 C -110 115, -70 80, -115 65"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
              </div>
            </motion.div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGES 3, 4, 5, 6: DESCENDING, SUMMONED, GRANTING & GRANTED    */}
        {/* ============================================================== */}
        {(stage === 'descending' || stage === 'summoned' || stage === 'granting' || stage === 'granted') && (
          <div className="min-h-full w-full flex flex-col items-center justify-center p-3 sm:p-5 relative z-20 pointer-events-none">
            <div className="my-auto w-full max-w-3xl flex flex-col items-center pointer-events-auto">
              
              {/* Shenron Visual Banner (Descending or Stationary) */}
              <motion.div
                initial={stage === 'descending' ? { y: -130, scale: 0.75, opacity: 0.8 } : false}
                animate={
                  stage === 'descending'
                    ? { y: 0, scale: 1, opacity: 1 }
                    : { y: [0, -5, 0] }
                }
                transition={
                  stage === 'descending'
                    ? { duration: 1.8, ease: [0.16, 1, 0.3, 1] }
                    : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                }
                className="relative w-full max-w-xl h-44 sm:h-52 md:h-56 flex items-center justify-center shrink-0"
              >
                {/* Shenron SVG Illustration */}
                <svg viewBox="0 0 600 290" className="w-full h-full filter drop-shadow-[0_0_24px_rgba(0,200,83,0.45)]">
                  <defs>
                    {/* Emerald scales gradient */}
                    <linearGradient id="shenron-scales" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="40%" stopColor="#059669" />
                      <stop offset="80%" stopColor="#047857" />
                      <stop offset="100%" stopColor="#064e3b" />
                    </linearGradient>

                    {/* Golden belly plates */}
                    <linearGradient id="shenron-belly" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#fde047" />
                      <stop offset="100%" stopColor="#ca8a04" />
                    </linearGradient>

                    {/* Horns gradient */}
                    <linearGradient id="shenron-horn" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a16207" />
                      <stop offset="50%" stopColor="#713f12" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>

                    {/* Glowing ruby eyes filter */}
                    <filter id="eye-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* MAIN BODY WRAPPER FOR BREATHING ANIMATION */}
                  <g style={{ transformOrigin: '300px 250px' }}>
                    <animateTransform 
                      attributeName="transform" 
                      type="scale" 
                      values="1 1; 1.02 0.97; 1 1" 
                      dur="4s" 
                      repeatCount="indefinite" 
                      ease="ease-in-out" 
                    />
                    {/* Sinuous Emerald Dragon Body Coils framing the sides */}
                    <path
                      d="M 50 260 C 110 160, 170 290, 270 220 C 370 160, 470 280, 550 180 C 570 140, 530 80, 470 110 C 410 140, 350 70, 280 100"
                      fill="none"
                      stroke="url(#shenron-scales)"
                      strokeWidth="36"
                      strokeLinecap="round"
                      opacity="0.9"
                    />

                    {/* Golden belly underbelly track */}
                    <path
                      d="M 50 260 C 110 160, 170 290, 270 220 C 370 160, 470 280, 550 180"
                      fill="none"
                      stroke="url(#shenron-belly)"
                      strokeWidth="14"
                      strokeDasharray="16 4"
                      opacity="0.8"
                    />

                    {/* Back Fins along spine */}
                    <path
                      d="M 80 200 L 88 175 L 100 205 M 230 210 L 240 180 L 252 215 M 410 170 L 422 145 L 432 175 M 510 150 L 522 125 L 532 155"
                      stroke="#34d399"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </g>

                  {/* Front Dragon Head & Neck */}
                  <g transform="translate(180, 16)">
                    <animateTransform 
                      attributeName="transform" 
                      type="translate" 
                      values="180,16; 180,24; 180,16" 
                      dur="4s" 
                      repeatCount="indefinite" 
                      ease="ease-in-out" 
                      additive="replace"
                    />
                    {/* Antler Horns */}
                    <path
                      d="M 90 60 C 80 20, 50 10, 30 18 C 45 28, 55 45, 65 65"
                      fill="url(#shenron-horn)"
                      stroke="#1c1917"
                      strokeWidth="2"
                    />
                    <path
                      d="M 150 60 C 160 20, 190 10, 210 18 C 195 28, 185 45, 175 65"
                      fill="url(#shenron-horn)"
                      stroke="#1c1917"
                      strokeWidth="2"
                    />

                    {/* Main Head Cranium */}
                    <path
                      d="M 70 85 C 60 50, 180 50, 170 85 C 190 120, 185 160, 155 180 C 120 195, 110 195, 85 180 C 55 160, 50 120, 70 85 Z"
                      fill="url(#shenron-scales)"
                      stroke="#022c22"
                      strokeWidth="3"
                    />

                    {/* Brow ridges */}
                    <path
                      d="M 68 85 C 85 92, 105 85, 115 95 M 125 95 C 135 85, 155 92, 172 85"
                      stroke="#022c22"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                    />

                    {/* Piercing Glowing Ruby Eyes */}
                    <g filter="url(#eye-glow)">
                      <polygon
                        points="82,98 104,95 98,108 80,104"
                        fill={stage === 'granting' ? '#ffffff' : '#ef4444'}
                        stroke="#b91c1c"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="138,95 160,98 162,104 144,108"
                        fill={stage === 'granting' ? '#ffffff' : '#ef4444'}
                        stroke="#b91c1c"
                        strokeWidth="1.5"
                      />
                    </g>

                    {/* Red Eye Flare Beams when granting wish or descending */}
                    {(stage === 'granting' || stage === 'descending') && (
                      <>
                        <line x1="92" y1="102" x2="10" y2="180" stroke="#ff1744" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                        <line x1="150" y1="102" x2="230" y2="180" stroke="#ff1744" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
                      </>
                    )}

                    {/* Snout and Nostrils */}
                    <ellipse cx="106" cy="155" rx="4" ry="7" fill="#022c22" />
                    <ellipse cx="134" cy="155" rx="4" ry="7" fill="#022c22" />

                    {/* Flowing Whiskers (Left & Right) */}
                    <path
                      d="M 85 155 C 40 160, 10 210, -20 190 C -40 175, -20 150, -45 130"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <animate attributeName="d" dur="3s" repeatCount="indefinite" values="
                        M 85 155 C 40 160, 10 210, -20 190 C -40 175, -20 150, -45 130;
                        M 85 155 C 35 150, 5 190, -15 210 C -35 190, -30 160, -50 140;
                        M 85 155 C 40 160, 10 210, -20 190 C -40 175, -20 150, -45 130
                      " />
                    </path>
                    <path
                      d="M 155 155 C 200 160, 230 210, 260 190 C 280 175, 260 150, 285 130"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    >
                      <animate attributeName="d" dur="3.2s" repeatCount="indefinite" values="
                        M 155 155 C 200 160, 230 210, 260 190 C 280 175, 260 150, 285 130;
                        M 155 155 C 205 150, 235 190, 255 210 C 275 190, 270 160, 290 140;
                        M 155 155 C 200 160, 230 210, 260 190 C 280 175, 260 150, 285 130
                      " />
                    </path>

                    {/* Sharp Dragon Teeth */}
                    <polygon points="100,175 106,188 112,175" fill="#ffffff" />
                    <polygon points="128,175 134,188 140,175" fill="#ffffff" />
                  </g>

                  {/* Dragon Claws */}
                  <g stroke="#022c22" strokeWidth="2" fill="#047857">
                    <g>
                      <animateTransform attributeName="transform" type="translate" values="0,0; -3,5; 0,0" dur="3.8s" repeatCount="indefinite" />
                      <path d="M 110 210 L 95 235 L 80 240 L 100 220 Z" />
                    </g>
                    <g>
                      <animateTransform attributeName="transform" type="translate" values="0,0; 4,3; 0,0" dur="4.2s" repeatCount="indefinite" />
                      <path d="M 490 210 L 505 235 L 520 240 L 500 220 Z" />
                    </g>
                  </g>
                </svg>

                {/* 7 Dragon Balls displayed across Shenron's chest */}
                <div className="absolute -bottom-3 flex items-center justify-center gap-1.5 sm:gap-2.5 bg-black/75 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full border border-amber-500/50 shadow-[0_0_15px_rgba(255,160,0,0.3)]">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                    <DragonBall
                      key={num}
                      count={num}
                      size={26}
                      glowing={stage !== 'granted'}
                      isStone={stage === 'granted'}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Descending Tagline Notice */}
              {stage === 'descending' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6 text-center"
                >
                  <p className="text-sm font-bold text-amber-300 font-['Chakra_Petch',sans-serif] tracking-wider animate-pulse">
                    🐉 SHENRON HAS DESCENDED FROM THE HEAVENS! 🐉
                  </p>
                </motion.div>
              )}

              {/* Shenron's Dialogue & Wish Card */}
              {(stage === 'summoned' || stage === 'granting' || stage === 'granted') && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full mt-5 bg-gradient-to-b from-[#121829]/95 via-[#0b0f1a]/95 to-[#070b14]/95 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 shadow-[0_0_35px_rgba(245,158,11,0.25)] backdrop-blur-md relative overflow-hidden"
                >
                  {/* Dragon Crest Header */}
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🐉</span>
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-amber-400 font-['Chakra_Petch',sans-serif] tracking-wider leading-tight">
                          SHENRON, THE ETERNAL DRAGON
                        </h3>
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest leading-tight block">
                          Weekly Target Conquered • {weeklyHours || '40.0'} hrs achieved
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-amber-300">
                      <Sparkles size={13} className="text-amber-400" />
                      1 Wish Available
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* SUB-VIEW A: SHENRON ASKING FOR WISH                     */}
                  {/* ======================================================= */}
                  {(stage === 'summoned' || stage === 'granting') && (
                    <div>
                      <div className="bg-black/50 rounded-xl p-3 border border-slate-700/60 mb-3.5">
                        <p className="text-xs sm:text-sm font-bold text-amber-200/90 leading-relaxed font-['Chakra_Petch',sans-serif] tracking-wide">
                          "I AM THE ETERNAL DRAGON SHENRON. YOU WHO HAVE GATHERED ALL SEVEN DRAGON BALLS AND MET YOUR GOAL... SPEAK! I SHALL GRANT ANY ONE WISH WITHIN MY POWER!"
                        </p>
                      </div>

                      {/* Preset Quick Wishes */}
                      <div className="mb-3.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Choose a Warrior's Wish:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {PRESET_WISHES.map((wish, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleMakeWish(wish)}
                              disabled={stage === 'granting'}
                              className="text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-amber-950/40 hover:border-amber-500/60 border border-slate-700/80 text-xs font-semibold text-gray-200 hover:text-amber-300 transition-all cursor-pointer active:scale-95 flex items-center justify-between group disabled:opacity-50"
                            >
                              <span className="truncate">{wish}</span>
                              <span className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                &rarr;
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Wish Input Field */}
                      <div className="pt-3 border-t border-slate-700/50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Or State Your Own Wish:
                        </span>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleMakeWish(customWish);
                          }}
                          className="flex items-center gap-2"
                        >
                          <input
                            ref={inputRef}
                            type="text"
                            value={customWish}
                            onChange={(e) => setCustomWish(e.target.value)}
                            placeholder="e.g. Turn my Friday meetings into a pizza buffet..."
                            disabled={stage === 'granting'}
                            maxLength={100}
                            className="flex-1 bg-black/50 border border-slate-600 focus:border-amber-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={!customWish.trim() || stage === 'granting'}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-black font-black rounded-xl text-xs sm:text-sm font-['Chakra_Petch',sans-serif] tracking-wider uppercase cursor-pointer active:scale-95 transition-all shadow-[0_0_12px_rgba(255,160,0,0.5)] flex items-center gap-1.5 shrink-0"
                          >
                            {stage === 'granting' ? (
                              <>
                                <RefreshCw size={14} className="animate-spin" />
                                Granting...
                              </>
                            ) : (
                              <>
                                <Send size={14} />
                                Grant Wish!
                              </>
                            )}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SUB-VIEW B: FORTUNE COOKIE REPLY GRANTED               */}
                  {/* ======================================================= */}
                  {stage === 'granted' && fortune && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-3.5"
                    >
                      {/* User's Original Wish */}
                      <div className="text-center text-xs text-amber-300/80 font-medium">
                        Your Wish: <span className="text-white italic">"{selectedWish}"</span>
                      </div>

                      {/* Authentic Toriyama Fortune Scroll Card */}
                      <div className="relative bg-gradient-to-b from-[#1c1917] via-[#292524] to-[#1c1917] border-2 border-amber-400 rounded-xl p-4 sm:p-5 shadow-2xl text-center overflow-hidden">
                        {/* Corner Kanji / Crest Badges */}
                        <div className="absolute top-2 left-3 text-[10px] font-black text-amber-500/40 uppercase font-mono">
                          亀 TURTLE SCHOOL
                        </div>
                        <div className="absolute top-2 right-3 text-[10px] font-black text-amber-500/40 uppercase font-mono">
                          神 KAMI SEAL
                        </div>

                        {/* Shenron's Decree */}
                        <div className="my-2.5">
                          <p className="text-base sm:text-xl font-black text-amber-400 font-['Chakra_Petch',sans-serif] tracking-wider leading-snug drop-shadow-md">
                            "{fortune.quote}"
                          </p>
                        </div>

                        {/* Fortune Prophecy / Wisdom */}
                        <div className="my-3 px-3 py-2.5 rounded-lg bg-black/40 border border-amber-500/30">
                          <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block mb-0.5">
                            📜 The Sacred Fortune:
                          </span>
                          <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed">
                            {fortune.wisdom}
                          </p>
                        </div>

                        {/* Stats & Lucky Attributes Row */}
                        <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-amber-500/30">
                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              Power Level
                            </span>
                            <span className="text-xs font-black text-red-500 font-mono mt-0.5">
                              {fortune.powerLevel > 9000 ? 'OVER 9,000!' : fortune.powerLevel.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              Lucky Ball
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <DragonBall count={fortune.luckyDragonBall} size={16} />
                              <span className="text-xs font-bold text-amber-400">
                                {fortune.luckyDragonBall}-Star
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                              Patron Warrior
                            </span>
                            <span className="text-xs font-bold text-emerald-400 truncate mt-0.5">
                              {fortune.characterSign}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shenron's Farewell Notice */}
                      <div className="text-center text-xs text-gray-400 font-semibold uppercase tracking-widest">
                        "YOUR WISH HAS BEEN GRANTED. NOW, FAREWELL!"
                        <div className="text-[10px] text-gray-500 mt-0.5 normal-case">
                          (The Dragon Balls have turned to stone and scattered across the Earth)
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                        <button
                          onClick={handleCopyFortune}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          {copied ? 'Copied to Clipboard!' : 'Copy Fortune'}
                        </button>

                        <button
                          onClick={handleReSummon}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <RefreshCw size={14} />
                          Make Another Wish
                        </button>

                        <button
                          onClick={onClose}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-lg"
                        >
                          Back to WorkLogger
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default ShenronModal;
