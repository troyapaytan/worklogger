import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Award } from 'lucide-react';
import { minecraftAudio } from '../utils/minecraftAudio';

interface MinecraftIntroAnimationProps {
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

// ─── Steve Color Palette (official Minecraft skin texture) ──────────────────
const C = {
  hair: '#4B3725',
  hairDk: '#3B2B1A',
  skin: '#C49A6C',
  skinSh: '#A67C52',
  eyeW: '#FFFFFF',
  eyeP: '#2F2F73',
  mouth: '#695132',
  shirt: '#00AAAA',
  shirtDk: '#009999',
  pants: '#3B3B96',
  pantsDk: '#29297C',
  shoes: '#444444',
  shoesDk: '#333333',
} as const;

const _ = null; // transparent pixel

// ─── Pixel Grids (each cell = 1 MC pixel) ───────────────────────────────────
// Head (8×8)
const HEAD: (string | null)[][] = [
  [C.hair, C.hair, C.hair, C.hair, C.hair, C.hair, C.hair, C.hair],
  [C.hair, C.hair, C.hair, C.hair, C.hair, C.hair, C.hair, C.hair],
  [C.hair, C.hair, C.hair, C.skin, C.skin, C.skin, C.skin, C.skin],
  [C.skin, C.skin, C.skin, C.skin, C.skin, C.skin, C.skin, C.skin],
  [C.skin, C.skin, C.skin, C.skin, C.skin, C.skin, C.skin, C.skin], // Extra skin row
  [C.skin, C.skin, C.skin, C.eyeW, C.eyeP, C.skin, C.eyeW, C.eyeP], // Eyes moved down
  [C.skin, C.skin, C.skin, C.skin, C.skin, C.skinSh, C.skinSh, C.skin], // Nose moved down
  [C.skin, C.skin, C.skin, C.skin, C.mouth, C.mouth, C.mouth, C.mouth], // Mouth moved down
];

// Body / torso (8×12)
const BODY: (string | null)[][] = [
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirtDk, C.shirtDk, C.shirtDk, C.shirtDk, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirtDk, C.shirtDk, C.shirtDk, C.shirtDk, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirtDk, C.shirtDk, C.shirtDk, C.shirtDk, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirtDk, C.shirtDk, C.shirtDk, C.shirtDk, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirtDk, C.shirtDk, C.shirtDk, C.shirtDk, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt, C.shirt],
];

// Arm (4×12): upper=sleeve, lower=skin
const ARM: (string | null)[][] = [
  [C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirtDk, C.shirtDk, C.shirt],
  [C.shirt, C.shirtDk, C.shirtDk, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirt, C.shirt, C.shirt],
  [C.shirt, C.shirtDk, C.shirtDk, C.shirt],
  [C.skin, C.skin, C.skin, C.skin],
  [C.skin, C.skinSh, C.skinSh, C.skin],
  [C.skin, C.skinSh, C.skinSh, C.skin],
  [C.skin, C.skin, C.skin, C.skin],
  [C.skin, C.skin, C.skin, C.skin],
  [C.skin, C.skinSh, C.skinSh, C.skin],
];

// Leg (4×12): pants + shoes at bottom
const LEG: (string | null)[][] = [
  [C.pants, C.pants, C.pants, C.pants],
  [C.pants, C.pantsDk, C.pantsDk, C.pants],
  [C.pants, C.pantsDk, C.pantsDk, C.pants],
  [C.pants, C.pants, C.pants, C.pants],
  [C.pants, C.pants, C.pants, C.pants],
  [C.pants, C.pantsDk, C.pantsDk, C.pants],
  [C.pants, C.pantsDk, C.pantsDk, C.pants],
  [C.pants, C.pants, C.pants, C.pants],
  [C.pants, C.pants, C.pants, C.pants],
  [C.pants, C.pantsDk, C.pantsDk, C.pants],
  [C.shoes, C.shoes, C.shoes, C.shoes],
  [C.shoesDk, C.shoesDk, C.shoesDk, C.shoesDk],
];

// Pickaxe (5×5): diamond head + stick
const PICKAXE: (string | null)[][] = [
  [_, '#4AEDD9', '#4AEDD9', '#4AEDD9', _],
  [_, _, _, '#4AEDD9', _],
  [_, _, '#8B5A2B', _, _],
  [_, '#8B5A2B', _, _, _],
  ['#8B5A2B', _, _, _, _],
];

// ─── SVG Pixel Grid Renderer ────────────────────────────────────────────────
const PX = 4; // CSS pixels per MC pixel

function PixelGrid({
  grid,
  width: w,
  height: h,
}: {
  grid: (string | null)[][];
  width: number;
  height: number;
}) {
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c) {
        rects.push(
          <rect key={`${x}-${y}`} x={x * PX} y={y * PX} width={PX} height={PX} fill={c} />
        );
      }
    }
  }
  return (
    <svg
      width={w * PX}
      height={h * PX}
      viewBox={`0 0 ${w * PX} ${h * PX}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {rects}
    </svg>
  );
}

// ─── Steve Character Component ──────────────────────────────────────────────
function SteveCharacter() {
  // Dimensions at PX=4:
  // Head: 8*4=32×32  |  Body: 8*4=32×48  |  Arm: 4*4=16×48  |  Leg: 4*4=16×48
  // Layout: [Arm16][Head/Body32][Arm16] = 64px wide
  // Height: 32(head) + 48(body) + 48(legs) = 128px
  const headW = 8, headH = 8;
  const bodyW = 8, bodyH = 12;
  const armW = 4, armH = 12;
  const legW = 4, legH = 12;

  return (
    <div
      style={{
        position: 'relative',
        width: (armW + bodyW + armW) * PX,   // 64
        height: (headH + bodyH + legH) * PX, // 128
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
        transform: 'scaleX(-1)',
      }}
    >
      {/* Head (centered over body area) */}
      <div style={{ position: 'absolute', top: 0, left: armW * PX, zIndex: 5 }}>
        <PixelGrid grid={HEAD} width={headW} height={headH} />
      </div>

      {/* Left Arm (behind body) */}
      <motion.div
        animate={{ rotate: [25, -25, 25] }}
        transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: headH * PX,
          left: 0,
          transformOrigin: 'center top',
          zIndex: 1,
        }}
      >
        <PixelGrid grid={ARM} width={armW} height={armH} />
      </motion.div>

      {/* Body (center) */}
      <div style={{ position: 'absolute', top: headH * PX, left: armW * PX, zIndex: 3 }}>
        <PixelGrid grid={BODY} width={bodyW} height={bodyH} />
      </div>

      {/* Right Arm (front, holds pickaxe) */}
      <motion.div
        animate={{ rotate: [-25, 25, -25] }}
        transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: headH * PX,
          left: (armW + bodyW) * PX,
          transformOrigin: 'center top',
          zIndex: 4,
        }}
      >
        <PixelGrid grid={ARM} width={armW} height={armH} />
        {/* Pickaxe attached to hand */}
        <div
          style={{
            position: 'absolute',
            bottom: -2 * PX,
            right: -3 * PX,
            transform: 'rotate(25deg)',
            transformOrigin: 'top left',
            zIndex: 6,
          }}
        >
          <PixelGrid grid={PICKAXE} width={5} height={5} />
        </div>
      </motion.div>

      {/* Left Leg */}
      <motion.div
        animate={{ rotate: [20, -20, 20] }}
        transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: (headH + bodyH) * PX,
          left: armW * PX,
          transformOrigin: 'center top',
          zIndex: 2,
        }}
      >
        <PixelGrid grid={LEG} width={legW} height={legH} />
      </motion.div>

      {/* Right Leg */}
      <motion.div
        animate={{ rotate: [-20, 20, -20] }}
        transition={{ repeat: Infinity, duration: 0.45, ease: 'linear' }}
        style={{
          position: 'absolute',
          top: (headH + bodyH) * PX,
          left: (armW + legW) * PX,
          transformOrigin: 'center top',
          zIndex: 2,
        }}
      >
        <PixelGrid grid={LEG} width={legW} height={legH} />
      </motion.div>
    </div>
  );
}

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
        backgroundColor: '#212121',
        border: '4px solid',
        borderTopColor: '#5a5a5a',
        borderLeftColor: '#5a5a5a',
        borderBottomColor: '#141414',
        borderRightColor: '#141414',
        padding: '10px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
        fontFamily: "'Pixelify Sans', monospace, sans-serif",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          backgroundColor: '#3a3a3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #555',
        }}
      >
        <Award size={24} color="#FFFF55" style={{ filter: 'drop-shadow(0 2px 0 #333)' }} />
      </div>
      <div>
        <div
          style={{
            color: '#FFFF55',
            fontSize: 12,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Achievement Get!
        </div>
        <div style={{ color: '#FFFFFF', fontSize: 14, fontWeight: 600, letterSpacing: '0.03em' }}>
          {count > 0 ? `Gantt Assembled: ${count} block${count !== 1 ? 's' : ''} placed!` : 'Empty Inventory — No blocks to mine!'}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Particle Colors (Minecraft block palette) ─────────────────────────────
const PARTICLE_COLORS = [
  '#5DB75D', '#4AEDD9', '#FF5555', '#DFA823', '#866043',
  '#55FF55', '#4A9E4A', '#6EF3E5', '#FFFFFF', '#C6C6C6',
];

// ─── Main Overlay Component ─────────────────────────────────────────────────
export default function MinecraftIntroAnimation({ onComplete, targetBlockId }: MinecraftIntroAnimationProps) {
  const [visible, setVisible] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showAchievement, setShowAchievement] = useState(false);
  const [steveY, setSteveY] = useState(300);
  const [totalRevealed, setTotalRevealed] = useState(0);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [animStarted, setAnimStarted] = useState(false);

  const steveControls = useAnimation();

  const steveRef = useRef<HTMLDivElement>(null);
  const blockMapRef = useRef<Map<HTMLElement, { rect: DOMRect; revealed: boolean }>>(new Map());
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const doneRef = useRef(false);
  const soundCountRef = useRef(0);
  const particleIdRef = useRef(0);

  const addTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  // Spawn burst particles at a viewport position
  const spawnParticles = useCallback((px: number, py: number, count = 8) => {
    const newPs: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      newPs.push({
        id: particleIdRef.current++,
        x: px + (Math.random() - 0.5) * 20,
        y: py + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        size: 4 + Math.floor(Math.random() * 6),
      });
    }
    setParticles(prev => [...prev.slice(-40), ...newPs]);
  }, []);

  // Reveal a single block with pop animation
  const revealBlock = useCallback((el: HTMLElement) => {
    el.style.transition = 'opacity 0.15s ease-out, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.opacity = '1';
    el.style.transform = 'scale(1)';
  }, []);

  // Skip / dismiss
  const handleDismiss = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    // Clear all timers
    timeoutsRef.current.forEach(clearTimeout);
    steveControls.stop();

    // Reveal all blocks immediately
    blockMapRef.current.forEach((info, el) => {
      if (!info.revealed) {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = '';
        el.style.clipPath = '';
      }
    });

    // Clean up inline styles after a tick
    requestAnimationFrame(() => {
      blockMapRef.current.forEach((_, el) => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
        el.style.clipPath = '';
      });
    });

    minecraftAudio.playButtonClick();
    setVisible(false);
    addTimeout(() => {
      onComplete?.();
    }, 400);
  }, [onComplete, addTimeout]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDismiss]);

  // Main animation sequence
  useEffect(() => {
    // Small delay to let the Gantt blocks render with minecraft-texture-overlay class
    const initTimer = setTimeout(() => {
      requestAnimationFrame(async () => {
        // Find all worklog blocks or just the target block
        let blocks: NodeListOf<Element> | Element[] = [];
        if (targetBlockId) {
          const el = document.getElementById(`worklog-${targetBlockId}`);
          if (el) blocks = [el];
        } else {
          blocks = document.querySelectorAll('.minecraft-texture-overlay');
        }
        
        const blockArr = Array.from(blocks) as HTMLElement[];

        // Store block positions and hide them
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
        
        const walkStart = -80;
        const walkEnd = window.innerWidth + 80;

        if (blockArr.length === 0) {
          const mainEl = document.querySelector('main');
          const mainRect = mainEl?.getBoundingClientRect();
          setSteveY(mainRect ? mainRect.top + mainRect.height / 2 - 64 : window.innerHeight / 2 - 64);
          
          steveControls.set({ x: walkStart });
          await steveControls.start({ x: walkEnd, transition: { duration: 4.2, ease: 'linear' } });
          
          if (!doneRef.current) {
            if (!targetBlockId) {
              setShowAchievement(true);
              minecraftAudio.playAchievementFanfare();
            }
            addTimeout(() => handleDismiss(), targetBlockId ? 500 : 3000);
          }
          return;
        }

        // Group blocks by Y coordinate (row)
        const rowsMap = new Map<number, HTMLElement[]>();
        blockArr.forEach(el => {
          const rect = el.getBoundingClientRect();
          const yKey = Math.round(rect.top / 10) * 10; // group close Ys
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
             y: avgTop + height / 2 - 64, // Center Steve
             elements
           };
        });

        const speed = 400; // pixels per second

        for (const row of rows) {
           if (doneRef.current) break;
           
           setSteveY(row.y);
           steveControls.set({ x: walkStart });
           let currentX = walkStart;

           for (const el of row.elements) {
              if (doneRef.current) break;
              
              const rect = el.getBoundingClientRect();
              const durationAttr = el.getAttribute('data-duration');
              const duration = durationAttr ? parseInt(durationAttr, 10) : 60;
              const segments = Math.max(1, Math.ceil(duration / 15));
              const segmentWidth = rect.width / segments;
              const pickaxeOffset = 24; // Align Steve's pickaxe to the block

              const walkToStartX = rect.left + pickaxeOffset;
              if (walkToStartX > currentX) {
                 const timeToWalk = (walkToStartX - currentX) / speed;
                 await steveControls.start({ x: walkToStartX, transition: { duration: timeToWalk, ease: 'linear' } });
                 currentX = walkToStartX;
              }

              if (doneRef.current) break;

              const info = blockMapRef.current.get(el);
              if (info && !info.revealed) {
                 info.revealed = true;
                 setTotalRevealed(prev => prev + 1);
              }

              for (let i = 0; i < segments; i++) {
                 if (doneRef.current) break;
                 
                 const segmentCenterX = rect.left + (i + 0.5) * segmentWidth;
                 const strikeX = segmentCenterX + pickaxeOffset;
                 
                 if (strikeX > currentX) {
                    const timeToWalk = (strikeX - currentX) / speed;
                    await steveControls.start({ x: strikeX, transition: { duration: timeToWalk, ease: 'linear' } });
                    currentX = strikeX;
                 }
                 
                 if (doneRef.current) break;

                 const percentLeftToHide = 100 - ((i + 1) / segments) * 100;
                 el.style.clipPath = `inset(0 ${percentLeftToHide}% 0 0)`;

                 const types = ['grass', 'stone', 'wood', 'ore'] as const;
                 minecraftAudio.playBlockPlace(types[soundCountRef.current % types.length]);
                 soundCountRef.current++;
                 
                 spawnParticles(segmentCenterX, rect.top + rect.height / 2);
                 
                 await new Promise(r => setTimeout(r, 80));
              }
           }
           
           if (!doneRef.current) {
              const timeToWalk = (walkEnd - currentX) / speed;
              await steveControls.start({ x: walkEnd, transition: { duration: timeToWalk, ease: 'linear' } });
           }
        }

        if (!doneRef.current) {
          // Reveal any off-screen blocks missed just in case
          blockMapRef.current.forEach((info, el) => {
            if (!info.revealed) {
              info.revealed = true;
              el.style.clipPath = 'inset(0 0% 0 0)';
            }
          });
          setTotalRevealed(blockArr.length);
          
          if (!targetBlockId) {
            setShowAchievement(true);
            minecraftAudio.playAchievementFanfare();
            for (let i = 0; i < 5; i++) {
              addTimeout(() => minecraftAudio.playXpOrb(i), i * 140);
            }
          }
          addTimeout(() => handleDismiss(), targetBlockId ? 500 : 3000);
        }
      });
    }, 200);

    return () => {
      clearTimeout(initTimer);
      timeoutsRef.current.forEach(clearTimeout);
      blockMapRef.current.forEach((_, el) => {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
        el.style.clipPath = '';
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize walk endpoints
  const walkStart = -80;
  const walkEnd = typeof window !== 'undefined' ? window.innerWidth + 80 : 1500;

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
            pointerEvents: 'none', // Allow interacting with app while single block builds
            // Fully transparent — the real app shows through
          }}
        >
          {/* Steve Walking Across Screen */}
          {animStarted && (
            <motion.div
              ref={steveRef}
              initial={{ x: walkStart }}
              animate={steveControls}
              style={{
                position: 'absolute',
                top: steveY,
                left: 0,
                zIndex: 100000,
                pointerEvents: 'none',
              }}
            >
              {/* Bobbing motion */}
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 0.225, ease: 'easeInOut' }}
              >
                <SteveCharacter />
              </motion.div>

              {/* Speech bubble */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 500, damping: 25 }}
                style={{
                  position: 'absolute',
                  top: -36,
                  left: -16,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  color: '#FFFF55',
                  border: '2px solid #555',
                  fontSize: 11,
                  fontFamily: "'Pixelify Sans', monospace, sans-serif",
                  fontWeight: 'bold',
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  letterSpacing: '0.04em',
                }}
              >
                ⛏ Building your Gantt!
              </motion.div>
            </motion.div>
          )}

          {/* Burst Particles */}
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
                  x: p.x + p.vx,
                  y: p.y + p.vy,
                  scale: 0,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  border: '1px solid rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  zIndex: 100002,
                  imageRendering: 'pixelated',
                }}
              />
            ))}
          </AnimatePresence>

          {/* Achievement Toast */}
          <AnimatePresence>
            {showAchievement && <AchievementToast count={totalBlocks} />}
          </AnimatePresence>

          {/* Skip hint */}
          {!targetBlockId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.5 }}
              style={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.75)',
                color: '#C6C6C6',
                fontSize: 11,
                fontFamily: "'Pixelify Sans', monospace, sans-serif",
                fontWeight: 'bold',
                padding: '4px 14px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: '2px solid #555',
                pointerEvents: 'none',
                zIndex: 100003,
              }}
            >
              Click or press ESC to skip
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
