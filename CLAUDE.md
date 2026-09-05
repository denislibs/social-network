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

## Инструменты

- Runtime и пакетный менеджер — Bun. TypeScript 7. Линтер — oxlint, форматтер — Biome (после миграции фронта; см. план).
- Тесты: бэк и сидер — `bun test`; фронт — Vitest + React Testing Library; e2e — Playwright.
- Юнит-тесты не зависят от БД (`bun run test:unit`), интеграционные — `bun run test:integration` (нужен `bun run infra:up`).

## Бэкенд

- DDD-слои внутри модуля: `domain` → `application` → `infrastructure` / `presentation`; границы проверяет `apps/api/src/modules/boundaries.test.ts`.
- CQRS: команды через агрегаты, запросы читают Drizzle напрямую в DTO.
- Ошибки — `AppError` с `code`/`status`; тексты сообщений — часть HTTP-контракта, тесты матчат по `code`.

## Процесс

- Коммиты: Conventional Commits, английский, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Никаких платных внешних API и ключей: контент и данные генерируются локально.
