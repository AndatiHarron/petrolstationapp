import React, { memo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Car } from 'lucide-react-native';
import type { CreditSaleResource, CreditSalesShow200 } from '@/features/api/model';
import { useCreditSalesShow } from '@/features/api/credit-sale/credit-sale';
import { Sheet, SheetHeadline, SheetRows, SheetSection } from '@/components/sheet';

interface CreditSaleDetailModalProps {
    creditSaleId: string | null;
    onClose: () => void;
}

/**
 * Detail for one credit sale.
 *
 * Rebuilt on the shared Sheet: it previously used StyleSheet and a full-height
 * panel, while every other sheet in the app is a NativeWind bottom sheet with a
 * tappable backdrop, so it read as a different app.
 */
export const CreditSaleDetailModal = memo(function CreditSaleDetailModal({
    creditSaleId,
    onClose,
}: CreditSaleDetailModalProps) {
    const { data: response, isLoading } = useCreditSalesShow(creditSaleId || '', {
        query: { enabled: !!creditSaleId },
    });

    if (!creditSaleId) return null;

    const hasData = (res: unknown): res is { data: CreditSalesShow200 } =>
        res !== null && typeof res === 'object' && 'data' in res && res.data !== null;

    const creditSale: CreditSaleResource | undefined = hasData(response)
        ? (response.data as unknown as CreditSaleResource)
        : undefined;

    const amount = creditSale
        ? `KES ${Number(creditSale.amount).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })}`
        : '';

    const when = creditSale
        ? new Date(creditSale.created_at).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';

    return (
        <Sheet
            visible
            title="Credit sale"
            subtitle={creditSale?.customer_name ?? undefined}
            onClose={onClose}
        >
            {isLoading ? (
                <View className="items-center py-16">
                    <ActivityIndicator color="#040273" />
                </View>
            ) : !creditSale ? (
                <View className="items-center py-16">
                    <Text className="text-ink-muted text-sm">Credit sale not found</Text>
                </View>
            ) : (
                <>
                    <SheetHeadline label="Amount on credit" value={amount} />

                    <View className="gap-2">
                        <SheetSection>Customer</SheetSection>
                        <SheetRows
                            rows={[
                                {
                                    label: 'Name',
                                    value: creditSale.customer_name || 'Unknown customer',
                                },
                                ...(creditSale.vehicle_reg
                                    ? [
                                          {
                                              label: 'Vehicle',
                                              value: creditSale.vehicle_reg,
                                              render: (
                                                  <View className="shrink-0 flex-row items-center gap-1.5">
                                                      <Car size={13} color="#5c5c6b" />
                                                      <Text className="text-ink font-mono text-xs font-bold">
                                                          {creditSale.vehicle_reg}
                                                      </Text>
                                                  </View>
                                              ),
                                          },
                                      ]
                                    : []),
                            ]}
                        />
                    </View>

                    <View className="gap-2">
                        <SheetSection>Transaction</SheetSection>
                        <SheetRows
                            rows={[
                                { label: 'Recorded', value: when },
                                { label: 'Reference', value: creditSale.id, mono: true },
                            ]}
                        />
                    </View>

                    {creditSale.notes ? (
                        <View className="gap-2">
                            <SheetSection>Notes</SheetSection>
                            <View className="rounded-xl border border-surface-border px-4 py-3">
                                <Text className="text-ink text-xs leading-5">{creditSale.notes}</Text>
                            </View>
                        </View>
                    ) : null}
                </>
            )}
        </Sheet>
    );
});
