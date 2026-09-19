import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { controlShadowStyle, controlTone } from '@/lib/control-chrome';
import { cn } from '@/lib/utils';

type SearchBarBase = {
  value?: string;
  placeholder?: string;
  /** 44px control. Use under a page title (Operar). Explorar keeps the default hero pill. */
  compact?: boolean;
};

type SearchBarPress = SearchBarBase & {
  onPress: () => void;
  onChangeText?: never;
};

type SearchBarInput = SearchBarBase & {
  onChangeText: (text: string) => void;
  onPress?: never;
};

export function SearchBar({
  value,
  placeholder = '¿Qué parche buscas?',
  compact = false,
  onPress,
  onChangeText,
}: SearchBarPress | SearchBarInput) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const tone = controlTone({ focused: Boolean(onChangeText) && focused });
  const label = value?.trim() ? value : placeholder;
  const iconSize = compact ? 14 : 16;

  const chrome = (
    <View
      className={cn(
        'w-full flex-row items-center rounded-buttons border bg-surface shadow-control',
        compact ? 'min-h-11 gap-ds-8 px-ds-12 py-ds-8' : 'min-h-12 gap-ds-12 px-ds-16 py-ds-12',
        tone === 'focus' ? 'border-aurora shadow-focus' : 'border-border',
        Platform.select({
          web: onChangeText
            ? 'transition-[border-color,box-shadow] duration-150'
            : 'transition-[border-color,box-shadow] duration-150 hover:border-aurora',
        })
      )}
      style={controlShadowStyle(tone)}>
      <View className={cn('items-center justify-center rounded-full bg-muted', compact ? 'size-7' : 'size-8')}>
        <Search size={iconSize} color={theme.textSecondary} strokeWidth={2.25} />
      </View>
      {onChangeText ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel={placeholder}
          className={cn(
            'min-w-0 flex-1 font-favorit text-body-sm tracking-normal text-foreground',
            compact ? 'min-h-7 py-0' : 'min-h-11'
          )}
          {...Platform.select({
            web: { outlineStyle: 'none', paddingTop: 0, paddingBottom: 0 } as object,
          })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <Text variant="bodySm" className={value?.trim() ? 'text-foreground' : 'text-muted-foreground'} numberOfLines={1}>
          {label}
        </Text>
      )}
      {onChangeText && value?.trim() ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={8}
          onPress={() => onChangeText('')}
          className={cn('items-center justify-center', compact ? 'size-9' : 'size-11')}>
          <X size={iconSize} color={theme.textSecondary} strokeWidth={2.25} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return <PressScale onPress={onPress}>{chrome}</PressScale>;
  }

  return chrome;
}
