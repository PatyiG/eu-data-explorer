import { JsonStat } from '../app/data/jsonstat';

/**
 * Builds a small Eurostat-shaped JSON-stat response:
 * dimensions freq × unit × geo × time, with a sparse `value` object like the real API.
 */
export function fakeJsonStat(
  geos: readonly string[],
  years: readonly string[],
  valueOf: (geo: string, year: string) => number | null,
  flags: Record<string, string> = {},
): JsonStat {
  const value: Record<string, number> = {};
  const status: Record<string, string> = {};
  geos.forEach((geo, g) =>
    years.forEach((year, t) => {
      const offset = g * years.length + t;
      const v = valueOf(geo, year);
      if (v !== null) value[String(offset)] = v;
      const f = flags[`${geo}:${year}`];
      if (f) status[String(offset)] = f;
    }),
  );
  return {
    label: 'Fake dataset',
    updated: '2026-10-27T23:00:00+0100',
    id: ['freq', 'unit', 'geo', 'time'],
    size: [1, 1, geos.length, years.length],
    dimension: {
      freq: { category: { index: { A: 0 } } },
      unit: { category: { index: { PC: 0 } } },
      geo: { category: { index: Object.fromEntries(geos.map((g, i) => [g, i])) } },
      time: { category: { index: Object.fromEntries(years.map((y, i) => [y, i])) } },
    },
    value,
    status,
  };
}
