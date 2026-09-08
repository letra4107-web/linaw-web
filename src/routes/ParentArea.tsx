import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import ParentLayout from '../pages/parent/ParentLayout';
import Dashboard from '../pages/parent/Dashboard';
import MyChildren from '../pages/parent/MyChildren';
import Schedule from '../pages/parent/Schedule';
import Messages from '../pages/parent/Messages';
import Settings from '../pages/parent/Settings';
import Notifications from '../pages/parent/Notifications';
import AppSettings from '../pages/parent/AppSettings';

const ProgressReport = lazy(() => import('../pages/parent/ProgressReport'));

export default function ParentArea() {
  return <Routes><Route element={<ProtectedRoute role="parent"><ParentLayout /></ProtectedRoute>}>
    <Route index element={<Dashboard />} /><Route path="children" element={<MyChildren />} /><Route path="progress" element={<Suspense fallback={<p className="p-6">Loading report…</p>}><ProgressReport /></Suspense>} />
    <Route path="schedule" element={<Schedule />} /><Route path="messages" element={<Messages />} /><Route path="settings" element={<Settings />} />
    <Route path="notifications" element={<Notifications />} /><Route path="app-settings" element={<AppSettings />} />
  </Route></Routes>;
}
