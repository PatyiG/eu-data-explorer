import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { EU_AGGREGATE, EU_COUNTRIES, HOME_COUNTRY, geoName } from '../data/countries';
import { formatValue } from '../data/indicators';
import { latest } from '../data/jsonstat';
import { ExplorerStore, MAX_COMPARED } from '../state/explorer.store';
import { LineChart, LineSeries } from './line-chart';

/** Colour-blind-safe palette (Okabe–Ito); Hungary always gets the first colour. */
const PALETTE = ['#d55e00', '#0072b2', '#009e73', '#cc79a7', '#e69f00', '#56b4e9'];
const EU_COLOR = '#7a8794';

@Component({
  selector: 'app-compare',
  imports: [LineChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './compare.page.html',
  styleUrl: './compare.page.css',
})
export class ComparePage {
  protected readonly store = inject(ExplorerStore);
  private readonly router = inject(Router);
  protected readonly max = MAX_COMPARED;

  protected readonly countries = Object.entries(EU_COUNTRIES)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /** Hungary first, then the rest in the order they were picked, so colours stay stable. */
  protected readonly ordered = computed(() => {
    const picked = this.store.compared();
    return picked.includes(HOME_COUNTRY) ? [HOME_COUNTRY, ...picked.filter((c) => c !== HOME_COUNTRY)] : picked;
  });

  protected readonly series = computed<LineSeries[]>(() => {
    const table = this.store.table();
    if (!table) return [];
    const byGeo = new Map(table.series.map((s) => [s.geo, s]));
    const toPoints = (geo: string) => table.years.map((x) => ({ x, y: byGeo.get(geo)?.values[x] ?? null }));

    const lines: LineSeries[] = this.ordered().map((geo, i) => ({
      id: geo,
      label: geoName(geo),
      color: PALETTE[i % PALETTE.length],
      emphasis: geo === HOME_COUNTRY,
      points: toPoints(geo),
    }));
    if (byGeo.has(EU_AGGREGATE)) {
      lines.push({ id: EU_AGGREGATE, label: 'EU-27', color: EU_COLOR, dashed: true, points: toPoints(EU_AGGREGATE) });
    }
    return lines;
  });

  /** A plain table of the latest values doubles as the chart's accessible description. */
  protected readonly summary = computed(() => {
    const table = this.store.table();
    const indicator = this.store.indicator();
    if (!table) return [];
    return this.series().map((s) => {
      const source = table.series.find((t) => t.geo === s.id);
      const last = source ? latest(source, table.years) : null;
      return { id: s.id, label: s.label, color: s.color, year: last?.year ?? '–', value: formatValue(last?.value, indicator) };
    });
  });

  protected readonly heading = computed(() => {
    const years = this.store.table()?.years ?? [];
    const label = this.store.indicator().label;
    return years.length ? `${label}, ${years[0]}–${years[years.length - 1]}` : label;
  });

  protected readonly formatTick = computed(() => {
    const indicator = this.store.indicator();
    return (v: number) => formatValue(v, { ...indicator, decimals: Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0 });
  });

  protected isSelected(code: string): boolean {
    return this.store.compared().includes(code);
  }

  protected toggle(code: string): void {
    this.store.toggleCompared(code);
    void this.router.navigate([], {
      queryParams: { geos: this.store.compared().join(',') },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
