import type { Page } from '@playwright/test';

const GEOS = [
  'EU27_2020', 'BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY',
  'LV', 'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE', 'TR',
];
const YEARS = Array.from({ length: 11 }, (_, i) => String(2014 + i));

/**
 * Deterministic fake values so tests can assert on them. Hungary gets the lowest rate,
 * so it ranks first and is always within the rows AG Grid renders.
 */
function valueFor(dataset: string, geo: string, g: number, t: number): number {
  const rate = geo === 'HU' ? 2.5 : 3 + (g % 9);
  const base = dataset === 'nama_10_pc' ? 20000 + g * 1500 : dataset === 'demo_gind' ? 1_000_000 * (g + 1) : rate;
  return Math.round((base + t * (dataset === 'nama_10_pc' ? 400 : 0.2)) * 10) / 10;
}

export function fakeResponse(dataset: string) {
  const value: Record<string, number> = {};
  GEOS.forEach((geo, g) =>
    YEARS.forEach((_, t) => (value[String(g * YEARS.length + t)] = valueFor(dataset, geo, g, t))),
  );
  return {
    version: '2.0',
    class: 'dataset',
    label: `Fake ${dataset}`,
    updated: '2026-10-27T23:00:00+0100',
    id: ['freq', 'unit', 'geo', 'time'],
    size: [1, 1, GEOS.length, YEARS.length],
    dimension: {
      freq: { category: { index: { A: 0 } } },
      unit: { category: { index: { X: 0 } } },
      geo: { category: { index: Object.fromEntries(GEOS.map((c, i) => [c, i])) } },
      time: { category: { index: Object.fromEntries(YEARS.map((y, i) => [y, i])) } },
    },
    value,
    status: { [String(GEOS.indexOf('HU') * YEARS.length + YEARS.length - 1)]: 'p' },
  };
}

/** Intercepts every Eurostat request; records which datasets were asked for. */
export async function mockEurostat(page: Page, options: { failFirst?: boolean } = {}): Promise<string[]> {
  const requested: string[] = [];
  let failures = options.failFirst ? 3 : 0;
  await page.route('https://ec.europa.eu/eurostat/api/**', async (route) => {
    const dataset = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    requested.push(dataset);
    if (failures > 0) {
      failures--;
      await route.fulfill({ status: 503, body: 'unavailable' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fakeResponse(dataset)) });
  });
  return requested;
}
