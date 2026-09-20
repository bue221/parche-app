/** FlatList with numColumns indexes by row, not by item. */
export function mapSheetRowIndex(itemIndex: number, itemCount: number, numColumns = 2) {
  if (itemIndex < 0 || itemIndex >= itemCount || numColumns < 1) return -1;
  const rowCount = Math.ceil(itemCount / numColumns);
  const row = Math.floor(itemIndex / numColumns);
  return row < rowCount ? row : -1;
}
