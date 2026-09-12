import { Platform } from 'react-native';

const KEY = 'parche.print-seen';

async function read(): Promise<string[]> {
  if (Platform.OS === 'web') {
    try {
      const raw = globalThis.localStorage?.getItem(KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function write(ids: string[]): Promise<void> {
  const payload = JSON.stringify(ids);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(KEY, payload);
    return;
  }
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.setItem(KEY, payload);
}

export async function listPrintSeen(): Promise<string[]> {
  return read();
}

export async function markPrintSeen(ids: string[]): Promise<void> {
  const current = await read();
  await write([...new Set([...current, ...ids])]);
}

export async function isPrintSeen(id: string): Promise<boolean> {
  const current = await read();
  return current.includes(id);
}
