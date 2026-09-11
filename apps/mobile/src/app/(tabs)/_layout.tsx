import { Slot } from 'expo-router';

/** Route group kept so older paths resolve; chrome lives in root tabs. */
export default function UnusedGroupLayout() {
  return <Slot />;
}
