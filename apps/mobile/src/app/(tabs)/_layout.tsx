import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';
import { useTabVisibility } from '@/data/session';
import { useResolvedColorScheme } from '@/hooks/use-theme';

function iosPair(light: string, dark: string, fallback: string): ColorValue {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;
}

export default function TabsLayout() {
  const scheme = useResolvedColorScheme();
  const colors = Colors[scheme];
  const tabs = useTabVisibility();
  const tint = iosPair('#3DDCFF', '#3DDCFF', colors.neon);
  const muted = iosPair('#595959', '#808080', colors.textMuted);
  const screen = { backgroundColor: colors.background };

  return (
    <NativeTabs
      tintColor={tint}
      iconColor={{ default: muted, selected: tint }}
      indicatorColor={colors.backgroundElement}
      labelVisibilityMode="labeled"
      minimizeBehavior="automatic"
      labelStyle={{
        fontFamily: 'Inter',
        fontSize: 11,
        fontWeight: '400',
        color: muted,
        selected: { color: tint },
      }}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets contentStyle={screen}>
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'magnifyingglass', selected: 'magnifyingglass.circle.fill' }}
          md="search"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" disableAutomaticContentInsets contentStyle={screen}>
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          md="map"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tickets" disableAutomaticContentInsets contentStyle={screen}>
        <NativeTabs.Trigger.Label>Guardados</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'ticket', selected: 'ticket.fill' }}
          md="confirmation_number"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="parche" disableAutomaticContentInsets contentStyle={screen}>
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="person"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      {tabs.operate ? (
        <NativeTabs.Trigger name="operate" disableAutomaticContentInsets contentStyle={screen}>
          <NativeTabs.Trigger.Label>Operar</NativeTabs.Trigger.Label>
          {tabs.operateBadge > 0 ? <NativeTabs.Trigger.Badge>{String(tabs.operateBadge)}</NativeTabs.Trigger.Badge> : null}
          <NativeTabs.Trigger.Icon
            sf={{ default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' }}
            md="build"
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      ) : null}
    </NativeTabs>
  );
}
