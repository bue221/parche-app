import { cn } from '@/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';

const textVariants = cva(
  cn(
    'font-favorit text-foreground tracking-favorit',
    Platform.select({
      web: 'select-text font-feature-parche',
    })
  ),
  {
    variants: {
      variant: {
        default: 'text-body font-normal text-foreground',
        caption: 'text-caption font-normal text-foreground',
        bodySm: 'text-body-sm font-normal text-foreground',
        subheading: 'text-subheading font-normal text-foreground',
        headingSm: 'text-heading-sm font-bold text-foreground',
        heading: 'text-heading font-bold text-foreground',
        display: 'font-foggy text-display font-normal leading-none tracking-normal pt-1 text-foreground',
        h1: 'font-foggy text-display font-normal leading-none tracking-normal pt-1 text-foreground',
        h2: 'text-heading font-bold text-foreground',
        h3: 'text-heading-sm font-bold text-foreground',
        h4: 'text-subheading font-bold text-foreground',
        p: 'text-body font-normal text-foreground',
        blockquote: 'text-body text-muted-foreground',
        code: 'font-mono text-caption',
        lead: 'text-subheading text-muted-foreground font-normal',
        large: 'text-subheading font-bold',
        small: 'text-body-sm font-normal text-foreground',
        muted: 'text-body-sm text-muted-foreground font-normal',
        helper: 'text-caption text-stone font-quiet',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;
type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  heading: 'heading',
  headingSm: 'heading',
  display: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  display: '1',
  h2: '2',
  heading: '2',
  h3: '3',
  headingSm: '3',
  h4: '4',
};

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...props}
    />
  );
}

export { Text, TextClassContext };
