export type TimelineItem = {
  id: string;
  label: string;
  lane: number;
  start: number;
  end: number;
  color: number;
};

export const PALETTE_SIZE = 20;

export const DAY = 86_400_000;

const d = (y: number, m = 1, day = 1) => new Date(y, m - 1, day).getTime();

export const MIN_SPAN = 3 * DAY;

export function getDomain(items: TimelineItem[]): [number, number] {
  if (items.length === 0) {
    const y = new Date().getFullYear();
    return [d(y), d(y + 1)];
  }
  const s = Math.min(...items.map((i) => i.start));
  const e = Math.max(...items.map((i) => i.end));
  return [s, Math.max(e, s + MIN_SPAN)];
}

export const MOCK_ITEMS: TimelineItem[] = [
  { id: "bra", label: "BRA", lane: 0, start: d(2025), end: d(2027, 6), color: 14 },
  { id: "frcr", label: "FRCR", lane: 0, start: d(2027, 6), end: d(2030), color: 1 },
  { id: "swiss", label: "Swiss", lane: 0, start: d(2030), end: d(2046), color: 8 },
  { id: "work", label: "Work", lane: 1, start: d(2025), end: d(2045, 9), color: 15 },
  { id: "retire", label: "Retire", lane: 1, start: d(2045, 9), end: d(2094), color: 2 },
  { id: "cid", label: "Cidadania", lane: 2, start: d(2025), end: d(2030), color: 9 },
  { id: "idi", label: "Idiomas", lane: 3, start: d(2025), end: d(2030), color: 16 },
  { id: "pais", label: "Pai, Mãe, Sogro, Sogra", lane: 4, start: d(2025), end: d(2065), color: 3 },
  { id: "vo", label: "Vô", lane: 5, start: d(2025), end: d(2035), color: 10 },
  { id: "couple", label: "Couple", lane: 6, start: d(2025), end: d(2030), color: 17 },
  { id: "kids", label: "Kids", lane: 6, start: d(2030), end: d(2040, 6), color: 4 },
  { id: "teens", label: "Teens", lane: 6, start: d(2040, 6), end: d(2055), color: 11 },
  { id: "netos", label: "Netos", lane: 6, start: d(2055), end: d(2094), color: 18 },
  { id: "doppler", label: "Doppler", lane: 7, start: d(2025), end: d(2040, 6), color: 5 },
  { id: "olivia", label: "Olivia", lane: 8, start: d(2025), end: d(2036), color: 12 },
];

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function clampView(
  start: number,
  end: number,
  [ds, de]: [number, number],
): [number, number] {
  const span = clamp(end - start, Math.min(MIN_SPAN, de - ds), de - ds);
  const s = clamp(start, ds, de - span);
  return [s, s + span];
}

type Unit = {
  approx: number;
  floor: (t: number) => Date;
  next: (dt: Date) => Date;
  label: (dt: Date) => string;
};

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", o);
const fDay = fmt({ day: "numeric", month: "short" });
const fWeekday = fmt({ weekday: "short", day: "numeric" });
const fMonth = fmt({ month: "short" });
const fMonthYear = fmt({ month: "short", year: "numeric" });

const yearUnit = (n: number): Unit => ({
  approx: n * 365 * DAY,
  floor: (t) => {
    const y = new Date(t).getFullYear();
    return new Date(y - (((y % n) + n) % n), 0, 1);
  },
  next: (dt) => new Date(dt.getFullYear() + n, 0, 1),
  label: (dt) => String(dt.getFullYear()),
});

const monthUnit = (n: number): Unit => ({
  approx: n * 30 * DAY,
  floor: (t) => {
    const x = new Date(t);
    return new Date(x.getFullYear(), x.getMonth() - (x.getMonth() % n), 1);
  },
  next: (dt) => new Date(dt.getFullYear(), dt.getMonth() + n, 1),
  label: (dt) => (dt.getMonth() === 0 ? String(dt.getFullYear()) : fMonth.format(dt)),
});

const UNITS: Unit[] = [
  {
    approx: DAY,
    floor: (t) => {
      const x = new Date(t);
      return new Date(x.getFullYear(), x.getMonth(), x.getDate());
    },
    next: (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 1),
    label: (dt) => fWeekday.format(dt).replace(".", ""),
  },
  {
    approx: 7 * DAY,
    floor: (t) => {
      const x = new Date(t);
      const wd = (x.getDay() + 6) % 7;
      return new Date(x.getFullYear(), x.getMonth(), x.getDate() - wd);
    },
    next: (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + 7),
    label: (dt) => fDay.format(dt),
  },
  monthUnit(1),
  monthUnit(3),
  yearUnit(1),
  yearUnit(5),
  yearUnit(10),
];

export type Tick = { t: number; label: string };

export function getTicks(start: number, end: number, width: number, minPx = 72): Tick[] {
  const msPerPx = (end - start) / Math.max(width, 1);
  const unit = UNITS.find((u) => u.approx / msPerPx >= minPx) ?? UNITS[UNITS.length - 1]!;
  const ticks: Tick[] = [];
  let dt = unit.floor(start);
  let guard = 0;
  while (dt.getTime() <= end && guard++ < 500) {
    if (dt.getTime() >= start) ticks.push({ t: dt.getTime(), label: unit.label(dt) });
    dt = unit.next(dt);
  }
  return ticks;
}

const fRange = fmt({ day: "numeric", month: "short", year: "numeric" });

export function describeSpan(start: number, end: number) {
  const days = (end - start) / DAY;
  let size: string;
  if (days < 14) size = `${Math.round(days)} dias`;
  else if (days < 60) size = `${Math.round(days / 7)} semanas`;
  else if (days < 730) size = `${Math.round(days / 30)} meses`;
  else size = `${Math.round(days / 365)} anos`;
  return { range: `${fRange.format(start)} – ${fRange.format(end)}`, size };
}

export const toInputDate = (t: number) => {
  const x = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
export const fromInputDate = (v: string) => {
  const [y, m, dd] = v.split("-").map(Number);
  return new Date(y ?? 2025, (m ?? 1) - 1, dd ?? 1).getTime();
};
