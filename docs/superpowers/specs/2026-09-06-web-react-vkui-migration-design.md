# Миграция фронта на React 19 + VKUI + FSD (подпроект 1b)

Дата: 2026-09-06
Статус: утверждён в обсуждении, ждёт ревью текста
Родительский спек: `docs/superpowers/specs/2026-09-05-vk-clone-architecture-design.md` (раздел 10 «Фронт» заменяется этим документом).

## 1. Цель и рамки

Заменить `apps/web` (SolidJS + собственный `packages/ui-kit`) на React 19 + TypeScript 7 + VKUI 8 с архитектурой Feature-Sliced Design и автоматической проверкой её правил. Функциональность остаётся той же, что в подсистеме 1: оболочка (шапка, левое меню, три колонки), вход, регистрация, guard, заглушка ленты, тема. Бэкенд, контракты, сидер, инфраструктура и Playwright-сценарии не меняются.

### Решения, принятые пользователем

- React 19, TypeScript 7, VKUI 8 (`@vkontakte/vkui`, `@vkontakte/vkui-tokens`, `@vkontakte/icons`), MCP-сервер `vkui` подключён (`.mcp.json`), правило «только VKUI» зафиксировано в `CLAUDE.md`.
- Роутинг: react-router 8 как источник истины по URL; VKUI используется как библиотека компонентов и лейаута (без `View`/`Panel`-навигации с анимациями).
- Линтер: oxlint. Архитектура фронта: строгий FSD с проверкой правил линтером.
- `packages/ui-kit` удаляется.

### Что не входит

Лента, профиль, друзья, сообщества, мессенджер, медиа, i18n, SSR, микрофронты, storybook. Всё это приходит в подсистемах 2–6 и должно ложиться в заданную здесь структуру.

## 2. Стек и инструменты

| Слой | Выбор |
|---|---|
| Сборка | Vite 8 + `@vitejs/plugin-react` |
| UI | React 19, `@vkontakte/vkui` 8 (+ `dist/vkui.css`), `@vkontakte/icons`, токены через CSS-переменные `--vkui--*` |
| Роутинг | `react-router` 8 (`createBrowserRouter`, `RouterProvider`, `lazy`) |
| Серверное состояние | `@tanstack/react-query` 5 |
| API-клиент | `@vkc/contracts` (Eden Treaty), без изменений |
| Линт | oxlint (`.oxlintrc.json`: плагины `react`, `react-hooks`, `jsx-a11y`, `typescript`, `import`, `unicorn` выборочно) + Steiger (официальный линтер FSD, `@feature-sliced/steiger-plugin`) |
| Формат | Biome только как форматтер (TS/TSX/CSS/JSON); линтер Biome для JS/TS выключен |
| Тесты | Vitest 5 + `@testing-library/react` + jest-dom; Playwright (спеки из подсистемы 1 без изменений) |

Root-скрипты: `lint` = `oxlint . && bun run lint:fsd && biome check --linter-enabled=false .`; `lint:fsd` = `steiger apps/web/src`.

## 3. Архитектура FSD

### Слои и правило импортов

```
apps/web/src/
  app/        инициализация: провайдеры, роутер, тема, глобальные стили
  pages/      страницы-композиции: login, register, feed, not-found
  widgets/    крупные самостоятельные блоки: app-shell (шапка + меню + колонки)
  features/   пользовательские действия: auth/login, auth/register, auth/logout, theme/toggle
  entities/   доменные сущности: session (текущий пользователь), user (DTO, аватар-ячейка)
  shared/     инфраструктура без бизнес-смысла: api, config, lib, ui (только обёртки-адаптеры над VKUI, см. ниже)
```

Импортировать можно только сверху вниз: `app → pages → widgets → features → entities → shared`. Слайс не импортирует другой слайс своего слоя (`features/auth` не трогает `features/theme`). Внутрь слайса снаружи заходят только через его `index.ts` (public API); импорт `features/auth/login/ui/LoginForm` напрямую запрещён. Внутри слайса сегменты: `ui/`, `model/`, `api/`, `lib/`.

`shared/ui` разрешён только для тонких адаптеров над VKUI (например, `PageSkeleton`, `ErrorBanner`), которые сами состоят из компонентов VKUI. Никаких «своих» кнопок, инпутов, модалок.

### Слайсы подпроекта 1b

- `app/`: `main.tsx` (порядок провайдеров: `ConfigProvider` → `AdaptivityProvider sizeY="compact"` → `AppRoot` → `QueryClientProvider` → `SessionProvider` → `RouterProvider`), `router.tsx`, `providers/`, `styles/` (импорт `vkui.css`), `theme/` (анти-FOUC-скрипт в `index.html` выставляет атрибут схемы до загрузки бандла; `app/theme` читает его).
- `pages/login`, `pages/register`, `pages/feed`, `pages/not-found` — только композиция виджетов и фич, без логики.
- `widgets/app-shell`: `SplitLayout` с шапкой (`FixedLayout`: логотип, `Search`, кнопка темы из `features/theme`, `Avatar` пользователя или кнопка «Войти» из `entities/session`/`features/auth`), левой колонкой (`SplitCol fixed width={200}`: `Group` + `SimpleCell before={<Icon24…/>}` для пунктов Профиль, Лента, Мессенджер, Друзья, Сообщества, Фото, Музыка; активный через `NavLink` → `aria-current`), центральной (`Outlet`) и правой (`SplitCol width={345}`, пустая). Режим `bare` для страниц входа/регистрации.
- `features/auth/login`, `features/auth/register` (формы на `FormLayoutGroup`/`FormItem`/`Input`/`Button`, словарь ошибок по кодам API, тексты кнопок и лейблов те же, что в подсистеме 1), `features/auth/logout`, `features/theme/toggle` (light → dark → system).
- `entities/session`: контекст и хуки `useSession()` (`user`, `status: loading|authed|guest`, `setUser`, `refresh`, `logout`), `RequireAuth` (сохраняет `redirect` в `state`, вход возвращает туда), реакция на 401 из `shared/api` (переводит сессию в `guest`).
- `entities/user`: тип `UserDto` (реэкспорт из контрактов), `UserAvatar` (VKUI `Avatar` с инициалами/градиентом VKUI, без своего меша).
- `shared/api` (Eden-клиент, `ApiError`, `unwrap`, шина события `unauthorized`), `shared/config` (origin, ключи storage), `shared/lib` (утилиты).

### Ширины и плотность (снято с vk.ru, см. `docs/reference/vk-ru-vkui-map.md`)

Колонки 200 / 551 / 345 при контенте 912px; `Group mode="card"`; `AdaptivityProvider sizeY="compact"`; шапка `FixedLayout` 48px.

## 4. Проверка правил

Три уровня, все в CI:

1. **Steiger** (`lint:fsd`) — официальные правила FSD: направление импортов между слоями, отсутствие кросс-импортов слайсов, публичное API через `index.ts`, отсутствие пустых сегментов, запрет `shared` со слайсами.
2. **oxlint** — `no-restricted-imports` с паттернами на уровне конфигурационных overrides: из `shared/**` запрещены `entities|features|widgets|pages|app`, из `entities/**` — `features|widgets|pages|app`, и так далее по лестнице; плюс запрет импорта `@vkc/ui-kit` и `solid-js` где угодно; `jsx-a11y` для доступности форм.
3. **Тест `vkui-only.test.ts`** в `apps/web` — сканирует `src/**/*.{ts,tsx,css}`: запрещены hex/rgb/hsl-цвета, `font-size`, «сырые» `<button>`, `<input>`, `<select>`, `<textarea>`, `<a href>` в TSX вне `shared/ui`-адаптеров (в JSX должны быть `Button`, `Input`, `Link` и т.д. из VKUI), импорты из `packages/ui-kit`. Разрешён CSS только для раскладки: `display|grid|flex|gap|width|height|min-|max-|padding|margin|overflow|position|inset|top|left|right|bottom|z-index|align|justify` и `var(--vkui--…)`.

Любой из трёх падает — CI красный.

## 5. Поток данных и обработка ошибок

- `shared/api.unwrap(result)` бросает `ApiError { status, code, message }`; при `status === 401` дополнительно эмитит событие `unauthorized`, на которое подписан `entities/session` (сброс в `guest`), кроме запросов самого входа/регистрации.
- Формы: ошибка привязывается к полю по коду (`invalid_login`, `login_taken` → логин; `weak_password` → пароль; остальное под формой) через `FormItem status="error" bottom={text}`; VKUI сам ставит `aria-describedby`/`aria-invalid` — это закрывает замечание финального ревью про доступность ошибок.
- Загрузка сессии: `RequireAuth` показывает `PanelSpinner`/`Skeleton` VKUI, `guest` → `Navigate to="/login" state={{ redirect }}`.
- Логаут: `try/finally` (как в подсистеме 1), после — `navigate('/login')`.

## 6. Тесты

- Vitest + RTL: `LoginForm` (submit → API → setUser → navigate на redirect; ошибка кодом → текст под полем), `RegisterForm` (успех; `login_taken`), `SessionProvider` (authed / guest / logout при упавшем запросе / событие 401), `AppShell` (шесть пунктов меню, `aria-current` на активном, режим `bare`), `vkui-only.test.ts`, тест на oxlint/Steiger не нужен — они сами в `lint`.
- Playwright: `apps/web/e2e/auth.spec.ts` из подсистемы 1 без изменений (тексты «Логин», «Пароль», «Имя», «Фамилия», «Войти», «Зарегистрироваться», «Выйти», «Здравствуйте, {имя}», «Неверный логин или пароль», «Логин занят» сохраняются).
- CI: лейн `lint-typecheck` получает oxlint + Steiger; лейн `unit` — Vitest веба; `e2e` без изменений.

## 7. Удаление и чистка

- `packages/ui-kit` удаляется целиком; из `bun.lock`, CI, README, `.gitignore`, Biome-конфига убираются ссылки (`sprite.svg`, `names.ts`, overrides для токенов).
- `apps/web/biome.json` (nested) удаляется вместе со старым приложением.
- В родительском спеке: строка «Фронт» в таблице стека и раздел 10 заменяются ссылкой на этот документ; в `CLAUDE.md` добавляется абзац про FSD и три проверки.
- Референс `docs/reference/vkui-design-system.html` остаётся как история; `vk-prototype.html` остаётся как макет экранов.

## 8. Порядок работ

1. oxlint + Steiger в корне; Biome → только форматтер; CI-лейн.
2. Каркас `apps/web`: конфиги, `app/` с провайдерами и темой, `shared/api|config|lib`, пустая структура слоёв с `index.ts`.
3. `entities/session`, `entities/user`, `features/auth/*`, `features/theme/toggle`.
4. `widgets/app-shell`, `pages/*`, роутер; `vkui-only.test.ts`.
5. Playwright прогон; удаление `packages/ui-kit` и чистка; обновление спека и `CLAUDE.md`.

Критерий готовности: `bun run lint` (oxlint + Steiger + Biome), `bun run typecheck`, `bun run test:unit`, `bun run test:integration`, Playwright — всё зелёное; `packages/ui-kit` отсутствует; в `apps/web/src` нет ни одного цвета и ни одного самодельного контрола.

## 9. Отклонения при реализации

Список того, что по факту получилось иначе, чем в разделах 1–8, и почему:

- **Один слайс `features/auth` вместо трёх.** Вместо отдельных `features/auth/login`, `features/auth/register`, `features/auth/logout` сделан один слайс `features/auth` с сегментами `ui/` (`LoginForm`, `RegisterForm`, `LogoutButton`), `model/` (`errors.ts` — словарь кодов ошибок) и `api/` (`authApi.ts`). Формы и логаут делят один и тот же API-клиент и словарь ошибок; отдельные слайсы добавляли бы кросс-импорты одного уровня вместо реального разделения ответственности.
- **Тема — в `shared/lib/color-scheme`, а не в `app/theme`.** `useColorScheme` (на `useSyncExternalStore`, единое состояние на модуль — общий подписчик для `ConfigProvider` в `app` и `ThemeToggle` в шапке) и `theme.ts` (анти-FOUC, чтение/запись предпочтения) живут в `shared/lib/color-scheme`, потому что тема — общая утилита без бизнес-логики уровня `app`, и её используют оба слоя (`app/main.tsx` и `features/theme`).
- **`UserDto` реэкспортируется из `shared/api`, а не описывается в `entities/user`.** `entities/user/model/types.ts` делает `export type { UserDto } from '@/shared/api'`, а `shared/api/index.ts` — `export type { UserDto } from '@vkc/contracts'`. Тип уже есть в контрактах API; заводить для него параллельное определение в `entities/user` было бы дублированием источника истины.
- **`app/composition` вместо `app/providers`.** Композиция провайдеров (`QueryProvider`) лежит в `app/composition/`, а не в `app/providers/`, как в разделе 3, — под именем `composition` понятнее, что это сборка `app`, а не переиспользуемые провайдеры для других слоёв.
- **`AdaptivityProvider density="compact"` вместо `sizeY="compact"`.** VKUI 8 заменил `sizeX`/`sizeY` на `density` (авто-`sizeX`); используется `<AdaptivityProvider density="compact" hasPointer>` — актуальный API той же цели (плотная раскладка), `sizeY` в VKUI 8 больше не читается напрямую.
- **`shared/lib/router-anchor`: адаптеры `RouterAnchor`/`NavAnchor`.** Понадобился отдельный сегмент-адаптер над `react-router`: компоненты VKUI (`SimpleCell`, `Link`, …) передают в `Component` только `href`, а `react-router` ждёт `to`. `RouterAnchor` и `NavAnchor` (для активного пункта через `NavLink`/`aria-current`) переводят `href → to`, не создавая инлайновых стрелок на каждый рендер (иначе VKUI перемонтировал бы поддерево).
- **Steiger-конфиг — `steiger.config.mjs`, а не `.js`/`.json`.** Формат, который Steiger подхватывает по умолчанию в ESM-проекте; конфиг временно выключает `fsd/insignificant-slice` (на старте многие слайсы, например `features/theme`, используются только из одного места — правило возвращается в подсистеме 2).
