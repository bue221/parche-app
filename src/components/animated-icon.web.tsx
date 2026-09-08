import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { useResolvedColorScheme } from '@/hooks/use-theme';

const DURATION = 300;

export function AnimatedSplashOverlay() {
  return null;
}

const logoKeyframe = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.1 }] },
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
  },
  mark: {
    width: 128,
    height: 128,
    borderRadius: 40,
  },
});
