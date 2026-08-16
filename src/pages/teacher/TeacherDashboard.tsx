import { DashboardShell } from '../../components/DashboardShell';

export default function TeacherDashboard() {
  return (
    <DashboardShell roleLabel="Guro">
      <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        My Students, Lessons, PDF Reading, Assessments, and more are built next.
      </p>
    </DashboardShell>
  );
}
