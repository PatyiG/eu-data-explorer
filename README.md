# EU Data Explorer

Compare Hungary and the other EU member states on key Eurostat indicators — unemployment, GDP per capita, inflation, employment, government debt and population — in a sortable data grid and a comparison chart.

**Live demo:** https://patyig.github.io/eu-data-explorer/

## Features

- **Table view** (AG Grid): one row per country with yearly values since 2014, the latest value, the difference from the EU-27, the five-year change and a rank. The EU-27 average is pinned on top, Hungary is highlighted, provisional values are marked, and every column can be sorted, filtered and resized.
- **Compare view**: a line chart of up to six countries against the EU-27 average, with a table of the latest values that doubles as the chart's accessible description.
- **Shareable state**: the indicator and the compared countries live in the URL (`?indicator=gdp-per-capita&geos=HU,AT,PL`), so every view can be bookmarked and the back button works.
- Light and dark mode, mobile layout, keyboard focus styles.

## How it is built

| Concern | Approach |
| --- | --- |
| Framework | Angular 20 standalone components, signals, zoneless change detection, lazy-loaded routes (AG Grid only downloads with the table). |
| State | An NgRx `signalStore` holds the selected indicator, the loaded tables and the comparison; an `rxMethod` reacts to the indicator signal and loads data that is not cached yet. |
| Data | `EurostatService` calls the public Eurostat Statistics API with RxJS: retries with back-off, one shared request per indicator via `shareReplay`, failed requests are not cached. |
| Parsing | A small JSON-stat 2.0 reader (`src/app/data/jsonstat.ts`) turns Eurostat's flattened n-dimensional cube into a country × year table. |
| Grid | AG Grid Community with column groups, pinned rows and columns, value formatters, tooltips with Eurostat flags, and themes that follow the system colour scheme. |
| Chart | Plain SVG; the geometry (nice ticks, gaps for missing data) lives in pure functions that are unit-tested. |
| Tests | Jasmine/Karma unit tests for the parser, chart maths, row derivation and the store (with `HttpTestingController`); Playwright end-to-end tests on desktop and mobile with Eurostat mocked, including the error-and-retry path. |
| CI/CD | GitHub Actions builds and tests every push, then deploys `main` to GitHub Pages. |

## Run it locally

```bash
npm install
npm start            # http://localhost:4200
npm run test:ci      # unit tests in headless Chrome
npx playwright install chromium
npm run e2e          # end-to-end tests
```

## About

Built by [Gábor Patyi](https://www.linkedin.com/in/g%C3%A1bor-p-067104288/), frontend engineer in Budapest. Developed with AI assistance (Claude), which is how I work day to day; the design decisions, review and tests are mine.

Data: [Eurostat](https://ec.europa.eu/eurostat), reused under the Eurostat copyright and licence policy. This project is not affiliated with Eurostat or the European Commission.
