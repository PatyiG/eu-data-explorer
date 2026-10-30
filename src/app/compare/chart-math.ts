/** Pure geometry for the line chart, kept out of the component so it is easy to test. */

export interface ChartSeries {
  id: string;
  points: readonly { x: string; y: number | null }[];
}

export interface ChartPath {
  id: string;
  /** SVG path data; gaps in the data start a new sub-path. */
  d: string;
  last: { x: number; y: number } | null;
}

export interface Tick {
  value: number;
  pos: number;
}

export interface ChartGeometry {
  paths: ChartPath[];
  xTicks: { label: string; pos: number }[];
  yTicks: Tick[];
}

export interface Box {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** "Nice" tick step (1, 2, 2.5 or 5 × 10^n) giving roughly `count` ticks. */
export function niceStep(range: number, count = 5): number {
  if (range <= 0 || !Number.isFinite(range)) return 1;
  const raw = range / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function niceDomain(min: number, max: number, count = 5): { min: number; max: number; step: number } {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, count);
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}

export function buildChart(series: readonly ChartSeries[], xLabels: readonly string[], box: Box): ChartGeometry {
  const innerW = box.width - box.left - box.right;
  const innerH = box.height - box.top - box.bottom;
  const ys = series.flatMap((s) => s.points.map((p) => p.y)).filter((y): y is number => y !== null);
  if (ys.length === 0 || xLabels.length === 0) return { paths: [], xTicks: [], yTicks: [] };

  // Rates and money never look right with a broken zero line when all values are positive.
  const dataMin = Math.min(...ys);
  const domain = niceDomain(dataMin > 0 ? 0 : dataMin, Math.max(...ys));
  const xPos = (i: number) => box.left + (xLabels.length === 1 ? innerW / 2 : (i / (xLabels.length - 1)) * innerW);
  const yPos = (v: number) => box.top + innerH - ((v - domain.min) / (domain.max - domain.min)) * innerH;
  const index = new Map(xLabels.map((x, i) => [x, i]));

  const paths = series.map((s) => {
    let d = '';
    let penDown = false;
    let last: { x: number; y: number } | null = null;
    for (const p of s.points) {
      const i = index.get(p.x);
      if (i === undefined || p.y === null) {
        penDown = false;
        continue;
      }
      const x = Number(xPos(i).toFixed(1));
      const y = Number(yPos(p.y).toFixed(1));
      d += `${penDown ? 'L' : 'M'}${x},${y}`;
      penDown = true;
      last = { x, y };
    }
    return { id: s.id, d, last };
  });

  const yTicks: Tick[] = [];
  for (let v = domain.min; v <= domain.max + domain.step / 2; v += domain.step) {
    const value = Number(v.toFixed(10));
    yTicks.push({ value, pos: Number(yPos(value).toFixed(1)) });
  }
  const every = Math.ceil(xLabels.length / 8);
  const xTicks = xLabels
    .map((label, i) => ({ label, pos: Number(xPos(i).toFixed(1)) }))
    .filter((_, i) => i % every === 0 || i === xLabels.length - 1);

  return { paths, xTicks, yTicks };
}
