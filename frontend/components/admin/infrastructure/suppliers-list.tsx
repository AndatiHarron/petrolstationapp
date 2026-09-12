import React, { useCallback, memo } from 'react';
import { Mail, Phone, Truck } from 'lucide-react-native';
import { useCreditorsIndex } from '@/features/api/creditor/creditor';
import type { SupplierResource, CreditorsIndex200 } from '@/features/api/model';
import { EntityCard, EntityList, Meta, MetaRow, type Tone } from './shell';

const AMOUNT = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

/** Owing money is the state worth flagging; settled is quiet. */
function balanceTone(balance: number): Tone {
    if (balance > 0) return 'warn';
    if (balance < 0) return 'danger';
    return 'success';
}

const SupplierCard = memo(function SupplierCard({
    supplier,
    onDelete,
    onEdit,
}: {
    supplier: SupplierResource;
    onDelete: (id: string) => void;
    onEdit: (supplier: SupplierResource) => void;
}) {
    const handleDelete = useCallback(() => onDelete(supplier.id), [supplier.id, onDelete]);
    const handleEdit = useCallback(() => onEdit(supplier), [supplier, onEdit]);

    return (
        <EntityCard
            Icon={Truck}
            title={supplier.name}
            badge={{
                label: `KES ${AMOUNT.format(Math.abs(supplier.current_balance))}`,
                tone: balanceTone(supplier.current_balance),
                mono: true,
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
        >
            {supplier.email || supplier.phone ? (
                <MetaRow>
                    {supplier.email ? <Meta Icon={Mail} text={supplier.email} /> : null}
                    {supplier.phone ? <Meta Icon={Phone} text={supplier.phone} /> : null}
                </MetaRow>
            ) : null}
        </EntityCard>
    );
});

interface SuppliersListProps {
    onAddSupplier?: () => void;
    onEditSupplier?: (supplier: SupplierResource) => void;
    onDeleteSupplier?: (id: string) => void;
}

export function SuppliersList({ onAddSupplier, onEditSupplier, onDeleteSupplier }: SuppliersListProps) {
    const { data: creditorsResponse, isLoading, refetch, isRefetching } = useCreditorsIndex();

    const handleDelete = useCallback((id: string) => onDeleteSupplier?.(id), [onDeleteSupplier]);
    const handleEdit = useCallback(
        (supplier: SupplierResource) => onEditSupplier?.(supplier),
        [onEditSupplier]
    );

    const renderItem = useCallback(
        (item: SupplierResource) => (
            <SupplierCard supplier={item} onDelete={handleDelete} onEdit={handleEdit} />
        ),
        [handleDelete, handleEdit]
    );

    const suppliers = (creditorsResponse as CreditorsIndex200 | undefined)?.data ?? [];

    return (
        <EntityList
            items={suppliers}
            isLoading={isLoading}
            isRefetching={isRefetching}
            onRefresh={refetch}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            noun="supplier"
            addLabel="Add supplier"
            onAdd={onAddSupplier}
            Icon={Truck}
            emptyTitle="No suppliers yet"
            emptyHint="Suppliers are who deliveries are bought from, on credit or cash."
        />
    );
}
