import { useState } from 'react';
import { Platform, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { controlShadowStyle, controlTone, fieldChromeClassName } from '@/lib/control-chrome';
import { cn } from '@/lib/utils';

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  helper?: string;
};

export function FieldLabel({
  children,
  focused = false,
  error = false,
}: {
  children: string;
  focused?: boolean;
  error?: boolean;
}) {
  return (
    <Text
      variant="caption"
      className={cn('uppercase', focused ? 'text-aurora' : error ? 'text-danger' : 'text-foreground')}>
      {children}
    </Text>
  );
}

export function Field({
  label,
  error,
  helper,
  className,
  multiline,
  onFocus,
  onBlur,
  style,
  editable,
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const locked = editable === false;
  const tone = controlTone({ focused: focused && !locked, error: Boolean(error) });

  return (
    <View className="gap-ds-8">
      <FieldLabel focused={focused && !locked} error={Boolean(error)}>
        {label}
      </FieldLabel>
      <TextInput
        className={fieldChromeClassName(
          tone,
          cn(multiline && 'min-h-24 py-ds-16', locked && 'bg-muted text-muted-foreground', className)
        )}
        style={[controlShadowStyle(tone), style]}
        placeholderTextColor={theme.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
        editable={!locked}
        selectTextOnFocus={!locked}
        onFocus={(event) => {
          if (locked) return;
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
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
