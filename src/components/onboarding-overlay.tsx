import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useOnboarding } from '@/data/onboarding-store';

const SLIDES = [
  {
    kicker: 'Agenda',
    title: 'Encuentra el parche',
    body: 'Fotos, mapa y el día. Toca y ves lineup y boleta.',
  },
  {
    kicker: 'Wallet',
    title: 'Tu entrada vive aquí',
    body: 'Compras, se imprime y la muestras en puerta. Si no vas, la cedes.',
  },
  {
    kicker: 'Operar',
    title: 'Puerta y equipo',
    body: 'Invitas staff y escaneas. La wallet del público no se mezcla.',
  },
] as const;

export function OnboardingOverlay() {
  const seen = useOnboarding((s) => s.seen);
  const hydrated = useOnboarding((s) => s.hydrated);
  const complete = useOnboarding((s) => s.complete);
  const [index, setIndex] = useState(0);
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'web' || !hydrated || seen) {
    return null;
  }

  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  return (
    <View className="absolute inset-0 z-[1500] bg-pitch-black" style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="flex-1 px-ds-24">
        <View className="flex-row items-center justify-between">
          <BrandMark size={40} onDark />
          <Pressable onPress={complete} hitSlop={12}>
            <Text variant="caption" className="font-bold uppercase text-paper-white">
              Saltar
            </Text>
          </Pressable>
        </View>
        <View className="mt-ds-32 h-48 items-center justify-center rounded-cards bg-charcoal">
          <Text variant="caption" className="uppercase text-paper-white/70">
            {slide.kicker}
          </Text>
        </View>
        <View className="flex-1 justify-center gap-ds-12">
          <Text className="font-foggy text-[40px] uppercase leading-none text-paper-white">{slide.title}</Text>
          <Text variant="lead" className="text-paper-white/80">
            {slide.body}
          </Text>
        </View>
        <View className="flex-row gap-ds-8 pb-ds-24">
          {SLIDES.map((item, i) => (
            <View key={item.title} className={i === index ? 'h-1 flex-1 bg-paper-white' : 'h-1 flex-1 bg-charcoal'} />
          ))}
        </View>
        <Button
          onPress={() => {
            if (last) {
              complete();
              return;
            }
            setIndex((value) => value + 1);
          }}>
          <Text>{last ? 'Entrar al parche' : 'Siguiente'}</Text>
        </Button>
      </View>
    </View>
  );
}
