import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
};

export function Field({ label, error, helper, className, multiline, onFocus, onBlur, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const theme = useTheme();

  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {label}
      </Text>
      <TextInput
        className={cn(
          'min-h-11 rounded-cards border bg-surface px-ds-16 py-ds-12 font-favorit text-body tracking-normal text-foreground',
          focused ? 'border-aurora' : error ? 'border-danger' : 'border-border',
          multiline && 'min-h-24 py-ds-16',
          Platform.select({
            web: 'outline-none transition-colors focus:border-aurora focus:bg-surface',
          }),
          className
        )}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error ? (
        <Text variant="helper" className="text-danger">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="helper">{helper}</Text>
      ) : null}
    </View>
  );
}
