import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  User,
  Calendar,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Send,
  CheckCircle2,
  Info,
  Building2,
  GraduationCap,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import {
  mockStudents,
  allegationCategories,
  severityLevels,
  correctiveActions,
  mockDepartments,
  mockSemesters,
  mockShifts,
  AllegationCategory,
  SeverityLevel,
} from "@/data/mockAllegations";
import { cn } from "@/lib/utils";

interface AllegationFormProps {
  onSuccess: () => void;
}

export function AllegationForm({ onSuccess }: AllegationFormProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Form State
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [incidentDate, setIncidentDate] = useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [category, setCategory] = useState<AllegationCategory | "">("");
  const [severity, setSeverity] = useState<SeverityLevel | "">("");
  const [description, setDescription] = useState("");
  const [teacherAdvice, setTeacherAdvice] = useState("");
  const [suggestedAction, setSuggestedAction] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  // Filtered students based on selections
  const filteredStudents = useMemo(() => {
    let students = mockStudents;
    
    if (selectedDepartment) {
      students = students.filter((s) => s.departmentId === selectedDepartment);
    }
    if (selectedSemester) {
      students = students.filter((s) => s.semester === selectedSemester);
    }
    if (selectedShift) {
      students = students.filter((s) => s.shift === selectedShift);
    }
    if (studentSearch) {
      const search = studentSearch.toLowerCase();
      students = students.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.roll.toLowerCase().includes(search)
      );
    }
    return students;
  }, [selectedDepartment, selectedSemester, selectedShift, studentSearch]);

  const selectedStudentData = useMemo(() => {
    return mockStudents.find((s) => s.id === selectedStudent);
  }, [selectedStudent]);

  const isFormValid = selectedStudent && category && severity && 
    description.trim().length >= 20 && teacherAdvice.trim().length >= 20;

  const handleSubmit = () => {
    toast.success("Allegation reported successfully", {
      description: severity === 'serious' 
        ? "This case has been automatically escalated for review."
        : "The relevant authorities will be notified.",
    });
    setShowConfirmDialog(false);
    onSuccess();
  };

  const getSeverityColor = (sev: SeverityLevel) => {
    switch (sev) {
      case 'minor': return 'bg-yellow-500';
      case 'moderate': return 'bg-orange-500';
      case 'serious': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Academic Selection Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Department
            </Label>
            <Select value={selectedDepartment} onValueChange={(v) => {
              setSelectedDepartment(v);
              setSelectedStudent("");
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Dept" />
              </SelectTrigger>
              <SelectContent>
                {mockDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <GraduationCap className="w-3 h-3" />
              Semester
            </Label>
            <Select value={selectedSemester} onValueChange={(v) => {
              setSelectedSemester(v);
              setSelectedStudent("");
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Sem" />
              </SelectTrigger>
              <SelectContent>
                {mockSemesters.map((sem) => (
                  <SelectItem key={sem.id} value={sem.id}>
                    {sem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Shift
            </Label>
            <Select value={selectedShift} onValueChange={(v) => {
              setSelectedShift(v);
              setSelectedStudent("");
            }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Shift" />
              </SelectTrigger>
              <SelectContent>
                {mockShifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Incident Date */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Incident Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-left font-normal h-9"
              >
                <Calendar className="mr-2 h-3.5 w-3.5" />
                {incidentDate ? format(incidentDate, "PP") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={incidentDate}
                onSelect={setIncidentDate}
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Student Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <User className="w-3 h-3" />
            Select Student
          </Label>
          <Input
            placeholder="Search name or roll..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-1.5">
            {filteredStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No students found
              </p>
            ) : (
              filteredStudents.slice(0, 10).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudent(student.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-xs transition-colors",
                    selectedStudent === student.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="font-medium">{student.name}</span>
                  <span className="ml-1 opacity-70">{student.roll}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Category Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Category
          </Label>
          <Select value={category} onValueChange={(v) => setCategory(v as AllegationCategory)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {allegationCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Selection */}
        <div className="space-y-1.5">
          <Label className="text-xs">Severity Level</Label>
          <div className="grid grid-cols-3 gap-2">
            {severityLevels.map((sev) => (
              <button
                key={sev.value}
                type="button"
                onClick={() => setSeverity(sev.value)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all text-xs",
                  severity === sev.value
                    ? `${sev.color} text-white border-transparent`
                    : "hover:bg-muted"
                )}
              >
                {sev.label}
              </button>
            ))}
          </div>
          {severity === 'serious' && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Auto-escalated to admin
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            Incident Description
          </Label>
          <Textarea
            placeholder="What happened..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            {description.length}/20 min
          </p>
        </div>

        {/* Teacher Advice */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-yellow-500" />
            Guidance (Required)
          </Label>
          <Textarea
            placeholder="Constructive guidance..."
            value={teacherAdvice}
            onChange={(e) => setTeacherAdvice(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            {teacherAdvice.length}/20 min
          </p>
        </div>

        {/* Suggested Action */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            Corrective Action (Optional)
          </Label>
          <Select value={suggestedAction} onValueChange={setSuggestedAction}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select action..." />
            </SelectTrigger>
            <SelectContent>
              {correctiveActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attachment */}
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            Attachment (Optional)
          </Label>
          <Input
            type="file"
            onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            accept="image/*,.pdf,.doc,.docx"
            className="h-9 text-sm"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!isFormValid}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          Submit Report
        </Button>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Submit a {severity} allegation for{" "}
              <strong>{selectedStudentData?.name}</strong>? This cannot be undone.
              {severity === 'serious' && (
                <span className="block mt-2 text-destructive">
                  This will be escalated to admin.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}