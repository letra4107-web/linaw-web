import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import TeacherLayout from '../pages/teacher/TeacherLayout';
import Dashboard from '../pages/teacher/Dashboard';
import MyStudents from '../pages/teacher/MyStudents';
import LessonsHub from '../pages/teacher/LessonsHub';
import Settings from '../pages/teacher/Settings';
import Messages from '../pages/teacher/Messages';

const ProgressReports = lazy(() => import('../pages/teacher/ProgressReports'));

export default function TeacherArea() {
  return <Routes><Route element={<ProtectedRoute role="teacher"><TeacherLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} /><Route path="students" element={<MyStudents />} /><Route path="lessons" element={<LessonsHub />} />
    <Route path="progress-reports" element={<Suspense fallback={<p className="p-6">Loading reports…</p>}><ProgressReports /></Suspense>} /><Route path="messages" element={<Messages />} /><Route path="settings" element={<Settings />} />
  </Route></Routes>;
}
