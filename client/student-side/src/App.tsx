import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import AdmissionPage from "./pages/AdmissionPage";
import ProfilePage from "./pages/ProfilePage";
import DocumentsPage from "./pages/DocumentsPage";
import SettingsPage from "./pages/SettingsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import ClassRoutinePage from "./pages/ClassRoutinePage";
import AttendancePage from "./pages/AttendancePage";
import MarksPage from "./pages/MarksPage";
import AddAttendancePage from "./pages/AddAttendancePage";
import TeacherContactsPage from "./pages/TeacherContactsPage";
import StudentListPage from "./pages/StudentListPage";
import StudentDetailsPage from "./pages/StudentDetailsPage";
import ManageMarksPage from "./pages/ManageMarksPage";
import NoticesPage from "./pages/NoticesPage";
import TeacherAttendancePage from "./pages/TeacherAttendancePage";
import StudyMaterialsPage from "./pages/StudyMaterialsPage";
import MessagesPage from "./pages/MessagesPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import LiveClassesPage from "./pages/LiveClassesPage";
import LearningHubPage from "./pages/LearningHubPage";
import TeacherAdminPage from "./pages/TeacherAdminPage";
import TeacherAssignmentDetailPage from "./pages/TeacherAssignmentDetailPage";
import TeacherSubjectActivitiesPage from "./pages/TeacherSubjectActivitiesPage";
import TeacherAllegationsPage from "./pages/TeacherAllegationsPage";
import StudentAllegationsPage from "./pages/StudentAllegationsPage";
import PublicTeacherProfilePage from "./pages/PublicTeacherProfilePage";
import PublicStudentProfilePage from "./pages/PublicStudentProfilePage";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public profile routes */}
      <Route path="/faculty/:teacherId" element={<PublicTeacherProfilePage />} />
      <Route path="/student/:studentId" element={<PublicStudentProfilePage />} />
      
      <Route
        path="/"
        element={
          <AuthRoute>
            <Index />
          </AuthRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="admission" element={<AdmissionPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="routine" element={<ClassRoutinePage />} />
        <Route path="learning-hub" element={<LearningHubPage />} />
        <Route path="live-classes" element={<LiveClassesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="marks" element={<MarksPage />} />
        <Route path="notices" element={<NoticesPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="study-materials" element={<StudyMaterialsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="my-allegations" element={<StudentAllegationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Captain-specific routes */}
        <Route path="add-attendance" element={<AddAttendancePage />} />
        <Route path="teacher-contacts" element={<TeacherContactsPage />} />
        {/* Teacher-specific routes */}
        <Route path="students" element={<StudentListPage />} />
        <Route path="students/:id" element={<StudentDetailsPage />} />
        <Route path="manage-marks" element={<ManageMarksPage />} />
        <Route path="teacher-attendance" element={<TeacherAttendancePage />} />
        <Route path="teacher-admin" element={<TeacherAdminPage />} />
        <Route path="assignment/:assignmentId" element={<TeacherAssignmentDetailPage />} />
        <Route path="subject-activities/:subjectId" element={<TeacherSubjectActivitiesPage />} />
        <Route path="allegations" element={<TeacherAllegationsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;
