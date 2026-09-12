/**
 * Download invoice PDF as binary stream and share via native share sheet.
 * Uses api (axios) with responseType: 'arraybuffer' since the endpoint returns
 * a PDF binary stream, not JSON.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './axios';

export async function downloadAndShareInvoice(invoiceId: string): Promise<void> {
  const response = await api.get<ArrayBuffer>('/v1/invoices/' + invoiceId + '/download', {
    responseType: 'arraybuffer',
  });

  const bytes = new Uint8Array(response.data);
  const destDir = new Directory(Paths.cache, 'invoices');
  destDir.create({ idempotent: true });

  const file = new File(destDir, `invoice-${invoiceId}.pdf`);
  file.create({ overwrite: true });
  file.write(bytes);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error(
      'Sharing is not available on this device. Please use a native app (iOS/Android) to download invoices.',
    );
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share Invoice',
  });
}
