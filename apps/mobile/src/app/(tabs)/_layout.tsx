import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';
import { useTabVisibility } from '@/data/session';
import { useResolvedColorScheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const scheme = useResolvedColorScheme();
  const colors = Colors[scheme];
  const tabs = useTabVisibility();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        fontWeight: '700',
        selected: { color: colors.text },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map" md="map" renderingMode="template" />
      </NativeTabs.Trigger>
      {tabs.tickets ? (
        <NativeTabs.Trigger name="tickets">
          <NativeTabs.Trigger.Label>Tiquetes</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="ticket" md="confirmation_number" renderingMode="template" />
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="parche">
        <NativeTabs.Trigger.Label>Parche</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" renderingMode="template" />
      </NativeTabs.Trigger>
      {tabs.operate ? (
        <NativeTabs.Trigger name="operate">
          <NativeTabs.Trigger.Label>Operar</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver" md="build" renderingMode="template" />
        </NativeTabs.Trigger>
      ) : null}
    </NativeTabs>
  );
}
