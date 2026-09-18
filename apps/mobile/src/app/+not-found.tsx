import { useEffect } from 'react';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BrandMark } from '@/components/brand-mark';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { cardShadowStyle } from '@/lib/card-shadow';

const MARK = 96;
const STAGE = 168;

function MapPing({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }), -1, false)
    );
    return () => cancelAnimation(progress);
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.75 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 0.72 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: MARK,
          height: MARK,
          borderRadius: 20,
          borderWidth: 2,
          borderColor: '#B8A4FF',
        },
        style,
      ]}
    />
  );
}

function LostMark() {
  const reduce = useReduceMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    y.value = withDelay(
      400,
      withRepeat(withTiming(-8, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
    return () => cancelAnimation(y);
  }, [reduce, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View className="items-center justify-center" style={{ width: STAGE, height: STAGE }}>
      <View style={{ width: MARK, height: MARK, position: 'relative' }}>
        {reduce ? null : (
          <>
            <MapPing delay={400} />
            <MapPing delay={1600} />
          </>
        )}
        <Animated.View style={reduce ? undefined : style}>
          <View
            className="items-center justify-center rounded-images bg-background"
            style={[{ width: MARK, height: MARK }, cardShadowStyle]}>
            <BrandMark size={52} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

export default function NotFoundScreen() {
  return (
    <Screen
      back
      scroll={false}
      headAlways
      headTitle="Página no encontrada"
      headDescription="El link se perdió o este parche ya no está.">
      <View className="min-h-0 flex-1 items-center justify-center">
        <FadeSlideIn className="w-full items-center">
          <View
            className="w-full max-w-[400px] items-center gap-ds-24 rounded-cards bg-muted px-ds-24 py-ds-40"
            style={{ maxWidth: 400, overflow: 'visible' }}>
            <LostMark />
            <View className="w-full items-center gap-ds-12">
              <Text variant="caption" className="text-center uppercase text-muted-foreground">
                Fuera de mapa
              </Text>
              <Text variant="heading" className="text-center">
                Esta página no está
              </Text>
              <Text variant="muted" className="text-center">
                El link se perdió o este parche ya no está.
              </Text>
            </View>
            <Button className="w-full" onPress={() => router.replace('/' as Href)}>
              <Text>Volver a Parche</Text>
            </Button>
          </View>
        </FadeSlideIn>
      </View>
    </Screen>
  );
}
