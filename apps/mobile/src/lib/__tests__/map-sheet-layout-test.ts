import { mapSheetRowIndex } from '@/lib/map-sheet-layout';

describe('mapSheetRowIndex', () => {
  test('maps item indices to grid rows for a two-column list', () => {
    expect(mapSheetRowIndex(0, 12)).toBe(0);
    expect(mapSheetRowIndex(1, 12)).toBe(0);
    expect(mapSheetRowIndex(6, 12)).toBe(3);
    expect(mapSheetRowIndex(7, 12)).toBe(3);
    expect(mapSheetRowIndex(11, 12)).toBe(5);
  });

  test('rejects indices that would scroll past the last row', () => {
    expect(mapSheetRowIndex(7, 6)).toBe(-1);
    expect(mapSheetRowIndex(-1, 12)).toBe(-1);
    expect(mapSheetRowIndex(0, 0)).toBe(-1);
  });

  test('handles an odd last row', () => {
    expect(mapSheetRowIndex(10, 11)).toBe(5);
    expect(mapSheetRowIndex(11, 11)).toBe(-1);
  });
});
