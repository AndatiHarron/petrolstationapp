/**
 * Fetches evidence image via authenticated API and returns a data URI.
 * Tries API path first, then origin/storage path.
 */
import { api, BASE_URL } from './axios';
import { getEvidenceImageUrl } from './evidence-url';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await api.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
    });
    const bytes = new Uint8Array(response.data);
    const base64 = toBase64(bytes);
    return `data:image/jpeg;base64,${base64}`;
  } catch {
    return null;
  }
}

export async function fetchEvidenceAsDataUri(
  evidencePath: string | null
): Promise<string | null> {
  if (!evidencePath?.trim()) return null;
  const base = (BASE_URL ?? '').replace(/\/$/, '');
  const apiUrl = `${base}/storage/${evidencePath}`;
  const originUrl = getEvidenceImageUrl(evidencePath);
  return (await fetchAsDataUri(apiUrl)) ?? (originUrl ? await fetchAsDataUri(originUrl) : null);
}
