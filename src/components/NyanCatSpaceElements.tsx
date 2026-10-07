import React from 'react';
import { motion } from 'framer-motion';

// ─── 1. Pixel Art Superman ──────────────────────────────────────────────────
// Authentic 8-bit Superman in classic horizontal flight pose with fluttering red cape
export function PixelSuperman({
  width = 72,
  flip = false,
  className = '',
  style = {},
}: {
  width?: number;
  flip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const height = Math.round((width * 24) / 54);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        display: 'inline-block',
        transform: flip ? 'scaleX(-1)' : undefined,
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 54 24"
        style={{ display: 'block', imageRendering: 'pixelated' }}
      >
        <defs>
          <filter id="superman-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0033aa" floodOpacity="0.6" />
          </filter>
        </defs>

        <g filter="url(#superman-glow)">
          {/* Extended Right Arm & Fist (Pointing Forward) */}
          <rect x="44" y="9" width="7" height="3" fill="#0055DD" />
          <rect x="49" y="8" width="5" height="4" fill="#FCD0A1" />
          {/* Thumb & knuckles */}
          <rect x="52" y="10" width="2" height="2" fill="#E5AA70" />

          {/* Head & Face */}
          <rect x="36" y="6" width="9" height="8" fill="#FCD0A1" />
          {/* Jaw / neck */}
          <rect x="34" y="9" width="4" height="4" fill="#E5AA70" />
          {/* Superman Hair (Black with iconic forehead curl) */}
          <rect x="35" y="4" width="10" height="4" fill="#111122" />
          <rect x="34" y="5" width="3" height="4" fill="#111122" />
          <rect x="42" y="7" width="2" height="3" fill="#111122" />
          {/* Iconic 'S' curl on forehead */}
          <rect x="44" y="8" width="2" height="2" fill="#111122" />
          {/* Eye & Heroic brow */}
          <rect x="41" y="8" width="2" height="1" fill="#111122" />
          <rect x="41" y="9" width="1" height="1" fill="#0088FF" />
          {/* Smile / mouth */}
          <rect x="41" y="12" width="2" height="1" fill="#CC5555" />

          {/* Blue Torso / Suit */}
          <rect x="23" y="7" width="13" height="8" fill="#0055DD" />
          <rect x="24" y="6" width="8" height="2" fill="#0044BB" />

          {/* Superman 'S' Shield on Chest */}
          <polygon points="31,7 35,7 36,9 33,12 30,9" fill="#FFCC00" />
          <polygon points="32,8 34,8 35,9 33,11 31,9" fill="#EE0000" />
          {/* 'S' detail */}
          <rect x="33" y="8" width="2" height="1" fill="#FFCC00" />
          <rect x="32" y="9" width="2" height="1" fill="#FFCC00" />
          <rect x="33" y="10" width="2" height="1" fill="#FFCC00" />

          {/* Left Arm (Tucked near chest) */}
          <rect x="29" y="11" width="8" height="3" fill="#0044BB" />
          <rect x="35" y="12" width="3" height="3" fill="#FCD0A1" />

          {/* Yellow Belt */}
          <rect x="21" y="8" width="3" height="7" fill="#FFD700" />
          <rect x="22" y="10" width="2" height="3" fill="#FFA500" />

          {/* Red Trunks */}
          <rect x="16" y="8" width="6" height="7" fill="#EE1122" />

          {/* Blue Legs */}
          <rect x="9" y="9" width="8" height="5" fill="#0055DD" />

          {/* Red Boots (Streamlined behind) */}
          <rect x="2" y="9" width="8" height="5" fill="#EE1122" />
          <rect x="1" y="10" width="3" height="4" fill="#CC0011" />
          {/* Boot tops notch */}
          <rect x="8" y="9" width="2" height="2" fill="#FFAA00" />

          {/* Red Cape (Attached at shoulders, fluttering back) */}
          <path
            d="M 27 6 L 0 3 L 2 11 L 23 8 Z"
            fill="#EE1122"
            opacity="0.95"
          />
          <path
            d="M 26 7 L -2 5 L 1 13 L 22 9 Z"
            fill="#CC0011"
            opacity="0.8"
          />
          {/* Cape fold highlight */}
          <path
            d="M 27 6 L 3 4 L 7 8 L 24 7 Z"
            fill="#FF3344"
            opacity="0.7"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── 2. Pixel Flying Saucer / UFO ───────────────────────────────────────────
export function PixelUFO({
  width = 54,
  lightPhase = 0,
  beam = true,
  className = '',
  style = {},
}: {
  width?: number;
  lightPhase?: number;
  beam?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const height = Math.round((width * 38) / 54);
  const colors = ['#FF0055', '#FFFF00', '#00FF66', '#00FFFF', '#FF9900'];

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        display: 'inline-block',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <svg width={width} height={height} viewBox="0 0 54 38" style={{ display: 'block' }}>
        {/* Optional Tractor Beam */}
        {beam && (
          <polygon
            points="20,18 34,18 46,38 8,38"
            fill="url(#ufo-beam-grad)"
            opacity="0.35"
          />
        )}

        <defs>
          <linearGradient id="ufo-beam-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#00FF88" stopOpacity="0.0" />
          </linearGradient>
          <filter id="ufo-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#00FFFF" floodOpacity="0.7" />
          </filter>
        </defs>

        <g filter="url(#ufo-glow)">
          {/* Glass Cockpit Dome */}
          <path
            d="M 18 10 Q 27 1 36 10 Z"
            fill="#00FFFF"
            opacity="0.85"
            stroke="#0088CC"
            strokeWidth="1"
          />
          {/* Glass glare highlight */}
          <rect x="22" y="4" width="3" height="3" fill="#FFFFFF" opacity="0.9" />

          {/* Little Green Alien Pilot inside! */}
          {/* Alien Head */}
          <ellipse cx="27" cy="8" rx="3.5" ry="3" fill="#33FF33" />
          {/* Alien Big Black Eyes */}
          <rect x="25" y="7" width="1.5" height="1.5" fill="#000000" />
          <rect x="28" y="7" width="1.5" height="1.5" fill="#000000" />

          {/* Metallic Saucer Hull */}
          {/* Upper rim */}
          <ellipse cx="27" cy="11" rx="20" ry="4" fill="#B0C4DE" />
          {/* Saucer main body */}
          <polygon points="5,11 49,11 41,17 13,17" fill="#778899" />
          <ellipse cx="27" cy="17" rx="14" ry="2.5" fill="#4A5568" />

          {/* Blinking Saucer Running Lights (5 pixel lights) */}
          {[12, 19, 27, 35, 42].map((x, idx) => {
            const color = colors[(idx + lightPhase) % colors.length];
            return (
              <g key={idx}>
                <circle cx={x} cy="14" r="2" fill={color} />
                <circle cx={x} cy="14" r="3.5" fill={color} opacity="0.4" />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// ─── 3. Pixel Ring Planet (Saturn-Style) ────────────────────────────────────
export function PixelRingPlanet({
  size = 56,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: 'block' }}>
        <defs>
          <filter id="planet-glow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#9933FF" floodOpacity="0.4" />
          </filter>
        </defs>

        <g filter="url(#planet-glow)">
          {/* Back of the Ring (Behind the sphere) */}
          <ellipse
            cx="32"
            cy="32"
            rx="28"
            ry="9"
            fill="none"
            stroke="#FFD700"
            strokeWidth="3.5"
            strokeDasharray="90 120"
            strokeDashoffset="45"
            transform="rotate(-24 32 32)"
            opacity="0.8"
          />

          {/* Planet Sphere (Purple / Indigo with bands) */}
          <circle cx="32" cy="32" r="16" fill="#6A0572" />
          {/* Planet bands */}
          <clipPath id="ring-planet-clip">
            <circle cx="32" cy="32" r="16" />
          </clipPath>
          <g clipPath="url(#ring-planet-clip)">
            <rect x="16" y="20" width="32" height="4" fill="#9D0191" />
            <rect x="16" y="27" width="32" height="5" fill="#D32F2F" />
            <rect x="16" y="34" width="32" height="4" fill="#FF8A80" />
            <rect x="16" y="40" width="32" height="5" fill="#4B0082" />
            {/* Dark crescent shadow */}
            <path
              d="M 32 16 A 16 16 0 0 1 48 32 A 16 16 0 0 1 32 48 A 12 16 0 0 0 32 16 Z"
              fill="#1A0033"
              opacity="0.4"
            />
            {/* Top highlight */}
            <rect x="22" y="18" width="5" height="3" fill="#FFFFFF" opacity="0.5" />
          </g>

          {/* Front of the Ring (In front of the sphere) */}
          <ellipse
            cx="32"
            cy="32"
            rx="28"
            ry="9"
            fill="none"
            stroke="#FFD700"
            strokeWidth="3.5"
            strokeDasharray="90 120"
            strokeDashoffset="145"
            transform="rotate(-24 32 32)"
          />
          {/* Outer ring accent */}
          <ellipse
            cx="32"
            cy="32"
            rx="31"
            ry="10.5"
            fill="none"
            stroke="#FFA500"
            strokeWidth="1.5"
            strokeDasharray="90 120"
            strokeDashoffset="145"
            transform="rotate(-24 32 32)"
            opacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── 4. Pixel Crater Planet (Emerald / Cyan Alien World) ────────────────────
export function PixelCraterPlanet({
  size = 46,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 46 46" style={{ display: 'block' }}>
        <defs>
          <clipPath id="crater-planet-clip">
            <circle cx="23" cy="23" r="19" />
          </clipPath>
        </defs>

        {/* Planet Sphere */}
        <circle cx="23" cy="23" r="19" fill="#008080" />

        <g clipPath="url(#crater-planet-clip)">
          {/* Surface gradient highlights */}
          <circle cx="16" cy="16" r="14" fill="#00A896" />
          <circle cx="14" cy="14" r="8" fill="#02C39A" />

          {/* Pixel Craters */}
          {/* Crater 1 */}
          <ellipse cx="15" cy="20" rx="5" ry="3.5" fill="#05668D" />
          <ellipse cx="14" cy="19.5" rx="3.5" ry="2" fill="#024D6D" />
          <rect x="11" y="21" width="6" height="1" fill="#02C39A" opacity="0.7" />

          {/* Crater 2 */}
          <ellipse cx="28" cy="15" rx="4" ry="3" fill="#05668D" />
          <ellipse cx="27.5" cy="14.5" rx="2.5" ry="1.8" fill="#024D6D" />
          <rect x="25" y="16.5" width="4" height="1" fill="#02C39A" opacity="0.7" />

          {/* Crater 3 */}
          <ellipse cx="26" cy="30" rx="6" ry="4" fill="#05668D" />
          <ellipse cx="25" cy="29.5" rx="4.5" ry="2.5" fill="#024D6D" />
          <rect x="22" y="32" width="6" height="1" fill="#02C39A" opacity="0.7" />

          {/* Shadow crescent */}
          <path
            d="M 23 4 A 19 19 0 0 1 42 23 A 19 19 0 0 1 23 42 A 13 19 0 0 0 23 4 Z"
            fill="#012A36"
            opacity="0.45"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── 5. Pixel Gas Giant (Orange / Crimson / Gold Bands) ─────────────────────
export function PixelGasGiant({
  size = 58,
  className = '',
  style = {},
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-block',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 58 58" style={{ display: 'block' }}>
        <clipPath id="gas-giant-clip">
          <circle cx="29" cy="29" r="25" />
        </clipPath>

        <circle cx="29" cy="29" r="25" fill="#C34A36" />

        <g clipPath="url(#gas-giant-clip)">
          {/* Swirling bands */}
          <rect x="4" y="9" width="50" height="6" fill="#FF8066" />
          <rect x="4" y="17" width="50" height="7" fill="#FBE3B5" />
          <rect x="4" y="26" width="50" height="5" fill="#AA3322" />
          <rect x="4" y="33" width="50" height="8" fill="#FF9671" />
          <rect x="4" y="43" width="50" height="6" fill="#845EC2" />

          {/* The Great Pixel Storm Spot */}
          <ellipse cx="37" cy="36" rx="6" ry="3.5" fill="#800020" />
          <ellipse cx="36" cy="35.5" rx="4" ry="2" fill="#D65DB1" />

          {/* Shadow crescent */}
          <path
            d="M 29 4 A 25 25 0 0 1 54 29 A 25 25 0 0 1 29 54 A 18 25 0 0 0 29 4 Z"
            fill="#2C001E"
            opacity="0.5"
          />
        </g>
      </svg>
    </div>
  );
}

// ─── 6. Ambient Space Background Layer for Nyan Cat Theme ───────────────────
// Renders static & drifting pixel planets, random flying UFOs, and Superman flybys!
export function NyanCatSpaceBackground() {
  const [lightPhase, setLightPhase] = React.useState(0);

  // Animate UFO lights every 250ms
  React.useEffect(() => {
    const timer = setInterval(() => setLightPhase(p => (p + 1) % 5), 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0, // Behind the Gantt chart cards
      }}
    >
      {/* ── Fixed Pixel Planets (Aesthetic cosmic environment) ── */}
      {/* Top Left: Saturn-style Ring Planet */}
      <motion.div
        animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 60,
          left: '4%',
          opacity: 0.85,
        }}
      >
        <PixelRingPlanet size={68} />
      </motion.div>

      {/* Top Right: Gas Giant with swirling bands */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          position: 'absolute',
          top: 90,
          right: '5%',
          opacity: 0.8,
        }}
      >
        <PixelGasGiant size={62} />
      </motion.div>

      {/* Bottom Left: Turquoise Alien Crater Planet */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute',
          bottom: 120,
          left: '3%',
          opacity: 0.75,
        }}
      >
        <PixelCraterPlanet size={48} />
      </motion.div>

      {/* Bottom Right: Distant Mini Ring Planet */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        style={{
          position: 'absolute',
          bottom: 90,
          right: '7%',
          opacity: 0.65,
        }}
      >
        <PixelRingPlanet size={44} />
      </motion.div>

      {/* ── Drifting UFO 1 (High in space, slowly cruising left to right) ── */}
      <motion.div
        initial={{ x: -100, y: 140 }}
        animate={{ x: '105vw', y: [140, 120, 150, 130, 140] }}
        transition={{
          x: { duration: 32, repeat: Infinity, ease: 'linear', delay: 2 },
          y: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.85 }}
      >
        <PixelUFO width={52} lightPhase={lightPhase} beam={true} />
      </motion.div>

      {/* ── Drifting UFO 2 (Lower in space, hovering right to left) ── */}
      <motion.div
        initial={{ x: '105vw', y: 480 }}
        animate={{ x: -100, y: [480, 500, 470, 490, 480] }}
        transition={{
          x: { duration: 28, repeat: Infinity, ease: 'linear', delay: 14 },
          y: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{ position: 'absolute', top: 0, left: 0, opacity: 0.75 }}
      >
        <PixelUFO width={44} lightPhase={(lightPhase + 2) % 5} beam={false} />
      </motion.div>

      {/* ── SUPERMAN HEROIC FLYBY! ── */}
      {/* Periodically zooms majestically across the starfield! */}
      <motion.div
        initial={{ x: -120, y: 220 }}
        animate={{
          x: '110vw',
          y: [220, 200, 235, 210, 220],
        }}
        transition={{
          x: { duration: 16, repeat: Infinity, repeatDelay: 12, ease: 'easeInOut', delay: 4 },
          y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.9,
          filter: 'drop-shadow(0 0 10px rgba(0, 102, 255, 0.7))',
        }}
      >
        <PixelSuperman width={72} />
      </motion.div>
    </div>
  );
}
