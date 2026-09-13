/**
 * Fetches an evidence photo and returns it as a data URI for <Image>.
 *
 * The photo lives in a private bucket, reached through the short-lived signed
 * link the API returns with each reading. Two things follow from that:
 *
 *  - it is fetched with plain `fetch`, not the app's axios client, so our
 *    Authorization header is never sent to the storage provider; the signature
 *    in the URL is the entire credential, and it belongs to nobody else.
 *  - there is no fallback path to try. The previous version guessed at
 *    `/storage/<path>` on the API host and then at the origin, which only ever
 *    worked while photos sat on the server's own disk.
 */
import { getEvidenceImageUrl, type ReadingWithEvidence } from './evidence-url';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function fetchEvidenceAsDataUri(
  reading: ReadingWithEvidence | null
): Promise<string | null> {
  const url = getEvidenceImageUrl(reading);

  if (!url) return null;

  try {
    const response = await fetch(url);

    // An expired signature comes back as 403 from the storage provider. There
    // is nothing to retry here — reopening the shift fetches a fresh link.
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';

    return `data:${contentType};base64,${toBase64(new Uint8Array(buffer))}`;
  } catch {
    return null;
  }
}
