import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function EmptyState({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="gap-ds-16 py-ds-32">
      <Text variant="muted">{title}</Text>
      {actionLabel && onAction ? (
        <Button onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="gap-ds-16 py-ds-24">
      <Text>{message}</Text>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry}>
          <Text>Reintentar</Text>
        </Button>
      ) : null}
    </View>
  );
}
