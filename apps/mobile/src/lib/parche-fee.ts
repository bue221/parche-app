/** Comisión de Parche sobre la boleta. IVA colombiano va sobre esa comisión. El comprador paga ambos. */
export const PARCHE_COMMISSION_PERCENT = 10;
export const PARCHE_IVA_PERCENT = 19;

export type ParcheFeeSplit = {
  amount: number;
  commission: number;
  iva: number;
  fee: number;
  charge: number;
  net: number;
};

export function splitParcheFee(
  amount: number,
  commissionPercent: number = PARCHE_COMMISSION_PERCENT,
  ivaPercent: number = PARCHE_IVA_PERCENT
): ParcheFeeSplit {
  const safe = Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
  const commission = roundPercent(safe, commissionPercent);
  const iva = roundPercent(commission, ivaPercent);
  const fee = commission + iva;
  return { amount: safe, commission, iva, fee, charge: safe + fee, net: safe };
}

function roundPercent(amount: number, percent: number): number {
  if (amount <= 0 || percent <= 0) {
    return 0;
  }
  return Math.round((amount * percent) / 100);
}
