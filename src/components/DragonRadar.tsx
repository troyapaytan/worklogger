import React from 'react';
import { Target, Sparkles } from 'lucide-react';
import DragonBall from './DragonBall';
import { dragonBallAudio } from '../utils/dragonBallAudio';

interface DragonRadarProps {
  weeklyHours: string;
  targetHours: string;
  weeklyPercent: number;
  onEditTargets: () => void;
  onSummonShenron: () => void;
  onRadarClick?: () => void;
}

export const DragonRadar: React.FC<DragonRadarProps> = ({
  weeklyHours,
  targetHours,
  weeklyPercent,
  onEditTargets,
  onSummonShenron,
}) => {
  // 7 Dragon Balls are collected proportionally across 100% of weekly target
  // e.g. at 14.3% = 1 ball, 28.6% = 2, 42.9% = 3, 57.1% = 4, 71.4% = 5, 85.7% = 6, 100% = 7
  const ballsCollected = Math.min(7, Math.floor((Math.max(0, weeklyPercent) / 100) * 7));
  const isAllCollected = weeklyPercent >= 100 || ballsCollected >= 7;

  // Fixed orbital positions for the 7 balls on the radar face (in percentages)
  const radarBlipPositions: [number, number][] = [
    [50, 22], // 1-star (top)
    [76, 32], // 2-star (top-right)
    [80, 64], // 3-star (bottom-right)
    [50, 78], // 4-star (bottom) - Goku's ball
    [24, 70], // 5-star (bottom-left)
    [20, 36], // 6-star (top-left)
    [50, 50], // 7-star (center)
  ];

  const handleRadarClick = () => {
    dragonBallAudio.playRadarBeep();
    if (isAllCollected) {
      onSummonShenron();
    }
  };

  return (
    <div className="flex items-center gap-3 shrink-0 z-10 select-none">
      {/* Dragon Radar Device */}
      <div
        onClick={handleRadarClick}
        className={`relative w-12 h-12 shrink-0 cursor-pointer group transition-transform ${
          isAllCollected ? 'animate-bounce hover:scale-110' : 'hover:scale-105 active:scale-95'
        }`}
        title={
          isAllCollected
            ? '⚡ All 7 Dragon Balls gathered! Click to summon Shenron!'
            : `Dragon Radar: ${ballsCollected}/7 Dragon Balls collected (${Math.round(weeklyPercent)}%)`
        }
      >
        {/* Top Antenna Push Button */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-2 bg-gradient-to-t from-gray-400 to-gray-200 rounded-t-sm border border-gray-500 shadow-sm z-10" />

        {/* Outer White/Metallic Casing */}
        <div
          className={`w-12 h-12 rounded-full p-[3px] bg-gradient-to-b from-[#f5f5f5] via-[#e0e0e0] to-[#bdbdbd] border-2 shadow-[0_4px_10px_rgba(0,0,0,0.5)] transition-all ${
            isAllCollected
              ? 'border-amber-400 shadow-[0_0_16px_rgba(255,193,7,0.8)]'
              : 'border-gray-400 group-hover:border-amber-400/80'
          }`}
        >
          {/* Inner CRT Emerald Radar Screen */}
          <div className="relative w-full h-full rounded-full bg-[#052b14] overflow-hidden border border-[#0d4a24] shadow-inner flex items-center justify-center">
            {/* CRT Scanline Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-60" />

            {/* Radar Grid (Concentric Circles & Crosshairs) */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-40">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#22c55e" strokeWidth="1" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="50" cy="50" r="16" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="50" y1="6" x2="50" y2="94" stroke="#22c55e" strokeWidth="1" />
              <line x1="6" y1="50" x2="94" y2="50" stroke="#22c55e" strokeWidth="1" />
            </svg>

            {/* Rotating Radar Sweeping Beam */}
            <div className="absolute inset-0 origin-center animate-[spin_3.5s_linear_infinite] pointer-events-none">
              <div className="w-1/2 h-1/2 origin-bottom-right bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,197,94,0.45)_90deg)] rounded-tl-full" />
            </div>

            {/* Dragon Ball Blips on Radar Screen */}
            {radarBlipPositions.map(([x, y], idx) => {
              const isCollected = idx < ballsCollected;
              const isCenterGokuBall = idx === 3; // 4-star ball

              return (
                <div
                  key={idx}
                  className={`absolute rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                    isCollected
                      ? 'w-2.5 h-2.5 bg-gradient-to-br from-yellow-300 to-amber-500 shadow-[0_0_6px_#ffd54f] border border-amber-600 scale-100 z-20'
                      : 'w-1.5 h-1.5 bg-emerald-400/40 shadow-[0_0_3px_#22c55e] scale-75 animate-pulse'
                  } ${isCenterGokuBall && isCollected ? 'ring-1 ring-amber-300 ring-offset-1 ring-offset-black/50' : ''}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                />
              );
            })}

            {/* Center Blip Pulse */}
            {isAllCollected && (
              <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping pointer-events-none" />
            )}
          </div>
        </div>

        {/* 4-Star Ball Badge on Corner of Device */}
        <div className="absolute -bottom-1 -right-1 z-30">
          <DragonBall count={4} size={16} glowing={isAllCollected} />
        </div>
      </div>

      {/* Target & Balls Readout */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-tight">
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider font-['Chakra_Petch',sans-serif]">
            DRAGON RADAR
          </span>
          <span className="text-[9px] bg-red-600 text-white font-extrabold px-1 rounded-sm shadow-sm">
            {ballsCollected}/7 🌟
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs font-bold text-white tracking-tight leading-tight">
            {weeklyHours} / {targetHours} hrs
          </span>
          <span className={`text-[10px] font-black px-1 rounded ${
            isAllCollected
              ? 'bg-amber-500 text-black animate-pulse'
              : 'text-amber-300 bg-amber-950/60 border border-amber-500/30'
          }`}>
            {Math.round(weeklyPercent)}%
          </span>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 mt-1">
          {isAllCollected ? (
            <button
              onClick={onSummonShenron}
              className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(255,193,7,0.7)] cursor-pointer active:scale-95 transition-all uppercase tracking-wider animate-pulse"
              title="Click to make your wish to Shenron!"
            >
              <Sparkles size={11} className="text-black" />
              Summon Shenron!
            </button>
          ) : (
            <button
              onClick={onEditTargets}
              className="flex items-center gap-1 text-[9px] text-orange-400 hover:text-amber-300 transition-colors cursor-pointer w-fit uppercase font-semibold active:scale-95"
            >
              <Target size={10} />
              Edit Target
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DragonRadar;
