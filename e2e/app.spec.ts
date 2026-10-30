import { expect, test } from '@playwright/test';
import { mockEurostat } from './eurostat-mock';

test.describe('table view', () => {
  test('shows EU countries with Hungary highlighted and the EU-27 pinned on top', async ({ page }) => {
    await mockEurostat(page);
    await page.goto('./');
    const hungary = page.locator('.ag-center-cols-container [row-id="HU"]');
    await expect(hungary).toBeVisible();
    await expect(hungary).toHaveClass(/row-home/);
    await expect(page.locator('.ag-floating-top [row-id="t-0"], .ag-floating-top .ag-row').first()).toContainText('EU-27');
    await expect(page.locator('[row-id="TR"]')).toHaveCount(0); // non-EU countries are dropped
  });

  test('quick filter narrows the rows', async ({ page }) => {
    await mockEurostat(page);
    await page.goto('./');
    await page.getByLabel('Find a country').fill('hung');
    await expect(page.locator('.ag-center-cols-container .ag-row')).toHaveCount(1);
  });

  test('switching the indicator loads its dataset and updates the URL', async ({ page }) => {
    const requested = await mockEurostat(page);
    await page.goto('./');
    await expect(page.locator('[row-id="HU"]').first()).toBeVisible();
    await page.getByLabel('Indicator').selectOption('gdp-per-capita');
    await expect(page).toHaveURL(/indicator=gdp-per-capita/);
    await expect(page.locator('.ag-center-cols-container [row-id="HU"]')).toContainText('€');
    expect(requested).toContain('nama_10_pc');

    await page.reload();
    await expect(page.getByLabel('Indicator')).toHaveValue('gdp-per-capita');
  });

  test('shows an error with a retry when Eurostat is down', async ({ page }) => {
    await mockEurostat(page, { failFirst: true });
    await page.goto('./');
    await expect(page.getByRole('alert')).toContainText('503');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.locator('[row-id="HU"]').first()).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});

test.describe('compare view', () => {
  test('charts the default countries plus the EU average', async ({ page }) => {
    await mockEurostat(page);
    await page.goto('./compare');
    await expect(page.locator('path[data-series]')).toHaveCount(6); // HU, AT, CZ, PL, SK + EU-27
    await expect(page.locator('tr[data-geo="HU"]')).toContainText('Hungary');
  });

  test('adding a country adds a line and is kept in the URL', async ({ page }) => {
    await mockEurostat(page);
    await page.goto('./compare');
    await page.getByLabel('Austria').uncheck();
    await page.getByLabel('Romania').check();
    await expect(page).toHaveURL(/geos=HU%2CCZ%2CPL%2CSK%2CRO|geos=HU,CZ,PL,SK,RO/);
    await expect(page.locator('path[data-series="RO"]')).toHaveCount(1);
    await expect(page.locator('path[data-series="AT"]')).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel('Romania')).toBeChecked();
  });

  test('limits the selection to six countries', async ({ page }) => {
    await mockEurostat(page);
    await page.goto('./compare');
    await page.getByLabel('Germany').check();
    await expect(page.getByLabel('France')).toBeDisabled();
  });
});
