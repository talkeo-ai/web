"use client";

import {
  BarChart3,
  Home,
  Map,
  MessageCircle,
  PanelLeft,
  Search,
  Settings,
} from "lucide-react";
import { ViewTransition, useState } from "react";

import { OrbWidget } from "@/components/landing/orb-widget";
import { cn } from "@/lib/utils";

/**
 * The shell mockup (#120, round 2): a dark frame, a sidebar, and one rounded
 * panel with the orb at the top of it. Everything in it is placeholder.
 *
 * The measures are borrowed from an admin shell Joaquin pointed at: a 4px
 * margin around a 16px-radius panel, a sidebar of 220px that condenses to 60px,
 * rows 30px tall with a 12px radius, and the same curve for everything that
 * changes size.
 *
 * It arrives through a view transition from the landing (see `globals.css`):
 * the three named pieces here are what that transition moves.
 */

const EASE = "ease-[cubic-bezier(0.2,0.8,0,1)]";

const ITEMS = [
  { icon: Home, label: "Inicio", active: true },
  { icon: MessageCircle, label: "Práctica" },
  { icon: Map, label: "Mapa" },
  { icon: BarChart3, label: "Progreso" },
] as const;

export function ShellMock() {
  const [open, setOpen] = useState(true);

  return (
    <div
      data-slot="shell"
      className="relative flex h-dvh overflow-hidden bg-[#0a0a0a] text-[13px] leading-5"
    >
      {/* The glow at the foot of the frame, in the accent. */}
      <div
        aria-hidden
        className="from-accent-500/45 pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t to-transparent opacity-60 [mask-image:linear-gradient(90deg,black,transparent_45%)]"
      />

      <ViewTransition enter="shell-nav" default="none">
        <nav
          data-open={open}
          className={cn(
            "relative flex shrink-0 flex-col overflow-hidden pt-3.5 transition-[width] duration-250",
            EASE,
            open ? "w-[220px]" : "w-[60px]",
          )}
        >
          <div className="flex h-8 items-center justify-between pr-3 pl-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Talkeo" className="size-7 rounded-full" />
            <button
              type="button"
              aria-label={open ? "Contraer navegación" : "Expandir navegación"}
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#8c8c8c] transition-[opacity,background-color,color] duration-200 hover:bg-white/10 hover:text-white",
                // Condensed, the toggle sits over the logo and shows on hover,
                // so the rail keeps one column.
                !open && "absolute left-3.5 opacity-0 hover:bg-[#303030] hover:opacity-100 focus-visible:opacity-100",
              )}
            >
              <PanelLeft className="size-4" />
            </button>
          </div>

          <div className="mt-2.5 mb-2.5 px-3.5">
            <div className="flex h-9 items-center gap-2 overflow-hidden rounded-xl bg-[#303030] px-2.5 text-[#a6a6a6]">
              <Search className="size-4 shrink-0" />
              <Label open={open}>Buscar</Label>
            </div>
          </div>

          <ul className="flex flex-col px-3">
            {ITEMS.map(({ icon: Icon, label, ...item }) => {
              const active = "active" in item;
              return (
                <li key={label}>
                  <a
                    href="#"
                    onClick={(event) => event.preventDefault()}
                    className={cn(
                      "flex h-[30px] items-center gap-2.5 overflow-hidden rounded-xl pr-1 pl-2 font-[450] whitespace-nowrap transition-colors duration-150",
                      active
                        ? "bg-white/10 text-[#fcfcfc]"
                        : "text-[#dcdcdc] hover:bg-white/5",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-[#fcfcfc]" : "text-[#8c8c8c]",
                      )}
                    />
                    <Label open={open}>{label}</Label>
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="mt-auto px-3 pb-4">
            <a
              href="#"
              onClick={(event) => event.preventDefault()}
              className="flex h-[30px] items-center gap-2.5 overflow-hidden rounded-xl pr-1 pl-2 font-[450] whitespace-nowrap text-[#dcdcdc] hover:bg-white/5"
            >
              <Settings className="size-4 shrink-0 text-[#8c8c8c]" />
              <Label open={open}>Configuración</Label>
            </a>
          </div>
        </nav>
      </ViewTransition>

      <ViewTransition enter="shell-panel" default="none">
        <main className="bg-background relative m-1 ml-0 flex min-w-0 flex-1 flex-col items-center rounded-2xl">
          <ViewTransition name="talkeo-orb" share="shell-orb" default="none">
            <div className="bg-surface-secondary border-border shadow-raised relative mt-24 size-28 overflow-hidden rounded-full border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt=""
                className="absolute inset-[4.5%] h-[91%] w-[91%] rounded-full object-cover"
              />
              <div className="relative h-full w-full">
                <OrbWidget />
              </div>
            </div>
          </ViewTransition>
        </main>
      </ViewTransition>
    </div>
  );
}

/** A row's words: they fade and give their width back as the rail condenses. */
function Label({ open, children }: { open: boolean; children: string }) {
  return (
    <span
      className={cn(
        "transition-opacity duration-200",
        open ? "opacity-100" : "opacity-0",
      )}
    >
      {children}
    </span>
  );
}
