import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { BrandedStatus } from './components/BrandedStatus';

// Five intentional route bundles avoid both a monolith and dozens of tiny
// page chunks. A user downloads the public shell plus only their role area.
const PublicArea = lazy(() => import('./routes/PublicArea'));
const AdminArea = lazy(() => import('./routes/AdminArea'));
const ParentArea = lazy(() => import('./routes/ParentArea'));
const StudentArea = lazy(() => import('./routes/StudentArea'));
const TeacherArea = lazy(() => import('./routes/TeacherArea'));

export default function App() {
  return (
    <Suspense fallback={<BrandedStatus message="Binubuksan ang pahina..." />}>
      <Routes>
        <Route path="/admin/*" element={<AdminArea />} />
        <Route path="/parent/*" element={<ParentArea />} />
        <Route path="/student/*" element={<StudentArea />} />
        <Route path="/teacher/*" element={<TeacherArea />} />
        <Route path="*" element={<PublicArea />} />
      </Routes>
    </Suspense>
  );
}
