import { eventDetailSheetLayout } from '@/lib/event-detail-layout';

describe('eventDetailSheetLayout', () => {
  test('the sheet docks at the chrome origin so the rounded cap sits flush under the actions', () => {
    const layout = eventDetailSheetLayout(400, 47);
    expect(layout.dockTop).toBe(47);
    expect(layout.sheetRest).toBe(368);
    expect(layout.spacer).toBe(321);
  });

  test('web without a notch still clears the circular chrome padding', () => {
    const layout = eventDetailSheetLayout(400, 0);
    expect(layout.dockTop).toBe(12);
    expect(layout.spacer).toBeGreaterThan(200);
  });

  test('a short flyer does not push the sheet above the chrome', () => {
    const layout = eventDetailSheetLayout(40, 47);
    expect(layout.sheetRest).toBe(layout.dockTop);
    expect(layout.spacer).toBe(0);
  });
});
