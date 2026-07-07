import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleRouteGuard } from "@/components/RoleRouteGuard";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudentsList = lazy(() => import("./pages/StudentsList"));
const AddStudent = lazy(() => import("./pages/AddStudent"));
const DiscontinuedStudents = lazy(() => import("./pages/DiscontinuedStudents"));
const Admissions = lazy(() => import("./pages/Admissions"));
const AdmissionDetails = lazy(() => import("./pages/AdmissionDetails"));
const ClassRoutine = lazy(() => import("./pages/ClassRoutine"));
const AttendanceMarks = lazy(() => import("./pages/AttendanceMarks"));

const StudentDetails = lazy(() => import("./pages/StudentDetails"));
const EditStudent = lazy(() => import("./pages/EditStudent"));
const AlumniDirectory = lazy(() => import("./pages/AlumniDirectory"));
const AlumniRequests = lazy(() => import("./pages/AlumniRequests"));
const AddAlumni = lazy(() => import("./pages/AddAlumni"));
const AlumniDetails = lazy(() => import("./pages/AlumniDetails"));
const Documents = lazy(() => import("./pages/Documents"));
const Applications = lazy(() => import("./pages/Applications"));
const CorrectionRequests = lazy(() => import("./pages/CorrectionRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const SystemActivityReports = lazy(() => import("./pages/SystemActivityReports"));
const Departments = lazy(() => import("./pages/Departments"));
const DepartmentView = lazy(() => import("./pages/DepartmentView"));
const Teachers = lazy(() => import("./pages/Teachers"));
const SignupRequests = lazy(() => import("./pages/SignupRequests"));
const Notices = lazy(() => import("./pages/Notices"));
const StipendEligible = lazy(() => import("./pages/StipendEligible"));
const Auth = lazy(() => import("./pages/Auth"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Complaints = lazy(() => import("./pages/Complaints"));
const MotivationManagement = lazy(() => import("./pages/MotivationManagement"));
const TeacherProfile = lazy(() => import("./pages/TeacherProfile"));

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
            <InterfaceModeProvider>
            <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route element={<RoleRouteGuard />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<StudentsList />} />
                  <Route path="/students/:id" element={<StudentDetails />} />
                  <Route path="/students/:id/edit" element={<EditStudent />} />
                  <Route path="/add-student" element={<AddStudent />} />
                  <Route path="/discontinued-students" element={<DiscontinuedStudents />} />
                  <Route path="/admissions" element={<Admissions />} />
                  <Route path="/admissions/:id" element={<AdmissionDetails />} />
                  <Route path="/stipend-eligible" element={<StipendEligible />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/departments/:id" element={<DepartmentView />} />
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/teachers/:id" element={<TeacherProfile />} />
                  <Route path="/signup-requests" element={<SignupRequests />} />
                  <Route path="/notices" element={<Notices />} />
                  <Route path="/class-routine" element={<ClassRoutine />} />
                  <Route path="/attendance-marks" element={<AttendanceMarks />} />

                  <Route path="/alumni" element={<AlumniDirectory />} />
                  <Route path="/alumni-requests" element={<AlumniRequests />} />
                  <Route path="/alumni/add" element={<AddAlumni />} />
                  <Route path="/alumni/:id" element={<AlumniDetails />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/applications" element={<Applications />} />
                  <Route path="/correction-requests" element={<CorrectionRequests />} />
                  <Route path="/complaints" element={<Complaints />} />
                  <Route path="/analytics" element={<SystemActivityReports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/activity-logs" element={<Navigate to="/analytics" replace />} />
                  <Route path="/motivation-management" element={<MotivationManagement />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
            </InterfaceModeProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
