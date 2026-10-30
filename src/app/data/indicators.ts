/** Eurostat datasets the explorer offers, each narrowed to a single series per country. */
export type IndicatorId = 'unemployment' | 'gdp-per-capita' | 'inflation' | 'employment' | 'debt' | 'population';

export interface Indicator {
  id: IndicatorId;
  label: string;
  /** Eurostat online data code. */
  dataset: string;
  /** Dimension filters that reduce the dataset to one value per country and year. */
  filters: Record<string, string>;
  unit: string;
  decimals: number;
  /** Whether a higher value is generally the better outcome (for colouring changes). */
  higherIsBetter: boolean | null;
  description: string;
}

export const INDICATORS: readonly Indicator[] = [
  {
    id: 'unemployment',
    label: 'Unemployment rate',
    dataset: 'une_rt_a',
    filters: { age: 'Y15-74', unit: 'PC_ACT', sex: 'T' },
    unit: '%',
    decimals: 1,
    higherIsBetter: false,
    description: 'Unemployed people aged 15–74 as a share of the labour force.',
  },
  {
    id: 'gdp-per-capita',
    label: 'GDP per capita',
    dataset: 'nama_10_pc',
    filters: { unit: 'CP_EUR_HAB', na_item: 'B1GQ' },
    unit: '€',
    decimals: 0,
    higherIsBetter: true,
    description: 'Gross domestic product per inhabitant, current prices in euro.',
  },
  {
    id: 'inflation',
    label: 'Inflation (HICP)',
    dataset: 'prc_hicp_aind',
    filters: { unit: 'RCH_A_AVG', coicop: 'CP00' },
    unit: '%',
    decimals: 1,
    higherIsBetter: null,
    description: 'Annual average rate of change of the harmonised index of consumer prices, all items.',
  },
  {
    id: 'employment',
    label: 'Employment rate',
    dataset: 'lfsi_emp_a',
    filters: { indic_em: 'EMP_LFS', sex: 'T', age: 'Y20-64', unit: 'PC_POP' },
    unit: '%',
    decimals: 1,
    higherIsBetter: true,
    description: 'Employed people aged 20–64 as a share of the population of that age.',
  },
  {
    id: 'debt',
    label: 'Government debt',
    dataset: 'gov_10dd_edpt1',
    filters: { unit: 'PC_GDP', sector: 'S13', na_item: 'GD' },
    unit: '% of GDP',
    decimals: 1,
    higherIsBetter: false,
    description: 'General government consolidated gross debt as a share of GDP.',
  },
  {
    id: 'population',
    label: 'Population',
    dataset: 'demo_gind',
    filters: { indic_de: 'JAN' },
    unit: '',
    decimals: 0,
    higherIsBetter: null,
    description: 'Population on 1 January.',
  },
];

export const DEFAULT_INDICATOR: IndicatorId = 'unemployment';

export function findIndicator(id: string | null | undefined): Indicator | undefined {
  return INDICATORS.find((i) => i.id === id);
}

export function formatValue(value: number | null | undefined, indicator: Indicator): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  const text = value.toLocaleString('en-GB', {
    minimumFractionDigits: indicator.decimals,
    maximumFractionDigits: indicator.decimals,
  });
  if (!indicator.unit) return text;
  return indicator.unit === '€' ? `€${text}` : `${text}${indicator.unit === '%' ? '%' : ` ${indicator.unit}`}`;
}
