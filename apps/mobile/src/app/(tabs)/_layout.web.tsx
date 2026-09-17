import { type Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Map, Search, Ticket, UserRound, Wrench } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { BrandLockup } from '@/components/brand-lockup';
import { TabBar, TabBarItem } from '@/components/tab-bar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Text } from '@/components/ui/text';
import { useAuthSnapshot, usePrimaryProfile, useTabVisibility } from '@/data/session';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export default function TabsLayout() {
  const tabs = useTabVisibility();

  return (
    <Tabs>
      <TabList asChild>
        <WebNav>
          <TabTrigger name="agenda" href="/" asChild>
            <TabLink icon={Search}>Explorar</TabLink>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabLink icon={Map}>Mapa</TabLink>
          </TabTrigger>
          <TabTrigger name="tickets" href={'/tickets' as Href} asChild>
            <TabLink icon={Ticket}>Guardados</TabLink>
          </TabTrigger>
          <TabTrigger name="parche" href={'/parche' as Href} asChild>
            <TabLink icon={UserRound}>Cuenta</TabLink>
          </TabTrigger>
          {tabs.operate ? (
            <TabTrigger name="operate" href={'/operate' as Href} asChild>
              <TabLink icon={Wrench} badge={tabs.operateBadge}>
                Operar
              </TabLink>
            </TabTrigger>
          ) : null}
        </WebNav>
      </TabList>
      <TabSlot style={{ flex: 1, height: '100%' }} />
    </Tabs>
  );
}

function TabLink({
  icon,
  ...props
}: TabTriggerSlotProps & {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;
  badge?: number;
}) {
  const compact = useCompactLayout();
  if (compact) {
    return <TabBarItem icon={icon} {...props} />;
  }
  return <NavChip {...props} />;
}

function NavChip({
  children,
  isFocused,
  badge = 0,
  ...props
}: TabTriggerSlotProps & { badge?: number }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      className="relative outline-none">
      <Text
        variant="caption"
        className={cn(
          'rounded-tags px-ds-16 py-ds-8 font-normal normal-case tracking-normal',
          isFocused ? 'bg-aurora text-pitch-black' : 'text-muted-foreground'
        )}>
        {children}
      </Text>
      {badge > 0 ? <View className="absolute right-1 top-1 size-2 rounded-full bg-danger" /> : null}
    </Pressable>
  );
}

function WebNav({ children, ...props }: TabListProps) {
  const compact = useCompactLayout();
  const { isLoggedIn } = useAuthSnapshot();
  const { primary } = usePrimaryProfile();
  const profile = isLoggedIn ? primary : undefined;

  if (compact) {
    return (
      <View pointerEvents="box-none" className="absolute inset-0 z-50">
        <View className="absolute top-0 w-full flex-row items-center gap-ds-8 border-b border-border bg-background px-ds-16 py-ds-8">
          <BrandLockup size={28} profile={profile} />
          <View className="ml-auto flex-row items-center">
            <ThemeToggle />
          </View>
        </View>
        <TabBar {...props}>{children}</TabBar>
      </View>
    );
  }

  return (
    <View className="absolute top-0 z-50 w-full border-b border-border bg-background" {...props}>
      <View className="mx-auto w-full flex-row items-center gap-ds-8 px-ds-40 py-ds-12">
        <View style={{ marginRight: 'auto' }}>
          <BrandLockup size={32} profile={profile} />
        </View>
        <View className="min-w-0 flex-1 flex-row items-center justify-end gap-ds-4">
          {children}
          <ThemeToggle />
        </View>
      </View>
    </View>
  );
}
