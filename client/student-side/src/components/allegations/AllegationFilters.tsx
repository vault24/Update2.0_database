import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  mockClasses,
  allegationCategories,
  severityLevels,
  allegationStatuses,
  AllegationCategory,
  SeverityLevel,
  AllegationStatus,
} from "@/data/mockAllegations";

interface AllegationFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  selectedCategory: AllegationCategory | 'all';
  onCategoryChange: (value: AllegationCategory | 'all') => void;
  selectedSeverity: SeverityLevel | 'all';
  onSeverityChange: (value: SeverityLevel | 'all') => void;
  selectedStatus: AllegationStatus | 'all';
  onStatusChange: (value: AllegationStatus | 'all') => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function AllegationFilters({
  searchQuery,
  onSearchChange,
  selectedClass,
  onClassChange,
  selectedCategory,
  onCategoryChange,
  selectedSeverity,
  onSeverityChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  activeFiltersCount,
}: AllegationFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by student name or roll..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedClass} onValueChange={onClassChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {mockClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={(v) => onCategoryChange(v as AllegationCategory | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {allegationCategories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSeverity} onValueChange={(v) => onSeverityChange(v as SeverityLevel | 'all')}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {severityLevels.map((sev) => (
              <SelectItem key={sev.value} value={sev.value}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${sev.color}`} />
                  {sev.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={(v) => onStatusChange(v as AllegationStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {allegationStatuses.map((stat) => (
              <SelectItem key={stat.value} value={stat.value}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                  {stat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-1"
          >
            <X className="w-3 h-3" />
            Clear
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
}
