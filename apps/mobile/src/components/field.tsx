import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Field({ label, error, className, ...props }: FieldProps) {
  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {label}
      </Text>
      <TextInput
        className={cn(
          'rounded-cards border border-border bg-background px-ds-16 py-ds-12 text-body text-foreground',
          className
        )}
        placeholderTextColor="#808080"
        {...props}
      />
      {error ? (
        <Text variant="helper" className="text-foreground">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
