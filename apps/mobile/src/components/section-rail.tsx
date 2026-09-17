import { Children, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const RAIL_GAP = 12;
const RAIL_PEEK = 40;

function railCardWidth(contentWidth: number) {
  const viewport = contentWidth + Spacing.three * 2;
  return Math.min(200, Math.max(144, Math.round((viewport - RAIL_GAP - RAIL_PEEK) / 2)));
}

export function SectionRail({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const cardWidth = width > 0 ? railCardWidth(width) : 168;

  return (
    <View
      className="gap-ds-16 overflow-visible"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}>
      <View className="flex-row items-center justify-between gap-ds-8">
        <Text variant="headingSm" className="min-w-0 flex-1" numberOfLines={2}>
          {title}
        </Text>
        {onSeeAll ? (
          <View className="size-11 shrink-0">
            <PressScale onPress={onSeeAll} accessibilityLabel={`Ver ${title}`}>
              <View className="size-11 items-center justify-center">
                <ChevronRight size={22} color={theme.text} strokeWidth={2} />
              </View>
            </PressScale>
          </View>
        ) : null}
      </View>
      <View style={{ marginHorizontal: -Spacing.three, overflow: 'visible' }}>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            gap: RAIL_GAP,
            paddingHorizontal: Spacing.three,
          }}>
          {Children.map(children, (child) => {
            if (child == null || typeof child === 'boolean') return child;
            return <View style={{ width: cardWidth }}>{child}</View>;
          })}
        </ScrollView>
      </View>
    </View>
  );
}
