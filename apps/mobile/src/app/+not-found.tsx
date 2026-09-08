import { Link } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-ds-16 bg-background px-ds-24">
      <Text variant="heading" className="text-center">
        This page is not on the bill
      </Text>
      <Link href="/" className="rounded-buttons bg-primary px-[22px] py-3">
        <Text className="text-caption font-bold uppercase tracking-favorit text-primary-foreground">
          Back to Parche
        </Text>
      </Link>
    </View>
  );
}
