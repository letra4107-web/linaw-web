import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lightbulb, Mail, MailCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { isValidEmail } from '../../components/auth/AuthShell';
import leftImage from '../../assets/left.png';
import emailIllustration from '../../assets/email.png';
import logo from '../../assets/Logo.jpg';

export default function ResendVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as { email?: string } | null)?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang valid na email address.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
      if (resendError) throw resendError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi maipadala ang code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="verify-email-page resend-verification-page">
      <aside className="verify-email-scene" aria-label="LinawLetra reading journey">
        <img src={leftImage} alt="" className="verify-email-scene-image" />
        <Link to="/" className="verify-email-logo"><img src={logo} alt="LinawLetra" /></Link>
      </aside>

      <section className="verify-email-workspace">
        <div className="verify-email-orb verify-email-orb-one" aria-hidden="true" />
        <div className="verify-email-orb verify-email-orb-two" aria-hidden="true" />
        <div className="resend-verification-content">
          <img src={emailIllustration} alt="" aria-hidden="true" className="resend-verification-art" />
          <header className="verify-email-heading">
            <h1>Muling ipadala ang code</h1>
            <p>Ilagay ang email na ginamit sa paggawa ng iyong account.</p>
          </header>

          <form onSubmit={onSubmit} noValidate className="resend-verification-form">
            <label htmlFor="email">Email address</label>
            <div className="resend-verification-input-wrap"><Mail aria-hidden="true" /><input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="halimbawa@email.com" /></div>
            {error && <p role="alert" className="verify-email-error">{error}</p>}
            {sent && <p role="status" className="resend-verification-success">Naipadala na ang bagong verification code. Tingnan ang iyong email.</p>}
            <button type="submit" disabled={submitting} className="verify-email-submit">{submitting ? 'Ipinapadala...' : 'Ipadala ang code'} <ArrowRight aria-hidden="true" /></button>
          </form>

          <div className="verify-email-resend"><span /> <button type="button" onClick={() => navigate('/verify-email', { state: { email } })}>Mayroon na akong code <b>I-verify</b></button> <span /></div>

          <section className="verify-email-help" aria-label="Email delivery help">
            <div><span className="verify-email-help-icon"><MailCheck aria-hidden="true" /></span><article><h2>Tingnan ang iyong:</h2><ul><li><CheckCircle2 />Inbox</li><li><CheckCircle2 />Spam / Junk</li><li><CheckCircle2 />Promotions</li></ul></article></div>
            <div><span className="verify-email-help-icon tip"><Lightbulb aria-hidden="true" /></span><article><h2>Tip:</h2><p>Hintayin nang ilang minuto ang email. Pakisuri rin ang Spam o Promotions folder.</p></article></div>
          </section>
        </div>
      </section>
    </main>
  );
}
