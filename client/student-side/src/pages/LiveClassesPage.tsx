import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Video, 
  Calendar, 
  List,
  CalendarDays,
  Radio,
  Clock,
  Users,
  Sparkles,
  Play,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { mockLiveClasses, LiveClass } from "@/data/mockLiveClasses";
import { LiveClassCard } from "@/components/live-classes/LiveClassCard";
import { format, parseISO, isToday, isTomorrow, addDays, isSameDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import TeacherAdminPage from "./TeacherAdminPage";

export default function LiveClassesPage() {
  const { user } = useAuth();

  // If teacher, show the admin panel with live classes tab
  if (user?.role === 'teacher') {
    return <TeacherAdminPage defaultTab="live-classes" showOnlyLiveClasses />;
  }
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Separate classes
  const liveNow = mockLiveClasses.filter(c => c.isLive);
  const todayClasses = mockLiveClasses.filter(c => 
    isToday(parseISO(c.date)) && !c.isLive
  );
  const tomorrowClasses = mockLiveClasses.filter(c => 
    isTomorrow(parseISO(c.date))
  );
  const upcomingClasses = mockLiveClasses.filter(c => {
    const classDate = parseISO(c.date);
    return !isToday(classDate) && !isTomorrow(classDate);
  });

  // Group by date for calendar view
  const groupByDate = (classes: LiveClass[]) => {
    const grouped: { [key: string]: LiveClass[] } = {};
    classes.forEach(c => {
      const dateKey = c.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(c);
    });
    return grouped;
  };

  const allGrouped = groupByDate(mockLiveClasses);
  const sortedDates = Object.keys(allGrouped).sort();

  // Stats
  const totalClasses = mockLiveClasses.length;
  const recordedClasses = mockLiveClasses.filter(c => c.isRecorded).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background max-w-full overflow-x-hidden"
    >
      {/* Beautiful Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-destructive/15 via-primary/10 to-accent/5 border-b border-border">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 gradient-mesh opacity-40" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-2xl" />
        
        {/* Floating decorative elements */}
        <div className="absolute top-20 right-20 w-4 h-4 bg-destructive/30 rounded-full animate-float" />
        <div className="absolute bottom-10 right-40 w-3 h-3 bg-primary/40 rounded-full animate-bounce-subtle" />
        
        <div className="relative p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl gradient-primary shadow-glow relative">
                  <Video className="h-8 w-8 text-primary-foreground" />
                  {liveNow.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                    Live Classes
                    {liveNow.length > 0 && (
                      <Badge variant="destructive" className="animate-pulse gap-1">
                        <Wifi className="h-3 w-3" />
                        {liveNow.length} Live
                      </Badge>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Join your online classes and access recordings
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex gap-2 bg-card/80 backdrop-blur-sm rounded-xl p-1 shadow-sm border border-border/50">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendar</span>
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-card/60 backdrop-blur-sm border-destructive/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-destructive/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="p-2.5 rounded-xl bg-destructive/10">
                    <Radio className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{liveNow.length}</p>
                    <p className="text-xs text-muted-foreground">Live Now</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{todayClasses.length}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-accent/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="p-2.5 rounded-xl bg-accent/10">
                    <Video className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalClasses}</p>
                    <p className="text-xs text-muted-foreground">Total Classes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/60 backdrop-blur-sm border-success/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-success/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <CardContent className="p-4 flex items-center gap-3 relative">
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <Play className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{recordedClasses}</p>
                    <p className="text-xs text-muted-foreground">Recordings</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Now Alert */}
            {liveNow.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4"
              >
                <Card className="bg-gradient-to-r from-destructive/20 via-destructive/10 to-transparent border-destructive/30 overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative">
                      <div className="p-3 rounded-full bg-destructive/20">
                        <Radio className="h-8 w-8 text-destructive" />
                      </div>
                      <span className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full animate-ping" />
                      <span className="absolute top-0 right-0 h-4 w-4 bg-destructive rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg text-destructive dark:text-red-400">
                        {liveNow.length} Class{liveNow.length > 1 ? 'es' : ''} Live Now!
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {liveNow.map(c => c.subjectName).join(' • ')}
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="gap-2 shadow-lg"
                      onClick={() => window.open(liveNow[0].meetingLink, '_blank')}
                    >
                      Join Now
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {viewMode === 'list' ? (
            <motion.div
              key="list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* Live Now Section */}
              {liveNow.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                    </span>
                    <h2 className="text-xl font-bold text-foreground">Live Now</h2>
                    <Badge variant="outline" className="text-destructive border-destructive/50">
                      {liveNow.length} active
                    </Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {liveNow.map((liveClass) => (
                      <LiveClassCard key={liveClass.id} liveClass={liveClass} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Today's Classes */}
              {todayClasses.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Today's Classes</h2>
                    <Badge variant="secondary">{todayClasses.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {todayClasses.map((liveClass) => (
                      <LiveClassCard key={liveClass.id} liveClass={liveClass} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Tomorrow's Classes */}
              {tomorrowClasses.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Tomorrow</h2>
                    <Badge variant="outline">{tomorrowClasses.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {tomorrowClasses.map((liveClass) => (
                      <LiveClassCard key={liveClass.id} liveClass={liveClass} />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Upcoming Classes */}
              {upcomingClasses.length > 0 && (
                <motion.div variants={itemVariants}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Upcoming</h2>
                    <Badge variant="outline">{upcomingClasses.length}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {upcomingClasses.map((liveClass) => (
                      <LiveClassCard key={liveClass.id} liveClass={liveClass} />
                    ))}
                  </div>
                </motion.div>
              )}

              {mockLiveClasses.length === 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="p-12 text-center border-dashed">
                    <div className="p-4 rounded-full bg-muted w-fit mx-auto mb-4">
                      <Video className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Live Classes Scheduled</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Check back later for upcoming live sessions and recordings.
                    </p>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Calendar View */
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {sortedDates.map((dateStr) => {
                const date = parseISO(dateStr);
                const classes = allGrouped[dateStr];
                const isCurrentDay = isToday(date);
                
                return (
                  <motion.div
                    key={dateStr}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={`sticky top-0 z-10 py-3 px-4 rounded-xl mb-4 flex items-center justify-between ${
                      isCurrentDay 
                        ? 'gradient-primary text-primary-foreground shadow-glow' 
                        : 'bg-muted/80 backdrop-blur-sm'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
                        <span className="font-bold">
                          {isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEEE')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isCurrentDay ? "secondary" : "outline"} className={isCurrentDay ? "bg-white/20 text-primary-foreground border-0" : ""}>
                          {classes.length} class{classes.length > 1 ? 'es' : ''}
                        </Badge>
                        <span className={`text-sm ${isCurrentDay ? 'opacity-80' : 'text-muted-foreground'}`}>
                          {format(date, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 pl-2">
                      {classes.map((liveClass) => (
                        <LiveClassCard key={liveClass.id} liveClass={liveClass} />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
