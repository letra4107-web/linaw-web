import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lightbulb, MailCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { isValidEmail } from '../../components/auth/AuthShell';
import leftImage from '../../assets/left.png';
import emailIllustration from '../../assets/email.png';
import logo from '../../assets/Logo.jpg';

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');

  const setOtpFrom = (start: number, value: string) => {
    const nextDigits = [...digits];
    const incoming = value.replace(/\D/g, '').slice(0, OTP_LENGTH - start);
    if (!incoming) nextDigits[start] = '';
    else incoming.split('').forEach((digit, offset) => { nextDigits[start + offset] = digit; });
    setDigits(nextDigits);
    setError(null);
    if (incoming) inputs.current[Math.min(start + incoming.length, OTP_LENGTH - 1)]?.focus();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang email address na ginamit sa paggawa ng account.');
      return;
    }
    if (code.length !== OTP_LENGTH) {
      setError('Ilagay ang kumpletong 6-digit verification code.');
      inputs.current[digits.findIndex((digit) => !digit) || 0]?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'signup' });
      if (verifyError) throw verifyError;
      await supabase.from('users').update({ email_verified: true }).eq('email', cleanEmail);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mali ang code. Subukan ulit.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay muna ang email address para maipadala muli ang code.');
      return;
    }
    setError(null);
    setResendMessage(null);
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
      if (resendError) throw resendError;
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      setResendMessage('Naipadala na muli ang verification code sa iyong email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hindi naipadala ang bagong code. Subukan ulit.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="verify-email-page">
      <aside className="verify-email-scene" aria-label="LinawLetra reading journey">
        <img src={leftImage} alt="" className="verify-email-scene-image" />
        <Link to="/" className="verify-email-logo"><img src={logo} alt="LinawLetra" /></Link>
      </aside>

      <section className="verify-email-workspace">
        <div className="verify-email-orb verify-email-orb-one" aria-hidden="true" />
        <div className="verify-email-orb verify-email-orb-two" aria-hidden="true" />
        <div className="verify-email-content">
          <img src={emailIllustration} alt="" aria-hidden="true" className="verify-email-hero-art" />
          <header className="verify-email-heading">
            <h1>I-verify ang iyong email</h1>
            <p>Ilagay ang code na natanggap mo sa email.</p>
          </header>

          <form onSubmit={onSubmit} noValidate className="verify-email-form">
            {!initialEmail && <label className="verify-email-address">Email address<input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="halimbawa@email.com" /></label>}
            <fieldset className="verify-email-otp" aria-label="6-digit verification code">
              {digits.map((digit, index) => <input
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                value={digit}
                onChange={(event) => setOtpFrom(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
                  if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
                  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
                }}
              />)}
            </fieldset>
            {error && <p role="alert" className="verify-email-error">{error}</p>}
            <button type="submit" disabled={submitting} className="verify-email-submit">
              {submitting ? 'Nagve-verify...' : 'I-verify'} <ArrowRight aria-hidden="true" />
            </button>
          </form>

          <div className="verify-email-resend"><span /> <p>Hindi natanggap ang code? <button type="button" onClick={resendCode} disabled={resending}><b>{resending ? 'Ipinapadala...' : 'Ipadala muli'}</b></button></p> <span /></div>
          {resendMessage && <p role="status" className="verify-email-resend-status">{resendMessage}</p>}

          <section className="verify-email-help" aria-label="Verification help">
            <div><span className="verify-email-help-icon"><MailCheck aria-hidden="true" /></span><article><h2>Tingnan ang iyong:</h2><ul><li><CheckCircle2 />Inbox</li><li><CheckCircle2 />Spam / Junk</li><li><CheckCircle2 />Promotions</li></ul></article></div>
            <div><span className="verify-email-help-icon tip"><Lightbulb aria-hidden="true" /></span><article><h2>Tip:</h2><p>Minsan napupunta ang email sa Spam o Promotions. Pakisuri din doon kung hindi mo makita.</p></article></div>
          </section>
        </div>
      </section>
    </main>
  );
}
