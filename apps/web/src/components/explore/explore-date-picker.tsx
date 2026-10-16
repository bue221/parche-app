"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import {
  endOfDayISO,
  startOfDayISO,
  toDateInput,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

type ExploreDatePickerProps = {
  from?: string;
  to?: string;
  onApply: (range: { from?: string; to?: string }) => void;
  onClose: () => void;
};

function ExploreDatePicker({
  from,
  to,
  onApply,
  onClose,
}: ExploreDatePickerProps) {
  const initialFrom = toDateInput(from);
  const initialTo = toDateInput(to);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [cursor, setCursor] = useState(() => {
    const base = initialFrom ? new Date(`${initialFrom}T12:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const monthA = cursor;
  const monthB = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
    [cursor],
  );

  const pick = (isoDay: string) => {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(isoDay);
      setDraftTo("");
      return;
    }
    if (isoDay < draftFrom) {
      setDraftFrom(isoDay);
      setDraftTo("");
      return;
    }
    setDraftTo(isoDay);
  };

  const apply = () => {
    if (!draftFrom) {
      onApply({ from: undefined, to: undefined });
      onClose();
      return;
    }
    const start = startOfDayISO(new Date(`${draftFrom}T12:00:00`));
    const endDay = draftTo || draftFrom;
    const end = endOfDayISO(new Date(`${endDay}T12:00:00`));
    onApply({ from: start, to: end });
    onClose();
  };

  const clear = () => {
    setDraftFrom("");
    setDraftTo("");
    onApply({ from: undefined, to: undefined });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-label="Elegir fechas"
      className="w-[min(100vw-2rem,40rem)] rounded-3xl border border-border bg-background p-ds-16 shadow-card sm:p-ds-24"
    >
      <div className="mb-ds-16 flex items-center justify-between gap-ds-12">
        <p className="font-favorit text-body-sm font-bold text-foreground">
          Fechas
        </p>
        <div className="flex items-center gap-ds-4">
          <button
            type="button"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
            className="inline-flex size-9 items-center justify-center rounded-full border border-border outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
            className="inline-flex size-9 items-center justify-center rounded-full border border-border outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid gap-ds-24 sm:grid-cols-2">
        <MonthGrid
          month={monthA}
          from={draftFrom}
          to={draftTo}
          onPick={pick}
        />
        <MonthGrid
          month={monthB}
          from={draftFrom}
          to={draftTo}
          onPick={pick}
          className="hidden sm:block"
        />
      </div>

      <div className="mt-ds-20 flex items-center justify-between gap-ds-12 border-t border-border pt-ds-16">
        <button
          type="button"
          onClick={clear}
          className="font-favorit text-body-sm font-bold text-foreground underline outline-none focus-visible:ring-2 focus-visible:ring-aurora"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={apply}
          className="rounded-full bg-primary px-ds-20 py-ds-8 font-favorit text-caption font-bold tracking-favorit text-primary-foreground uppercase outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-aurora"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  from,
  to,
  onPick,
  className,
}: {
  month: Date;
  from: string;
  to: string;
  onPick: (isoDay: string) => void;
  className?: string;
}) {
  const title = month.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const today = toDateInput(new Date().toISOString());

  return (
    <div className={className}>
      <p className="mb-ds-12 text-center font-favorit text-body-sm font-bold capitalize text-foreground">
        {title}
      </p>
      <div className="mb-ds-8 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="text-center font-favorit text-[11px] font-bold tracking-favorit text-muted-foreground uppercase"
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} className="h-10" />;
          }
          const selected =
            cell === from ||
            cell === to ||
            (from && to && cell > from && cell < to);
          const isEdge = cell === from || cell === to;
          const isPast = cell < today;
          return (
            <button
              key={cell}
              type="button"
              disabled={isPast}
              onClick={() => onPick(cell)}
              className={cn(
                "flex h-10 items-center justify-center rounded-full font-favorit text-body-sm outline-none",
                "focus-visible:ring-2 focus-visible:ring-aurora",
                isPast && "cursor-not-allowed text-muted-foreground/40",
                !isPast && !selected && "hover:bg-muted",
                selected && !isEdge && "bg-muted text-foreground rounded-none",
                isEdge && "bg-foreground text-background",
              )}
            >
              {Number(cell.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildMonthCells(month: Date): (string | null)[] {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  // Monday-first: JS Sunday=0 → shift
  const startPad = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push(iso);
  }
  return cells;
}

export function formatDateRangeLabel(from?: string, to?: string): string {
  if (!from) return "Fechas";
  const a = new Date(from);
  const b = to ? new Date(to) : a;
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
  };
  const left = a.toLocaleDateString("es-CO", opts);
  const right = b.toLocaleDateString("es-CO", opts);
  if (toDateInput(from) === toDateInput(to ?? from)) return left;
  return `${left} – ${right}`;
}

export { ExploreDatePicker };
