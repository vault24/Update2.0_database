import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlayCircle,
  ArrowRight,
  Coffee,
  CheckCircle,
  Moon,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Timer,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motivationService, type MotivationMessage } from '@/services/motivationService';

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

const DEFAULT_ROTATION_SECONDS = 45;
const CLASS_MOTIVATION_TOGGLE_SECONDS = 30;

export function ClassStatusBox({
  runningClass,
  upcomingClass,
  isInBreak,
  classesCompleted,
  totalClasses = 0,
  currentTime = new Date(),
  className,
}: ClassStatusBoxProps) {
  const [showMotivation, setShowMotivation] = useState(false);
  const [autoToggle, setAutoToggle] = useState(false);
  const [messages, setMessages] = useState<MotivationMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMotivationEnabled, setIsMotivationEnabled] = useState(true);
  const [autoRotateMessages, setAutoRotateMessages] = useState(true);
  const [rotationInterval, setRotationInterval] = useState(DEFAULT_ROTATION_SECONDS);

  const canShowMotivation = isMotivationEnabled && messages.length > 0;

  const currentMessage = useMemo(() => {
    if (!canShowMotivation) return null;
    return messages[currentIndex] ?? messages[0] ?? null;
  }, [canShowMotivation, currentIndex, messages]);

  const getRandomMessageIndex = (length: number, exclude?: number) => {
    if (length <= 1) return 0;
    let nextIndex = Math.floor(Math.random() * length);
    while (exclude !== undefined && nextIndex === exclude) {
      nextIndex = Math.floor(Math.random() * length);
    }
    return nextIndex;
  };

  useEffect(() => {
    const loadMotivationData = async () => {
      try {
        const [settings, response] = await Promise.all([
          motivationService.getSettings(),
          motivationService.getActiveMotivations('bn'),
        ]);

        setIsMotivationEnabled(settings.is_enabled);
        setAutoRotateMessages(settings.auto_rotate);
        setRotationInterval(
          settings.rotation_interval > 0 ? settings.rotation_interval : DEFAULT_ROTATION_SECONDS
        );

        setMessages(response.results || []);
        setCurrentIndex(getRandomMessageIndex(response.results?.length || 0));
      } catch (error) {
        console.error('Failed to load motivation settings/messages:', error);
        setIsMotivationEnabled(false);
        setMessages([]);
      }
    };

    loadMotivationData();
  }, []);

  useEffect(() => {
    if (!runningClass) {
      setShowMotivation(canShowMotivation);
      setAutoToggle(false);
      return;
    }

    setShowMotivation(false);
  }, [runningClass, canShowMotivation]);

  useEffect(() => {
    if (!showMotivation || !canShowMotivation || !autoRotateMessages || messages.length <= 1) {
      return;
    }

    const intervalMs = Math.max(5, rotationInterval) * 1000;
    const quoteInterval = setInterval(() => {
      setCurrentIndex(prev => getRandomMessageIndex(messages.length, prev));
    }, intervalMs);

    return () => clearInterval(quoteInterval);
  }, [showMotivation, canShowMotivation, autoRotateMessages, messages.length, rotationInterval]);

  useEffect(() => {
    if (!autoToggle || !runningClass || !canShowMotivation) return;

    const interval = setInterval(() => {
      setShowMotivation(prev => !prev);
    }, CLASS_MOTIVATION_TOGGLE_SECONDS * 1000);

    return () => clearInterval(interval);
  }, [autoToggle, runningClass, canShowMotivation]);

  useEffect(() => {
    if (currentMessage?.id) {
      motivationService.recordView(currentMessage.id, 'bn');
    }
  }, [currentMessage?.id]);

  const handleToggleAutoMode = () => {
    if (!runningClass || !canShowMotivation) return;

    setAutoToggle(prev => {
      const next = !prev;
      if (next) setShowMotivation(false);
      return next;
    });
  };

  const handleManualToggle = () => {
    if (!runningClass || !canShowMotivation) return;

    setAutoToggle(false);
    setShowMotivation(prev => {
      const next = !prev;
      if (next && messages.length > 1) {
        setCurrentIndex(current => getRandomMessageIndex(messages.length, current));
      }
      return next;
    });
  };

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

  const renderClassInfo = () => {
    if (runningClass) {
      return (
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <PlayCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] md:text-xs font-semibold rounded-full">
                  Running Now
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground">
                  {runningClass.startTime} - {runningClass.endTime}
                </span>
              </div>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate">{runningClass.subject}</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                {runningClass.code} | Room: {runningClass.room} | {runningClass.teacher}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] md:text-xs text-muted-foreground">Time Left</div>
              <div className="text-sm md:text-base lg:text-lg font-bold text-primary">
                {getTimeRemaining(runningClass.endTime)}
              </div>
            </div>
          </div>
        </div>
      );
    }

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
                {upcomingClass.code} | Room: {upcomingClass.room} | {upcomingClass.teacher}
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

    if (isInBreak && upcomingClass) {
      return (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border-2 border-amber-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-amber-600 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 text-[10px] md:text-xs font-semibold rounded-full">
                Break Time
              </span>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate mt-1">Take a Break</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                Next: {upcomingClass.subject} at {upcomingClass.startTime}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (classesCompleted && totalClasses > 0) {
      return (
        <div className="bg-gradient-to-r from-green-500/20 via-green-400/10 to-transparent border-2 border-green-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
          <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-700 text-[10px] md:text-xs font-semibold rounded-full">
                All Done
              </span>
              <h3 className="text-sm md:text-base lg:text-lg font-bold truncate mt-1">Classes Completed</h3>
              <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
                You finished all {totalClasses} classes for today
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-slate-500/20 via-slate-400/10 to-transparent border-2 border-slate-500/30 rounded-lg md:rounded-xl lg:rounded-2xl p-3 md:p-4 lg:p-5 shadow-lg">
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg md:rounded-xl bg-slate-500/20 flex items-center justify-center flex-shrink-0">
            <Moon className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="px-2 py-0.5 bg-slate-500/20 text-slate-700 text-[10px] md:text-xs font-semibold rounded-full">
              Free Day
            </span>
            <h3 className="text-sm md:text-base lg:text-lg font-bold truncate mt-1">No Classes Today</h3>
            <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground truncate">
              Relax or use this time for self-study.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderMotivationalContent = () => {
    if (!currentMessage) {
      return renderClassInfo();
    }

    const primaryMessage = currentMessage.localized_message || currentMessage.message || '';
    const secondaryMessage = currentMessage.message && currentMessage.message !== primaryMessage
      ? currentMessage.message
      : undefined;
    const normalizeAuthor = (value?: string) => {
      const cleaned = (value || '').trim();
      if (!cleaned) return '';
      if (cleaned.toLowerCase() === 'unknown') return '';
      return cleaned;
    };

    const normalizeReference = (value?: string) => {
      const cleaned = (value || '').trim();
      if (!cleaned) return '';
      return cleaned.replace(/^reference:\s*/i, '');
    };

    const primaryAuthor = normalizeAuthor(currentMessage.localized_author || currentMessage.author);
    const normalizedAuthor = normalizeAuthor(currentMessage.author);
    const secondaryAuthor = normalizedAuthor && normalizedAuthor !== primaryAuthor
      ? normalizedAuthor
      : undefined;
    const referenceText = normalizeReference(currentMessage.reference_source);

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
            </div>

            <p className="text-sm md:text-base lg:text-lg font-semibold text-purple-800 dark:text-purple-200 leading-relaxed">
              {primaryMessage}
            </p>

            {secondaryMessage && (
              <p className="text-xs md:text-sm lg:text-base text-purple-700 dark:text-purple-300 leading-relaxed italic mt-2">
                {secondaryMessage}
              </p>
            )}

            {primaryAuthor && (
              <p className="text-xs md:text-sm text-purple-700 dark:text-purple-300 mt-2">
                - {primaryAuthor}
              </p>
            )}

            {secondaryAuthor && (
              <p className="text-[11px] md:text-xs text-purple-600 dark:text-purple-400 mt-1">
                - {secondaryAuthor}
              </p>
            )}

            {referenceText && (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-3 h-3 text-amber-500" />
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Reference: {referenceText}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-3', className)}
    >
      {runningClass && canShowMotivation && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleManualToggle} className="gap-2 text-xs">
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
              variant={autoToggle ? 'default' : 'outline'}
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

      <AnimatePresence mode="wait">
        <motion.div
          key={showMotivation ? 'motivation' : 'class'}
          initial={{ opacity: 0, x: showMotivation ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: showMotivation ? -20 : 20 }}
          transition={{ duration: 0.3 }}
        >
          {showMotivation && canShowMotivation ? renderMotivationalContent() : renderClassInfo()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
