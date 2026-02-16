/**
 * Download/share an evidence image (data URI) via native share sheet.
 *
 * Evidence images are fetched as `data:image/...;base64,...` URIs (see `fetchEvidenceAsDataUri`).
 * We decode the base64 into bytes, write into the app cache, then open the share sheet.
 *
 * This mirrors the invoice download pattern in `lib/invoice-download.ts`.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
 
type DecodedDataUri = {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
};
 
function guessExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}
 
function decodeDataUri(dataUri: string): DecodedDataUri {
  const match = dataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data. Please try again.');
  }
 
  const mimeType = match[1];
  const base64 = match[2];
  // atob/btoa are available in this project (see lib/evidence-image.ts).
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
 
  return {
    bytes,
    mimeType,
    extension: guessExtension(mimeType),
  };
}
 
function ensureExtension(filename: string, extension: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return `evidence.${extension}`;
  if (trimmed.toLowerCase().endsWith(`.${extension}`)) return trimmed;
  return `${trimmed}.${extension}`;
}
 
export async function downloadAndShareEvidence(
  dataUri: string,
  filename: string,
): Promise<void> {
  const { bytes, mimeType, extension } = decodeDataUri(dataUri);
  const safeName = ensureExtension(filename, extension);
 
  const destDir = new Directory(Paths.cache, 'evidence');
  destDir.create({ idempotent: true });
 
  const file = new File(destDir, safeName);
  file.create({ overwrite: true });
  file.write(bytes);
 
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(
      'Sharing is not available on this device. Please use a native app (iOS/Android) to download evidence images.',
    );
  }
 
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: 'Save Evidence Image',
  });
}

