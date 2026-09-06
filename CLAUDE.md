# vk-clone — правила для Claude Code

Соцсеть по образцу ВКонтакте. Спек: `docs/superpowers/specs/2026-09-05-vk-clone-architecture-design.md`.
Монорепо на Bun workspaces: `apps/api` (Elysia, DDD + CQRS), `apps/web` (React 19 + TypeScript + VKUI), `apps/seeder`, `apps/ml` (позже), `packages/contracts`.

## Фронтенд: только VKUI

Это жёсткое правило, без исключений и «временных» обходов.

- **Компоненты** — только из `@vkontakte/vkui` (React 19). Свои кнопки, инпуты, модалки, табы, ячейки, аватары, скелетоны, снекбары не писать. Если нужного компонента нет — сначала искать через MCP `vkui` (`list_components`, `list_components_by_tag`, `get_component_metadata`, `get_examples`, `get_docs`), и только если его действительно нет, собирать из примитивов VKUI (`Div`, `Flex`, `Group`, `Cell`, `SimpleCell`, `Text`, `Title`, `Subhead`, `Caption`).
- **Токены** — только CSS-переменные VKUI из `@vkontakte/vkui-tokens` (`--vkui--color_*`, `--vkui--size_*`, `--vkui--font_*`, `--vkui--animation_*`). Никаких hex/rgb/hsl-цветов, своих размеров кнопок и радиусов в CSS. Типографика — компонентами (`Title`, `Headline`, `Text`, `Paragraph`, `Subhead`, `Footnote`, `Caption`), не `font-size` руками.
- **Иконки** — только `@vkontakte/icons` (`Icon28NewsfeedOutline`, `Icon24LikeOutline` …). Каталог: https://vkcom.github.io/icons/ . Свои SVG не рисовать.
- **Оболочка** — `ConfigProvider` → `AdaptivityProvider` → `AppRoot`; раскладка через `SplitLayout`/`SplitCol`, экраны через `View`/`Panel`/`PanelHeader`, модалки через `ModalRoot`/`ModalPage`/`ModalCard`, меню через `ActionSheet`.
- **Тема** — через `ConfigProvider` (`colorScheme`), не через свои атрибуты и не через свой `localStorage`-хак.
- **Перед тем как писать любой UI** — вызвать MCP `vkui`: посмотреть `get_component_metadata` нужного компонента и `get_examples`. Пропсы брать из метаданных, не по памяти: API VKUI 8 отличается от 6/7.
- Кастомный CSS допустим только для лейаута (grid/flex/gap/overflow) и только на токенах VKUI.
- Ревью любого UI-кода начинать с проверки: нет ли компонента, цвета, размера или иконки не из VKUI.

## Архитектура фронта: FSD

`apps/web/src` строго по Feature-Sliced Design: слои `app → pages → widgets → features → entities → shared`, импорты только сверху вниз, слайсы одного слоя друг друга не импортируют, в слайс заходят только через его `index.ts`. Сегменты внутри слайса: `ui/`, `model/`, `api/`, `lib/`. Проверяется тремя способами, все обязательны: Steiger (`bun run lint:fsd`), oxlint (`no-restricted-imports` по слоям) и тест `vkui-only.test.ts`. Новая страница = слайс в `pages/`, собранный из `widgets`/`features`/`entities`; логика в `pages/` не живёт.

### Логика в хуках, вью без логики

- Компонент в `ui/` — чистая вью: принимает данные и колбэки, рисует VKUI. В нём нет `useState` с бизнес-состоянием, нет `fetch`/API-вызовов, нет `try/catch`, нет разбора ошибок, нет условий сложнее «показать/скрыть по флагу».
- Вся логика живёт в хуке в `model/` того же слайса (`useLoginForm`, `useSession`, `useFeed`), который возвращает плоский объект `{ state…, handlers… }`. Вью вызывает ровно этот хук. Хук тестируется отдельно через `renderHook`; вью — через рендер с подставленным результатом хука (или через хук, если он тривиален).
- Чистые функции (форматирование, маппинг ошибок, валидация) — в `lib/` или `model/`, без React, с обычными юнит-тестами.

### Инверсия зависимостей: InversifyJS

- Все зависимости, у которых есть побочные эффекты (HTTP-клиент, `localStorage`, `matchMedia`, таймеры, WebSocket, роутер-навигация), заходят в хуки только через DI-контейнер InversifyJS (`inversify`), никогда через прямой импорт синглтона. Так любой хук тестируется подменой биндинга, без `vi.mock` модулей.
- Контейнер и инфраструктура — в `shared/di`: `createContainer()`, `DiProvider` (React-контекст), хук `useService(TOKEN)`. Композиция (реальные биндинги) — только в `app/composition/`. Слайсы объявляют интерфейс порта и его `Symbol`-токен у себя в `model/ports.ts` (или в `shared/api`, если порт общий) и экспортируют через `index.ts`.
- Без декораторов и без `reflect-metadata`: не включаем `experimentalDecorators`/`emitDecoratorMetadata` (TS 7 и Vite). Биндинги только явные: `bind(TOKEN).toConstantValue(x)`, `bind(TOKEN).toResolvedValue((a, b) => new Impl(a, b), [A_TOKEN, B_TOKEN])`, `.inSingletonScope()` для сервисов с состоянием.
- В тестах: `renderHook(..., { wrapper })` с `DiProvider` над тестовым контейнером, где нужные токены забиндены на фейки (`toConstantValue`). Глобальный контейнер в тестах не трогаем. `vi.mock` остаётся только для модулей без DI-шва (VKUI, react-router) и для `@/shared/api` там, где проверяется сам клиент.

## Инструменты

- Runtime и пакетный менеджер — Bun. TypeScript 7. Линтер — oxlint, форматтер — Biome (после миграции фронта; см. план).
- Тесты: бэк и сидер — `bun test`; фронт — Vitest + React Testing Library; e2e — Playwright.
- Фронтенд только по TDD на Vitest: сначала падающий тест в `*.test.tsx` рядом с кодом (RTL + user-event, запросы по ролям и подписям), потом минимальная реализация, потом рефакторинг. Тест пишется на поведение пользователя, а не на разметку VKUI; сеть мокается на уровне `@/shared/api` (клиент Eden) через `vi.mock` с `importActual` — ошибки, `unwrap` и события 401 идут через реальный код. Компонент, хук или стор без теста в PR не попадает.
- Юнит-тесты не зависят от БД (`bun run test:unit`), интеграционные — `bun run test:integration` (нужен `bun run infra:up`).

## Бэкенд

- DDD-слои внутри модуля: `domain` → `application` → `infrastructure` / `presentation`; границы проверяет `apps/api/src/modules/boundaries.test.ts`.
- CQRS: команды через агрегаты, запросы читают Drizzle напрямую в DTO.
- Ошибки — `AppError` с `code`/`status`; тексты сообщений — часть HTTP-контракта, тесты матчат по `code`.
- Инверсия зависимостей через InversifyJS, те же правила, что на фронте: без декораторов, явные `Symbol`-токены, `toResolvedValue`/`toConstantValue`. Порты (`UserRepository`, `SessionStore`, `PasswordHasher`, шины) объявляются в `application/ports.ts` вместе с токенами; реализации биндятся в `infrastructure/<module>.container.ts`, корень композиции — `apps/api/src/app.ts` (один контейнер приложения, модули регистрируют в него свои биндинги). Хендлеры команд/запросов получают зависимости из контейнера, не создают `new Drizzle…`/`new Redis…` сами. В тестах application-слоя — контейнер с in-memory фейками из `application/testing/`.

## Процесс

- Коммиты: Conventional Commits, английский, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Никаких платных внешних API и ключей: контент и данные генерируются локально.
