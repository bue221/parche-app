import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Chip, ChipWrap } from '@/components/chip-row';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const AURORA = '#B8A4FF';

type TemporalKind = 'date' | 'datetime';

type TemporalFieldProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  helper?: string;
};

export function DateField({ label, value, onChange, error, helper }: TemporalFieldProps) {
  return (
    <TemporalField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helper={helper}
      kind="date"
    />
  );
}

export function DateTimeField({ label, value, onChange, error, helper }: TemporalFieldProps) {
  return (
    <TemporalField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helper={helper}
      kind="datetime"
    />
  );
}

function TemporalField({ label, value, onChange, error, helper, kind }: TemporalFieldProps & { kind: TemporalKind }) {
  if (Platform.OS === 'web') {
    return (
      <WebTemporalField
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        helper={helper}
        kind={kind}
      />
    );
  }

  return (
    <NativeTemporalField
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helper={helper}
      kind={kind}
    />
  );
}

function FieldChrome({
  label,
  display,
  emptyLabel,
  error,
  helper,
  open,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  display: string | null;
  emptyLabel: string;
  error?: string;
  helper?: string;
  open: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className={cn(
          'min-h-11 justify-center rounded-cards border bg-surface px-ds-16 py-ds-12',
          open ? 'border-aurora' : error ? 'border-danger' : 'border-border',
          Platform.select({
            web: 'outline-none transition-colors hover:border-aurora',
          })
        )}>
        <Text className={display ? 'text-foreground' : 'text-muted-foreground'}>
          {display ?? emptyLabel}
        </Text>
      </Pressable>
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

function WebTemporalField({ label, value, onChange, error, helper, kind }: TemporalFieldProps & { kind: TemporalKind }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const inputType = kind === 'date' ? 'date' : 'datetime-local';
  const display = formatTemporalDisplay(value, kind);
  const emptyLabel = kind === 'date' ? 'Elige fecha' : 'Elige fecha y hora';

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    setOpen(true);
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      /* fall through to click */
    }
    input.click();
  }

  return (
    <View className="relative gap-ds-8">
      <FieldChrome
        label={label}
        display={display}
        emptyLabel={emptyLabel}
        error={error}
        helper={helper}
        open={open}
        onPress={openPicker}
        accessibilityLabel={`${label}. ${display ?? emptyLabel}`}
      />
      <input
        ref={inputRef}
        type={inputType}
        value={value}
        tabIndex={-1}
        aria-hidden
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
          border: 0,
          padding: 0,
          margin: 0,
        }}
      />
    </View>
  );
}

function NativeTemporalField({
  label,
  value,
  onChange,
  error,
  helper,
  kind,
}: TemporalFieldProps & { kind: TemporalKind }) {
  const scheme = useResolvedColorScheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseTemporalValue(value, kind) ?? new Date());
  const [sheetStep, setSheetStep] = useState<'date' | 'time'>('date');

  const display = formatTemporalDisplay(value, kind);
  const emptyLabel = kind === 'date' ? 'Elige fecha' : 'Elige fecha y hora';
  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    const years = [base, base + 1, base + 2];
    const selected = draft.getFullYear();
    if (!years.includes(selected)) {
      years.push(selected);
      years.sort((a, b) => a - b);
    }
    return years;
  }, [draft]);

  function openPicker() {
    const next = parseTemporalValue(value, kind) ?? new Date();
    setDraft(next);
    setSheetStep('date');
    setSheetOpen(true);
  }

  function commit(next: Date) {
    onChange(serializeTemporalValue(next, kind));
  }

  function closeSheet(commitDraft: boolean) {
    if (commitDraft) commit(draft);
    setSheetOpen(false);
    setSheetStep('date');
  }

  function confirmDateStep() {
    if (kind === 'date') {
      closeSheet(true);
      return;
    }
    setSheetStep('time');
  }

  return (
    <View className="gap-ds-8">
      <FieldChrome
        label={label}
        display={display}
        emptyLabel={emptyLabel}
        error={error}
        helper={helper}
        open={sheetOpen}
        onPress={openPicker}
        accessibilityLabel={`${label}. ${display ?? emptyLabel}`}
      />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => closeSheet(false)}
        title={
          sheetStep === 'time' ? 'Hora' : kind === 'date' ? 'Fecha' : 'Fecha y hora'
        }>
        <View className="gap-ds-16 pb-ds-8">
          {sheetStep === 'date' ? (
            <>
              <View className="gap-ds-8">
                <Text variant="caption" className="uppercase">
                  Año
                </Text>
                <ChipWrap>
                  {yearOptions.map((year) => (
                    <Chip
                      key={year}
                      label={String(year)}
                      selected={draft.getFullYear() === year}
                      onPress={() => {
                        const next = new Date(draft);
                        next.setFullYear(year);
                        setDraft(next);
                      }}
                    />
                  ))}
                </ChipWrap>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                presentation="inline"
                locale="es_CO"
                accentColor={AURORA}
                themeVariant={scheme}
                onValueChange={(_event, selected) => setDraft(selected)}
                style={{ alignSelf: 'stretch', minHeight: 320 }}
              />
              <Button onPress={confirmDateStep}>
                <Text>{kind === 'date' ? 'Listo' : 'Siguiente'}</Text>
              </Button>
            </>
          ) : (
            <>
              <DateTimePicker
                value={draft}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                presentation="inline"
                is24Hour
                locale="es_CO"
                accentColor={AURORA}
                themeVariant={scheme}
                onValueChange={(_event, selected) => {
                  const merged = new Date(draft);
                  merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                  setDraft(merged);
                }}
                style={{ alignSelf: 'stretch', minHeight: 180 }}
              />
              <View className="gap-ds-8">
                <Button onPress={() => closeSheet(true)}>
                  <Text>Listo</Text>
                </Button>
                <Button variant="outline" onPress={() => setSheetStep('date')}>
                  <Text>Volver a fecha</Text>
                </Button>
              </View>
            </>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

function formatTemporalDisplay(value: string, kind: TemporalKind): string | null {
  if (!value) return null;
  const date = parseTemporalValue(value, kind);
  if (!date) return null;
  if (kind === 'date') {
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return date.toLocaleString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseTemporalValue(value: string, kind: TemporalKind): Date | null {
  if (!value) return null;
  if (kind === 'date') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      const fallback = new Date(value);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeTemporalValue(date: Date, kind: TemporalKind): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (kind === 'date') return ymd;
  return `${ymd}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
