# Web → React 19 + VKUI + FSD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить `apps/web` (SolidJS + `packages/ui-kit`) на React 19 + VKUI 8 по Feature-Sliced Design с автоматической проверкой правил (Steiger, oxlint, тест `vkui-only`), сохранив поведение подсистемы 1 (оболочка, вход, регистрация, guard, лента-заглушка, тема) и Playwright-сценарии без изменений.

**Architecture:** FSD-слои `app → pages → widgets → features → entities → shared` в `apps/web/src`, алиас `@/` → `apps/web/src`. VKUI даёт все компоненты и лейаут (`SplitLayout` 200/551/345, `Group mode="card"`, плотность `compact`); react-router 8 владеет URL; TanStack Query — серверное состояние; сессия — контекст в `entities/session`, реагирующий на событие 401 из `shared/api`. Спек: `docs/superpowers/specs/2026-09-06-web-react-vkui-migration-design.md`; карта компонентов vk.ru: `docs/reference/vk-ru-vkui-map.md`.

**Tech Stack:** Bun 1.4, TypeScript 7, Vite 8 + `@vitejs/plugin-react` 6, React 19.2, `react-router` 8, `@tanstack/react-query` 5, `@vkontakte/vkui` 8.4, `@vkontakte/icons` 3.69, oxlint 1.81, `steiger` 0.6 + `@feature-sliced/steiger-plugin` 0.7, Biome 2.5 (форматтер), Vitest 5 + `@testing-library/react` 16 + jest-dom, Playwright.

## Global Constraints

- Только VKUI: компоненты из `@vkontakte/vkui`, иконки из `@vkontakte/icons`, цвета/размеры только через `var(--vkui--…)`. Никаких `<button>/<input>/<select>/<textarea>/<a>` в TSX (кроме `shared/ui`-адаптеров, которых в этом подпроекте нет), никаких hex/rgb/hsl, `font-size`, `font-family` в `apps/web/src`. Перед написанием UI — сверять пропсы по MCP `vkui` (`get_component_metadata`, `get_examples`) или по `node_modules/@vkontakte/vkui/dist/components/<Name>/<Name>.d.ts`.
- FSD: импорты только сверху вниз (`app → pages → widgets → features → entities → shared`); слайсы одного слоя не импортируют друг друга; внутрь слайса — только через его `index.ts`; сегменты `ui/`, `model/`, `api/`, `lib/`. Слайсы подпроекта: `pages/{login,register,feed,not-found}`, `widgets/app-shell`, `features/auth` (сегменты `ui/LoginForm`, `ui/RegisterForm`, `ui/LogoutButton`, `model/errors`, `api/authApi`), `features/theme` (`ui/ThemeToggle`), `entities/session`, `entities/user`, `shared/{api,config,lib}`. (Отклонение от спека: `features/auth/{login,register,logout}` схлопнуты в один слайс `features/auth` с сегментами — иначе Steiger `insignificant-slice` и `excessive-slicing` ругаются на слайсы с одной ссылкой; отражено в Task 7.)
- Тексты UI фиксированы (их проверяет Playwright): лейблы «Логин», «Пароль», «Имя», «Фамилия»; кнопки «Войти», «Зарегистрироваться», «Выйти»; приветствие «Здравствуйте, {firstName}»; ошибки `invalid_credentials` → «Неверный логин или пароль», `login_taken` → «Логин занят», `weak_password` → «Минимум 8 символов», `invalid_login` → «3–32 символа: латиница, цифры, _ .», `empty_name` → «Введите имя и фамилию», `validation` → «Заполните все поля», прочее → «Что-то пошло не так».
- Провайдеры в `app/main.tsx` строго в порядке: `ConfigProvider` → `AdaptivityProvider` → `AppRoot` → `QueryClientProvider` → `SessionProvider` → `RouterProvider`.
- Пакет `@vkc/web`; `apps/web/e2e/auth.spec.ts` и `apps/web/playwright.config.ts` не меняются по содержанию тестов (конфиг — только если нужен для запуска).
- Линт: `bun run lint` = oxlint + Steiger + Biome-форматтер; всё exit 0. `bun run typecheck` (TS 7) чистый. Юнит-лейн (`bun run test:unit`) без БД.
- Коммиты: Conventional Commits, английский, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Работа в ветке `feat/web-react-vkui` от `master`.

---

## File Structure

```
.oxlintrc.json                     oxlint: плагины, правила, FSD-overrides
steiger.config.mjs                  Steiger: fsd.configs.recommended + отключения
biome.json                         linter.enabled=false для js/ts (формат + css/json остаются)
package.json                       scripts lint / lint:fsd / test:unit (web)
.github/workflows/ci.yml           lint-лейн: oxlint + steiger; unit-лейн: vitest web
apps/web/
  package.json, tsconfig.json, vite.config.ts, vitest.config.ts, vitest.setup.ts, index.html
  e2e/auth.spec.ts, playwright.config.ts   (из подсистемы 1)
  src/
    app/
      main.tsx                     точка входа, провайдеры
      router.tsx                   createBrowserRouter + lazy pages
      providers/QueryProvider.tsx
      theme/theme.ts               чтение/запись схемы, matchMedia для system
      theme/useColorScheme.ts      React-хук над theme.ts
      styles/global.css            только импорт vkui.css и html/body сброс на токенах
    pages/
      login/{index.ts,ui/LoginPage.tsx}
      register/{index.ts,ui/RegisterPage.tsx}
      feed/{index.ts,ui/FeedPage.tsx}
      not-found/{index.ts,ui/NotFoundPage.tsx}
    widgets/app-shell/{index.ts,ui/AppShell.tsx,ui/AppHeader.tsx,ui/SideNav.tsx,ui/app-shell.module.css,model/nav.ts,ui/AppShell.test.tsx}
    features/auth/{index.ts,api/authApi.ts,model/errors.ts,ui/LoginForm.tsx,ui/RegisterForm.tsx,ui/LogoutButton.tsx,ui/LoginForm.test.tsx,ui/RegisterForm.test.tsx}
    features/theme/{index.ts,ui/ThemeToggle.tsx}
    entities/session/{index.ts,model/SessionProvider.tsx,model/useSession.ts,model/session.test.tsx,ui/RequireAuth.tsx}
    entities/user/{index.ts,model/types.ts,ui/UserAvatar.tsx}
    shared/api/{index.ts,client.ts,unauthorized.ts,client.test.ts}
    shared/config/{index.ts,env.ts,storage-keys.ts}
    shared/lib/{index.ts,initials.ts}
    vkui-only.test.ts              архитектурный тест
```

---

### Task 1: Remove Solid web app and ui-kit; keep the repo green without a web app

**Files:**
- Delete: `packages/ui-kit/` (целиком), `apps/web/src/`, `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/tsconfig.json`, `apps/web/biome.json`, `apps/web/package.json`
- Keep: `apps/web/e2e/auth.spec.ts`, `apps/web/playwright.config.ts`
- Modify: `biome.json` (убрать override для `packages/ui-kit/src/tokens/*.css`, игноры `**/sprite.svg`, `**/names.ts`), `package.json` (root: убрать `@vkc/ui-kit`/`@vkc/web` из `test:unit`, временно), `.github/workflows/ci.yml` (ничего про ui-kit не осталось — проверить), `README.md` (упоминания ui-kit), `.gitignore` (строки `apps/web/dist/` остаются)

**Interfaces:**
- Produces: репозиторий без Solid-кода; `bun install`, `bun run lint`, `bun run typecheck`, `bun run test:unit`, `bun run test:integration` зелёные; `apps/web` содержит только e2e и playwright-конфиг (пакет `@vkc/web` появится в Task 3).

- [ ] **Step 1: Ветка**

```bash
git checkout master && git pull --ff-only origin master && git checkout -b feat/web-react-vkui
```

- [ ] **Step 2: Удалить код**

```bash
git rm -r -q packages/ui-kit apps/web/src apps/web/index.html apps/web/vite.config.ts apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/tsconfig.json apps/web/biome.json apps/web/package.json
ls apps/web   # ожидается: e2e  playwright.config.ts
```

- [ ] **Step 3: Почистить конфиги**

В `biome.json`: удалить из `files.includes` строки `!**/sprite.svg`, `!**/names.ts`; удалить override с `packages/ui-kit/src/tokens/*.css`; в override с `noNonNullAssertion` оставить только тесты и `apps/seeder/src/**`.
В root `package.json` скрипт `test:unit`: убрать `bun run --filter @vkc/ui-kit test && bun run --filter @vkc/web test && ` (вернём web в Task 3). В `README.md` заменить упоминания `packages/ui-kit` на «фронт: React + VKUI, см. спек 2026-09-06». Проверить `grep -rn "ui-kit" --include='*.json' --include='*.yml' --include='*.md' . | grep -v node_modules | grep -v docs/superpowers` — пусто (кроме спеков/планов).

- [ ] **Step 4: Проверить**

```bash
bun install && bun run lint && bun run typecheck && set -a && source .env && set +a && bun run test:unit && bun run test:integration
```
Expected: всё exit 0; `bun.lock` пересчитан (закоммитить).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore(web): remove solid app and ui-kit ahead of react+vkui migration"
```

---

### Task 2: oxlint + Steiger + Biome as formatter only

**Files:**
- Create: `.oxlintrc.json`, `steiger.config.mjs`
- Modify: `biome.json`, `package.json` (root devDeps + scripts), `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `bun run lint` = `oxlint . && bun run lint:fsd && biome check .` где Biome с выключенным линтером для JS/TS; `bun run lint:fsd` = `steiger apps/web/src` (пока `apps/web/src` нет — скрипт должен корректно завершаться: Steiger на несуществующей папке падает, поэтому до Task 3 `lint:fsd` = `test -d apps/web/src && steiger apps/web/src || echo "no web src yet"`; в Task 3 заменить на чистый вызов).
- FSD-правила в oxlint через `no-restricted-imports` с `patterns` по слоям (алиас `@/`).

- [ ] **Step 1: Установить**

```bash
bun add -d oxlint@^1.81.0 steiger@^0.6.0 @feature-sliced/steiger-plugin@^0.7.0
```

- [ ] **Step 2: `.oxlintrc.json`**

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "import", "react", "react-hooks", "jsx-a11y", "unicorn"],
  "env": { "browser": true, "es2024": true },
  "settings": { "react": { "version": "19.2" } },
  "ignorePatterns": ["**/node_modules/**", "**/dist/**", "**/drizzle/**", "docs/reference/**", "apps/web/playwright-report/**", "apps/web/test-results/**"],
  "categories": { "correctness": "error", "suspicious": "warn" },
  "rules": {
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-imports": "error",
    "import/no-cycle": ["error", { "maxDepth": 4 }],
    "react/jsx-key": "error",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/label-has-associated-control": "off",
    "no-restricted-imports": ["error", { "paths": [{ "name": "solid-js", "message": "Фронт на React" }, { "name": "@vkc/ui-kit", "message": "ui-kit удалён, используйте @vkontakte/vkui" }] }]
  },
  "overrides": [
    { "files": ["apps/api/**", "apps/seeder/**", "packages/**", "scripts/**"], "rules": { "react-hooks/rules-of-hooks": "off", "react-hooks/exhaustive-deps": "off" } },
    { "files": ["apps/web/src/shared/**"], "rules": { "no-restricted-imports": ["error", { "patterns": [{ "group": ["@/entities/*", "@/features/*", "@/widgets/*", "@/pages/*", "@/app/*", "**/entities/**", "**/features/**", "**/widgets/**", "**/pages/**", "**/app/**"], "message": "FSD: shared не импортирует слои выше" }] }] } },
    { "files": ["apps/web/src/entities/**"], "rules": { "no-restricted-imports": ["error", { "patterns": [{ "group": ["@/features/*", "@/widgets/*", "@/pages/*", "@/app/*", "**/features/**", "**/widgets/**", "**/pages/**", "**/app/**"], "message": "FSD: entities не импортирует features/widgets/pages/app" }] }] } },
    { "files": ["apps/web/src/features/**"], "rules": { "no-restricted-imports": ["error", { "patterns": [{ "group": ["@/widgets/*", "@/pages/*", "@/app/*", "**/widgets/**", "**/pages/**", "**/app/**"], "message": "FSD: features не импортирует widgets/pages/app" }] }] } },
    { "files": ["apps/web/src/widgets/**"], "rules": { "no-restricted-imports": ["error", { "patterns": [{ "group": ["@/pages/*", "@/app/*", "**/pages/**", "**/app/**"], "message": "FSD: widgets не импортирует pages/app" }] }] } },
    { "files": ["apps/web/src/pages/**"], "rules": { "no-restricted-imports": ["error", { "patterns": [{ "group": ["@/app/*", "**/app/**"], "message": "FSD: pages не импортирует app" }] }] } },
    { "files": ["**/*.test.ts", "**/*.test.tsx", "**/*.test-d.ts"], "rules": { "typescript/no-non-null-assertion": "off" } }
  ]
}
```

Если oxlint 1.81 не принимает какой-то ключ (`categories`, `settings.react`, `ignorePatterns`) — сверить с `node_modules/oxlint/configuration_schema.json` и поправить имя, не удаляя правило. Если `no-restricted-imports.patterns` с `group` не поддерживается — использовать форму `"patterns": ["@/entities/*", …]` (массив строк), сообщение потеряется, правило останется.

- [ ] **Step 3: `steiger.config.mjs`**

```ts
import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Проект на старте: у многих слайсов одна ссылка (например, features/theme используется только в app-shell).
    // Включить обратно в подсистеме 2, когда появятся лента/профиль.
    rules: { 'fsd/insignificant-slice': 'off' },
  },
])
```

- [ ] **Step 4: Biome — только форматтер для JS/TS**

В `biome.json` заменить блок `linter` на:
```json
"linter": { "enabled": true, "rules": { "recommended": false }, "includes": ["**/*.css", "**/*.json"] }
```
(если Biome 2.5 требует другой ключ для ограничения линтера по файлам — использовать `overrides` с `linter.enabled: false` для `**/*.{ts,tsx,js,mjs}`). Форматтер остаётся для всех типов.

- [ ] **Step 5: Скрипты**

В root `package.json`:
```json
"lint": "oxlint . && bun run lint:fsd && biome check .",
"lint:fsd": "test -d apps/web/src && steiger apps/web/src || echo 'no web src yet'",
"format": "biome format --write . && oxlint --fix ."
```

- [ ] **Step 6: CI**

В `.github/workflows/ci.yml` лейн `lint-typecheck` уже вызывает `bun run lint` — убедиться, что он не ссылается на biome напрямую. Ничего больше.

- [ ] **Step 7: Проверить**

```bash
bun run lint && bun run typecheck
```
Expected: oxlint печатает `Found 0 errors` (предупреждения допустимы), `no web src yet`, Biome `Checked N files`. Затем создать временный файл `apps/api/src/tmp.ts` с `import 'solid-js'` → `oxlint apps/api/src/tmp.ts` должен выдать ошибку `no-restricted-imports`; удалить файл.

- [ ] **Step 8: Commit**

```bash
git add .oxlintrc.json steiger.config.mjs biome.json package.json bun.lock .github
git commit -m "chore(lint): oxlint with FSD layer rules, steiger, biome as formatter"
```

---

### Task 3: Web scaffold — Vite/React/VKUI, app layer, shared layer, FSD skeleton

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `index.html`, `src/app/main.tsx`, `src/app/router.tsx`, `src/app/composition/QueryProvider.tsx`, `src/app/styles/global.css`, `src/shared/config/{index.ts,env.ts,storage-keys.ts}`, `src/shared/lib/{index.ts,initials.ts,initials.test.ts}`, `src/shared/lib/color-scheme/{index.ts,theme.ts,theme.test.ts,useColorScheme.ts}`, `src/shared/api/{index.ts,client.ts,unauthorized.ts,client.test.ts}`, `src/pages/not-found/{index.ts,ui/NotFoundPage.tsx}`
- Modify: root `package.json` (`test:unit` снова включает web; `lint:fsd` = `steiger apps/web/src`)

**Interfaces:**
- Produces:
  - `@/shared/config`: `APP_ORIGIN = window.location.origin`, `STORAGE_KEYS = { colorScheme: 'vk-scheme' } as const`.
  - `@/shared/lib`: `initials(firstName: string, lastName: string): string` → первые буквы, верхний регистр («ДК»).
  - `@/shared/api`: `api` (Eden-клиент), `class ApiError extends Error { status: number; code: string }`, `unwrap<T>(res: { data: T | null; error: { status: number; value: unknown } | null }, opts?: { silent401?: boolean }): T` — при 401 и не `silent401` вызывает `emitUnauthorized()`; `onUnauthorized(handler: () => void): () => void` (подписка, возвращает отписку).
  - `@/shared/lib` (подпапка `color-scheme`, реэкспорт из `shared/lib/index.ts`): `type ColorSchemePref = 'light' | 'dark' | 'system'`, `getPref(): ColorSchemePref`, `setPref(p)`, `resolveScheme(p, prefersDark: boolean): 'light' | 'dark'`, `nextPref(p)` (light → dark → system → light), `applyDocumentAttr(scheme)` (ставит `document.documentElement.dataset.vkScheme`); `useColorScheme(): { pref, scheme, cycle }`.
  - Роутер: `router = createBrowserRouter([...])` с маршрутами `/` → redirect `/feed`, `/feed`, `/login`, `/register`, `*`; страницы через `lazy` — в этой задаче все, кроме `not-found`, временно указывают на `NotFoundPage` (заменяются в Task 6).
  - Vitest: jsdom, `@testing-library/jest-dom/vitest`, полифиллы `matchMedia` и `ResizeObserver` в `vitest.setup.ts` (VKUI их использует).

- [ ] **Step 1: package.json, tsconfig, vite, vitest**

`apps/web/package.json`:
```json
{
  "name": "@vkc/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "typecheck": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.102.8",
    "@vkc/contracts": "workspace:*",
    "@vkontakte/icons": "^3.69.0",
    "@vkontakte/vkui": "^8.4.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router": "^8.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.1.1",
    "jsdom": "^26.0.0",
    "vite": "^8.2.2",
    "vitest": "^5.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "types": ["vite/client"], "baseUrl": ".", "paths": { "@/*": ["./src/*"] } },
  "include": ["src", "e2e", "vite.config.ts", "vitest.config.ts", "vitest.setup.ts", "playwright.config.ts"]
}
```
(если TS 7 отверг `baseUrl` — оставить только `paths` с `"@/*": ["./src/*"]`, это разрешено без baseUrl.)

`vite.config.ts`:
```ts
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } } },
})
```

`vitest.config.ts`:
```ts
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['./vitest.setup.ts'], css: false },
})
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'

if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }) as MediaQueryList
}
if (!('ResizeObserver' in window)) {
  class RO { observe() {} unobserve() {} disconnect() {} }
  Object.defineProperty(window, 'ResizeObserver', { value: RO })
}
```

`index.html` (анти-FOUC: единственное место вне `src/` с явным цветом — фон до загрузки CSS VKUI; значение равно `--vkui--color_background` тёмной схемы):
```html
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ВКлон</title>
  <script>
    (function () {
      try {
        var p = localStorage.getItem('vk-scheme');
        var dark = p === 'dark' || (p !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.dataset.vkScheme = dark ? 'dark' : 'light';
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        if (dark) document.documentElement.style.background = '#19191a';
      } catch (e) {}
    })();
  </script>
</head>
<body><div id="root"></div><script type="module" src="/src/app/main.tsx"></script></body>
</html>
```

- [ ] **Step 2: Failing tests: theme, initials, api client**

`src/shared/lib/color-scheme/theme.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { getPref, nextPref, resolveScheme, setPref } from './theme'

beforeEach(() => localStorage.clear())
describe('theme', () => {
  it('defaults to system and persists explicit choice', () => {
    expect(getPref()).toBe('system')
    setPref('dark')
    expect(localStorage.getItem('vk-scheme')).toBe('dark')
    expect(getPref()).toBe('dark')
    setPref('system')
    expect(localStorage.getItem('vk-scheme')).toBeNull()
  })
  it('resolves system by OS preference', () => {
    expect(resolveScheme('system', true)).toBe('dark')
    expect(resolveScheme('system', false)).toBe('light')
    expect(resolveScheme('light', true)).toBe('light')
  })
  it('cycles light → dark → system → light', () => {
    expect(nextPref('light')).toBe('dark'); expect(nextPref('dark')).toBe('system'); expect(nextPref('system')).toBe('light')
  })
})
```

`src/shared/lib/initials.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { initials } from './initials'
describe('initials', () => {
  it('takes first letters upper-cased', () => { expect(initials('денис', 'кораблев')).toBe('ДК') })
  it('tolerates empty parts', () => { expect(initials('', 'к')).toBe('К'); expect(initials('', '')).toBe('') })
})
```

`src/shared/api/client.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { ApiError, unwrap } from './client'
import { onUnauthorized } from './unauthorized'

describe('unwrap', () => {
  it('returns data', () => { expect(unwrap({ data: { ok: 1 }, error: null })).toEqual({ ok: 1 }) })
  it('throws ApiError with code/message from body', () => {
    expect(() => unwrap({ data: null, error: { status: 409, value: { error: { code: 'login_taken', message: 'Login is already taken' } } } })).toThrowError(expect.objectContaining({ status: 409, code: 'login_taken', message: 'Login is already taken' }))
  })
  it('maps bodyless 422 to validation', () => {
    try { unwrap({ data: null, error: { status: 422, value: 'x' } }) } catch (e) { expect(e).toBeInstanceOf(ApiError); expect((e as ApiError).code).toBe('validation') }
  })
  it('emits unauthorized on 401 unless silenced', () => {
    const h = vi.fn(); const off = onUnauthorized(h)
    expect(() => unwrap({ data: null, error: { status: 401, value: {} } })).toThrow()
    expect(h).toHaveBeenCalledTimes(1)
    expect(() => unwrap({ data: null, error: { status: 401, value: {} } }, { silent401: true })).toThrow()
    expect(h).toHaveBeenCalledTimes(1)
    off()
  })
})
```

Run: `cd apps/web && bun install && bunx vitest run` → FAIL (модули не найдены).

- [ ] **Step 3: shared/config, shared/lib, shared/api**

`shared/config/env.ts`: `export const APP_ORIGIN = window.location.origin`; `storage-keys.ts`: `export const STORAGE_KEYS = { colorScheme: 'vk-scheme' } as const`; `index.ts` реэкспортирует оба.

`shared/lib/initials.ts`:
```ts
export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase()
}
```
`shared/lib/index.ts`: `export { initials } from './initials'`.

`shared/api/unauthorized.ts`:
```ts
const target = new EventTarget()
export function emitUnauthorized(): void { target.dispatchEvent(new Event('unauthorized')) }
export function onUnauthorized(handler: () => void): () => void {
  target.addEventListener('unauthorized', handler)
  return () => target.removeEventListener('unauthorized', handler)
}
```

`shared/api/client.ts`:
```ts
import { createApi } from '@vkc/contracts'
import { APP_ORIGIN } from '@/shared/config'
import { emitUnauthorized } from './unauthorized'

export const api = createApi(APP_ORIGIN)
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); this.name = 'ApiError' }
}
type EdenResult<T> = { data: T | null; error: { status: number; value: unknown } | null }
export function unwrap<T>(res: EdenResult<T>, opts: { silent401?: boolean } = {}): T {
  if (res.error) {
    const body = res.error.value as { error?: { code?: string; message?: string } } | undefined
    const code = body?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown')
    const message = body?.error?.message ?? 'Request failed'
    if (res.error.status === 401 && !opts.silent401) emitUnauthorized()
    throw new ApiError(res.error.status, code, message)
  }
  return res.data as T
}
```
`shared/api/index.ts`: `export { api, ApiError, unwrap } from './client'; export { onUnauthorized } from './unauthorized'; export type { UserDto } from '@vkc/contracts'` (тип контракта живёт в shared, чтобы `entities/session` и `entities/user` не импортировали друг друга).

- [ ] **Step 4: shared/lib/color-scheme**

`theme.ts`:
```ts
import { STORAGE_KEYS } from '@/shared/config'
export type ColorSchemePref = 'light' | 'dark' | 'system'
export type ColorScheme = 'light' | 'dark'
export function getPref(): ColorSchemePref {
  try { const v = localStorage.getItem(STORAGE_KEYS.colorScheme); return v === 'light' || v === 'dark' ? v : 'system' } catch { return 'system' }
}
export function setPref(p: ColorSchemePref): void {
  try { p === 'system' ? localStorage.removeItem(STORAGE_KEYS.colorScheme) : localStorage.setItem(STORAGE_KEYS.colorScheme, p) } catch {}
}
export function resolveScheme(p: ColorSchemePref, prefersDark: boolean): ColorScheme { return p === 'system' ? (prefersDark ? 'dark' : 'light') : p }
export function nextPref(p: ColorSchemePref): ColorSchemePref { return p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light' }
export function applyDocumentAttr(scheme: ColorScheme): void {
  document.documentElement.dataset.vkScheme = scheme
  document.documentElement.style.colorScheme = scheme
  document.documentElement.style.background = ''
}
```
`useColorScheme.ts`:
```ts
import { useCallback, useEffect, useState } from 'react'
import { type ColorScheme, type ColorSchemePref, applyDocumentAttr, getPref, nextPref, resolveScheme, setPref } from './theme'
export function useColorScheme(): { pref: ColorSchemePref; scheme: ColorScheme; cycle: () => void } {
  const [pref, setPrefState] = useState<ColorSchemePref>(getPref)
  const [prefersDark, setPrefersDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const scheme = resolveScheme(pref, prefersDark)
  useEffect(() => { applyDocumentAttr(scheme) }, [scheme])
  const cycle = useCallback(() => { const n = nextPref(pref); setPref(n); setPrefState(n) }, [pref])
  return { pref, scheme, cycle }
}
```
`color-scheme/index.ts`: `export * from './theme'; export { useColorScheme } from './useColorScheme'`; в `shared/lib/index.ts` добавить `export * from './color-scheme'`.

- [ ] **Step 5: app/providers, styles, router, main, pages/not-found**

`styles/global.css`:
```css
@import '@vkontakte/vkui/dist/vkui.css';
html, body, #root { height: 100%; }
body { margin: 0; }
```

`composition/QueryProvider.tsx`:
```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

`pages/not-found/ui/NotFoundPage.tsx`:
```tsx
import { Group, Panel, Placeholder } from '@vkontakte/vkui'
export function NotFoundPage() {
  return (
    <Panel>
      <Group mode="card">
        <Placeholder title="Страница не найдена">Проверьте адрес или вернитесь в ленту.</Placeholder>
      </Group>
    </Panel>
  )
}
```
`pages/not-found/index.ts`: `export { NotFoundPage } from './ui/NotFoundPage'`.

`app/router.tsx` (временно все страницы = NotFoundPage; в Task 6 подставляются реальные):
```tsx
import { createBrowserRouter, Navigate } from 'react-router'
import { NotFoundPage } from '@/pages/not-found'
export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/feed" replace /> },
  { path: '/feed', element: <NotFoundPage /> },
  { path: '/login', element: <NotFoundPage /> },
  { path: '/register', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
])
```

`app/main.tsx`:
```tsx
import { AdaptivityProvider, AppRoot, ConfigProvider } from '@vkontakte/vkui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { QueryProvider } from './composition/QueryProvider'
import { router } from './router'
import { useColorScheme } from '@/shared/lib'
import './styles/global.css'

function App() {
  const { scheme } = useColorScheme()
  return (
    <ConfigProvider colorScheme={scheme} platform="vkcom">
      <AdaptivityProvider density="compact" hasPointer>
        <AppRoot mode="full">
          <QueryProvider>
            <RouterProvider router={router} />
          </QueryProvider>
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  )
}
createRoot(document.getElementById('root') as HTMLElement).render(<StrictMode><App /></StrictMode>)
```
(`SessionProvider` встанет между `QueryProvider` и `RouterProvider` в Task 4.)

- [ ] **Step 6: Steiger и скрипты**

Root `package.json`: `lint:fsd` → `steiger apps/web/src`; `test:unit` → добавить `bun run --filter @vkc/web test && ` в начало. Прогнать `bun run lint:fsd` — ожидаемые предупреждения по пустым слоям устранить (у каждого слайса есть `index.ts`; `shared/*` сегменты имеют `index.ts`; `app/` без `ui`).

- [ ] **Step 7: Проверить**

```bash
cd apps/web && bunx vitest run && bun run typecheck && cd ../.. && bun run lint && bun run typecheck
```
Затем `cd apps/web && bun run dev` → `http://localhost:5173/feed` показывает VKUI-плейсхолдер «Страница не найдена» в правильной схеме (проверить тёмную: `localStorage.setItem('vk-scheme','dark')` + reload → фон тёмный без белой вспышки). Остановить.

- [ ] **Step 8: Commit**

```bash
git add apps/web package.json bun.lock
git commit -m "feat(web): react + vkui scaffold with FSD skeleton, theme, shared api"
```

---

### Task 4: entities/session and entities/user

**Files:**
- Create: `src/entities/user/{index.ts,model/types.ts,ui/UserAvatar.tsx}`, `src/entities/session/{index.ts,model/SessionProvider.tsx,model/useSession.ts,model/session.test.tsx,ui/RequireAuth.tsx}`
- Modify: `src/app/main.tsx` (вставить `SessionProvider`)

**Interfaces:**
- Produces:
  - `@/entities/user`: `type UserDto` (реэкспорт из `@vkc/contracts`), `UserAvatar({ user, size }: { user: Pick<UserDto,'firstName'|'lastName'|'id'>; size?: 24|28|32|36|40|48|56|72|96 })` — VKUI `Avatar` с `initials={initials(first,last)}` и `gradientColor={(user.id % 6) + 1}`.
  - `@/entities/session`: `SessionProvider({ children })`, `useSession(): { user: UserDto | null; status: 'loading'|'authed'|'guest'; setUser(u: UserDto | null): void; refresh(): Promise<void>; logout(): Promise<void> }`, `RequireAuth({ children })` — `loading` → `PanelSpinner`, `guest` → `Navigate to="/login" state={{ redirect: pathname }}`.
  - На событие `onUnauthorized` провайдер переводит сессию в `guest` (только если была `authed`).

- [ ] **Step 1: Failing test**

`entities/session/model/session.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { me, logoutPost } = vi.hoisted(() => ({ me: vi.fn(), logoutPost: vi.fn() }))
vi.mock('@/shared/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api')>('@/shared/api')
  return { ...actual, api: { api: { v1: { me: { get: me }, auth: { logout: { post: logoutPost } } } } } }
})
import { SessionProvider } from './SessionProvider'
import { useSession } from './useSession'
import { emitUnauthorized } from '@/shared/api/unauthorized'

const user = { id: 1, login: 'demo', firstName: 'Демо', lastName: 'П', screenName: null, createdAt: '' }
function Probe() { const s = useSession(); return <div>{s.status}:{s.user?.login ?? '-'}</div> }
let grabbed: ReturnType<typeof useSession> | undefined
function Grab() { grabbed = useSession(); return null }
beforeEach(() => { me.mockReset(); logoutPost.mockReset(); grabbed = undefined })

describe('SessionProvider', () => {
  it('becomes authed from /me', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    render(<SessionProvider><Probe /></SessionProvider>)
    expect(screen.getByText('loading:-')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
  })
  it('becomes guest on 401', async () => {
    me.mockResolvedValue({ data: null, error: { status: 401, value: {} } })
    render(<SessionProvider><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
  })
  it('logout clears state even if the request fails', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    logoutPost.mockRejectedValueOnce(new Error('network'))
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SessionProvider><Probe /><Grab /></SessionProvider>)
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
    await grabbed!.logout()
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
    expect(err).toHaveBeenCalled(); err.mockRestore()
  })
  it('drops to guest when an unauthorized event fires', async () => {
    me.mockResolvedValue({ data: { user }, error: null })
    render(<SessionProvider><Probe /></SessionProvider>)
    await waitFor(() => expect(screen.getByText('authed:demo')).toBeInTheDocument())
    emitUnauthorized()
    await waitFor(() => expect(screen.getByText('guest:-')).toBeInTheDocument())
  })
})
```
Run: `cd apps/web && bunx vitest run src/entities` → FAIL.

- [ ] **Step 2: entities/user**

`model/types.ts`: `export type { UserDto } from '@/shared/api'`.
`ui/UserAvatar.tsx`:
```tsx
import { Avatar } from '@vkontakte/vkui'
import { initials } from '@/shared/lib'
import type { UserDto } from '@/shared/api'
type Props = { user: Pick<UserDto, 'id' | 'firstName' | 'lastName'>; size?: 24 | 28 | 32 | 36 | 40 | 48 | 56 | 72 | 96 }
export function UserAvatar({ user, size = 32 }: Props) {
  const gradient = ((user.id % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
  return <Avatar size={size} initials={initials(user.firstName, user.lastName)} gradientColor={gradient} aria-label={`${user.firstName} ${user.lastName}`} />
}
```
`index.ts`: `export { UserAvatar } from './ui/UserAvatar'; export type { UserDto } from './model/types'`.

- [ ] **Step 3: entities/session**

`model/SessionProvider.tsx`:
```tsx
import { type ReactNode, createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, api, onUnauthorized, unwrap } from '@/shared/api'
import type { UserDto } from '@/shared/api'

export type SessionStatus = 'loading' | 'authed' | 'guest'
export type Session = { user: UserDto | null; status: SessionStatus; setUser: (u: UserDto | null) => void; refresh: () => Promise<void>; logout: () => Promise<void> }
export const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserDto | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const setUser = useCallback((u: UserDto | null) => { setUserState(u); setStatus(u ? 'authed' : 'guest') }, [])
  const refresh = useCallback(async () => {
    try { setUser(unwrap(await api.api.v1.me.get(), { silent401: true }).user) }
    catch (e) { if (!(e instanceof ApiError && e.status === 401)) console.error(e); setUser(null) }
  }, [setUser])
  const logout = useCallback(async () => {
    try { await api.api.v1.auth.logout.post() } catch (e) { console.error('logout request failed; clearing session anyway', e) } finally { setUser(null) }
  }, [setUser])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => onUnauthorized(() => setStatus((s) => (s === 'authed' ? (setUserState(null), 'guest') : s))), [])
  const value = useMemo(() => ({ user, status, setUser, refresh, logout }), [user, status, setUser, refresh, logout])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
```
`model/useSession.ts`:
```ts
import { useContext } from 'react'
import { type Session, SessionContext } from './SessionProvider'
export function useSession(): Session { const s = useContext(SessionContext); if (!s) throw new Error('useSession outside SessionProvider'); return s }
```
`ui/RequireAuth.tsx`:
```tsx
import { PanelSpinner } from '@vkontakte/vkui'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useSession } from '../model/useSession'
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useSession(); const { pathname } = useLocation()
  if (status === 'loading') return <PanelSpinner />
  if (status === 'guest') return <Navigate to="/login" replace state={{ redirect: pathname }} />
  return <>{children}</>
}
```
`index.ts`: `export { SessionProvider } from './model/SessionProvider'; export { useSession } from './model/useSession'; export { RequireAuth } from './ui/RequireAuth'; export type { Session, SessionStatus } from './model/SessionProvider'`.

`app/main.tsx`: обернуть `RouterProvider` в `SessionProvider` внутри `QueryProvider`.

- [ ] **Step 4: Проверить, коммит**

```bash
cd apps/web && bunx vitest run && bun run typecheck && cd ../.. && bun run lint
```
Expected: session 4 pass; Steiger без ошибок (оба entity-слайса берут `UserDto` из `@/shared/api`, кросс-импортов между ними нет).

```bash
git add apps/web && git commit -m "feat(web): session entity with 401 handling and RequireAuth; user avatar entity"
```

---

### Task 5: features/auth (login, register, logout) and features/theme

**Files:**
- Create: `src/features/auth/{index.ts,api/authApi.ts,model/errors.ts,model/errors.test.ts,ui/LoginForm.tsx,ui/RegisterForm.tsx,ui/LogoutButton.tsx,ui/LoginForm.test.tsx,ui/RegisterForm.test.tsx}`, `src/features/theme/{index.ts,ui/ThemeToggle.tsx}`
- Modify: `src/shared/api/index.ts` (убедиться, что `UserDto` экспортирован)

**Interfaces:**
- Produces:
  - `@/features/auth`: `LoginForm({ onSuccess }: { onSuccess: (u: UserDto) => void })`, `RegisterForm({ onSuccess })`, `LogoutButton()` (VKUI `Button mode="tertiary" size="s"` «Выйти», вызывает `useSession().logout()` и `navigate('/login')`), `messageFor(code: string): string`, `fieldFor(code: string): 'login' | 'password' | 'form'`.
  - `@/features/theme`: `ThemeToggle()` — VKUI `IconButton` с `Icon28MoonOutline`/`Icon28SunOutline`, `aria-label` «Тема: светлая/тёмная/системная», по клику `cycle()`.

- [ ] **Step 1: Failing tests**

`features/auth/model/errors.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fieldFor, messageFor } from './errors'
describe('auth errors', () => {
  it('maps known codes', () => {
    expect(messageFor('invalid_credentials')).toBe('Неверный логин или пароль')
    expect(messageFor('login_taken')).toBe('Логин занят')
    expect(messageFor('weak_password')).toBe('Минимум 8 символов')
    expect(messageFor('invalid_login')).toBe('3–32 символа: латиница, цифры, _ .')
    expect(messageFor('empty_name')).toBe('Введите имя и фамилию')
    expect(messageFor('validation')).toBe('Заполните все поля')
    expect(messageFor('anything_else')).toBe('Что-то пошло не так')
  })
  it('routes codes to fields', () => {
    expect(fieldFor('login_taken')).toBe('login'); expect(fieldFor('invalid_login')).toBe('login'); expect(fieldFor('weak_password')).toBe('password'); expect(fieldFor('invalid_credentials')).toBe('form')
  })
})
```

`features/auth/ui/LoginForm.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
const { login } = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../api/authApi', () => ({ authApi: { login, register: vi.fn() } }))
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits and calls onSuccess with the user', async () => {
    login.mockResolvedValue({ id: 1, login: 'demo', firstName: 'Демо', lastName: 'П', screenName: null, createdAt: '' })
    const onSuccess = vi.fn()
    render(<LoginForm onSuccess={onSuccess} />)
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'demo1234')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ login: 'demo' })))
    expect(login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
  })
  it('shows the error for invalid credentials', async () => {
    login.mockRejectedValue(Object.assign(new Error('Wrong'), { status: 401, code: 'invalid_credentials' }))
    render(<LoginForm onSuccess={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Логин'), 'demo')
    await userEvent.type(screen.getByLabelText('Пароль'), 'bad')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()
  })
})
```

`features/auth/ui/RegisterForm.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
const { register } = vi.hoisted(() => ({ register: vi.fn() }))
vi.mock('../api/authApi', () => ({ authApi: { login: vi.fn(), register } }))
import { RegisterForm } from './RegisterForm'

async function fill() {
  await userEvent.type(screen.getByLabelText('Логин'), 'newbie')
  await userEvent.type(screen.getByLabelText('Имя'), 'Тест')
  await userEvent.type(screen.getByLabelText('Фамилия'), 'Тестов')
  await userEvent.type(screen.getByLabelText('Пароль'), 'password123')
  await userEvent.click(screen.getByRole('button', { name: 'Зарегистрироваться' }))
}
describe('RegisterForm', () => {
  it('registers and calls onSuccess', async () => {
    register.mockResolvedValue({ id: 2, login: 'newbie', firstName: 'Тест', lastName: 'Тестов', screenName: null, createdAt: '' })
    const onSuccess = vi.fn(); render(<RegisterForm onSuccess={onSuccess} />); await fill()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(register).toHaveBeenCalledWith({ login: 'newbie', firstName: 'Тест', lastName: 'Тестов', password: 'password123' })
  })
  it('shows login_taken under the login field', async () => {
    register.mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'login_taken' }))
    render(<RegisterForm onSuccess={vi.fn()} />); await fill()
    expect(await screen.findByText('Логин занят')).toBeInTheDocument()
  })
})
```
Run: `bunx vitest run src/features` → FAIL.

- [ ] **Step 2: model/errors.ts, api/authApi.ts**

```ts
// model/errors.ts
const MESSAGES: Record<string, string> = { invalid_credentials: 'Неверный логин или пароль', login_taken: 'Логин занят', weak_password: 'Минимум 8 символов', invalid_login: '3–32 символа: латиница, цифры, _ .', empty_name: 'Введите имя и фамилию', validation: 'Заполните все поля' }
const FIELDS: Record<string, 'login' | 'password'> = { login_taken: 'login', invalid_login: 'login', weak_password: 'password' }
export function messageFor(code: string): string { return MESSAGES[code] ?? 'Что-то пошло не так' }
export function fieldFor(code: string): 'login' | 'password' | 'form' { return FIELDS[code] ?? 'form' }
export function codeOf(e: unknown): string { return typeof e === 'object' && e !== null && 'code' in e && typeof (e as { code: unknown }).code === 'string' ? (e as { code: string }).code : 'unknown' }
```
```ts
// api/authApi.ts
import { api, unwrap } from '@/shared/api'
import type { UserDto } from '@/shared/api'
export const authApi = {
  async login(input: { login: string; password: string }): Promise<UserDto> { return unwrap(await api.api.v1.auth.login.post(input), { silent401: true }).user },
  async register(input: { login: string; password: string; firstName: string; lastName: string }): Promise<UserDto> { return unwrap(await api.api.v1.auth.register.post(input)).user },
}
```
- [ ] **Step 3: LoginForm, RegisterForm, LogoutButton**

`ui/LoginForm.tsx`:
```tsx
import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import { type FormEvent, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { authApi } from '../api/authApi'
import { codeOf, fieldFor, messageFor } from '../model/errors'

export function LoginForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const [login, setLogin] = useState(''); const [password, setPassword] = useState('')
  const [error, setError] = useState<{ field: 'login' | 'password' | 'form'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true)
    try { onSuccess(await authApi.login({ login, password })) }
    catch (err) { const code = codeOf(err); setError({ field: fieldFor(code), text: messageFor(code) }) }
    finally { setBusy(false) }
  }
  const status = (f: 'login' | 'password') => (error?.field === f ? 'error' : 'default')
  return (
    <form onSubmit={submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem htmlFor="login" top="Логин" status={status('login')} bottom={error?.field === 'login' ? error.text : undefined}>
          <Input id="login" name="login" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} disabled={busy} />
        </FormItem>
        <FormItem htmlFor="password" top="Пароль" status={error ? 'error' : 'default'} bottom={error && error.field !== 'login' ? error.text : undefined}>
          <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} />
        </FormItem>
        <FormItem>
          <Button type="submit" size="l" stretched mode="primary" loading={busy}>Войти</Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}
```
Примечание (a11y): у каждого `FormItem` с ошибкой задавать `bottomId="<id>-error"`, а у соответствующего `Input` — `aria-describedby={error ? '<id>-error' : undefined}`; VKUI требует эту пару, чтобы скринридер читал текст ошибки при фокусе на поле.

Примечание: `FormItem` с `htmlFor` рендерит `<label for>`; `getByLabelText('Логин')` находит инпут по `id`. Если VKUI 8 `FormItem` не принимает `htmlFor` (проверить `FormItem.d.ts`: `HasRootRef & React.LabelHTMLAttributes`?), задать связь через `Input aria-labelledby` + `FormItem topId`: `<FormItem topId="login-top" top="Логин">` и `<Input aria-labelledby="login-top" …>`. Так работает `getByLabelText`.

`ui/RegisterForm.tsx`:
```tsx
import { Button, FormItem, FormLayoutGroup, Input } from '@vkontakte/vkui'
import { type FormEvent, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { authApi } from '../api/authApi'
import { codeOf, fieldFor, messageFor } from '../model/errors'

type Field = 'login' | 'firstName' | 'lastName' | 'password'
const EMPTY: Record<Field, string> = { login: '', firstName: '', lastName: '', password: '' }

export function RegisterForm({ onSuccess }: { onSuccess: (u: UserDto) => void }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<{ field: 'login' | 'password' | 'form'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (f: Field) => (e: { target: { value: string } }) => setForm((s) => ({ ...s, [f]: e.target.value }))
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true)
    try { onSuccess(await authApi.register(form)) }
    catch (err) { const code = codeOf(err); setError({ field: fieldFor(code), text: messageFor(code) }) }
    finally { setBusy(false) }
  }
  const status = (f: 'login' | 'password') => (error?.field === f ? 'error' : 'default')
  const bottom = (f: 'login' | 'password') => (error?.field === f ? error.text : undefined)
  return (
    <form onSubmit={submit} noValidate>
      <FormLayoutGroup mode="vertical">
        <FormItem htmlFor="reg-login" top="Логин" status={status('login')} bottom={bottom('login')}>
          <Input id="reg-login" name="login" autoComplete="username" value={form.login} onChange={set('login')} disabled={busy} />
        </FormItem>
        <FormItem htmlFor="reg-first" top="Имя">
          <Input id="reg-first" name="firstName" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} disabled={busy} />
        </FormItem>
        <FormItem htmlFor="reg-last" top="Фамилия">
          <Input id="reg-last" name="lastName" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} disabled={busy} />
        </FormItem>
        <FormItem htmlFor="reg-password" top="Пароль" status={status('password')} bottom={bottom('password')}>
          <Input id="reg-password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} disabled={busy} />
        </FormItem>
        <FormItem status={error?.field === 'form' ? 'error' : 'default'} bottom={error?.field === 'form' ? error.text : undefined}>
          <Button type="submit" size="l" stretched mode="primary" loading={busy}>Зарегистрироваться</Button>
        </FormItem>
      </FormLayoutGroup>
    </form>
  )
}
```
(Та же оговорка про `htmlFor`/`topId`, что и у `LoginForm`.)

`ui/LogoutButton.tsx`:
```tsx
import { Button } from '@vkontakte/vkui'
import { useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
export function LogoutButton() {
  const { logout } = useSession(); const navigate = useNavigate()
  return <Button mode="tertiary" size="s" onClick={async () => { await logout(); navigate('/login') }}>Выйти</Button>
}
```
`index.ts`: `export { LoginForm } from './ui/LoginForm'; export { RegisterForm } from './ui/RegisterForm'; export { LogoutButton } from './ui/LogoutButton'`.

- [ ] **Step 4: features/theme**

```tsx
// ui/ThemeToggle.tsx
import { Icon28MoonOutline, Icon28SunOutline } from '@vkontakte/icons'
import { IconButton } from '@vkontakte/vkui'
import { useColorScheme } from '@/shared/lib'
const LABEL = { light: 'Тема: светлая', dark: 'Тема: тёмная', system: 'Тема: системная' } as const
export function ThemeToggle() {
  const { pref, scheme, cycle } = useColorScheme()
  return <IconButton label={LABEL[pref]} onClick={cycle}>{scheme === 'dark' ? <Icon28SunOutline /> : <Icon28MoonOutline />}</IconButton>
}
```
`index.ts`: `export { ThemeToggle } from './ui/ThemeToggle'`.

- [ ] **Step 5: Проверить, коммит**

```bash
cd apps/web && bunx vitest run && bun run typecheck && cd ../.. && bun run lint
```
Expected: errors 2, LoginForm 2, RegisterForm 2 pass; Steiger чистый.
```bash
git add apps/web && git commit -m "feat(web): auth forms and logout on vkui, theme toggle feature"
```

---

### Task 6: widgets/app-shell, pages, router, vkui-only test

**Files:**
- Create: `src/widgets/app-shell/{index.ts,model/nav.ts,ui/AppShell.tsx,ui/AppHeader.tsx,ui/SideNav.tsx,ui/app-shell.module.css,ui/AppShell.test.tsx}`, `src/pages/login/{index.ts,ui/LoginPage.tsx}`, `src/pages/register/{index.ts,ui/RegisterPage.tsx}`, `src/pages/feed/{index.ts,ui/FeedPage.tsx}`, `src/vkui-only.test.ts`
- Modify: `src/app/router.tsx`

**Interfaces:**
- Produces:
  - `NAV_ITEMS: { to: string; label: string; Icon: ComponentType }[]` — Профиль `/profile` `Icon28UserOutline`, Лента `/feed` `Icon28NewsfeedOutline`, Мессенджер `/im` `Icon28MessageOutline`, Друзья `/friends` `Icon28UsersOutline`, Сообщества `/communities` `Icon28Users3Outline`, Фото `/photos` `Icon28PictureOutline`, Музыка `/music` `Icon28MusicOutline`.
  - `AppShell({ bare?: boolean })` — рендерит `AppHeader` + `SplitLayout`; в `bare` без `SideNav` и правой колонки; контент через `<Outlet/>`.
  - Роуты: `/` → `/feed`; `/feed` (внутри `RequireAuth`), `/login`, `/register` (внутри `AppShell bare`), `*`.
  - `vkui-only.test.ts` — правило проекта, падает на нарушениях.

- [ ] **Step 1: Failing tests**

`widgets/app-shell/ui/AppShell.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/entities/session', () => ({ useSession: () => ({ user: { id: 1, login: 'demo', firstName: 'Демо', lastName: 'П', screenName: null, createdAt: '' }, status: 'authed', setUser: vi.fn(), refresh: vi.fn(), logout: vi.fn() }) }))
import { AppShell } from './AppShell'

function mount(path: string, bare = false) {
  const router = createMemoryRouter([{ element: <AppShell bare={bare} />, children: [{ path: '/feed', element: <div>FEED</div> }, { path: '/im', element: <div>IM</div> }, { path: '/login', element: <div>LOGIN</div> }] }], { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}
describe('AppShell', () => {
  it('renders seven nav items and marks the current one', () => {
    mount('/feed')
    const nav = screen.getByRole('navigation', { name: 'Основная навигация' })
    expect(nav.querySelectorAll('a')).toHaveLength(7)
    expect(screen.getByRole('link', { name: /Лента/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Мессенджер/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('main')).toHaveTextContent('FEED')
  })
  it('bare mode hides navigation but keeps main', () => {
    mount('/login', true)
    expect(screen.queryByRole('navigation', { name: 'Основная навигация' })).toBeNull()
    expect(screen.getByRole('main')).toHaveTextContent('LOGIN')
  })
  it('header shows logout for an authed user', () => {
    mount('/feed')
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })
})
```

`src/vkui-only.test.ts`:
```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname)
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(tsx?|css)$/.test(name) && !/\.test\.(tsx?)$/.test(name)) out.push(p) }
  return out
}
const files = walk(ROOT)
const ALLOWED_CSS_PROPS = /^(display|grid(-[a-z-]+)?|flex(-[a-z-]+)?|gap|row-gap|column-gap|width|height|min-width|min-height|max-width|max-height|padding(-[a-z]+)?|margin(-[a-z]+)?|overflow(-[xy])?|position|inset|top|left|right|bottom|z-index|align-[a-z]+|justify-[a-z]+|place-[a-z]+|order|box-sizing|pointer-events|cursor|visibility|transition|transform)$/

describe('VKUI-only policy', () => {
  it('no raw colors or typography sizing in src', () => {
    const bad: string[] = []
    for (const f of files) { const src = readFileSync(f, 'utf8'); if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|font-size\s*:|font-family\s*:/.test(src)) bad.push(relative(ROOT, f)) }
    expect(bad).toEqual([])
  })
  it('no raw interactive elements in tsx (use VKUI Button/Input/Link/IconButton)', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.tsx') && !p.includes('/shared/ui/'))) { const src = readFileSync(f, 'utf8'); if (/<(button|input|select|textarea|a)[\s>]/.test(src)) bad.push(relative(ROOT, f)) }
    expect(bad).toEqual([])
  })
  it('css modules only declare layout properties or vkui variables', () => {
    const bad: string[] = []
    for (const f of files.filter((p) => p.endsWith('.css') && !p.endsWith('global.css'))) {
      const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const decl of src.split(/[{};]/).map((s) => s.trim()).filter((s) => s.includes(':') && !s.startsWith('@'))) {
        const [prop, ...rest] = decl.split(':'); const value = rest.join(':')
        if (!ALLOWED_CSS_PROPS.test(prop!.trim()) && !/var\(--vkui--/.test(value)) bad.push(`${relative(ROOT, f)}: ${decl}`)
      }
    }
    expect(bad).toEqual([])
  })
  it('never imports the removed ui-kit or solid', () => {
    const bad = files.filter((f) => /from ['"](@vkc\/ui-kit|solid-js)/.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f))
    expect(bad).toEqual([])
  })
})
```
Run: `bunx vitest run src/widgets src/vkui-only.test.ts` → AppShell FAIL (нет модуля), vkui-only PASS (пока нечего ловить) — это нормально; потом он охраняет.

- [ ] **Step 2: widgets/app-shell**

`model/nav.ts`:
```ts
import { Icon28MessageOutline, Icon28MusicOutline, Icon28NewsfeedOutline, Icon28PictureOutline, Icon28UserOutline, Icon28Users3Outline, Icon28UsersOutline } from '@vkontakte/icons'
import type { ComponentType } from 'react'
export type NavItem = { to: string; label: string; Icon: ComponentType }
export const NAV_ITEMS: NavItem[] = [
  { to: '/profile', label: 'Профиль', Icon: Icon28UserOutline },
  { to: '/feed', label: 'Лента', Icon: Icon28NewsfeedOutline },
  { to: '/im', label: 'Мессенджер', Icon: Icon28MessageOutline },
  { to: '/friends', label: 'Друзья', Icon: Icon28UsersOutline },
  { to: '/communities', label: 'Сообщества', Icon: Icon28Users3Outline },
  { to: '/photos', label: 'Фото', Icon: Icon28PictureOutline },
  { to: '/music', label: 'Музыка', Icon: Icon28MusicOutline },
]
```

`ui/SideNav.tsx`:
```tsx
import { Group, SimpleCell } from '@vkontakte/vkui'
import { NavLink } from 'react-router'
import { NAV_ITEMS } from '../model/nav'
export function SideNav() {
  return (
    <nav aria-label="Основная навигация">
      <Group mode="plain">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <SimpleCell key={to} Component={NavLink} to={to} before={<Icon />}>{label}</SimpleCell>
        ))}
      </Group>
    </nav>
  )
}
```
`NavLink` сам ставит `aria-current="page"` на активный `<a>` (`SimpleCell` с `Component={NavLink}` рендерит `<a>` — это не «сырой» тег в TSX, тест `vkui-only` его не видит). Если `SimpleCell` не пробрасывает `to`, обернуть: `Component={(p) => <NavLink {...p} to={to} />}` — но лучше проверить типы: `SimpleCellProps extends HasComponent` и лишние пропсы уходят в компонент.

`ui/AppHeader.tsx`:
```tsx
import { Icon24SearchOutline } from '@vkontakte/icons'
import { Button, FixedLayout, Search, Text } from '@vkontakte/vkui'
import { Link as RouterLink, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { UserAvatar } from '@/entities/user'
import { LogoutButton } from '@/features/auth'
import { ThemeToggle } from '@/features/theme'
import styles from './app-shell.module.css'

export function AppHeader({ bare }: { bare: boolean }) {
  const { user, status } = useSession(); const navigate = useNavigate()
  return (
    <FixedLayout vertical="top" filled>
      <div className={styles.header}>
        <RouterLink to="/feed" aria-label="ВКлон, на главную" className={styles.logo}><Text weight="2">ВКлон</Text></RouterLink>
        {!bare && <div className={styles.search}><Search placeholder="Поиск" icon={<Icon24SearchOutline />} /></div>}
        <div className={styles.grow} />
        <ThemeToggle />
        {status === 'authed' && user && (<><UserAvatar user={user} size={32} /><LogoutButton /></>)}
        {status === 'guest' && !bare && <Button mode="secondary" size="s" onClick={() => navigate('/login')}>Войти</Button>}
      </div>
    </FixedLayout>
  )
}
```
Примечание: `RouterLink` из react-router рендерит `<a>` — в TSX это `<RouterLink>`, тест пропустит; это единственный допустимый способ ссылок с клиентской навигацией (VKUI `Link` тоже можно: `<Link Component={RouterLink} to="/feed">`). Использовать VKUI `Link` с `Component={RouterLink}`, чтобы стиль был VKUI.

`ui/AppShell.tsx`:
```tsx
import { SplitCol, SplitLayout } from '@vkontakte/vkui'
import { Outlet } from 'react-router'
import { AppHeader } from './AppHeader'
import { SideNav } from './SideNav'
import styles from './app-shell.module.css'

export function AppShell({ bare = false }: { bare?: boolean }) {
  return (
    <>
      <AppHeader bare={bare} />
      <div className={styles.body}>
        <SplitLayout center>
          {!bare && <SplitCol fixed width={200} maxWidth={200}><SideNav /></SplitCol>}
          <SplitCol width={bare ? 480 : 551} maxWidth={bare ? 480 : 551} autoSpaced>
            <main className={styles.main}><Outlet /></main>
          </SplitCol>
          {!bare && <SplitCol width={345} maxWidth={345}><aside aria-label="Дополнительно" /></SplitCol>}
        </SplitLayout>
      </div>
    </>
  )
}
```
`ui/app-shell.module.css` (только раскладка и токены):
```css
.header { display: flex; align-items: center; gap: 12px; height: 48px; padding: 0 16px; }
.logo { display: flex; align-items: center; }
.search { width: 340px; }
.grow { flex: 1; }
.body { padding-top: 64px; }
.main { display: flex; flex-direction: column; gap: 16px; }
```
`index.ts`: `export { AppShell } from './ui/AppShell'`.

- [ ] **Step 3: pages**

`pages/login/ui/LoginPage.tsx`:
```tsx
import { Div, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { LoginForm } from '@/features/auth'
export function LoginPage() {
  const { setUser } = useSession(); const navigate = useNavigate(); const location = useLocation()
  const redirect = (location.state as { redirect?: string } | null)?.redirect ?? '/feed'
  return (
    <Panel>
      <PanelHeader>Вход</PanelHeader>
      <Group mode="card">
        <LoginForm onSuccess={(u) => { setUser(u); navigate(redirect, { replace: true }) }} />
        <Div><Footnote>Нет аккаунта? <Link Component={RouterLink} to="/register">Зарегистрироваться</Link></Footnote></Div>
      </Group>
    </Panel>
  )
}
```
`pages/register/ui/RegisterPage.tsx`:
```tsx
import { Div, Footnote, Group, Link, Panel, PanelHeader } from '@vkontakte/vkui'
import { Link as RouterLink, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import { RegisterForm } from '@/features/auth'
export function RegisterPage() {
  const { setUser } = useSession(); const navigate = useNavigate()
  return (
    <Panel>
      <PanelHeader>Регистрация</PanelHeader>
      <Group mode="card">
        <RegisterForm onSuccess={(u) => { setUser(u); navigate('/feed', { replace: true }) }} />
        <Div><Footnote>Уже есть аккаунт? <Link Component={RouterLink} to="/login">Войти</Link></Footnote></Div>
      </Group>
    </Panel>
  )
}
```

`pages/feed/ui/FeedPage.tsx`:
```tsx
import { Div, Group, Panel, PanelHeader, Placeholder, Title } from '@vkontakte/vkui'
import { useSession } from '@/entities/session'
export function FeedPage() {
  const { user } = useSession()
  return (
    <Panel>
      <PanelHeader>Лента</PanelHeader>
      <Group mode="card">
        <Div><Title level="2">Здравствуйте, {user?.firstName}</Title></Div>
        <Placeholder title="Лента скоро">Появится в подсистеме 3.</Placeholder>
      </Group>
    </Panel>
  )
}
```
`index.ts` в каждой странице: `export { XPage } from './ui/XPage'`.

- [ ] **Step 4: router**

```tsx
import { type ReactNode, lazy, Suspense } from 'react'
import { PanelSpinner } from '@vkontakte/vkui'
import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/entities/session'
import { AppShell } from '@/widgets/app-shell'
const FeedPage = lazy(() => import('@/pages/feed').then((m) => ({ default: m.FeedPage })))
const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/register').then((m) => ({ default: m.RegisterPage })))
const NotFoundPage = lazy(() => import('@/pages/not-found').then((m) => ({ default: m.NotFoundPage })))
const S = (el: ReactNode) => <Suspense fallback={<PanelSpinner />}>{el}</Suspense>
export const router = createBrowserRouter([
  { element: <AppShell />, children: [
    { path: '/', element: <Navigate to="/feed" replace /> },
    { path: '/feed', element: S(<RequireAuth><FeedPage /></RequireAuth>) },
    { path: '*', element: S(<NotFoundPage />) },
  ] },
  { element: <AppShell bare />, children: [
    { path: '/login', element: S(<LoginPage />) },
    { path: '/register', element: S(<RegisterPage />) },
  ] },
])
```

- [ ] **Step 5: Проверить**

```bash
cd apps/web && bunx vitest run && bun run typecheck && cd ../.. && bun run lint && bun run typecheck
```
Expected: все web-тесты зелёные (theme 3, initials 2, client 4, session 4, errors 2, LoginForm 2, RegisterForm 2, AppShell 3, vkui-only 4); Steiger чистый; oxlint 0 ошибок.
Ручная проверка с API и сидом: `bun run dev:api` (в фоне) и `cd apps/web && bun run dev` → `/feed` → редирект на `/login` → `demo`/`demo1234` → «Здравствуйте, Демо»; reload сохраняет; «Выйти» → `/login`; тёмная тема без вспышки; открыть `/im` (не найдено) — в меню подсвечен «Мессенджер». Проверить `http://localhost:8080/feed` через nginx.

- [ ] **Step 6: Commit**

```bash
git add apps/web && git commit -m "feat(web): app shell on SplitLayout, pages, router, vkui-only policy test"
```

---

### Task 7: Playwright, CI, docs, final verification

**Files:**
- Modify: `apps/web/playwright.config.ts` (если нужен только `webServer` — без изменений), `.github/workflows/ci.yml` (лейн `unit` уже вызывает `bun run test:unit` → включает web; лейн `e2e` без изменений), `README.md`, `docs/superpowers/specs/2026-09-06-web-react-vkui-migration-design.md` (зафиксировать отклонения: один слайс `features/auth` с сегментами вместо трёх слайсов; тема в `shared/lib/color-scheme`, а не в `app/theme`; `UserDto` реэкспортируется из `shared/api`), `CLAUDE.md` (уже содержит FSD-абзац; добавить строку про `bun run lint:fsd` и `vkui-only.test.ts`, если нет)

- [ ] **Step 1: Playwright**

```bash
set -a; source .env; set +a; cd apps/web && bunx playwright install chromium && bun run test:e2e
```
Expected: 2 passed без изменений спека. Если `getByLabel('Логин')` находит два элемента (например, `Search` в шапке с `aria-label`) — в `bare`-режиме `Search` не рендерится, конфликтов быть не должно; иначе уточнить селектор `{ exact: true }` в спеке — это единственное допустимое изменение e2e.

- [ ] **Step 2: Документация**

README: раздел «Фронт» — React 19 + VKUI, FSD, команды `bun run lint:fsd`, ссылка на `docs/reference/vk-ru-vkui-map.md`. Спек миграции: раздел «Отклонения при реализации» с тремя пунктами выше. `CLAUDE.md`: проверить упоминание `lint:fsd` и `vkui-only.test.ts`.

- [ ] **Step 3: Полная проверка**

```bash
bun run lint && bun run typecheck && set -a && source .env && set +a && bun run test:unit && bun run test:integration && (cd apps/web && bun run test:e2e)
```
Expected: всё зелёное. `git grep -n "ui-kit\|solid-js" -- ':!docs' ':!bun.lock'` → пусто.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: web migration notes; ci and readme for react+vkui"
```

---

## Что сознательно не делаем

- `@x`-кросс-импорты между слайсами (не нужны: общий тип `UserDto` живёт в `shared/api`).
- Storybook/каталог: у VKUI есть свой сторибук и MCP.
- Правую колонку, поиск, уведомления — заглушки без логики до подсистем 2–3.
