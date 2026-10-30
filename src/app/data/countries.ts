/** EU member states as Eurostat codes them (Greece is EL), plus the EU-27 aggregate. */
export const EU_AGGREGATE = 'EU27_2020';
export const HOME_COUNTRY = 'HU';

export const EU_COUNTRIES: Readonly<Record<string, string>> = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DE: 'Germany',
  DK: 'Denmark',
  EE: 'Estonia',
  EL: 'Greece',
  ES: 'Spain',
  FI: 'Finland',
  FR: 'France',
  HR: 'Croatia',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  LV: 'Latvia',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SE: 'Sweden',
  SI: 'Slovenia',
  SK: 'Slovakia',
};

export function isEuGeo(code: string): boolean {
  return code === EU_AGGREGATE || code in EU_COUNTRIES;
}

export function geoName(code: string): string {
  return code === EU_AGGREGATE ? 'EU-27' : (EU_COUNTRIES[code] ?? code);
}
