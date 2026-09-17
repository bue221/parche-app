import { ChevronDown } from 'lucide-react-native';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Field, FieldLabel } from '@/components/field';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { controlShadowStyle, controlTone, fieldChromeClassName } from '@/lib/control-chrome';
import {
  DEFAULT_PHONE_COUNTRY,
  digitsOnly,
  filterPhoneCountries,
  flagEmoji,
  formatE164,
  parsePhone,
  phoneDigitHelper,
  validatePhone,
  type PhoneCountry,
} from '@/lib/phone';
import { cn } from '@/lib/utils';

export type PhoneFieldHandle = {
  /** Reveals the built-in error and returns whether the current value can be submitted. */
  validate: () => boolean;
};

export type PhoneFieldProps = {
  label?: string;
  value: string;
  onChange: (e164: string) => void;
  error?: string;
  helper?: string;
  required?: boolean;
  defaultCountry?: string;
};

export const PhoneField = forwardRef<PhoneFieldHandle, PhoneFieldProps>(function PhoneField(
  {
    label = 'Teléfono',
    value,
    onChange,
    error,
    helper,
    required = false,
    defaultCountry = DEFAULT_PHONE_COUNTRY,
  },
  ref
) {
  const theme = useTheme();
  const [iso2, setIso2] = useState(() => parsePhone(value, defaultCountry).country.iso2);
  const [focused, setFocused] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [revealError, setRevealError] = useState(false);

  const iso2Ref = useRef(iso2);
  iso2Ref.current = iso2;

  const parsed = parsePhone(value, iso2);
  const country = parsed.country;
  const national = parsed.national;
  const builtinError = validatePhone(value, { required });
  const visibleError = error ?? (revealError ? builtinError ?? undefined : undefined);
  const help = helper ?? phoneDigitHelper(country);
  const countries = useMemo(() => filterPhoneCountries(query), [query]);

  useEffect(() => {
    if (!value) return;
    const next = parsePhone(value, iso2Ref.current).country.iso2;
    if (next !== iso2Ref.current) setIso2(next);
  }, [value]);

  useImperativeHandle(ref, () => ({
    validate() {
      setRevealError(true);
      return validatePhone(value, { required }) === null;
    },
  }));

  function emit(nextCountry: PhoneCountry, nextNational: string) {
    const digits = digitsOnly(nextNational).slice(0, nextCountry.digitMax);
    onChange(formatE164(nextCountry, digits));
  }

  function onNationalChange(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
      const next = parsePhone(trimmed, country.iso2);
      setIso2(next.country.iso2);
      onChange(next.e164);
      return;
    }
    emit(country, text);
  }

  function selectCountry(next: PhoneCountry) {
    setIso2(next.iso2);
    setQuery('');
    emit(next, national);
    // Keep the overlay up through mouseup so the click cannot reopen the trigger underneath.
    setTimeout(() => setPickerOpen(false), 80);
  }

  const countryTone = controlTone({ focused: pickerOpen, error: Boolean(visibleError) });
  const nationalTone = controlTone({ focused, error: Boolean(visibleError) });

  return (
    <View className="gap-ds-8">
      <FieldLabel focused={focused || pickerOpen} error={Boolean(visibleError)}>
        {label}
      </FieldLabel>
      <View className="flex-row gap-ds-8">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`País. ${country.name} más ${country.dialCode}`}
          disabled={pickerOpen}
          onPress={() => {
            setQuery('');
            setPickerOpen(true);
          }}
          className={fieldChromeClassName(
            countryTone,
            'min-w-[7.5rem] shrink-0 flex-row items-center justify-between gap-ds-8 px-ds-12'
          )}
          style={controlShadowStyle(countryTone)}>
          <Text>
            {flagEmoji(country.iso2)} +{country.dialCode}
          </Text>
          <ChevronDown size={16} color={theme.textMuted} strokeWidth={2} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={national}
          onChangeText={onNationalChange}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setRevealError(true);
          }}
          keyboardType="number-pad"
          inputMode="numeric"
          autoComplete="tel"
          textContentType="telephoneNumber"
          autoCorrect={false}
          maxLength={country.digitMax}
          placeholderTextColor={theme.textMuted}
          className={fieldChromeClassName(nationalTone, 'flex-1')}
          style={controlShadowStyle(nationalTone)}
        />
      </View>
      {visibleError ? (
        <Text variant="helper" className="text-danger">
          {visibleError}
        </Text>
      ) : (
        <Text variant="helper">{help}</Text>
      )}

      <BottomSheet
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setQuery('');
        }}
        title="País">
        <View className="w-full max-w-xl gap-ds-12 self-center pb-ds-8">
          <Field label="Buscar" value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" />
          {countries.length === 0 ? (
            <Text variant="muted">No encontramos ese país.</Text>
          ) : (
            countries.map((item) => {
              const selected = item.iso2 === country.iso2;
              return (
                <PressScale key={item.iso2} onPress={() => selectCountry(item)}>
                  <View
                    className={cn(
                      'min-h-11 flex-row items-center gap-ds-12 rounded-cards px-ds-8 py-ds-12',
                      selected && 'bg-aurora-soft'
                    )}>
                    <Text className="w-10">{flagEmoji(item.iso2)}</Text>
                    <Text className="flex-1" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text variant="muted">+{item.dialCode}</Text>
                  </View>
                </PressScale>
              );
            })
          )}
        </View>
      </BottomSheet>
    </View>
  );
});
