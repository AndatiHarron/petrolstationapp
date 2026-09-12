/**
 * Fetch a report as a PDF and hand it to the native share sheet, which is how
 * a file reaches WhatsApp, email or the device's downloads from inside Expo.
 *
 * Follows the same arraybuffer approach as invoice-download: the endpoint
 * returns a binary stream, so the default JSON response type would corrupt it.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api } from './axios';

export type ReportSlug = 'end-of-day' | 'monthly' | 'credit' | 'users' | 'vat';

export async function downloadReportPdf(
    slug: ReportSlug,
    params: Record<string, string | undefined>,
    filenameHint: string
): Promise<void> {
    const query = new URLSearchParams(
        Object.entries({ ...params, format: 'pdf' }).filter(
            ([, value]) => value !== undefined && value !== null && value !== ''
        ) as [string, string][]
    ).toString();

    const response = await api.get<ArrayBuffer>(`/v1/reports/${slug}?${query}`, {
        responseType: 'arraybuffer',
    });

    const bytes = new Uint8Array(response.data);

    const destDir = new Directory(Paths.cache, 'reports');
    destDir.create({ idempotent: true });

    const safeName = filenameHint
        .replace(/[^a-z0-9-]+/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

    const file = new File(destDir, `${safeName || slug}.pdf`);
    file.create({ overwrite: true });
    file.write(bytes);

    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
    }

    await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share report',
        UTI: 'com.adobe.pdf',
    });
}
