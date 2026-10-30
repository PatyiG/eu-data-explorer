import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fakeJsonStat } from '../../testing/jsonstat-fixture';
import { EUROSTAT_API } from '../data/eurostat.service';
import { ExplorerStore, MAX_COMPARED } from './explorer.store';

describe('ExplorerStore', () => {
  let store: InstanceType<typeof ExplorerStore>;
  let http: HttpTestingController;

  const respond = (dataset: string) => {
    const req = http.expectOne((r) => r.url === `${EUROSTAT_API}/${dataset}`);
    req.flush(fakeJsonStat(['EU27_2020', 'HU', 'TR'], ['2023', '2024'], () => 5));
    return req;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ExplorerStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the default indicator on start and keeps only EU geos', () => {
    TestBed.tick();
    const req = respond('une_rt_a');
    expect(req.request.params.get('age')).toBe('Y15-74');
    expect(req.request.params.get('sinceTimePeriod')).toBe('2014');
    expect(store.loading()).toBeFalse();
    expect(store.table()?.series.map((s) => s.geo)).toEqual(['EU27_2020', 'HU']);
  });

  it('loads another indicator when selected and reuses it from the store afterwards', () => {
    TestBed.tick();
    respond('une_rt_a');
    store.selectIndicator('gdp-per-capita');
    TestBed.tick();
    respond('nama_10_pc');
    expect(store.indicator().id).toBe('gdp-per-capita');

    store.selectIndicator('unemployment');
    TestBed.tick();
    http.expectNone((r) => r.url.includes('une_rt_a'));
    expect(store.table()).not.toBeNull();
  });

  it('ignores unknown indicator ids from the URL', () => {
    store.selectIndicator('not-a-thing');
    expect(store.indicatorId()).toBe('unemployment');
    TestBed.tick();
    respond('une_rt_a');
  });

  it('reports errors after retries and can try again', async () => {
    TestBed.tick();
    const fail = () =>
      http.expectOne((r) => r.url.endsWith('une_rt_a')).flush('down', { status: 503, statusText: 'Unavailable' });
    fail();
    await new Promise((r) => setTimeout(r, 600));
    fail();
    await new Promise((r) => setTimeout(r, 1100));
    fail();
    expect(store.error()).toContain('503');
    expect(store.loading()).toBeFalse();

    store.retry();
    respond('une_rt_a');
    expect(store.error()).toBeNull();
  });

  it('keeps the compared list valid and within the limit', () => {
    TestBed.tick();
    respond('une_rt_a');
    store.setCompared(['HU', 'XX', 'HU', 'AT', 'DE', 'FR', 'IT', 'ES', 'PL']);
    expect(store.compared()).toEqual(['HU', 'AT', 'DE', 'FR', 'IT', 'ES'].slice(0, MAX_COMPARED));
    store.toggleCompared('AT');
    expect(store.compared()).not.toContain('AT');
    store.setCompared(['HU']);
    store.toggleCompared('HU');
    expect(store.compared()).toEqual(['HU']); // never empty
  });
});
