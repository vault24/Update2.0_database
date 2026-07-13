import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Mail,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Paperclip,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  routineService,
  type ClassRoutine,
  type ClassStudentsResponse,
  type SendClassEmailResponse,
} from '@/services/routineService';
import { getErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAX_ATTACHMENTS_TOTAL_BYTES = 10 * 1024 * 1024; // matches the backend cap

// JS getDay() → routine day names. Friday/Saturday are the weekend (no classes).
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const shiftLabel = (shift: string) => (shift === 'Morning' ? '1st Shift' : shift === 'Day' ? '2nd Shift' : shift);

export default function ClassEmailPage() {
  const { user } = useAuth();

  const [routines, setRoutines] = useState<ClassRoutine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [routinesError, setRoutinesError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null);

  const [students, setStudents] = useState<ClassStudentsResponse | null>(null);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<SendClassEmailResponse | null>(null);

  // Load the teacher's full weekly routine once.
  useEffect(() => {
    const teacherId = user?.relatedProfileId;
    if (!teacherId) {
      setRoutinesError('Teacher profile not found.');
      setRoutinesLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setRoutinesLoading(true);
        const data = await routineService.getMyRoutine({ teacher: teacherId });
        if (!cancelled) {
          setRoutines(data.routines);
          setRoutinesError(null);
        }
      } catch (error) {
        if (!cancelled) setRoutinesError(getErrorMessage(error));
      } finally {
        if (!cancelled) setRoutinesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.relatedProfileId]);

  const selectedDay = useMemo(() => {
    try {
      return DAY_NAMES[parseISO(selectedDate).getDay()];
    } catch {
      return DAY_NAMES[new Date().getDay()];
    }
  }, [selectedDate]);

  const isWeekend = selectedDay === 'Friday' || selectedDay === 'Saturday';

  const dayRoutines = useMemo(
    () =>
      routines
        .filter((r) => r.day_of_week === selectedDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [routines, selectedDay]
  );

  const selectedRoutine = dayRoutines.find((r) => r.id === selectedRoutineId) || null;

  // Changing the date clears a slot that no longer belongs to that day.
  useEffect(() => {
    if (selectedRoutineId && !dayRoutines.some((r) => r.id === selectedRoutineId)) {
      setSelectedRoutineId(null);
      setStudents(null);
      setLastResult(null);
    }
  }, [dayRoutines, selectedRoutineId]);

  const handleSelectRoutine = async (routine: ClassRoutine) => {
    setSelectedRoutineId(routine.id);
    setStudents(null);
    setLastResult(null);
    setShowStudentList(false);
    setStudentsLoading(true);
    try {
      const data = await routineService.getClassStudents(routine.id);
      setStudents(data);
    } catch (error) {
      toast.error('Could not load the class students', { description: getErrorMessage(error) });
    } finally {
      setStudentsLoading(false);
    }
  };

  const attachmentsTotal = attachments.reduce((sum, f) => sum + f.size, 0);

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const combined = [...attachments, ...incoming];
    const total = combined.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENTS_TOTAL_BYTES) {
      toast.error('Attachments are too large', {
        description: `Total attachment size must stay under ${formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}.`,
      });
      return;
    }
    setAttachments(combined);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend =
    !!selectedRoutine &&
    !!students &&
    students.with_email > 0 &&
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    !isSending;

  const handleSend = async () => {
    if (!selectedRoutine || !canSend) return;
    setIsSending(true);
    setLastResult(null);
    try {
      const result = await routineService.sendClassEmail(selectedRoutine.id, {
        subject: subject.trim(),
        message: message.trim(),
        classDate: format(parseISO(selectedDate), 'EEEE, d MMMM yyyy'),
        attachments,
      });
      setLastResult(result);
      if (result.success) {
        toast.success(`Email sent to ${result.recipients} student${result.recipients === 1 ? '' : 's'}`, {
          description:
            result.skipped_no_email > 0
              ? `${result.skipped_no_email} student(s) without an email address were skipped.`
              : 'All students in the class were reached.',
        });
        setSubject('');
        setMessage('');
        setAttachments([]);
      } else {
        toast.error('Failed to send the email', { description: result.error });
      }
    } catch (error) {
      toast.error('Failed to send the email', { description: getErrorMessage(error) });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="surface-card flex items-center gap-4 p-4 md:p-6">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary shadow-sm">
          <Mail className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold md:text-2xl">Class Emails</h1>
          <p className="text-sm text-muted-foreground">
            Send reminders, announcements or notices to every student in one of your classes.
          </p>
        </div>
      </div>

      {/* Step 1 — date + class slot */}
      <div className="surface-card p-4 md:p-6">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          1. Pick a date and class
        </h2>

        <div className="mb-4 max-w-xs">
          <Label htmlFor="class-date" className="mb-1.5 block text-sm font-medium">
            Class date
          </Label>
          <Input
            id="class-date"
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-11 rounded-lg"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">{selectedDay}</p>
        </div>

        {routinesLoading ? (
          <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading your classes…
          </div>
        ) : routinesError ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            {routinesError}
          </div>
        ) : isWeekend ? (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
            {selectedDay} is a weekend — no classes are scheduled. You can still pick a weekday to
            email that class (e.g. for an upcoming test or assignment).
          </div>
        ) : dayRoutines.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
            You have no classes scheduled on {selectedDay}.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {dayRoutines.map((routine) => {
              const isSelected = routine.id === selectedRoutineId;
              return (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => handleSelectRoutine(routine)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-semibold leading-tight">{routine.subject_name}</span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />}
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{routine.subject_code}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(routine.start_time)} – {formatTime(routine.end_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {routine.class_type === 'Lab' ? routine.lab_name || routine.room_number : routine.room_number}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground/80">
                    {routine.department?.name} · Semester {routine.semester} · {shiftLabel(routine.shift)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2 — recipients */}
      {selectedRoutine && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-4 md:p-6"
        >
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            2. Recipients
          </h2>

          {studentsLoading ? (
            <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading enrolled students…
            </div>
          ) : students ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
                  <Users className="h-3.5 w-3.5" />
                  {students.count} student{students.count === 1 ? '' : 's'} enrolled
                </Badge>
                <Badge className="chip-primary gap-1.5 border-0 px-3 py-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5" />
                  {students.with_email} will receive the email
                </Badge>
                {students.count - students.with_email > 0 && (
                  <Badge variant="outline" className="gap-1.5 border-warning/40 px-3 py-1.5 text-sm text-warning-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {students.count - students.with_email} without an email address
                  </Badge>
                )}
              </div>

              {students.count > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowStudentList((v) => !v)}
                    className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {showStudentList ? 'Hide student list' : 'Show student list'}
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showStudentList && 'rotate-180')} />
                  </button>
                  {showStudentList && (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="px-3 py-2 font-medium">Roll</th>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.students.map((student) => (
                            <tr key={student.id} className="border-t border-border/60">
                              <td className="px-3 py-2 font-mono text-xs">{student.roll}</td>
                              <td className="px-3 py-2">{student.name}</td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {student.email || <span className="text-warning-foreground">No email</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a class to load its students.</p>
          )}
        </motion.div>
      )}

      {/* Step 3 — compose */}
      {selectedRoutine && students && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-4 md:p-6"
        >
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            3. Compose email
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject" className="mb-1.5 block text-sm font-medium">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`e.g. Class test on ${selectedRoutine.subject_name} — ${format(parseISO(selectedDate), 'd MMM')}`}
                maxLength={200}
                className="h-11 rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="email-message" className="mb-1.5 block text-sm font-medium">
                Message <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="email-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your reminder, announcement or notice here. Each new line becomes a paragraph in the email."
                rows={6}
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="email-attachments" className="mb-1.5 block text-sm font-medium">
                Attachments <span className="text-muted-foreground">(optional, {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)} total)</span>
              </Label>
              <label
                htmlFor="email-attachments"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Paperclip className="h-4 w-4" />
                Click to attach files (PDF, images, documents…)
              </label>
              <input
                id="email-attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleAddFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              {attachments.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.name}</span>
                        <span className="flex-shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="flex-shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                  <li className="px-3 text-xs text-muted-foreground">
                    Total: {formatBytes(attachmentsTotal)} of {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}
                  </li>
                </ul>
              )}
            </div>

            {lastResult?.success && (
              <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <div>
                  <p className="font-medium">
                    Email delivered to {lastResult.recipients} student{lastResult.recipients === 1 ? '' : 's'}.
                  </p>
                  {lastResult.skipped_no_email > 0 && (
                    <p className="text-muted-foreground">
                      {lastResult.skipped_no_email} student(s) were skipped because they have no email address on file.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Recipients are added as BCC — students never see each other's addresses.
              </p>
              <Button variant="gradient" size="lg" onClick={handleSend} disabled={!canSend} className="gap-2">
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending to {students.with_email} student{students.with_email === 1 ? '' : 's'}…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
