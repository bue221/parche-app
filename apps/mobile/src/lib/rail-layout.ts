const RAIL_GAP = 12;
const PHONE_TARGET = 168;
const DESKTOP_TARGET = 220;
const PHONE_MAX = 168;
const DESKTOP_MAX = 320;
const PHONE_PEEK = 40;
const DESKTOP_PEEK = 48;

/** How wide each rail card should be so the row shows 2+peek on phone and fills desktop. */
export function railCardWidth(contentWidth: number, bleed: number, compact = true) {
  const viewport = Math.max(contentWidth + bleed * 2, 1);
  const target = compact ? PHONE_TARGET : DESKTOP_TARGET;
  const peek = compact ? PHONE_PEEK : DESKTOP_PEEK;
  const max = compact ? PHONE_MAX : DESKTOP_MAX;
  const columns = Math.max(2, Math.floor((viewport - peek + RAIL_GAP) / (target + RAIL_GAP)));
  const raw = Math.round((viewport - RAIL_GAP * (columns - 1) - peek) / columns);
  return Math.min(max, Math.max(144, raw));
}

export { RAIL_GAP };
