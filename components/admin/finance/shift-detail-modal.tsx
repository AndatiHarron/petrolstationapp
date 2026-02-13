import React, { memo, useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X, Clock, FileText, Download } from 'lucide-react-native';
import type {
    InvoiceResource,
    ShiftGenerateInvoices200,
    ShiftResource,
    ShiftShow200,
} from '@/features/api/model';
import {
    getShiftInvoicesQueryKey,
    useShiftGenerateInvoices,
    useShiftInvoices,
    useShiftShow,
} from '@/features/api/shift/shift';
import { Button } from '@/components/button';
import { downloadAndShareInvoice } from '@/lib/invoice-download';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
});

interface ShiftDetailModalProps {
    shiftId: string | null;
    onClose: () => void;
}

const InvoiceRow = memo(function InvoiceRow({
    id,
    invoiceNumber,
    totalAmount,
    onDownload,
    isDownloading,
}: {
    id: string;
    invoiceNumber: string;
    totalAmount: string;
    onDownload: (id: string) => void;
    isDownloading: boolean;
}) {
    const handlePress = useCallback(() => {
        onDownload(id);
    }, [id, onDownload]);

    const formattedAmount = CURRENCY_FORMATTER.format(parseFloat(totalAmount));

    return (
        <Animated.View entering={FadeIn} style={styles.invoiceRow}>
            <View style={styles.invoiceRowContent}>
                <View style={styles.invoiceRowText}>
                    <Text style={styles.invoiceNumber} selectable>
                        {invoiceNumber}
                    </Text>
                    <Text style={styles.invoiceAmount}>{formattedAmount}</Text>
                </View>
                <Pressable
                    onPress={handlePress}
                    disabled={isDownloading}
                    style={({ pressed }) => [
                        styles.downloadButton,
                        pressed && styles.downloadButtonPressed,
                        isDownloading && styles.downloadButtonDisabled,
                    ]}
                >
                    {isDownloading ? (
                        <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                        <Download size={18} color="#10b981" />
                    )}
                </Pressable>
            </View>
        </Animated.View>
    );
});

export const ShiftDetailModal = memo(function ShiftDetailModal({
    shiftId,
    onClose,
}: ShiftDetailModalProps) {
    const queryClient = useQueryClient();
    const [lastGenerationWasEmpty, setLastGenerationWasEmpty] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        setLastGenerationWasEmpty(false);
    }, [shiftId]);

    const { data: response, isLoading } = useShiftShow(shiftId ?? '', {
        query: { enabled: !!shiftId },
    });

    const hasShiftData = (res: unknown): res is { data: ShiftShow200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };
    const shift: ShiftResource | undefined = hasShiftData(response)
        ? (response.data as unknown as ShiftResource)
        : undefined;
    const isLocked = shift?.status === 'LOCKED';

    const { data: invoicesResponse } = useShiftInvoices(shiftId ?? '', {
        query: { enabled: !!shiftId && !!isLocked },
    });

    const hasInvoicesData = (res: unknown): res is { data: InvoiceResource[] } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };
    const invoicesToShow: InvoiceResource[] = hasInvoicesData(invoicesResponse)
        ? (Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [])
        : [];

        console.log("invoicesResponse", JSON.stringify(invoicesResponse, null, 2), invoicesToShow.length)

    const generateMutation = useShiftGenerateInvoices({
        mutation: {
            onSuccess: (res, { shift: sid }) => {
                queryClient.invalidateQueries({ queryKey: getShiftInvoicesQueryKey(sid) });
                const data = res as unknown as ShiftGenerateInvoices200;
                const raw = data?.invoices ?? [];
                const list = Array.isArray(raw)
                    ? raw.filter((x): x is NonNullable<typeof x> => x != null)
                    : raw != null
                      ? [raw]
                      : [];
                setLastGenerationWasEmpty(list.length === 0);
            },
            onError: (err: unknown) => {
                let message = 'Failed to generate invoices';
                if (err && typeof err === 'object') {
                    const ax = err as { response?: { data?: { message?: string } }; message?: string };
                    const apiMsg = ax.response?.data?.message;
                    if (apiMsg) {
                        message = apiMsg;
                    } else if (ax.message) {
                        message = String(ax.message);
                    }
                }
                Alert.alert('Error', message);
            },
        },
    });

    const handleDownload = useCallback(async (invoiceId: string) => {
        setDownloadingId(invoiceId);
        try {
            await downloadAndShareInvoice(invoiceId);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to download invoice';
            Alert.alert('Error', message);
        } finally {
            setDownloadingId(null);
        }
    }, []);

    if (!shiftId) return null;

    const formattedDate = shift?.started_at
        ? new Date(shift.started_at).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';

    const financials = shift?.financials;
    const formattedExpected = financials
        ? CURRENCY_FORMATTER.format(financials.expected)
        : '';
    const formattedCollected = financials
        ? CURRENCY_FORMATTER.format(financials.collected)
        : '';
    const formattedVariance = financials
        ? CURRENCY_FORMATTER.format(financials.variance)
        : '';

    return (
        <Modal
            visible={!!shiftId}
            animationType="slide"
            presentationStyle="formSheet"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Shift Details</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X size={20} color="#94a3b8" />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        contentInsetAdjustmentBehavior="automatic"
                    >
                        {isLoading ? (
                            <>
                                <View style={[styles.card, { marginBottom: 24 }]}>
                                    <View style={[styles.skeleton, { height: 16, width: 128, marginBottom: 12 }]} />
                                    <View style={[styles.skeleton, { height: 40, width: 192 }]} />
                                </View>
                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={[styles.skeleton, { height: 16, width: 160, marginBottom: 16 }]} />
                                    <View style={styles.innerCard}>
                                        <View style={[styles.skeleton, { height: 12, width: 96, marginBottom: 8 }]} />
                                        <View style={[styles.skeleton, { height: 20, width: '100%' }]} />
                                    </View>
                                </View>
                            </>
                        ) : shift ? (
                            <>
                                <View style={styles.shiftHeader}>
                                    <View style={styles.row}>
                                        <Clock size={20} color="#10b981" />
                                        <Text style={styles.stationName}>{shift.station_name}</Text>
                                    </View>
                                    <Text style={styles.date}>{formattedDate}</Text>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            isLocked ? styles.statusLocked : styles.statusActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusText,
                                                isLocked ? styles.statusTextLocked : styles.statusTextActive,
                                            ]}
                                        >
                                            {shift.status?.toUpperCase() ?? 'UNKNOWN'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={styles.sectionHeader}>
                                        <FileText size={18} color="#64748b" />
                                        <Text style={styles.sectionTitle}>Financial Summary</Text>
                                    </View>
                                    <View style={styles.innerCard}>
                                        <View style={[styles.financialRow, styles.financialRowBorder]}>
                                            <Text style={styles.fieldLabel}>Expected</Text>
                                            <Text style={styles.fieldValue}>{formattedExpected}</Text>
                                        </View>
                                        <View style={[styles.financialRow, styles.financialRowBorder]}>
                                            <Text style={styles.fieldLabel}>Collected</Text>
                                            <Text style={styles.collectedValue}>{formattedCollected}</Text>
                                        </View>
                                        <View style={styles.financialRow}>
                                            <Text style={styles.fieldLabel}>Variance</Text>
                                            <Text
                                                style={[
                                                    styles.fieldValue,
                                                    (financials?.variance ?? 0) < 0
                                                        ? styles.varianceNegative
                                                        : styles.variancePositive,
                                                ]}
                                            >
                                                {formattedVariance}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {shift.variance_alert ? (
                                    <View style={styles.alertBox}>
                                        <Text style={styles.alertText}>
                                            Variance alert flagged for this shift
                                        </Text>
                                    </View>
                                ) : null}

                                {isLocked ? (
                                    <View style={[styles.card, { marginBottom: 24 }]}>
                                        <View style={styles.sectionHeader}>
                                            <FileText size={18} color="#64748b" />
                                            <Text style={styles.sectionTitle}>Invoices</Text>
                                        </View>

                                        {invoicesToShow.length > 0 ? (
                                            <View style={styles.invoiceList}>
                                                {invoicesToShow.map((inv) => (
                                                    <InvoiceRow
                                                        key={inv.id}
                                                        id={inv.id}
                                                        invoiceNumber={inv.invoice_number}
                                                        totalAmount={String(inv.total_amount)}
                                                        onDownload={handleDownload}
                                                        isDownloading={downloadingId === inv.id}
                                                    />
                                                ))}
                                            </View>
                                        ) : lastGenerationWasEmpty ? (
                                            <Text style={styles.hintText}>
                                                No credit sales in this shift. No invoices to generate.
                                            </Text>
                                        ) : null}

                                        <Button
                                            title={
                                                generateMutation.isPending
                                                    ? 'Generating…'
                                                    : 'Generate Invoices'
                                            }
                                            loading={generateMutation.isPending}
                                            onPress={() =>
                                                generateMutation.mutate({ shift: shiftId })
                                            }
                                            variant="primary"
                                            className="mt-4"
                                        />
                                    </View>
                                ) : null}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Shift not found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    container: {
        flex: 1,
        marginTop: 96,
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderCurve: 'continuous',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    headerTitle: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: '#1e293b',
        padding: 8,
        borderRadius: 9999,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
    },
    scrollContent: {
        paddingBottom: 40,
        paddingTop: 20,
        gap: 16,
    },
    card: {
        backgroundColor: 'rgba(30,41,59,0.5)',
        borderRadius: 16,
        padding: 20,
        borderCurve: 'continuous',
    },
    innerCard: {
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderRadius: 12,
        padding: 16,
    },
    skeleton: {
        backgroundColor: 'rgba(51,65,85,0.5)',
        borderRadius: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shiftHeader: {
        marginBottom: 16,
        gap: 8,
    },
    stationName: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    date: {
        color: '#94a3b8',
        fontSize: 14,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusLocked: {
        backgroundColor: 'rgba(245,158,11,0.15)',
    },
    statusActive: {
        backgroundColor: 'rgba(16,185,129,0.15)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    statusTextLocked: {
        color: '#f59e0b',
    },
    statusTextActive: {
        color: '#10b981',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    financialRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    fieldLabel: {
        color: '#64748b',
        fontSize: 14,
    },
    fieldValue: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    collectedValue: {
        color: '#10b981',
        fontSize: 16,
        fontWeight: '600',
    },
    variancePositive: {
        color: '#10b981',
    },
    varianceNegative: {
        color: '#ef4444',
    },
    alertBox: {
        backgroundColor: 'rgba(239,68,68,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    alertText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '500',
    },
    invoiceList: {
        gap: 12,
        marginBottom: 16,
    },
    invoiceRow: {
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderRadius: 12,
        padding: 16,
        borderCurve: 'continuous',
    },
    invoiceRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    invoiceRowText: {
        flex: 1,
    },
    invoiceNumber: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    invoiceAmount: {
        color: '#10b981',
        fontSize: 14,
        marginTop: 4,
    },
    downloadButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(16,185,129,0.1)',
    },
    downloadButtonPressed: {
        opacity: 0.8,
    },
    downloadButtonDisabled: {
        opacity: 0.6,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    hintText: {
        color: '#64748b',
        fontSize: 14,
        marginBottom: 16,
    },
});
