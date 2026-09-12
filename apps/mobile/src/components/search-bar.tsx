import { Search } from 'lucide-react-native';
import { View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export function SearchBar({
  value,
  placeholder = '¿Qué parche buscas?',
  onPress,
}: {
  value?: string;
  placeholder?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const label = value?.trim() ? value : placeholder;
  return (
    <PressScale onPress={onPress}>
      <View className="min-h-11 flex-row items-center gap-ds-12 rounded-buttons border border-border bg-muted px-ds-16 py-ds-12">
        <Search size={18} color={theme.textMuted} strokeWidth={2} />
        <Text variant="bodySm" className={value?.trim() ? 'text-foreground' : 'text-muted-foreground'} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressScale>
  );
}
