import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export function EmptyState({
  title,
  lead,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  lead?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  const phone = useCompactLayout();
  const board = !phone && !compact;
  return (
    <View
      className={cn(
        'items-start rounded-cards bg-muted',
        compact ? 'w-full gap-ds-4 px-ds-24 py-ds-16' : 'gap-ds-12 px-ds-24 py-ds-32',
        board && 'min-h-[240px] justify-center px-ds-40 py-ds-48'
      )}>
      <Text variant={compact ? 'subheading' : board ? 'heading' : 'headingSm'}>{title}</Text>
      {lead ? <Text variant="muted" className={board ? 'max-w-xl' : undefined}>{lead}</Text> : null}
      {actionLabel && onAction ? (
        <Button onPress={onAction} className="self-start">
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
    <View className="w-full gap-ds-8">
      <Skeleton className="aspect-square w-full rounded-images" />
      <Skeleton className="h-4 w-[82%] rounded-full" />
      <Skeleton className="h-3 w-[64%] rounded-full" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="gap-ds-16 rounded-cards border border-danger bg-danger-soft px-ds-24 py-ds-24">
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
    <Screen back>
      <Skeleton className="h-8 w-40" />
      <ListingSkeleton />
    </Screen>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Screen back>
      <ErrorState message={message} onRetry={onRetry} />
    </Screen>
  );
}
