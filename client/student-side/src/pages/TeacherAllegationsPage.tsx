import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  FileText,
  Users,
  Shield,
  TrendingUp,
  Flag,
  CheckCircle2,
  Clock,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AllegationForm } from "@/components/allegations/AllegationForm";
import { AllegationCard } from "@/components/allegations/AllegationCard";
import { AllegationFilters } from "@/components/allegations/AllegationFilters";
import {
  mockAllegations,
  AllegationCategory,
  SeverityLevel,
  AllegationStatus,
} from "@/data/mockAllegations";

export default function TeacherAllegationsPage() {
  const [activeTab, setActiveTab] = useState("list");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [allegations, setAllegations] = useState(mockAllegations);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<AllegationCategory | 'all'>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'all'>("all");
  const [selectedStatus, setSelectedStatus] = useState<AllegationStatus | 'all'>("all");

  // Stats
  const stats = useMemo(() => {
    const total = allegations.length;
    const reported = allegations.filter((a) => a.status === 'reported').length;
    const underReview = allegations.filter((a) => a.status === 'under_review').length;
    const resolved = allegations.filter((a) => a.status === 'resolved').length;
    const escalated = allegations.filter((a) => a.isEscalated).length;
    return { total, reported, underReview, resolved, escalated };
  }, [allegations]);

  // Filtered allegations
  const filteredAllegations = useMemo(() => {
    return allegations.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.studentRoll.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'all' || a.departmentId === selectedClass;
      const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
      const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
      const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;
      return matchesSearch && matchesClass && matchesCategory && matchesSeverity && matchesStatus;
    });
  }, [allegations, searchQuery, selectedClass, selectedCategory, selectedSeverity, selectedStatus]);

  // Escalated allegations (read-only for admin view)
  const escalatedAllegations = useMemo(() => {
    return allegations.filter((a) => a.isEscalated);
  }, [allegations]);

  const activeFiltersCount = [
    selectedClass !== 'all',
    selectedCategory !== 'all',
    selectedSeverity !== 'all',
    selectedStatus !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClass("all");
    setSelectedCategory("all");
    setSelectedSeverity("all");
    setSelectedStatus("all");
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    // In a real app, we'd refetch data here
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-7 h-7" />
              Behavioral Guidance
            </h1>
            <p className="text-white/80 mt-1 text-sm">
              Report incidents with focus on improvement and corrective action
            </p>
          </div>
          <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-1 shrink-0">
                <Plus className="w-4 h-4" />
                New Report
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Create Allegation Report
                </SheetTitle>
              </SheetHeader>
              <AllegationForm onSuccess={handleFormSuccess} />
            </SheetContent>
          </Sheet>
        </div>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="list" className="gap-1">
            <FileText className="w-4 h-4" />
            All Reports
          </TabsTrigger>
          <TabsTrigger value="escalated" className="gap-1">
            <AlertTriangle className="w-4 h-4" />
            Escalated
            {stats.escalated > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                {stats.escalated}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <AllegationFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedClass={selectedClass}
            onClassChange={setSelectedClass}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSeverity={selectedSeverity}
            onSeverityChange={setSelectedSeverity}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            onClearFilters={clearFilters}
            activeFiltersCount={activeFiltersCount}
          />

          {/* Allegations List */}
          <div className="space-y-3">
            {filteredAllegations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">No Reports Found</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeFiltersCount > 0
                      ? "Try adjusting your filters"
                      : "Create your first allegation report"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAllegations.map((allegation) => (
                <AllegationCard key={allegation.id} allegation={allegation} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="escalated" className="mt-4 space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Admin View Only</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  These cases have been automatically escalated due to their serious nature.
                  They are visible to department heads and administrators for review and action.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {escalatedAllegations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-green-500/50 mb-4" />
                  <h3 className="font-medium text-lg mb-1">No Escalated Cases</h3>
                  <p className="text-sm text-muted-foreground">
                    There are currently no cases requiring administrative attention
                  </p>
                </CardContent>
              </Card>
            ) : (
              escalatedAllegations.map((allegation) => (
                <AllegationCard key={allegation.id} allegation={allegation} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
