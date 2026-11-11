import {showFormFeedback} from '../../lib/formFeedback';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { tagalogError } from '../../lib/validationMessages';
import logo from '../../assets/Logo.jpg';
import leftImage from '../../assets/left.png';
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
      setError("Ilagay ang wastong email address.");
      return;
    }

    setSubmitting(true);
    try {
      await api('/auth/request-password-reset', {method:'POST',body:{email:cleanEmail}});
      showFormFeedback('Kung may account na nakarehistro, naipadala ang reset code. Tingnan din ang email ng naka-link na magulang para sa student username.');
      navigate('/reset-password', { state: { email: cleanEmail } });
    } catch (error) {
      setError(tagalogError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell auth-forgot-page grid min-h-screen overflow-hidden text-[var(--color-text)] lg:grid-cols-2">
      <aside className="auth-shell-illustration auth-forgot-illustration relative hidden overflow-hidden text-white lg:flex lg:flex-col">
        <img src={leftImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div aria-hidden="true" className="absolute inset-0 bg-transparent" />
        <div className="relative z-10 flex h-full flex-col p-10 xl:p-14">
          <Link to="/" className="auth-shell-scene-logo w-fit rounded-lg focus-visible:outline-white"><img src={logo} alt="LinawLetra" className="h-16 w-auto rounded-lg" /></Link>
          <div className="sr-only"><p>Ligtas na pagbabalik sa iyong pagkatuto.</p><p>I-reset ang iyong password at magpatuloy sa pagbabasa, pagsasanay, at pag-unlad.</p></div>
          <p className="sr-only">Tulong sa pagbasa ng Filipino para sa bawat bata.</p>
        </div>
      </aside>

      <div className="auth-shell-content auth-forgot-content relative flex min-h-screen flex-col justify-center overflow-hidden px-5 py-8 sm:px-8">
        <Link to="/login" className="absolute top-5 left-5 z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-[#6f58c9] bg-[#fffdf9] px-4 py-2 text-sm font-bold text-[#4f3ba8] shadow-sm transition-colors hover:bg-[#eee8ff] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#6f58c9] sm:left-8">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Bumalik sa Login
        </Link>
        <div className="auth-forgot-mobile-scene -mx-5 mb-7 sm:-mx-8 lg:hidden"><img src={leftImage} alt="" aria-hidden="true" /></div>
      <div className="auth-forgot-panel relative z-10 mx-auto w-full max-w-md text-center">
        <p className="auth-forgot-badge">KAYA NATIN ITO!</p>
        <div className="auth-forgot-lock mx-auto mt-4 flex h-15 w-15 items-center justify-center rounded-full text-white shadow-card">
          <LockKeyhole className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="auth-forgot-title mt-4">Nakalimutan ang Password?</h1>
        <p className="auth-forgot-description mx-auto mt-3 max-w-sm">
          Huwag mag-alala. Ilagay ang email na ginamit mo sa LinawLetra at padadalhan ka namin ng 6 o 8-digit na code upang makagawa ng bagong password.
        </p>

        <section className="auth-forgot-card mt-6 text-left">
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-bold tracking-[0.08em] uppercase">Email o Student Username</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-[var(--color-primary-hover)]" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(null); }}
                  autoComplete="email"
                  placeholder="Ilagay ang iyong nakarehistrong email"
                  className="auth-forgot-input min-h-14 w-full py-3 pr-4 pl-12 text-[var(--color-text)] placeholder:text-sm"
                />
              </div>
            </div>
            <FieldError message={error ?? undefined} />
            <button type="submit" disabled={submitting || !isValidEmail(email.trim())} className="auth-forgot-button flex min-h-14 w-full items-center justify-center gap-2 px-5 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <ButtonSpinner />}
              {submitting ? 'Ipinapadala...' : 'Ipadala ang Code'}
            </button>
            <p className="auth-forgot-helper text-center">
              Kung may account na nakarehistro sa email na ito, makakatanggap ka ng 6 o 8-digit na reset code. Para sa student username, sa email ng naka-link na magulang ito ipapadala. Tingnan din ang spam folder.
            </p>
          </form>
        </section>

        <p className="auth-forgot-privacy mt-5 flex items-center justify-center gap-2"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Ligtas at pribado ang iyong impormasyon.</p>
      </div>
      </div>
    </main>
  );
}
