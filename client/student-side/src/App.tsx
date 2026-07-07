import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, lazy, Suspense } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonBanner } from "@/components/ComingSoonBanner";
import Index from "./pages/Index";
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage"));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
const AdmissionPage = lazy(() => import("./pages/AdmissionPage"));
const ProfilePageFixed = lazy(() => import("./pages/ProfilePageFixed"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NoticesPage = lazy(() => import("./pages/NoticesPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const StudentAllegationsPage = lazy(() => import("./pages/StudentAllegationsPage"));
const LearningHubPage = lazy(() => import("./pages/LearningHubPage"));
const StudentListPage = lazy(() => import("./pages/StudentListPage"));
const StudentDetailsPage = lazy(() => import("./pages/StudentDetailsPage"));
const TeacherAssignmentDetailPage = lazy(() => import("./pages/TeacherAssignmentDetailPage"));
const TeacherSubjectActivitiesPage = lazy(() => import("./pages/TeacherSubjectActivitiesPage"));
const ClassRoutinePage = lazy(() => import("./pages/ClassRoutinePage"));
const LiveClassesPage = lazy(() => import("./pages/LiveClassesPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const MarksPage = lazy(() => import("./pages/MarksPage"));
const DocumentsPage = lazy(() => import("./pages/DocumentsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ComplaintsPage = lazy(() => import("./pages/ComplaintsPage"));
const ApplicationsPage = lazy(() => import("./pages/ApplicationsPage"));
const AddAttendancePage = lazy(() => import("./pages/AddAttendancePage"));
const TeacherContactsPage = lazy(() => import("./pages/TeacherContactsPage"));
const TeacherAttendancePage = lazy(() => import("./pages/TeacherAttendancePage"));
const ManageMarksPage = lazy(() => import("./pages/ManageMarksPage"));
const TeacherAllegationsPage = lazy(() => import("./pages/TeacherAllegationsPage"));
const PublicStudentProfilePage = lazy(() => import("./pages/PublicStudentProfilePage"));
const PublicTeacherProfilePage = lazy(() => import("./pages/PublicTeacherProfilePage"));
const AlumniProfilePage = lazy(() => import("./pages/AlumniProfilePage"));
const AlumniRegistrationPage = lazy(() => import("./pages/AlumniRegistrationPage"));
const AlumniDirectoryPage = lazy(() => import("./pages/AlumniDirectoryPage"));
const AlumniApplicationStatusPage = lazy(() => import("./pages/AlumniApplicationStatusPage"));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Set timeout for loading state
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setTimeoutReached(true);
      }, 30000); // 30 second timeout

      return () => clearTimeout(timer);
    } else {
      setTimeoutReached(false);
    }
  }, [loading]);

  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <h3 className="text-lg font-semibold">Loading Timeout</h3>
          <p className="text-muted-foreground">
            The application is taking too long to load. Please check your connection and try refreshing the page.
          </p>
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * Routes a freshly-created "Alumni Account" through its lifecycle:
 *  1. Not yet submitted  -> locked to the self-registration wizard.
 *  2. Submitted, pending / rejected -> locked to the application-status page
 *     (no alumni privileges until an admin approves).
 *  3. Approved -> full alumni portal.
 * Settings stays reachable at every stage (account switching / deletion live
 * there), and users on the wrong holding page are redirected to the right one.
 */
const AlumniAccountGate = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const regPath = "/dashboard/alumni-registration";
  const statusPath = "/dashboard/alumni-application-status";
  const settingsPath = "/dashboard/settings";

  if (user?.isAlumniAccount) {
    const submitted = !!user.isAlumni;
    const approved = submitted && user.alumniReviewStatus === "approved";
    const onAllowedPage = location.pathname === settingsPath;

    if (!submitted) {
      // Stage 1: only the registration wizard (and Settings) are available.
      if (location.pathname !== regPath && !onAllowedPage) {
        return <Navigate to={regPath} replace />;
      }
    } else if (!approved) {
      // Stage 2: application under review (or rejected) — no alumni
      // privileges yet; only the status page (and Settings) are available.
      if (location.pathname !== statusPath && !onAllowedPage) {
        return <Navigate to={statusPath} replace />;
      }
    } else {
      // Stage 3: approved alumni shouldn't sit on the holding pages.
      if (location.pathname === regPath || location.pathname === statusPath) {
        return <Navigate to="/dashboard/alumni-profile" replace />;
      }
    }
  }
  return <>{children}</>;
};

const App = () => (
  <BrowserRouter>
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
<Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Index />} />
      <Route path="/password-reset" element={<PasswordResetPage />} />
      
      {/* Public routes - no authentication required */}
      <Route path="/student/:studentId" element={<PublicStudentProfilePage />} />
      <Route path="/faculty/:teacherId" element={<PublicTeacherProfilePage />} />
      
      {/* Dashboard routes with nested structure */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AlumniAccountGate>
              <DashboardLayout />
            </AlumniAccountGate>
          </ProtectedRoute>
        }
      >
        {/* Default dashboard route */}
        <Route index element={<Dashboard />} />
        
        {/* Common routes */}
        <Route path="notices" element={<NoticesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePageFixed />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="learning-hub" element={<><ComingSoonBanner feature="Learning Hub" /><LearningHubPage /></>} />
        <Route path="live-classes" element={<><ComingSoonBanner feature="Live Classes" /><LiveClassesPage /></>} />
        <Route path="messages" element={<><ComingSoonBanner feature="Messages" /><MessagesPage /></>} />
        <Route path="complaints" element={<ComplaintsPage />} />
        
        {/* Student/Captain routes */}
        <Route path="admission" element={<AdmissionPage />} />
        <Route path="routine" element={<ClassRoutinePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="marks" element={<MarksPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="my-allegations" element={<StudentAllegationsPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        
        {/* Captain-specific routes */}
        <Route path="add-attendance" element={<AddAttendancePage />} />
        <Route path="teacher-contacts" element={<TeacherContactsPage />} />
        
        {/* Teacher-specific routes */}
        <Route path="students" element={<StudentListPage />} />
        <Route path="students/:id" element={<StudentDetailsPage />} />
        <Route path="teacher-attendance" element={<TeacherAttendancePage />} />
        <Route path="manage-marks" element={<ManageMarksPage />} />
        <Route path="allegations" element={<TeacherAllegationsPage />} />
        <Route path="assignment/:id" element={<TeacherAssignmentDetailPage />} />
        <Route path="subject-activities/:id" element={<TeacherSubjectActivitiesPage />} />
        
        {/* Alumni-specific routes */}
        <Route path="alumni-profile" element={<AlumniProfilePage />} />
        <Route path="alumni-directory" element={<AlumniDirectoryPage />} />
        <Route path="alumni-registration" element={<AlumniRegistrationPage />} />
        <Route path="alumni-application-status" element={<AlumniApplicationStatusPage />} />
      </Route>
      
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
            </Suspense>
    <Toaster />
  </BrowserRouter>
);

export default App;
