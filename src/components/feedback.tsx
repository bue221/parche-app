import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  lead,
  actionLabel,
  onAction,
}: {
  title: string;
  lead?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="items-start gap-ds-12 rounded-cards bg-muted px-ds-24 py-ds-32">
      <Text variant="headingSm">{title}</Text>
      {lead ? <Text variant="muted">{lead}</Text> : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <View className={cn('rounded-cards bg-muted', className)} />;
}

export function ListingSkeleton() {
  return (
    <View>
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-ds-8 h-4 w-2/3" />
      <Skeleton className="mt-ds-4 h-3 w-1/2" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="gap-ds-16 rounded-cards border border-foreground bg-muted px-ds-24 py-ds-24">
      <Text>{message}</Text>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry}>
          <Text>Reintentar</Text>
        </Button>
      ) : null}
    </View>
  );
}

export function PendingAuth() {
  return (
    <Screen>
      <BackBar />
      <Skeleton className="h-8 w-40" />
      <ListingSkeleton />
    </Screen>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Screen>
      <BackBar />
      <ErrorState message={message} onRetry={onRetry} />
    </Screen>
  );
}
