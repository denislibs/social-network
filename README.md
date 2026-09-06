# vk-clone

Своя соцсеть по образцу ВКонтакте: лента с ML-ранжированием, граф друзей и подписок, сообщества, мессенджер.
Спек: `docs/superpowers/specs/2026-09-05-vk-clone-architecture-design.md`.

## Быстрый старт
```bash
cp .env.example .env
bun install
bun run infra:up          # postgres+pgvector, redis, minio, nginx
bun run db:migrate
bun run seed -- --scale 0.05 --yes   # 2 500 пользователей; --scale 1 для 50 000
bun run dev:api           # http://localhost:3000/api/v1/health
bun run dev:web           # http://localhost:5173
```
Единая точка входа через nginx: `http://localhost:8080` (проксирует и API, и веб). Вход в демо-аккаунт: `demo / demo1234`.

## Структура
apps/web (фронт: React + VKUI, см. спек 2026-09-06) · apps/api · apps/seeder · packages/contracts (см. спек, раздел 3)

## Фронт

`apps/web` — React 19 + VKUI 8, строго по Feature-Sliced Design (`app → pages → widgets → features → entities → shared`, слайсы одного слоя друг друга не импортируют, вход только через `index.ts`). Три обязательных проверки: Steiger (`bun run lint:fsd`) и oxlint (`no-restricted-imports` по слоям) — обе в `bun run lint`; тест `vkui-only.test.ts` (запрещает свои цвета, `font-size` и «сырые» HTML-контролы вне VKUI) — в `bun run test:unit`. Соответствие компонентов и токенов оригиналу vk.ru — `docs/reference/vk-ru-vkui-map.md`. Подробности архитектуры и отступления от исходного плана — `docs/superpowers/specs/2026-09-06-web-react-vkui-migration-design.md`.

## DI (InversifyJS)

Побочные эффекты (HTTP-клиент, `localStorage`, `matchMedia`, шины событий) не импортируются напрямую — только через контейнер InversifyJS.

- **Фронт** (`apps/web`): инфраструктура контейнера — `shared/di` (`createContainer()` — `defaultScope: 'Singleton'`, `DiProvider`, хук `useService(TOKEN)`, branded `ServiceIdentifier<T>`). Реальные биндинги живут только в композиционном корне `app/composition/container.ts` (`createAppContainer`), который `main.tsx` оборачивает в `<DiProvider>`. Слайсы объявляют порт и токен у себя (`model/ports.ts` или `shared/api`, если порт общий) и получают зависимость через `useService(TOKEN)` в хуке `model/`. Тест хука: `renderHook(() => useX(...), { wrapper: withDi(container) })`, где `container = createTestContainer()` и нужные токены забинжены на фейки через `c.bind(TOKEN).toConstantValue(fake)` — см. `apps/web/src/features/auth/model/useLoginForm.test.tsx`.
- **Бэкенд** (`apps/api`): корень композиции — `kernel/container.ts` (`createKernelContainer(deps)`), который биндит инфраструктурные зависимости (`Db`, `Redis`, шины команд/запросов/событий, конфиг) на токены `kernel/tokens.ts` (`KERNEL.*`). Модули регистрируют свои биндинги поверх этого контейнера в `infrastructure/<module>.container.ts` (например, `bindIdentityInfrastructure` в модуле identity); хендлеры и роуты получают зависимости через `container.get(TOKEN)`, `new Drizzle…`/`new Redis…` внутри модулей не создаются.

## Деплой
За TLS выставьте `COOKIE_SECURE=1` — иначе браузер примет cookie сессии, но при переходе на
HTTPS-домен она не будет помечена `Secure`. Локально (`http://localhost:8080`) оставляйте `0`:
`Secure`-cookie по plain HTTP браузер молча выбрасывает и вход перестаёт работать. Флаг читается
из окружения, а не из `X-Forwarded-Proto`, чтобы его нельзя было подделать запросом.

## Тесты
`bun run test:unit`, `bun run test:integration` (нужна инфраструктура), `cd apps/web && bun run test:e2e`.

Принадлежность к прогону определяется **именем файла**, а не списком путей:

| Суффикс | Прогон | Требует инфраструктуру |
| --- | --- | --- |
| `*.test.ts` | `test:unit` | нет |
| `*.integration.test.ts` | `test:integration` | postgres |
| `*.infrastructure.test.ts` | `test:integration` | postgres + redis |
| `*.e2e.test.ts` | `test:integration` | postgres + redis |

Новый тест, которому нужна БД, обязан называться по одному из трёх суффиксов — иначе он попадёт
в юнит-прогон и уронит его (там `DATABASE_URL` заведомо нерабочий).
