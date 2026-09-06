import { expect, type Page, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const ts = Date.now().toString(36)
const loginA = `e2e_a_${ts}`
const loginB = `e2e_b_${ts}`
const bHandle = `b${ts}`
const clubHandle = `klub_e2e_${ts}`
const clubName = `Клуб e2e ${ts}`

async function register(page: Page, login: string, firstName: string, lastName: string) {
  await page.goto('/register')
  await page.getByLabel('Логин').fill(login)
  await page.getByLabel('Имя').fill(firstName)
  await page.getByLabel('Фамилия').fill(lastName)
  await page.getByLabel('Пароль').fill('password123')
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click()
  await expect(page).toHaveURL(/\/feed$/)
}

test('friend request, leader-tab notification, and community join across two users', async ({
  browser,
}) => {
  test.setTimeout(90_000)

  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB1 = await contextB.newPage()

  // 1. B registers, sets a status and a screen name; the profile opens at /b<ts> and shows it.
  await register(pageB1, loginB, 'Б', 'Тестов')
  await pageB1.goto('/edit')
  await pageB1.getByLabel('Статус').fill('Привет из e2e')
  await pageB1.getByLabel('Короткое имя').fill(bHandle)
  await pageB1.getByRole('button', { name: 'Сохранить' }).click()
  await expect(pageB1).toHaveURL(new RegExp(`/${bHandle}$`))
  await expect(pageB1.getByText('Привет из e2e')).toBeVisible()

  // B keeps a second tab open on /feed from here on, so the leader-tab polling/broadcast below
  // has to carry the unread count into it without a reload.
  const pageB2 = await contextB.newPage()
  await pageB2.goto('/feed')

  // 2. A registers, finds B via the header search, opens the profile and sends a request.
  await register(pageA, loginA, 'А', 'Тестова')
  await pageA.getByRole('searchbox').fill(bHandle)
  await pageA.getByRole('searchbox').press('Enter')
  await expect(pageA).toHaveURL(new RegExp(`/search\\?q=${bHandle}`))
  await pageA
    .getByRole('link', { name: /Б Тестов/ })
    .first()
    .click()
  await expect(pageA).toHaveURL(new RegExp(`/${bHandle}$`))
  await pageA.getByRole('button', { name: 'Добавить в друзья' }).click()
  await expect(pageA.getByRole('button', { name: 'Заявка отправлена' })).toBeVisible()

  // 3. B (page 1) sees the incoming request; B's other tab (page 2) picks up the unread bell
  // counter purely through leader-tab polling/broadcast — no reload.
  await pageB1.goto('/friends?tab=requests')
  await expect(pageB1.getByText('А Тестова')).toBeVisible()
  await expect(pageB1.getByRole('button', { name: 'Принять' })).toBeVisible()

  await expect(pageB2.getByRole('button', { name: /непрочитанных: 1/ })).toBeVisible({
    timeout: 45_000,
  })

  // 4. B accepts; A sees the notification and B's profile now shows they are friends.
  await pageB1.getByRole('button', { name: 'Принять' }).click()
  await expect(pageB1.getByRole('button', { name: 'Принять' })).toHaveCount(0)

  await pageA.goto('/notifications')
  await expect(pageA.getByText(/Б Тестов принял\(а\) вашу заявку/)).toBeVisible()

  await pageA.goto(`/${bHandle}`)
  await expect(pageA.getByRole('button', { name: 'У вас в друзьях' })).toBeVisible()

  // 5. A creates a community; B joins it and the header count updates to 2.
  await pageA.goto('/communities')
  await pageA.getByRole('button', { name: 'Создать сообщество' }).click()
  await expect(pageA.getByText('Новое сообщество')).toBeVisible()
  await pageA.getByLabel('Название').fill(clubName)
  await pageA.getByLabel('Короткое имя').fill(clubHandle)
  await pageA.getByRole('button', { name: 'Создать', exact: true }).click()
  await expect(pageA).toHaveURL(new RegExp(`/${clubHandle}$`))

  await pageB1.goto(`/${clubHandle}`)
  await pageB1.getByRole('button', { name: 'Вступить' }).click()
  await expect(pageB1.getByText('2 участника')).toBeVisible()

  // 6. A's suggestions tab renders without crashing (the list may be empty).
  await pageA.goto('/friends?tab=suggestions')
  await expect(pageA.getByText('Возможно, вы знакомы')).toBeVisible()

  await contextA.close()
  await contextB.close()
})
