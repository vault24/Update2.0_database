import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";
import { mockSubjects } from "@/data/mockClassActivities";

interface AssignmentFiltersProps {
  selectedSubject: string;
  selectedStatus: string;
  onSubjectChange: (subject: string) => void;
  onStatusChange: (status: string) => void;
}

const statuses = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'late', label: 'Late' },
  { value: 'graded', label: 'Graded' },
];

export function AssignmentFilters({
  selectedSubject,
  selectedStatus,
  onSubjectChange,
  onStatusChange,
}: AssignmentFiltersProps) {
  const hasFilters = selectedSubject !== 'all' || selectedStatus !== 'all';

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Status Filter */}
      <div>
        <span className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 block">Status</span>
        <ScrollArea className="w-full -mx-1 px-1">
          <div className="flex gap-1.5 sm:gap-2 pb-1">
            {statuses.map((status) => (
              <Button
                key={status.value}
                variant={selectedStatus === status.value ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                onClick={() => onStatusChange(status.value)}
              >
                {status.label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Subject Filter */}
      <div>
        <span className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 block">Subject</span>
        <ScrollArea className="w-full -mx-1 px-1">
          <div className="flex gap-1.5 sm:gap-2 pb-1">
            <Button
              variant={selectedSubject === 'all' ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
              onClick={() => onSubjectChange('all')}
            >
              All
            </Button>
            {mockSubjects.map((subject) => (
              <Button
                key={subject.id}
                variant={selectedSubject === subject.id ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                onClick={() => onSubjectChange(subject.id)}
              >
                <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${subject.color} mr-1 sm:mr-2`} />
                {subject.code}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            onSubjectChange('all');
            onStatusChange('all');
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
