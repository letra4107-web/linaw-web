let activeToast: HTMLElement | null = null;
let dismissTimer: number | undefined;
let countdownTimer: number | undefined;

/** Show a centered, non-blocking message for an action that just completed. */
export function showFormFeedback(message: string, success = true) {
  if (typeof document === 'undefined') return;

  if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
  if(countdownTimer!==undefined)window.clearInterval(countdownTimer);
  activeToast?.remove();

  const duration = success ? 4000 : 6500;
  const toast = document.createElement('section');
  toast.className = `form-feedback-toast ${success ? 'is-success' : 'is-error'}`;
  toast.setAttribute('role', success ? 'status' : 'alert');
  toast.setAttribute('aria-live', success ? 'polite' : 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.style.setProperty('--toast-duration', `${duration}ms`);

  const icon = document.createElement('span');
  icon.className = 'form-feedback-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = success ? '✓' : '!';

  const content = document.createElement('div');
  content.className = 'form-feedback-content';
  const title = document.createElement('strong');
  title.textContent = success ? 'Matagumpay!' : 'May problema';
  const body = document.createElement('span');
  body.textContent = message;
  const countdown=document.createElement('small');
  countdown.className='form-feedback-countdown';
  countdown.setAttribute('aria-hidden','true');
  const expiresAt=Date.now()+duration;
  const updateCountdown=()=>{countdown.textContent=`Kusang magsasara sa ${Math.max(0,Math.ceil((expiresAt-Date.now())/1000))} segundo.`;};
  updateCountdown();
  content.append(title, body, countdown);

  const close = document.createElement('button');
  close.className = 'form-feedback-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Isara ang mensahe');
  close.textContent = '×';

  const timer = document.createElement('span');
  timer.className = 'form-feedback-timer';
  timer.setAttribute('aria-hidden', 'true');
  toast.append(icon, content, close, timer);

  const dismiss = () => {
    if(activeToast!==toast||toast.classList.contains('is-dismissing'))return;
    if (dismissTimer !== undefined) window.clearTimeout(dismissTimer);
    if(countdownTimer!==undefined)window.clearInterval(countdownTimer);
    toast.classList.add('is-dismissing');
    window.setTimeout(() => {
      toast.remove();
      if (activeToast === toast) activeToast = null;
    }, 180);
  };

  close.addEventListener('click', dismiss);
  document.body.append(toast);
  activeToast = toast;
  countdownTimer=window.setInterval(updateCountdown,250);
  dismissTimer = window.setTimeout(dismiss, duration);
}
