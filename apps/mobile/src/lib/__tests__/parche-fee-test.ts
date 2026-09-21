import { splitParcheFee } from '@/lib/parche-fee';

describe('splitParcheFee', () => {
  test('buyer pays listed price plus 10% and IVA on that 10%', () => {
    expect(splitParcheFee(50_000)).toEqual({
      amount: 50_000,
      commission: 5_000,
      iva: 950,
      fee: 5_950,
      charge: 55_950,
      net: 50_000,
    });
  });

  test('scales with the sale', () => {
    expect(splitParcheFee(100_000).charge).toBe(111_900);
  });

  test('does not invent a cut on zero', () => {
    expect(splitParcheFee(0)).toEqual({
      amount: 0,
      commission: 0,
      iva: 0,
      fee: 0,
      charge: 0,
      net: 0,
    });
  });
});
