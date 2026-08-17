import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import VerifyLogin from './pages/auth/VerifyLogin';
import ResendVerification from './pages/auth/ResendVerification';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminDashboard from './pages/admin/AdminDashboard';
import ParentLayout from './pages/parent/ParentLayout';
import ParentDashboardPage from './pages/parent/Dashboard';
import MyChildren from './pages/parent/MyChildren';
import ProgressReport from './pages/parent/ProgressReport';
import Schedule from './pages/parent/Schedule';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboardPage from './pages/student/Dashboard';
import Learn from './pages/student/Learn';
import StudentModule from './pages/student/Module';
import StudentAssessment from './pages/student/Assessment';
import StudentProfile from './pages/student/Profile';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherDashboardPage from './pages/teacher/Dashboard';
import MyStudents from './pages/teacher/MyStudents';
import Lessons from './pages/teacher/Lessons';
import PdfReading from './pages/teacher/PdfReading';
import Assessments from './pages/teacher/Assessments';
import LearningPaths from './pages/teacher/LearningPaths';
import Activities from './pages/teacher/Activities';
import ProgressReports from './pages/teacher/ProgressReports';
import TeacherSettings from './pages/teacher/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-login" element={<VerifyLogin />} />
      <Route path="/resend-verification" element={<ResendVerification />} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent"
        element={
          <ProtectedRoute role="parent">
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ParentDashboardPage />} />
        <Route path="children" element={<MyChildren />} />
        <Route path="progress" element={<ProgressReport />} />
        <Route path="schedule" element={<Schedule />} />
      </Route>
      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboardPage />} />
        <Route path="learn" element={<Learn />} />
        <Route path="learn/module/:moduleId" element={<StudentModule />} />
        <Route path="learn/assessment/:assessmentId" element={<StudentAssessment />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>
      <Route
        path="/teacher"
        element={
          <ProtectedRoute role="teacher">
            <TeacherLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<TeacherDashboardPage />} />
        <Route path="students" element={<MyStudents />} />
        <Route path="lessons" element={<Lessons />} />
        <Route path="pdf-reading" element={<PdfReading />} />
        <Route path="assessments" element={<Assessments />} />
        <Route path="learning-paths" element={<LearningPaths />} />
        <Route path="activities" element={<Activities />} />
        <Route path="progress-reports" element={<ProgressReports />} />
        <Route path="settings" element={<TeacherSettings />} />
      </Route>
    </Routes>
  );
}
