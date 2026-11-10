export interface TemporaryChildCredential { username: string; password: string; childName: string; emailSent?: boolean }
// Keep only this page's unacknowledged receipts in memory, never browser storage.
export function rememberChildCredential(current: TemporaryChildCredential[], next: TemporaryChildCredential) {
  return [next, ...current.filter(item => item.username !== next.username)];
}
export function credentialEmailNotice(sent?: boolean) {
  if (sent === true) return 'Tinanggap ng email service ang login details. Tingnan din ang Spam folder.';
  if (sent === false) return 'Hindi naipadala ang email. Gamitin at itabi ang login details sa itaas.';
  return 'Gamitin at itabi ang login details sa itaas. Hindi nakumpirma ang email delivery.';
}
