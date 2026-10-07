import React from 'react';

export interface DragonBallProps {
  count: number; // 1 to 7
  size?: number;
  glowing?: boolean;
  isStone?: boolean;
  className?: string;
  onClick?: () => void;
}

// Helper to generate a 5-pointed star path given center (cx, cy) and radius r
function generateStarPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  const step = Math.PI / 5;
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export const DragonBall: React.FC<DragonBallProps> = ({
  count = 4,
  size = 48,
  glowing = false,
  isStone = false,
  className = '',
  onClick,
}) => {
  const safeCount = Math.max(1, Math.min(7, Math.round(count)));
  const uid = React.useId();

  // Coordinates for 1 to 7 stars inside 100x100 box
  const starCoords: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [
      [37, 43],
      [63, 57],
    ],
    3: [
      [50, 37],
      [36, 61],
      [64, 61],
    ],
    4: [
      [50, 35],
      [35, 50],
      [65, 50],
      [50, 65],
    ],
    5: [
      [36, 36],
      [64, 36],
      [50, 50],
      [36, 64],
      [64, 64],
    ],
    6: [
      [38, 33],
      [62, 33],
      [38, 50],
      [62, 50],
      [38, 67],
      [62, 67],
    ],
    7: [
      [50, 32],
      [66, 41],
      [66, 59],
      [50, 68],
      [34, 59],
      [34, 41],
      [50, 50],
    ],
  };

  const coords = starCoords[safeCount] || starCoords[4];
  const starOuterR = safeCount >= 5 ? 5.2 : 6.5;
  const starInnerR = starOuterR * 0.45;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none transition-transform ${
        onClick ? 'cursor-pointer active:scale-95' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        filter: isStone
          ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))'
          : glowing
          ? 'drop-shadow(0 0 10px rgba(255, 170, 0, 0.9)) drop-shadow(0 0 20px rgba(255, 220, 50, 0.6))'
          : 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
      }}
      title={`${safeCount}-Star Dragon Ball`}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Main sphere amber gradient */}
          <radialGradient
            id={`ball-grad-${uid}`}
            cx="38%"
            cy="36%"
            r="60%"
            fx="32%"
            fy="30%"
          >
            {isStone ? (
              <>
                <stop offset="0%" stopColor="#cfd8dc" />
                <stop offset="45%" stopColor="#90a4ae" />
                <stop offset="85%" stopColor="#546e7a" />
                <stop offset="100%" stopColor="#37474f" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#fff59d" />
                <stop offset="25%" stopColor="#ffb300" />
                <stop offset="70%" stopColor="#ff6f00" />
                <stop offset="92%" stopColor="#e65100" />
                <stop offset="100%" stopColor="#bf360c" />
              </>
            )}
          </radialGradient>

          {/* Glass specular curved highlight */}
          <linearGradient id={`spec-grad-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={isStone ? '0.25' : '0.85'} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Star depth shadow */}
          <filter id={`star-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="1"
              stdDeviation="0.8"
              floodColor={isStone ? '#263238' : '#7f0000'}
              floodOpacity="0.75"
            />
          </filter>

          {/* Outer glowing ki ring filter */}
          {glowing && (
            <filter id={`glow-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Outer glowing energy rim when active */}
        {glowing && !isStone && (
          <circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke="#ffea00"
            strokeWidth="3.5"
            strokeOpacity="0.7"
            className="animate-pulse"
          />
        )}

        {/* Dragon Ball Sphere Base */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill={`url(#ball-grad-${uid})`}
          stroke={isStone ? '#263238' : '#e65100'}
          strokeWidth="1.2"
        />

        {/* Ambient inner rim glow */}
        {!isStone && (
          <circle
            cx="50"
            cy="50"
            r="43.5"
            fill="none"
            stroke="#ffcc80"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
        )}

        {/* Stars */}
        <g filter={`url(#star-shadow-${uid})`}>
          {coords.map(([cx, cy], idx) => (
            <polygon
              key={idx}
              points={generateStarPoints(cx, cy, starOuterR, starInnerR)}
              fill={isStone ? '#455a64' : '#d50000'}
              stroke={isStone ? '#37474f' : '#b71c1c'}
              strokeWidth="0.5"
            />
          ))}
        </g>

        {/* Stone cracks when deactivated after wish */}
        {isStone && (
          <g stroke="#37474f" strokeWidth="1" strokeLinecap="round" opacity="0.6">
            <path d="M 28 35 L 36 42 L 32 50 L 40 56" />
            <path d="M 68 30 L 62 40 L 70 48" />
            <path d="M 45 70 L 52 64 L 60 72" />
          </g>
        )}

        {/* Top-left curved glass shine / specular highlight */}
        <ellipse
          cx="42"
          cy="26"
          rx="22"
          ry="11"
          transform="rotate(-26 42 26)"
          fill={`url(#spec-grad-${uid})`}
        />

        {/* Bottom subtle rim reflection */}
        {!isStone && (
          <path
            d="M 28 78 A 45 45 0 0 0 72 78"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.3"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
};

export default DragonBall;
