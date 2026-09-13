import type { MeterReading } from '@/features/api/model';

/**
 * A meter reading as the API actually returns it.
 *
 * The generated model carries `evidence_path` only; the server also appends a
 * short-lived signed `evidence_url`. Declared here rather than edited into the
 * generated file, which is overwritten whenever the client is regenerated.
 */
export type ReadingWithEvidence = MeterReading & {
    evidence_url?: string | null;
};

/**
 * The link to a reading's evidence photo.
 *
 * This used to build `${origin}/storage/${evidence_path}` — the URL of a local
 * symlink on the server's own disk. Evidence now lives in a private bucket, so
 * there is no such path and no public URL to construct: the server signs a
 * link valid for a few minutes and returns it with the reading. The client's
 * job is only to use it.
 */
export function getEvidenceImageUrl(reading: ReadingWithEvidence | null): string | null {
    const url = reading?.evidence_url;

    return url?.trim() ? url : null;
}
