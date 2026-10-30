import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Box, ChartSeries, buildChart } from './chart-math';

export interface LineSeries extends ChartSeries {
  label: string;
  color: string;
  dashed?: boolean;
  emphasis?: boolean;
}

const BOX: Box = { width: 720, height: 360, top: 16, right: 110, bottom: 32, left: 64 };

/** A dependency-free SVG line chart; geometry comes from the pure `buildChart`. */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="chart"
      [attr.viewBox]="'0 0 ' + box.width + ' ' + box.height"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (t of geometry().yTicks; track t.value) {
        <line class="grid" [attr.x1]="box.left" [attr.x2]="box.width - box.right" [attr.y1]="t.pos" [attr.y2]="t.pos" />
        <text class="tick" [attr.x]="box.left - 8" [attr.y]="t.pos" text-anchor="end" dominant-baseline="middle">
          {{ formatTick()(t.value) }}
        </text>
      }
      @for (t of geometry().xTicks; track t.label) {
        <text class="tick" [attr.x]="t.pos" [attr.y]="box.height - 8" text-anchor="middle">{{ t.label }}</text>
      }
      @for (p of paths(); track p.id) {
        <path
          class="line"
          [attr.d]="p.d"
          [attr.stroke]="p.series.color"
          [class.line--dashed]="p.series.dashed"
          [class.line--emphasis]="p.series.emphasis"
          [attr.data-series]="p.id"
        />
        @if (p.last; as last) {
          <circle [attr.cx]="last.x" [attr.cy]="last.y" r="3.5" [attr.fill]="p.series.color" />
          <text class="end-label" [attr.x]="last.x + 8" [attr.y]="last.y" dominant-baseline="middle" [attr.fill]="p.series.color">
            {{ p.series.label }}
          </text>
        }
      }
    </svg>
  `,
  styles: `
    :host { display: block; }
    .chart { width: 100%; height: auto; display: block; overflow: visible; }
    .grid { stroke: var(--border); stroke-width: 1; }
    .tick { fill: var(--muted); font-size: 12px; }
    .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .line--emphasis { stroke-width: 3.5; }
    .line--dashed { stroke-dasharray: 6 5; }
    .end-label { font-size: 12px; font-weight: 600; }
  `,
})
export class LineChart {
  readonly series = input.required<readonly LineSeries[]>();
  readonly xLabels = input.required<readonly string[]>();
  readonly formatTick = input<(v: number) => string>((v) => String(v));
  readonly ariaLabel = input('Line chart');

  protected readonly box = BOX;
  protected readonly geometry = computed(() => buildChart(this.series(), this.xLabels(), BOX));
  protected readonly paths = computed(() => {
    const byId = new Map(this.series().map((s) => [s.id, s]));
    return this.geometry()
      .paths.filter((p) => p.d)
      .map((p) => ({ ...p, series: byId.get(p.id)! }));
  });
}
