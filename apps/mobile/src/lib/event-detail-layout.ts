/** Compact event detail: fixed flyer + a surface sheet that docks under the chrome. */
export const EVENT_DETAIL_SHEET_OVERLAP = 32;

export function eventDetailSheetLayout(heroHeight: number, insetTop: number) {
  const dockTop = Math.max(insetTop, 12);
  const sheetRest = Math.max(heroHeight - EVENT_DETAIL_SHEET_OVERLAP, dockTop);
  const spacer = Math.max(sheetRest - dockTop, 0);
  return { dockTop, sheetRest, spacer };
}
