export type AnalyticsEvent =
  | 'signup_started' | 'signup_completed' | 'login_success'
  | 'lesson_started' | 'lesson_completed'
  | 'reading_attempt_started' | 'reading_attempt_completed' | 'reading_attempt_failed'
  | 'speech_request_failed' | 'assessment_completed';

const BLOCKED_KEYS = /email|name|password|token|transcript|voice|audio|student|child/i;

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean | null> = {}) {
  const safeProperties = Object.fromEntries(Object.entries(properties).filter(([key]) => !BLOCKED_KEYS.test(key)));
  const detail = { event, properties: safeProperties, timestamp: new Date().toISOString() };
  window.dispatchEvent(new CustomEvent('linawletra:analytics', { detail }));

  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (!endpoint) return;
  const body = JSON.stringify(detail);
  if (navigator.sendBeacon) navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
  else fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
