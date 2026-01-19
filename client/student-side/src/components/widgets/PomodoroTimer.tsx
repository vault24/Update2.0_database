import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  BookOpen, 
  Volume2, 
  VolumeX,
  Timer,
  Trophy,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const TIMER_CONFIGS = {
  focus: { duration: 25 * 60, label: 'Focus Time', icon: BookOpen, color: 'text-primary' },
  shortBreak: { duration: 5 * 60, label: 'Short Break', icon: Coffee, color: 'text-emerald-500' },
  longBreak: { duration: 15 * 60, label: 'Long Break', icon: Coffee, color: 'text-blue-500' },
};

const MOTIVATIONAL_QUOTES = [
  "Stay focused, stay strong! 💪",
  "Every minute counts! ⏱️",
  "You're doing great! 🌟",
  "Keep pushing forward! 🚀",
  "Success is near! 🎯",
  "Focus is your superpower! ⚡",
];

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_CONFIGS.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [showQuote, setShowQuote] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const config = TIMER_CONFIGS[mode];
  const progress = ((config.duration - timeLeft) / config.duration) * 100;

  const playSound = useCallback(() => {
    if (isSoundEnabled) {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQdPqd9Qf4');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
  }, [isSoundEnabled]);

  const showMotivation = useCallback(() => {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    setCurrentQuote(quote);
    setShowQuote(true);
    setTimeout(() => setShowQuote(false), 3000);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playSound();
      if (mode === 'focus') {
        setSessionsCompleted((prev) => prev + 1);
        showMotivation();
        // Auto switch to break
        const nextMode = sessionsCompleted > 0 && (sessionsCompleted + 1) % 4 === 0 ? 'longBreak' : 'shortBreak';
        setMode(nextMode);
        setTimeLeft(TIMER_CONFIGS[nextMode].duration);
      } else {
        setMode('focus');
        setTimeLeft(TIMER_CONFIGS.focus.duration);
      }
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, sessionsCompleted, playSound, showMotivation]);

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(config.duration);
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(TIMER_CONFIGS[newMode].duration);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const Icon = config.icon;

  return (
    <motion.div
      layout
      className={cn(
        "bg-card rounded-2xl border border-border shadow-card overflow-hidden transition-all",
        isExpanded ? "col-span-full" : ""
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b border-border cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10", config.color)}>
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Study Timer</h3>
            <p className="text-[10px] text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionsCompleted > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full">
              <Trophy className="w-3 h-3" />
              <span className="text-xs font-semibold">{sessionsCompleted}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); setIsSoundEnabled(!isSoundEnabled); }}
          >
            {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="p-4">
        {/* Mode Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
          {(Object.keys(TIMER_CONFIGS) as TimerMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "flex-1 py-1.5 px-2 rounded-md text-[10px] font-medium transition-all",
                mode === m 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === 'focus' ? 'Focus' : m === 'shortBreak' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="58"
              className="fill-none stroke-muted"
              strokeWidth="8"
            />
            <motion.circle
              cx="64"
              cy="64"
              r="58"
              className={cn("fill-none", 
                mode === 'focus' ? "stroke-primary" : 
                mode === 'shortBreak' ? "stroke-emerald-500" : "stroke-blue-500"
              )}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={364}
              strokeDashoffset={364 - (364 * progress) / 100}
              initial={false}
              animate={{ strokeDashoffset: 364 - (364 * progress) / 100 }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Icon className={cn("w-5 h-5 mb-1", config.color)} />
            <span className="text-2xl font-bold font-mono">{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={resetTimer}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-lg",
              isRunning 
                ? "bg-destructive hover:bg-destructive/90" 
                : "bg-primary hover:bg-primary/90"
            )}
            onClick={toggleTimer}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </Button>
          <div className="w-10" /> {/* Spacer for symmetry */}
        </div>

        {/* Motivational Quote */}
        <AnimatePresence>
          {showQuote && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 text-center text-sm font-medium text-primary"
            >
              {currentQuote}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Session Stats */}
        {isExpanded && sessionsCompleted > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-lg font-bold text-primary">{sessionsCompleted}</p>
                <p className="text-[10px] text-muted-foreground">Sessions</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-lg font-bold text-emerald-500">{sessionsCompleted * 25}</p>
                <p className="text-[10px] text-muted-foreground">Minutes</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <p className="text-lg font-bold text-warning flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4" />
                  {Math.floor(sessionsCompleted / 4)}
                </p>
                <p className="text-[10px] text-muted-foreground">Cycles</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
