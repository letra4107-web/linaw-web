import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import logo from '../../assets/Logo.jpg';
import lookImage from '../../assets/look.webp';
import { ButtonSpinner, FieldError, isValidEmail } from '../../components/auth/AuthShell';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang valid na email.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (resetError) throw resetError;
      navigate('/reset-password', { state: { email: cleanEmail } });
    } catch {
      // Continue to the same OTP screen to avoid revealing account existence.
      navigate('/reset-password', { state: { email: cleanEmail } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] lg:grid-cols-[44%_56%]">
      <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <img src={lookImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--color-primary-hover)]/55" />
        <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
          <Link to="/" className="flex items-center gap-3 text-2xl font-bold"><img src={logo} alt="" className="h-11 w-11 rounded-xl object-cover" />LinawLetra</Link>
          <div className="my-auto max-w-sm"><p className="text-4xl leading-tight font-bold">Ligtas na pagbabalik sa iyong pagkatuto.</p><p className="mt-5 text-base leading-relaxed text-white/85">I-reset ang iyong password at magpatuloy sa pagbabasa, pagsasanay, at pag-unlad.</p></div>
          <p className="text-sm font-semibold text-white/85">Tulong sa pagbasa ng Filipino para sa bawat bata.</p>
        </div>
      </aside>

      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
        <div aria-hidden="true" className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--color-primary)]/12" />
        <div aria-hidden="true" className="absolute top-10 -right-28 h-64 w-64 rounded-full bg-[var(--color-brand-coral)]/12" />

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex flex-col items-center">
          <img src={logo} alt="LinawLetra" className="h-20 w-20 rounded-2xl object-cover shadow-card" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Linaw na Pagbasa. Higit na Pag-unlad.</p>
        </div>

        <div className="mx-auto mb-5 flex h-19 w-19 items-center justify-center rounded-full bg-[var(--color-primary-hover)] text-white shadow-raised">
          <LockKeyhole className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="text-3xl leading-tight font-bold">Nakalimutan ang Password?</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          Huwag mag-alala. Ilagay ang iyong email at padadalhan ka namin ng anim na-digit na code para i-reset ang iyong password.
        </p>

        <section className="mt-6 rounded-[1.75rem] border border-[var(--color-primary)]/15 bg-white p-6 text-left shadow-raised sm:p-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-bold tracking-[0.08em] uppercase">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--color-primary-hover)]" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="Ilagay ang iyong nakarehistrong email address"
                  className="min-h-14 w-full rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-bg)] py-3 pr-4 pl-12 text-[var(--color-text)] placeholder:text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                />
              </div>
            </div>
            <FieldError message={error ?? undefined} />
            <button type="submit" disabled={submitting || !isValidEmail(email.trim())} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary-hover)] px-5 py-3 text-base font-bold text-white shadow-card transition hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <ButtonSpinner />}
              {submitting ? 'Ipinapadala...' : 'Ipadala ang Reset Code'}
            </button>
            <p className="text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
              Kung may account na gumagamit ng email na ito, makakatanggap ka ng anim na-digit na reset code. Tingnan ang inbox at spam folder.
            </p>
          </form>
        </section>

        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary-hover)]">← Bumalik sa Login</Link>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Ligtas at pribado ang iyong impormasyon.</p>
      </div>
      </div>
    </main>
  );
}
