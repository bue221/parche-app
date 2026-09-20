"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "li" | "article";
};

function Reveal({
  children,
  className,
  delayMs = 0,
  as: Comp = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("reveal-in");
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Comp
      ref={(el: HTMLElement | null) => {
        ref.current = el;
      }}
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delayMs}ms` } as CSSProperties}
    >
      {children}
    </Comp>
  );
}

export { Reveal };
