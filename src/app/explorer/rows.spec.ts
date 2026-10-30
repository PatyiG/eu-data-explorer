import { findIndicator } from '../data/indicators';
import { toTable } from '../data/jsonstat';
import { fakeJsonStat } from '../../testing/jsonstat-fixture';
import { buildRows } from './rows';

const years = ['2019', '2020', '2021', '2022', '2023', '2024'];

describe('buildRows', () => {
  const values: Record<string, number[]> = {
    EU27_2020: [6, 7, 7, 6, 6, 6],
    HU: [3.4, 4.1, 4.0, 3.6, 4.1, 4.4],
    ES: [14, 15.5, 14.8, 13, 12.2, 11.4],
    CZ: [2, 2.5, 2.8, 2.2, 2.6, null as unknown as number],
  };
  const table = toTable(fakeJsonStat(Object.keys(values), years, (g, y) => values[g][years.indexOf(y)] ?? null));

  it('separates the EU aggregate from countries and names them', () => {
    const { countries, eu } = buildRows(table, findIndicator('unemployment')!);
    expect(eu?.country).toBe('EU-27');
    expect(countries.map((c) => c.country)).toEqual(['Hungary', 'Spain', 'Czechia']);
  });

  it('derives latest value, 5-year change and difference from the EU', () => {
    const hu = buildRows(table, findIndicator('unemployment')!).countries.find((c) => c.geo === 'HU')!;
    expect(hu.latest).toBe(4.4);
    expect(hu.latestYear).toBe('2024');
    expect(hu.change5y).toBeCloseTo(1.0, 5);
    expect(hu.vsEu).toBeCloseTo(-1.6, 5);
  });

  it('falls back to the last year with data', () => {
    const cz = buildRows(table, findIndicator('unemployment')!).countries.find((c) => c.geo === 'CZ')!;
    expect(cz.latestYear).toBe('2023');
    expect(cz.change5y).toBeNull(); // no value five years before 2023
  });

  it('ranks lowest first when lower is better, highest first otherwise', () => {
    const low = buildRows(table, findIndicator('unemployment')!).countries;
    expect(low.find((c) => c.geo === 'CZ')!.rank).toBe(1);
    const high = buildRows(table, findIndicator('employment')!).countries;
    expect(high.find((c) => c.geo === 'ES')!.rank).toBe(1);
  });
});
