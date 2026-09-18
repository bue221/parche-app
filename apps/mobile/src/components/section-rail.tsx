import { Children, isValidElement, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { EmptyState } from '@/components/feedback';
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

function railItems(children: ReactNode) {
  return Children.toArray(children).filter((child) => child != null && typeof child !== 'boolean');
}

export function SectionRail({
  title,
  onSeeAll,
  children,
  empty,
}: {
  title: string;
  onSeeAll?: () => void;
  children?: ReactNode;
  empty?: { title: string; lead?: string };
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const cardWidth = width > 0 ? railCardWidth(width) : 168;
  const items = railItems(children);
  const showEmpty = items.length === 0 && empty;

  return (
    <View
      className="gap-ds-16 overflow-visible"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}>
      <View className="flex-row items-center justify-between gap-ds-8">
        <Text variant="subheading" className="min-w-0 flex-1" numberOfLines={2}>
          {title}
        </Text>
        {onSeeAll && !showEmpty ? (
          <View className="size-11 shrink-0">
            <PressScale onPress={onSeeAll} accessibilityLabel={`Ver ${title}`}>
              <View className="size-11 items-center justify-center">
                <ChevronRight size={22} color={theme.text} strokeWidth={2} />
              </View>
            </PressScale>
          </View>
        ) : null}
      </View>
      {showEmpty ? (
        <EmptyState compact title={empty.title} lead={empty.lead} />
      ) : (
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
            {items.map((child, index) => (
              <View
                key={isValidElement(child) && child.key != null ? child.key : index}
                style={{ width: cardWidth }}>
                {child}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
