import { Link } from 'react-router-dom';
import logo from '../assets/Logo.jpg';
import { useAuth } from '../lib/auth/AuthContext';
import { dashboardPathForRole } from '../lib/auth/resolveRole';

export default function NotFound() {
  const { identity } = useAuth();
  const homePath = identity ? dashboardPathForRole(identity.role) : '/';
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <div className="max-w-lg rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-card">
        <img src={logo} alt="LinawLetra" className="mx-auto h-20 w-auto rounded-xl" />
        <p className="mt-6 text-6xl font-bold text-[var(--color-primary)]">404</p>
        <h1 className="mt-2 text-3xl">Naligaw ang pahina</h1>
        <p className="mt-3 text-[var(--color-text-muted)]">Walang pahina sa address na ito. Maaari kang bumalik at magpatuloy sa pagbabasa.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to={homePath} className="rounded-full bg-[var(--color-primary)] px-6 py-3 font-semibold text-white">Bumalik sa LinawLetra</Link>
          {!identity && <Link to="/login" className="rounded-full border border-[var(--color-border)] px-6 py-3 font-semibold">Mag-login</Link>}
        </div>
      </div>
    </main>
  );
}
