"use client";

import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const TICKET = {
  event: "Rumba 4AM",
  venue: "Club Horario",
  city: "Medellín",
  when: "Sáb 18 Sep",
  time: "23:00",
  door: "Puerta B",
  type: "General",
  code: "TCK-4AM-8821",
} as const;

const BARCODE = [
  3, 1, 2, 1, 1, 2, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1,
  1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 1, 1, 2,
] as const;

const HOLES = Array.from({ length: 13 }, (_, i) => i);

function TicketStub({ printing }: { printing: boolean }) {
  return (
    <article
      className={cn(
        "ticket-stub relative mx-auto w-[min(100%,18rem)] bg-paper-white text-pitch-black",
        printing && "is-printing",
      )}
      aria-label={`Ticket de ejemplo: ${TICKET.event}, ${TICKET.venue}, ${TICKET.city}`}
    >
      <div
        aria-hidden
        className="flex justify-between px-ds-8 pt-0"
      >
        {HOLES.map((hole) => (
          <span
            key={hole}
            className="size-2.5 shrink-0 -translate-y-1/2 rounded-full bg-muted"
          />
        ))}
      </div>

      <div className="flex flex-col gap-ds-16 px-ds-20 pt-ds-4 pb-ds-20">
        <div className="ticket-line flex items-start justify-between gap-ds-12">
          <span className="font-favorit text-caption font-bold tracking-favorit uppercase">
            Parche
          </span>
          <span className="font-favorit text-caption font-bold tracking-favorit text-stone uppercase">
            En vivo
          </span>
        </div>

        <div className="ticket-line relative">
          <p className="font-foggy text-[clamp(2.75rem,8vw,3.5rem)] leading-[0.83] uppercase">
            {TICKET.event}
          </p>
          <div
            aria-hidden
            className="ticket-stamp pointer-events-none absolute top-ds-12 -right-ds-4 -rotate-12 rounded-sm border-[3px] border-pitch-black bg-confirm px-ds-8 py-ds-4 font-favorit text-caption font-bold tracking-favorit text-pitch-black uppercase"
          >
            Confirmada
          </div>
        </div>

        <dl className="ticket-line grid grid-cols-2 gap-x-ds-12 gap-y-ds-12 font-favorit text-body-sm tracking-favorit">
          <div>
            <dt className="text-caption font-bold text-stone uppercase">
              Lugar
            </dt>
            <dd className="font-bold uppercase">{TICKET.venue}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-stone uppercase">
              Ciudad
            </dt>
            <dd className="font-bold uppercase">{TICKET.city}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-stone uppercase">
              Fecha
            </dt>
            <dd className="font-bold uppercase">{TICKET.when}</dd>
          </div>
          <div>
            <dt className="text-caption font-bold text-stone uppercase">
              Hora
            </dt>
            <dd className="font-bold uppercase">{TICKET.time}</dd>
          </div>
        </dl>

        <div className="ticket-line border-t border-dashed border-pitch-black/30 pt-ds-16">
          <div className="flex justify-between font-favorit text-caption font-bold tracking-favorit uppercase">
            <span>{TICKET.door}</span>
            <span>{TICKET.type}</span>
          </div>
        </div>

        <div className="ticket-line flex flex-col gap-ds-8">
          <div
            aria-hidden
            className="flex h-12 items-stretch justify-between gap-px"
          >
            {BARCODE.map((weight, index) => (
              <span
                key={index}
                className="ticket-bar origin-bottom bg-pitch-black"
                style={{
                  flex: weight,
                  animationDelay: `${1100 + index * 12}ms`,
                }}
              />
            ))}
          </div>
          <p className="text-center font-favorit text-caption font-bold tracking-favorit uppercase">
            {TICKET.code}
          </p>
        </div>
      </div>
    </article>
  );
}

function TicketPrinter() {
  const stageRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);
  const [printing, setPrinting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(0);

  function later(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }

  function startPrint() {
    setPrinting(true);
    setBusy(true);
    later(() => setBusy(false), 2200);
  }

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startPrint();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function reprint() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    setPrinting(false);
    setBusy(false);
    later(() => {
      setRun((value) => value + 1);
      startPrint();
    }, 40);
  }

  return (
    <div
      ref={stageRef}
      className="mx-auto w-full max-w-sm rounded-cards bg-muted px-ds-24 py-ds-32"
    >
      <div className="rounded-t-cards bg-pitch-black px-ds-16 py-ds-12 text-paper-white ring-1 ring-foreground">
        <div className="flex items-center justify-between font-favorit text-caption font-bold tracking-favorit uppercase">
          <span>Parche print</span>
          <span className="flex items-center gap-ds-8">
            <span
              className={cn(
                "size-2 rounded-full bg-confirm",
                busy && "animate-parche-blink",
              )}
            />
            {busy ? "Live" : "Listo"}
          </span>
        </div>
      </div>
      <div
        aria-hidden
        className="relative z-10 h-3 bg-pitch-black ring-1 ring-foreground"
      >
        <span className="absolute inset-x-ds-12 bottom-0 h-1.5 bg-charcoal" />
      </div>
      <div className="ticket-viewport relative overflow-hidden">
        <TicketStub key={run} printing={printing} />
      </div>
      <div className="mt-ds-16 flex justify-center motion-reduce:hidden">
        <Button variant="ghost" size="sm" onClick={reprint} disabled={busy}>
          Imprimir de nuevo
        </Button>
      </div>
    </div>
  );
}

function TicketDemo() {
  return (
    <Section id="ticket" aria-labelledby="ticket-heading">
      <Container>
        <div className="grid items-center gap-ds-48 lg:grid-cols-2">
          <Reveal>
            <Stack className="items-start gap-ds-8">
              <Tag>Tu ticket</Tag>
              <Text as="h2" id="ticket-heading" variant="heading">
                Así llega tu entrada
              </Text>
              <Text variant="lead" className="max-w-md">
                Confirmas que vas y Parche te deja el ticket listo: evento,
                hora y puerta. Lo llevas en el celular.
              </Text>
            </Stack>
          </Reveal>
          <TicketPrinter />
        </div>
      </Container>
    </Section>
  );
}

export { TicketDemo };
