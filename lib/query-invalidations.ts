import type { QueryClient } from '@tanstack/react-query';

import { getAuditLogIndexQueryKey } from '@/features/api/audit-log/audit-log';
import { getLiftingsIndexQueryKey } from '@/features/api/lifting/lifting';
import {
  getReportDebtAgingQueryKey,
  getReportPlQueryKey,
  getReportTaxSummaryQueryKey,
  getReportVarianceTrendQueryKey,
} from '@/features/api/report/report';
import {
  getShiftClosingDataQueryKey,
  getShiftCurrentQueryKey,
  getShiftIndexQueryKey,
  getShiftInvoicesQueryKey,
  getShiftShowQueryKey,
} from '@/features/api/shift/shift';
import { getTanksIndexQueryKey } from '@/features/api/tank/tank';

/**
 * Canonical query key for the "active shift" UI cache.
 *
 * Note: several screens override `useShiftCurrent` to use this key instead of
 * the Orval-generated `getShiftCurrentQueryKey()` key.
 */
export const getActiveShiftQueryKey = () => ['activeShift'] as const;

export function invalidateOnLiftingChange(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportPlQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportTaxSummaryQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportDebtAgingQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportVarianceTrendQueryKey() });
}

export function invalidateOnShiftStart(queryClient: QueryClient): void {
  // Active shift is cached under a custom key in multiple screens.
  queryClient.invalidateQueries({ queryKey: getActiveShiftQueryKey() });
  // Also invalidate the canonical Orval key in case any screen uses it.
  queryClient.invalidateQueries({ queryKey: getShiftCurrentQueryKey() });

  queryClient.invalidateQueries({ queryKey: getShiftIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
}

export function invalidateOnShiftLock(queryClient: QueryClient, shiftId?: string): void {
  invalidateOnShiftStart(queryClient);

  // Shift lock finalizes wet-stock variance and can affect inventory + reports.
  queryClient.invalidateQueries({ queryKey: getLiftingsIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getTanksIndexQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportPlQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportTaxSummaryQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportDebtAgingQueryKey() });
  queryClient.invalidateQueries({ queryKey: getReportVarianceTrendQueryKey() });

  if (shiftId) {
    queryClient.invalidateQueries({ queryKey: getShiftShowQueryKey(shiftId) });
    queryClient.invalidateQueries({ queryKey: getShiftInvoicesQueryKey(shiftId) });
    queryClient.invalidateQueries({ queryKey: getShiftClosingDataQueryKey(shiftId) });
  }
}

