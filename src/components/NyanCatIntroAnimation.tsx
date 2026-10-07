import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Star } from 'lucide-react';
import { nyanCatAudio } from '../utils/nyanCatAudio';
import nyanCatImg from '../assets/nyan_cat.png';
import {
  PixelSuperman,
  PixelUFO,
  PixelRingPlanet,
  PixelCraterPlanet,
  PixelGasGiant,
} from './NyanCatSpaceElements';

interface NyanCatIntroAnimationProps {
  onComplete?: () => void;
  targetBlockId?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface SpaceStar {
  id: number;
  y: number;
  duration: number;
  delay: number;
  size: number;
  type: number;
}

// ─── Authentic 6-Color Nyan Cat Rainbow Palette ─────────────────────────────
const RAINBOW_COLORS = [
  '#FF0000', // Red
  '#FF9900', // Orange
  '#FFFF00', // Yellow
  '#33FF00', // Green
  '#0099FF', // Blue
  '#6633FF', // Violet
];

// ─── Wavy Stepped Rainbow Trail ─────────────────────────────────────────────
// Undulates in horizontal segments behind Nyan Cat, exactly matching the classic animation
function WavyRainbowTrail({ frame }: { frame: number }) {
  const segmentWidth = 18;
  const numSegments = Math.ceil((typeof window !== 'undefined' ? window.innerWidth : 1400) / segmentWidth) + 12;
  const bandHeight = 5; // 6 bands * 5px = 30px height
  const waveAmp = 4;
  const totalHeight = 30 + waveAmp;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: totalHeight,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: numSegments }).map((_, i) => {
        // Alternating wave offset matching the classic YouTube animation rhythm
        const isUp = (i + frame) % 2 === 0;
        const offsetY = isUp ? 0 : waveAmp;
        return (
          <div
            key={i}
            style={{
              width: segmentWidth,
              height: totalHeight,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: offsetY,
                left: 0,
                width: segmentWidth,
                height: 30,
              }}
            >
              {RAINBOW_COLORS.map((c, ci) => (
                <div
                  key={ci}
                  style={{
                    height: bandHeight,
                    backgroundColor: c,
                    width: '100%',
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Retro Space Pixel Star (Streaming backwards) ───────────────────────────
function RetroSpaceStar({ type, size }: { type: number; size: number }) {
  if (type === 0) {
    // 4-point cross star
    return (
      <svg width={size * 3} height={size * 3} viewBox="0 0 9 9" style={{ imageRendering: 'pixelated', display: 'block' }}>
        <g fill="#ffffff">
          <rect x="0" y="4" width="9" height="1" />
          <rect x="4" y="0" width="1" height="9" />
          <rect x="3" y="3" width="3" height="3" />
        </g>
      </svg>
    );
  }
  if (type === 1) {
    // Diamond ring sparkler
    return (
      <svg width={size * 3} height={size * 3} viewBox="0 0 8 8" style={{ imageRendering: 'pixelated', display: 'block' }}>
        <g fill="#ffffff">
          <rect x="3" y="0" width="2" height="2" />
          <rect x="3" y="6" width="2" height="2" />
          <rect x="0" y="3" width="2" height="2" />
          <rect x="6" y="3" width="2" height="2" />
          <rect x="1" y="1" width="1" height="1" />
          <rect x="6" y="1" width="1" height="1" />
          <rect x="1" y="6" width="1" height="1" />
          <rect x="6" y="6" width="1" height="1" />
        </g>
      </svg>
    );
  }
  // Single/double pixel sparkle
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: '#ffffff',
        boxShadow: '0 0 4px #ffffff',
      }}
    />
  );
}

// ─── Star Particle Colors ──────────────────────────────────────────────────
const PARTICLE_COLORS = [
  '#FFD700', '#FF69B4', '#00FFFF', '#FF6347', '#ADFF2F',
  '#FF00FF', '#FFA500', '#7FFF00', '#00CED1', '#FFB6C1', '#FFFFFF',
];

// ─── Achievement Toast ──────────────────────────────────────────────────────
function AchievementToast({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 100001,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'linear-gradient(135deg, rgba(0, 34, 68, 0.96) 0%, rgba(5, 44, 84, 0.96) 100%)',
        border: '3px solid',
        borderImage: 'linear-gradient(90deg, #FF0000, #FF9900, #FFFF00, #33FF00, #0099FF, #6633FF) 1',
        padding: '10px 16px',
        boxShadow: '0 0 24px rgba(0, 153, 255, 0.45), 0 8px 24px rgba(0,0,0,0.8)',
        fontFamily: "'Press Start 2P', 'Pixelify Sans', monospace, sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          background: 'linear-gradient(135deg, #FFD700, #FFA500)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          border: '2px solid #FF9900',
        }}
      >
        <Star size={22} color="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </div>
      <div>
        <div
          style={{
            color: '#FFD700',
            fontSize: 10,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(255, 215, 0, 0.6)',
          }}
        >
          ★ Nyan Complete! ★
        </div>
        <div style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', marginTop: 2 }}>
          {count > 0 ? `Rainbow trail: ${count} block${count !== 1 ? 's' : ''} placed!` : 'Nyan Cat has flown!'}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Animation Overlay Component ───────────────────────────────────────
export default function NyanCatIntroAnimation({ onComplete, targetBlockId }: NyanCatIntroAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [nyanY, setNyanY] = useState(300);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [animStarted, setAnimStarted] = useState(false);
  const [nyanVisible, setNyanVisible] = useState(false); // Only appears at 0:04 mark!
  const [introCountdown, setIntroCountdown] = useState(3);
  const [frame, setFrame] = useState(0);
  const [ufoLightPhase, setUfoLightPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setUfoLightPhase(p => (p + 1) % 5), 250);
    return () => clearInterval(timer);
  }, []);

  const nyanControls = useAnimation();

  const nyanRef = useRef<HTMLDivElement>(null);
  const blockMapRef = useRef<Map<HTMLElement, { rect: DOMRect; revealed: boolean }>>(new Map());
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);
  const soundCountRef = useRef(0);
  const particleIdRef = useRef(0);

  // Generate streaming space stars that zoom backwards
  const spaceStars = useMemo<SpaceStar[]>(() => {
    const list: SpaceStar[] = [];
    const count = 26;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        y: Math.random() * (vh - 100) + 50,
        duration: 1.4 + Math.random() * 2.0, // fast space zoom
        delay: Math.random() * 2.0,
        size: Math.random() > 0.6 ? 5 : Math.random() > 0.3 ? 3 : 2,
        type: Math.floor(Math.random() * 3),
      });
    }
    return list;
  }, []);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Animate rainbow wave ripple & cat bobbing every 120ms
  useEffect(() => {
    if (!nyanVisible) return;
    const interval = setInterval(() => {
      setFrame(f => f + 1);
    }, 120);
    return () => clearInterval(interval);
  }, [nyanVisible]);

  // Countdown timer during 0:00 to 0:03 intro
  useEffect(() => {
    if (nyanVisible) return;
    const t1 = setTimeout(() => setIntroCountdown(2), 1100);
    const t2 = setTimeout(() => setIntroCountdown(1), 2200);
    const t3 = setTimeout(() => setIntroCountdown(0), 3300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [nyanVisible]);

  // Spawn sparkle particles at a viewport position
  const spawnParticles = useCallback((px: number, py: number, count = 4) => {
    const newPs: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      newPs.push({
        id: particleIdRef.current++,
        x: px + (Math.random() - 0.5) * 16,
        y: py + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: Math.random() > 0.5 ? 4 : 5,
      });
    }
    setParticles(prev => [...prev.slice(-35), ...newPs]);
  }, []);

  // Update particles physics
  useEffect(() => {
    if (particles.length === 0) return;
    const anim = requestAnimationFrame(() => {
      setParticles(prev =>
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx * 0.016,
            y: p.y + p.vy * 0.016 + 1.2,
            size: p.size * 0.96,
          }))
          .filter(p => p.size > 0.8)
      );
    });
    return () => cancelAnimationFrame(anim);
  }, [particles]);

  const handleDismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    timeoutsRef.current.forEach(clearTimeout);

    // Stop music as Nyan Cat disappears
    nyanCatAudio.stopNyanSong(120);

    // Restore all block clips immediately
    blockMapRef.current.forEach((_, el) => {
      el.style.opacity = '';
      el.style.transform = '';
      el.style.transition = '';
      el.style.clipPath = '';
    });

    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  // Allow clicking anywhere or pressing Escape to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  // Main animation sequence
  useEffect(() => {
    const initTimer = setTimeout(() => {
      requestAnimationFrame(async () => {
        let blocks: NodeListOf<Element> | Element[] = [];
        if (targetBlockId) {
          const el = document.getElementById(`worklog-${targetBlockId}`);
          if (el) blocks = [el];
        } else {
          blocks = document.querySelectorAll('.nyancat-overlay');
        }

        const blockArr = Array.from(blocks) as HTMLElement[];

        // Store block positions and prepare them
        blockArr.forEach(el => {
          const rect = el.getBoundingClientRect();
          blockMapRef.current.set(el, { rect, revealed: false });
          el.style.opacity = '1';
          el.style.transform = 'none';
          el.style.clipPath = 'inset(0 100% 0 0)';
          el.style.transition = 'none';
        });
        setTotalBlocks(blockArr.length);
        setAnimStarted(true);

        // 1. START OFFICIAL NYAN CAT MUSIC IMMEDIATELY AT 0:00!
        // The music begins with the iconic intro (0:00 to 0:03).
        nyanCatAudio.playNyanSong(0.0, 0.5);

        // 2. WAIT FOR THE 0:04 MARK (approx 3.92s) BEFORE NYAN CAT APPEARS!
        // Synchronized to audio.currentTime with safety timer fallback.
        await new Promise<void>((resolve) => {
          let resolved = false;
          const checkAudioProgress = () => {
            if (resolved || doneRef.current) return;
            const curTime = nyanCatAudio.getCurrentTime();
            if (curTime >= 3.92) {
              resolved = true;
              resolve();
              return;
            }
            requestAnimationFrame(checkAudioProgress);
          };
          requestAnimationFrame(checkAudioProgress);

          addTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }, 3950);
        });

        if (doneRef.current) return;

        // 3. THE 0:04 MARK HAS ARRIVED! NYAN CAT APPEARS!
        setNyanVisible(true);

        const walkStart = -130;
        const walkEnd = window.innerWidth + 130;
        const nyanHeight = 45; // exact height of real nyan cat sprite
        const speed = 560; // constant silky-smooth flight speed in px/s
        const nyanOffset = 18; // rainbow trail connects 18px from left of nyan cat

        if (blockArr.length === 0) {
          const mainEl = document.querySelector('main');
          const mainRect = mainEl?.getBoundingClientRect();
          setNyanY(mainRect ? mainRect.top + mainRect.height / 2 - nyanHeight / 2 : window.innerHeight / 2 - nyanHeight / 2);

          const duration = (walkEnd - walkStart) / speed;
          nyanControls.set({ x: walkStart });
          await nyanControls.start({ x: walkEnd, transition: { duration, ease: 'linear' } });

          // As Nyan Cat disappears past walkEnd, so does the music!
          nyanCatAudio.stopNyanSong(180);

          if (!doneRef.current) {
            if (!targetBlockId) {
              setShowAchievement(true);
              nyanCatAudio.playAchievementFanfare();
            }
            addTimeout(() => handleDismiss(), targetBlockId ? 400 : 2500);
          }
          return;
        }

        // Group blocks by row (Y coordinate)
        const rowsMap = new Map<number, HTMLElement[]>();
        blockArr.forEach(el => {
          const rect = el.getBoundingClientRect();
          const yKey = Math.round(rect.top / 10) * 10;
          if (!rowsMap.has(yKey)) rowsMap.set(yKey, []);
          rowsMap.get(yKey)!.push(el);
        });

        const sortedYKeys = Array.from(rowsMap.keys()).sort((a, b) => a - b);
        const rows = sortedYKeys.map(yKey => {
          const elements = rowsMap.get(yKey)!;
          elements.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          const avgTop = elements.reduce((sum, el) => sum + el.getBoundingClientRect().top, 0) / elements.length;
          const height = elements[0].getBoundingClientRect().height;
          return {
            y: avgTop + height / 2 - nyanHeight / 2,
            elements,
          };
        });

        // Loop through each row: Nyan Cat glides smoothly across the row!
        for (let rIdx = 0; rIdx < rows.length; rIdx++) {
          if (doneRef.current) break;
          const row = rows[rIdx];

          setNyanY(row.y);
          nyanControls.set({ x: walkStart });

          const totalDistance = walkEnd - walkStart;
          const flightDuration = totalDistance / speed;
          const startTime = performance.now();

          // Launch smooth linear flight across the entire row
          const flightPromise = nyanControls.start({
            x: walkEnd,
            transition: { duration: flightDuration, ease: 'linear' },
          });

          // Continuously reveal blocks in real time as Nyan Cat's rainbow glides across them
          const updateRowBlocks = () => {
            if (doneRef.current) return;
            const now = performance.now();
            const elapsed = (now - startTime) / 1000;
            const currentX = walkStart + elapsed * speed;
            const rainbowX = currentX + nyanOffset;

            for (const el of row.elements) {
              const info = blockMapRef.current.get(el);
              if (!info) continue;
              const rect = info.rect;

              if (rainbowX >= rect.left) {
                if (rainbowX >= rect.right) {
                  if (!info.revealed) {
                    info.revealed = true;
                    el.style.clipPath = 'inset(0 0% 0 0)';
                    nyanCatAudio.playRainbowSparkle(soundCountRef.current++);
                    spawnParticles(rect.right, rect.top + rect.height / 2, 5);
                  }
                } else {
                  // Currently crossing the block
                  const percentLeft = Math.max(0, Math.min(100, (1 - (rainbowX - rect.left) / rect.width) * 100));
                  el.style.clipPath = `inset(0 ${percentLeft}% 0 0)`;
                  if (Math.random() < 0.25) {
                    spawnParticles(rainbowX, rect.top + rect.height / 2, 2);
                  }
                }
              }
            }

            if (elapsed < flightDuration && !doneRef.current) {
              requestAnimationFrame(updateRowBlocks);
            }
          };

          requestAnimationFrame(updateRowBlocks);
          await flightPromise;

          // Ensure all blocks in this row are fully unclipped
          row.elements.forEach(el => {
            el.style.clipPath = 'inset(0 0% 0 0)';
          });

          // If this was the last row, Nyan Cat has disappeared off the screen!
          if (rIdx === rows.length - 1) {
            // "as it disappears so does the music."
            nyanCatAudio.stopNyanSong(180);
          } else {
            // Brief gap between passes
            await new Promise(r => setTimeout(r, 120));
          }
        }

        if (!doneRef.current) {
          // Reveal any missed blocks
          blockMapRef.current.forEach((info, el) => {
            if (!info.revealed) {
              info.revealed = true;
              el.style.clipPath = 'inset(0 0% 0 0)';
            }
          });

          if (!targetBlockId) {
            setShowAchievement(true);
            nyanCatAudio.playAchievementFanfare();
            nyanCatAudio.playNyanMeow();
          }
          addTimeout(() => handleDismiss(), targetBlockId ? 400 : 2500);
        }
      });
    }, 200);

    return () => {
      clearTimeout(initTimer);
      timeoutsRef.current.forEach(clearTimeout);
      nyanCatAudio.stopNyanSong(120);
      blockMapRef.current.forEach((_, el) => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
        el.style.clipPath = '';
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const walkStart = -130;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleDismiss}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          {/* Background Space Streaming Stars (Zooming backwards from right to left like YouTube video) */}
          {animStarted &&
            spaceStars.map(s => (
              <motion.div
                key={s.id}
                initial={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1400) + 40, y: s.y }}
                animate={{ x: -80 }}
                transition={{
                  duration: s.duration,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: s.delay,
                }}
                style={{
                  position: 'absolute',
                  pointerEvents: 'none',
                  zIndex: 99998,
                }}
              >
                <RetroSpaceStar type={s.type} size={s.size} />
              </motion.div>
            ))}

          {/* ── Space Background Planets ── */}
          {animStarted && (
            <>
              {/* Top-Left: Saturn-style Ring Planet */}
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  top: 50,
                  left: 40,
                  zIndex: 99997,
                  pointerEvents: 'none',
                  opacity: 0.85,
                }}
              >
                <PixelRingPlanet size={64} />
              </motion.div>

              {/* Top-Right: Gas Giant */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                style={{
                  position: 'absolute',
                  top: 70,
                  right: 60,
                  zIndex: 99997,
                  pointerEvents: 'none',
                  opacity: 0.8,
                }}
              >
                <PixelGasGiant size={58} />
              </motion.div>

              {/* Bottom-Left: Turquoise Crater Planet */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                style={{
                  position: 'absolute',
                  bottom: 100,
                  left: 50,
                  zIndex: 99997,
                  pointerEvents: 'none',
                  opacity: 0.75,
                }}
              >
                <PixelCraterPlanet size={46} />
              </motion.div>

              {/* ── Flying UFOs ── */}
              {/* UFO 1: Zipping across space from right to left with beaming light */}
              <motion.div
                initial={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1400) + 80, y: 130 }}
                animate={{ x: -120, y: [130, 110, 140, 120, 130] }}
                transition={{
                  x: { duration: 9, repeat: Infinity, ease: 'linear', delay: 0.5 },
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 99998,
                  pointerEvents: 'none',
                }}
              >
                <PixelUFO width={52} lightPhase={ufoLightPhase} beam={true} />
              </motion.div>

              {/* UFO 2: Hovering and bobbing in the lower area */}
              <motion.div
                initial={{ x: (typeof window !== 'undefined' ? window.innerWidth : 1400) + 100, y: 460 }}
                animate={{ x: -120, y: [460, 480, 450, 470, 460] }}
                transition={{
                  x: { duration: 12, repeat: Infinity, ease: 'linear', delay: 3.5 },
                  y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 99998,
                  pointerEvents: 'none',
                }}
              >
                <PixelUFO width={42} lightPhase={(ufoLightPhase + 2) % 5} beam={false} />
              </motion.div>

              {/* ── SUPERMAN HEROIC FLYBY! ── */}
              {/* Flying heroically across the upper stars! */}
              <motion.div
                initial={{ x: -140, y: 80 }}
                animate={{
                  x: (typeof window !== 'undefined' ? window.innerWidth : 1400) + 140,
                  y: [80, 68, 92, 76, 80],
                }}
                transition={{
                  x: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
                  y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 99998,
                  pointerEvents: 'none',
                  filter: 'drop-shadow(0 0 12px rgba(0, 102, 255, 0.8))',
                }}
              >
                <PixelSuperman width={72} />
              </motion.div>
            </>
          )}

          {/* Intro Teaser HUD (100% Dead-Center across all viewports) */}
          <AnimatePresence>
            {animStarted && !nyanVisible && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100000,
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1, filter: 'blur(6px)' }}
                  transition={{ duration: 0.25 }}
                  style={{
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(0, 34, 68, 0.92)',
                      border: '3px solid #FFD700',
                      boxShadow: '0 0 24px rgba(0, 153, 255, 0.7), 0 0 48px rgba(255, 215, 0, 0.45)',
                      padding: '16px 32px',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontFamily: "'Press Start 2P', monospace",
                        color: '#FFD700',
                        textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 105, 180, 0.7)',
                        letterSpacing: '0.12em',
                        marginBottom: 10,
                      }}
                    >
                      ★ NYAN CAT INCOMING ★
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontFamily: "'Press Start 2P', monospace",
                        color: '#00FFFF',
                        textShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {introCountdown > 0 ? `LAUNCH IN ${introCountdown}...` : 'NYAN TIME!'}
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Nyan Cat Flying Across Screen (Appears at 0:04 mark!) */}
          {nyanVisible && (
            <motion.div
              ref={nyanRef}
              initial={{ x: walkStart }}
              animate={nyanControls}
              style={{
                position: 'absolute',
                top: nyanY,
                left: 0,
                zIndex: 100000,
                pointerEvents: 'none',
              }}
            >
              {/* Rainbow trail strictly BEHIND Nyan Cat (clipped at the back of the pop-tart, zero spill forward) */}
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 'calc(100% - 18px)', // ends right at the back of the pop-tart body, behind the tail!
                  transform: 'translateY(-50%)',
                  width: '100vw',
                  height: 36,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 1,
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <WavyRainbowTrail frame={frame} />
              </div>

              {/* The Real Authentic Nyan Cat Sprite */}
              <div style={{ position: 'relative', zIndex: 2 }}>
                <motion.img
                  src={nyanCatImg}
                  alt="Nyan Cat"
                  style={{
                    width: 76,
                    height: 45,
                    imageRendering: 'pixelated',
                    display: 'block',
                    filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))',
                  }}
                  animate={{ y: [0, -4, 0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.22, ease: 'easeInOut' }}
                />
              </div>

              {/* Speech bubble */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 25 }}
                style={{
                  position: 'absolute',
                  top: -30,
                  left: 20,
                  background: 'linear-gradient(135deg, rgba(0, 34, 68, 0.95), rgba(5, 44, 84, 0.95))',
                  color: '#FFD700',
                  border: '2px solid rgba(255, 215, 0, 0.6)',
                  fontSize: 10,
                  fontFamily: "'Press Start 2P', 'Pixelify Sans', monospace, sans-serif",
                  fontWeight: 'bold',
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  letterSpacing: '0.03em',
                  borderRadius: 4,
                  textShadow: '0 0 6px rgba(255, 215, 0, 0.5)',
                  zIndex: 3,
                }}
              >
                🌈 Nyan~!
              </motion.div>
            </motion.div>
          )}

          {/* Sparkle Particles */}
          <AnimatePresence>
            {particles.map(p => (
              <motion.div
                key={p.id}
                initial={{
                  x: p.x,
                  y: p.y,
                  scale: 1,
                  opacity: 1,
                }}
                animate={{
                  x: p.x,
                  y: p.y,
                  scale: 0.4,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  boxShadow: `0 0 8px ${p.color}, 0 0 14px ${p.color}`,
                  borderRadius: p.size > 5 ? 1 : 0,
                  imageRendering: 'pixelated',
                  pointerEvents: 'none',
                  zIndex: 100002,
                }}
              />
            ))}
          </AnimatePresence>

          {/* Achievement Fanfare Toast */}
          <AnimatePresence>
            {showAchievement && <AchievementToast count={totalBlocks} />}
          </AnimatePresence>

          {/* Skip Hint */}
          <div
            style={{
              position: 'fixed',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: 10,
              fontFamily: "'Press Start 2P', monospace",
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid rgba(0, 153, 255, 0.4)',
              background: 'rgba(0, 34, 68, 0.75)',
              letterSpacing: '0.08em',
              zIndex: 100001,
            }}
          >
            CLICK OR PRESS ESC TO SKIP
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
