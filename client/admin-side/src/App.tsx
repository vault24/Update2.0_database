import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import StudentsList from "./pages/StudentsList";
import AddStudent from "./pages/AddStudent";
import DiscontinuedStudents from "./pages/DiscontinuedStudents";
import Admissions from "./pages/Admissions";
import AdmissionDetails from "./pages/AdmissionDetails";
import ClassRoutine from "./pages/ClassRoutine";
import AttendanceMarks from "./pages/AttendanceMarks";
import StudentProfiles from "./pages/StudentProfiles";
import StudentDetails from "./pages/StudentDetails";
import EditStudent from "./pages/EditStudent";
import Alumni from "./pages/Alumni";
import AlumniDetails from "./pages/AlumniDetails";
import Documents from "./pages/Documents";
import Applications from "./pages/Applications";
import CorrectionRequests from "./pages/CorrectionRequests";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ActivityLogs from "./pages/ActivityLogs";
import Departments from "./pages/Departments";
import DepartmentView from "./pages/DepartmentView";
import Teachers from "./pages/Teachers";
import SignupRequests from "./pages/SignupRequests";
import Notices from "./pages/Notices";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<StudentsList />} />
                  <Route path="/students/:id" element={<StudentDetails />} />
                  <Route path="/students/:id/edit" element={<EditStudent />} />
                  <Route path="/add-student" element={<AddStudent />} />
                  <Route path="/discontinued-students" element={<DiscontinuedStudents />} />
                  <Route path="/admissions" element={<Admissions />} />
                  <Route path="/admissions/:id" element={<AdmissionDetails />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/departments/:id" element={<DepartmentView />} />
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/signup-requests" element={<SignupRequests />} />
                  <Route path="/notices" element={<Notices />} />
                  <Route path="/class-routine" element={<ClassRoutine />} />
                  <Route path="/attendance-marks" element={<AttendanceMarks />} />
                  <Route path="/student-profiles" element={<StudentProfiles />} />
                  <Route path="/alumni" element={<Alumni />} />
                  <Route path="/alumni/:id" element={<AlumniDetails />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/correction-requests" element={<CorrectionRequests />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/activity-logs" element={<ActivityLogs />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
