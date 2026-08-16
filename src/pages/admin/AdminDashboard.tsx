import { DashboardShell } from '../../components/DashboardShell';

export default function AdminDashboard() {
  return (
    <DashboardShell roleLabel="Admin">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        User management, teacher accounts, and analytics are built next.
      </p>
    </DashboardShell>
  );
}
