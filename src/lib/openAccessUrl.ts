import { api } from './api';

export async function openAccessUrl(endpoint: string): Promise<void> {
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  try {
    const result = await api<{ url: string | null }>(endpoint, { auth: true });
    if (!result.url) throw new Error('Walang available na file URL.');
    if (popup) popup.location.href = result.url;
    else window.location.assign(result.url);
  } catch (error) {
    popup?.close();
    throw error;
  }
}
