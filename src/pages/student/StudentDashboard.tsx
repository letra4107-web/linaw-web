import { DashboardShell } from '../../components/DashboardShell';

export default function StudentDashboard() {
  return (
    <DashboardShell roleLabel="Mag-aaral">
      <h1 className="text-2xl font-semibold">Student Dashboard</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Learn modules and Profile are built next.
      </p>
    </DashboardShell>
  );
}
