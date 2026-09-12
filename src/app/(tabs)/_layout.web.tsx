import { type Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { Text } from '@/components/ui/text';
import { useTabVisibility } from '@/data/session';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export default function TabsLayout() {
  const tabs = useTabVisibility();

  return (
    <Tabs>
      <TabList asChild>
        <WebNav>
          <TabTrigger name="agenda" href="/" asChild>
            <NavLink>Agenda</NavLink>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <NavLink>Explorar</NavLink>
          </TabTrigger>
          {tabs.tickets ? (
            <TabTrigger name="tickets" href={'/tickets' as Href} asChild>
              <NavLink>Tiquetes</NavLink>
            </TabTrigger>
          ) : null}
          <TabTrigger name="parche" href={'/parche' as Href} asChild>
            <NavLink>Parche</NavLink>
          </TabTrigger>
          {tabs.operate ? (
            <TabTrigger name="operate" href={'/operate' as Href} asChild>
              <NavLink>Operar</NavLink>
            </TabTrigger>
          ) : null}
        </WebNav>
      </TabList>
      <TabSlot style={{ flex: 1, height: '100%' }} />
    </Tabs>
  );
}

function NavLink({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const compact = useCompactLayout();
  return (
    <Pressable {...props} className={cn('outline-none', compact && 'min-h-11 flex-1 items-center justify-center')}>
      <Text
        variant="caption"
        className={cn(
          'font-bold uppercase',
          compact ? 'px-ds-4 py-ds-8' : 'rounded-tags px-ds-16 py-ds-8',
          isFocused ? (compact ? 'text-foreground' : 'bg-primary text-primary-foreground') : 'text-muted-foreground'
        )}>
        {children}
      </Text>
    </Pressable>
  );
}

function WebNav({ children, ...props }: TabListProps) {
  const compact = useCompactLayout();

  if (compact) {
    return (
      <View pointerEvents="box-none" className="absolute inset-0 z-50">
        <View className="absolute top-0 w-full flex-row items-center gap-ds-8 border-b border-border bg-background px-ds-16 py-ds-8">
          <BrandMark size={28} />
          <Text variant="caption" className="font-bold uppercase">
            Parche
          </Text>
          <View className="ml-auto flex-row items-center">
            <ThemeToggle />
          </View>
        </View>
        <View {...props} className="absolute bottom-0 w-full flex-row items-stretch border-t border-border bg-background px-ds-4 pb-ds-8 pt-ds-4">
          {children}
        </View>
      </View>
    );
  }

  return (
    <View className="absolute top-0 z-50 w-full border-b border-border bg-background" {...props}>
      <View className="mx-auto w-full flex-row items-center gap-ds-8 px-ds-40 py-ds-12">
        <View className="flex-row items-center gap-ds-8" style={{ marginRight: 'auto' }}>
          <BrandMark size={32} />
          <Text variant="caption" className="font-bold uppercase">
            Parche
          </Text>
        </View>
        <View className="min-w-0 flex-1 flex-row items-center justify-end gap-ds-4">
          {children}
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
