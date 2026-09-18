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
    opacity: 0.55 * (1 - progress.value),
    transform: [{ scale: 1 + progress.value * 0.55 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute rounded-images border-2 border-aurora"
      style={[{ width: 72, height: 72 }, style]}
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
      withRepeat(withTiming(-5, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true)
    );
    return () => cancelAnimation(y);
  }, [reduce, y]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View className="size-[72px] items-center justify-center">
      {reduce ? null : (
        <>
          <MapPing delay={400} />
          <MapPing delay={1600} />
        </>
      )}
      <Animated.View
        className="z-10 size-[72px] items-center justify-center rounded-images bg-background"
        style={reduce ? undefined : style}>
        <BrandMark size={40} />
      </Animated.View>
    </View>
  );
}

export default function NotFoundScreen() {
  return (
    <Screen
      back
      headAlways
      headTitle="Página no encontrada"
      headDescription="El link se perdió o este parche ya no está.">
      <View
        className="w-full max-w-[420px] items-start gap-ds-16 rounded-cards bg-muted px-ds-24 py-ds-32"
        style={{ maxWidth: 420 }}>
        <FadeSlideIn>
          <LostMark />
        </FadeSlideIn>
        <FadeSlideIn index={1} className="w-full">
          <View className="gap-ds-12">
            <Text variant="caption" className="uppercase text-muted-foreground">
              Fuera de mapa
            </Text>
            <Text variant="headingSm">Esta página no está</Text>
            <Text variant="muted">El link se perdió o este parche ya no está.</Text>
          </View>
        </FadeSlideIn>
        <FadeSlideIn index={2}>
          <Button onPress={() => router.replace('/' as Href)}>
            <Text>Volver a Parche</Text>
          </Button>
        </FadeSlideIn>
      </View>
    </Screen>
  );
}
