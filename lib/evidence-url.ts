import { BASE_URL } from './axios';

export function getEvidenceImageUrl(evidencePath: string | null): string | null {
  if (!evidencePath?.trim()) return null;
  try {
    const origin = new URL(BASE_URL ?? '').origin;
    return `${origin}/storage/${evidencePath}`;
  } catch {
    return null;
  }
}
