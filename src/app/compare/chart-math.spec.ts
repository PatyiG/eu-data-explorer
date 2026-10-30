import { Box, buildChart, niceDomain, niceStep } from './chart-math';

const box: Box = { width: 200, height: 120, top: 10, right: 10, bottom: 10, left: 10 };

describe('chart-math', () => {
  it('picks readable tick steps', () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(1000, 5)).toBe(200);
    expect(niceStep(0.9, 4)).toBe(0.25);
    expect(niceStep(0)).toBe(1);
  });

  it('expands the domain to whole steps and pads a flat line', () => {
    expect(niceDomain(3.2, 9.7)).toEqual({ min: 2, max: 10, step: 2 });
    const flat = niceDomain(5, 5);
    expect(flat.min).toBeLessThan(5);
    expect(flat.max).toBeGreaterThan(5);
  });

  it('starts positive data at zero and maps the extremes to the plot edges', () => {
    const g = buildChart([{ id: 'a', points: [{ x: '2020', y: 5 }, { x: '2021', y: 10 }] }], ['2020', '2021'], box);
    expect(g.yTicks[0].value).toBe(0);
    expect(g.yTicks[0].pos).toBe(110); // bottom of the plot area
    expect(g.paths[0].d).toBe('M10,60L190,10');
    expect(g.paths[0].last).toEqual({ x: 190, y: 10 });
  });

  it('breaks the line where data is missing', () => {
    const g = buildChart(
      [{ id: 'a', points: [{ x: '1', y: 1 }, { x: '2', y: null }, { x: '3', y: 1 }] }],
      ['1', '2', '3'],
      box,
    );
    expect(g.paths[0].d.match(/M/g)?.length).toBe(2);
  });

  it('returns nothing to draw without data', () => {
    expect(buildChart([{ id: 'a', points: [{ x: '1', y: null }] }], ['1'], box).paths).toEqual([]);
  });

  it('thins out x labels on long ranges but keeps the last one', () => {
    const years = Array.from({ length: 20 }, (_, i) => String(2000 + i));
    const g = buildChart([{ id: 'a', points: years.map((x) => ({ x, y: 1 })) }], years, box);
    expect(g.xTicks.length).toBeLessThanOrEqual(11);
    expect(g.xTicks.at(-1)?.label).toBe('2019');
  });
});
