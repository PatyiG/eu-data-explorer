/**
 * Minimal JSON-stat 2.0 reader for Eurostat responses.
 *
 * Eurostat returns an n-dimensional cube flattened into one `value` object keyed by
 * position. We fix every dimension except `geo` and `time` (the request filters them to
 * a single category) and read the cube as a geo × time table.
 */

export interface JsonStatCategory {
  index: Record<string, number> | string[];
  label?: Record<string, string>;
}

export interface JsonStatDimension {
  label?: string;
  category: JsonStatCategory;
}

export interface JsonStat {
  label?: string;
  updated?: string;
  id: string[];
  size: number[];
  dimension: Record<string, JsonStatDimension>;
  value: Record<string, number | null> | (number | null)[];
  status?: Record<string, string> | string[];
}

export interface Series {
  geo: string;
  /** Value per year; missing observations are null. */
  values: Record<string, number | null>;
  /** Eurostat status flags per year, e.g. "p" (provisional), "b" (break in series). */
  flags: Record<string, string>;
}

export interface Table {
  label: string;
  updated: string;
  /** Sorted ascending. */
  years: string[];
  series: Series[];
}

/** Category codes in position order. */
export function categoryCodes(category: JsonStatCategory): string[] {
  if (Array.isArray(category.index)) return category.index.slice();
  return Object.entries(category.index)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);
}

/** Row-major strides: the flat offset of position p is sum(p[i] * stride[i]). */
export function strides(size: readonly number[]): number[] {
  const out = new Array<number>(size.length).fill(1);
  for (let i = size.length - 2; i >= 0; i--) out[i] = out[i + 1] * size[i + 1];
  return out;
}

function lookup<T>(source: Record<string, T> | T[] | undefined, offset: number): T | undefined {
  if (!source) return undefined;
  return Array.isArray(source) ? source[offset] : source[String(offset)];
}

export function toTable(js: JsonStat, keepGeo: (code: string) => boolean = () => true): Table {
  const geoAxis = js.id.indexOf('geo');
  const timeAxis = js.id.indexOf('time');
  if (geoAxis < 0 || timeAxis < 0) throw new Error('Response has no geo or time dimension');
  if (js.size.some((n) => n === 0)) {
    return { label: js.label ?? '', updated: js.updated ?? '', years: [], series: [] };
  }

  const stride = strides(js.size);
  const geos = categoryCodes(js.dimension['geo'].category);
  const years = categoryCodes(js.dimension['time'].category);
  const yearOrder = years.map((y, pos) => ({ y, pos })).sort((a, b) => a.y.localeCompare(b.y));

  const series: Series[] = [];
  geos.forEach((geo, g) => {
    if (!keepGeo(geo)) return;
    const values: Record<string, number | null> = {};
    const flags: Record<string, string> = {};
    for (const { y, pos } of yearOrder) {
      // Every other dimension is fixed at position 0 by the request filters.
      const offset = g * stride[geoAxis] + pos * stride[timeAxis];
      const v = lookup(js.value, offset);
      values[y] = typeof v === 'number' ? v : null;
      const f = lookup(js.status, offset);
      if (f) flags[y] = f;
    }
    series.push({ geo, values, flags });
  });

  return {
    label: js.label ?? '',
    updated: js.updated ?? '',
    years: yearOrder.map((x) => x.y),
    series,
  };
}

/** Most recent year with a value, or null. */
export function latest(series: Series, years: readonly string[]): { year: string; value: number } | null {
  for (let i = years.length - 1; i >= 0; i--) {
    const v = series.values[years[i]];
    if (v !== null && v !== undefined) return { year: years[i], value: v };
  }
  return null;
}
