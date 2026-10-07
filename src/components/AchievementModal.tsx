import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Flame, Target, Star, Zap, Clock, Shield } from 'lucide-react';

export interface AchievementData {
  id: string;
  title: string;
  description: string;
  tier: number;
  icon: string;
}

interface AchievementModalProps {
  achievement: AchievementData | null;
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  award: <Award className="w-8 h-8" />,
  flame: <Flame className="w-8 h-8" />,
  target: <Target className="w-8 h-8" />,
  star: <Star className="w-8 h-8" />,
  zap: <Zap className="w-8 h-8" />,
  clock: <Clock className="w-8 h-8" />,
  shield: <Shield className="w-8 h-8" />
};

export default function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-sm glass-card p-6 flex flex-col items-center text-center overflow-hidden"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 10, opacity: 0 }}
          >
            {/* Sparkles effect */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "backOut" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-50" />
            </motion.div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-surface-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-xl mb-4 relative z-10">
              {iconMap[achievement.icon] || <Award className="w-8 h-8" />}
            </div>

            <h2 className="text-xl font-bold text-white mb-2 relative z-10">
              Achievement Unlocked!
            </h2>
            
            <h3 className="text-lg font-semibold text-amber-400 mb-2 relative z-10">
              {achievement.title}
            </h3>

            <p className="text-surface-300 text-sm relative z-10">
              {achievement.description}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
