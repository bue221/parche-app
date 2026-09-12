import { Platform, TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const fieldClass =
  'rounded-cards border border-border bg-muted px-ds-16 py-ds-12 font-favorit text-body tracking-favorit text-foreground';

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return <TemporalField label={label} value={value} onChange={onChange} kind="date" />;
}

export function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return <TemporalField label={label} value={value} onChange={onChange} kind="datetime-local" />;
}

function TemporalField({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  kind: 'date' | 'datetime-local';
}) {
  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {label}
      </Text>
      {Platform.OS === 'web' ? (
        <input
          type={kind}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, 'min-h-11 outline-none')}
        />
      ) : (
        <TextInput
          className={cn(fieldClass, 'min-h-11')}
          placeholder={kind === 'date' ? 'AAAA-MM-DD' : 'AAAA-MM-DDTHH:mm'}
          value={value}
          onChangeText={onChange}
          autoCapitalize="none"
        />
      )}
    </View>
  );
}
