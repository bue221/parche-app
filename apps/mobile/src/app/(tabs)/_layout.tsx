import { type Href } from 'expo-router';
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { Map, Search, Ticket, UserRound, Wrench } from 'lucide-react-native';

import { TabBar, TabBarItem } from '@/components/tab-bar';
import { useTabVisibility } from '@/data/session';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const tabs = useTabVisibility();
  const colors = useTheme();

  return (
    <Tabs>
      <TabSlot style={{ flex: 1, height: '100%', backgroundColor: colors.background }} />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabBarItem icon={Search}>Explorar</TabBarItem>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabBarItem icon={Map}>Mapa</TabBarItem>
          </TabTrigger>
          <TabTrigger name="tickets" href={'/tickets' as Href} asChild>
            <TabBarItem icon={Ticket}>Guardados</TabBarItem>
          </TabTrigger>
          <TabTrigger name="parche" href={'/parche' as Href} asChild>
            <TabBarItem icon={UserRound}>Cuenta</TabBarItem>
          </TabTrigger>
          {tabs.operate ? (
            <TabTrigger name="operate" href={'/operate' as Href} asChild>
              <TabBarItem icon={Wrench} badge={tabs.operateBadge}>
                Operar
              </TabBarItem>
            </TabTrigger>
          ) : null}
        </TabBar>
      </TabList>
    </Tabs>
  );
}
