import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useResolvedColorScheme, useTheme } from '@/hooks/use-theme';

const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const theme = useTheme();
  const scheme = useResolvedColorScheme();

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: { transform: [{ scale: 1 }], opacity: 1 },
    70: { opacity: 0, easing: Easing.out(Easing.quad) },
    100: { opacity: 0, transform: [{ scale: 1 }] },
  });

  const mark =
    scheme === 'dark'
      ? require('@/assets/images/icon.png')
      : require('@/assets/images/icon-light.png');

  const image = <Image style={styles.image} source={mark} />;

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {image}
    </Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={[styles.splashOverlay, { backgroundColor: theme.background }]}>
      {image}
    </View>
  );
}

const logoKeyframe = new Keyframe({
  0: { transform: [{ scale: 1.15 }], opacity: 0 },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.quad) },
});

export function AnimatedIcon() {
  const scheme = useResolvedColorScheme();
  const mark =
    scheme === 'dark'
      ? require('@/assets/images/icon.png')
      : require('@/assets/images/icon-light.png');

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.mark} source={mark} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 128,
    height: 128,
    borderRadius: 40,
  },
  mark: {
    width: 128,
    height: 128,
    borderRadius: 40,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
