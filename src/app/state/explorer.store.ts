import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, filter, map, pipe, switchMap, tap } from 'rxjs';
import { EU_AGGREGATE, EU_COUNTRIES, HOME_COUNTRY } from '../data/countries';
import { EurostatService } from '../data/eurostat.service';
import { DEFAULT_INDICATOR, INDICATORS, Indicator, IndicatorId, findIndicator } from '../data/indicators';
import { Table } from '../data/jsonstat';

export const MAX_COMPARED = 6;
export const DEFAULT_COMPARED: readonly string[] = [HOME_COUNTRY, 'AT', 'CZ', 'PL', 'SK'];

interface ExplorerState {
  indicatorId: IndicatorId;
  tables: Partial<Record<IndicatorId, Table>>;
  loading: boolean;
  error: string | null;
  /** Countries shown on the comparison chart (the EU-27 average is always added). */
  compared: string[];
}

const initialState: ExplorerState = {
  indicatorId: DEFAULT_INDICATOR,
  tables: {},
  loading: false,
  error: null,
  compared: [...DEFAULT_COMPARED],
};

function describeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return err.status === 0
      ? 'Eurostat could not be reached. Check your connection and try again.'
      : `Eurostat returned an error (${err.status}). Please try again later.`;
  }
  return err instanceof Error ? err.message : 'Something went wrong while loading the data.';
}

export const ExplorerStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ indicatorId, tables }) => ({
    indicator: computed(() => findIndicator(indicatorId()) ?? INDICATORS[0]),
    table: computed(() => tables()[indicatorId()] ?? null),
  })),
  withMethods((store, api = inject(EurostatService)) => {
    /** Loads the table for an indicator unless it is already in the store. */
    const load = rxMethod<IndicatorId>(
      pipe(
        filter((id) => !store.tables()[id]),
        map((id) => findIndicator(id)),
        filter((indicator): indicator is Indicator => indicator !== undefined),
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((indicator) =>
          api.load(indicator).pipe(
            tap((table) =>
              patchState(store, (s) => ({ tables: { ...s.tables, [indicator.id]: table }, loading: false })),
            ),
            catchError((err: unknown) => {
              patchState(store, { loading: false, error: describeError(err) });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    return {
      load,
      selectIndicator(id: string | null): void {
        const indicator = findIndicator(id);
        if (indicator && indicator.id !== store.indicatorId()) patchState(store, { indicatorId: indicator.id });
      },
      retry(): void {
        load(store.indicatorId());
      },
      setCompared(codes: readonly string[]): void {
        const valid = [...new Set(codes)].filter((c) => c in EU_COUNTRIES).slice(0, MAX_COMPARED);
        patchState(store, { compared: valid.length ? valid : [HOME_COUNTRY] });
      },
      toggleCompared(code: string): void {
        if (!(code in EU_COUNTRIES) || code === EU_AGGREGATE) return;
        const current = store.compared();
        if (current.includes(code)) {
          if (current.length > 1) patchState(store, { compared: current.filter((c) => c !== code) });
        } else if (current.length < MAX_COMPARED) {
          patchState(store, { compared: [...current, code] });
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      // Passing the signal makes rxMethod re-run whenever the indicator changes.
      store.load(store.indicatorId);
    },
  }),
);
