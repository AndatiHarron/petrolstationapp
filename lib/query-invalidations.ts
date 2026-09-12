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


/**
 * Invalidate everything that carries a party balance.
 *
 * A supplier or customer balance is embedded in more responses than the list it
 * belongs to: every lifting response carries its supplier, including
 * `current_balance`, so a tapped lifting holds its own stale copy. Matching on
 * the request path rather than an exact key catches the detail endpoints and
 * every paginated variant, which naming keys individually would miss.
 */
function invalidateByPath(queryClient: QueryClient, prefixes: string[]): void {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const first = query.queryKey[0];

      return typeof first === 'string' && prefixes.some((prefix) => first.startsWith(prefix));
    },
  });
}

/** After a supplier payment is approved and what is owed comes down. */
export function invalidateOnSupplierBalanceChange(queryClient: QueryClient): void {
  invalidateByPath(queryClient, [
    '/v1/creditors',
    '/v1/suppliers',
    '/v1/liftings',
    '/v1/supplier-settlements',
  ]);

  // The reports layer keys everything under 'report'.
  queryClient.invalidateQueries({ queryKey: ['report'] });
  queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
}

/** After a customer credit payment is approved and their balance comes down. */
export function invalidateOnCustomerBalanceChange(queryClient: QueryClient): void {
  invalidateByPath(queryClient, [
    '/v1/customers',
    '/v1/credit-sales',
    '/v1/credit-settlements',
  ]);

  queryClient.invalidateQueries({ queryKey: ['report'] });
  queryClient.invalidateQueries({ queryKey: getAuditLogIndexQueryKey() });
}
