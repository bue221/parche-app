const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

export function code128Modules(text: string): number[] {
  const payload = text.replace(/[^\x20-\x7E]/g, ' ');
  const codes = [104];
  let checksum = 104;
  for (let i = 0; i < payload.length; i += 1) {
    const code = payload.charCodeAt(i) - 32;
    codes.push(code);
    checksum += code * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106);
  const modules: number[] = [];
  for (const code of codes) {
    const pattern = PATTERNS[code] ?? PATTERNS[0];
    for (const ch of pattern) {
      modules.push(Number(ch));
    }
  }
  return modules;
}

export function compactTicketCode(jti: string): string {
  return jti.replace(/-/g, '').toUpperCase();
}

export function ticketScanValue(ticket: { tokenJti?: string; token: string }): string {
  const compact = compactTicketCode(ticket.tokenJti ?? '');
  return compact.length === 32 ? compact : ticket.token;
}
