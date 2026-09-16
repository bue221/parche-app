import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType, ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const textVariants = cva("font-favorit", {
  variants: {
    variant: {
      default: "text-body font-normal tracking-normal text-foreground",
      caption:
        "text-caption font-bold tracking-favorit uppercase text-foreground",
      bodySm: "text-body-sm font-normal tracking-normal text-foreground",
      subheading: "text-subheading font-bold tracking-tight text-foreground",
      headingSm: "text-heading-sm font-bold tracking-tight text-foreground",
      heading: "text-heading font-bold tracking-tight text-foreground",
      display:
        "font-favorit text-display font-bold tracking-tight text-foreground",
      lead: "text-body font-normal tracking-normal text-muted-foreground",
      muted: "text-body-sm font-normal tracking-normal text-muted-foreground",
      helper: "text-caption font-quiet tracking-normal normal-case text-stone",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const DEFAULT_TAG: Record<
  NonNullable<VariantProps<typeof textVariants>["variant"]>,
  ElementType
> = {
  default: "p",
  caption: "span",
  bodySm: "p",
  subheading: "p",
  headingSm: "h3",
  heading: "h2",
  display: "h1",
  lead: "p",
  muted: "p",
  helper: "span",
};

type TextOwnProps = VariantProps<typeof textVariants> & {
  className?: string;
};

type TextProps<T extends ElementType> = TextOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof TextOwnProps | "as">;

function Text<T extends ElementType = "p">({
  as,
  className,
  variant = "default",
  ...props
}: TextProps<T>) {
  const Comp = as ?? DEFAULT_TAG[variant ?? "default"];
  return (
    <Comp
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Text, textVariants };
export type { TextProps };
