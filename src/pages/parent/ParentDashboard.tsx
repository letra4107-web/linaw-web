import { DashboardShell } from '../../components/DashboardShell';

export default function ParentDashboard() {
  return (
    <DashboardShell roleLabel="Magulang">
      <h1 className="text-2xl font-semibold">Parent Dashboard</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        My Children, Progress Report, and Schedule are built next.
      </p>
    </DashboardShell>
  );
}
