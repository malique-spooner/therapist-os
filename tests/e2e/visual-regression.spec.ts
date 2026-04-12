import { expect, test, type Page } from '@playwright/test';

type DataMode = 'real-only' | 'demo-only';

const PAGE_SEQUENCE = [
  { id: 'dashboard', label: 'Home' },
  { id: 'health', label: 'Health' },
  { id: 'therapist', label: 'Mind' },
  { id: 'habits', label: 'Habits' },
  { id: 'relationships', label: 'People' },
  { id: 'finance', label: 'Money' },
  { id: 'consumption', label: 'Media' },
  { id: 'location', label: 'Places' },
  { id: 'brain', label: 'Brain' },
] as const;

function londonIsoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function stubCheckInEndpoints(page: Page) {
  const today = londonIsoToday();
  const payload = {
    date: today,
    timestamp: new Date(`${today}T08:00:00Z`).getTime(),
    emotionalState: 3,
    energyLevel: 3,
    oneWord: 'steady',
  };

  await page.route('**/api/checkins?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([payload]),
    });
  });

  await page.route('**/api/checkins/today**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });
}

async function seedSettings(page: Page, mode: DataMode) {
  await page.addInitScript((selectedMode: DataMode) => {
    localStorage.setItem(
      'therapist-os-settings',
      JSON.stringify({
        state: {
          theme: 'light',
          textSize: 'medium',
          dataMode: selectedMode,
        },
        version: 0,
      }),
    );
  }, mode);
}

async function openApp(page: Page, mode: DataMode) {
  await seedSettings(page, mode);
  await stubCheckInEndpoints(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await completeDailyCheckInIfNeeded(page);
  await expect(page.getByText(/good morning|good afternoon|good evening/i).first()).toBeVisible();
  await completeDailyCheckInIfNeeded(page);
}

async function navigateTo(page: Page, label: string) {
  if (label === 'Home') return;
  await completeDailyCheckInIfNeeded(page);
  await page.waitForTimeout(150);
  const candidate = page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
  await candidate.last().click();
}

async function completeDailyCheckInIfNeeded(page: Page) {
  const heading = page.getByRole('heading', { name: 'Start with how you feel' });
  await heading.waitFor({ state: 'visible', timeout: 1500 }).catch(() => null);
  if (!(await heading.isVisible().catch(() => false))) return;

  const goToDashboard = page.getByRole('button', { name: /^Go to dashboard$/i });
  if (!(await goToDashboard.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /neutral/i }).click();
    await page.getByRole('button', { name: /okay/i }).click();
    await page.getByRole('button', { name: /^Start my day$/i }).click();
  }

  await goToDashboard.click();
  await goToDashboard.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null);
}

test.describe('visual regression by data mode', () => {
  for (const mode of ['real-only', 'demo-only'] as const) {
    test.describe(mode, () => {
      for (const target of PAGE_SEQUENCE) {
        test(`captures ${target.id}`, async ({ page }) => {
          await openApp(page, mode);
          await navigateTo(page, target.label);
          await page.waitForTimeout(300);
          await expect(page).toHaveScreenshot(`${target.id}-${mode}.png`, {
            fullPage: true,
          });
        });
      }
    });
  }
});
