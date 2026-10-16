import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-buttons px-[22px] py-3 font-favorit text-caption font-bold tracking-favorit uppercase outline-none transition-[opacity,transform,background-color] duration-200 ease-parche focus-visible:ring-2 focus-visible:ring-aurora disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-glass hover:opacity-90",
        outline:
          "border border-border bg-transparent text-foreground hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        signal: "bg-aurora text-pitch-black hover:opacity-90",
        glass:
          "border border-border bg-glass text-foreground backdrop-blur-xl hover:bg-muted",
        link: "bg-transparent px-0 py-0 text-aurora normal-case tracking-normal",
      },
      size: {
        default: "",
        sm: "px-4 py-2",
        lg: "px-8 py-4",
        icon: "size-10 px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

type ButtonAsButton = ButtonVariantProps &
  Omit<ComponentProps<"button">, "className"> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonVariantProps &
  Omit<ComponentProps<typeof Link>, "className" | "href"> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

function Button({ className, variant, size, href, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    const isExternal = /^https?:\/\//i.test(href);
    return (
      <Link
        href={href}
        className={classes}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...(props as Omit<ButtonAsLink, "href" | "className" | "variant" | "size">)}
      />
    );
  }

  return (
    <button
      type="button"
      className={classes}
      {...(props as Omit<ButtonAsButton, "href" | "className" | "variant" | "size">)}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
