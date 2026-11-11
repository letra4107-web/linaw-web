import {showFormFeedback} from '../../lib/formFeedback';
import './email-verification.css';
import { tagalogError } from '../../lib/validationMessages';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Lightbulb, MailCheck } from 'lucide-react';
import { api } from '../../lib/api';
import { isValidEmail } from '../../components/auth/AuthShell';
import leftImage from '../../assets/left.png';
import emailIllustration from '../../assets/email.png';
import logo from '../../assets/Logo.jpg';

const OTP_LENGTH = 8;
const initialRequests=new Map<string,Promise<unknown>>();

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>((location.state as {deliveryPending?:boolean}|null)?.deliveryPending ? 'Nagawa na ang account pero hindi naipadala ang code. Pindutin ang Ipadala muli.' : null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join('');
  useEffect(()=>{
    if(!isValidEmail(initialEmail) || (location.state as {otpSent?:boolean}|null)?.otpSent)return;
    const key=initialEmail.trim().toLowerCase();let request=initialRequests.get(key);
    if(!request){request=api('/auth/email-verification/request',{method:'POST',body:{email:key}});initialRequests.set(key,request);}
    let active=true;setResending(true);
    void request.then(()=>{if(active)setResendMessage('Naipadala sa email service ang verification code. Tingnan din ang Spam folder.');},err=>{if(active)setError(tagalogError(err));}).finally(()=>{if(active)setResending(false);});
    return()=>{active=false;};
  },[initialEmail,location.state]);

  const setOtpFrom = (start: number, value: string) => {
    const numeric = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    // Autofill or a pasted complete code replaces the entire previous code.
    const replaceAll = numeric.length === 6 || numeric.length === OTP_LENGTH;
    const offset = replaceAll ? 0 : start;
    const nextDigits = replaceAll ? Array<string>(OTP_LENGTH).fill('') : [...digits];
    const incoming = numeric.slice(0, OTP_LENGTH - offset);
    if (!incoming) nextDigits[start] = '';
    else incoming.split('').forEach((digit, index) => { nextDigits[offset + index] = digit; });
    setDigits(nextDigits);
    setError(null);
    if (incoming) inputs.current[Math.min(offset + incoming.length, OTP_LENGTH - 1)]?.focus();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay ang email address na ginamit sa paggawa ng account.');
      return;
    }
    if (![6, 8].includes(code.length) || digits.slice(0, code.length).some(digit => !digit)) {
      setError("Ilagay ang kumpletong code sa pagpapatunay na may 6 o 8 na numero.");
      inputs.current[Math.max(0, digits.findIndex((digit) => !digit))]?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await api('/auth/email-verification/verify', {method:'POST', body:{email:cleanEmail,code}});
      showFormFeedback('Na-verify na ang iyong email. Maaari ka nang mag-login.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? tagalogError(err) : 'Mali ang code. Subukan ulit.');
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if(resending || submitting)return;
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('Ilagay muna ang email address para maipadala muli ang code.');
      return;
    }
    setError(null);
    setResendMessage(null);
    setResending(true);
    try {
      await api('/auth/email-verification/request', {method:'POST',body:{email:cleanEmail,userId:(location.state as {userId?:string}|null)?.userId}});
      showFormFeedback('Kung may account sa email na ito, naipadala na muli ang verification code.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      setResendMessage('Naipadala na muli ang verification code sa iyong email.');
    } catch (err) {
      setError(err instanceof Error ? tagalogError(err) : 'Hindi naipadala ang bagong code. Subukan ulit.');
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="verify-email-page"><p className="sr-only" role="status">Please verify your email first. Kumpirmahin muna ang iyong email bago makapasok.</p>
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
            <p>Please verify your email first. Ilagay ang code na natanggap mo sa email bago makapasok.</p>
          </header>

          <form onSubmit={onSubmit} noValidate className="verify-email-form">
            {<label className="verify-email-address">Email address<input id="email" type="email" value={email} disabled={resending || submitting} onChange={(event) => {setEmail(event.target.value);setDigits(Array(OTP_LENGTH).fill(''));setError(null);setResendMessage(null);}} autoComplete="email" placeholder="halimbawa@email.com" /></label>}
            <fieldset className="verify-email-otp" aria-label="Email verification code" aria-describedby="verify-email-code-hint" disabled={submitting}>
              {digits.map((digit, index) => <input
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                type="text"
                inputMode="numeric"
                aria-invalid={error ? true : undefined}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={OTP_LENGTH}
                value={digit}
                onFocus={(event) => event.currentTarget.select()}
                onPaste={(event) => {
                  event.preventDefault();
                  setOtpFrom(index, event.clipboardData.getData('text'));
                }}
                onChange={(event) => setOtpFrom(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' && !digits[index] && index > 0) {
                    event.preventDefault();
                    setOtpFrom(index - 1, '');
                    inputs.current[index - 1]?.focus();
                  }
                  if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus(); }
                  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) { event.preventDefault(); inputs.current[index + 1]?.focus(); }
                }}
              />)}
            </fieldset>
            <p id="verify-email-code-hint" className="verify-email-code-hint">Ilagay ang 6 o 8 na numerong nasa email. Maaari mong i-paste ang buong code.</p>
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
