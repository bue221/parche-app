import { TextClassContext } from '@/components/ui/text';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const buttonVariants = cva(
  cn(
    'group min-h-11 shrink-0 flex-row items-center justify-center gap-2 rounded-buttons px-[22px] py-3',
    Platform.select({
      web: 'whitespace-nowrap outline-none transition-[transform,box-shadow,opacity,background-color] duration-150 focus-visible:ring-2 focus-visible:ring-aurora focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        default: cn('bg-primary shadow-button active:opacity-90', Platform.select({ web: 'hover:opacity-95' })),
        signal: cn('bg-aurora shadow-signal active:opacity-90', Platform.select({ web: 'hover:opacity-95' })),
        confirm: cn('bg-confirm shadow-confirm active:opacity-90', Platform.select({ web: 'hover:opacity-95' })),
        outline: cn(
          'border border-border bg-surface shadow-control active:bg-muted',
          Platform.select({ web: 'hover:border-aurora hover:bg-muted' })
        ),
        secondary: cn(
          'bg-secondary shadow-control active:opacity-90',
          Platform.select({ web: 'hover:bg-muted' })
        ),
        ghost: cn('bg-transparent shadow-none active:bg-muted', Platform.select({ web: 'hover:bg-muted' })),
        glass: cn(
          'border border-border bg-glass shadow-control active:opacity-90',
          Platform.select({ web: 'hover:bg-muted backdrop-blur-xl' })
        ),
        link: 'min-h-0 bg-transparent px-0 py-0 shadow-none',
        destructive: cn(
          'border border-danger bg-danger-soft shadow-error active:opacity-90',
          Platform.select({ web: 'hover:opacity-95' })
        ),
      },
      size: {
        default: '',
        sm: 'min-h-10 px-4 py-2',
        lg: 'px-8 py-4',
        icon: 'size-11 px-0 py-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva(
  cn(
    'font-favorit text-caption font-bold uppercase tracking-favorit',
    Platform.select({ web: 'pointer-events-none' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        signal: '!text-pitch-black',
        confirm: '!text-pitch-black',
        outline: 'text-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'text-foreground',
        glass: 'text-foreground',
        link: 'text-aurora normal-case tracking-normal',
        destructive: '!text-pitch-black',
      },
      size: {
        default: '',
        sm: '',
        lg: '',
        icon: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const BUTTON_SHADOW: Record<NonNullable<VariantProps<typeof buttonVariants>['variant']>, ViewStyle> = {
  default: nativeButtonShadow('#0b0b12', 0.18, 12, 6),
  signal: nativeButtonShadow('#b8a4ff', 0.5, 14, 6),
  confirm: nativeButtonShadow('#7ffeb1', 0.4, 14, 6),
  outline: nativeButtonShadow('#0b0b12', 0.1, 10, 4),
  secondary: nativeButtonShadow('#0b0b12', 0.1, 10, 4),
  ghost: {},
  glass: nativeButtonShadow('#0b0b12', 0.1, 10, 4),
  link: {},
  destructive: nativeButtonShadow('#ff4d3d', 0.32, 12, 4),
};

function nativeButtonShadow(color: string, opacity: number, radius: number, height: number): ViewStyle {
  if (Platform.OS === 'web') return {};
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: Math.max(2, Math.round(height / 2)),
  };
}

/** Children render inside an Animated.View, which rules out Pressable's render-prop form. */
type ButtonProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    children?: React.ReactNode;
  };

function Button({
  className,
  variant,
  size,
  disabled,
  style,
  onPressIn,
  onPressOut,
  children,
  ...props
}: ButtonProps) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tone = variant ?? 'default';

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        disabled={disabled}
        style={
          typeof style === 'function'
            ? (state) => [BUTTON_SHADOW[tone], style(state)]
            : [BUTTON_SHADOW[tone], style]
        }
        onPressIn={(event) => {
          if (!reduce && !disabled) scale.value = withTiming(0.98, { duration: 90 });
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          if (!reduce) scale.value = withTiming(1, { duration: 120 });
          onPressOut?.(event);
        }}
        {...props}>
        <Animated.View className="flex-row items-center justify-center gap-2" style={animatedStyle}>
          {children}
        </Animated.View>
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
