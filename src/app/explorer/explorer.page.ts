import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GetRowIdParams,
  ModuleRegistry,
  RowClassRules,
  ValueFormatterParams,
  colorSchemeDarkBlue,
  themeQuartz,
} from 'ag-grid-community';
import { HOME_COUNTRY } from '../data/countries';
import { Indicator, formatValue } from '../data/indicators';
import { injectPrefersDark } from '../shared/color-scheme';
import { ExplorerStore } from '../state/explorer.store';
import { CountryRow, buildRows } from './rows';

ModuleRegistry.registerModules([AllCommunityModule]);

const lightTheme = themeQuartz.withParams({ accentColor: '#2f6fde', fontFamily: 'inherit', headerFontWeight: 600 });
const darkTheme = themeQuartz.withPart(colorSchemeDarkBlue).withParams({ accentColor: '#6ea0ff', fontFamily: 'inherit' });

function signed(value: number | null | undefined, indicator: Indicator): string {
  if (value === null || value === undefined) return '–';
  const unit = indicator.unit === '%' || indicator.unit === '% of GDP' ? ' pp' : '';
  const text = formatValue(Math.abs(value), { ...indicator, unit: unit ? '' : indicator.unit });
  return `${value > 0 ? '+' : value < 0 ? '−' : '±'}${text}${unit}`;
}

/** Green when the change is an improvement, red when it is not, neutral when "better" is undefined. */
function trendClass(value: number | null | undefined, indicator: Indicator): string {
  if (value === null || value === undefined || value === 0 || indicator.higherIsBetter === null) return '';
  return (value > 0) === indicator.higherIsBetter ? 'cell-good' : 'cell-bad';
}

@Component({
  selector: 'app-explorer',
  imports: [AgGridAngular],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './explorer.page.html',
  styleUrl: './explorer.page.css',
})
export class ExplorerPage {
  protected readonly store = inject(ExplorerStore);
  protected readonly quickFilter = signal('');
  private readonly dark = injectPrefersDark();
  protected readonly theme = computed(() => (this.dark() ? darkTheme : lightTheme));

  protected readonly data = computed(() => {
    const table = this.store.table();
    return table ? buildRows(table, this.store.indicator()) : null;
  });

  protected readonly pinnedTop = computed(() => {
    const eu = this.data()?.eu;
    return eu ? [eu] : [];
  });

  protected readonly columnDefs = computed<ColDef<CountryRow>[]>(() => {
    const indicator = this.store.indicator();
    const years = this.store.table()?.years ?? [];
    const fmt = (p: ValueFormatterParams<CountryRow, number | null>) => formatValue(p.value, indicator);

    return [
      {
        headerName: '#',
        field: 'rank',
        width: 64,
        pinned: 'left',
        sort: 'asc',
        cellClass: 'cell-muted',
        headerTooltip: indicator.higherIsBetter === null ? 'Rank by latest value, highest first' : 'Rank by latest value, best first',
      },
      { headerName: 'Country', field: 'country', pinned: 'left', width: 150, filter: 'agTextColumnFilter' },
      {
        headerName: 'Latest',
        field: 'latest',
        width: 120,
        type: 'numericColumn',
        valueFormatter: fmt,
        filter: 'agNumberColumnFilter',
        tooltipValueGetter: (p) => (p.data?.latestYear ? `Year ${p.data.latestYear}` : null),
        cellClass: 'cell-strong',
      },
      {
        headerName: 'vs EU-27',
        field: 'vsEu',
        width: 112,
        type: 'numericColumn',
        valueFormatter: (p) => signed(p.value, indicator),
        headerTooltip: 'Difference from the EU-27 value in the same year',
      },
      {
        headerName: '5-year change',
        field: 'change5y',
        width: 132,
        type: 'numericColumn',
        valueFormatter: (p) => signed(p.value, indicator),
        cellClass: (p) => trendClass(p.value, indicator),
      },
      {
        headerName: 'By year',
        marryChildren: true,
        children: years.map(
          (year): ColDef<CountryRow> => ({
            headerName: year,
            colId: `y${year}`,
            width: 104,
            type: 'numericColumn',
            valueGetter: (p) => p.data?.values[year] ?? null,
            valueFormatter: fmt,
            tooltipValueGetter: (p) => {
              const flag = p.data?.flags[year];
              return flag ? `Eurostat flag: ${flag} (p = provisional, b = break in series, e = estimated)` : null;
            },
            cellClass: (p) => (p.data?.flags[year] ? 'cell-flagged' : ''),
          }),
        ),
      },
    ];
  });

  protected readonly defaultColDef: ColDef<CountryRow> = { sortable: true, resizable: true };
  protected readonly rowClassRules: RowClassRules<CountryRow> = {
    'row-home': (p) => p.data?.geo === HOME_COUNTRY,
  };
  protected readonly getRowId = (p: GetRowIdParams<CountryRow>) => p.data.geo;
}
