import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  ArrowRight,
  Coffee,
  CheckCircle,
  Moon,
  FlaskConical,
  BookOpen,
  Timer,
  Heart,
  Star,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Motivational quotes in both Bengali and English
const motivationalQuotes = [
  {
    bengali: "নিশ্চয়ই আল্লাহ কোনো জাতির অবস্থা পরিবর্তন করেন না, যতক্ষণ না তারা নিজেরা নিজেদের অবস্থা পরিবর্তন করে।",
    english: "Indeed, Allah will not change the condition of a people until they change what is within themselves.",
    reference: "Surah Ar-Ra'd (13:11)"
  },
  {
    bengali: "মানুষ তাই পায়, যার জন্য সে চেষ্টা করে।",
    english: "And that there is not for man except that for which he strives.",
    reference: "Surah An-Najm (53:39)"
  },
  {
    bengali: "আর যে আল্লাহর উপর ভরসা করে, তিনিই তার জন্য যথেষ্ট।",
    english: "And whoever relies upon Allah—then He is sufficient for him.",
    reference: "Surah At-Talaq (65:3)"
  },
  {
    bengali: "যারা জানে এবং যারা জানে না—তারা কি সমান?",
    english: "Are those who know equal to those who do not know?",
    reference: "Surah Az-Zumar (39:9)"
  },
  {
    bengali: "জ্ঞান অর্জন করা প্রত্যেক মুসলমানের জন্য ফরজ।",
    english: "Seeking knowledge is obligatory upon every Muslim.",
    reference: "Ibn Majah"
  },
  {
    bengali: "ব্যর্থতা নয়, চেষ্টা বন্ধ করাই আসল ব্যর্থতা।",
    english: "Failure is not trying and failing; real failure is stopping the effort.",
    reference: "Albert Einstein"
  },
  {
    bengali: "নিজেকে অন্যের সাথে তুলনা কোরো না, এতে তুমি নিজেকেই অপমান করবে।",
    english: "Don't compare yourself with anyone else; if you do, you are insulting yourself.",
    reference: "Bill Gates"
  },
  {
    bengali: "যে অন্যায়ের বিরুদ্ধে দাঁড়ায় না, সে অন্যায়ের অংশ হয়ে যায়।",
    english: "Those who do not stand against injustice become part of it.",
    reference: "Fidel Castro"
  },
  {
    bengali: "স্বপ্ন দেখো, কিন্তু স্বপ্নের জন্য কাজ করো।",
    english: "Dream big, but work for your dreams.",
    reference: "General Motivation Quote"
  }
];

type DisplayClassPeriod = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
};

interface ClassStatusBoxProps {
  runningClass?: DisplayClassPeriod | null;
  upcomingClass?: DisplayClassPeriod | null;
  isInBreak?: boolean;
  classesCompleted?: boolean;
  totalClasses?: number;
  currentTime?: Date;
  className?: string;
}

export function ClassStatusBox({
  runningClass,
  upcomingClass,
  isInBreak,
  classesCompleted,
  totalClasses = 0,
  currentTime = new Date(),
  className
}: ClassStatusBoxProps) {
  const [showMotivation, setShowMotivation] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [autoToggle, setAutoToggle] = useState(false);
  const [autoToggleInterval, setAutoToggleInterval] = useState<NodeJS.Timeout | null>(null);

  // Get random quote on component mount
  useEffect(() => {
    setCurrentQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length));
  }, []);

  // Auto-show motivation when no class is running
  useEffect(() => {
    if (!runningClass) {
      setShowMotivation(true);
      setAutoToggle(false); // Disable auto-toggle when no class is running
    } else {
      setShowMotivation(false); // Show class info when class is running
    }
  }, [runningClass]);

  // Change quotes periodically when showing motivation and no class is running
  useEffect(() => {
    if (!runningClass && showMotivation) {
      const quoteInterval = setInterval(() => {
        setCurrentQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length));
      }, 45000); // Change quote every 45 seconds when no class is running
      
      return () => clearInterval(quoteInterval);
    }
  }, [runningClass, showMotivation]);

  // Auto-toggle functionality - only when class is running
  useEffect(() => {
    if (autoToggle && runningClass) {
      const interval = setInterval(() => {
        setShowMotivation(prev => !prev);
      }, 30000); // Toggle every 30 seconds
      
      setAutoToggleInterval(interval);
      
      return () => {
        clearInterval(interval);
        setAutoToggleInterval(null);
      };
    } else if (autoToggleInterval) {
      clearInterval(autoToggleInterval);
      setAutoToggleInterval(null);
    }
  }, [autoToggle, runningClass]);

  // Stop auto-toggle when component unmounts
  useEffect(() => {
    return () => {
      if (autoToggleInterval) {
        clearInterval(autoToggleInterval);
      }
    };
  }, [autoToggleInterval]);

  const handleToggleAutoMode = () => {
    // Only allow auto-toggle when class is running
    if (!runningClass) return;
    
    setAutoToggle(!autoToggle);
    if (!autoToggle) {
      setShowMotivation(false); // Start with class info when enabling auto-toggle
    }
  };

  const handleManualToggle = () => {
    // Only allow manual toggle when class is running
    if (!runningClass) return;
    
    if (autoToggle) {
      setAutoToggle(false); // Disable auto-toggle when manually toggling
    }
    setShowMotivation(!showMotivation);
    // Change quote when switching to motivation
    if (!showMotivation) {
      setCurrentQuoteIndex(Math.floor(Math.random() * motivationalQuotes.length));
    }
  };

  const currentQuote = motivationalQuotes[currentQuoteIndex];

  // Calculate time remaining for running class
  const getTimeRemaining = (endTime: string) => {
    const [endH, endM] = endTime.split(':').map(Number);
    const endTimeDate = new Date(currentTime);
    endTimeDate.setHours(endH, endM, 0, 0);
    const diff = endTimeDate.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate time until next class
  const getTimeUntil = (startTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const startTimeDate = new Date(currentTime);
    startTimeDate.setHours(startH, startM, 0, 0);
    const diff = startTimeDate.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Render class information
  const renderClassInfo = () => {
    // Running Class
    if (runningClass) {
      return (
        <div className={cn(
          "bg-gradient-to-r border-2 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg",
          runningClass.subject.toLowerCase().includes('lab')
            ? "from-emerald-500/20 via-emerald-400/10 to-transparent border-emerald-500/30"
            : "from-primary/20 via-primary/10 to-transparent border-primary/30"
        )}>
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className={cn(
              "w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0",
              runningClass.subject.toLowerCase().includes('lab')
                ? "bg-emerald-500/20"
                : "bg-primary/20"
            )}>
              {runningClass.subject.toLowerCase().includes('lab') ? (
                <FlaskConical className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-emerald-600 animate-pulse" />
              ) : (
                <PlayCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-primary animate-pulse" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "px-2 py-0.5 text-[10px] md:text-xs font-semibold rounded-full",
                  runningClass.subject.toLowerCase().includes('lab')
                    ? "bg-emerald-500/20 text-emerald-700"
                    : "bg-primary/20 text-primary"
                )}>
                  {runningClass.subject.toLowerCase().includes('lab') ? 'Lab in Progress' : 'Running Now'}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {runningClass.startTime} - {runningClass.endTime}
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">{runningClass.subject}</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                {runningClass.code} • Room: {runningClass.room} • {runningClass.teacher}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-xs text-muted-foreground">Time Left</div>
              <div className={cn(
                "text-sm md:text-base lg:text-lg font-bold",
                runningClass.subject.toLowerCase().includes('lab') ? "text-emerald-600" : "text-primary"
              )}>
                {getTimeRemaining(runningClass.endTime)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Upcoming Class
    if (upcomingClass) {
      return (
        <div className="bg-gradient-to-r from-blue-500/20 via-blue-400/10 to-transparent border-2 border-blue-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-700 text-[10px] md:text-xs font-semibold rounded-full">
                  Up Next
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {upcomingClass.startTime} - {upcomingClass.endTime}
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">{upcomingClass.subject}</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                {upcomingClass.code} • Room: {upcomingClass.room} • {upcomingClass.teacher}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-xs text-muted-foreground">Starts In</div>
              <div className="text-sm md:text-base lg:text-lg font-bold text-blue-600">
                {getTimeUntil(upcomingClass.startTime)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Break Time
    if (isInBreak && upcomingClass) {
      return (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-2 border-amber-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-amber-600 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 text-[10px] md:text-xs font-semibold rounded-full">
                  Break Time
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  Relax & Recharge
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">Take a Break</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                Next: {upcomingClass.subject} at {upcomingClass.startTime}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-xs text-muted-foreground">Break Ends In</div>
              <div className="text-sm md:text-base lg:text-lg font-bold text-amber-600">
                {getTimeUntil(upcomingClass.startTime)}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Classes Completed
    if (classesCompleted && totalClasses > 0) {
      return (
        <div className="bg-gradient-to-r from-green-500/20 via-green-400/10 to-transparent border-2 border-green-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-green-500/20 text-green-700 text-[10px] md:text-xs font-semibold rounded-full">
                  All Done
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  Great job today!
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">Classes Completed</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                You've finished all {totalClasses} classes for today
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-xs text-muted-foreground">Status</div>
              <div className="text-sm md:text-base lg:text-lg font-bold text-green-600">
                Complete
              </div>
            </div>
          </div>
        </div>
      );
    }

    // No Classes Today
    return (
      <div className="bg-gradient-to-r from-slate-500/20 via-slate-400/10 to-transparent border-2 border-slate-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-slate-500/20 flex items-center justify-center flex-shrink-0">
            <Moon className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-slate-500/20 text-slate-700 text-[10px] md:text-xs font-semibold rounded-full">
                Free Day
              </span>
              <span className="text-[10px] md:text-xs text-muted-foreground">
                Enjoy your day off
              </span>
            </div>
            <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">No Classes Today</h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
              Take some time to relax or catch up on studies
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] md:text-xs text-muted-foreground">Status</div>
            <div className="text-sm md:text-base lg:text-lg font-bold text-slate-600">
              Free
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render motivational content
  const renderMotivationalContent = () => {
    return (
      <div className="bg-gradient-to-r from-purple-500/20 via-pink-400/10 to-transparent border-2 border-purple-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
        <div className="flex items-start gap-2 md:gap-3 lg:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-purple-600 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-700 text-[10px] md:text-xs font-semibold rounded-full">
                Motivation
              </span>
              <Heart className="w-3 h-3 md:w-4 md:h-4 text-pink-500 animate-pulse" />
            </div>
            
            {/* Bengali Quote */}
            <div className="mb-3">
              <p className="text-sm md:text-base lg:text-lg font-semibold text-purple-800 dark:text-purple-200 leading-relaxed">
                {currentQuote.bengali}
              </p>
            </div>
            
            {/* English Translation */}
            <div className="mb-2">
              <p className="text-xs md:text-sm lg:text-base text-purple-700 dark:text-purple-300 leading-relaxed italic">
                {currentQuote.english}
              </p>
            </div>
            
            {/* Reference */}
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500" />
              <p className="text-[10px] md:text-xs text-muted-foreground">
                Reference: {currentQuote.reference}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      {/* Control Buttons - Only show when class is running */}
      {runningClass && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualToggle}
              className="gap-2 text-xs"
            >
              {showMotivation ? (
                <>
                  <BookOpen className="w-3 h-3" />
                  Show Class Info
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Show Motivation
                </>
              )}
            </Button>
            
            <Button
              variant={autoToggle ? "default" : "outline"}
              size="sm"
              onClick={handleToggleAutoMode}
              className="gap-2 text-xs"
            >
              {autoToggle ? (
                <>
                  <ToggleRight className="w-3 h-3" />
                  Auto (30s)
                </>
              ) : (
                <>
                  <ToggleLeft className="w-3 h-3" />
                  Manual
                </>
              )}
            </Button>
          </div>
          
          {autoToggle && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Timer className="w-3 h-3" />
              <span>Auto-switching every 30s</span>
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={showMotivation ? 'motivation' : 'class'}
          initial={{ opacity: 0, x: showMotivation ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: showMotivation ? -20 : 20 }}
          transition={{ duration: 0.3 }}
        >
          {showMotivation ? renderMotivationalContent() : renderClassInfo()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}