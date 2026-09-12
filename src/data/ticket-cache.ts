import { listPrintSeen } from '@/data/print-seen';
import type { Ticket } from '@/data/types';

let wallet: Ticket[] = [];
let printSeen = new Set<string>();

export function setWalletTickets(items: Ticket[]): Ticket[] {
  wallet = items.map((t) => ({
    ...t,
    printSeenByUserIds: printSeen.has(t.id) ? [t.userId] : [],
  }));
  return wallet;
}

export function getWalletTickets(): Ticket[] {
  return wallet;
}

export async function hydratePrintSeen(): Promise<void> {
  printSeen = new Set(await listPrintSeen());
}

export function rememberPrintSeen(ids: string[]): void {
  ids.forEach((id) => printSeen.add(id));
  wallet = wallet.map((t) =>
    ids.includes(t.id) ? { ...t, printSeenByUserIds: [t.userId] } : t
  );
}

export function pendingPrintTickets(userId: string): Ticket[] {
  return wallet.filter(
    (t) => t.userId === userId && t.status === 'valid' && t.token && !printSeen.has(t.id)
  );
}
