import { railCardWidth } from '@/lib/rail-layout';

describe('railCardWidth', () => {
  test('phone keeps two compact cards plus a peek', () => {
    expect(railCardWidth(328, 16, true)).toBeGreaterThanOrEqual(144);
    expect(railCardWidth(328, 16, true)).toBeLessThanOrEqual(168);
  });

  test('desktop fills the row instead of leaving two tiny flyers', () => {
    const card = railCardWidth(1120, 40, false);
    const columns = Math.floor(1200 / card);
    expect(card).toBeGreaterThan(168);
    expect(columns).toBeGreaterThanOrEqual(4);
  });

  test('a split pane grows cards instead of leaving a hole', () => {
    const card = railCardWidth(760, 40, false);
    expect(card).toBeGreaterThan(240);
  });

  test('a narrow pane still returns a usable flyer size', () => {
    expect(railCardWidth(0, 16, true)).toBe(144);
  });
});
