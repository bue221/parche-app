import { type Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Map, Search, Ticket, UserRound, Wrench } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Pressable, View } from 'react-native';

import { BrandLockup } from '@/components/brand-lockup';
import { ThemeToggle } from '@/components/theme-toggle';
import { Text } from '@/components/ui/text';
import { useAuthSnapshot, usePrimaryProfile, useTabVisibility } from '@/data/session';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export default function TabsLayout() {
  const tabs = useTabVisibility();

  return (
    <Tabs>
      <TabList asChild>
        <WebNav>
          <TabTrigger name="agenda" href="/" asChild>
            <NavLink icon={Search}>Explorar</NavLink>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <NavLink icon={Map}>Mapa</NavLink>
          </TabTrigger>
          <TabTrigger name="tickets" href={'/tickets' as Href} asChild>
            <NavLink icon={Ticket}>Guardados</NavLink>
          </TabTrigger>
          <TabTrigger name="parche" href={'/parche' as Href} asChild>
            <NavLink icon={UserRound}>Cuenta</NavLink>
          </TabTrigger>
          {tabs.operate ? (
            <TabTrigger name="operate" href={'/operate' as Href} asChild>
              <NavLink icon={Wrench} badge={tabs.operateBadge}>
                Operar
              </NavLink>
            </TabTrigger>
          ) : null}
        </WebNav>
      </TabList>
      <TabSlot style={{ flex: 1, height: '100%' }} />
    </Tabs>
  );
}

function NavLink({
  children,
  icon: Icon,
  isFocused,
  badge = 0,
  ...props
}: TabTriggerSlotProps & {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  badge?: number;
}) {
  const compact = useCompactLayout();
  const theme = useTheme();
  const color = isFocused ? theme.neon : theme.textMuted;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      className={cn('outline-none', compact && 'min-h-11 flex-1 items-center justify-center px-ds-4 py-ds-8')}>
      {compact ? (
        <View className="items-center gap-ds-4">
          <View className="relative">
            <Icon size={22} color={color} strokeWidth={isFocused ? 2.4 : 1.8} />
            {badge > 0 ? <View className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" /> : null}
          </View>
          <Text
            variant="caption"
            numberOfLines={2}
            className={cn('text-center font-normal normal-case', isFocused ? 'text-neon' : 'text-muted-foreground')}>
            {children}
          </Text>
        </View>
      ) : (
        <Text
          variant="caption"
          className={cn(
            'rounded-tags px-ds-16 py-ds-8 font-normal normal-case',
            isFocused ? 'bg-neon text-pitch-black' : 'text-muted-foreground'
          )}>
          {children}
        </Text>
      )}
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
        <View
          {...props}
          className="absolute bottom-0 w-full flex-row items-stretch border-t border-border bg-background px-ds-4 pb-ds-8 pt-ds-8">
          {children}
        </View>
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
