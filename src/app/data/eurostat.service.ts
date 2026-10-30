import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry, shareReplay, timer } from 'rxjs';
import { isEuGeo } from './countries';
import { Indicator, IndicatorId } from './indicators';
import { JsonStat, Table, toTable } from './jsonstat';

export const EUROSTAT_API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
export const FIRST_YEAR = 2014;

@Injectable({ providedIn: 'root' })
export class EurostatService {
  private readonly http = inject(HttpClient);
  /** One shared request per indicator, so switching back and forth costs nothing. */
  private readonly cache = new Map<IndicatorId, Observable<Table>>();

  load(indicator: Indicator): Observable<Table> {
    const cached = this.cache.get(indicator.id);
    if (cached) return cached;

    let params = new HttpParams()
      .set('format', 'JSON')
      .set('lang', 'EN')
      .set('sinceTimePeriod', String(FIRST_YEAR));
    for (const [dim, code] of Object.entries(indicator.filters)) params = params.set(dim, code);

    const request$ = this.http.get<JsonStat>(`${EUROSTAT_API}/${indicator.dataset}`, { params }).pipe(
      // The API is occasionally slow or returns 5xx; back off and try twice more.
      retry({ count: 2, delay: (_error, attempt) => timer(500 * 2 ** (attempt - 1)) }),
      map((js) => toTable(js, isEuGeo)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.cache.set(indicator.id, request$);
    // Do not keep failed requests: the next attempt should hit the network again.
    request$.subscribe({ error: () => this.cache.delete(indicator.id) });
    return request$;
  }
}
