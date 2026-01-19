import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Video, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink,
  Youtube,
  Users,
  Copy,
  Check
} from "lucide-react";
import { LiveClass, getPlatformInfo } from "@/data/mockLiveClasses";
import { format, parseISO, differenceInMinutes, isToday, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

interface LiveClassCardProps {
  liveClass: LiveClass;
}

export function LiveClassCard({ liveClass }: LiveClassCardProps) {
  const [countdown, setCountdown] = useState<string>("");
  const [copied, setCopied] = useState(false);
  
  const platformInfo = getPlatformInfo(liveClass.platform);
  
  useEffect(() => {
    const calculateCountdown = () => {
      const classDateTime = new Date(`${liveClass.date}T${liveClass.startTime}`);
      const now = new Date();
      const diffMinutes = differenceInMinutes(classDateTime, now);
      
      if (diffMinutes <= 0) {
        return liveClass.isLive ? "Live Now!" : "Ended";
      }
      
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `Starts in ${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        return `Starts in ${hours}h ${minutes}m`;
      } else {
        return `Starts in ${minutes}m`;
      }
    };

    setCountdown(calculateCountdown());
    const interval = setInterval(() => setCountdown(calculateCountdown()), 60000);
    return () => clearInterval(interval);
  }, [liveClass]);

  const handleCopyMeetingId = () => {
    if (liveClass.meetingId) {
      navigator.clipboard.writeText(liveClass.meetingId);
      setCopied(true);
      toast({ title: "Meeting ID copied!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinClass = () => {
    window.open(liveClass.meetingLink, '_blank');
  };

  const classDate = parseISO(liveClass.date);
  const dateLabel = isToday(classDate) ? "Today" : isTomorrow(classDate) ? "Tomorrow" : format(classDate, 'MMM dd');

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md overflow-hidden",
      liveClass.isLive && "ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/20"
    )}>
      {/* Live Badge Strip */}
      {liveClass.isLive && (
        <div className="bg-red-500 text-white px-4 py-1.5 flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-sm font-medium">LIVE NOW</span>
        </div>
      )}

      <CardContent className={cn("p-4", liveClass.isLive && "pt-4")}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className="text-xs">
                {liveClass.subjectCode}
              </Badge>
              <Badge className={cn(platformInfo.color, "text-white")}>
                <Video className="h-3 w-3 mr-1" />
                {platformInfo.name}
              </Badge>
              {liveClass.isRecorded && (
                <Badge variant="secondary" className="text-xs">
                  Recorded
                </Badge>
              )}
            </div>
            
            <h4 className="font-semibold text-foreground line-clamp-2">
              {liveClass.topic}
            </h4>
            
            <p className="text-sm text-muted-foreground mt-1">
              {liveClass.subjectName}
            </p>
          </div>
        </div>

        {/* Description */}
        {liveClass.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {liveClass.description}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {liveClass.teacherName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {dateLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {liveClass.startTime} - {liveClass.endTime}
          </span>
        </div>

        {/* Meeting Details (Zoom/Teams) */}
        {(liveClass.meetingId || liveClass.passcode) && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-2">
            {liveClass.meetingId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meeting ID:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">{liveClass.meetingId}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={handleCopyMeetingId}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            )}
            {liveClass.passcode && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Passcode:</span>
                <span className="text-sm font-mono">{liveClass.passcode}</span>
              </div>
            )}
          </div>
        )}

        {/* Countdown & Join Button */}
        <div className="flex items-center justify-between gap-3">
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium",
            liveClass.isLive 
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 animate-pulse" 
              : "bg-muted text-muted-foreground"
          )}>
            {countdown}
          </div>
          
          <Button 
            onClick={handleJoinClass}
            className={cn(
              "gap-2",
              liveClass.isLive && "bg-red-600 hover:bg-red-700"
            )}
          >
            <ExternalLink className="h-4 w-4" />
            {liveClass.isLive ? "Join Now" : "Join Class"}
          </Button>
        </div>

        {/* Recording Link */}
        {liveClass.recordingLink && !liveClass.isLive && (
          <Button 
            variant="outline" 
            className="w-full mt-3 gap-2"
            onClick={() => window.open(liveClass.recordingLink, '_blank')}
          >
            <Youtube className="h-4 w-4" />
            Watch Recording
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
