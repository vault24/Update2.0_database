import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DayCard } from './DayCard';
import { cn } from '@/lib/utils';

type ClassPeriod = {
  id: string;
  startTime: string;
  endTime: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
};

type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

type SwipeableDaysProps = {
  days: DayOfWeek[];
  schedule: Record<DayOfWeek, (ClassPeriod | null)[]>;
  timeSlots: string[];
  currentDay: DayOfWeek;
  runningClassId?: string;
  upcomingClassId?: string;
};

export function SwipeableDays({
  days,
  schedule,
  timeSlots,
  currentDay,
  runningClassId,
  upcomingClassId,
}: SwipeableDaysProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Scroll to current day on mount
  useEffect(() => {
    const todayIndex = days.indexOf(currentDay);
    if (todayIndex >= 0) {
      setActiveIndex(todayIndex);
      scrollToIndex(todayIndex, false);
    }
  }, [currentDay, days]);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollToIndex = (index: number, smooth = true) => {
    if (!scrollRef.current) return;
    const cardWidth = 300; // Approximate card width including gap
    const scrollPosition = index * cardWidth - (scrollRef.current.clientWidth - cardWidth) / 2;
    scrollRef.current.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: smooth ? 'smooth' : 'auto',
    });
    setActiveIndex(index);
  };

  const scroll = (direction: 'left' | 'right') => {
    const newIndex = direction === 'left' 
      ? Math.max(0, activeIndex - 1) 
      : Math.min(days.length - 1, activeIndex + 1);
    scrollToIndex(newIndex);
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => ref.removeEventListener('scroll', updateScrollButtons);
    }
  }, []);

  return (
    <div className="relative">
      {/* Day Pills Navigation */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day, index) => (
          <button
            key={day}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              index === activeIndex
                ? "bg-primary text-primary-foreground shadow-md"
                : day === currentDay
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Swipeable Container */}
      <div className="relative group">
        {/* Left Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur shadow-lg border border-border transition-opacity",
            "hidden md:flex",
            !canScrollLeft && "opacity-0 pointer-events-none"
          )}
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Scrollable Cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map((day, index) => (
            <DayCard
              key={day}
              day={day}
              classes={schedule[day] || []}
              timeSlots={timeSlots}
              isToday={day === currentDay}
              runningClassId={day === currentDay ? runningClassId : undefined}
              upcomingClassId={day === currentDay ? upcomingClassId : undefined}
            />
          ))}
        </div>

        {/* Right Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background/80 backdrop-blur shadow-lg border border-border transition-opacity",
            "hidden md:flex",
            !canScrollRight && "opacity-0 pointer-events-none"
          )}
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Dot Indicators (Mobile) */}
      <div className="flex justify-center gap-1.5 mt-3 md:hidden">
        {days.map((day, index) => (
          <button
            key={day}
            onClick={() => scrollToIndex(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === activeIndex
                ? "bg-primary w-4"
                : day === currentDay
                ? "bg-primary/50"
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}
