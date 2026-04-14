import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    UIManager,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Galeria } from '@nandorojo/galeria';
import { X, Clock, FileText, Download, Camera, Droplets } from 'lucide-react-native';
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
import { fetchEvidenceAsDataUri } from '@/lib/evidence-image';
import { downloadAndShareEvidence } from '@/lib/evidence-download';
import type { MeterReading } from '@/features/api/model';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
});

const LITER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const LITER_INTEGER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

type EvidenceDisplayItem = {
    id: string;
    nozzleName: string;
    evidencePath: string;
    uri: string;
};

function slugifyFilename(input: string): string {
    const s = input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return s || 'evidence';
}

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
    const [evidenceItems, setEvidenceItems] = useState<EvidenceDisplayItem[] | null>(null);
    const [isEvidenceLoading, setIsEvidenceLoading] = useState(false);
    const [evidenceDownloadingId, setEvidenceDownloadingId] = useState<string | null>(null);
    const [selectedEvidenceIndex, setSelectedEvidenceIndex] = useState<number | null>(null);

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

    const readingsWithEvidence = useMemo(() => {
        const readings = shift?.readings ?? [];
        return readings.filter(
            (r): r is MeterReading & { nozzle?: { name?: string } } => !!r.evidence_path,
        );
    }, [shift?.readings]);

    const evidenceFetchKey = useMemo(() => {
        return readingsWithEvidence
            .map((r) => `${r.id}:${r.evidence_path ?? ''}:${r.nozzle_id}`)
            .join('|');
    }, [readingsWithEvidence]);

    useEffect(() => {
        let cancelled = false;

        if (!shiftId || readingsWithEvidence.length === 0) {
            setEvidenceItems(readingsWithEvidence.length === 0 ? [] : null);
            setIsEvidenceLoading(false);
            return () => {
                cancelled = true;
            };
        }

        setIsEvidenceLoading(true);
        setEvidenceItems(null);

        (async () => {
            const resolved = await Promise.all(
                readingsWithEvidence.map(async (r) => {
                    if (!r.evidence_path) return null;
                    const uri = await fetchEvidenceAsDataUri(r.evidence_path);
                    if (!uri) return null;
                    const nozzleName =
                        (r as MeterReading & { nozzle?: { name?: string } }).nozzle?.name ??
                        `Nozzle ${r.nozzle_id.slice(0, 8)}`;
                    return {
                        id: r.id,
                        nozzleName,
                        evidencePath: r.evidence_path,
                        uri,
                    } satisfies EvidenceDisplayItem;
                }),
            );

            if (cancelled) return;
            setEvidenceItems(
                resolved.filter((x): x is EvidenceDisplayItem => x != null),
            );
            setIsEvidenceLoading(false);
        })().catch(() => {
            if (cancelled) return;
            setEvidenceItems([]);
            setIsEvidenceLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, [shiftId, evidenceFetchKey, readingsWithEvidence]);

    const handleEvidenceDownload = useCallback(
        async (item: EvidenceDisplayItem) => {
            setEvidenceDownloadingId(item.id);
            try {
                const filename = `meter-evidence-${slugifyFilename(item.nozzleName)}`;
                await downloadAndShareEvidence(item.uri, filename);
            } catch (e) {
                const message =
                    e instanceof Error ? e.message : 'Failed to download evidence image';
                Alert.alert('Error', message);
            } finally {
                setEvidenceDownloadingId(null);
            }
        },
        [],
    );

    const isGaleriaAvailable = useMemo(() => {
        try {
            // If the native ViewManager isn't registered (Expo Go / no dev-client rebuild),
            // attempting to render Galeria will throw "Can't find ViewManager".
            const cfg =
                typeof UIManager.getViewManagerConfig === 'function'
                    ? UIManager.getViewManagerConfig('Galeria')
                    : null;
            return !!cfg;
        } catch {
            return false;
        }
    }, []);

    const closeEvidenceViewer = useCallback(() => {
        setSelectedEvidenceIndex(null);
    }, []);

    const selectedEvidence =
        selectedEvidenceIndex != null && evidenceItems && evidenceItems[selectedEvidenceIndex]
            ? evidenceItems[selectedEvidenceIndex]
            : null;

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

    const wetStock = shift?.wet_stock;
    const wetVarianceLiters = wetStock?.variance_liters;
    const wetSoldLiters = wetStock?.total_sold_liters;
    const formattedWetVariance =
        typeof wetVarianceLiters === 'number'
            ? `${wetVarianceLiters > 0 ? '+' : ''}${LITER_FORMATTER.format(wetVarianceLiters)} L`
            : '';
    const formattedWetSold =
        typeof wetSoldLiters === 'number'
            ? `${LITER_INTEGER_FORMATTER.format(wetSoldLiters)} L`
            : '';

    return (
        <Modal
            visible={!!shiftId}
            animationType="slide"
            presentationStyle="formSheet"
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

                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={styles.sectionHeader}>
                                        <Droplets size={18} color="#64748b" />
                                        <Text style={styles.sectionTitle}>Wet Stock Variance</Text>
                                    </View>
                                    {typeof wetVarianceLiters === 'number' &&
                                    typeof wetSoldLiters === 'number' ? (
                                        <View style={styles.innerCard}>
                                            <View
                                                style={[
                                                    styles.financialRow,
                                                    styles.financialRowBorder,
                                                ]}
                                            >
                                                <Text style={styles.fieldLabel}>
                                                    Variance (L)
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.fieldValue,
                                                        wetVarianceLiters < 0
                                                            ? styles.varianceNegative
                                                            : wetVarianceLiters > 0
                                                              ? styles.variancePositive
                                                              : undefined,
                                                    ]}
                                                >
                                                    {formattedWetVariance}
                                                </Text>
                                            </View>
                                            <View style={styles.financialRow}>
                                                <Text style={styles.fieldLabel}>
                                                    Total sold (L)
                                                </Text>
                                                <Text style={styles.fieldValue}>
                                                    {formattedWetSold}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={styles.hintText}>
                                            No wet stock data recorded for this shift.
                                        </Text>
                                    )}
                                </View>

                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={styles.sectionHeader}>
                                        <Camera size={18} color="#64748b" />
                                        <Text style={styles.sectionTitle}>Meter Evidence</Text>
                                    </View>
                                    {readingsWithEvidence.length === 0 ? (
                                        <Text style={styles.hintText}>
                                            No meter evidence recorded for this shift.
                                        </Text>
                                    ) : isEvidenceLoading && !evidenceItems ? (
                                        <View style={styles.evidenceGrid}>
                                            {Array.from({ length: Math.min(6, readingsWithEvidence.length) }).map(
                                                (_, idx) => (
                                                    <View key={idx} style={styles.evidenceItem}>
                                                        <View style={styles.evidenceThumbWrap}>
                                                            <View style={styles.evidenceThumbnailSkeleton}>
                                                                <ActivityIndicator
                                                                    size="small"
                                                                    color="#64748b"
                                                                />
                                                            </View>
                                                        </View>
                                                        <View
                                                            style={[
                                                                styles.skeleton,
                                                                { height: 10, width: 64 },
                                                            ]}
                                                        />
                                                    </View>
                                                ),
                                            )}
                                        </View>
                                    ) : evidenceItems && evidenceItems.length > 0 ? (
                                        isGaleriaAvailable ? (
                                            <Galeria urls={evidenceItems.map((x) => x.uri)}>
                                                <View style={styles.evidenceGrid}>
                                                    {evidenceItems.map((item, index) => (
                                                        <View
                                                            key={item.id}
                                                            style={styles.evidenceItem}
                                                        >
                                                            <View style={styles.evidenceThumbWrap}>
                                                                <Galeria.Image index={index}>
                                                                    <Image
                                                                        source={{ uri: item.uri }}
                                                                        style={styles.evidenceThumbnail}
                                                                        contentFit="cover"
                                                                        transition={200}
                                                                    />
                                                                </Galeria.Image>
                                                                <Pressable
                                                                    onPress={() =>
                                                                        handleEvidenceDownload(
                                                                            item,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        evidenceDownloadingId ===
                                                                        item.id
                                                                    }
                                                                    style={({ pressed }) => [
                                                                        styles.evidenceDownloadOverlay,
                                                                        pressed &&
                                                                            styles.downloadButtonPressed,
                                                                        evidenceDownloadingId ===
                                                                            item.id &&
                                                                            styles.downloadButtonDisabled,
                                                                    ]}
                                                                >
                                                                    {evidenceDownloadingId ===
                                                                    item.id ? (
                                                                        <ActivityIndicator
                                                                            size="small"
                                                                            color="#10b981"
                                                                        />
                                                                    ) : (
                                                                        <Download
                                                                            size={16}
                                                                            color="#10b981"
                                                                        />
                                                                    )}
                                                                </Pressable>
                                                            </View>
                                                            <Text
                                                                style={styles.evidenceLabel}
                                                                numberOfLines={2}
                                                            >
                                                                {item.nozzleName}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </Galeria>
                                        ) : (
                                            <View style={styles.evidenceGrid}>
                                                {evidenceItems.map((item, index) => (
                                                    <View key={item.id} style={styles.evidenceItem}>
                                                        <View style={styles.evidenceThumbWrap}>
                                                            <Pressable
                                                                onPress={() =>
                                                                    setSelectedEvidenceIndex(
                                                                        index,
                                                                    )
                                                                }
                                                                style={({ pressed }) => [
                                                                    pressed && styles.downloadButtonPressed,
                                                                ]}
                                                            >
                                                                <Image
                                                                    source={{ uri: item.uri }}
                                                                    style={styles.evidenceThumbnail}
                                                                    contentFit="cover"
                                                                    transition={200}
                                                                />
                                                            </Pressable>
                                                            
                                                        </View>
                                                        <Text
                                                            style={styles.evidenceLabel}
                                                            numberOfLines={2}
                                                        >
                                                            {item.nozzleName}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )
                                    ) : (
                                        <Text style={styles.hintText}>
                                            Evidence images could not be loaded.
                                        </Text>
                                    )}
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

            {/* Fallback fullscreen viewer when Galeria native view isn't available */}
            <Modal
                visible={selectedEvidenceIndex != null && !isGaleriaAvailable}
                transparent
                animationType="fade"
                onRequestClose={closeEvidenceViewer}
            >
                <View style={styles.fullscreenOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={closeEvidenceViewer}
                    />
                    <View style={styles.fullscreenHeader}>
                        <Pressable
                            onPress={closeEvidenceViewer}
                            style={styles.fullscreenIconButton}
                        >
                            <X size={22} color="#e2e8f0" />
                        </Pressable>

                        {selectedEvidence ? (
                            <Pressable
                                onPress={() => handleEvidenceDownload(selectedEvidence)}
                                style={styles.fullscreenIconButton}
                            >
                                <Download size={20} color="#10b981" />
                            </Pressable>
                        ) : null}
                    </View>

                    {selectedEvidence ? (
                        <Image
                            source={{ uri: selectedEvidence.uri }}
                            style={styles.fullscreenImage}
                            contentFit="contain"
                        />
                    ) : null}
                </View>
            </Modal>
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
    evidenceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    evidenceItem: {
        width: 80,
        alignItems: 'center',
        gap: 6,
    },
    evidenceThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(30,41,59,0.5)',
    },
    evidenceThumbWrap: {
        width: 80,
        height: 80,
        position: 'relative',
    },
    evidenceThumbnailSkeleton: {
        width: 80,
        height: 80,
        borderRadius: 12,
        borderCurve: 'continuous',
        backgroundColor: 'rgba(51,65,85,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    evidenceDownloadOverlay: {
        position: 'absolute',
        right: 6,
        top: 6,
        padding: 6,
        borderRadius: 9999,
        backgroundColor: 'rgba(15,23,42,0.8)',
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.25)',
    },
    fullscreenOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    fullscreenHeader: {
        position: 'absolute',
        top: 56,
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    fullscreenIconButton: {
        padding: 10,
        borderRadius: 9999,
        backgroundColor: 'rgba(15,23,42,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.25)',
    },
    fullscreenImage: {
        width: '100%',
        height: '80%',
        borderRadius: 16,
        borderCurve: 'continuous',
    },
    evidenceLabel: {
        color: '#94a3b8',
        fontSize: 11,
        textAlign: 'center',
    },
});
