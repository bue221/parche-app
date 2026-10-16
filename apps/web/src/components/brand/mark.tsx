import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  inverted?: boolean;
};

function BrandMark({ className, inverted = false }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      role="img"
      aria-label="Parche"
      className={cn("size-10 rounded-images dark:invert", className)}
    >
      <rect
        width="1024"
        height="1024"
        fill={inverted ? "#ffffff" : "#000000"}
      />
      <text
        x="512"
        y="620"
        textAnchor="middle"
        fill={inverted ? "#000000" : "#ffffff"}
        fontFamily="var(--font-antonio), 'Arial Narrow', Impact, sans-serif"
        fontSize="620"
        fontWeight="700"
        letterSpacing="-24"
      >
        P
      </text>
      <text
        x="512"
        y="820"
        textAnchor="middle"
        fill={inverted ? "#000000" : "#ffffff"}
        fontFamily="var(--font-inter), ui-sans-serif, sans-serif"
        fontSize="72"
        fontWeight="700"
        letterSpacing="28"
      >
        PARCHE
      </text>
    </svg>
  );
}

export { BrandMark };
