import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import {
  DAY,
  MOCK_ITEMS,
  clampView,
  describeSpan,
  getDomain,
  getTicks,
  type TimelineItem,
} from "@/lib/timeline";
import { EventDialog } from "./EventDialog";

const LANE_H = 52;
const TOP = 48;
const PRESETS: { label: string; days: number }[] = [
  { label: "Semana", days: 7 },
  { label: "Mês", days: 30 },
  { label: "Ano", days: 365 },
  { label: "10 anos", days: 3650 },
];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(1000);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(entries[0]?.contentRect.width ?? 1000));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type ItemDrag = { id: string; x: number; y: number; s: number; e: number; lane: number; moved: boolean };

export function Timeline() {
  const [items, setItems] = useState<TimelineItem[]>(MOCK_ITEMS);
  const domain = useMemo(() => getDomain(items), [items]);
  const domainRef = useRef(domain);
  domainRef.current = domain;
  const [view, setView] = useState<[number, number]>(domain);
  const viewRef = useRef(view);
  viewRef.current = view;
  const [mainRef, width] = useWidth<HTMLDivElement>();
  const [miniRef, miniW] = useWidth<HTMLDivElement>();
  const [editing, setEditing] = useState<{ item: TimelineItem; isNew: boolean } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // keep view inside domain when items change (but not mid-drag)
  useEffect(() => {
    if (draggingId) return;
    setView((v) => clampView(v[0], v[1], domain));
  }, [domain, draggingId]);

  const [start, end] = view;
  const span = end - start;
  const x = (t: number) => ((t - start) / span) * width;
  const set = (s: number, e: number) => setView(clampView(s, e, domainRef.current));

  const zoomAt = useCallback((factor: number, anchorPx: number, w: number) => {
    const [s, e] = viewRef.current;
    const sp = e - s;
    const anchorT = s + (anchorPx / w) * sp;
    const nsp = sp * factor;
    setView(clampView(anchorT - (anchorPx / w) * nsp, anchorT + (1 - anchorPx / w) * nsp, domainRef.current));
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
      const rect = el.getBoundingClientRect();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
        const dx = (e.shiftKey ? e.deltaY : e.deltaX) * mult;
        const [s, en] = viewRef.current;
        const dt = (dx / rect.width) * (en - s);
        setView(clampView(s + dt, en + dt, domainRef.current));
        return;
      }
      zoomAt(Math.exp(e.deltaY * mult * 0.002), e.clientX - rect.left, rect.width);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [mainRef, zoomAt]);

  // pan background
  const pan = useRef<{ x: number; s: number; e: number } | null>(null);
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pan.current = { x: e.clientX, s: start, e: end };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = pan.current;
    if (!d) return;
    const dt = ((e.clientX - d.x) / width) * (d.e - d.s);
    set(d.s - dt, d.e - dt);
  };
  const onUp = () => (pan.current = null);

  // drag items (horizontal = dates, vertical = lane); click opens editor
  const itemDrag = useRef<ItemDrag | null>(null);
  const onItemDown = (it: TimelineItem) => (e: RPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    itemDrag.current = { id: it.id, x: e.clientX, y: e.clientY, s: it.start, e: it.end, lane: it.lane, moved: false };
  };
  const onItemMove = (e: RPointerEvent<HTMLButtonElement>) => {
    const d = itemDrag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) {
      d.moved = true;
      setDraggingId(d.id);
    }
    const dt = Math.round(((dx / width) * span) / DAY) * DAY;
    const lane = Math.max(0, d.lane + Math.round(dy / LANE_H));
    setItems((all) => all.map((i) => (i.id === d.id ? { ...i, start: d.s + dt, end: d.e + dt, lane } : i)));
  };
  const onItemUp = (it: TimelineItem) => () => {
    const d = itemDrag.current;
    itemDrag.current = null;
    setDraggingId(null);
    if (d && !d.moved) setEditing({ item: it, isNew: false });
  };

  // minimap
  const [ds, de] = domain;
  const dspan = de - ds;
  const mx = (t: number) => ((t - ds) / dspan) * miniW;
  const miniDrag = useRef<{ mode: "move" | "l" | "r"; x: number; s: number; e: number } | null>(null);
  const onMiniDown = (mode: "move" | "l" | "r") => (e: RPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    miniDrag.current = { mode, x: e.clientX, s: start, e: end };
  };
  const onMiniMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = miniDrag.current;
    if (!d) return;
    const dt = ((e.clientX - d.x) / miniW) * dspan;
    if (d.mode === "move") set(d.s + dt, d.e + dt);
    else if (d.mode === "l") set(Math.min(d.s + dt, d.e - 3 * DAY), d.e);
    else set(d.s, Math.max(d.e + dt, d.s + 3 * DAY));
  };
  const onMiniTrackDown = (e: RPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ds + ((e.clientX - rect.left) / rect.width) * dspan;
    set(t - span / 2, t + span / 2);
  };

  const setPreset = (days: number) => {
    const c = start + span / 2;
    const sp = days * DAY;
    set(c - sp / 2, c + sp / 2);
  };

  const openNew = () => {
    const s = start + span * 0.1;
    const e = start + span * 0.4;
    const lane = items.length ? Math.max(...items.map((i) => i.lane)) + 1 : 0;
    setEditing({
      isNew: true,
      item: {
        id: crypto.randomUUID(),
        label: "",
        lane,
        start: Math.round(s / DAY) * DAY,
        end: Math.round(e / DAY) * DAY,
        color: items.length % 20,
      },
    });
  };

  const ticks = getTicks(start, end, width);
  const miniTicks = getTicks(ds, de, miniW, 56);
  const lanes = (items.length ? Math.max(...items.map((i) => i.lane)) + 1 : 0) + 1;
  const { range, size } = describeSpan(start, end);
  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <span className="font-mono text-[13px] text-foreground">{range}</span>
          <span className="text-[13px] text-muted-foreground">Janela de {size}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button key={p.label} className="tl-btn-ghost" onClick={() => setPreset(p.days)}>
              {p.label}
            </button>
          ))}
          <button className="tl-btn-ghost" onClick={() => setView(domain)}>
            <Maximize2 size={16} strokeWidth={1.5} /> Tudo
          </button>
          <span className="mx-1 h-6 w-px bg-border" />
          <button className="tl-btn-icon" aria-label="Diminuir zoom" onClick={() => zoomAt(1.5, width / 2, width)}>
            <Minus size={16} strokeWidth={1.5} />
          </button>
          <button className="tl-btn-icon" aria-label="Aumentar zoom" onClick={() => zoomAt(1 / 1.5, width / 2, width)}>
            <Plus size={16} strokeWidth={1.5} />
          </button>
          <button className="tl-btn-primary ml-2" onClick={openNew}>
            <Plus size={16} strokeWidth={1.5} /> Evento
          </button>
        </div>
      </div>

      <div className="tl-surface overflow-hidden">
        <div
          ref={mainRef}
          className="relative cursor-grab touch-none select-none active:cursor-grabbing"
          style={{ height: TOP + lanes * LANE_H + 8 }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {ticks.map((t) => (
            <div key={t.t} className="absolute top-0 bottom-0" style={{ left: x(t.t) }}>
              <div className="h-full w-px bg-border/70" />
              <span className="absolute top-4 left-2 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                {t.label}
              </span>
            </div>
          ))}
          {now > start && now < end && (
            <div className="absolute top-10 bottom-0 w-px bg-foreground/40" style={{ left: x(now) }}>
              <span className="absolute -top-1 left-1 text-[11px] font-medium tracking-[0.08em] text-foreground uppercase">
                Hoje
              </span>
            </div>
          )}
          {items.map((it) => {
            const l = x(it.start);
            const r = x(it.end);
            if (r < 0 || l > width) return null;
            const vl = Math.max(l, 0);
            const vr = Math.min(r, width);
            const textW = it.label.length * 7 + 12;
            return (
              <button
                key={it.id}
                aria-label={it.label}
                onPointerDown={onItemDown(it)}
                onPointerMove={onItemMove}
                onPointerUp={onItemUp(it)}
                data-dragging={draggingId === it.id}
                className="tl-item"
                style={{
                  left: l + 2,
                  width: Math.max(r - l - 4, 4),
                  top: TOP + it.lane * LANE_H,
                  background: `var(--ev-${it.color})`,
                }}
              >
                {vr - vl - 4 >= textW && (
                  <span
                    className="absolute top-0 flex h-full items-center justify-center overflow-hidden px-2 whitespace-nowrap"
                    style={{ left: vl - l, width: vr - vl - 4 }}
                  >
                    {it.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Visão geral — arraste a janela ou as bordas
        </span>
        <div
          ref={miniRef}
          className="tl-surface relative h-20 touch-none overflow-hidden select-none"
          onPointerDown={onMiniTrackDown}
          onPointerMove={onMiniMove}
          onPointerUp={() => (miniDrag.current = null)}
        >
          {miniTicks.map((t) => (
            <span
              key={t.t}
              className="absolute bottom-1 font-mono text-[11px] text-muted-foreground"
              style={{ left: mx(t.t) + 4 }}
            >
              {t.label}
            </span>
          ))}
          {items.map((it) => (
            <div
              key={it.id}
              className="absolute h-1 rounded-full"
              style={{
                left: mx(it.start) + 1,
                width: Math.max(mx(it.end) - mx(it.start) - 2, 1),
                top: 8 + Math.min(it.lane, 8) * 6,
                background: `var(--ev-${it.color})`,
              }}
            />
          ))}
          <div
            className="tl-window"
            style={{ left: mx(start), width: Math.max(mx(end) - mx(start), 8) }}
            onPointerDown={onMiniDown("move")}
          >
            <div className="tl-handle left-0 -translate-x-1/2" onPointerDown={onMiniDown("l")} />
            <div className="tl-handle right-0 translate-x-1/2" onPointerDown={onMiniDown("r")} />
          </div>
        </div>
      </div>

      <EventDialog
        item={editing?.item ?? null}
        isNew={editing?.isNew ?? false}
        onClose={() => setEditing(null)}
        onSave={(it) => {
          setItems((all) => (all.some((i) => i.id === it.id) ? all.map((i) => (i.id === it.id ? it : i)) : [...all, it]));
          setEditing(null);
        }}
        onDelete={(id) => {
          setItems((all) => all.filter((i) => i.id !== id));
          setEditing(null);
        }}
      />
    </div>
  );
}
