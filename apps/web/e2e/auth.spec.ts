import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const login = `e2e_${Date.now().toString(36)}`
test('register lands on feed with greeting, survives reload, logout returns to login', async ({
  page,
}) => {
  await page.goto('/register')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Имя').fill('Тест')
  await page.getByLabel('Фамилия').fill('Плейрайт')
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/feed$/)
  await expect(page.getByText('Здравствуйте, Тест')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Здравствуйте, Тест')).toBeVisible()
  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/login$/)
})

test('login with wrong password shows error, then succeeds', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Пароль').fill('nope')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByText('Неверный логин или пароль')).toBeVisible()
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/feed$/)
})

test('nav items open placeholder pages, not 404', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).toHaveURL(/\/feed$/)
  await page.getByRole('link', { name: /Мессенджер/ }).click()
  await expect(page).toHaveURL(/\/im$/)
  await expect(page.getByText('Раздел скоро откроется')).toBeVisible()
  await expect(page.getByRole('link', { name: /Мессенджер/ })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByRole('banner')).toBeVisible()
})
