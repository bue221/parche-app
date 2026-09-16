import { AuthSheet } from '@/components/auth-sheet';
import { useAuthSheet } from '@/data/auth-sheet-store';

export function AuthSheetHost() {
  const visible = useAuthSheet((s) => s.visible);
  const onSuccess = useAuthSheet((s) => s.onSuccess);
  const close = useAuthSheet((s) => s.close);

  return (
    <AuthSheet
      visible={visible}
      onClose={close}
      onSuccess={() => {
        onSuccess?.();
      }}
    />
  );
}
