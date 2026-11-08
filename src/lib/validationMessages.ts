const DEFAULT_ERROR = 'Hindi makumpleto ang kahilingan. Suriin ang mga inilagay at subukan muli.';

/** Translate service errors at the UI boundary; keep the original error for diagnostics. */
export function tagalogError(error: unknown, fallback = DEFAULT_ERROR): string {
  const message = typeof error === 'string' ? error : error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'session_not_found' || /authentication required|not authenticated/i.test(message)) return 'Mag-login muna upang magpatuloy.';
  if (/invalid_credentials|invalid_grant/.test(code) || /invalid login credentials|invalid credentials|email or password is incorrect/i.test(message)) return 'Mali ang email o password. Subukan muli.';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return 'Kumpirmahin muna ang iyong email bago mag-login.';
  if (/user_already_exists|email_exists/.test(code) || /already (?:been )?registered|already exists|already in use/i.test(message)) return 'May account nang gumagamit ng email na ito. Gumamit ng ibang email o mag-login.';
  if (code === 'same_password' || /new password should be different|same password/i.test(message)) return 'Gumamit ng bagong password na iba sa kasalukuyan.';
  if (/weak_password/.test(code) || /password should|password must|weak password/i.test(message)) return 'Gumamit ng matibay na password na may hindi bababa sa 8 karakter, malaking letra, at numero.';
  if (/otp_expired|otp_disabled/.test(code) || /token has expired|token is invalid|invalid.*(?:otp|verification code)|expired.*(?:otp|code)/i.test(message)) return 'Mali o paso na ang code. Humiling ng bagong code at subukan muli.';
  if (/mfa_verification_failed/.test(code) || /invalid.*(?:totp|authenticator)|verification failed/i.test(message)) return 'Mali ang code sa pagpapatunay. Ilagay ang pinakabagong code at subukan muli.';
  if (/rate_limit|over_.*rate_limit/.test(code) || /too many|rate limit|security purposes.*seconds/i.test(message)) return 'Masyadong maraming pagsubok. Maghintay sandali at subukan muli.';
  if (/email_address_invalid/.test(code) || /invalid email|email.*invalid/i.test(message)) return 'Ilagay ang wastong email address.';
  if (/session_expired|refresh_token_not_found|refresh_token_already_used/.test(code) || /invalid.*(?:session|refresh token)|(?:session|jwt).*(?:expired|invalid)/i.test(message)) return 'Paso na ang iyong session. Mag-login muli.';
  if (/failed to fetch|fetch failed|network|load failed|timeout|timed out/i.test(message)) return 'Hindi makakonekta. Suriin ang iyong internet at subukan muli.';
  if (code === '23505' || /duplicate key/i.test(message)) return 'May kaparehong tala na. Suriin ang mga inilagay at subukan muli.';
  if (code === '42501' || /permission denied|row.level security|not authorized|unauthorized/i.test(message)) return 'Wala kang pahintulot para sa pagkilos na ito. Mag-login muli o makipag-ugnayan sa tagapangasiwa.';
  // App-owned messages are already Tagalog. Never expose an unknown provider
  // message (including database diagnostics) as a validation message.
  if (/^(hindi|kailangan|kailangang|ilagay|pumili|gumamit|walang|wala|mali|paso|kumpletuhin|magdagdag|maghintay|tapusin|kumpirmahin|suriin|sundin|hanggang|masyadong|nagbago|naipasa|naipadala|naitala|nagawa|bago|ang|pangalan|magsimula|mag-login|pansamantalang|mukhang|dapat|hintaying|sumulat|lagyan|sundin)\b/i.test(message.trim())) return message;
  if (/^(may|mga)\s.*\b(ang|sa|na|ng)\b/i.test(message.trim())) return message;
  if (/^(?:(?:nai-|naka-|nag-|na-|mag-|i-)\p{L}+|awtomatikong|nakopya)\b/iu.test(message.trim())) return message;
  if (/^(?:PDF|PNG|JPG|WEBP)\b.*\b(lamang|ang|na|ng)\b/.test(message.trim())) return message;
  return fallback;
}

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function nativeValidationMessage(control: FormControl): string {
  const v = control.validity;
  if (v.valueMissing) {
    if (control instanceof HTMLSelectElement) return 'Pumili ng isang opsyon.';
    if (control instanceof HTMLInputElement && control.type === 'checkbox') return 'Lagyan muna ng tsek ang kahong ito.';
    if (control instanceof HTMLInputElement && control.type === 'radio') return 'Pumili ng isang opsyon.';
    if (control instanceof HTMLInputElement && control.type === 'file') return 'Pumili muna ng file.';
    return 'Kumpletuhin ang bahaging ito.';
  }
  if (v.typeMismatch) return control instanceof HTMLInputElement && control.type === 'email' ? 'Ilagay ang wastong email address.' : 'Ilagay ang wastong URL, gaya ng https://halimbawa.com.';
  if (v.badInput) return 'Ilagay ang wastong numero o petsa.';
  if (v.tooShort) return `Gumamit ng hindi bababa sa ${'minLength' in control ? control.minLength : 0} karakter.`;
  if (v.tooLong) return `Hanggang ${'maxLength' in control ? control.maxLength : 0} karakter lamang ang maaaring ilagay.`;
  if (v.rangeUnderflow) return `Ang halaga ay dapat ${'min' in control ? control.min : ''} o higit pa.`;
  if (v.rangeOverflow) return `Ang halaga ay dapat ${'max' in control ? control.max : ''} o mas mababa.`;
  if (v.stepMismatch) return `Ilagay ang halagang naaayon sa pagitan na ${'step' in control ? control.step || '1' : '1'}.`;
  if (v.patternMismatch) return control.getAttribute('pattern') === '[0-9]{6}' ? 'Ilagay ang kumpletong code na may 6 na numero.' : 'Sundin ang hinihinging anyo para sa bahaging ito.';
  return v.customError ? tagalogError(control.validationMessage) : 'Suriin ang inilagay sa bahaging ito.';
}

/** Keep native constraint validation, including its focus and submission blocking. */
export function installTagalogValidation(root: Document): () => void {
  const owned = new WeakSet<FormControl>();
  const isControl = (target: EventTarget | null): target is FormControl => target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
  const invalid = (event: Event) => {
    if (!isControl(event.target)) return;
    const control = event.target;
    const custom = control.validity.customError && !owned.has(control);
    control.setCustomValidity(nativeValidationMessage(control));
    if (!custom) owned.add(control);
  };
  const clear = (event: Event) => {
    if (isControl(event.target) && owned.has(event.target)) {
      event.target.setCustomValidity('');
      owned.delete(event.target);
    }
  };
  const reset = (event: Event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    for (const control of event.target.elements) if (isControl(control) && owned.has(control)) { control.setCustomValidity(''); owned.delete(control); }
  };
  root.addEventListener('invalid', invalid, true);
  root.addEventListener('input', clear, true);
  root.addEventListener('change', clear, true);
  root.addEventListener('reset', reset, true);
  return () => {
    root.removeEventListener('invalid', invalid, true);
    root.removeEventListener('input', clear, true);
    root.removeEventListener('change', clear, true);
    root.removeEventListener('reset', reset, true);
  };
}
