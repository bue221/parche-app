import { Children, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

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
  const cardWidth = width > 0 ? Math.min(280, Math.max(220, width * 0.72)) : 240;

  return (
    <View
      className="gap-ds-16"
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
        {Children.map(children, (child) => {
          if (child == null || typeof child === 'boolean') return child;
          return <View style={{ width: cardWidth }}>{child}</View>;
        })}
      </ScrollView>
    </View>
  );
}
