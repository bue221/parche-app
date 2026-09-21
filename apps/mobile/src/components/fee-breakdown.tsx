import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatMoney } from '@/lib/format';
import {
  PARCHE_COMMISSION_PERCENT,
  PARCHE_IVA_PERCENT,
  type ParcheFeeSplit,
} from '@/lib/parche-fee';

export function FeeBreakdown({
  split,
  currency,
  commissionPercent = PARCHE_COMMISSION_PERCENT,
  ivaPercent = PARCHE_IVA_PERCENT,
  mode = 'buyer',
}: {
  split: ParcheFeeSplit;
  currency?: string;
  commissionPercent?: number;
  ivaPercent?: number;
  mode?: 'buyer' | 'promoter';
}) {
  return (
    <View className="gap-ds-8">
      <FeeLine label="Boletas" value={formatMoney(split.amount, currency)} />
      <FeeLine label={`Comisión Parche ${commissionPercent}%`} value={formatMoney(split.commission, currency)} />
      <FeeLine label={`IVA ${ivaPercent}% sobre comisión`} value={formatMoney(split.iva, currency)} />
      {mode === 'promoter' ? (
        <>
          <FeeLine label="El comprador cubre" value={formatMoney(split.fee, currency)} />
          <FeeLine label="Te llega" value={formatMoney(split.net, currency)} strong />
        </>
      ) : (
        <FeeLine label="Total a pagar" value={formatMoney(split.charge, currency)} strong />
      )}
    </View>
  );
}

function FeeLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row items-baseline justify-between gap-ds-12">
      <Text variant="muted" className="min-w-0 flex-1">
        {label}
      </Text>
      <Text className={strong ? 'font-bold' : undefined}>{value}</Text>
    </View>
  );
}
