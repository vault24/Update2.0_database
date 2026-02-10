import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Index from "./pages/Index";
import PasswordResetPage from "./pages/PasswordResetPage";
import { Dashboard } from "./pages/Dashboard";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import AdmissionPage from "./pages/AdmissionPage";
import ProfilePageFixed from "./pages/ProfilePageFixed";
import SettingsPage from "./pages/SettingsPage";
import NoticesPage from "./pages/NoticesPage";
import StudentAllegationsPage from "./pages/StudentAllegationsPage";
import LearningHubPage from "./pages/LearningHubPage";
import StudentListPage from "./pages/StudentListPage";
import StudentDetailsPage from "./pages/StudentDetailsPage";
import TeacherAssignmentDetailPage from "./pages/TeacherAssignmentDetailPage";
import TeacherSubjectActivitiesPage from "./pages/TeacherSubjectActivitiesPage";
import ClassRoutinePage from "./pages/ClassRoutinePage";
import LiveClassesPage from "./pages/LiveClassesPage";
import AttendancePage from "./pages/AttendancePage";
import MarksPage from "./pages/MarksPage";
import DocumentsPage from "./pages/DocumentsPage";
import MessagesPage from "./pages/MessagesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import AddAttendancePage from "./pages/AddAttendancePage";
import TeacherContactsPage from "./pages/TeacherContactsPage";
import TeacherAttendancePage from "./pages/TeacherAttendancePage";
import ManageMarksPage from "./pages/ManageMarksPage";
import TeacherAllegationsPage from "./pages/TeacherAllegationsPage";
import PublicStudentProfilePage from "./pages/PublicStudentProfilePage";
import AlumniProfilePage from "./pages/AlumniProfilePage";

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

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Index />} />
      <Route path="/password-reset" element={<PasswordResetPage />} />
      
      {/* Public routes - no authentication required */}
      <Route path="/student/:studentId" element={<PublicStudentProfilePage />} />
      
      {/* Dashboard routes with nested structure */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Default dashboard route */}
        <Route index element={<Dashboard />} />
        
        {/* Common routes */}
        <Route path="notices" element={<NoticesPage />} />
        <Route path="profile" element={<ProfilePageFixed />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="learning-hub" element={<LearningHubPage />} />
        <Route path="live-classes" element={<LiveClassesPage />} />
        <Route path="messages" element={<MessagesPage />} />
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
      </Route>
      
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
    <Toaster />
  </BrowserRouter>
);

export default App;
