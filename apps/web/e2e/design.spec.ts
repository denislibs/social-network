import { mkdirSync } from 'node:fs'
import { expect, type Page, test } from '@playwright/test'

/**
 * Design-parity checks against vk.ru's desktop layout (see
 * `docs/reference/vk-ru-vkui-map.md`): the shell's geometry, the profile header spanning both
 * content columns, and a set of screenshots for eyeballing light/dark. Screenshots land in
 * `apps/web/test-results/design/` (gitignored).
 */

const OUT_DIR = 'test-results/design'
const SCHEMES = ['light', 'dark'] as const
const SCREENS = [
  { name: 'profile', path: '/demo', anchor: 'Записей пока нет' },
  { name: 'feed', path: '/feed', anchor: 'Лента' },
  { name: 'friends', path: '/friends', anchor: 'Друзья' },
  { name: 'communities', path: '/communities', anchor: 'Сообщества' },
  { name: 'community', path: '/clubplenochnyyklub', anchor: 'Плёночный клуб' },
] as const

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Логин').fill('demo')
  await page.getByLabel('Пароль').fill('demo1234')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/feed$/)
}

async function boxOf(page: Page, locator: ReturnType<Page['locator']>) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  expect(box, 'element has a bounding box').not.toBeNull()
  return box as NonNullable<typeof box>
}

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await login(page)
})

test('shell geometry: 48px header and a 200px left menu', async ({ page }) => {
  const header = await boxOf(page, page.getByRole('banner'))
  expect(header.height).toBe(48)

  const nav = await boxOf(page, page.getByRole('navigation', { name: 'Основная навигация' }))
  expect(nav.width).toBe(200)

  // vk.ru's menu rows are 40px tall with 24px icons.
  const firstRow = await boxOf(page, page.getByRole('link', { name: /Профиль/ }))
  expect(firstRow.height).toBeGreaterThanOrEqual(40)
  expect(firstRow.height).toBeLessThanOrEqual(48)
})

test('profile: full-width cover with the avatar overlapping it on the left', async ({ page }) => {
  await page.goto('/demo')
  await expect(page.getByText('Записей пока нет')).toBeVisible()

  const cover = await boxOf(page, page.getByTestId('profile-cover'))
  expect(cover.height).toBeGreaterThanOrEqual(180)

  const avatar = await boxOf(page, page.getByTestId('profile-avatar'))
  // Overlap: the avatar starts above the cover's bottom edge and ends below it.
  expect(avatar.y).toBeLessThan(cover.y + cover.height)
  expect(avatar.y + avatar.height).toBeGreaterThan(cover.y + cover.height)
  // Left inset, as on vk.ru.
  expect(avatar.x - cover.x).toBeLessThanOrEqual(40)

  // The header card spans both columns: it is wider than the wall column and sits above it.
  const main = await boxOf(page, page.getByRole('main'))
  const aside = await boxOf(page, page.getByLabel('Дополнительно'))
  expect(cover.width).toBeGreaterThan(main.width)
  expect(cover.y + cover.height).toBeLessThanOrEqual(main.y)
  expect(cover.y + cover.height).toBeLessThanOrEqual(aside.y)

  // The counters live in the right column now.
  await expect(page.getByLabel('Дополнительно').getByText(/^Друзья \d+$/)).toBeVisible()
})

test('community cover matches the profile cover width, like the profile header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1728, height: 963 })

  await page.goto('/demo')
  const profileCover = await boxOf(page, page.getByTestId('profile-cover'))

  await page.goto('/clubplenochnyyklub')
  const communityCover = await boxOf(page, page.getByTestId('community-cover'))
  expect(communityCover.width).toBe(profileCover.width)
})

test('content columns are 551 + 345 at 1728px', async ({ page }) => {
  await page.setViewportSize({ width: 1728, height: 963 })
  await page.goto('/feed')
  await expect(page.getByRole('main')).toBeVisible()

  const main = await boxOf(page, page.getByRole('main'))
  const aside = await boxOf(page, page.getByLabel('Дополнительно'))
  expect(main.width).toBe(551)
  expect(aside.width).toBe(345)
  expect(Math.round(aside.x - (main.x + main.width))).toBe(16)
})

for (const scheme of SCHEMES) {
  test(`captures design screenshots (${scheme})`, async ({ page }) => {
    // Ten full-page screenshots per scheme; the default 30s budget is not enough.
    test.setTimeout(180_000)
    mkdirSync(OUT_DIR, { recursive: true })
    await page.evaluate((value) => localStorage.setItem('vk-scheme', value), scheme)
    for (const size of [
      { width: 1280, height: 900 },
      { width: 1728, height: 963 },
    ]) {
      await page.setViewportSize(size)
      for (const screen of SCREENS) {
        await page.goto(screen.path)
        await expect(page.getByText(screen.anchor).first()).toBeVisible()
        // The right column loads after the main one; wait for it so the shots are not
        // a mix of loaded and skeleton states.
        await page.waitForLoadState('networkidle')
        await page.screenshot({
          path: `${OUT_DIR}/${screen.name}-${scheme}-${size.width}.png`,
          fullPage: true,
        })
      }
    }
  })
}
