import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import StudentLayout from '../pages/student/StudentLayout';
import Dashboard from '../pages/student/Dashboard';
import Learn from '../pages/student/Learn';
import Module from '../pages/student/Module';
import Assessment from '../pages/student/Assessment';
import Practice from '../pages/student/Practice';
import Profile from '../pages/student/Profile';
import Achievements from '../pages/student/Achievements';

export default function StudentArea() {
  return <Routes><Route element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} /><Route path="learn" element={<Learn />} /><Route path="learn/module/:moduleId" element={<Module />} />
    <Route path="learn/assessment/:assessmentId" element={<Assessment />} /><Route path="practice" element={<Practice />} />
    <Route path="achievements" element={<Achievements />} /><Route path="profile" element={<Profile />} />
  </Route></Routes>;
}
