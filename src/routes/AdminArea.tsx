import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import AdminLayout from '../pages/admin/AdminLayout';
import Dashboard from '../pages/admin/Dashboard';
import Users from '../pages/admin/Users';
import Archived from '../pages/admin/Archived';
import Teachers from '../pages/admin/Teachers';
import Settings from '../pages/admin/Settings';
import Notifications from '../pages/admin/Notifications';
import AuditLogs from '../pages/admin/AuditLogs';
import Operations from '../pages/admin/Operations';
import RoleMonitoring from '../pages/admin/RoleMonitoring';

const Analytics = lazy(() => import('../pages/admin/Analytics'));

export default function AdminArea() {
  return <Routes><Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} /><Route path="users" element={<Users />} /><Route path="archived" element={<Archived />} />
    <Route path="teachers" element={<Teachers />} /><Route path="analytics" element={<Suspense fallback={<p className="p-6">Loading analytics…</p>}><Analytics /></Suspense>} />
    <Route path="notifications" element={<Notifications />} /><Route path="settings" element={<Settings />} />
    <Route path="audit-logs" element={<AuditLogs />} />
    <Route path="operations" element={<Operations />} />
    <Route path="students" element={<RoleMonitoring role="student" />} />
    <Route path="parents" element={<RoleMonitoring role="parent" />} />
    <Route path="teachers-monitoring" element={<RoleMonitoring role="teacher" />} />
  </Route></Routes>;
}
