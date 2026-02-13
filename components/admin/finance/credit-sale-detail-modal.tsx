import React, { memo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { X, CreditCard, User, Calendar, FileText, Car } from 'lucide-react-native';
import type { CreditSaleResource, CreditSalesShow200, AuthenticationExceptionResponse } from '@/features/api/model';
import { useCreditSalesShow } from '@/features/api/credit-sale/credit-sale';

interface CreditSaleDetailModalProps {
    creditSaleId: string | null;
    onClose: () => void;
}

export const CreditSaleDetailModal = memo(function CreditSaleDetailModal({
    creditSaleId,
    onClose,
}: CreditSaleDetailModalProps) {
    const { data: response, isLoading } = useCreditSalesShow(creditSaleId || '', {
        query: {
            enabled: !!creditSaleId,
        },
    });

    if (!creditSaleId) return null;


    // Type guard to check if response has data
    const hasData = (res: unknown): res is { data: CreditSalesShow200 } => {
        return res !== null && typeof res === 'object' && 'data' in res && res.data !== null;
    };

    const creditSale: CreditSaleResource | undefined = hasData(response) ? response.data as unknown as CreditSaleResource : undefined;
    const formattedDate = creditSale
        ? new Date(creditSale.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    const formattedAmount = creditSale
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'KES',
        }).format(creditSale.amount)
        : '';

    return (
        <Modal
            visible={!!creditSaleId}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Credit Sale Details</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                            activeOpacity={0.7}
                        >
                            <X size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {isLoading ? (
                            <>
                                {/* Amount Skeleton */}
                                <View style={[styles.card, { marginBottom: 24 }]}>
                                    <View style={[styles.skeleton, { height: 16, width: 128, marginBottom: 12 }]} />
                                    <View style={[styles.skeleton, { height: 40, width: 192 }]} />
                                </View>

                                {/* Customer Info Skeleton */}
                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={[styles.skeleton, { height: 16, width: 160, marginBottom: 16 }]} />
                                    <View style={styles.innerCard}>
                                        <View style={[styles.skeleton, { height: 12, width: 96, marginBottom: 8 }]} />
                                        <View style={[styles.skeleton, { height: 20, width: '100%' }]} />
                                    </View>
                                </View>

                                {/* Transaction Details Skeleton */}
                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={[styles.skeleton, { height: 16, width: 144, marginBottom: 16 }]} />
                                    <View style={[styles.innerCard, { marginBottom: 12 }]}>
                                        <View style={[styles.skeleton, { height: 12, width: 112, marginBottom: 8 }]} />
                                        <View style={[styles.skeleton, { height: 16, width: '100%' }]} />
                                    </View>
                                    <View style={[styles.innerCard, { marginBottom: 12 }]}>
                                        <View style={[styles.skeleton, { height: 12, width: 96, marginBottom: 8 }]} />
                                        <View style={[styles.skeleton, { height: 16, width: '75%' }]} />
                                    </View>
                                    <View style={styles.innerCard}>
                                        <View style={[styles.skeleton, { height: 12, width: 128, marginBottom: 8 }]} />
                                        <View style={[styles.skeleton, { height: 16, width: '50%' }]} />
                                    </View>
                                </View>
                            </>
                        ) : creditSale ? (
                            <>
                                {/* Amount Card */}
                                <View style={styles.amountCard}>
                                    <View style={styles.row}>
                                        <CreditCard size={20} color="#10b981" />
                                        <Text style={styles.amountLabel}>
                                            TRANSACTION AMOUNT
                                        </Text>
                                    </View>
                                    <Text style={styles.amountValue}>{formattedAmount}</Text>
                                </View>

                                {/* Customer Information */}
                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={styles.sectionHeader}>
                                        <User size={18} color="#64748b" />
                                        <Text style={styles.sectionTitle}>
                                            Customer Information
                                        </Text>
                                    </View>
                                    <View style={styles.innerCard}>
                                        <Text style={styles.fieldLabel}>Customer Name</Text>
                                        <Text style={styles.fieldValue}>
                                            {creditSale.customer_name || 'Unknown Customer'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Transaction Details */}
                                <View style={[styles.card, { marginBottom: 16 }]}>
                                    <View style={styles.sectionHeader}>
                                        <FileText size={18} color="#64748b" />
                                        <Text style={styles.sectionTitle}>
                                            Transaction Details
                                        </Text>
                                    </View>

                                    <View>
                                        <View style={[styles.innerCard, { marginBottom: 12 }]}>
                                            <Text style={styles.fieldLabel}>Transaction ID</Text>
                                            <Text style={styles.monoText}>{creditSale.id}</Text>
                                        </View>

                                        <View style={[styles.innerCard, { marginBottom: 12 }]}>
                                            <Text style={styles.fieldLabel}>Date & Time</Text>
                                            <View style={styles.row}>
                                                <Calendar size={14} color="#64748b" />
                                                <Text style={[styles.fieldValueSmall, { marginLeft: 8 }]}>{formattedDate}</Text>
                                            </View>
                                        </View>

                                        {creditSale.vehicle_reg && (
                                            <View style={[styles.innerCard, { marginBottom: 12 }]}>
                                                <Text style={styles.fieldLabel}>Vehicle Registration</Text>
                                                <View style={styles.row}>
                                                    <Car size={14} color="#64748b" />
                                                    <Text style={[styles.fieldValueBold, { marginLeft: 8 }]}>
                                                        {creditSale.vehicle_reg}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {creditSale.notes && (
                                            <View style={styles.innerCard}>
                                                <Text style={[styles.fieldLabel, { marginBottom: 8 }]}>Notes</Text>
                                                <Text style={styles.notesText}>
                                                    {creditSale.notes}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Credit sale not found</Text>
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
    card: {
        backgroundColor: 'rgba(30,41,59,0.5)',
        borderRadius: 16,
        padding: 20,
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
    amountCard: {
        backgroundColor: 'rgba(16,185,129,0.1)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(16,185,129,0.3)',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountLabel: {
        color: '#34d399',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 8,
    },
    amountValue: {
        color: '#ffffff',
        fontSize: 34,
        fontWeight: 'bold',
        marginTop: 8,
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
    fieldLabel: {
        color: '#64748b',
        fontSize: 11,
        marginBottom: 4,
    },
    fieldValue: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    fieldValueSmall: {
        color: '#ffffff',
        fontSize: 14,
    },
    fieldValueBold: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    monoText: {
        color: '#ffffff',
        fontSize: 14,
        fontFamily: 'monospace',
    },
    notesText: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 20,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        color: '#94a3b8',
    },
});
