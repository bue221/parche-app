import { cva, type VariantProps } from "class-variance-authority";
import type { ElementType, ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const textVariants = cva("font-favorit tracking-favorit", {
  variants: {
    variant: {
      default: "text-body font-normal text-foreground",
      caption: "text-caption font-normal text-foreground",
      bodySm: "text-body-sm font-normal text-foreground",
      subheading: "text-subheading font-normal text-foreground",
      headingSm: "text-heading-sm font-bold text-foreground",
      heading: "text-heading font-bold text-foreground",
      display:
        "font-foggy text-display font-normal leading-[0.83] tracking-normal text-foreground",
      lead: "text-subheading font-normal text-muted-foreground",
      muted: "text-body-sm font-normal text-muted-foreground",
      helper: "text-caption font-quiet text-stone",
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
