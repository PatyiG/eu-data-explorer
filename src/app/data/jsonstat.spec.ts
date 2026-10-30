import { fakeJsonStat } from '../../testing/jsonstat-fixture';
import { JsonStat, categoryCodes, latest, strides, toTable } from './jsonstat';

describe('jsonstat', () => {
  it('computes row-major strides', () => {
    expect(strides([1, 1, 3, 4])).toEqual([12, 12, 4, 1]);
    expect(strides([2, 5])).toEqual([5, 1]);
  });

  it('reads category codes from an index object or array', () => {
    expect(categoryCodes({ index: { b: 1, a: 0 } })).toEqual(['a', 'b']);
    expect(categoryCodes({ index: ['x', 'y'] })).toEqual(['x', 'y']);
  });

  it('turns the flat cube into one series per geo, with nulls for gaps', () => {
    const js = fakeJsonStat(['HU', 'AT'], ['2023', '2024'], (g, y) => (g === 'AT' && y === '2023' ? null : g === 'HU' ? 4 : 5), {
      'HU:2024': 'p',
    });
    const table = toTable(js);
    expect(table.years).toEqual(['2023', '2024']);
    expect(table.series.map((s) => s.geo)).toEqual(['HU', 'AT']);
    expect(table.series[0].values).toEqual({ '2023': 4, '2024': 4 });
    expect(table.series[0].flags).toEqual({ '2024': 'p' });
    expect(table.series[1].values).toEqual({ '2023': null, '2024': 5 });
  });

  it('handles geo and time in any dimension order', () => {
    // time before geo: offset = t * geoCount + g
    const js: JsonStat = {
      id: ['time', 'geo'],
      size: [2, 2],
      dimension: {
        time: { category: { index: { '2024': 1, '2023': 0 } } },
        geo: { category: { index: { HU: 0, SK: 1 } } },
      },
      value: { '0': 1, '1': 2, '2': 3, '3': 4 },
    };
    const table = toTable(js);
    expect(table.series[0].values).toEqual({ '2023': 1, '2024': 3 });
    expect(table.series[1].values).toEqual({ '2023': 2, '2024': 4 });
  });

  it('drops geos the caller does not want and sorts years', () => {
    const js = fakeJsonStat(['HU', 'TR'], ['2025', '2024'], () => 1);
    const table = toTable(js, (g) => g !== 'TR');
    expect(table.series.map((s) => s.geo)).toEqual(['HU']);
    expect(table.years).toEqual(['2024', '2025']);
  });

  it('returns an empty table when a filter matched nothing', () => {
    const js = fakeJsonStat(['HU'], ['2024'], () => 1);
    js.size = [1, 0, 1, 1];
    expect(toTable(js).series).toEqual([]);
  });

  it('finds the most recent year with data', () => {
    const series = { geo: 'HU', values: { '2023': 3, '2024': 4, '2025': null }, flags: {} };
    expect(latest(series, ['2023', '2024', '2025'])).toEqual({ year: '2024', value: 4 });
    expect(latest({ geo: 'HU', values: { '2024': null }, flags: {} }, ['2024'])).toBeNull();
  });
});
