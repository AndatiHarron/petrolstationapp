import React, { useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, Cylinder, Fuel } from 'lucide-react-native';
import { useTanksIndex } from '../../../features/api/tank/tank';
import { useProductsIndex } from '../../../features/api/product/product';
import { useStationsIndex } from '../../../features/api/station/station';
import type { TanksIndex200, ProductsIndex200, StationsIndex200 } from '@/features/api/model';
import { Section, Stat } from './section';

type TabType = 'stations' | 'products' | 'tanks';

const ICONS: Record<TabType, typeof Building2> = {
    stations: Building2,
    products: Fuel,
    tanks: Cylinder,
};

/**
 * One count.
 *
 * Built on the dashboard's own Stat rather than a centred tile of its own, so
 * the label, figure and caption sit at the same sizes as every other figure on
 * the screen.
 */
function StatTile({
    id,
    title,
    value,
    subtitle,
    loading,
    onPress,
}: {
    id: TabType;
    title: string;
    value: string;
    subtitle: string;
    loading?: boolean;
    onPress: () => void;
}) {
    const Icon = ICONS[id];

    return (
        <Pressable
            onPress={onPress}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={`${value} ${title}`}
            // Equal thirds rather than a scrolling row: three counts fit a phone
            // and scrolling for the third was needless work.
            className="flex-1 gap-1.5 rounded-xl bg-surface-sunken px-3 py-3 active:opacity-70"
        >
            <View
                style={{ width: 26, height: 26, borderRadius: 9 }}
                className="items-center justify-center bg-brand-subtle"
            >
                <Icon size={13} color="#040273" />
            </View>

            {loading ? (
                <View className="h-5 w-8 rounded bg-surface-border" />
            ) : (
                <Stat label={title} value={value} caption={subtitle} />
            )}
        </Pressable>
    );
}

export function QuickStats({ index = 0 }: { index?: number }) {
    const router = useRouter();
    const { data: tanksResponse, isLoading: isTanksLoading } = useTanksIndex();
    const { data: productsResponse, isLoading: isProductsLoading } = useProductsIndex();
    const { data: stationsResponse, isLoading: isStationsLoading } = useStationsIndex();

    const isLoading = isTanksLoading || isProductsLoading || isStationsLoading;

    const tanks = (tanksResponse as TanksIndex200 | undefined)?.data ?? [];
    const products = (productsResponse as ProductsIndex200 | undefined)?.data ?? [];
    const stations = (stationsResponse as StationsIndex200 | undefined)?.data ?? [];

    const goToInfrastructure = useCallback(
        (tab: TabType) => {
            router.push({ pathname: '/admin/infrastructure', params: { tab } });
        },
        [router]
    );

    const stats: { id: TabType; title: string; value: string; subtitle: string }[] = [
        { id: 'stations', title: 'Stations', value: String(stations.length), subtitle: 'active' },
        { id: 'products', title: 'Products', value: String(products.length), subtitle: 'types' },
        { id: 'tanks', title: 'Tanks', value: String(tanks.length), subtitle: 'total' },
    ];

    return (
        <Section
            title="Infrastructure"
            subtitle="Tap to manage"
            actionLabel="Setup"
            onAction={() => router.push('/admin/infrastructure')}
            index={index}
        >
            <View className="flex-row gap-2">
                {stats.map((stat) => (
                    <StatTile
                        key={stat.id}
                        {...stat}
                        loading={isLoading}
                        onPress={() => goToInfrastructure(stat.id)}
                    />
                ))}
            </View>
        </Section>
    );
}
