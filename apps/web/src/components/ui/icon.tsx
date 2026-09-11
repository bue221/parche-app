import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type IconProps = {
  as: LucideIcon;
  size?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"svg">, "as">;

function Icon({ as: IconComponent, className, size = 14, ...props }: IconProps) {
  return (
    <IconComponent
      aria-hidden
      className={cn("text-foreground", className)}
      size={size}
      strokeWidth={2}
      {...props}
    />
  );
}

export { Icon };
export type { IconProps };
