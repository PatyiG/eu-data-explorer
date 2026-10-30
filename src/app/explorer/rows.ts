import { EU_AGGREGATE, geoName } from '../data/countries';
import { Indicator } from '../data/indicators';
import { Table, latest } from '../data/jsonstat';

/** One grid row: a country with its yearly values plus a few derived columns. */
export interface CountryRow {
  geo: string;
  country: string;
  /** Year → value; years are dynamic, so they live in a map rather than fixed fields. */
  values: Record<string, number | null>;
  flags: Record<string, string>;
  latest: number | null;
  latestYear: string | null;
  /** Change over the last five years with data, in the indicator's unit (percentage points for rates). */
  change5y: number | null;
  /** Difference from the EU-27 value in the same year. */
  vsEu: number | null;
  rank: number | null;
}

export function buildRows(table: Table, indicator: Indicator): { countries: CountryRow[]; eu: CountryRow | null } {
  const euSeries = table.series.find((s) => s.geo === EU_AGGREGATE);
  const rows = table.series.map((s): CountryRow => {
    const last = latest(s, table.years);
    const lastIdx = last ? table.years.indexOf(last.year) : -1;
    const fiveBack = lastIdx >= 5 ? s.values[table.years[lastIdx - 5]] : null;
    const euSame = last && euSeries ? euSeries.values[last.year] : null;
    return {
      geo: s.geo,
      country: geoName(s.geo),
      values: s.values,
      flags: s.flags,
      latest: last?.value ?? null,
      latestYear: last?.year ?? null,
      change5y: last && fiveBack !== null && fiveBack !== undefined ? last.value - fiveBack : null,
      vsEu: last && euSame !== null && euSame !== undefined && s.geo !== EU_AGGREGATE ? last.value - euSame : null,
      rank: null,
    };
  });

  const countries = rows.filter((r) => r.geo !== EU_AGGREGATE);
  // Rank 1 is the best outcome when "better" is defined, otherwise the highest value.
  const ranked = countries
    .filter((r) => r.latest !== null)
    .sort((a, b) => (indicator.higherIsBetter === false ? a.latest! - b.latest! : b.latest! - a.latest!));
  ranked.forEach((r, i) => (r.rank = i + 1));

  return { countries, eu: rows.find((r) => r.geo === EU_AGGREGATE) ?? null };
}
