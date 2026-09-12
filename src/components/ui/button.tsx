import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { Platform, Pressable } from 'react-native';

const buttonVariants = cva(
  cn(
    'group min-h-11 shrink-0 flex-row items-center justify-center gap-2 rounded-buttons px-[22px] py-3 shadow-none',
    Platform.select({
      web: 'whitespace-nowrap outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-foreground disabled:pointer-events-none',
    })
  ),
  {
    variants: {
      variant: {
        default: cn('bg-primary active:opacity-80', Platform.select({ web: 'hover:opacity-90' })),
        confirm: cn('bg-confirm active:opacity-80', Platform.select({ web: 'hover:opacity-90' })),
        outline: cn(
          'border border-foreground bg-transparent active:bg-muted',
          Platform.select({ web: 'hover:bg-muted' })
        ),
        secondary: cn('bg-secondary active:opacity-80', Platform.select({ web: 'hover:opacity-90' })),
        ghost: cn('bg-transparent active:bg-muted', Platform.select({ web: 'hover:bg-muted' })),
        link: 'min-h-0 bg-transparent px-0 py-0',
        destructive: cn(
          'border border-foreground bg-transparent active:bg-muted',
          Platform.select({ web: 'hover:bg-muted' })
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
        confirm: 'text-pitch-black',
        outline: 'text-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'text-foreground',
        link: 'text-foreground normal-case',
        destructive: 'text-foreground',
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

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(props.disabled && 'opacity-50', buttonVariants({ variant, size }), className)}
        role="button"
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
