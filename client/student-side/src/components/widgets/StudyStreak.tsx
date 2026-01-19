import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar, Trophy, Zap, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'spi_study_streak';

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastVisit: string;
  totalDays: number;
  weekHistory: boolean[];
};

const getDefaultData = (): StreakData => ({
  currentStreak: 0,
  longestStreak: 0,
  lastVisit: '',
  totalDays: 0,
  weekHistory: [false, false, false, false, false, false, false],
});

const getMilestones = (streak: number) => {
  const milestones = [3, 7, 14, 30, 60, 100];
  return milestones.find((m) => streak < m) || milestones[milestones.length - 1];
};

const getStreakEmoji = (streak: number) => {
  if (streak >= 30) return '🔥';
  if (streak >= 14) return '⚡';
  if (streak >= 7) return '🌟';
  if (streak >= 3) return '✨';
  return '💪';
};

const getMotivation = (streak: number) => {
  if (streak >= 30) return "You're on fire! Unstoppable! 🔥";
  if (streak >= 14) return "Two weeks strong! Amazing! 💪";
  if (streak >= 7) return "One week done! Keep going! 🌟";
  if (streak >= 3) return "Great start! Don't stop now! ⭐";
  if (streak >= 1) return "You're building momentum! 🚀";
  return "Start your streak today! 💫";
};

export function StudyStreak() {
  const [data, setData] = useState<StreakData>(getDefaultData());
  const [showCelebration, setShowCelebration] = useState(false);
  const [isNewDay, setIsNewDay] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const today = new Date().toDateString();
    
    let streakData: StreakData;
    
    if (saved) {
      try {
        streakData = JSON.parse(saved);
      } catch (e) {
        streakData = getDefaultData();
      }
    } else {
      streakData = getDefaultData();
    }

    // Check if this is a new day visit
    if (streakData.lastVisit !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      // Check if last visit was yesterday (continuing streak) or earlier (broken streak)
      if (streakData.lastVisit === yesterdayStr) {
        // Continuing streak
        streakData.currentStreak += 1;
        setIsNewDay(true);
      } else if (streakData.lastVisit !== '') {
        // Streak broken - reset
        streakData.currentStreak = 1;
      } else {
        // First visit
        streakData.currentStreak = 1;
        setIsNewDay(true);
      }

      // Update longest streak
      if (streakData.currentStreak > streakData.longestStreak) {
        streakData.longestStreak = streakData.currentStreak;
      }

      // Update total days
      streakData.totalDays += 1;

      // Update week history
      const dayOfWeek = new Date().getDay();
      streakData.weekHistory = streakData.weekHistory.map((_, i) => 
        i === dayOfWeek ? true : (i < dayOfWeek ? streakData.weekHistory[i] : false)
      );

      streakData.lastVisit = today;
      
      // Save updated data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData));

      // Show celebration for milestones
      if ([3, 7, 14, 30, 60, 100].includes(streakData.currentStreak)) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }

    setData(streakData);
  }, []);

  const nextMilestone = getMilestones(data.currentStreak);
  const progress = (data.currentStreak / nextMilestone) * 100;
  const daysToGo = nextMilestone - data.currentStreak;

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date().getDay();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 border border-orange-200/50 dark:border-orange-800/30 rounded-xl p-4 shadow-sm relative overflow-hidden"
    >
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-400 rounded-full blur-2xl" />
      </div>

      {/* Celebration effect */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-10"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="text-center"
          >
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{data.currentStreak} Day Streak!</p>
            <p className="text-sm opacity-80">Amazing achievement! 🎉</p>
          </motion.div>
        </motion.div>
      )}

      <div className="relative z-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isNewDay ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5, repeat: isNewDay ? 3 : 0 }}
              className="p-1.5 bg-orange-100 dark:bg-orange-900/40 rounded-lg"
            >
              <Flame className="w-5 h-5 text-orange-500" />
            </motion.div>
            <h3 className="text-sm font-semibold text-foreground">Study Streak</h3>
          </div>
          <div className="text-xl">{getStreakEmoji(data.currentStreak)}</div>
        </div>

        {/* Streak Count */}
        <div className="text-center mb-3">
          <motion.p
            key={data.currentStreak}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent"
          >
            {data.currentStreak}
          </motion.p>
          <p className="text-xs text-muted-foreground">day{data.currentStreak !== 1 ? 's' : ''} streak</p>
        </div>

        {/* Week View */}
        <div className="flex justify-between mb-3">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">{day}</span>
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all",
                  i === today 
                    ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white font-bold shadow-md shadow-orange-500/30" 
                    : data.weekHistory[i] 
                    ? "bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700" 
                    : "bg-white/60 dark:bg-white/5 border border-border"
                )}
              >
                {data.weekHistory[i] && i !== today && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
                  </motion.div>
                )}
                {i === today && <Zap className="w-3 h-3" />}
              </div>
            </div>
          ))}
        </div>

        {/* Progress to Next Milestone */}
        <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Next milestone</span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">{nextMilestone} days</span>
          </div>
          <div className="h-2 bg-orange-100 dark:bg-orange-900/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-center">{daysToGo} days to go!</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2 text-center border border-amber-100 dark:border-amber-900/30">
            <p className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              {data.longestStreak}
            </p>
            <p className="text-[10px] text-muted-foreground">Best Streak</p>
          </div>
          <div className="bg-white/60 dark:bg-white/5 rounded-lg p-2 text-center border border-orange-100 dark:border-orange-900/30">
            <p className="text-base font-bold text-foreground flex items-center justify-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              {data.totalDays}
            </p>
            <p className="text-[10px] text-muted-foreground">Total Days</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
