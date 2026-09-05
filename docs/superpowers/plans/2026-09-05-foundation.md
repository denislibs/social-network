# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять фундамент VK-клона: монорепо, ui-kit с токенами VKUI и спрайтом иконок, схему БД с миграциями, каркас DDD-модулей с шинами команд/запросов, авторизацию с сессиями в Redis, сидер на 50k пользователей с корпусом текстов в репозитории, оболочку веб-приложения с экраном входа и Docker Compose.

**Architecture:** Bun workspaces: `apps/web` (Solid), `apps/api` (Elysia, модули `identity` и далее по слоям domain/application/infrastructure/presentation), `apps/seeder`, `packages/ui-kit`, `packages/contracts`. Инфраструктура в compose: Postgres 17 + pgvector, Redis 7, MinIO. Спек: `docs/superpowers/specs/2026-09-05-vk-clone-architecture-design.md`.

**Tech Stack:** Bun ≥ 1.4, TypeScript 7, Elysia 1.4, `@elysia/eden` 1.4, Drizzle ORM 0.45 + drizzle-kit 0.31 (драйвер `bun-sql`), ioredis 5, SolidJS 1.9, `@solidjs/router` 1.0, `@tanstack/solid-query` 5, Vite 8, Vitest 5, `@solidjs/testing-library`, Playwright, `@vkontakte/icons` 3.69, `@faker-js/faker` 10, Biome 2.

## Global Constraints

- Все команды запускаются из корня репозитория `~/Documents/vk-clone`, если не сказано иное.
- Пакеты именуются `@vkc/<name>`: `@vkc/ui-kit`, `@vkc/contracts`, `@vkc/api`, `@vkc/web`, `@vkc/seeder`.
- Тесты бэка, сидера и скриптов ui-kit — `bun test`. Тесты Solid-компонентов и веба — `vitest` (Bun не транслирует Solid JSX).
- Модули `apps/api/src/modules/<ctx>` не импортируют `domain|application|infrastructure|presentation` соседних модулей; `domain/` не импортирует `elysia`, `drizzle-orm`, `ioredis`, `bun:*`. Проверяется тестом из Task 10.
- ID везде `bigint`, в TypeScript как `number` (`bigint({ mode: 'number' })`), identity `BY DEFAULT`, чтобы сидер мог вставлять явные id.
- Сессия: cookie `sid`, httpOnly, `SameSite=Lax`, `path=/`, TTL 30 дней, ключи Redis `sess:{token}` и `user_sessions:{userId}`.
- Пароли: `Bun.password.hash(pw, { algorithm: 'argon2id' })`.
- Тематики (enum `topic`, 12 значений, порядок фиксирован): `cinema, music, memes, games, it, sport, travel, food, science, auto, fashion, city`.
- Сидер детерминирован: один `seed` → одинаковая база. Никаких внешних API.
- Аватары сидированных пользователей не хранятся: `avatar_media_id` NULL, компонент Avatar рисует меш-градиент из id (отклонение от спека, `media.kind = generated` не используется).
- Коммит после каждой задачи; сообщения на английском, Conventional Commits, трейлер `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File Structure

```
vk-clone/
  package.json                      workspaces, корневые скрипты
  tsconfig.base.json                общие опции TS
  biome.json                        lint + format
  docker-compose.yml                postgres, redis, minio
  .env.example
  scripts/wait-for-infra.ts         ждёт готовности БД/Redis
  packages/ui-kit/
    package.json, tsconfig.json, vite.config.ts, vitest.config.ts
    scripts/build-icons.ts          @vkontakte/icons → sprite.svg + names.ts
    scripts/build-icons.test.ts
    src/index.ts                    публичный API
    src/tokens/tokens.css           цвета, размеры, тени, движение
    src/tokens/typography.css       21 роль
    src/tokens/tokens.test.ts
    src/icons/sprite.svg            (генерируется, в git)
    src/icons/names.ts              (генерируется, в git)
    src/icons/Icon.tsx, icons.config.ts
    src/components/<Name>/<Name>.tsx, <Name>.module.css, <Name>.test.tsx
    src/lib/mesh.ts                 меш-градиент из seed
    catalog/index.html, catalog/main.tsx    каталог компонентов
  packages/contracts/
    package.json, tsconfig.json
    src/index.ts                    export type { App }, createApi()
  apps/api/
    package.json, tsconfig.json, drizzle.config.ts
    drizzle/                        миграции (в git)
    src/main.ts                     listen
    src/app.ts                      сборка Elysia-приложения
    src/config.ts                   env
    src/db/client.ts, src/db/schema/*.ts, src/db/schema/manual/events.ts, src/db/migrate.ts
    src/kernel/                     CommandBus, QueryBus, EventBus, errors, ids
    src/modules/identity/{domain,application,infrastructure,presentation}
    src/modules/boundaries.test.ts
    test/helpers/{db.ts,redis.ts,app.ts}
  apps/seeder/
    package.json, tsconfig.json
    src/cli.ts                      bun run seed --scale
    src/rng.ts                      mulberry32, gauss, lognormal, weighted
    src/topics.ts
    src/corpus/schema.ts, src/corpus/topics/<topic>.ts, src/corpus/dialogs.ts, src/corpus/index.ts
    src/corpus/corpus.test.ts
    src/generate/text.ts            вариации постов
    src/generate/users.ts, communities.ts, graph.ts, posts.ts, events.ts
    src/generate/*.test.ts
    src/write/{db.ts,reset.ts,insert.ts}
    src/seed.ts                     оркестрация стадий
    test/seed.integration.test.ts
  apps/web/
    package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts
    index.html
    src/app/{main.tsx,App.tsx,routes.tsx,Layout.tsx,providers.tsx}
    src/shared/api/client.ts, src/shared/session/session.ts
    src/features/auth/pages/{LoginPage,RegisterPage}.tsx (+ tests)
    src/features/feed/pages/FeedPage.tsx
    e2e/auth.spec.ts
  .github/workflows/ci.yml
```

---

### Task 1: Toolchain and monorepo root

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `biome.json`, `.editorconfig`, `.nvmrc` не нужен
- Modify: `.gitignore`

**Interfaces:**
- Produces: workspace-скрипты `bun run lint`, `bun run typecheck`, `bun run test`; `tsconfig.base.json`, который расширяют все пакеты.

- [ ] **Step 1: Обновить Bun**

Run: `bun upgrade && bun --version`
Expected: `1.4.x` (локально стоял 1.1.8; в 1.4 есть `Bun.sql`, `Bun.password`, стабильный `bun test`).

- [ ] **Step 2: Корневой package.json**

```json
{
  "name": "vk-clone",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "infra:up": "docker compose up -d && bun scripts/wait-for-infra.ts",
    "infra:down": "docker compose down",
    "lint": "biome check .",
    "format": "biome format --write .",
    "typecheck": "bun run --filter '*' typecheck",
    "test": "bun run --filter '*' test",
    "db:generate": "bun run --filter @vkc/api db:generate",
    "db:migrate": "bun run --filter @vkc/api db:migrate",
    "seed": "bun run --filter @vkc/seeder seed",
    "dev:api": "bun run --filter @vkc/api dev",
    "dev:web": "bun run --filter @vkc/web dev"
  },
  "devDependencies": {
    "@biomejs/biome": "^2.3.0",
    "typescript": "^7.0.2"
  }
}
```

- [ ] **Step 3: tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 4: biome.json и .editorconfig**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.0/schema.json",
  "files": { "ignore": ["**/dist", "**/node_modules", "**/drizzle/meta", "**/sprite.svg", "**/names.ts", "docs/reference"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "single", "semicolons": "asNeeded" } },
  "linter": { "enabled": true, "rules": { "recommended": true, "suspicious": { "noExplicitAny": "error" } } }
}
```

```
root = true
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
```

- [ ] **Step 5: Дополнить .gitignore**

Добавить строки:
```
apps/web/dist/
apps/web/playwright-report/
apps/web/test-results/
apps/ml/.venv/
*.log
```

- [ ] **Step 6: Установить и проверить**

Run: `bun install && bun run lint`
Expected: установка без ошибок; lint проходит (файлов пока почти нет).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: monorepo root with bun workspaces, biome, base tsconfig"
```

---

### Task 2: Docker Compose infrastructure

**Files:**
- Create: `docker-compose.yml`, `.env.example`, `scripts/wait-for-infra.ts`, `scripts/pg-init.sql`, `infra/nginx/default.conf.template`

**Interfaces:**
- Produces: nginx на `http://localhost:8080` как единый origin (`/api/*` → API, остальное → Vite); переменные `DATABASE_URL`, `DATABASE_URL_TEST`, `REDIS_URL`, `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`; сервисы `postgres:5432`, `redis:6379`, `minio:9000/9001`. База `vk` и база `vk_test` создаются при старте.

- [ ] **Step 1: docker-compose.yml**

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: vk
      POSTGRES_PASSWORD: vk
      POSTGRES_DB: vk
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./scripts/pg-init.sql:/docker-entrypoint-initdb.d/10-init.sql:ro
    command: ["postgres", "-c", "shared_buffers=512MB", "-c", "max_wal_size=2GB"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vk -d vk"]
      interval: 3s
      timeout: 3s
      retries: 20
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: ["redis-server", "--appendonly", "yes"]
    volumes: [redisdata:/data]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 3s
      retries: 20
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: minio12345
    ports: ["9000:9000", "9001:9001"]
    volumes: [miniodata:/data]
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 20
volumes:
  pgdata:
  redisdata:
  miniodata:
```

- [ ] **Step 2: scripts/pg-init.sql**

```sql
CREATE DATABASE vk_test;
\connect vk
CREATE EXTENSION IF NOT EXISTS vector;
\connect vk_test
CREATE EXTENSION IF NOT EXISTS vector;
```

- [ ] **Step 3: .env.example**

```
DATABASE_URL=postgres://vk:vk@localhost:5432/vk
DATABASE_URL_TEST=postgres://vk:vk@localhost:5432/vk_test
REDIS_URL=redis://localhost:6379
REDIS_DB_TEST=1
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio12345
S3_BUCKET=vk-media
API_PORT=3000
WEB_ORIGIN=http://localhost:5173
SEED_DEMO_PASSWORD=demo1234
```

Скопировать в `.env` (в `.gitignore` уже есть).

- [ ] **Step 4: scripts/wait-for-infra.ts**

```ts
import { SQL } from 'bun'

const deadline = Date.now() + 60_000
async function tryOnce(): Promise<boolean> {
  try {
    const sql = new SQL(process.env.DATABASE_URL ?? 'postgres://vk:vk@localhost:5432/vk')
    const [row] = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`
    await sql.close()
    if (!row) return false
    const redis = await fetchRedisPing()
    return redis
  } catch {
    return false
  }
}
async function fetchRedisPing(): Promise<boolean> {
  const { RedisClient } = await import('bun')
  const c = new RedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379')
  const pong = await c.send('PING', [])
  c.close()
  return pong === 'PONG'
}
while (Date.now() < deadline) {
  if (await tryOnce()) {
    console.log('infra ready')
    process.exit(0)
  }
  await Bun.sleep(1000)
}
console.error('infra not ready after 60s')
process.exit(1)
```

- [ ] **Step 4b: nginx как единая точка входа**

Добавить в `docker-compose.yml` сервис:
```yaml
  nginx:
    image: nginx:1.27-alpine
    ports: ["8080:80"]
    environment:
      API_UPSTREAM: host.docker.internal:3000
      WEB_UPSTREAM: host.docker.internal:5173
    extra_hosts: ["host.docker.internal:host-gateway"]
    volumes:
      - ./infra/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost/nginx-health || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 10
```

`infra/nginx/default.conf.template` (образ nginx сам прогоняет `envsubst` по `templates/*.template`):
```nginx
map $http_upgrade $connection_upgrade { default upgrade; '' close; }

server {
  listen 80;
  server_name _;
  client_max_body_size 50m;

  location = /nginx-health { return 200 'ok'; add_header Content-Type text/plain; }

  location /api/ {
    proxy_pass http://${API_UPSTREAM};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600s;
  }

  location / {
    proxy_pass http://${WEB_UPSTREAM};
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }
}
```

Смысл: один origin `http://localhost:8080` для фронта и API (cookie без CORS, WebSocket `/api/v1/ws` проксируется тем же путём); `location /api/` → API на хосте, всё остальное → Vite dev с HMR. На VPS тот же образ и тот же шаблон, только upstream'ы указывают на контейнеры `api`/`web` и добавляется TLS. В `.env.example` добавить `PUBLIC_ORIGIN=http://localhost:8080`. `wait-for-infra.ts` nginx не проверяет (upstream'ы в момент `infra:up` ещё не подняты — это нормально, nginx отдаёт 502 до старта API/Vite).

Проверка: `curl -s localhost:8080/nginx-health` → `ok`; `curl -si localhost:8080/api/v1/health` → `502` (API не запущен) — значит маршрут доходит до nginx и проксируется.

- [ ] **Step 5: Поднять и проверить**

Run: `cp -n .env.example .env; bun run infra:up`
Expected: три контейнера healthy, вывод `infra ready`.

Run: `docker compose exec postgres psql -U vk -d vk_test -c "select extname from pg_extension"`
Expected: строка `vector`.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example scripts/
git commit -m "chore: docker compose with pgvector postgres, redis, minio"
```

---

### Task 3: ui-kit package with VKUI tokens

**Files:**
- Create: `packages/ui-kit/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `src/index.ts`, `src/tokens/tokens.css`, `src/tokens/typography.css`, `src/tokens/tokens.test.ts`

**Interfaces:**
- Produces: CSS-переменные `--vk-<token>` (имена ниже), классы `.vk-<role>` для 21 типографической роли, `--vk-font-family`, тени `--vk-elevation-1..4`, радиусы `--vk-radius`, `--vk-radius-paper`, `--vk-radius-rounded`, длительности `--vk-duration-s|m|l`, кривые `--vk-ease-default|platform`.

- [ ] **Step 1: package.json ui-kit**

```json
{
  "name": "@vkc/ui-kit",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens/tokens.css",
    "./typography.css": "./src/tokens/typography.css",
    "./icons/sprite.svg": "./src/icons/sprite.svg"
  },
  "scripts": {
    "build:icons": "bun scripts/build-icons.ts",
    "test": "bun test scripts && vitest run",
    "typecheck": "tsc -p tsconfig.json",
    "catalog": "vite --config vite.config.ts"
  },
  "peerDependencies": { "solid-js": "^1.9.15" },
  "devDependencies": {
    "@solidjs/testing-library": "^0.8.10",
    "@testing-library/jest-dom": "^6.6.0",
    "@vkontakte/icons": "^3.69.0",
    "jsdom": "^26.0.0",
    "solid-js": "^1.9.15",
    "vite": "^8.2.2",
    "vite-plugin-solid": "^2.11.14",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: tsconfig.json, vite.config.ts, vitest.config.ts**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "jsxImportSource": "solid-js", "types": ["vite/client", "bun-types"] },
  "include": ["src", "scripts", "catalog"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
export default defineConfig({ root: 'catalog', plugins: [solid()], server: { port: 5174 } })
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ['development', 'browser'] },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['./vitest.setup.ts'], css: { modules: { classNameStrategy: 'non-scoped' } } },
})
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Failing test для токенов**

`src/tokens/tokens.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
const typo = readFileSync(resolve(__dirname, 'typography.css'), 'utf8')

const REQUIRED = [
  'background', 'background_content', 'background_secondary', 'background_tertiary', 'background_modal',
  'header_background', 'field_background', 'search_field_background', 'background_accent', 'background_accent_themed',
  'background_secondary_alpha', 'image_placeholder',
  'text_primary', 'text_secondary', 'text_subhead', 'text_tertiary', 'text_link', 'text_accent', 'text_contrast', 'text_contrast_themed',
  'icon_primary', 'icon_medium', 'icon_secondary', 'icon_tertiary', 'icon_accent',
  'separator_primary', 'separator_secondary', 'skeleton_from', 'skeleton_to', 'overlay_primary',
  'background_positive', 'background_negative', 'background_positive_tint', 'background_negative_tint', 'background_warning', 'background_info_tint',
  'text_positive', 'text_negative', 'icon_warning', 'track_background',
  'accent_azure', 'accent_blue', 'accent_violet', 'accent_purple', 'accent_raspberry_pink', 'accent_pink', 'accent_red',
  'accent_orange_fire', 'accent_orange', 'accent_orange_peach', 'accent_lime', 'accent_green', 'accent_cyan', 'accent_gray',
  'state_hover', 'state_active',
]
const ROLES = ['title1','display_title1','display_title2','title2','display_title3','title3','display_title4','headline1','headline','text','headline2','paragraph','subhead','footnote','footnote_caps','caption1','caption1_caps','caption2','caption2_caps','caption3','caption3_caps']

function block(selector: string): string {
  const i = css.indexOf(selector)
  expect(i, `selector ${selector} present`).toBeGreaterThan(-1)
  const start = css.indexOf('{', i)
  let depth = 0
  for (let j = start; j < css.length; j++) {
    if (css[j] === '{') depth++
    if (css[j] === '}') depth--
    if (depth === 0) return css.slice(start, j)
  }
  throw new Error('unbalanced')
}

describe('tokens.css', () => {
  const light = block(':root {')
  const dark = block(':root[data-vk="dark"]')
  const darkMedia = block(':root:not([data-vk="light"])')
  it.each(REQUIRED)('defines --vk-%s in light, dark and media-dark', (name) => {
    expect(light).toContain(`--vk-${name}:`)
    expect(dark).toContain(`--vk-${name}:`)
    expect(darkMedia).toContain(`--vk-${name}:`)
  })
  it('light and dark differ for background', () => {
    expect(light).toContain('--vk-background: #edeef0')
    expect(dark).toContain('--vk-background: #141414')
  })
  it('defines radii, elevations, motion', () => {
    for (const v of ['--vk-radius: 8px', '--vk-radius-paper: 12px', '--vk-radius-rounded: 48px', '--vk-elevation-1', '--vk-elevation-4', '--vk-duration-s: 100ms', '--vk-duration-m: 200ms', '--vk-duration-l: 300ms', '--vk-ease-default: cubic-bezier(0.3, 0.3, 0.5, 1)', '--vk-ease-platform: cubic-bezier(0.4, 0, 0.2, 1)', '--vk-font-family:'])
      expect(light).toContain(v)
  })
})

describe('typography.css', () => {
  it.each(ROLES)('has class .vk-%s', (role) => {
    expect(typo).toContain(`.vk-${role} {`)
  })
  it('title1 is 600 24/28', () => {
    expect(typo).toMatch(/\.vk-title1 \{\s*font: 600 24px\/28px var\(--vk-font-family\)/)
  })
})
```

- [ ] **Step 4: Запустить, убедиться, что падает**

Run: `cd packages/ui-kit && bun install && vitest run src/tokens`
Expected: FAIL, файлы не найдены.

- [ ] **Step 5: tokens.css**

Значения из `docs/reference/vkui-design-system.html` (массивы ACCENT, BG, TEXT, ICON, SEM, STATES) и теней/кривых из прототипа. Тёмный блок написан дважды: под `@media` с guard и под `[data-vk="dark"]`. Чтобы не расходились, тёмные значения задаются один раз через общий блок ниже — но CSS не умеет переиспользовать блоки, поэтому файл содержит оба списка целиком, а тест сверяет наличие каждого токена в обоих.

```css
/* Токены VKUI (vkBase), сняты с vk.ru 30.08.2026. Светлая схема — база. */
:root {
  color-scheme: light;
  --vk-font-family: -apple-system, system-ui, "Helvetica Neue", Roboto, sans-serif;

  --vk-background: #edeef0;
  --vk-background_content: #ffffff;
  --vk-background_secondary: #f0f2f5;
  --vk-background_tertiary: #fafbfc;
  --vk-background_modal: #ffffff;
  --vk-header_background: #ffffff;
  --vk-field_background: #ffffff;
  --vk-search_field_background: #edeef0;
  --vk-background_accent: #447bba;
  --vk-background_accent_themed: #447bba;
  --vk-background_secondary_alpha: rgba(39, 63, 92, 0.07);
  --vk-image_placeholder: rgba(0, 28, 61, 0.08);

  --vk-text_primary: #000000;
  --vk-text_secondary: #818c99;
  --vk-text_subhead: #626d7a;
  --vk-text_tertiary: #99a2ad;
  --vk-text_link: #2a5885;
  --vk-text_accent: #447bba;
  --vk-text_contrast: #ffffff;
  --vk-text_contrast_themed: #ffffff;

  --vk-icon_primary: #2c2d2e;
  --vk-icon_medium: #6f7985;
  --vk-icon_secondary: #99a2ad;
  --vk-icon_tertiary: #aeb7c2;
  --vk-icon_accent: #447bba;
  --vk-separator_primary: #dce1e6;
  --vk-separator_secondary: #e7e8ec;
  --vk-skeleton_from: rgba(3, 11, 23, 0.02);
  --vk-skeleton_to: rgba(3, 11, 23, 0.1);
  --vk-overlay_primary: rgba(0, 0, 0, 0.4);

  --vk-background_positive: #4bb34b;
  --vk-background_negative: #e64646;
  --vk-background_positive_tint: #e8f9e8;
  --vk-background_negative_tint: #faebeb;
  --vk-background_warning: #fff2d6;
  --vk-background_info_tint: #deeeff;
  --vk-text_positive: #4bb34b;
  --vk-text_negative: #e64646;
  --vk-icon_warning: #f8a01c;
  --vk-track_background: #d3d9de;

  --vk-accent_azure: #3f8ae0;
  --vk-accent_blue: #5181b8;
  --vk-accent_violet: #792ec0;
  --vk-accent_purple: #735ce6;
  --vk-accent_raspberry_pink: #e03fab;
  --vk-accent_pink: #f685ff;
  --vk-accent_red: #ff3347;
  --vk-accent_orange_fire: #f05c44;
  --vk-accent_orange: #ffa000;
  --vk-accent_orange_peach: #f9b54f;
  --vk-accent_lime: #bff74f;
  --vk-accent_green: #4bb34b;
  --vk-accent_cyan: #7cf4dc;
  --vk-accent_gray: #aeb7c2;

  --vk-state_hover: rgba(0, 16, 61, 0.04);
  --vk-state_active: rgba(0, 16, 61, 0.08);

  --vk-radius: 8px;
  --vk-radius-paper: 12px;
  --vk-radius-rounded: 48px;
  --vk-radius-check: 4px;

  --vk-size-button-xs: 24px;
  --vk-size-button-s: 30px;
  --vk-size-button-m: 36px;
  --vk-size-button-l: 44px;
  --vk-size-field: 36px;
  --vk-size-search: 32px;
  --vk-size-cell: 48px;
  --vk-size-header: 48px;

  --vk-elevation-1: 0 0 2px rgba(0, 0, 0, 0.06), 0 2px 2px rgba(0, 0, 0, 0.08);
  --vk-elevation-2: 0 4px 8px rgba(0, 0, 0, 0.08), 0 0 4px rgba(0, 0, 0, 0.06);
  --vk-elevation-3: 0 0 2px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.12);
  --vk-elevation-4: 0 0 8px rgba(0, 0, 0, 0.06), 0 16px 16px rgba(0, 0, 0, 0.1);

  --vk-duration-s: 100ms;
  --vk-duration-m: 200ms;
  --vk-duration-l: 300ms;
  --vk-ease-default: cubic-bezier(0.3, 0.3, 0.5, 1);
  --vk-ease-platform: cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root:not([data-vk="light"]) {
    color-scheme: dark;
    --vk-background: #141414;
    --vk-background_content: #222222;
    --vk-background_secondary: #333333;
    --vk-background_tertiary: #292929;
    --vk-background_modal: #292929;
    --vk-header_background: #222222;
    --vk-field_background: #292929;
    --vk-search_field_background: #424242;
    --vk-background_accent: #71aaeb;
    --vk-background_accent_themed: #e1e3e6;
    --vk-background_secondary_alpha: rgba(255, 255, 255, 0.08);
    --vk-image_placeholder: rgba(255, 255, 255, 0.08);
    --vk-text_primary: #e1e3e6;
    --vk-text_secondary: #828282;
    --vk-text_subhead: #939393;
    --vk-text_tertiary: #656565;
    --vk-text_link: #71aaeb;
    --vk-text_accent: #71aaeb;
    --vk-text_contrast: #ffffff;
    --vk-text_contrast_themed: #222222;
    --vk-icon_primary: #e1e3e6;
    --vk-icon_medium: #939393;
    --vk-icon_secondary: #828282;
    --vk-icon_tertiary: #656565;
    --vk-icon_accent: #71aaeb;
    --vk-separator_primary: #363738;
    --vk-separator_secondary: #292929;
    --vk-skeleton_from: #292929;
    --vk-skeleton_to: #333333;
    --vk-overlay_primary: rgba(0, 0, 0, 0.4);
    --vk-background_positive: #4bb34b;
    --vk-background_negative: #ff5c5c;
    --vk-background_positive_tint: #2f422f;
    --vk-background_negative_tint: #522e2e;
    --vk-background_warning: #473315;
    --vk-background_info_tint: #1c3954;
    --vk-text_positive: #4bb34b;
    --vk-text_negative: #ff5c5c;
    --vk-icon_warning: #edb055;
    --vk-track_background: #828282;
    --vk-accent_azure: #5d9ee9;
    --vk-accent_blue: #397dcc;
    --vk-accent_violet: #a94fff;
    --vk-accent_purple: #937ff5;
    --vk-accent_raspberry_pink: #f060c0;
    --vk-accent_pink: #f899ff;
    --vk-accent_red: #ff3347;
    --vk-accent_orange_fire: #f05c44;
    --vk-accent_orange: #ffa000;
    --vk-accent_orange_peach: #ffc062;
    --vk-accent_lime: #caf96c;
    --vk-accent_green: #4bb34b;
    --vk-accent_cyan: #55f1d2;
    --vk-accent_gray: #aeb7c2;
    --vk-state_hover: rgba(255, 255, 255, 0.04);
    --vk-state_active: rgba(255, 255, 255, 0.08);
    --vk-elevation-1: 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 2px rgba(0, 0, 0, 0.2);
    --vk-elevation-2: 0 4px 8px rgba(0, 0, 0, 0.15), 0 0 4px rgba(0, 0, 0, 0.2);
    --vk-elevation-3: 0 0 2px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.3);
    --vk-elevation-4: 0 0 8px rgba(0, 0, 0, 0.1), 0 16px 16px rgba(0, 0, 0, 0.2);
  }
}

:root[data-vk="dark"] {
  /* тот же список, что в блоке @media выше, скопировать дословно */
  color-scheme: dark;
  --vk-background: #141414;
  --vk-background_content: #222222;
  --vk-background_secondary: #333333;
  --vk-background_tertiary: #292929;
  --vk-background_modal: #292929;
  --vk-header_background: #222222;
  --vk-field_background: #292929;
  --vk-search_field_background: #424242;
  --vk-background_accent: #71aaeb;
  --vk-background_accent_themed: #e1e3e6;
  --vk-background_secondary_alpha: rgba(255, 255, 255, 0.08);
  --vk-image_placeholder: rgba(255, 255, 255, 0.08);
  --vk-text_primary: #e1e3e6;
  --vk-text_secondary: #828282;
  --vk-text_subhead: #939393;
  --vk-text_tertiary: #656565;
  --vk-text_link: #71aaeb;
  --vk-text_accent: #71aaeb;
  --vk-text_contrast: #ffffff;
  --vk-text_contrast_themed: #222222;
  --vk-icon_primary: #e1e3e6;
  --vk-icon_medium: #939393;
  --vk-icon_secondary: #828282;
  --vk-icon_tertiary: #656565;
  --vk-icon_accent: #71aaeb;
  --vk-separator_primary: #363738;
  --vk-separator_secondary: #292929;
  --vk-skeleton_from: #292929;
  --vk-skeleton_to: #333333;
  --vk-overlay_primary: rgba(0, 0, 0, 0.4);
  --vk-background_positive: #4bb34b;
  --vk-background_negative: #ff5c5c;
  --vk-background_positive_tint: #2f422f;
  --vk-background_negative_tint: #522e2e;
  --vk-background_warning: #473315;
  --vk-background_info_tint: #1c3954;
  --vk-text_positive: #4bb34b;
  --vk-text_negative: #ff5c5c;
  --vk-icon_warning: #edb055;
  --vk-track_background: #828282;
  --vk-accent_azure: #5d9ee9;
  --vk-accent_blue: #397dcc;
  --vk-accent_violet: #a94fff;
  --vk-accent_purple: #937ff5;
  --vk-accent_raspberry_pink: #f060c0;
  --vk-accent_pink: #f899ff;
  --vk-accent_red: #ff3347;
  --vk-accent_orange_fire: #f05c44;
  --vk-accent_orange: #ffa000;
  --vk-accent_orange_peach: #ffc062;
  --vk-accent_lime: #caf96c;
  --vk-accent_green: #4bb34b;
  --vk-accent_cyan: #55f1d2;
  --vk-accent_gray: #aeb7c2;
  --vk-state_hover: rgba(255, 255, 255, 0.04);
  --vk-state_active: rgba(255, 255, 255, 0.08);
  --vk-elevation-1: 0 0 2px rgba(0, 0, 0, 0.1), 0 2px 2px rgba(0, 0, 0, 0.2);
  --vk-elevation-2: 0 4px 8px rgba(0, 0, 0, 0.15), 0 0 4px rgba(0, 0, 0, 0.2);
  --vk-elevation-3: 0 0 2px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.3);
  --vk-elevation-4: 0 0 8px rgba(0, 0, 0, 0.1), 0 16px 16px rgba(0, 0, 0, 0.2);
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--vk-background);
  color: var(--vk-text_primary);
  font-family: var(--vk-font-family);
  font-size: 15px;
  line-height: 20px;
  -webkit-font-smoothing: antialiased;
}
button, input, textarea { font-family: inherit; }
a { color: var(--vk-text_link); text-decoration: none; }
:focus-visible { outline: 2px solid var(--vk-text_accent); outline-offset: 2px; border-radius: 6px; }
```

- [ ] **Step 6: typography.css**

Роли из массива TYPE витрины (роль, размер, интерлиньяж, вес, caps):

```css
.vk-title1 { font: 600 24px/28px var(--vk-font-family); }
.vk-display_title1 { font: 600 23px/28px var(--vk-font-family); }
.vk-display_title2 { font: 600 21px/26px var(--vk-font-family); }
.vk-title2 { font: 500 20px/24px var(--vk-font-family); }
.vk-display_title3 { font: 600 19px/24px var(--vk-font-family); }
.vk-title3 { font: 600 17px/22px var(--vk-font-family); }
.vk-display_title4 { font: 600 17px/22px var(--vk-font-family); }
.vk-headline1 { font: 500 16px/20px var(--vk-font-family); }
.vk-headline { font: 500 16px/20px var(--vk-font-family); }
.vk-text { font: 400 16px/20px var(--vk-font-family); }
.vk-headline2 { font: 500 15px/20px var(--vk-font-family); }
.vk-paragraph { font: 400 15px/20px var(--vk-font-family); }
.vk-subhead { font: 400 14px/18px var(--vk-font-family); }
.vk-footnote { font: 400 13px/16px var(--vk-font-family); }
.vk-footnote_caps { font: 600 13px/16px var(--vk-font-family); text-transform: uppercase; letter-spacing: 0.02em; }
.vk-caption1 { font: 400 12px/14px var(--vk-font-family); }
.vk-caption1_caps { font: 600 12px/14px var(--vk-font-family); text-transform: uppercase; letter-spacing: 0.02em; }
.vk-caption2 { font: 400 11px/14px var(--vk-font-family); }
.vk-caption2_caps { font: 600 11px/14px var(--vk-font-family); text-transform: uppercase; letter-spacing: 0.02em; }
.vk-caption3 { font: 400 9px/12px var(--vk-font-family); }
.vk-caption3_caps { font: 600 9px/12px var(--vk-font-family); text-transform: uppercase; letter-spacing: 0.02em; }
```

- [ ] **Step 7: src/index.ts (пока пустой публичный API)**

```ts
export {}
```

- [ ] **Step 8: Тесты зелёные**

Run: `cd packages/ui-kit && vitest run src/tokens`
Expected: PASS, все `it.each` зелёные.

- [ ] **Step 9: Commit**

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): VKUI color, size, motion tokens and 21 typography roles"
```

---

### Task 4: Icon sprite from @vkontakte/icons

**Files:**
- Create: `packages/ui-kit/scripts/build-icons.ts`, `scripts/build-icons.test.ts`, `src/icons/Icon.tsx`, `src/icons/icons.config.ts`, `src/icons/Icon.test.tsx`
- Generated (в git): `src/icons/sprite.svg`, `src/icons/names.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `buildSprite(svgRoot: string): { sprite: string; names: string[] }` (чистая функция, тестируется), `type IconName` и `ICON_NAMES: readonly IconName[]`, компонент `<Icon name={IconName} size?={number} class?={string} />`, `configureIcons({ spriteUrl: string })`.
- Факт: пакет кладёт исходники в `node_modules/@vkontakte/icons/src/svg/<size>/<name>_<size>.svg` (3508 файлов, корень `fill="currentColor"`, у 107 файлов внутри есть `id="..."` для clipPath/градиентов — их надо префиксовать именем иконки, иначе в спрайте столкнутся).

- [ ] **Step 1: Failing test для buildSprite**

`scripts/build-icons.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildSprite } from './build-icons'

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'icons-'))
  mkdirSync(join(root, '24'))
  mkdirSync(join(root, '28'))
  writeFileSync(join(root, '24', 'like_outline_24.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h2"/></svg>')
  writeFileSync(join(root, '28', 'logo_28.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 28 28"><defs><clipPath id="a"><rect width="28" height="28"/></clipPath></defs><g clip-path="url(#a)"><path fill="#fff" d="M0 0h1"/></g></svg>')
  return root
}

describe('buildSprite', () => {
  const { sprite, names } = buildSprite(fixture())
  it('collects names sorted', () => {
    expect(names).toEqual(['like_outline_24', 'logo_28'])
  })
  it('wraps each icon in <symbol id=name viewBox=...> keeping fill', () => {
    expect(sprite).toContain('<symbol id="like_outline_24" viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h2"/></symbol>')
    const symbolsOnly = sprite.slice(sprite.indexOf('<symbol'))
    expect(symbolsOnly).not.toContain('width="24"')
    expect(symbolsOnly).not.toContain('xmlns=')
  })
  it('namespaces inner ids and url() references', () => {
    expect(sprite).toContain('id="logo_28-a"')
    expect(sprite).toContain('clip-path="url(#logo_28-a)"')
    expect(sprite).not.toContain('id="a"')
  })
  it('is a single hidden svg root', () => {
    expect(sprite.startsWith('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">')).toBe(true)
    expect(sprite.endsWith('</svg>\n')).toBe(true)
  })
})
```

- [ ] **Step 2: Запустить**

Run: `cd packages/ui-kit && bun test scripts`
Expected: FAIL, модуль `./build-icons` не найден.

- [ ] **Step 3: scripts/build-icons.ts**

```ts
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export function buildSprite(svgRoot: string): { sprite: string; names: string[] } {
  const names: string[] = []
  const symbols: string[] = []
  const sizes = readdirSync(svgRoot).filter((d) => /^\d+$/.test(d)).sort((a, b) => Number(a) - Number(b))
  for (const size of sizes) {
    const dir = join(svgRoot, size)
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.svg')).sort()) {
      const name = file.replace(/\.svg$/, '')
      const raw = readFileSync(join(dir, file), 'utf8').trim()
      const open = raw.match(/^<svg\b([^>]*)>/)
      if (!open) throw new Error(`bad svg: ${file}`)
      const attrs = open[1] ?? ''
      const viewBox = attrs.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${size} ${size}`
      const fill = attrs.match(/\bfill="([^"]+)"/)?.[1]
      let inner = raw.slice(open[0].length).replace(/<\/svg>\s*$/, '')
      inner = inner
        .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${name}-${id}"`)
        .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${name}-${id})`)
        .replace(/\bhref="#([^"]+)"/g, (_, id: string) => `href="#${name}-${id}"`)
      const fillAttr = fill ? ` fill="${fill}"` : ''
      symbols.push(`<symbol id="${name}" viewBox="${viewBox}"${fillAttr}>${inner}</symbol>`)
      names.push(name)
    }
  }
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols.join('')}</svg>\n`
  return { sprite, names }
}

export function renderNames(names: string[]): string {
  const union = names.map((n) => `  | '${n}'`).join('\n')
  return `// generated by scripts/build-icons.ts, do not edit\nexport type IconName =\n${union}\n\nexport const ICON_NAMES = [\n${names.map((n) => `  '${n}',`).join('\n')}\n] as const satisfies readonly IconName[]\n`
}

if (import.meta.main) {
  const here = dirname(fileURLToPath(import.meta.url))
  const pkgRoot = join(here, '..')
  const candidates = [join(pkgRoot, 'node_modules/@vkontakte/icons/src/svg'), join(pkgRoot, '../../node_modules/@vkontakte/icons/src/svg')]
  const svgRoot = candidates.find((c) => existsSync(c))
  if (!svgRoot) throw new Error('@vkontakte/icons not installed')
  const { sprite, names } = buildSprite(svgRoot)
  writeFileSync(join(pkgRoot, 'src/icons/sprite.svg'), sprite)
  writeFileSync(join(pkgRoot, 'src/icons/names.ts'), renderNames(names))
  console.log(`icons: ${names.length} symbols, ${(sprite.length / 1024).toFixed(0)} KB`)
}
```

- [ ] **Step 4: Тест зелёный, сгенерировать спрайт**

Run: `cd packages/ui-kit && bun test scripts && bun run build:icons && grep -c '<symbol' src/icons/sprite.svg`
Expected: PASS; вывод `icons: 3508 symbols, ~2000 KB`; grep выводит `1` (одна строка), а `grep -o '<symbol' src/icons/sprite.svg | wc -l` даёт 3508.

- [ ] **Step 5: Failing test для компонента Icon**

`src/icons/Icon.test.tsx`:
```tsx
import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'
import { configureIcons } from './icons.config'

describe('Icon', () => {
  it('renders <use> pointing at configured sprite url + name', () => {
    configureIcons({ spriteUrl: '/assets/sprite.svg' })
    const { container } = render(() => <Icon name="like_outline_24" />)
    const use = container.querySelector('use')
    expect(use?.getAttribute('href')).toBe('/assets/sprite.svg#like_outline_24')
  })
  it('derives size from name suffix, allows override', () => {
    const a = render(() => <Icon name="home_outline_28" />).container.querySelector('svg')!
    expect(a.getAttribute('width')).toBe('28')
    const b = render(() => <Icon name="home_outline_28" size={20} />).container.querySelector('svg')!
    expect(b.getAttribute('width')).toBe('20')
  })
  it('is aria-hidden without label and labelled otherwise', () => {
    const a = render(() => <Icon name="like_outline_24" />).container.querySelector('svg')!
    expect(a.getAttribute('aria-hidden')).toBe('true')
    const b = render(() => <Icon name="like_outline_24" label="Нравится" />).container.querySelector('svg')!
    expect(b.getAttribute('role')).toBe('img')
    expect(b.getAttribute('aria-label')).toBe('Нравится')
  })
})
```

- [ ] **Step 6: icons.config.ts и Icon.tsx**

```ts
// icons.config.ts
import { createSignal } from 'solid-js'
const [spriteUrl, setSpriteUrl] = createSignal<string>('')
export function configureIcons(opts: { spriteUrl: string }) {
  setSpriteUrl(opts.spriteUrl)
}
export { spriteUrl }
```

```tsx
// Icon.tsx
import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import type { IconName } from './names'
import { spriteUrl } from './icons.config'

export type IconProps = {
  name: IconName
  size?: number
  label?: string
  class?: string
  style?: JSX.CSSProperties | string
}

export function Icon(props: IconProps) {
  const [local, rest] = splitProps(props, ['name', 'size', 'label', 'class'])
  const size = () => local.size ?? Number(local.name.match(/_(\d+)$/)?.[1] ?? 24)
  return (
    <svg
      class={`vk-icon${local.class ? ` ${local.class}` : ''}`}
      width={size()}
      height={size()}
      role={local.label ? 'img' : undefined}
      aria-label={local.label}
      aria-hidden={local.label ? undefined : 'true'}
      focusable="false"
      {...rest}
    >
      <use href={`${spriteUrl()}#${local.name}`} />
    </svg>
  )
}
```

Добавить в `tokens.css` в конец:
```css
.vk-icon { display: inline-block; flex: 0 0 auto; color: var(--vk-icon_primary); vertical-align: middle; }
```

- [ ] **Step 7: Экспорт и тесты**

`src/index.ts`:
```ts
export { Icon, type IconProps } from './icons/Icon'
export { configureIcons } from './icons/icons.config'
export { ICON_NAMES, type IconName } from './icons/names'
```

Run: `cd packages/ui-kit && bun run test && bun run typecheck`
Expected: bun test PASS (4), vitest PASS (tokens + Icon), typecheck без ошибок (файл `names.ts` большой, TS 7 справляется за секунды).

- [ ] **Step 8: Commit**

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): generate svg sprite from @vkontakte/icons and Icon component"
```

---

### Task 5: ui-kit primitives: Tappable, Button, Counter, Separator, Spinner

**Files:**
- Create: `src/components/Tappable/Tappable.tsx|.module.css|.test.tsx`, `src/components/Button/Button.tsx|.module.css|.test.tsx`, `src/components/Counter/Counter.tsx|.module.css`, `src/components/Separator/Separator.tsx|.module.css`, `src/components/Spinner/Spinner.tsx|.module.css`
- Modify: `src/index.ts`

**Interfaces:**
- Produces:
  - `<Tappable as?='div'|'button'|'a' hoverMode?='background'|'opacity' onClick?>` — hover/active из токенов, волна `ripple` в точке клика (keyframe 0.3s platform: scale 1→8, opacity 1→0).
  - `<Button mode?='primary'|'secondary'|'tertiary'|'outline' size?='s'|'m'|'l' appearance?='accent'|'neutral'|'negative' stretched? loading? disabled? before?=JSX after?=JSX type? onClick?>`.
  - `<Counter mode?='primary'|'secondary'|'prominent' size?='s'|'m'>{n}</Counter>`, `<Separator wide? />`, `<Spinner size?=number />`.

- [ ] **Step 1: Failing tests Tappable и Button**

`Tappable.test.tsx`:
```tsx
import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Tappable } from './Tappable'

describe('Tappable', () => {
  it('renders given element and calls onClick', () => {
    const onClick = vi.fn()
    const { getByRole } = render(() => <Tappable as="button" onClick={onClick}>Go</Tappable>)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('adds a wave element at click point that is removed after animationend', () => {
    const { getByText } = render(() => <Tappable as="div">Tap</Tappable>)
    const el = getByText('Tap')
    fireEvent.pointerDown(el, { clientX: 10, clientY: 12 })
    const wave = el.querySelector('[data-wave]') as HTMLElement
    expect(wave).not.toBeNull()
    fireEvent.animationEnd(wave)
    expect(el.querySelector('[data-wave]')).toBeNull()
  })
  it('does not add wave when disabled', () => {
    const { getByText } = render(() => <Tappable as="div" disabled>Tap</Tappable>)
    fireEvent.pointerDown(getByText('Tap'))
    expect(getByText('Tap').querySelector('[data-wave]')).toBeNull()
  })
})
```

`Button.test.tsx`:
```tsx
import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('defaults to primary/m and type=button', () => {
    const { getByRole } = render(() => <Button>Сохранить</Button>)
    const b = getByRole('button')
    expect(b).toHaveAttribute('type', 'button')
    expect(b.className).toContain('mode-primary')
    expect(b.className).toContain('size-m')
  })
  it('loading shows spinner, hides label visually and blocks clicks', () => {
    const onClick = vi.fn()
    const { getByRole } = render(() => <Button loading onClick={onClick}>Сохранить</Button>)
    const b = getByRole('button')
    expect(b).toHaveAttribute('aria-busy', 'true')
    expect(b.querySelector('[data-spinner]')).not.toBeNull()
    fireEvent.click(b)
    expect(onClick).not.toHaveBeenCalled()
  })
  it('renders before/after slots', () => {
    const { getByTestId } = render(() => <Button before={<i data-testid="b" />} after={<i data-testid="a" />}>X</Button>)
    expect(getByTestId('b')).toBeInTheDocument()
    expect(getByTestId('a')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить**

Run: `cd packages/ui-kit && vitest run src/components`
Expected: FAIL, модули не найдены.

- [ ] **Step 3: Tappable**

`Tappable.module.css`:
```css
.root { position: relative; overflow: hidden; cursor: pointer; user-select: none; -webkit-tap-highlight-color: transparent; transition: background-color var(--vk-duration-s) var(--vk-ease-default), opacity var(--vk-duration-s) var(--vk-ease-default); }
.root:where(button) { appearance: none; border: 0; background: none; padding: 0; color: inherit; font: inherit; text-align: inherit; }
.bg:hover { background-color: var(--vk-state_hover); }
.bg:active { background-color: var(--vk-state_active); }
.op:hover { opacity: 0.8; }
.op:active { opacity: 0.6; }
.disabled { cursor: default; pointer-events: none; opacity: 0.6; }
.wave { position: absolute; width: 16px; height: 16px; margin: -8px 0 0 -8px; border-radius: 50%; background: var(--vk-state_active); pointer-events: none; animation: wave var(--vk-duration-l) var(--vk-ease-platform) forwards; }
@keyframes wave { 0% { opacity: 1; transform: scale(1); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(8); } }
```

`Tappable.tsx`:
```tsx
import type { JSX, ValidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { splitProps } from 'solid-js'
import s from './Tappable.module.css'

export type TappableProps<T extends ValidComponent = 'div'> = {
  as?: T
  hoverMode?: 'background' | 'opacity' | 'none'
  disabled?: boolean
  class?: string
  children?: JSX.Element
  onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>
} & Record<string, unknown>

export function Tappable(props: TappableProps) {
  const [local, rest] = splitProps(props, ['as', 'hoverMode', 'disabled', 'class', 'children'])
  const mode = () => local.hoverMode ?? 'background'
  const onPointerDown = (e: PointerEvent & { currentTarget: HTMLElement }) => {
    if (local.disabled) return
    const host = e.currentTarget
    const rect = host.getBoundingClientRect()
    const wave = document.createElement('span')
    wave.className = s.wave
    wave.dataset.wave = ''
    wave.style.left = `${e.clientX - rect.left}px`
    wave.style.top = `${e.clientY - rect.top}px`
    wave.addEventListener('animationend', () => wave.remove(), { once: true })
    host.appendChild(wave)
  }
  return (
    <Dynamic
      component={(local.as ?? 'div') as ValidComponent}
      class={[s.root, mode() === 'background' ? s.bg : mode() === 'opacity' ? s.op : '', local.disabled ? s.disabled : '', local.class ?? ''].join(' ').trim()}
      aria-disabled={local.disabled ? 'true' : undefined}
      disabled={local.as === 'button' && local.disabled ? true : undefined}
      onPointerDown={onPointerDown}
      {...rest}
    >
      {local.children}
    </Dynamic>
  )
}
```

- [ ] **Step 4: Spinner, Counter, Separator**

`Spinner.tsx` + css:
```tsx
import s from './Spinner.module.css'
export function Spinner(props: { size?: number; class?: string }) {
  const size = () => props.size ?? 16
  return (
    <svg data-spinner class={`${s.root} ${props.class ?? ''}`} width={size()} height={size()} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="30 12" />
    </svg>
  )
}
```
```css
.root { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
```

`Counter.tsx` + css:
```tsx
import type { JSX } from 'solid-js'
import s from './Counter.module.css'
export function Counter(props: { mode?: 'primary' | 'secondary' | 'prominent'; size?: 's' | 'm'; children: JSX.Element; class?: string }) {
  return <span class={`${s.root} ${s[props.mode ?? 'secondary']} ${s[`size-${props.size ?? 'm'}`]} ${props.class ?? ''}`}>{props.children}</span>
}
```
```css
.root { display: inline-flex; align-items: center; justify-content: center; border-radius: var(--vk-radius-rounded); font-weight: 500; padding: 0 6px; }
.size-m { min-width: 24px; height: 24px; font-size: 13px; line-height: 16px; }
.size-s { min-width: 16px; height: 16px; font-size: 11px; line-height: 14px; padding: 0 4px; }
.primary { background: var(--vk-background_accent); color: var(--vk-text_contrast); }
.secondary { background: var(--vk-background_secondary_alpha); color: var(--vk-text_secondary); }
.prominent { background: var(--vk-background_negative); color: var(--vk-text_contrast); }
```

`Separator.tsx` + css:
```tsx
import s from './Separator.module.css'
export function Separator(props: { wide?: boolean; class?: string }) {
  return <hr class={`${s.root} ${props.wide ? s.wide : ''} ${props.class ?? ''}`} />
}
```
```css
.root { border: 0; height: 1px; margin: 0 16px; background: var(--vk-separator_primary); }
.wide { margin: 0; }
```

- [ ] **Step 5: Button**

`Button.module.css`:
```css
.root { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: var(--vk-radius); font-weight: 500; white-space: nowrap; padding: 0 16px; position: relative; }
.stretched { width: 100%; }
.size-s { height: var(--vk-size-button-s); font-size: 14px; line-height: 18px; padding: 0 12px; }
.size-m { height: var(--vk-size-button-m); font-size: 15px; line-height: 20px; }
.size-l { height: var(--vk-size-button-l); font-size: 16px; line-height: 20px; padding: 0 20px; }
.mode-primary.accent { background: var(--vk-background_accent_themed); color: var(--vk-text_contrast_themed); }
.mode-primary.negative { background: var(--vk-background_negative); color: var(--vk-text_contrast); }
.mode-primary.neutral { background: var(--vk-text_primary); color: var(--vk-background_content); }
.mode-secondary { background: var(--vk-background_secondary_alpha); }
.mode-secondary.accent { color: var(--vk-text_accent); }
.mode-secondary.negative { color: var(--vk-text_negative); }
.mode-secondary.neutral { color: var(--vk-text_primary); }
.mode-tertiary { background: transparent; }
.mode-tertiary.accent { color: var(--vk-text_accent); }
.mode-tertiary.negative { color: var(--vk-text_negative); }
.mode-tertiary.neutral { color: var(--vk-text_primary); }
.mode-outline { background: transparent; box-shadow: inset 0 0 0 1px currentColor; }
.mode-outline.accent { color: var(--vk-text_accent); }
.mode-outline.negative { color: var(--vk-text_negative); }
.mode-outline.neutral { color: var(--vk-text_primary); }
.mode-primary:hover { filter: brightness(0.96); }
.mode-primary:active { filter: brightness(0.92); }
.loading .label, .loading .slot { visibility: hidden; }
.spinner { position: absolute; inset: 0; display: grid; place-items: center; }
```

`Button.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import { Tappable } from '../Tappable/Tappable'
import { Spinner } from '../Spinner/Spinner'
import s from './Button.module.css'

export type ButtonProps = {
  mode?: 'primary' | 'secondary' | 'tertiary' | 'outline'
  size?: 's' | 'm' | 'l'
  appearance?: 'accent' | 'neutral' | 'negative'
  stretched?: boolean
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  before?: JSX.Element
  after?: JSX.Element
  class?: string
  children?: JSX.Element
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ['mode', 'size', 'appearance', 'stretched', 'loading', 'disabled', 'type', 'before', 'after', 'class', 'children', 'onClick'])
  const mode = () => local.mode ?? 'primary'
  const classes = () => [s.root, s[`mode-${mode()}`], s[`size-${local.size ?? 'm'}`], s[local.appearance ?? 'accent'], local.stretched ? s.stretched : '', local.loading ? s.loading : '', local.class ?? ''].join(' ').trim()
  return (
    <Tappable
      as="button"
      hoverMode={mode() === 'primary' ? 'none' : 'background'}
      type={local.type ?? 'button'}
      class={classes()}
      disabled={local.disabled || local.loading}
      aria-busy={local.loading ? 'true' : undefined}
      onClick={(e: MouseEvent & { currentTarget: HTMLButtonElement; target: Element }) => {
        if (local.loading || local.disabled) return
        const h = local.onClick
        if (typeof h === 'function') h(e)
        else if (Array.isArray(h)) h[0](h[1], e) // Solid bound-handler form [fn, data]
      }}
      {...rest}
    >
      <Show when={local.before}><span class={s.slot}>{local.before}</span></Show>
      <span class={s.label}>{local.children}</span>
      <Show when={local.after}><span class={s.slot}>{local.after}</span></Show>
      <Show when={local.loading}><span class={s.spinner}><Spinner /></span></Show>
    </Tappable>
  )
}
```

Примечание: `Tappable` с `disabled` ставит `pointer-events: none`, поэтому в тесте `fireEvent.click` всё равно доходит до обработчика в jsdom (там нет CSS) — поэтому проверка `loading` внутри `onClick` обязательна.

- [ ] **Step 6: Экспорт, тесты**

Добавить в `src/index.ts`:
```ts
export { Tappable, type TappableProps } from './components/Tappable/Tappable'
export { Button, type ButtonProps } from './components/Button/Button'
export { Counter } from './components/Counter/Counter'
export { Separator } from './components/Separator/Separator'
export { Spinner } from './components/Spinner/Spinner'
```

Run: `cd packages/ui-kit && vitest run && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): Tappable with ripple, Button, Counter, Separator, Spinner"
```

---

### Task 6: ui-kit: Avatar with mesh gradient, Cell, Group, Typography

**Files:**
- Create: `src/lib/mesh.ts`, `src/lib/mesh.test.ts`, `src/components/Avatar/Avatar.tsx|.module.css|.test.tsx`, `src/components/Cell/Cell.tsx|.module.css|.test.tsx`, `src/components/Group/Group.tsx|.module.css`, `src/components/Typography/Typography.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `meshGradient(seed: number | string, n?: number): string` (значение `background-image`), `<Avatar size?=24|32|48|96|128 src?=string seed?=number|string alt?=string online?=boolean />`, `<Cell before? after? subtitle? onClick? href? multiline?>{title}</Cell>`, `<Group header?=JSX>{children}</Group>`, `<Typography role=TypographyRole as?>{...}</Typography>`.

- [ ] **Step 1: Failing test для mesh**

`src/lib/mesh.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { meshGradient, paletteFor } from './mesh'

describe('meshGradient', () => {
  it('is deterministic for the same seed', () => {
    expect(meshGradient(42)).toBe(meshGradient(42))
    expect(meshGradient('deniscoreablev')).toBe(meshGradient('deniscoreablev'))
  })
  it('differs across seeds', () => {
    expect(meshGradient(1)).not.toBe(meshGradient(2))
  })
  it('emits n*n radial layers plus a base linear layer', () => {
    const css = meshGradient(7, 2)
    expect(css.match(/radial-gradient/g)?.length).toBe(4)
    expect(css.match(/linear-gradient/g)?.length).toBe(1)
  })
  it('palette colours are 6-digit hex', () => {
    for (const c of paletteFor(99, 9)) expect(c).toMatch(/^#[0-9a-f]{6}$/)
  })
})
```

- [ ] **Step 2: mesh.ts (перенос функции mesh() из прототипа, палитра из seed)**

```ts
function hash(seed: number | string): number {
  let h = 2166136261
  const str = String(seed)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function hsl2hex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
/** n² цветов вокруг базового оттенка, как «карта цветов» в прототипе */
export function paletteFor(seed: number | string, count: number): string[] {
  const rnd = mulberry32(hash(seed))
  const baseHue = Math.floor(rnd() * 360)
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const hue = (baseHue + (rnd() - 0.5) * 80 + 360) % 360
    out.push(hsl2hex(hue, 0.55 + rnd() * 0.3, 0.45 + rnd() * 0.3))
  }
  return out
}
/** Меш-градиент: n×n радиальных пятен + линейная подложка средним цветом */
export function meshGradient(seed: number | string, n = 3): string {
  const cols = paletteFor(seed, n * n)
  const r = Math.round(150 / n)
  const layers = cols.map((c, i) => {
    const x = (((i % n) + 0.5) / n) * 100
    const y = ((Math.floor(i / n) + 0.5) / n) * 100
    return `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${c} 0%, ${c}00 ${r}%)`
  })
  const base = cols[Math.floor(cols.length / 2)] ?? '#888888'
  return `${layers.join(',')},linear-gradient(${base},${base})`
}
```

- [ ] **Step 3: Failing tests Avatar и Cell**

`Avatar.test.tsx`:
```tsx
import { render } from '@solidjs/testing-library'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('renders img when src given', () => {
    const { getByRole } = render(() => <Avatar src="/a.jpg" alt="Денис" />)
    expect(getByRole('img')).toHaveAttribute('src', '/a.jpg')
  })
  it('renders mesh gradient from seed when no src', () => {
    const { container } = render(() => <Avatar seed={5} />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.backgroundImage).toContain('radial-gradient')
    expect(root.querySelector('img')).toBeNull()
  })
  it('gradient avatar is labelled when alt given and hidden otherwise', () => {
    const named = render(() => <Avatar seed={2} alt="Денис" />).container.firstElementChild!
    expect(named).toHaveAttribute('role', 'img')
    expect(named).toHaveAttribute('aria-label', 'Денис')
    const anon = render(() => <Avatar seed={3} />).container.firstElementChild!
    expect(anon).toHaveAttribute('aria-hidden', 'true')
  })
  it('sets size and online dot', () => {
    const { container } = render(() => <Avatar seed={1} size={96} online />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.width).toBe('96px')
    expect(root.querySelector('[data-online]')).not.toBeNull()
  })
})
```

`Cell.test.tsx`:
```tsx
import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Cell } from './Cell'

describe('Cell', () => {
  it('renders title, subtitle, before and after', () => {
    const { getByText, getByTestId } = render(() => (
      <Cell before={<i data-testid="b" />} after={<i data-testid="a" />} subtitle="онлайн">Денис Кораблев</Cell>
    ))
    expect(getByText('Денис Кораблев')).toBeInTheDocument()
    expect(getByText('онлайн')).toBeInTheDocument()
    expect(getByTestId('b')).toBeInTheDocument()
    expect(getByTestId('a')).toBeInTheDocument()
  })
  it('is a link when href given, a button when onClick given, div otherwise', () => {
    expect(render(() => <Cell href="/id1">x</Cell>).container.querySelector('a')).not.toBeNull()
    const onClick = vi.fn()
    const { getByRole } = render(() => <Cell onClick={onClick}>x</Cell>)
    fireEvent.click(getByRole('button'))
    expect(onClick).toHaveBeenCalled()
    expect(render(() => <Cell>x</Cell>).container.firstElementChild?.tagName).toBe('DIV')
  })
})
```

- [ ] **Step 4: Avatar**

```tsx
import { Show } from 'solid-js'
import { meshGradient } from '../../lib/mesh'
import s from './Avatar.module.css'

export type AvatarProps = { size?: 24 | 32 | 48 | 96 | 128; src?: string | null; seed?: number | string; alt?: string; online?: boolean; class?: string }
export function Avatar(props: AvatarProps) {
  const size = () => props.size ?? 48
  return (
    <span
      class={`${s.root} ${props.class ?? ''}`}
      style={{ width: `${size()}px`, height: `${size()}px`, 'background-image': props.src ? undefined : meshGradient(props.seed ?? 0) }}
      role={!props.src && props.alt ? 'img' : undefined}
      aria-label={!props.src && props.alt ? props.alt : undefined}
      aria-hidden={!props.src && !props.alt ? 'true' : undefined}
    >
      <Show when={props.src}>{(src) => <img class={s.img} src={src()} alt={props.alt ?? ''} width={size()} height={size()} />}</Show>
      <Show when={props.online}><i data-online class={s.online} /></Show>
    </span>
  )
}
```
```css
.root { position: relative; display: inline-block; border-radius: 50%; background-size: cover; flex: 0 0 auto; overflow: visible; }
.img { display: block; width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.online { position: absolute; right: 2px; bottom: 2px; width: 8px; height: 8px; border-radius: 50%; background: var(--vk-background_positive); box-shadow: 0 0 0 2px var(--vk-background_content); }
```

- [ ] **Step 5: Cell, Group, Typography**

`Cell.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import { Tappable } from '../Tappable/Tappable'
import s from './Cell.module.css'

export type CellProps = { before?: JSX.Element; after?: JSX.Element; subtitle?: JSX.Element; children: JSX.Element; href?: string; onClick?: JSX.EventHandlerUnion<HTMLElement, MouseEvent>; multiline?: boolean; class?: string }
export function Cell(props: CellProps) {
  const as = () => (props.href ? 'a' : props.onClick ? 'button' : 'div')
  const content = (
    <>
      <Show when={props.before}><span class={s.before}>{props.before}</span></Show>
      <span class={s.main}>
        <span class={`${s.title} ${props.multiline ? s.multiline : ''}`}>{props.children}</span>
        <Show when={props.subtitle}><span class={s.subtitle}>{props.subtitle}</span></Show>
      </span>
      <Show when={props.after}><span class={s.after}>{props.after}</span></Show>
    </>
  )
  return (
    <Show when={as() !== 'div'} fallback={<div class={`${s.root} ${props.class ?? ''}`}>{content}</div>}>
      <Tappable as={as()} href={props.href} onClick={props.onClick} class={`${s.root} ${props.class ?? ''}`}>{content}</Tappable>
    </Show>
  )
}
```
```css
.root { display: flex; align-items: center; gap: 12px; min-height: var(--vk-size-cell); padding: 6px 16px; width: 100%; color: var(--vk-text_primary); text-decoration: none; }
.before, .after { display: flex; align-items: center; flex: 0 0 auto; }
.after { color: var(--vk-icon_secondary); margin-left: auto; }
.main { display: flex; flex-direction: column; min-width: 0; flex: 1; text-align: left; }
.title { font-size: 15px; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.multiline { white-space: normal; }
.subtitle { font-size: 13px; line-height: 16px; color: var(--vk-text_secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

`Group.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import s from './Group.module.css'
export function Group(props: { header?: JSX.Element; children: JSX.Element; class?: string; padded?: boolean }) {
  return (
    <section class={`${s.root} ${props.padded ? s.padded : ''} ${props.class ?? ''}`}>
      <Show when={props.header}><header class={s.header}>{props.header}</header></Show>
      {props.children}
    </section>
  )
}
```
```css
.root { background: var(--vk-background_content); border-radius: var(--vk-radius-paper); box-shadow: 0 0 0 1px var(--vk-separator_secondary); overflow: hidden; }
.padded { padding: 12px 16px; }
.header { padding: 12px 16px 8px; font: 500 15px/20px var(--vk-font-family); color: var(--vk-text_primary); display: flex; align-items: center; justify-content: space-between; }
```

`Typography.tsx`:
```tsx
import type { JSX, ValidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'
export type TypographyRole = 'title1' | 'display_title1' | 'display_title2' | 'title2' | 'display_title3' | 'title3' | 'display_title4' | 'headline1' | 'headline' | 'text' | 'headline2' | 'paragraph' | 'subhead' | 'footnote' | 'footnote_caps' | 'caption1' | 'caption1_caps' | 'caption2' | 'caption2_caps' | 'caption3' | 'caption3_caps'
export function Typography(props: { role: TypographyRole; as?: ValidComponent; class?: string; children: JSX.Element; muted?: boolean }) {
  return (
    <Dynamic component={props.as ?? 'span'} class={`vk-${props.role} ${props.class ?? ''}`} style={props.muted ? { color: 'var(--vk-text_secondary)' } : undefined}>
      {props.children}
    </Dynamic>
  )
}
```

- [ ] **Step 6: Экспорт, тесты**

Добавить в `src/index.ts`:
```ts
export { Avatar, type AvatarProps } from './components/Avatar/Avatar'
export { Cell, type CellProps } from './components/Cell/Cell'
export { Group } from './components/Group/Group'
export { Typography, type TypographyRole } from './components/Typography/Typography'
export { meshGradient } from './lib/mesh'
```

Run: `cd packages/ui-kit && vitest run && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): Avatar with seeded mesh gradient, Cell, Group, Typography"
```

---

### Task 7: ui-kit: Input, Textarea, FormItem, Tabs, Modal, Snackbar, Skeleton, catalog page

**Files:**
- Create: `src/components/Input/Input.tsx|.module.css|.test.tsx`, `src/components/Textarea/Textarea.tsx`, `src/components/FormItem/FormItem.tsx|.module.css`, `src/components/Tabs/Tabs.tsx|.module.css|.test.tsx`, `src/components/Modal/Modal.tsx|.module.css|.test.tsx`, `src/components/Snackbar/Snackbar.tsx|.module.css|.test.tsx`, `src/components/Skeleton/Skeleton.tsx|.module.css`, `catalog/index.html`, `catalog/main.tsx`
- Modify: `src/index.ts`

**Interfaces:**
- Produces: `<Input value onInput before? after? status?='default'|'error'|'valid' placeholder type name autocomplete />` (проксирует остальные атрибуты на `<input>`), `<Textarea ...>` (то же на `<textarea>`), `<FormItem top? bottom? status?>{control}</FormItem>`, `<Tabs value onChange items=[{id,label,counter?}] />`, `<Modal open onClose title? size?='s'|'m'|'l'>{children}</Modal>`, `SnackbarHost` + `useSnackbar(): { show(text: string, opts?: { action?: {label, onClick}, duration?: number, appearance?: 'default'|'negative' }) }`, `<Skeleton width? height? radius? />`.

- [ ] **Step 1: Failing tests Input, Tabs, Modal, Snackbar**

`Input.test.tsx`:
```tsx
import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('forwards native attrs and reports input', () => {
    const onInput = vi.fn()
    const { getByPlaceholderText } = render(() => <Input placeholder="Логин" name="login" autocomplete="username" onInput={(e) => onInput(e.currentTarget.value)} />)
    const el = getByPlaceholderText('Логин') as HTMLInputElement
    expect(el.name).toBe('login')
    fireEvent.input(el, { target: { value: 'den' } })
    expect(onInput).toHaveBeenCalledWith('den')
  })
  it('status=error sets aria-invalid', () => {
    const { getByRole } = render(() => <Input status="error" />)
    expect(getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})
```

`Tabs.test.tsx`:
```tsx
import { fireEvent, render } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [{ id: 'all', label: 'Все' }, { id: 'req', label: 'Заявки', counter: 3 }]
describe('Tabs', () => {
  it('marks selected tab and switches on click', () => {
    const onChange = vi.fn()
    const { getByRole } = render(() => <Tabs value="all" onChange={onChange} items={items} />)
    expect(getByRole('tab', { name: /Все/ })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(getByRole('tab', { name: /Заявки/ }))
    expect(onChange).toHaveBeenCalledWith('req')
  })
  it('renders counters', () => {
    const { getByText } = render(() => <Tabs value="all" onChange={() => {}} items={items} />)
    expect(getByText('3')).toBeInTheDocument()
  })
})
```

`Modal.test.tsx` (Modal рендерится через `<Portal>` в `document.body`, поэтому запросы через `screen`, а не через контейнер `render`):
```tsx
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

afterEach(cleanup)
describe('Modal', () => {
  it('renders nothing when closed and dialog when open', () => {
    render(() => <Modal open={false} onClose={() => {}}>x</Modal>)
    expect(screen.queryByRole('dialog')).toBeNull()
    cleanup()
    render(() => <Modal open onClose={() => {}} title="Выйти?">x</Modal>)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Выйти?')
  })
  it('closes on Escape and on overlay click', () => {
    const onClose = vi.fn()
    render(() => <Modal open onClose={onClose}>x</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByTestId('overlay'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
```

`Snackbar.test.tsx` (хост рендерится через `<Portal>`, запросы через `screen`):
```tsx
import { fireEvent, render, screen } from '@solidjs/testing-library'
import { describe, expect, it, vi } from 'vitest'
import { SnackbarHost, useSnackbar } from './Snackbar'

function Trigger() {
  const snack = useSnackbar()
  return <button onClick={() => snack.show('Ссылка скопирована', { duration: 1000, action: { label: 'Отменить', onClick: () => {} } })}>go</button>
}
describe('Snackbar', () => {
  it('shows message with action and hides after duration', () => {
    vi.useFakeTimers()
    render(() => <SnackbarHost><Trigger /></SnackbarHost>)
    fireEvent.click(screen.getByText('go'))
    expect(screen.getByText('Ссылка скопирована')).toBeInTheDocument()
    expect(screen.getByText('Отменить')).toBeInTheDocument()
    vi.advanceTimersByTime(1100)
    expect(screen.queryByText('Ссылка скопирована')).toBeNull()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Запустить**

Run: `cd packages/ui-kit && vitest run src/components`
Expected: FAIL для четырёх новых файлов.

- [ ] **Step 3: Input, Textarea, FormItem**

`Input.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'
import s from './Input.module.css'

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement> & { before?: JSX.Element; after?: JSX.Element; status?: 'default' | 'error' | 'valid' }
export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ['before', 'after', 'status', 'class'])
  return (
    <span class={`${s.root} ${s[local.status ?? 'default']} ${local.class ?? ''}`}>
      <Show when={local.before}><span class={s.slot}>{local.before}</span></Show>
      <input class={s.input} aria-invalid={local.status === 'error' ? 'true' : undefined} {...rest} />
      <Show when={local.after}><span class={s.slot}>{local.after}</span></Show>
    </span>
  )
}
```
```css
.root { display: flex; align-items: center; gap: 8px; height: var(--vk-size-field); padding: 0 12px; border-radius: var(--vk-radius); background: var(--vk-field_background); box-shadow: inset 0 0 0 1px var(--vk-separator_primary); transition: box-shadow var(--vk-duration-s) var(--vk-ease-default); }
.root:focus-within { box-shadow: inset 0 0 0 1px var(--vk-text_accent); }
.error { box-shadow: inset 0 0 0 1px var(--vk-background_negative); }
.valid { box-shadow: inset 0 0 0 1px var(--vk-background_positive); }
.input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--vk-text_primary); font-size: 15px; line-height: 20px; height: 100%; }
.input::placeholder { color: var(--vk-text_secondary); }
.slot { display: flex; color: var(--vk-icon_secondary); }
```

`Textarea.tsx` (переиспользует `Input.module.css`):
```tsx
import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'
import s from '../Input/Input.module.css'

export type TextareaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & { status?: 'default' | 'error' | 'valid' }
export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ['status', 'class', 'rows'])
  return (
    <span class={`${s.root} ${s[local.status ?? 'default']} ${local.class ?? ''}`} style={{ height: 'auto', padding: '8px 12px' }}>
      <textarea class={s.input} rows={local.rows ?? 3} style={{ resize: 'vertical', 'line-height': '20px' }} aria-invalid={local.status === 'error' ? 'true' : undefined} {...rest} />
    </span>
  )
}
```

`FormItem.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { Show } from 'solid-js'
import s from './FormItem.module.css'
export function FormItem(props: { top?: JSX.Element; bottom?: JSX.Element; status?: 'default' | 'error' | 'valid'; children: JSX.Element; class?: string }) {
  return (
    <label class={`${s.root} ${props.class ?? ''}`}>
      <Show when={props.top}><span class={s.top}>{props.top}</span></Show>
      {props.children}
      <Show when={props.bottom}><span class={`${s.bottom} ${props.status === 'error' ? s.error : ''}`}>{props.bottom}</span></Show>
    </label>
  )
}
```
```css
.root { display: flex; flex-direction: column; gap: 6px; padding: 8px 0; }
.top { font-size: 14px; line-height: 18px; color: var(--vk-text_subhead); }
.bottom { font-size: 13px; line-height: 16px; color: var(--vk-text_secondary); }
.error { color: var(--vk-text_negative); }
```

- [ ] **Step 4: Tabs**

```tsx
import { For, Show } from 'solid-js'
import { Counter } from '../Counter/Counter'
import { Tappable } from '../Tappable/Tappable'
import s from './Tabs.module.css'
export type TabItem<T extends string = string> = { id: T; label: string; counter?: number }
export function Tabs<T extends string>(props: { value: T; onChange: (id: T) => void; items: TabItem<T>[]; class?: string }) {
  return (
    <div role="tablist" class={`${s.root} ${props.class ?? ''}`}>
      <For each={props.items}>
        {(item) => (
          <Tappable as="button" role="tab" aria-selected={props.value === item.id ? 'true' : 'false'} class={`${s.tab} ${props.value === item.id ? s.selected : ''}`} onClick={() => props.onChange(item.id)}>
            <span>{item.label}</span>
            <Show when={item.counter !== undefined}><Counter size="s">{item.counter}</Counter></Show>
          </Tappable>
        )}
      </For>
    </div>
  )
}
```
```css
.root { display: flex; gap: 4px; padding: 0 8px; border-bottom: 1px solid var(--vk-separator_primary); }
.tab { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 12px; font: 500 15px/20px var(--vk-font-family); color: var(--vk-text_secondary); border-radius: var(--vk-radius) var(--vk-radius) 0 0; position: relative; }
.selected { color: var(--vk-text_primary); }
.selected::after { content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px; height: 2px; border-radius: 2px 2px 0 0; background: var(--vk-text_accent); }
```

- [ ] **Step 5: Modal**

```tsx
import type { JSX } from 'solid-js'
import { Show, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Icon } from '../../icons/Icon'
import { Tappable } from '../Tappable/Tappable'
import s from './Modal.module.css'

export function Modal(props: { open: boolean; onClose: () => void; title?: string; size?: 's' | 'm' | 'l'; children: JSX.Element }) {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.open) props.onClose() }
  onMount(() => document.addEventListener('keydown', onKey))
  onCleanup(() => document.removeEventListener('keydown', onKey))
  return (
    <Show when={props.open}>
      <Portal>
        <div class={s.overlay} data-testid="overlay" onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
          <div role="dialog" aria-modal="true" aria-label={props.title} class={`${s.card} ${s[`size-${props.size ?? 's'}`]}`}>
            <Show when={props.title}>
              <header class={s.header}>
                <span class="vk-title3">{props.title}</span>
                <Tappable as="button" hoverMode="opacity" aria-label="Закрыть" onClick={props.onClose}><Icon name="cancel_24" /></Tappable>
              </header>
            </Show>
            <div class={s.body}>{props.children}</div>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
```
```css
.overlay { position: fixed; inset: 0; background: var(--vk-overlay_primary); display: grid; place-items: center; z-index: 100; animation: fade var(--vk-duration-s) ease-in; }
.card { background: var(--vk-background_modal); border-radius: var(--vk-radius-paper); box-shadow: var(--vk-elevation-4); width: min(100% - 32px, var(--w)); animation: scaleUp var(--vk-duration-m) var(--vk-ease-platform); }
.size-s { --w: 430px; } .size-m { --w: 680px; } .size-l { --w: 880px; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 0; }
.body { padding: 20px; }
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
```

Проверить, что `cancel_24` есть в `names.ts` (`grep "'cancel_24'" src/icons/names.ts`); если нет, взять `cancel_outline_24`.

- [ ] **Step 6: Snackbar и Skeleton**

`Snackbar.tsx`:
```tsx
import type { JSX } from 'solid-js'
import { For, createContext, createSignal, useContext } from 'solid-js'
import { Portal } from 'solid-js/web'
import { Button } from '../Button/Button'
import s from './Snackbar.module.css'

type Snack = { id: number; text: string; appearance: 'default' | 'negative'; action?: { label: string; onClick: () => void } }
type Api = { show: (text: string, opts?: { action?: Snack['action']; duration?: number; appearance?: Snack['appearance'] }) => void }
const Ctx = createContext<Api>()

export function SnackbarHost(props: { children: JSX.Element }) {
  const [items, setItems] = createSignal<Snack[]>([])
  let seq = 0
  const api: Api = {
    show(text, opts) {
      const id = ++seq
      setItems((xs) => [...xs, { id, text, appearance: opts?.appearance ?? 'default', action: opts?.action }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), opts?.duration ?? 4000)
    },
  }
  return (
    <Ctx.Provider value={api}>
      {props.children}
      <Portal>
        <div class={s.host} aria-live="polite">
          <For each={items()}>
            {(x) => (
              <div class={`${s.snack} ${x.appearance === 'negative' ? s.negative : ''}`}>
                <span class={s.text}>{x.text}</span>
                {x.action && <Button mode="tertiary" size="s" onClick={() => { x.action?.onClick(); setItems((xs) => xs.filter((y) => y.id !== x.id)) }}>{x.action.label}</Button>}
              </div>
            )}
          </For>
        </div>
      </Portal>
    </Ctx.Provider>
  )
}
export function useSnackbar(): Api {
  const api = useContext(Ctx)
  if (!api) throw new Error('useSnackbar outside SnackbarHost')
  return api
}
```
```css
.host { position: fixed; left: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 110; }
.snack { display: flex; align-items: center; gap: 12px; min-width: 280px; max-width: 420px; padding: 12px 16px; border-radius: var(--vk-radius-paper); background: var(--vk-background_content); box-shadow: var(--vk-elevation-3); animation: slideIn var(--vk-duration-l) var(--vk-ease-platform); }
.negative { box-shadow: var(--vk-elevation-3), inset 0 0 0 1px var(--vk-background_negative); }
.text { flex: 1; font-size: 15px; line-height: 20px; }
@keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
```

`Skeleton.tsx`:
```tsx
import s from './Skeleton.module.css'
export function Skeleton(props: { width?: string | number; height?: string | number; radius?: string | number; class?: string }) {
  const px = (v: string | number | undefined, d: string) => (v === undefined ? d : typeof v === 'number' ? `${v}px` : v)
  return <span class={`${s.root} ${props.class ?? ''}`} style={{ width: px(props.width, '100%'), height: px(props.height, '16px'), 'border-radius': px(props.radius, '6px') }} aria-hidden="true" />
}
```
```css
.root { display: block; position: relative; overflow: hidden; background: var(--vk-skeleton_from); }
.root::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, var(--vk-skeleton_to), transparent); animation: shimmer 1.6s linear infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
```

- [ ] **Step 7: Каталог компонентов**

`catalog/index.html`:
```html
<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>ui-kit catalog</title></head>
<body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>
```

`catalog/main.tsx` — страница с секциями: переключатель темы (`document.documentElement.dataset.vk = 'dark'|'light'`), все режимы Button × размеры, Avatar 5 размеров с seed 1..5 и online, Cell с before/after, Tabs, Input в трёх статусах, Modal по кнопке, Snackbar по кнопке, Skeleton, сетка из первых 200 иконок с подписями. Импортирует `../src/tokens/tokens.css`, `../src/tokens/typography.css`, `spriteUrl from '../src/icons/sprite.svg?url'` и вызывает `configureIcons({ spriteUrl })`.

Run: `cd packages/ui-kit && bun run catalog` → открыть `http://localhost:5174`, глазами проверить: кнопки, волна при клике, иконки видны, тёмная тема переключается.

- [ ] **Step 8: Экспорт, тесты, коммит**

Добавить в `src/index.ts`:
```ts
export { Input, type InputProps } from './components/Input/Input'
export { Textarea } from './components/Textarea/Textarea'
export { FormItem } from './components/FormItem/FormItem'
export { Tabs, type TabItem } from './components/Tabs/Tabs'
export { Modal } from './components/Modal/Modal'
export { SnackbarHost, useSnackbar } from './components/Snackbar/Snackbar'
export { Skeleton } from './components/Skeleton/Skeleton'
```

Run: `cd packages/ui-kit && bun run test && bun run typecheck`
Expected: PASS.

```bash
git add packages/ui-kit
git commit -m "feat(ui-kit): Input, Textarea, FormItem, Tabs, Modal, Snackbar, Skeleton and catalog page"
```

---

### Task 8: API skeleton, config, kernel buses

**Files:**
- Create: `apps/api/package.json`, `tsconfig.json`, `src/main.ts`, `src/app.ts`, `src/config.ts`, `src/kernel/errors.ts`, `src/kernel/command-bus.ts`, `src/kernel/query-bus.ts`, `src/kernel/event-bus.ts`, `src/kernel/kernel.test.ts`

**Interfaces:**
- Produces:
  - `config: { databaseUrl, redisUrl, apiPort, webOrigin, isTest }` из env.
  - `class AppError extends Error { constructor(code: string, message: string, status: number) }` и наследники `NotFoundError(404)`, `ConflictError(409)`, `UnauthorizedError(401)`, `ForbiddenError(403)`, `ValidationError(422)`, `DomainRuleError(422)`.
  - `CommandBus`: `register<C extends object, R>(ctor: new (...args: never[]) => C, handler: (cmd: C) => Promise<R>): void`, `execute<C extends Command<unknown>>(cmd: C): Promise<ResultOf<C>>`. Команда — класс, реализующий `Command<R>` (маркер `declare readonly __result: R`).
  - `QueryBus` с тем же API (`Query<R>`, `ask`).
  - `EventBus`: `subscribe<E extends DomainEvent>(type: E['type'], h: (e: E) => Promise<void> | void)`, `publish(events: DomainEvent[]): Promise<void>` — обработчики выполняются последовательно, ошибка одного логируется и не останавливает остальных.
  - `DomainEvent = { type: string; occurredAt: Date; payload: unknown }`.
  - `buildApp(deps): Elysia` — собирает приложение из модулей; сейчас регистрирует только `GET /api/v1/health` → `{ ok: true }`.

- [ ] **Step 1: package.json и tsconfig**

```json
{
  "name": "@vkc/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/main.ts",
    "start": "bun src/main.ts",
    "test": "bun test",
    "typecheck": "tsc -p tsconfig.json",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun src/db/migrate.ts",
    "db:migrate:test": "DATABASE_URL=$DATABASE_URL_TEST bun src/db/migrate.ts"
  },
  "dependencies": {
    "@elysia/eden": "^1.4.10",
    "drizzle-orm": "^0.45.2",
    "elysia": "^1.4.30",
    "ioredis": "^5.6.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "drizzle-kit": "^0.31.10"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["bun-types"] },
  "include": ["src", "test", "drizzle.config.ts"]
}
```

- [ ] **Step 2: Failing tests kernel**

`src/kernel/kernel.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { CommandBus, type Command } from './command-bus'
import { QueryBus, type Query } from './query-bus'
import { EventBus, type DomainEvent } from './event-bus'

class Add implements Command<number> {
  declare readonly __result: number
  constructor(readonly a: number, readonly b: number) {}
}
class Echo implements Query<string> {
  declare readonly __result: string
  constructor(readonly s: string) {}
}

describe('CommandBus', () => {
  it('routes command to its handler and returns typed result', async () => {
    const bus = new CommandBus()
    bus.register(Add, async (c) => c.a + c.b)
    const r: number = await bus.execute(new Add(2, 3))
    expect(r).toBe(5)
  })
  it('throws on unknown command and on duplicate registration', async () => {
    const bus = new CommandBus()
    expect(bus.execute(new Add(1, 1))).rejects.toThrow('No handler for Add')
    bus.register(Add, async () => 0)
    expect(() => bus.register(Add, async () => 0)).toThrow('already registered')
  })
})

describe('QueryBus', () => {
  it('asks', async () => {
    const bus = new QueryBus()
    bus.register(Echo, async (q) => q.s.toUpperCase())
    expect(await bus.ask(new Echo('hi'))).toBe('HI')
  })
})

describe('EventBus', () => {
  it('delivers to all subscribers of a type, keeps going after a failing one', async () => {
    const bus = new EventBus({ error: () => {} })
    const seen: string[] = []
    bus.subscribe('UserRegistered', () => { throw new Error('boom') })
    bus.subscribe('UserRegistered', (e) => { seen.push(String((e.payload as { id: number }).id)) })
    bus.subscribe('Other', () => { seen.push('other') })
    const ev: DomainEvent = { type: 'UserRegistered', occurredAt: new Date(), payload: { id: 7 } }
    await bus.publish([ev])
    expect(seen).toEqual(['7'])
  })
})
```

- [ ] **Step 3: Запустить**

Run: `cd apps/api && bun install && bun test src/kernel`
Expected: FAIL, модули не найдены.

- [ ] **Step 4: Реализация kernel**

`errors.ts`:
```ts
export class AppError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message)
    this.name = new.target.name
  }
}
export class NotFoundError extends AppError { constructor(code = 'not_found', message = 'Not found') { super(code, message, 404) } }
export class ConflictError extends AppError { constructor(code = 'conflict', message = 'Conflict') { super(code, message, 409) } }
export class UnauthorizedError extends AppError { constructor(code = 'unauthorized', message = 'Unauthorized') { super(code, message, 401) } }
export class ForbiddenError extends AppError { constructor(code = 'forbidden', message = 'Forbidden') { super(code, message, 403) } }
export class ValidationError extends AppError { constructor(code = 'validation', message = 'Invalid input') { super(code, message, 422) } }
export class DomainRuleError extends AppError { constructor(code: string, message: string) { super(code, message, 422) } }
```

`command-bus.ts`:
```ts
export interface Command<R> { readonly __result: R }
export type ResultOf<C> = C extends Command<infer R> ? R : never
type Ctor<C> = new (...args: never[]) => C
type Handler<C, R> = (cmd: C) => Promise<R>

export class CommandBus {
  private handlers = new Map<Ctor<unknown>, Handler<unknown, unknown>>()
  register<C extends object, R>(ctor: Ctor<C>, handler: Handler<C, R>): void {
    if (this.handlers.has(ctor)) throw new Error(`Handler for ${ctor.name} already registered`)
    this.handlers.set(ctor, handler as Handler<unknown, unknown>)
  }
  async execute<C extends Command<unknown>>(cmd: C): Promise<ResultOf<C>> {
    const h = this.handlers.get((cmd as object).constructor as Ctor<unknown>)
    if (!h) throw new Error(`No handler for ${(cmd as object).constructor.name}`)
    return (await h(cmd)) as ResultOf<C>
  }
}
```

`query-bus.ts` — копия с именами `Query`, `QueryBus`, метод `ask`.

`event-bus.ts`:
```ts
export type DomainEvent<T extends string = string, P = unknown> = { type: T; occurredAt: Date; payload: P }
type Logger = { error: (msg: string, meta?: unknown) => void }
export class EventBus {
  private subs = new Map<string, Array<(e: DomainEvent) => Promise<void> | void>>()
  constructor(private log: Logger = console) {}
  subscribe<E extends DomainEvent>(type: E['type'], h: (e: E) => Promise<void> | void): void {
    const list = this.subs.get(type) ?? []
    list.push(h as (e: DomainEvent) => Promise<void> | void)
    this.subs.set(type, list)
  }
  async publish(events: DomainEvent[]): Promise<void> {
    for (const e of events) {
      for (const h of this.subs.get(e.type) ?? []) {
        try { await h(e) } catch (err) { this.log.error(`event handler failed for ${e.type}`, err) }
      }
    }
  }
}
```

- [ ] **Step 5: config.ts, app.ts, main.ts**

```ts
// config.ts
function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}
export const config = {
  databaseUrl: req('DATABASE_URL'),
  redisUrl: req('REDIS_URL'),
  apiPort: Number(process.env.API_PORT ?? 3000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  isTest: process.env.NODE_ENV === 'test' || !!process.env.BUN_TEST,
  cookieSecure: process.env.COOKIE_SECURE === '1',
}
```

```ts
// app.ts
import { Elysia } from 'elysia'
import { AppError } from './kernel/errors'
import { CommandBus } from './kernel/command-bus'
import { QueryBus } from './kernel/query-bus'
import { EventBus } from './kernel/event-bus'

export type AppDeps = { commands: CommandBus; queries: QueryBus; events: EventBus }

export function buildApp(_deps: AppDeps) {
  return new Elysia({ prefix: '/api/v1' })
    .onError(({ error, set, code }) => {
      if (error instanceof AppError) {
        set.status = error.status
        return { error: { code: error.code, message: error.message } }
      }
      if (code === 'VALIDATION') {
        set.status = 422
        return { error: { code: 'validation', message: 'Invalid input' } }
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return { error: { code: 'not_found', message: 'Route not found' } }
      }
      console.error(error)
      set.status = 500
      return { error: { code: 'internal', message: 'Internal error' } }
    })
    .get('/health', () => ({ ok: true }))
}
export type App = ReturnType<typeof buildApp>
```

```ts
// main.ts
import { buildApp } from './app'
import { config } from './config'
import { CommandBus } from './kernel/command-bus'
import { QueryBus } from './kernel/query-bus'
import { EventBus } from './kernel/event-bus'

const app = buildApp({ commands: new CommandBus(), queries: new QueryBus(), events: new EventBus() })
app.listen(config.apiPort)
console.log(`api on http://localhost:${config.apiPort}/api/v1/health`)
```

- [ ] **Step 6: Тесты зелёные + health вручную**

Run: `cd apps/api && bun test && bun run typecheck`
Expected: PASS (5 тестов).

Run: `set -a; source ../../.env; set +a; bun src/main.ts & sleep 1; curl -s localhost:3000/api/v1/health; kill %1`
Expected: `{"ok":true}`.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): elysia skeleton, config, command/query/event buses, error mapping"
```

---

### Task 9: Database schema and migrations (Drizzle + pgvector)

**Files:**
- Create: `apps/api/drizzle.config.ts`, `src/db/client.ts`, `src/db/migrate.ts`, `src/db/schema/index.ts`, `src/db/schema/enums.ts`, `src/db/schema/identity.ts`, `src/db/schema/social.ts`, `src/db/schema/content.ts`, `src/db/schema/ml.ts`, `src/db/schema/messaging.ts`, `src/db/schema/manual/events.ts`, `drizzle/0000_*.sql` (сгенерировано), `drizzle/0001_events_partitioned.sql` (custom), `test/helpers/db.ts`, `src/db/schema.integration.test.ts`

**Interfaces:**
- Produces: `createDb(url: string): Db` (`Db = ReturnType<typeof drizzle>` с `schema`), таблицы Drizzle с именами ниже, `runMigrations(url: string): Promise<void>`, тест-хелпер `withTestDb()` — мигрирует `vk_test`, отдаёт `db`, чистит таблицы между тестами (`TRUNCATE ... RESTART IDENTITY CASCADE`).
- `events` создаётся вручную (партиции), в Drizzle описана в `schema/manual/events.ts`, который исключён из `drizzle.config.ts`, чтобы `drizzle-kit generate` не пытался её создавать.

- [ ] **Step 1: enums.ts**

```ts
import { pgEnum } from 'drizzle-orm/pg-core'
export const TOPICS = ['cinema', 'music', 'memes', 'games', 'it', 'sport', 'travel', 'food', 'science', 'auto', 'fashion', 'city'] as const
export type Topic = (typeof TOPICS)[number]
export const topicEnum = pgEnum('topic', TOPICS)
export const authorTypeEnum = pgEnum('author_type', ['user', 'community'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'declined'])
export const followTargetEnum = pgEnum('follow_target', ['user', 'community'])
export const memberRoleEnum = pgEnum('member_role', ['member', 'editor', 'admin'])
export const likeTargetEnum = pgEnum('like_target', ['post', 'comment'])
export const mediaKindEnum = pgEnum('media_kind', ['photo', 'audio', 'avatar', 'cover'])
export const eventKindEnum = pgEnum('event_kind', ['view', 'like', 'comment', 'repost', 'click', 'hide'])
export const modelKindEnum = pgEnum('model_kind', ['feed_ranker', 'pymk_ranker'])
```

- [ ] **Step 2: identity.ts, social.ts**

```ts
// identity.ts
import { bigint, boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core'
export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  login: varchar('login', { length: 64 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  firstName: varchar('first_name', { length: 64 }).notNull(),
  lastName: varchar('last_name', { length: 64 }).notNull(),
  screenName: varchar('screen_name', { length: 64 }),
  status: varchar('status', { length: 140 }),
  bio: text('bio'),
  avatarMediaId: bigint('avatar_media_id', { mode: 'number' }),
  coverMediaId: bigint('cover_media_id', { mode: 'number' }),
  birthday: date('birthday'),
  city: varchar('city', { length: 64 }),
  isVerified: boolean('is_verified').notNull().default(false),
  popularityRank: integer('popularity_rank').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
}, (t) => [
  uniqueIndex('users_login_uq').on(t.login),
  uniqueIndex('users_screen_name_uq').on(t.screenName),
  index('users_city_idx').on(t.city),
])
```

```ts
// social.ts
import { bigint, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, varchar, boolean } from 'drizzle-orm/pg-core'
import { followTargetEnum, friendshipStatusEnum, memberRoleEnum, topicEnum } from './enums'
import { users } from './identity'

export const communities = pgTable('communities', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  screenName: varchar('screen_name', { length: 64 }).notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  topic: topicEnum('topic').notNull(),
  avatarMediaId: bigint('avatar_media_id', { mode: 'number' }),
  isVerified: boolean('is_verified').notNull().default(false),
  membersCount: integer('members_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('communities_screen_name_uq').on(t.screenName), index('communities_topic_idx').on(t.topic)])

export const friendships = pgTable('friendships', {
  userLo: bigint('user_lo', { mode: 'number' }).notNull().references(() => users.id),
  userHi: bigint('user_hi', { mode: 'number' }).notNull().references(() => users.id),
  status: friendshipStatusEnum('status').notNull(),
  requesterId: bigint('requester_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
}, (t) => [primaryKey({ columns: [t.userLo, t.userHi] }), index('friendships_hi_idx').on(t.userHi, t.status), index('friendships_lo_idx').on(t.userLo, t.status)])

export const follows = pgTable('follows', {
  followerId: bigint('follower_id', { mode: 'number' }).notNull().references(() => users.id),
  targetType: followTargetEnum('target_type').notNull(),
  targetId: bigint('target_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.followerId, t.targetType, t.targetId] }), index('follows_target_idx').on(t.targetType, t.targetId)])

export const communityMembers = pgTable('community_members', {
  communityId: bigint('community_id', { mode: 'number' }).notNull().references(() => communities.id),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  role: memberRoleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.communityId, t.userId] }), index('community_members_user_idx').on(t.userId)])
```

- [ ] **Step 3: content.ts, ml.ts, messaging.ts**

```ts
// content.ts
import { bigint, index, integer, jsonb, pgTable, primaryKey, text, timestamp, varchar, vector } from 'drizzle-orm/pg-core'
import { authorTypeEnum, likeTargetEnum, mediaKindEnum, topicEnum } from './enums'
import { users } from './identity'

export type Attachment = { kind: 'photo' | 'audio' | 'link'; mediaId?: number; meta?: Record<string, unknown> }

export const media = pgTable('media', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
  kind: mediaKindEnum('kind').notNull(),
  bucket: varchar('bucket', { length: 64 }).notNull(),
  key: text('key').notNull(),
  contentHash: varchar('content_hash', { length: 64 }),
  width: integer('width'),
  height: integer('height'),
  duration: integer('duration'),
  blurhash: varchar('blurhash', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('media_hash_idx').on(t.contentHash)])

export const posts = pgTable('posts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  authorType: authorTypeEnum('author_type').notNull(),
  authorId: bigint('author_id', { mode: 'number' }).notNull(),
  text: text('text').notNull(),
  topic: topicEnum('topic'),
  attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
  likesCount: integer('likes_count').notNull().default(0),
  commentsCount: integer('comments_count').notNull().default(0),
  repostsCount: integer('reposts_count').notNull().default(0),
  viewsCount: integer('views_count').notNull().default(0),
  embedding: vector('embedding', { dimensions: 384 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('posts_author_created_idx').on(t.authorType, t.authorId, t.createdAt.desc()),
  index('posts_created_idx').on(t.createdAt.desc()),
  index('posts_embedding_hnsw').using('hnsw', t.embedding.op('vector_cosine_ops')),
])

export const comments = pgTable('comments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  postId: bigint('post_id', { mode: 'number' }).notNull().references(() => posts.id),
  authorId: bigint('author_id', { mode: 'number' }).notNull().references(() => users.id),
  parentId: bigint('parent_id', { mode: 'number' }),
  text: text('text').notNull(),
  likesCount: integer('likes_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('comments_post_idx').on(t.postId, t.id)])

export const likes = pgTable('likes', {
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  targetType: likeTargetEnum('target_type').notNull(),
  targetId: bigint('target_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.targetType, t.targetId] }), index('likes_target_idx').on(t.targetType, t.targetId)])
```

`ml.ts`:
```ts
import { bigint, boolean, date, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp, vector } from 'drizzle-orm/pg-core'
import { authorTypeEnum, modelKindEnum } from './enums'

export const authorStatsDaily = pgTable('author_stats_daily', {
  authorType: authorTypeEnum('author_type').notNull(),
  authorId: bigint('author_id', { mode: 'number' }).notNull(),
  day: date('day').notNull(),
  posts: integer('posts').notNull().default(0),
  likes: integer('likes').notNull().default(0),
  comments: integer('comments').notNull().default(0),
  views: integer('views').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.authorType, t.authorId, t.day] })])

export const userProfilesMl = pgTable('user_profiles_ml', {
  userId: bigint('user_id', { mode: 'number' }).primaryKey(),
  interestVector: vector('interest_vector', { dimensions: 384 }),
  topicWeights: jsonb('topic_weights').$type<Record<string, number>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('user_profiles_ml_vec_hnsw').using('hnsw', t.interestVector.op('vector_cosine_ops'))])

export const friendSuggestions = pgTable('friend_suggestions', {
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  candidateId: bigint('candidate_id', { mode: 'number' }).notNull(),
  score: doublePrecision('score').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.candidateId] })])

export const modelVersions = pgTable('model_versions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  kind: modelKindEnum('kind').notNull(),
  artifactKey: text('artifact_key').notNull(),
  metrics: jsonb('metrics').$type<Record<string, number>>().notNull().default({}),
  trainedAt: timestamp('trained_at', { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(false),
})
```
(добавить `index` в импорт.)

`messaging.ts`:
```ts
import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './identity'
import type { Attachment } from './content'

export const dialogs = pgTable('dialogs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userLo: bigint('user_lo', { mode: 'number' }).notNull().references(() => users.id),
  userHi: bigint('user_hi', { mode: 'number' }).notNull().references(() => users.id),
  lastMessageId: bigint('last_message_id', { mode: 'number' }),
  lastLocalId: integer('last_local_id').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('dialogs_pair_uq').on(t.userLo, t.userHi)])

export const messages = pgTable('messages', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  dialogId: bigint('dialog_id', { mode: 'number' }).notNull().references(() => dialogs.id),
  dialogLocalId: integer('dialog_local_id').notNull(),
  senderId: bigint('sender_id', { mode: 'number' }).notNull().references(() => users.id),
  text: text('text').notNull(),
  attachments: jsonb('attachments').$type<Attachment[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [uniqueIndex('messages_dialog_local_uq').on(t.dialogId, t.dialogLocalId)])

export const dialogState = pgTable('dialog_state', {
  dialogId: bigint('dialog_id', { mode: 'number' }).notNull().references(() => dialogs.id),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  lastReadLocalId: integer('last_read_local_id').notNull().default(0),
  unreadCount: integer('unread_count').notNull().default(0),
  muted: boolean('muted').notNull().default(false),
}, (t) => [primaryKey({ columns: [t.dialogId, t.userId] }), index('dialog_state_user_idx').on(t.userId)])
```

`manual/events.ts`:
```ts
import { bigint, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'
import { eventKindEnum } from '../enums'
/** DDL живёт в drizzle/0001_events_partitioned.sql (партиционирование по created_at). */
export const events = pgTable('events', {
  id: bigint('id', { mode: 'number' }).notNull().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),
  postId: bigint('post_id', { mode: 'number' }).notNull(),
  kind: eventKindEnum('kind').notNull(),
  source: varchar('source', { length: 32 }).notNull(),
  position: integer('position').notNull().default(0),
  sessionId: bigint('session_id', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

`schema/index.ts`:
```ts
export * from './enums'
export * from './identity'
export * from './social'
export * from './content'
export * from './ml'
export * from './messaging'
export * from './manual/events'
```

- [ ] **Step 4: drizzle.config.ts, client.ts, migrate.ts**

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/db/schema/enums.ts', './src/db/schema/identity.ts', './src/db/schema/social.ts', './src/db/schema/content.ts', './src/db/schema/ml.ts', './src/db/schema/messaging.ts'],
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://vk:vk@localhost:5432/vk' },
  strict: true,
})
```

```ts
// client.ts
import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from './schema'
export function createDb(url: string) {
  return drizzle({ connection: { url, max: 10 }, schema })
}
export type Db = ReturnType<typeof createDb>
```

```ts
// migrate.ts
import { migrate } from 'drizzle-orm/bun-sql/migrator'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createDb } from './client'

export async function runMigrations(url: string): Promise<void> {
  const db = createDb(url)
  await migrate(db, { migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '../../drizzle') })
  await db.$client.close()
}
if (import.meta.main) {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL required')
  await runMigrations(url)
  console.log('migrations applied')
}
```

- [ ] **Step 5: Сгенерировать миграцию и добавить custom для events**

Run: `cd apps/api && set -a; source ../../.env; set +a; bun run db:generate`
Expected: `drizzle/0000_<name>.sql` + `drizzle/meta/`. Открыть файл, убедиться, что там `CREATE TYPE "public"."topic"`, `CREATE TABLE "users"`, `USING hnsw`.

Run: `bunx drizzle-kit generate --custom --name events_partitioned`
Записать в созданный `drizzle/0001_events_partitioned.sql`:
```sql
CREATE TABLE "events" (
  "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  "user_id" bigint NOT NULL,
  "post_id" bigint NOT NULL,
  "kind" "event_kind" NOT NULL,
  "source" varchar(32) NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "session_id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("id", "created_at")
) PARTITION BY RANGE ("created_at");
--> statement-breakpoint
CREATE TABLE "events_default" PARTITION OF "events" DEFAULT;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION ensure_events_partitions(from_month date, to_month date) RETURNS void AS $$
DECLARE m date := date_trunc('month', from_month)::date;
BEGIN
  WHILE m <= to_month LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      'events_' || to_char(m, 'YYYY_MM'), m, (m + interval '1 month')::date);
    m := (m + interval '1 month')::date;
  END LOOP;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
SELECT ensure_events_partitions((current_date - interval '6 months')::date, (current_date + interval '3 months')::date);
--> statement-breakpoint
CREATE INDEX "events_user_created_idx" ON "events" ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX "events_post_idx" ON "events" ("post_id");
--> statement-breakpoint
CREATE INDEX "events_session_idx" ON "events" ("session_id");
```

Run: `bun run db:migrate && bun run db:migrate:test`
Expected: `migrations applied` дважды.

- [ ] **Step 6: Тест-хелпер и интеграционный тест схемы**

`test/helpers/db.ts`:
```ts
import { sql } from 'drizzle-orm'
import { createDb, type Db } from '../../src/db/client'
import { runMigrations } from '../../src/db/migrate'

export const TEST_DB_URL = process.env.DATABASE_URL_TEST ?? 'postgres://vk:vk@localhost:5432/vk_test'
let migrated = false
export async function testDb(): Promise<Db> {
  if (!migrated) { await runMigrations(TEST_DB_URL); migrated = true }
  return createDb(TEST_DB_URL)
}
export async function truncateAll(db: Db): Promise<void> {
  await db.execute(sql`TRUNCATE events, dialog_state, messages, dialogs, likes, comments, posts, media, community_members, follows, friendships, communities, users, author_stats_daily, user_profiles_ml, friend_suggestions, model_versions RESTART IDENTITY CASCADE`)
}
```

`src/db/schema.integration.test.ts`:
```ts
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { sql } from 'drizzle-orm'
import { testDb, truncateAll } from '../../test/helpers/db'
import type { Db } from './client'
import { users, posts } from './schema'

let db: Db
beforeAll(async () => { db = await testDb(); await truncateAll(db) })
afterAll(async () => { await db.$client.close() })

describe('schema', () => {
  it('has all tables', async () => {
    const rows = await db.execute<{ table_name: string }>(sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1`)
    const names = rows.map((r) => r.table_name)
    for (const t of ['users', 'communities', 'friendships', 'follows', 'community_members', 'posts', 'comments', 'likes', 'media', 'events', 'events_default', 'author_stats_daily', 'user_profiles_ml', 'friend_suggestions', 'model_versions', 'dialogs', 'messages', 'dialog_state'])
      expect(names).toContain(t)
  })
  it('events is partitioned and accepts inserts for today', async () => {
    const [u] = await db.insert(users).values({ login: 'a', passwordHash: 'x', firstName: 'A', lastName: 'B' }).returning()
    const [p] = await db.insert(posts).values({ authorType: 'user', authorId: u!.id, text: 'hi' }).returning()
    await db.execute(sql`INSERT INTO events (user_id, post_id, kind, source, session_id) VALUES (${u!.id}, ${p!.id}, 'view', 'friends', 1)`)
    const [row] = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM events`)
    expect(row?.n).toBe(1)
    const [part] = await db.execute<{ relname: string }>(sql`SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid WHERE i.inhparent = 'events'::regclass AND c.relname = 'events_' || to_char(now(), 'YYYY_MM')`)
    expect(part?.relname).toBeDefined()
  })
  it('allows explicit ids (identity by default) and hnsw index exists', async () => {
    await db.insert(users).values({ id: 500000, login: 'explicit', passwordHash: 'x', firstName: 'E', lastName: 'X' })
    const [idx] = await db.execute<{ indexname: string }>(sql`SELECT indexname FROM pg_indexes WHERE indexname = 'posts_embedding_hnsw'`)
    expect(idx?.indexname).toBe('posts_embedding_hnsw')
  })
})
```

Run: `cd apps/api && set -a; source ../../.env; set +a; bun test src/db`
Expected: PASS (3).

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): drizzle schema for identity, social graph, content, ml, messaging; partitioned events migration"
```

---

### Task 10: Module boundary test

**Files:**
- Create: `apps/api/src/modules/README.md`, `apps/api/src/modules/boundaries.test.ts`

**Interfaces:**
- Produces: тест, который падает при нарушении правил из Global Constraints. Запускается вместе с `bun test`.

- [ ] **Step 1: README со схемой слоёв**

````markdown
# Modules (bounded contexts)

identity · social-graph · content · feed · messaging · recommendations · analytics

Each module:
```
domain/          aggregates, value objects, domain events. No framework imports.
application/     commands/, queries/, ports.ts (interfaces), handlers. Depends on domain only.
infrastructure/  Drizzle repositories, Redis adapters. Implements ports.
presentation/    Elysia plugin: routes -> bus. Maps AppError to HTTP.
index.ts         register(deps) wires handlers into buses and returns the Elysia plugin.
```
Cross-module talk goes through `kernel/event-bus` events or a module's exported `index.ts` facade — never by importing another module's inner layers.
````

- [ ] **Step 2: Тест границ**

```ts
import { describe, expect, it } from 'bun:test'
import { Glob } from 'bun'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const root = resolve(import.meta.dir)
const LAYERS = ['domain', 'application', 'infrastructure', 'presentation']
const files = [...new Glob('**/*.ts').scanSync({ cwd: root, absolute: true })].filter((f) => !f.endsWith('.test.ts'))

/** Все спецификаторы импортов/реэкспортов файла: `import x from '…'`, многострочные, `export … from '…'`, `import '…'`. */
const specRe = /\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm
export function specsOf(src: string): string[] {
  return [...src.matchAll(specRe)].map((m) => (m[1] ?? m[2]) as string)
}
const isPkg = (spec: string, pkgs: string[]) => pkgs.some((b) => spec === b || spec.startsWith(`${b}/`) || spec.startsWith(`${b}:`))
const hitsPath = (spec: string, parts: string[]) => spec.startsWith('.') && parts.some((b) => `${spec}/`.includes(b))

function moduleOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  return rel.length > 1 ? (rel[0] as string) : null
}
function layerOf(file: string): string | null {
  const rel = relative(root, file).split('/')
  return rel[1] && LAYERS.includes(rel[1]) ? rel[1] : null
}

describe('specsOf', () => {
  it('captures single-line, multi-line, type, side-effect imports and re-exports', () => {
    const src = `import a from './a'\nimport type { B } from '../b'\nimport {\n  c,\n} from 'pkg/c'\nimport 'side'\nexport { d } from './d'\nexport * from '../e'\n`
    expect(specsOf(src)).toEqual(['./a', '../b', 'pkg/c', 'side', './d', '../e'])
  })
})

describe('module boundaries', () => {
  it('no module imports another module inner layers', () => {
    const violations: string[] = []
    for (const f of files) {
      const mod = moduleOf(f)
      if (!mod) continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (!spec.startsWith('.')) continue
        const target = resolve(dirname(f), spec)
        const tmod = moduleOf(target)
        if (tmod && tmod !== mod && layerOf(target)) violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('domain layer imports no framework/infrastructure', () => {
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'domain') continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (isPkg(spec, ['elysia', 'drizzle-orm', 'ioredis', 'bun']) || hitsPath(spec, ['/application/', '/infrastructure/', '/presentation/', '/db/']))
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
  it('application layer does not import infrastructure or presentation', () => {
    const violations: string[] = []
    for (const f of files) {
      if (layerOf(f) !== 'application') continue
      for (const spec of specsOf(readFileSync(f, 'utf8'))) {
        if (isPkg(spec, ['elysia', 'drizzle-orm', 'ioredis']) || hitsPath(spec, ['/infrastructure/', '/presentation/']))
          violations.push(`${relative(root, f)} -> ${spec}`)
      }
    }
    expect(violations).toEqual([])
  })
})
```

- [ ] **Step 3: Запустить (модулей ещё нет — тест проходит на пустом множестве), закоммитить**

Run: `cd apps/api && bun test src/modules`
Expected: PASS (4).

```bash
git add apps/api/src/modules
git commit -m "test(api): enforce DDD module and layer boundaries"
```

---

### Task 11: Identity domain and application layer (in-memory tests)

**Files:**
- Create: `apps/api/src/modules/identity/domain/user.ts`, `domain/value-objects.ts`, `domain/events.ts`, `domain/user.test.ts`, `application/ports.ts`, `application/commands/register-user.ts`, `application/commands/login.ts`, `application/commands/logout.ts`, `application/commands/logout-all.ts`, `application/queries/get-me.ts`, `application/testing/fakes.ts`, `application/identity.application.test.ts`

**Interfaces:**
- Produces:
  - `class User` (агрегат): `static register(input: { login: string; password: string; firstName: string; lastName: string }, hasher: PasswordHasher): Promise<User>`; поля `id: number | null`, `login: Login`, `passwordHash`, `firstName`, `lastName`, `screenName: string | null`, `createdAt`; `verifyPassword(pw, hasher): Promise<boolean>`; `pullEvents(): DomainEvent[]`.
  - `Login.create(raw: string): Login` — 3–32 символа `[a-z0-9_.]`, нижний регистр; иначе `DomainRuleError('invalid_login')`. `Password.assertStrong(raw)` — ≥ 8 символов, иначе `DomainRuleError('weak_password')`.
  - Порты: `UserRepository { findByLogin(login: string): Promise<User | null>; findById(id: number): Promise<User | null>; save(user: User): Promise<User> }`, `SessionStore { create(userId: number, meta: { ua?: string }): Promise<string /*token*/>; get(token: string): Promise<{ userId: number } | null>; touch(token: string): Promise<void>; delete(token: string): Promise<void>; deleteAllForUser(userId: number): Promise<void> }`, `PasswordHasher { hash(pw: string): Promise<string>; verify(pw: string, hash: string): Promise<boolean> }`.
  - Команды: `RegisterUser(input) → { user: UserDto; token: string }`, `Login({ login, password, ua? }) → { user: UserDto; token: string }`, `Logout({ token })`, `LogoutAll({ userId })`. Запрос: `GetMe({ userId }) → UserDto`.
  - `UserDto = { id: number; login: string; firstName: string; lastName: string; screenName: string | null; createdAt: string }`, `toUserDto(user: User): UserDto`.
  - `registerIdentityHandlers(deps: { users: UserRepository; sessions: SessionStore; hasher: PasswordHasher; commands: CommandBus; queries: QueryBus; events: EventBus })`.

- [ ] **Step 1: Failing domain test**

`domain/user.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { User } from './user'
import { Login, Password } from './value-objects'
import { FakeHasher } from '../application/testing/fakes'

/** Код доменной ошибки, брошенной fn (сообщения — часть HTTP-контракта, по ним не матчим). */
const codeOf = (fn: () => unknown): string | undefined => {
  try { fn() } catch (e) { return (e as { code?: string }).code }
  return undefined
}
describe('Login', () => {
  it('normalizes and validates', () => {
    expect(Login.create('  Denis_01 ').value).toBe('denis_01')
    for (const bad of ['ab', 'с кириллицей', 'a'.repeat(33), 'has space']) expect(codeOf(() => Login.create(bad))).toBe('invalid_login')
  })
})
describe('Password', () => {
  it('rejects short', () => { expect(codeOf(() => Password.assertStrong('1234567'))).toBe('weak_password') })
})
describe('User.register', () => {
  it('hashes password, emits UserRegistered, verifies password', async () => {
    const hasher = new FakeHasher()
    const u = await User.register({ login: 'Denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' }, hasher)
    expect(u.login.value).toBe('denis')
    expect(u.passwordHash).toBe('hashed:password123')
    expect(await u.verifyPassword('password123', hasher)).toBe(true)
    expect(await u.verifyPassword('nope', hasher)).toBe(false)
    const events = u.pullEvents()
    expect(events.map((e) => e.type)).toEqual(['UserRegistered'])
    expect(u.pullEvents()).toEqual([])
  })
})
```

- [ ] **Step 2: Домен**

`domain/value-objects.ts`:
```ts
import { DomainRuleError } from '../../../kernel/errors'
export class Login {
  private constructor(readonly value: string) {}
  static create(raw: string): Login {
    const v = raw.trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,32}$/.test(v)) throw new DomainRuleError('invalid_login', 'Login must be 3-32 chars of a-z, 0-9, _ or .')
    return new Login(v)
  }
  static fromTrusted(v: string): Login { return new Login(v) }
}
export const Password = {
  assertStrong(raw: string): void {
    if (raw.length < 8) throw new DomainRuleError('weak_password', 'Password must be at least 8 characters')
  },
}
```

`domain/events.ts`:
```ts
import type { DomainEvent } from '../../../kernel/event-bus'
export type UserRegistered = DomainEvent<'UserRegistered', { userId: number; login: string }>
export type UserLoggedIn = DomainEvent<'UserLoggedIn', { userId: number }>
```

`domain/user.ts`:
```ts
import type { DomainEvent } from '../../../kernel/event-bus'
import { DomainRuleError } from '../../../kernel/errors'
import { Login, Password } from './value-objects'

export interface PasswordHasher { hash(pw: string): Promise<string>; verify(pw: string, hash: string): Promise<boolean> }

export type UserProps = { id: number | null; login: Login; passwordHash: string; firstName: string; lastName: string; screenName: string | null; createdAt: Date }

export class User {
  private events: DomainEvent[] = []
  private constructor(private props: UserProps) {}

  static async register(input: { login: string; password: string; firstName: string; lastName: string }, hasher: PasswordHasher): Promise<User> {
    const login = Login.create(input.login)
    Password.assertStrong(input.password)
    const firstName = input.firstName.trim()
    const lastName = input.lastName.trim()
    if (!firstName || !lastName) throw new DomainRuleError('empty_name', 'Name is required')
    const u = new User({ id: null, login, passwordHash: await hasher.hash(input.password), firstName, lastName, screenName: null, createdAt: new Date() })
    u.events.push({ type: 'UserRegistered', occurredAt: new Date(), payload: { userId: null, login: login.value } })
    return u
  }
  static rehydrate(props: UserProps): User { return new User(props) }

  get id() { return this.props.id }
  get login() { return this.props.login }
  get passwordHash() { return this.props.passwordHash }
  get firstName() { return this.props.firstName }
  get lastName() { return this.props.lastName }
  get screenName() { return this.props.screenName }
  get createdAt() { return this.props.createdAt }

  assignId(id: number): void {
    this.props.id = id
    for (const e of this.events) if (e.type === 'UserRegistered') (e.payload as { userId: number | null }).userId = id
  }
  verifyPassword(pw: string, hasher: PasswordHasher): Promise<boolean> { return hasher.verify(pw, this.props.passwordHash) }
  pullEvents(): DomainEvent[] { const out = this.events; this.events = []; return out }
}
```

- [ ] **Step 3: Порты, fakes, команды, запрос**

`application/ports.ts`:
```ts
import type { User, PasswordHasher } from '../domain/user'
export type { PasswordHasher }
export interface UserRepository {
  findByLogin(login: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  save(user: User): Promise<User>
}
export interface SessionStore {
  create(userId: number, meta: { ua?: string }): Promise<string>
  get(token: string): Promise<{ userId: number } | null>
  touch(token: string): Promise<void>
  delete(token: string): Promise<void>
  deleteAllForUser(userId: number): Promise<void>
}
```

`application/testing/fakes.ts`:
```ts
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'
import { User } from '../../domain/user'

export class FakeHasher implements PasswordHasher {
  async hash(pw: string) { return `hashed:${pw}` }
  async verify(pw: string, hash: string) { return hash === `hashed:${pw}` }
}
export class InMemoryUsers implements UserRepository {
  private rows = new Map<number, User>()
  private seq = 0
  async findByLogin(login: string) { return [...this.rows.values()].find((u) => u.login.value === login) ?? null }
  async findById(id: number) { return this.rows.get(id) ?? null }
  async save(user: User) {
    if (user.id === null) user.assignId(++this.seq)
    this.rows.set(user.id!, user)
    return user
  }
}
export class InMemorySessions implements SessionStore {
  tokens = new Map<string, { userId: number; touched: number }>()
  private n = 0
  async create(userId: number) { const t = `tok${++this.n}`; this.tokens.set(t, { userId, touched: 0 }); return t }
  async get(token: string) { const s = this.tokens.get(token); return s ? { userId: s.userId } : null }
  async touch(token: string) { const s = this.tokens.get(token); if (s) s.touched++ }
  async delete(token: string) { this.tokens.delete(token) }
  async deleteAllForUser(userId: number) { for (const [t, s] of this.tokens) if (s.userId === userId) this.tokens.delete(t) }
}
```

`application/dto.ts`:
```ts
import type { User } from '../domain/user'
export type UserDto = { id: number; login: string; firstName: string; lastName: string; screenName: string | null; createdAt: string }
export function toUserDto(u: User): UserDto {
  if (u.id === null) throw new Error('user has no id')
  return { id: u.id, login: u.login.value, firstName: u.firstName, lastName: u.lastName, screenName: u.screenName, createdAt: u.createdAt.toISOString() }
}
```

`application/commands/register-user.ts`:
```ts
import type { Command } from '../../../../kernel/command-bus'
import { ConflictError } from '../../../../kernel/errors'
import type { EventBus } from '../../../../kernel/event-bus'
import { User } from '../../domain/user'
import { Login } from '../../domain/value-objects'
import { toUserDto, type UserDto } from '../dto'
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'

export class RegisterUser implements Command<{ user: UserDto; token: string }> {
  declare readonly __result: { user: UserDto; token: string }
  constructor(readonly input: { login: string; password: string; firstName: string; lastName: string; ua?: string }) {}
}
export function registerUserHandler(d: { users: UserRepository; sessions: SessionStore; hasher: PasswordHasher; events: EventBus }) {
  return async (cmd: RegisterUser) => {
    // Проверяем занятость логина ДО хэширования пароля: argon2 дорогой, иначе дубли логинов — дешёвый DoS.
    if (await d.users.findByLogin(Login.create(cmd.input.login).value)) throw new ConflictError('login_taken', 'Login is already taken')
    const user = await User.register(cmd.input, d.hasher)
    const saved = await d.users.save(user)
    const token = await d.sessions.create(saved.id!, { ua: cmd.input.ua })
    await d.events.publish(saved.pullEvents())
    return { user: toUserDto(saved), token }
  }
}
```

`application/commands/login.ts`:
```ts
import type { Command } from '../../../../kernel/command-bus'
import { UnauthorizedError } from '../../../../kernel/errors'
import type { EventBus } from '../../../../kernel/event-bus'
import { toUserDto, type UserDto } from '../dto'
import type { PasswordHasher, SessionStore, UserRepository } from '../ports'

export class Login implements Command<{ user: UserDto; token: string }> {
  declare readonly __result: { user: UserDto; token: string }
  constructor(readonly input: { login: string; password: string; ua?: string }) {}
}
/** dummyHash — заранее посчитанный хэш случайного пароля (см. registerIdentityHandlers), нужен только для выравнивания времени. */
export function loginHandler(d: { users: UserRepository; sessions: SessionStore; hasher: PasswordHasher; events: EventBus; dummyHash: string }) {
  return async (cmd: Login) => {
    const user = await d.users.findByLogin(cmd.input.login.trim().toLowerCase())
    // При неизвестном логине всё равно проверяем пароль против фиктивного хэша, чтобы время ответа не выдавало существование аккаунта.
    const ok = user ? await user.verifyPassword(cmd.input.password, d.hasher) : (await d.hasher.verify(cmd.input.password, d.dummyHash), false)
    if (!user || !ok) throw new UnauthorizedError('invalid_credentials', 'Wrong login or password')
    const token = await d.sessions.create(user.id!, { ua: cmd.input.ua })
    await d.events.publish([{ type: 'UserLoggedIn', occurredAt: new Date(), payload: { userId: user.id } }])
    return { user: toUserDto(user), token }
  }
}
```

`application/commands/logout.ts` и `logout-all.ts`:
```ts
export class Logout implements Command<void> { declare readonly __result: void; constructor(readonly token: string) {} }
export const logoutHandler = (d: { sessions: SessionStore }) => async (c: Logout) => { await d.sessions.delete(c.token) }

export class LogoutAll implements Command<void> { declare readonly __result: void; constructor(readonly userId: number) {} }
export const logoutAllHandler = (d: { sessions: SessionStore }) => async (c: LogoutAll) => { await d.sessions.deleteAllForUser(c.userId) }
```

`application/queries/get-me.ts`:
```ts
import type { Query } from '../../../../kernel/query-bus'
import { NotFoundError } from '../../../../kernel/errors'
import { toUserDto, type UserDto } from '../dto'
import type { UserRepository } from '../ports'
export class GetMe implements Query<UserDto> { declare readonly __result: UserDto; constructor(readonly userId: number) {} }
export const getMeHandler = (d: { users: UserRepository }) => async (q: GetMe) => {
  const u = await d.users.findById(q.userId)
  if (!u) throw new NotFoundError('user_not_found', 'User not found')
  return toUserDto(u)
}
```

`application/register.ts`:
```ts
import type { CommandBus } from '../../../kernel/command-bus'
import type { EventBus } from '../../../kernel/event-bus'
import type { QueryBus } from '../../../kernel/query-bus'
import { Login, loginHandler } from './commands/login'
import { Logout, logoutHandler } from './commands/logout'
import { LogoutAll, logoutAllHandler } from './commands/logout-all'
import { RegisterUser, registerUserHandler } from './commands/register-user'
import type { PasswordHasher, SessionStore, UserRepository } from './ports'
import { GetMe, getMeHandler } from './queries/get-me'

export type IdentityDeps = { users: UserRepository; sessions: SessionStore; hasher: PasswordHasher; commands: CommandBus; queries: QueryBus; events: EventBus }
export async function registerIdentityHandlers(d: IdentityDeps): Promise<void> {
  const dummyHash = await d.hasher.hash(crypto.randomUUID())
  d.commands.register(RegisterUser, registerUserHandler(d))
  d.commands.register(Login, loginHandler({ ...d, dummyHash }))
  d.commands.register(Logout, logoutHandler(d))
  d.commands.register(LogoutAll, logoutAllHandler(d))
  d.queries.register(GetMe, getMeHandler(d))
}
```

- [ ] **Step 4: Application test**

`application/identity.application.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'bun:test'
import { CommandBus } from '../../../kernel/command-bus'
import { EventBus } from '../../../kernel/event-bus'
import { QueryBus } from '../../../kernel/query-bus'
import { Login } from './commands/login'
import { Logout } from './commands/logout'
import { LogoutAll } from './commands/logout-all'
import { RegisterUser } from './commands/register-user'
import { GetMe } from './queries/get-me'
import { registerIdentityHandlers } from './register'
import { FakeHasher, InMemorySessions, InMemoryUsers } from './testing/fakes'

let commands: CommandBus, queries: QueryBus, sessions: InMemorySessions, published: string[]
beforeEach(async () => {
  commands = new CommandBus(); queries = new QueryBus(); sessions = new InMemorySessions(); published = []
  const events = new EventBus()
  events.subscribe('UserRegistered', (e) => { published.push(`reg:${(e.payload as { userId: number }).userId}`) })
  await registerIdentityHandlers({ users: new InMemoryUsers(), sessions, hasher: new FakeHasher(), commands, queries, events })
})
const input = { login: 'denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' }

describe('identity application', () => {
  it('registers, creates session, publishes event with assigned id', async () => {
    const r = await commands.execute(new RegisterUser(input))
    expect(r.user.id).toBe(1)
    expect(await sessions.get(r.token)).toEqual({ userId: 1 })
    expect(published).toEqual(['reg:1'])
  })
  it('rejects duplicate login with 409 code', async () => {
    await commands.execute(new RegisterUser(input))
    expect(commands.execute(new RegisterUser({ ...input, login: 'DENIS' }))).rejects.toMatchObject({ code: 'login_taken', status: 409 })
  })
  it('logs in with right password, rejects wrong', async () => {
    await commands.execute(new RegisterUser(input))
    const r = await commands.execute(new Login({ login: 'Denis', password: 'password123' }))
    expect(r.user.login).toBe('denis')
    expect(commands.execute(new Login({ login: 'denis', password: 'bad' }))).rejects.toMatchObject({ code: 'invalid_credentials', status: 401 })
    expect(commands.execute(new Login({ login: 'ghost', password: 'password123' }))).rejects.toMatchObject({ status: 401 })
  })
  it('GetMe returns dto, 404 for unknown', async () => {
    await commands.execute(new RegisterUser(input))
    expect(await queries.ask(new GetMe(1))).toMatchObject({ id: 1, firstName: 'Денис' })
    expect(queries.ask(new GetMe(99))).rejects.toMatchObject({ status: 404 })
  })
  it('logout deletes one session, logoutAll deletes all', async () => {
    const a = await commands.execute(new RegisterUser(input))
    const b = await commands.execute(new Login({ login: 'denis', password: 'password123' }))
    await commands.execute(new Logout(a.token))
    expect(await sessions.get(a.token)).toBeNull()
    expect(await sessions.get(b.token)).not.toBeNull()
    await commands.execute(new LogoutAll(1))
    expect(await sessions.get(b.token)).toBeNull()
  })
})
```

- [ ] **Step 5: Запустить всё**

Run: `cd apps/api && bun test src/modules && bun run typecheck`
Expected: PASS domain (4), application (5), boundaries (3).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/identity
git commit -m "feat(identity): User aggregate, value objects, register/login/logout commands, GetMe query"
```

---

### Task 12: Identity infrastructure: Drizzle repository, Redis sessions, Bun hasher

**Files:**
- Create: `apps/api/src/modules/identity/infrastructure/drizzle-user-repository.ts`, `infrastructure/redis-session-store.ts`, `infrastructure/bun-password-hasher.ts`, `infrastructure/identity.infrastructure.test.ts`, `apps/api/src/redis.ts`, `test/helpers/redis.ts`

**Interfaces:**
- Produces: `DrizzleUserRepository(db: Db)`, `RedisSessionStore(redis: Redis, opts?: { ttlSeconds?: number })` (ключи `sess:{token}` → JSON `{userId, createdAt, ua}`, `user_sessions:{userId}` set, TTL 30 дней, `touch` продлевает если TTL < 29 дней), `BunPasswordHasher` (argon2id), `createRedis(url: string, db?: number): Redis`.

- [ ] **Step 1: Failing integration test**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { testDb, truncateAll } from '../../../../test/helpers/db'
import { testRedis } from '../../../../test/helpers/redis'
import type { Db } from '../../../db/client'
import { User } from '../domain/user'
import { BunPasswordHasher } from './bun-password-hasher'
import { DrizzleUserRepository } from './drizzle-user-repository'
import { RedisSessionStore } from './redis-session-store'

let db: Db
const redis = testRedis()
beforeAll(async () => { db = await testDb() })
beforeEach(async () => { await truncateAll(db); await redis.flushdb() })
afterAll(async () => { await db.$client.close(); redis.disconnect() })

describe('BunPasswordHasher', () => {
  it('hashes with argon2id and verifies', async () => {
    const h = new BunPasswordHasher()
    const hash = await h.hash('password123')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await h.verify('password123', hash)).toBe(true)
    expect(await h.verify('x', hash)).toBe(false)
  })
})

describe('DrizzleUserRepository', () => {
  it('saves new user with generated id and finds by login/id', async () => {
    const repo = new DrizzleUserRepository(db)
    const u = await User.register({ login: 'denis', password: 'password123', firstName: 'Д', lastName: 'К' }, new BunPasswordHasher())
    const saved = await repo.save(u)
    expect(saved.id).toBeGreaterThan(0)
    expect((await repo.findByLogin('denis'))?.id).toBe(saved.id)
    expect((await repo.findById(saved.id!))?.login.value).toBe('denis')
    expect(await repo.findByLogin('nobody')).toBeNull()
  })
})

describe('RedisSessionStore', () => {
  it('creates token, reads it back, tracks per-user set, deletes', async () => {
    const store = new RedisSessionStore(redis, { ttlSeconds: 100 })
    const t1 = await store.create(7, { ua: 'test' })
    const t2 = await store.create(7, {})
    expect(t1).toMatch(/^[a-f0-9]{64}$/)
    expect(await store.get(t1)).toEqual({ userId: 7 })
    expect(await redis.smembers('user_sessions:7')).toHaveLength(2)
    expect(await redis.ttl(`sess:${t1}`)).toBeGreaterThan(90)
    await store.delete(t1)
    expect(await store.get(t1)).toBeNull()
    expect(await redis.smembers('user_sessions:7')).toEqual([t2])
    await store.deleteAllForUser(7)
    expect(await store.get(t2)).toBeNull()
    expect(await redis.exists('user_sessions:7')).toBe(0)
  })
  it('touch extends ttl when below threshold', async () => {
    const store = new RedisSessionStore(redis, { ttlSeconds: 100, touchBelowSeconds: 200 })
    const t = await store.create(1, {})
    await redis.expire(`sess:${t}`, 10)
    await store.touch(t)
    expect(await redis.ttl(`sess:${t}`)).toBeGreaterThan(90)
  })
})
```

- [ ] **Step 2: Реализация**

`src/redis.ts`:
```ts
import Redis from 'ioredis'
export function createRedis(url: string, db = 0): Redis {
  return new Redis(url, { db, maxRetriesPerRequest: 3, lazyConnect: false })
}
```

`test/helpers/redis.ts`:
```ts
import { createRedis } from '../../src/redis'
export function testRedis() {
  return createRedis(process.env.REDIS_URL ?? 'redis://localhost:6379', Number(process.env.REDIS_DB_TEST ?? 1))
}
```

`bun-password-hasher.ts`:
```ts
import type { PasswordHasher } from '../application/ports'
export class BunPasswordHasher implements PasswordHasher {
  hash(pw: string) { return Bun.password.hash(pw, { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 }) }
  verify(pw: string, hash: string) { return Bun.password.verify(pw, hash) }
}
```

`drizzle-user-repository.ts`:
```ts
import { eq } from 'drizzle-orm'
import type { Db } from '../../../db/client'
import { users } from '../../../db/schema'
import { User } from '../domain/user'
import { Login } from '../domain/value-objects'
import type { UserRepository } from '../application/ports'

type Row = typeof users.$inferSelect
const toDomain = (r: Row) => User.rehydrate({ id: r.id, login: Login.fromTrusted(r.login), passwordHash: r.passwordHash, firstName: r.firstName, lastName: r.lastName, screenName: r.screenName, createdAt: r.createdAt })

export class DrizzleUserRepository implements UserRepository {
  constructor(private db: Db) {}
  async findByLogin(login: string) {
    const [r] = await this.db.select().from(users).where(eq(users.login, login)).limit(1)
    return r ? toDomain(r) : null
  }
  async findById(id: number) {
    const [r] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return r ? toDomain(r) : null
  }
  async save(user: User) {
    const values = { login: user.login.value, passwordHash: user.passwordHash, firstName: user.firstName, lastName: user.lastName, screenName: user.screenName }
    if (user.id === null) {
      const [r] = await this.db.insert(users).values(values).returning({ id: users.id })
      user.assignId(r!.id)
    } else {
      await this.db.update(users).set(values).where(eq(users.id, user.id))
    }
    return user
  }
}
```

`redis-session-store.ts`:
```ts
import type Redis from 'ioredis'
import type { SessionStore } from '../application/ports'

const DAY = 86400
export class RedisSessionStore implements SessionStore {
  private ttl: number
  private touchBelow: number
  constructor(private redis: Redis, opts: { ttlSeconds?: number; touchBelowSeconds?: number } = {}) {
    this.ttl = opts.ttlSeconds ?? 30 * DAY
    this.touchBelow = opts.touchBelowSeconds ?? 29 * DAY
  }
  private key(t: string) { return `sess:${t}` }
  private userKey(id: number) { return `user_sessions:${id}` }
  async create(userId: number, meta: { ua?: string }) {
    const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')
    await this.redis.multi()
      .set(this.key(token), JSON.stringify({ userId, createdAt: Date.now(), ua: meta.ua ?? null }), 'EX', this.ttl)
      .sadd(this.userKey(userId), token)
      .expire(this.userKey(userId), this.ttl)
      .exec()
    return token
  }
  async get(token: string) {
    const raw = await this.redis.get(this.key(token))
    if (!raw) return null
    return { userId: (JSON.parse(raw) as { userId: number }).userId }
  }
  async touch(token: string) {
    const ttl = await this.redis.ttl(this.key(token))
    if (ttl > 0 && ttl < this.touchBelow) await this.redis.expire(this.key(token), this.ttl)
  }
  async delete(token: string) {
    const s = await this.get(token)
    const m = this.redis.multi().del(this.key(token))
    if (s) m.srem(this.userKey(s.userId), token)
    await m.exec()
  }
  async deleteAllForUser(userId: number) {
    const tokens = await this.redis.smembers(this.userKey(userId))
    const m = this.redis.multi()
    for (const t of tokens) m.del(this.key(t))
    m.del(this.userKey(userId))
    await m.exec()
  }
}
```

- [ ] **Step 3: Запустить**

Run: `cd apps/api && set -a; source ../../.env; set +a; bun test src/modules/identity/infrastructure && bun test src/modules/boundaries.test.ts`
Expected: PASS (4 + 3).

- [ ] **Step 4: Commit**

```bash
git add apps/api
git commit -m "feat(identity): drizzle user repository, redis session store, argon2id hasher"
```

---

### Task 13: Identity presentation: auth routes, auth macro, app wiring, e2e tests

**Files:**
- Create: `apps/api/src/modules/identity/presentation/routes.ts`, `presentation/auth-macro.ts`, `modules/identity/index.ts`, `test/helpers/app.ts`, `modules/identity/presentation/auth.e2e.test.ts`
- Modify: `src/app.ts`, `src/main.ts`

**Interfaces:**
- Produces:
  - Роуты: `POST /api/v1/auth/register` (body `{login, password, firstName, lastName}` → 201 `{user}` + cookie `sid`), `POST /api/v1/auth/login` → 200 `{user}` + cookie, `POST /api/v1/auth/logout` → 204 + cookie удалён, `POST /api/v1/auth/logout-all` → 204, `GET /api/v1/me` → `{user}`.
  - `authPlugin(sessions: SessionStore)` — Elysia-плагин с макросом `auth: true`, кладёт `user: { id: number }` и `sessionToken: string` в контекст; без cookie или с мёртвым токеном → 401 `{error:{code:'unauthorized'}}`; при успехе вызывает `sessions.touch`.
  - `identityModule(deps)` → `{ plugin: Elysia }`; `buildApp(deps)` регистрирует его. `AppDeps` расширен: `{ db: Db; redis: Redis; commands; queries; events }`.
  - `test/helpers/app.ts`: `createTestApp(): Promise<{ app: App; db: Db; redis: Redis; close(): Promise<void> }>` и `cookieFrom(res: Response): string`.

- [ ] **Step 1: Failing e2e test**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { cookieFrom, createTestApp, type TestApp } from '../../../../test/helpers/app'
import { truncateAll } from '../../../../test/helpers/db'

let t: TestApp
beforeAll(async () => { t = await createTestApp() })
beforeEach(async () => { await truncateAll(t.db); await t.redis.flushdb() })
afterAll(async () => { await t.close() })

const json = (path: string, body: unknown, cookie?: string) =>
  t.app.handle(new Request(`http://localhost/api/v1${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }))
const get = (path: string, cookie?: string) => t.app.handle(new Request(`http://localhost/api/v1${path}`, { headers: cookie ? { cookie } : {} }))
const creds = { login: 'denis', password: 'password123', firstName: 'Денис', lastName: 'Кораблев' }

describe('auth e2e', () => {
  it('register sets httpOnly sid cookie and returns user', async () => {
    const res = await json('/auth/register', creds)
    expect(res.status).toBe(201)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/^sid=[a-f0-9]{64};/)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('Max-Age=2592000')
    expect(await res.json()).toMatchObject({ user: { login: 'denis', firstName: 'Денис' } })
  })
  it('validation: short password → 422 with domain code, bad body → 422', async () => {
    expect((await json('/auth/register', { ...creds, password: '123' })).status).toBe(422)
    expect(await (await json('/auth/register', { ...creds, password: '123' })).json()).toEqual({ error: { code: 'weak_password', message: 'Password must be at least 8 characters' } })
    expect((await json('/auth/register', { login: 'x' })).status).toBe(422)
  })
  it('duplicate login → 409', async () => {
    await json('/auth/register', creds)
    const res = await json('/auth/register', creds)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: { code: 'login_taken', message: 'Login is already taken' } })
  })
  it('me requires cookie; login → me → logout → me 401', async () => {
    await json('/auth/register', creds)
    expect((await get('/me')).status).toBe(401)
    const login = await json('/auth/login', { login: 'DENIS', password: 'password123' })
    expect(login.status).toBe(200)
    const cookie = cookieFrom(login)
    const me = await get('/me', cookie)
    expect(me.status).toBe(200)
    expect(await me.json()).toMatchObject({ user: { login: 'denis' } })
    const out = await json('/auth/logout', {}, cookie)
    expect(out.status).toBe(204)
    expect(out.headers.get('set-cookie')).toMatch(/^sid=;/)
    expect((await get('/me', cookie)).status).toBe(401)
  })
  it('wrong password → 401 invalid_credentials', async () => {
    await json('/auth/register', creds)
    const res = await json('/auth/login', { login: 'denis', password: 'nope' })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: { code: 'invalid_credentials', message: 'Wrong login or password' } })
  })
  it('logout-all kills every session', async () => {
    const a = cookieFrom(await json('/auth/register', creds))
    const b = cookieFrom(await json('/auth/login', { login: 'denis', password: 'password123' }))
    expect((await json('/auth/logout-all', {}, a)).status).toBe(204)
    expect((await get('/me', a)).status).toBe(401)
    expect((await get('/me', b)).status).toBe(401)
  })
})
```

- [ ] **Step 2: auth-macro.ts**

```ts
import { Elysia, t } from 'elysia'
import { UnauthorizedError } from '../../../kernel/errors'
import type { SessionStore } from '../application/ports'

export function authPlugin(sessions: SessionStore) {
  return new Elysia({ name: 'auth' }).macro('auth', {
    cookie: t.Cookie({ sid: t.Optional(t.String()) }),
    async resolve({ cookie }) {
      const token = cookie.sid?.value
      if (!token) throw new UnauthorizedError()
      const s = await sessions.get(token)
      if (!s) throw new UnauthorizedError()
      await sessions.touch(token)
      return { user: { id: s.userId }, sessionToken: token }
    },
  })
}
```

Если в Elysia 1.4 `throw` внутри `resolve` не попадает в `onError` приложения, заменить на `return status(401, { error: { code: 'unauthorized', message: 'Unauthorized' } })` (деструктурировать `status` из контекста). Проверить тестом `me requires cookie`.

- [ ] **Step 3: routes.ts**

```ts
import { Elysia, t } from 'elysia'
import type { CommandBus } from '../../../kernel/command-bus'
import type { QueryBus } from '../../../kernel/query-bus'
import { Login } from '../application/commands/login'
import { Logout } from '../application/commands/logout'
import { LogoutAll } from '../application/commands/logout-all'
import { RegisterUser } from '../application/commands/register-user'
import type { SessionStore } from '../application/ports'
import { GetMe } from '../application/queries/get-me'
import { authPlugin } from './auth-macro'

const SESSION_MAX_AGE = 30 * 86400
const userSchema = t.Object({ id: t.Number(), login: t.String(), firstName: t.String(), lastName: t.String(), screenName: t.Nullable(t.String()), createdAt: t.String() })

export function identityRoutes(d: { commands: CommandBus; queries: QueryBus; sessions: SessionStore; cookieSecure: boolean }) {
  const setSession = (cookie: { sid: { set: (o: object) => void } }, token: string) =>
    cookie.sid.set({ value: token, httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE, secure: d.cookieSecure })

  return new Elysia()
    .use(authPlugin(d.sessions))
    .group('/auth', (app) =>
      app
        .post('/register', async ({ body, cookie, set, headers }) => {
          const r = await d.commands.execute(new RegisterUser({ ...body, ua: headers['user-agent'] }))
          setSession(cookie, r.token)
          set.status = 201
          return { user: r.user }
        }, { body: t.Object({ login: t.String(), password: t.String(), firstName: t.String(), lastName: t.String() }), response: { 201: t.Object({ user: userSchema }) } })
        .post('/login', async ({ body, cookie, headers }) => {
          const r = await d.commands.execute(new Login({ ...body, ua: headers['user-agent'] }))
          setSession(cookie, r.token)
          return { user: r.user }
        }, { body: t.Object({ login: t.String(), password: t.String() }), response: { 200: t.Object({ user: userSchema }) } })
        .post('/logout', async ({ cookie, set, sessionToken }) => {
          await d.commands.execute(new Logout(sessionToken))
          cookie.sid.remove()
          set.status = 204
        }, { auth: true })
        .post('/logout-all', async ({ cookie, set, user }) => {
          await d.commands.execute(new LogoutAll(user.id))
          cookie.sid.remove()
          set.status = 204
        }, { auth: true }),
    )
    .get('/me', async ({ user }) => ({ user: await d.queries.ask(new GetMe(user.id)) }), { auth: true, response: { 200: t.Object({ user: userSchema }) } })
}
```

Примечание к `cookie.sid.remove()`: Elysia выставляет `sid=; Max-Age=0`. Если тест `logout` покажет другой формат, проверить `expires` и подправить регулярку в тесте на `/sid=;/`.

- [ ] **Step 4: identity/index.ts, app.ts, main.ts, test helper**

`modules/identity/index.ts`:
```ts
import type Redis from 'ioredis'
import type { Db } from '../../db/client'
import type { CommandBus } from '../../kernel/command-bus'
import type { EventBus } from '../../kernel/event-bus'
import type { QueryBus } from '../../kernel/query-bus'
import { registerIdentityHandlers } from './application/register'
import { BunPasswordHasher } from './infrastructure/bun-password-hasher'
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository'
import { RedisSessionStore } from './infrastructure/redis-session-store'
import { identityRoutes } from './presentation/routes'
import { authPlugin } from './presentation/auth-macro'

export async function identityModule(d: { db: Db; redis: Redis; commands: CommandBus; queries: QueryBus; events: EventBus; cookieSecure: boolean }) {
  const users = new DrizzleUserRepository(d.db)
  const sessions = new RedisSessionStore(d.redis)
  await registerIdentityHandlers({ users, sessions, hasher: new BunPasswordHasher(), commands: d.commands, queries: d.queries, events: d.events })
  return { plugin: identityRoutes({ commands: d.commands, queries: d.queries, sessions, cookieSecure: d.cookieSecure }), auth: authPlugin(sessions), sessions }
}
```

`app.ts` — целиком:
```ts
import { Elysia } from 'elysia'
import type Redis from 'ioredis'
import type { Db } from './db/client'
import { AppError } from './kernel/errors'
import type { CommandBus } from './kernel/command-bus'
import type { QueryBus } from './kernel/query-bus'
import type { EventBus } from './kernel/event-bus'
import { identityModule } from './modules/identity'

export type AppDeps = { db: Db; redis: Redis; commands: CommandBus; queries: QueryBus; events: EventBus; cookieSecure: boolean }

export async function buildApp(deps: AppDeps) {
  const identity = await identityModule(deps)
  return new Elysia({ prefix: '/api/v1' })
    .onError(({ error, set, code }) => {
      if (error instanceof AppError) {
        set.status = error.status
        return { error: { code: error.code, message: error.message } }
      }
      if (code === 'VALIDATION') {
        set.status = 422
        return { error: { code: 'validation', message: 'Invalid input' } }
      }
      if (code === 'NOT_FOUND') {
        set.status = 404
        return { error: { code: 'not_found', message: 'Route not found' } }
      }
      console.error(error)
      set.status = 500
      return { error: { code: 'internal', message: 'Internal error' } }
    })
    .get('/health', () => ({ ok: true }))
    .use(identity.plugin)
}
export type App = ReturnType<typeof buildApp>
```

`main.ts`:
```ts
import { buildApp } from './app'
import { config } from './config'
import { createDb } from './db/client'
import { createRedis } from './redis'
import { CommandBus } from './kernel/command-bus'
import { QueryBus } from './kernel/query-bus'
import { EventBus } from './kernel/event-bus'

const app = await buildApp({ db: createDb(config.databaseUrl), redis: createRedis(config.redisUrl), commands: new CommandBus(), queries: new QueryBus(), events: new EventBus(), cookieSecure: config.cookieSecure })
app.listen(config.apiPort)
console.log(`api on http://localhost:${config.apiPort}/api/v1/health`)
```

`test/helpers/app.ts`:
```ts
import { buildApp, type App } from '../../src/app'
import type { Db } from '../../src/db/client'
import { CommandBus } from '../../src/kernel/command-bus'
import { EventBus } from '../../src/kernel/event-bus'
import { QueryBus } from '../../src/kernel/query-bus'
import { testDb } from './db'
import { testRedis } from './redis'
import type Redis from 'ioredis'

export type TestApp = { app: App; db: Db; redis: Redis; close(): Promise<void> }
export async function createTestApp(): Promise<TestApp> {
  const db = await testDb()
  const redis = testRedis()
  const app = await buildApp({ db, redis, commands: new CommandBus(), queries: new QueryBus(), events: new EventBus({ error: () => {} }), cookieSecure: false })
  return { app, db, redis, close: async () => { await db.$client.close(); redis.disconnect() } }
}
export function cookieFrom(res: Response): string {
  const raw = res.headers.get('set-cookie') ?? ''
  const m = raw.match(/sid=([^;]+)/)
  if (!m) throw new Error(`no sid cookie in ${raw}`)
  return `sid=${m[1]}`
}
```

- [ ] **Step 5: Запустить всё, поправить расхождения с реальным Elysia**

Run: `cd apps/api && set -a; source ../../.env; set +a; bun test && bun run typecheck`
Expected: PASS все (kernel 5, schema 3, boundaries 3, domain 4, application 5, infrastructure 4, e2e 6).

Ручная проверка: `bun run dev` в одном терминале, в другом:
```bash
curl -si -c /tmp/c.txt -H 'content-type: application/json' -d '{"login":"denis","password":"password123","firstName":"Денис","lastName":"Кораблев"}' localhost:3000/api/v1/auth/register
curl -s -b /tmp/c.txt localhost:3000/api/v1/me
```
Expected: 201 с `set-cookie: sid=...`; `{"user":{...}}`.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(identity): auth routes with httpOnly session cookie, auth macro, e2e tests"
```

---

### Task 14: contracts package with Eden client

**Files:**
- Create: `packages/contracts/package.json`, `tsconfig.json`, `src/index.ts`, `src/index.test-d.ts`

**Interfaces:**
- Produces: `export type { App } from '@vkc/api/app'`, `createApi(baseUrl: string, fetchInit?: RequestInit): Treaty<App>`; `type UserDto` реэкспортирован из identity. Потребитель: `apps/web`.

- [ ] **Step 1: package.json, tsconfig**

```json
{
  "name": "@vkc/contracts",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc -p tsconfig.json", "test": "tsc -p tsconfig.json" },
  "dependencies": { "@elysia/eden": "^1.4.10", "@vkc/api": "workspace:*", "elysia": "^1.4.30" }
}
```
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["bun-types"] }, "include": ["src"] }
```

Добавить в `apps/api/package.json` поле `"exports": { "./app": "./src/app.ts", "./dto": "./src/modules/identity/application/dto.ts" }`.

- [ ] **Step 2: src/index.ts и типовой тест**

```ts
import { treaty } from '@elysia/eden'
import type { App } from '@vkc/api/app'
export type { App }
export type { UserDto } from '@vkc/api/dto'
export function createApi(baseUrl: string, fetchInit: RequestInit = {}) {
  return treaty<App>(baseUrl, { fetch: { credentials: 'include', ...fetchInit } })
}
export type Api = ReturnType<typeof createApi>
```

`src/index.test-d.ts` (компилируется typecheck-ом, проверяет типы):
```ts
import { createApi } from './index'
const api = createApi('http://localhost:3000')
async function check() {
  const { data } = await api.api.v1.me.get()
  if (data) {
    const login: string = data.user.login
    // @ts-expect-error unknown field
    data.user.nope
    return login
  }
  const r = await api.api.v1.auth.login.post({ login: 'a', password: 'b' })
  // @ts-expect-error password required
  await api.api.v1.auth.login.post({ login: 'a' })
  return r.data?.user.id
}
void check
```

Если Eden при `prefix: '/api/v1'` строит путь как `api.api.v1...` — так и оставить; если как `api.auth.login` — поправить оба места. Проверяется `bun run typecheck`.

- [ ] **Step 3: Проверка и коммит**

Run: `bun install && cd packages/contracts && bun run typecheck`
Expected: без ошибок (включая `@ts-expect-error`, которые должны реально срабатывать).

```bash
git add packages/contracts apps/api/package.json bun.lock
git commit -m "feat(contracts): typed Eden client over api App type"
```

---

### Task 15: Seeder package: RNG, topics, corpus schema, text generator (one topic)

**Files:**
- Create: `apps/seeder/package.json`, `tsconfig.json`, `src/rng.ts`, `src/rng.test.ts`, `src/topics.ts`, `src/corpus/schema.ts`, `src/corpus/topics/cinema.ts`, `src/corpus/index.ts`, `src/corpus/corpus.test.ts`, `src/generate/text.ts`, `src/generate/text.test.ts`

**Interfaces:**
- Produces:
  - `class Rng { constructor(seed: number); next(): number /*[0,1)*/; int(min, max): number /*inclusive*/; pick<T>(arr: readonly T[]): T; shuffle<T>(arr: T[]): T[]; gauss(mean=0, sd=1): number; lognormal(mu, sigma): number; chance(p): boolean; weightedIndex(cum: Float64Array): number; fork(label: string): Rng }`.
  - `TOPICS`, `type Topic`, `TOPIC_TITLES: Record<Topic,string>` (русские названия).
  - Корпус одной темы: `TopicCorpus = { topic: Topic; communities: { name: string; description: string }[]; posts: string[]; personalPosts: string[]; comments: string[]; openers: string[]; closers: string[]; hashtags: string[] }`. Требования (проверяются тестом): `communities ≥ 60`, `posts ≥ 120`, `personalPosts ≥ 15`, `comments ≥ 60`, `openers ≥ 12`, `closers ≥ 12`, `hashtags ≥ 20` (каждый начинается с `#`, без пробелов), все строки уникальны внутри массива и непусты, длина поста 40–1200 символов.
  - `CORPUS: Record<Topic, TopicCorpus>` (пока только `cinema`, остальные добавляются в Task 16), `DIALOG_LINES: string[]` (Task 16).
  - `generatePost(base: string, c: TopicCorpus, rng: Rng): string` — с вероятностью 0.35 добавляет opener в начало, 0.35 closer в конец, 0.6 добавляет 1–3 хэштега в конец, числа в тексте (`\d{2,4}`) с вероятностью 0.5 меняются на близкие (±10%), плейсхолдеры `{name}`, `{city}`, `{year}`, `{n}` подставляются из аргумента `vars`.

- [ ] **Step 1: package.json, tsconfig**

```json
{
  "name": "@vkc/seeder",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "seed": "bun src/cli.ts",
    "test": "bun test",
    "typecheck": "tsc -p tsconfig.json"
  },
  "dependencies": { "@faker-js/faker": "^10.6.0", "@vkc/api": "workspace:*", "drizzle-orm": "^0.45.2" },
  "devDependencies": { "@types/bun": "latest" }
}
```
```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "types": ["bun-types"] }, "include": ["src", "test"] }
```

- [ ] **Step 2: Failing rng test**

```ts
import { describe, expect, it } from 'bun:test'
import { Rng } from './rng'

describe('Rng', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new Rng(1), b = new Rng(1), c = new Rng(2)
    const sa = Array.from({ length: 5 }, () => a.next())
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(sa)
    expect(c.next()).not.toBe(sa[0])
  })
  it('int is inclusive and within range', () => {
    const r = new Rng(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) { const v = r.int(1, 3); expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(3); seen.add(v) }
    expect(seen.size).toBe(3)
  })
  it('gauss has roughly right mean/sd, lognormal is positive', () => {
    const r = new Rng(4)
    const xs = Array.from({ length: 20000 }, () => r.gauss(10, 2))
    const mean = xs.reduce((a, b) => a + b) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length)
    expect(Math.abs(mean - 10)).toBeLessThan(0.1)
    expect(Math.abs(sd - 2)).toBeLessThan(0.1)
    for (let i = 0; i < 100; i++) expect(r.lognormal(0, 1)).toBeGreaterThan(0)
  })
  it('weightedIndex follows cumulative weights', () => {
    const r = new Rng(5)
    const cum = new Float64Array([0.1, 0.4, 1.0])
    const counts = [0, 0, 0]
    for (let i = 0; i < 10000; i++) counts[r.weightedIndex(cum)]!++
    expect(counts[2]! / 10000).toBeGreaterThan(0.55)
    expect(counts[0]! / 10000).toBeLessThan(0.14)
  })
  it('fork gives independent stable streams', () => {
    expect(new Rng(9).fork('users').next()).toBe(new Rng(9).fork('users').next())
    expect(new Rng(9).fork('users').next()).not.toBe(new Rng(9).fork('posts').next())
  })
})
```

- [ ] **Step 3: rng.ts**

```ts
function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export class Rng {
  private a: number
  private spare: number | null = null
  constructor(readonly seed: number) { this.a = seed >>> 0 }
  next(): number {
    this.a = (this.a + 0x6d2b79f5) | 0
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)) }
  chance(p: number): boolean { return this.next() < p }
  pick<T>(arr: readonly T[]): T { if (arr.length === 0) throw new Error('pick from empty'); return arr[Math.floor(this.next() * arr.length)]! }
  shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [arr[i], arr[j]] = [arr[j]!, arr[i]!] } return arr }
  gauss(mean = 0, sd = 1): number {
    if (this.spare !== null) { const v = this.spare; this.spare = null; return mean + sd * v }
    let u: number, v: number, s: number
    do { u = this.next() * 2 - 1; v = this.next() * 2 - 1; s = u * u + v * v } while (s >= 1 || s === 0)
    const m = Math.sqrt((-2 * Math.log(s)) / s)
    this.spare = v * m
    return mean + sd * u * m
  }
  lognormal(mu: number, sigma: number): number { return Math.exp(this.gauss(mu, sigma)) }
  /** cum — неубывающие накопленные веса, последний == total */
  weightedIndex(cum: Float64Array): number {
    const x = this.next() * cum[cum.length - 1]!
    let lo = 0, hi = cum.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid]! > x) hi = mid; else lo = mid + 1 }
    return lo
  }
  fork(label: string): Rng { return new Rng((this.seed ^ hashStr(label)) >>> 0) }
}
export function cumulative(weights: ArrayLike<number>): Float64Array {
  const out = new Float64Array(weights.length)
  let acc = 0
  for (let i = 0; i < weights.length; i++) { acc += weights[i]!; out[i] = acc }
  return out
}
```

- [ ] **Step 4: topics.ts и corpus/schema.ts**

```ts
// topics.ts
export const TOPICS = ['cinema', 'music', 'memes', 'games', 'it', 'sport', 'travel', 'food', 'science', 'auto', 'fashion', 'city'] as const
export type Topic = (typeof TOPICS)[number]
export const TOPIC_TITLES: Record<Topic, string> = { cinema: 'Кино', music: 'Музыка', memes: 'Мемы', games: 'Игры', it: 'IT', sport: 'Спорт', travel: 'Путешествия', food: 'Еда', science: 'Наука', auto: 'Авто', fashion: 'Мода', city: 'Городские новости' }
```

```ts
// corpus/schema.ts
import type { Topic } from '../topics'
export type TopicCorpus = {
  topic: Topic
  communities: { name: string; description: string }[]
  posts: string[]
  personalPosts: string[]
  comments: string[]
  openers: string[]
  closers: string[]
  hashtags: string[]
}
export const CORPUS_MIN = { communities: 60, posts: 120, personalPosts: 15, comments: 60, openers: 12, closers: 12, hashtags: 20 } as const
```

- [ ] **Step 5: Failing corpus test (проверяет все темы, которые уже есть в CORPUS)**

`corpus/corpus.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { CORPUS, DIALOG_LINES } from './index'
import { CORPUS_MIN } from './schema'
import { TOPICS } from '../topics'

function assertUniqueNonEmpty(arr: string[], label: string) {
  expect(new Set(arr.map((s) => s.trim())).size, `${label} unique`).toBe(arr.length)
  for (const s of arr) expect(s.trim().length, `${label} non-empty`).toBeGreaterThan(0)
}

describe('corpus', () => {
  it('covers every topic', () => {
    expect(Object.keys(CORPUS).sort()).toEqual([...TOPICS].sort())
  })
  for (const topic of TOPICS) {
    const c = CORPUS[topic]
    if (!c) continue
    describe(topic, () => {
      it('meets minimum sizes', () => {
        expect(c.communities.length).toBeGreaterThanOrEqual(CORPUS_MIN.communities)
        expect(c.posts.length).toBeGreaterThanOrEqual(CORPUS_MIN.posts)
        expect(c.personalPosts.length).toBeGreaterThanOrEqual(CORPUS_MIN.personalPosts)
        expect(c.comments.length).toBeGreaterThanOrEqual(CORPUS_MIN.comments)
        expect(c.openers.length).toBeGreaterThanOrEqual(CORPUS_MIN.openers)
        expect(c.closers.length).toBeGreaterThanOrEqual(CORPUS_MIN.closers)
        expect(c.hashtags.length).toBeGreaterThanOrEqual(CORPUS_MIN.hashtags)
      })
      it('strings are unique and non-empty, posts 40..1200 chars, hashtags well-formed', () => {
        assertUniqueNonEmpty(c.posts, 'posts'); assertUniqueNonEmpty(c.personalPosts, 'personal'); assertUniqueNonEmpty(c.comments, 'comments')
        assertUniqueNonEmpty(c.openers, 'openers'); assertUniqueNonEmpty(c.closers, 'closers'); assertUniqueNonEmpty(c.hashtags, 'hashtags')
        assertUniqueNonEmpty(c.communities.map((x) => x.name), 'community names')
        for (const p of [...c.posts, ...c.personalPosts]) { expect(p.length).toBeGreaterThanOrEqual(40); expect(p.length).toBeLessThanOrEqual(1200) }
        for (const h of c.hashtags) expect(h).toMatch(/^#[^\s#]+$/)
        expect(c.topic).toBe(topic)
      })
    })
  }
  it('dialog lines ≥ 300, unique', () => {
    expect(DIALOG_LINES.length).toBeGreaterThanOrEqual(300)
    assertUniqueNonEmpty(DIALOG_LINES, 'dialog')
  })
})
```

Тест «covers every topic» и «dialog lines» будут красными до Task 16. В этой задаче цель — зелёный блок `cinema`; остальные две проверки временно помечаются `it.todo` и включаются в Task 16.

- [ ] **Step 6: Написать корпус `cinema`**

`src/corpus/topics/cinema.ts` экспортирует `const cinema: TopicCorpus`. Содержание пишется вручную, по-русски, живым языком пабликов. Правила: сообщества — реалистичные названия («КИНОБРО», «Кино без попкорна», «Артхаус по пятницам» …) с описанием в одно-два предложения; посты — анонсы, разборы сцен, подборки, мнения, «факт дня», без реальных фамилий актёров и режиссёров текущего времени (вымышленные названия фильмов допустимы, классика старше 30 лет допустима); часть постов содержит плейсхолдеры `{year}`, `{n}`, `{city}`; personalPosts — от первого лица («сходил на…», «пересматриваю…»); comments — короткие реакции 3–15 слов; openers («Итак, поехали.», «Тихо, идёт кино.» …), closers («Пишите, что думаете.», «Сохраняйте, чтобы не потерять.» …), hashtags (`#кино`, `#чтопосмотреть`, `#разборсцены` …).

Пример трёх записей каждого массива, чтобы задать тон:
```ts
import type { TopicCorpus } from '../schema'
export const cinema: TopicCorpus = {
  topic: 'cinema',
  communities: [
    { name: 'КИНОБРО', description: 'Трейлеры, кадры со съёмок и споры о финалах. Без спойлеров в первые сутки.' },
    { name: 'Кино без попкорна', description: 'Медленное кино, длинные планы и разговоры о том, зачем это всё.' },
    { name: 'Артхаус по пятницам', description: 'Каждую пятницу один фильм, который вы бы сами не выбрали.' },
    // … до ≥ 60
  ],
  posts: [
    'Ранее неопубликованные кадры со съёмок «Тихого квартала»: режиссёр снимал сцену на крыше {n} дублей, пока свет не лёг так, как надо.\n\nПремьера осенью, точную дату объявят на неделе.',
    'Подборка на выходные: три фильма про дорогу, где важнее не куда едут, а с кем. Начните с чёрно-белого, он короче всего.',
    'Спор в комментариях под прошлым постом показал главное: половина из вас ждёт от финала ответа, а вторая половина — тишины. Хороший финал даёт и то и другое.',
    // … до ≥ 120
  ],
  personalPosts: ['Сходил на ночной сеанс в {city}, зал на шесть человек, и это был лучший просмотр за год.', /* … */],
  comments: ['Костюм наконец нормальный, без самодеятельности', 'осенью — это в ноябре или в сентябре?', 'кадр со стройкой топ', /* … */],
  openers: ['Итак, поехали.', 'Коротко о главном.', 'Тихо, идёт кино.', /* … */],
  closers: ['Пишите, что думаете.', 'Сохраняйте, чтобы не потерять.', 'Продолжение завтра.', /* … */],
  hashtags: ['#кино', '#чтопосмотреть', '#разборсцены', '#премьера', /* … */],
}
```

`src/corpus/index.ts`:
```ts
import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { cinema } from './topics/cinema'
export const CORPUS: Partial<Record<Topic, TopicCorpus>> = { cinema }
export const DIALOG_LINES: string[] = []
export { type TopicCorpus } from './schema'
```
(В Task 16 тип станет `Record<Topic, TopicCorpus>`.)

- [ ] **Step 7: Failing test генератора текста и реализация**

`generate/text.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { Rng } from '../rng'
import { generatePost, type TextVars } from './text'
import { cinema } from '../corpus/topics/cinema'

const vars: TextVars = { name: 'Денис', city: 'Казань', year: 2019, n: 14 }
describe('generatePost', () => {
  it('substitutes placeholders', () => {
    const out = generatePost('В {city} в {year} году показали {n} фильмов, сказал {name}.', cinema, new Rng(1), vars)
    expect(out).not.toMatch(/\{(name|city|year|n)\}/)
    expect(out).toContain('Казань')
  })
  it('is deterministic and produces variety across seeds', () => {
    const base = cinema.posts[0]!
    const a = generatePost(base, cinema, new Rng(7), vars)
    expect(generatePost(base, cinema, new Rng(7), vars)).toBe(a)
    const variants = new Set(Array.from({ length: 30 }, (_, i) => generatePost(base, cinema, new Rng(i), vars)))
    expect(variants.size).toBeGreaterThan(10)
  })
  it('keeps the base text inside the result', () => {
    const base = 'Просто текст без чисел и плейсхолдеров.'
    const out = generatePost(base, cinema, new Rng(3), vars)
    expect(out).toContain(base)
  })
})
```

`generate/text.ts`:
```ts
import type { TopicCorpus } from '../corpus/schema'
import type { Rng } from '../rng'
export type TextVars = { name: string; city: string; year: number; n: number }

export function generatePost(base: string, c: TopicCorpus, rng: Rng, vars: TextVars): string {
  let text = base
    .replaceAll('{name}', vars.name).replaceAll('{city}', vars.city)
    .replaceAll('{year}', String(vars.year)).replaceAll('{n}', String(vars.n))
  text = text.replace(/\b(\d{2,4})\b/g, (m) => (rng.chance(0.5) ? String(Math.max(1, Math.round(Number(m) * (0.9 + rng.next() * 0.2)))) : m))
  if (rng.chance(0.35)) text = `${rng.pick(c.openers)} ${text}`
  if (rng.chance(0.35)) text = `${text}\n\n${rng.pick(c.closers)}`
  if (rng.chance(0.6)) {
    const k = rng.int(1, 3)
    const tags = rng.shuffle([...c.hashtags]).slice(0, k)
    text = `${text}\n\n${tags.join(' ')}`
  }
  return text
}
export function pickComment(c: TopicCorpus, rng: Rng): string { return rng.pick(c.comments) }
```

- [ ] **Step 8: Запустить, закоммитить**

Run: `cd apps/seeder && bun install && bun test && bun run typecheck`
Expected: rng (5), text (3), corpus cinema (2) PASS; два `todo`.

```bash
git add apps/seeder
git commit -m "feat(seeder): deterministic rng, corpus schema, cinema corpus, post text generator"
```

---

### Task 16: Remaining 11 topic corpora and dialog lines

**Files:**
- Create: `apps/seeder/src/corpus/topics/{music,memes,games,it,sport,travel,food,science,auto,fashion,city}.ts`, `src/corpus/dialogs.ts`
- Modify: `src/corpus/index.ts`, `src/corpus/corpus.test.ts` (снять `todo`)

**Interfaces:**
- Produces: `CORPUS: Record<Topic, TopicCorpus>` со всеми 12 темами, `DIALOG_LINES: string[]` ≥ 300 реплик для личных чатов (короткие, разговорные, без имён: «ты где?», «скинь ссылку», «завтра в семь норм?», реакции, эмодзи допустимы).

Выполнять в четыре прохода по 3 темы (music+memes+games, it+sport+travel, food+science+auto, fashion+city+dialogs), после каждого прохода — `bun test src/corpus` и коммит. Требования те же, что в Task 15 (минимумы, уникальность, длины, хэштеги, без реальных ныне живущих персон и действующих брендов в качестве героев). Стиль темы:
- `music` — релизы, репетиции, плейлисты, инструменты; `memes` — короткие абсурдные наблюдения, «когда…», без картинок текстом; `games` — патчи, билды, инди, ретро; `it` — релизы библиотек, инциденты, собеседования, архитектурные споры; `sport` — матчи вымышленных команд, тренировки, забеги; `travel` — маршруты, лайфхаки, города `{city}`; `food` — рецепты с шагами, обзоры мест в `{city}`; `science` — «факт дня», разборы статей без цитат; `auto` — ремонт, дороги, тесты моделей без названий брендов; `fashion` — капсулы, ткани, уход; `city` — новости района: перекрытия, ярмарки, стройки, `{city}` почти в каждом.

- [ ] **Step 1: music, memes, games** → `bun test src/corpus` → commit `feat(seeder): music, memes, games corpora`
- [ ] **Step 2: it, sport, travel** → тест → commit `feat(seeder): it, sport, travel corpora`
- [ ] **Step 3: food, science, auto** → тест → commit `feat(seeder): food, science, auto corpora`
- [ ] **Step 4: fashion, city, dialogs.ts; index.ts со всеми 12 темами и `DIALOG_LINES`; убрать `todo` в тесте**

`src/corpus/index.ts`:
```ts
import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { cinema } from './topics/cinema'
import { music } from './topics/music'
// … остальные 10
import { DIALOG_LINES } from './dialogs'
export const CORPUS: Record<Topic, TopicCorpus> = { cinema, music, memes, games, it, sport, travel, food, science, auto, fashion, city }
export { DIALOG_LINES }
export { type TopicCorpus } from './schema'
```

Run: `cd apps/seeder && bun test src/corpus`
Expected: PASS для всех 12 тем + dialog lines.

```bash
git add apps/seeder/src/corpus
git commit -m "feat(seeder): fashion, city corpora, dialog lines; corpus complete for 12 topics"
```

---

### Task 17: Seeder stage 2: users and communities

**Files:**
- Create: `apps/seeder/src/generate/users.ts`, `users.test.ts`, `src/generate/communities.ts`, `communities.test.ts`, `src/generate/types.ts`

**Interfaces:**
- Produces:
  - `SeedConfig = { seed: number; scale: number; days: number }`; `scaleCount(base: number, scale: number, min = 1): number`.
  - `SeedUser = { id: number; login: string; firstName: string; lastName: string; screenName: string | null; city: string; birthday: string /*YYYY-MM-DD*/; sex: 'male'|'female'; interests: Float32Array /*12 весов, сумма 1*/; tier: 'star'|'notable'|'regular'; popularity: number /*вес для подписок*/; createdAt: Date; status: string | null }`.
  - `generateUsers(cfg: SeedConfig, rng: Rng): SeedUser[]` — `N = scaleCount(50_000, scale, 200)`, id = 1..N. Тиры: первые `scaleCount(100, scale, 3)` — `star`, следующие `scaleCount(1500, scale, 10)` — `notable`, остальные `regular`. `popularity = 1 / rank^0.9` (Ципф) по позиции в массиве после перемешивания рангов. Интересы: 2–4 темы с весами Dirichlet-подобно (gauss > 0, нормировка), остальные 0. Логин: транслит `firstname.lastname` + суффикс при коллизии; `screenName` = логин у 30%. Города: 40 крупных российских городов через `fakerRU.location.city()` с фиксированным списком и Ципф-весами. `firstName/lastName` по полу через `fakerRU.person.firstName(sex)`, `lastName(sex)`. `createdAt` равномерно за последние 5 лет; у звёзд — `isVerified` через `tier`.
  - `SeedCommunity = { id: number; screenName: string; name: string; description: string; topic: Topic; popularity: number; createdAt: Date }`; `generateCommunities(cfg, rng, corpus: Record<Topic, TopicCorpus>): SeedCommunity[]` — `scaleCount(700, scale, 24)` штук, названия берутся из корпуса без повторов (60 на тему × 12 = 720 ≥ 700), `screenName` = `club` + транслит без пробелов, `popularity` по Ципфу внутри темы.

- [ ] **Step 1: Failing tests**

`users.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { Rng } from '../rng'
import { generateUsers, scaleCount } from './users'

const cfg = { seed: 42, scale: 0.02, days: 90 }
describe('generateUsers', () => {
  const users = generateUsers(cfg, new Rng(cfg.seed))
  it('scales count and tiers', () => {
    expect(users.length).toBe(1000)
    expect(users.filter((u) => u.tier === 'star').length).toBe(3)
    expect(users.filter((u) => u.tier === 'notable').length).toBe(30)
    expect(scaleCount(50_000, 1)).toBe(50_000)
    expect(scaleCount(100, 0.001, 3)).toBe(3)
  })
  it('ids are 1..N, logins unique and lowercase latin', () => {
    expect(users.map((u) => u.id)).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1))
    expect(new Set(users.map((u) => u.login)).size).toBe(1000)
    for (const u of users) expect(u.login).toMatch(/^[a-z0-9_.]{3,32}$/)
  })
  it('interests sum to 1 with 2..4 non-zero topics', () => {
    for (const u of users.slice(0, 200)) {
      const nz = [...u.interests].filter((w) => w > 0).length
      expect(nz).toBeGreaterThanOrEqual(2); expect(nz).toBeLessThanOrEqual(4)
      expect(Math.abs([...u.interests].reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-4)
    }
  })
  it('popularity is heavy-tailed: top-1 star ≫ median regular', () => {
    const star = Math.max(...users.filter((u) => u.tier === 'star').map((u) => u.popularity))
    const regular = users.filter((u) => u.tier === 'regular').map((u) => u.popularity).sort((a, b) => a - b)
    expect(star / regular[Math.floor(regular.length / 2)]!).toBeGreaterThan(100)
  })
  it('is deterministic', () => {
    expect(generateUsers(cfg, new Rng(cfg.seed))[17]).toEqual(users[17])
  })
})
```

`communities.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'

describe('generateCommunities', () => {
  const cs = generateCommunities({ seed: 1, scale: 0.1, days: 90 }, new Rng(1), CORPUS)
  it('count scales, names/screenNames unique, every topic present', () => {
    expect(cs.length).toBe(70)
    expect(new Set(cs.map((c) => c.name)).size).toBe(70)
    expect(new Set(cs.map((c) => c.screenName)).size).toBe(70)
    expect(new Set(cs.map((c) => c.topic)).size).toBe(12)
    for (const c of cs) expect(c.screenName).toMatch(/^club[a-z0-9_]+$/)
  })
  it('full scale fits in corpus without repeats', () => {
    const all = generateCommunities({ seed: 1, scale: 1, days: 90 }, new Rng(1), CORPUS)
    expect(all.length).toBe(700)
    expect(new Set(all.map((c) => c.name)).size).toBe(700)
  })
})
```

- [ ] **Step 2: types.ts, users.ts**

```ts
// types.ts
import type { Topic } from '../topics'
export type SeedConfig = { seed: number; scale: number; days: number }
export type Tier = 'star' | 'notable' | 'regular'
export type SeedUser = { id: number; login: string; firstName: string; lastName: string; screenName: string | null; city: string; birthday: string; sex: 'male' | 'female'; interests: Float32Array; tier: Tier; popularity: number; createdAt: Date; status: string | null }
export type SeedCommunity = { id: number; screenName: string; name: string; description: string; topic: Topic; popularity: number; createdAt: Date }
```

```ts
// users.ts
import { fakerRU } from '@faker-js/faker'
import { TOPICS } from '../topics'
import { Rng, cumulative } from '../rng'
import type { SeedConfig, SeedUser, Tier } from './types'

export function scaleCount(base: number, scale: number, min = 1): number { return Math.max(min, Math.round(base * scale)) }

export const CITIES = ['Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань', 'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону', 'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград', 'Краснодар', 'Саратов', 'Тюмень', 'Тольятти', 'Ижевск', 'Барнаул', 'Ульяновск', 'Иркутск', 'Хабаровск', 'Ярославль', 'Владивосток', 'Махачкала', 'Томск', 'Оренбург', 'Кемерово', 'Новокузнецк', 'Рязань', 'Астрахань', 'Набережные Челны', 'Пенза', 'Липецк', 'Киров', 'Чебоксары', 'Тула', 'Калининград'] as const

const TRANSLIT: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' }
export function translit(s: string): string { return s.toLowerCase().split('').map((ch) => TRANSLIT[ch] ?? (/[a-z0-9]/.test(ch) ? ch : '')).join('') }

const STATUSES = ['Глажу кота', 'на связи после 19:00', 'в поиске хорошего кофе', 'не пишите, звоните', 'учу питон, уже не первый год', 'всё будет', 'работаю, не мешать', 'ищу барабанщика', 'на даче до понедельника', 'читаю больше, чем пишу']

export function generateUsers(cfg: SeedConfig, rng: Rng): SeedUser[] {
  const N = scaleCount(50_000, cfg.scale, 200)
  const stars = scaleCount(100, cfg.scale, 3)
  const notable = scaleCount(1500, cfg.scale, 10)
  fakerRU.seed(cfg.seed)
  const cityCum = cumulative(CITIES.map((_, i) => 1 / (i + 1) ** 0.8))
  const ranks = rng.shuffle(Array.from({ length: N }, (_, i) => i + 1))
  const used = new Set<string>()
  const now = Date.now()
  const out: SeedUser[] = []
  for (let i = 0; i < N; i++) {
    const sex: 'male' | 'female' = rng.chance(0.5) ? 'male' : 'female'
    const firstName = fakerRU.person.firstName(sex)
    const lastName = fakerRU.person.lastName(sex)
    let login = `${translit(firstName)}.${translit(lastName)}`.replace(/\.+/g, '.').slice(0, 28)
    if (login.length < 3) login = `user${i + 1}`
    if (used.has(login)) login = `${login}${rng.int(10, 9999)}`
    while (used.has(login)) login = `${login.replace(/\d+$/, '')}${rng.int(10, 99999)}`
    used.add(login)
    const tier: Tier = i < stars ? 'star' : i < notable + stars ? 'notable' : 'regular'
    const rank = tier === 'star' ? i + 1 : tier === 'notable' ? stars + 1 + (ranks[i]! % notable) : stars + notable + 1 + (ranks[i]! % Math.max(1, N - stars - notable)) * 3
    const k = rng.int(2, 4)
    const idx = rng.shuffle([...TOPICS.keys()]).slice(0, k)
    const interests = new Float32Array(TOPICS.length)
    let sum = 0
    for (const j of idx) { const w = Math.abs(rng.gauss(1, 0.5)) + 0.1; interests[j] = w; sum += w }
    for (const j of idx) interests[j] = interests[j]! / sum
    const birth = fakerRU.date.birthdate({ min: 16, max: 60, mode: 'age' })
    out.push({
      id: i + 1, login, firstName, lastName, screenName: rng.chance(0.3) ? login.replaceAll('.', '_') : null,
      city: CITIES[rng.weightedIndex(cityCum)]!, birthday: birth.toISOString().slice(0, 10), sex, interests, tier,
      popularity: 1 / rank ** 0.9, createdAt: new Date(now - rng.next() * 5 * 365 * 86400_000), status: rng.chance(0.25) ? rng.pick(STATUSES) : null,
    })
  }
  return out
}
```

- [ ] **Step 3: communities.ts**

```ts
import type { TopicCorpus } from '../corpus/schema'
import { TOPICS, type Topic } from '../topics'
import type { Rng } from '../rng'
import type { SeedCommunity, SeedConfig } from './types'
import { scaleCount, translit } from './users'

export function generateCommunities(cfg: SeedConfig, rng: Rng, corpus: Record<Topic, TopicCorpus>): SeedCommunity[] {
  const total = scaleCount(700, cfg.scale, 24)
  const perTopic = Math.ceil(total / TOPICS.length)
  const out: SeedCommunity[] = []
  const usedScreen = new Set<string>()
  const now = Date.now()
  for (const topic of TOPICS) {
    const pool = rng.shuffle([...corpus[topic].communities]).slice(0, perTopic)
    pool.forEach((c, i) => {
      if (out.length >= total) return
      let screen = `club${translit(c.name).slice(0, 24) || topic}`
      while (usedScreen.has(screen)) screen = `${screen}${rng.int(1, 999)}`
      usedScreen.add(screen)
      out.push({ id: out.length + 1, screenName: screen, name: c.name, description: c.description, topic, popularity: 1 / (i + 1) ** 0.9, createdAt: new Date(now - rng.next() * 6 * 365 * 86400_000) })
    })
  }
  return out
}
```

- [ ] **Step 4: Запустить, закоммитить**

Run: `cd apps/seeder && bun test src/generate && bun run typecheck`
Expected: PASS.

```bash
git add apps/seeder
git commit -m "feat(seeder): users with interests and zipf popularity, communities from corpus"
```

---

### Task 18: Seeder stage 3: social graph

**Files:**
- Create: `apps/seeder/src/generate/graph.ts`, `graph.test.ts`

**Interfaces:**
- Produces:
  - `Friendship = { lo: number; hi: number; status: 'pending'|'accepted'; requesterId: number; createdAt: Date; acceptedAt: Date | null }`.
  - `Follow = { followerId: number; targetType: 'user'|'community'; targetId: number; createdAt: Date }`.
  - `Membership = { communityId: number; userId: number; role: 'member'|'editor'|'admin'; createdAt: Date }`.
  - `generateFriendships(users: SeedUser[], rng: Rng): Friendship[]` — каждый пользователь инициирует `round(lognormal(ln 30, 0.8))` (cap 1500) связей: 55% из своего города с общим доминирующим интересом, 25% с общим интересом любого города, 20% случайные; уникальность пары через `Set<number>` ключа `lo * 2^21 + hi`; 6% пар остаются `pending`; звёзды принимают входящие только в 30% (иначе pending → это и есть их подписчики).
  - `generateFollows(users, communities, rng): { follows: Follow[]; memberships: Membership[] }` — на каждого пользователя `round(lognormal(ln 45, 0.7))` подписок: 65% на сообщества, 35% на звёзд/заметных; цель выбирается так: тема из интересов пользователя (по весам), затем цель внутри темы по `popularity`; подписка на сообщество создаёт и `Membership(member)`; у каждого сообщества 1 admin и 0–3 editor из подписчиков (первые по порядку).
  - `dominantTopic(u: SeedUser): number`.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { generateFollows, generateFriendships } from './graph'
import { generateUsers } from './users'

const cfg = { seed: 7, scale: 0.04, days: 90 }
const rng = new Rng(cfg.seed)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)

describe('generateFriendships', () => {
  const fr = generateFriendships(users, rng.fork('friends'))
  it('pairs are ordered, unique, no self loops', () => {
    const keys = new Set<string>()
    for (const f of fr) { expect(f.lo).toBeLessThan(f.hi); keys.add(`${f.lo}-${f.hi}`); expect([f.lo, f.hi]).toContain(f.requesterId) }
    expect(keys.size).toBe(fr.length)
  })
  it('average accepted degree is 50..130 and pending share 3..15%', () => {
    const accepted = fr.filter((f) => f.status === 'accepted')
    expect((accepted.length * 2) / users.length).toBeGreaterThan(50)
    expect((accepted.length * 2) / users.length).toBeLessThan(130)
    const pend = fr.length - accepted.length
    expect(pend / fr.length).toBeGreaterThan(0.03); expect(pend / fr.length).toBeLessThan(0.15)
    for (const f of accepted) expect(f.acceptedAt).not.toBeNull()
  })
  it('homophily: same-city share among friendships well above base rate', () => {
    const byId = new Map(users.map((u) => [u.id, u]))
    const same = fr.filter((f) => byId.get(f.lo)!.city === byId.get(f.hi)!.city).length / fr.length
    expect(same).toBeGreaterThan(0.4)
  })
})

describe('generateFollows', () => {
  const { follows, memberships } = generateFollows(users, communities, rng.fork('follows'))
  it('unique, targets exist, ~45 per user, communities dominate', () => {
    const keys = new Set(follows.map((f) => `${f.followerId}:${f.targetType}:${f.targetId}`))
    expect(keys.size).toBe(follows.length)
    const perUser = follows.length / users.length
    expect(perUser).toBeGreaterThan(30); expect(perUser).toBeLessThan(70)
    const cShare = follows.filter((f) => f.targetType === 'community').length / follows.length
    expect(cShare).toBeGreaterThan(0.55)
    const cIds = new Set(communities.map((c) => c.id)); const uIds = new Set(users.map((u) => u.id))
    for (const f of follows) expect(f.targetType === 'community' ? cIds.has(f.targetId) : uIds.has(f.targetId)).toBe(true)
    for (const f of follows) if (f.targetType === 'user') expect(users[f.targetId - 1]!.tier).not.toBe('regular')
  })
  it('memberships mirror community follows, each community has exactly one admin', () => {
    expect(memberships.length).toBe(follows.filter((f) => f.targetType === 'community').length)
    for (const c of communities) expect(memberships.filter((m) => m.communityId === c.id && m.role === 'admin').length).toBe(1)
  })
  it('stars get far more followers than notables', () => {
    const count = new Map<number, number>()
    for (const f of follows) if (f.targetType === 'user') count.set(f.targetId, (count.get(f.targetId) ?? 0) + 1)
    const avg = (tier: string) => { const xs = users.filter((u) => u.tier === tier).map((u) => count.get(u.id) ?? 0); return xs.reduce((a, b) => a + b, 0) / xs.length }
    expect(avg('star')).toBeGreaterThan(avg('notable') * 5)
  })
})
```

- [ ] **Step 2: graph.ts**

```ts
import { TOPICS } from '../topics'
import { type Rng, cumulative } from '../rng'
import type { SeedCommunity, SeedUser } from './types'

export type Friendship = { lo: number; hi: number; status: 'pending' | 'accepted'; requesterId: number; createdAt: Date; acceptedAt: Date | null }
export type Follow = { followerId: number; targetType: 'user' | 'community'; targetId: number; createdAt: Date }
export type Membership = { communityId: number; userId: number; role: 'member' | 'editor' | 'admin'; createdAt: Date }

export function dominantTopic(u: SeedUser): number {
  let best = 0
  for (let i = 1; i < u.interests.length; i++) if (u.interests[i]! > u.interests[best]!) best = i
  return best
}
const key = (a: number, b: number) => Math.min(a, b) * 2_097_152 + Math.max(a, b)

export function generateFriendships(users: SeedUser[], rng: Rng): Friendship[] {
  const byCityTopic = new Map<string, number[]>()
  const byTopic: number[][] = TOPICS.map(() => [])
  for (const u of users) {
    const t = dominantTopic(u)
    byTopic[t]!.push(u.id)
    const k = `${u.city}|${t}`
    byCityTopic.set(k, [...(byCityTopic.get(k) ?? []), u.id])
  }
  const seen = new Set<number>()
  const out: Friendship[] = []
  const now = Date.now()
  for (const u of users) {
    const deg = Math.min(1500, Math.round(rng.lognormal(Math.log(30), 0.8)))
    const t = dominantTopic(u)
    const local = byCityTopic.get(`${u.city}|${t}`) ?? []
    for (let i = 0; i < deg; i++) {
      const r = rng.next()
      const pool = r < 0.55 && local.length > 1 ? local : r < 0.8 ? byTopic[t]! : null
      const other = pool ? rng.pick(pool) : rng.int(1, users.length)
      if (other === u.id) continue
      const k = key(u.id, other)
      if (seen.has(k)) continue
      seen.add(k)
      const target = users[other - 1]!
      const accepts = target.tier === 'star' ? rng.chance(0.3) : rng.chance(0.94)
      const createdAt = new Date(now - rng.next() * 3 * 365 * 86400_000)
      out.push({ lo: Math.min(u.id, other), hi: Math.max(u.id, other), status: accepts ? 'accepted' : 'pending', requesterId: u.id, createdAt, acceptedAt: accepts ? new Date(createdAt.getTime() + rng.int(60, 3 * 86400) * 1000) : null })
    }
  }
  return out
}

export function generateFollows(users: SeedUser[], communities: SeedCommunity[], rng: Rng): { follows: Follow[]; memberships: Membership[] } {
  const commByTopic = TOPICS.map((t) => communities.filter((c) => c.topic === t))
  const commCum = commByTopic.map((cs) => cumulative(cs.map((c) => c.popularity)))
  const popByTopic = TOPICS.map((_, ti) => users.filter((u) => u.tier !== 'regular' && u.interests[ti]! > 0))
  const popCum = popByTopic.map((us) => cumulative(us.map((u) => u.popularity)))
  const seen = new Set<string>()
  const follows: Follow[] = []
  const now = Date.now()
  for (const u of users) {
    const n = Math.round(rng.lognormal(Math.log(45), 0.7))
    const interestCum = cumulative(u.interests)
    for (let i = 0; i < n; i++) {
      const ti = rng.weightedIndex(interestCum)
      let f: Follow | null = null
      if (rng.chance(0.65) && commByTopic[ti]!.length) f = { followerId: u.id, targetType: 'community', targetId: commByTopic[ti]![rng.weightedIndex(commCum[ti]!)]!.id, createdAt: new Date(now - rng.next() * 2 * 365 * 86400_000) }
      else if (popByTopic[ti]!.length) { const t = popByTopic[ti]![rng.weightedIndex(popCum[ti]!)]!; if (t.id !== u.id) f = { followerId: u.id, targetType: 'user', targetId: t.id, createdAt: new Date(now - rng.next() * 2 * 365 * 86400_000) } }
      if (!f) continue
      const k = `${f.followerId}:${f.targetType}:${f.targetId}`
      if (seen.has(k)) continue
      seen.add(k); follows.push(f)
    }
  }
  const memberships: Membership[] = []
  const perCommunity = new Map<number, Membership[]>()
  for (const f of follows) if (f.targetType === 'community') {
    const m: Membership = { communityId: f.targetId, userId: f.followerId, role: 'member', createdAt: f.createdAt }
    memberships.push(m); perCommunity.set(f.targetId, [...(perCommunity.get(f.targetId) ?? []), m])
  }
  for (const c of communities) {
    const ms = perCommunity.get(c.id) ?? []
    if (ms.length === 0) { const m: Membership = { communityId: c.id, userId: rng.int(1, users.length), role: 'admin', createdAt: c.createdAt }; memberships.push(m); continue }
    ms[0]!.role = 'admin'
    for (let i = 1; i < Math.min(ms.length, 1 + rng.int(0, 3)); i++) ms[i]!.role = 'editor'
  }
  return { follows, memberships }
}
```

- [ ] **Step 3: Запустить, при необходимости подстроить константы под пороги теста, закоммитить**

Run: `cd apps/seeder && bun test src/generate/graph.test.ts`
Expected: PASS. Если средняя степень вне 50..130, править `Math.log(30)` (mu) в `generateFriendships`.

```bash
git add apps/seeder
git commit -m "feat(seeder): friendship graph with city/interest homophily, follows and memberships"
```

---

### Task 19: Seeder stage 4: posts and interaction events

**Files:**
- Create: `apps/seeder/src/generate/posts.ts`, `posts.test.ts`, `src/generate/events.ts`, `events.test.ts`

**Interfaces:**
- Produces:
  - `SeedPost = { id: number; authorType: 'user'|'community'; authorId: number; topic: Topic; text: string; hasPhoto: boolean; createdAt: Date }`.
  - `generatePosts(cfg, users, communities, corpus, rng): SeedPost[]` — за `cfg.days` дней: сообщества `poisson(λ = 1 + 4·popularityNorm)` постов/день, звёзды 1 пост в 1–3 дня, notable — 0.2/день, regular — 5% пользователей по 1 посту в неделю. Тема поста: у сообщества его тема; у пользователя — тема по весам интересов. Текст через `generatePost(base, corpus[topic], rng, vars)`, база — `posts` для сообществ, `personalPosts` для людей. `hasPhoto` с вероятностью 0.45 (в `attachments` пишется `{kind:'photo', meta:{placeholder:true, seed}}` без файла). id по порядку времени (посты отсортированы по `createdAt`).
  - `SeedEvent = { userId: number; postId: number; kind: 'view'|'like'|'comment'|'click'; source: 'friends'|'follows'|'communities'|'popular'; position: number; sessionId: number; createdAt: Date }`, `SeedComment = { postId: number; authorId: number; text: string; createdAt: Date }`, `SeedLike = { userId: number; postId: number; createdAt: Date }`.
  - `simulateEvents(cfg, users, posts, graph: { follows: Follow[]; friendships: Friendship[] }, corpus, rng, opts = { activeShare: 0.3, sessions: 30, impressions: 20 }): { events: SeedEvent[]; likes: SeedLike[]; comments: SeedComment[] }`.
  - Формулы: `match = u.interests[post.topic]`, `pop = log1p(followersOfAuthor)`, `age = hours since post at session time`. `p_view = σ(2.2·match + 0.15·pop − 0.02·age + 0.3·gauss − 1.0)`, `p_like | view = σ(3.5·match + 0.15·pop − 0.01·age + 0.4·gauss − 4.2)`, `p_click | view = 0.3 + 0.3·match`, `p_comment | like = 0.12`. Кандидаты сессии: посты авторов из подписок/друзей пользователя, созданные в окне 72 часа до времени сессии (80%), плюс популярные (20%): случайные посты авторов из топ-5% по подписчикам в том же окне. Источник `source` — откуда взят кандидат. `position` — индекс в сессии. Событие `view` пишется только если просмотрен; `like`/`click`/`comment` требуют `view`.

- [ ] **Step 1: Failing tests**

`posts.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { generatePosts } from './posts'
import { generateUsers } from './users'

const cfg = { seed: 3, scale: 0.02, days: 30 }
const rng = new Rng(3)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)

describe('generatePosts', () => {
  const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))
  it('is sorted by time with sequential ids inside the window', () => {
    const now = Date.now()
    for (let i = 0; i < posts.length; i++) {
      expect(posts[i]!.id).toBe(i + 1)
      if (i) expect(posts[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(posts[i - 1]!.createdAt.getTime())
      expect(now - posts[i]!.createdAt.getTime()).toBeLessThanOrEqual(cfg.days * 86400_000 + 1000)
    }
  })
  it('community posts dominate; posting rates are in expected ranges', () => {
    const c = posts.filter((p) => p.authorType === 'community').length
    const perCommunityPerDay = c / communities.length / cfg.days
    expect(perCommunityPerDay).toBeGreaterThan(0.8); expect(perCommunityPerDay).toBeLessThan(6)
    const starPosts = posts.filter((p) => p.authorType === 'user' && users[p.authorId - 1]!.tier === 'star').length / users.filter((u) => u.tier === 'star').length
    expect(starPosts).toBeGreaterThan(cfg.days / 4); expect(starPosts).toBeLessThan(cfg.days * 1.2)
  })
  it('community post topic equals community topic; text is non-empty and varied', () => {
    for (const p of posts.filter((p) => p.authorType === 'community').slice(0, 300)) expect(p.topic).toBe(communities[p.authorId - 1]!.topic)
    expect(new Set(posts.map((p) => p.text)).size / posts.length).toBeGreaterThan(0.7)
  })
})
```

`events.test.ts`:
```ts
import { describe, expect, it } from 'bun:test'
import { CORPUS } from '../corpus'
import { Rng } from '../rng'
import { generateCommunities } from './communities'
import { simulateEvents } from './events'
import { generateFollows, generateFriendships } from './graph'
import { generatePosts } from './posts'
import { generateUsers } from './users'

const cfg = { seed: 5, scale: 0.02, days: 30 }
const rng = new Rng(5)
const users = generateUsers(cfg, rng.fork('users'))
const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)
const friendships = generateFriendships(users, rng.fork('friends'))
const { follows } = generateFollows(users, communities, rng.fork('follows'))
const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))

describe('simulateEvents', () => {
  const { events, likes, comments } = simulateEvents(cfg, users, posts, { follows, friendships }, CORPUS, rng.fork('events'), { activeShare: 0.3, sessions: 10, impressions: 20 })
  const viewed = new Set(events.filter((e) => e.kind === 'view').map((e) => `${e.userId}:${e.postId}:${e.sessionId}`))
  it('every like/click/comment has a view in the same session; sources and positions valid', () => {
    for (const e of events) {
      if (e.kind !== 'view') expect(viewed.has(`${e.userId}:${e.postId}:${e.sessionId}`)).toBe(true)
      expect(['friends', 'follows', 'communities', 'popular']).toContain(e.source)
      expect(e.position).toBeGreaterThanOrEqual(0); expect(e.position).toBeLessThan(20)
    }
  })
  it('rates are plausible: view 35..80% of impressions, like 3..20% of views', () => {
    const active = Math.round(users.length * 0.3)
    const impressions = active * 10 * 20
    const views = events.filter((e) => e.kind === 'view').length
    expect(views / impressions).toBeGreaterThan(0.35); expect(views / impressions).toBeLessThan(0.8)
    expect(likes.length / views).toBeGreaterThan(0.03); expect(likes.length / views).toBeLessThan(0.2)
    expect(comments.length).toBeGreaterThan(0)
  })
  it('likes are unique per (user,post) and interest-aligned', () => {
    expect(new Set(likes.map((l) => `${l.userId}:${l.postId}`)).size).toBe(likes.length)
    const avgMatchLiked = likes.reduce((a, l) => a + users[l.userId - 1]!.interests[TOPIC_INDEX(posts[l.postId - 1]!.topic)]!, 0) / likes.length
    const avgMatchViewed = events.filter((e) => e.kind === 'view').reduce((a, e) => a + users[e.userId - 1]!.interests[TOPIC_INDEX(posts[e.postId - 1]!.topic)]!, 0) / views(events)
    expect(avgMatchLiked).toBeGreaterThan(avgMatchViewed * 1.15)
  })
})
import { TOPICS } from '../topics'
const TOPIC_INDEX = (t: string) => TOPICS.indexOf(t as (typeof TOPICS)[number])
const views = (es: { kind: string }[]) => es.filter((e) => e.kind === 'view').length
```

- [ ] **Step 2: posts.ts**

```ts
import type { TopicCorpus } from '../corpus/schema'
import { TOPICS, type Topic } from '../topics'
import { type Rng, cumulative } from '../rng'
import { generatePost, type TextVars } from './text'
import type { SeedCommunity, SeedConfig, SeedUser } from './types'
import { CITIES } from './users'

export type SeedPost = { id: number; authorType: 'user' | 'community'; authorId: number; topic: Topic; text: string; hasPhoto: boolean; createdAt: Date }

function poisson(rng: Rng, lambda: number): number {
  const L = Math.exp(-lambda); let k = 0, p = 1
  do { k++; p *= rng.next() } while (p > L)
  return k - 1
}
export function generatePosts(cfg: SeedConfig, users: SeedUser[], communities: SeedCommunity[], corpus: Record<Topic, TopicCorpus>, rng: Rng): SeedPost[] {
  const now = Date.now()
  const start = now - cfg.days * 86400_000
  const raw: Omit<SeedPost, 'id'>[] = []
  const vars = (): TextVars => ({ name: rng.pick(users).firstName, city: rng.pick(CITIES), year: rng.int(1995, 2026), n: rng.int(2, 40) })
  const maxPop = Math.max(...communities.map((c) => c.popularity))
  for (const c of communities) {
    const lambda = 1 + 4 * (c.popularity / maxPop)
    for (let d = 0; d < cfg.days; d++) for (let i = poisson(rng, lambda); i > 0; i--) {
      const t = start + (d + rng.next()) * 86400_000
      raw.push({ authorType: 'community', authorId: c.id, topic: c.topic, text: generatePost(rng.pick(corpus[c.topic].posts), corpus[c.topic], rng, vars()), hasPhoto: rng.chance(0.45), createdAt: new Date(t) })
    }
  }
  for (const u of users) {
    const perDay = u.tier === 'star' ? 1 / rng.int(1, 3) : u.tier === 'notable' ? 0.2 : rng.chance(0.05) ? 1 / 7 : 0
    if (!perDay) continue
    const cum = cumulative(u.interests)
    const n = poisson(rng, perDay * cfg.days)
    for (let i = 0; i < n; i++) {
      const topic = TOPICS[rng.weightedIndex(cum)]!
      raw.push({ authorType: 'user', authorId: u.id, topic, text: generatePost(rng.pick(corpus[topic].personalPosts), corpus[topic], rng, { name: u.firstName, city: u.city, year: rng.int(2005, 2026), n: rng.int(2, 40) }), hasPhoto: rng.chance(0.5), createdAt: new Date(start + rng.next() * cfg.days * 86400_000) })
    }
  }
  raw.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return raw.map((p, i) => ({ id: i + 1, ...p }))
}
```

- [ ] **Step 3: events.ts**

```ts
import type { TopicCorpus } from '../corpus/schema'
import { TOPICS, type Topic } from '../topics'
import type { Rng } from '../rng'
import type { Follow, Friendship } from './graph'
import type { SeedPost } from './posts'
import type { SeedConfig, SeedUser } from './types'

export type EventSource = 'friends' | 'follows' | 'communities' | 'popular'
export type SeedEvent = { userId: number; postId: number; kind: 'view' | 'like' | 'comment' | 'click'; source: EventSource; position: number; sessionId: number; createdAt: Date }
export type SeedLike = { userId: number; postId: number; createdAt: Date }
export type SeedComment = { postId: number; authorId: number; text: string; createdAt: Date }
export type SimOpts = { activeShare: number; sessions: number; impressions: number }

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))
const authorKey = (t: 'user' | 'community', id: number) => (t === 'user' ? id : -id)

function lowerBound(arr: SeedPost[], t: number): number { let lo = 0, hi = arr.length; while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m]!.createdAt.getTime() < t) lo = m + 1; else hi = m } return lo }

export function simulateEvents(cfg: SeedConfig, users: SeedUser[], posts: SeedPost[], graph: { follows: Follow[]; friendships: Friendship[] }, corpus: Record<Topic, TopicCorpus>, rng: Rng, opts: SimOpts = { activeShare: 0.3, sessions: 30, impressions: 20 }) {
  const byAuthor = new Map<number, SeedPost[]>()
  for (const p of posts) { const k = authorKey(p.authorType, p.authorId); const l = byAuthor.get(k); if (l) l.push(p); else byAuthor.set(k, [p]) }
  const followers = new Map<number, number>()
  for (const f of graph.follows) { const k = authorKey(f.targetType, f.targetId); followers.set(k, (followers.get(k) ?? 0) + 1) }
  for (const f of graph.friendships) if (f.status === 'accepted') { followers.set(f.lo, (followers.get(f.lo) ?? 0) + 1); followers.set(f.hi, (followers.get(f.hi) ?? 0) + 1) }
  const sourcesByUser = new Map<number, { key: number; source: EventSource }[]>()
  const add = (u: number, key: number, source: EventSource) => { const l = sourcesByUser.get(u); const e = { key, source }; if (l) l.push(e); else sourcesByUser.set(u, [e]) }
  for (const f of graph.follows) add(f.followerId, authorKey(f.targetType, f.targetId), f.targetType === 'community' ? 'communities' : 'follows')
  for (const f of graph.friendships) if (f.status === 'accepted') { add(f.lo, f.hi, 'friends'); add(f.hi, f.lo, 'friends') }
  const popularAuthors = [...followers.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.max(5, Math.floor(followers.size * 0.05))).map(([k]) => k)

  const now = Date.now(), start = now - cfg.days * 86400_000, WINDOW = 72 * 3600_000
  const events: SeedEvent[] = [], likes: SeedLike[] = [], comments: SeedComment[] = []
  const liked = new Set<string>()
  const active = users.filter(() => rng.chance(opts.activeShare))
  let sessionId = 0
  const pickIn = (key: number, t: number): SeedPost | null => {
    const list = byAuthor.get(key); if (!list) return null
    const hi = lowerBound(list, t), lo = lowerBound(list, t - WINDOW)
    return hi > lo ? list[rng.int(lo, hi - 1)]! : null
  }
  for (const u of active) {
    const subs = sourcesByUser.get(u.id) ?? []
    for (let s = 0; s < opts.sessions; s++) {
      sessionId++
      const t = start + WINDOW + rng.next() * (cfg.days * 86400_000 - WINDOW)
      const seen = new Set<number>()
      for (let pos = 0; pos < opts.impressions; pos++) {
        let post: SeedPost | null = null, source: EventSource = 'popular'
        for (let tries = 0; tries < 4 && !post; tries++) {
          if (rng.chance(0.8) && subs.length) { const sub = rng.pick(subs); post = pickIn(sub.key, t); source = sub.source }
          else { post = pickIn(rng.pick(popularAuthors), t); source = 'popular' }
        }
        if (!post || seen.has(post.id)) continue
        seen.add(post.id)
        const match = u.interests[TOPICS.indexOf(post.topic)]!
        const pop = Math.log1p(followers.get(authorKey(post.authorType, post.authorId)) ?? 0)
        const age = (t - post.createdAt.getTime()) / 3600_000
        if (!rng.chance(sigmoid(2.2 * match + 0.15 * pop - 0.02 * age + 0.3 * rng.gauss() - 1.0))) continue
        const at = new Date(t + pos * 4000)
        const base = { userId: u.id, postId: post.id, source, position: pos, sessionId, createdAt: at }
        events.push({ ...base, kind: 'view' })
        if (rng.chance(0.3 + 0.3 * match)) events.push({ ...base, kind: 'click' })
        if (rng.chance(sigmoid(3.5 * match + 0.15 * pop - 0.01 * age + 0.4 * rng.gauss() - 4.2)) && !liked.has(`${u.id}:${post.id}`)) {
          liked.add(`${u.id}:${post.id}`)
          likes.push({ userId: u.id, postId: post.id, createdAt: at })
          events.push({ ...base, kind: 'like' })
          if (rng.chance(0.12)) { comments.push({ postId: post.id, authorId: u.id, text: rng.pick(corpus[post.topic].comments), createdAt: new Date(at.getTime() + 30_000) }); events.push({ ...base, kind: 'comment' }) }
        }
      }
    }
  }
  return { events, likes, comments }
}
```

- [ ] **Step 4: Запустить, подстроить коэффициенты под пороги, закоммитить**

Run: `cd apps/seeder && bun test src/generate && bun run typecheck`
Expected: PASS. Если доля просмотров вне 35..80%, крутить свободный член `−1.0`; если лайков вне 3..20% просмотров — `−4.2`.

```bash
git add apps/seeder
git commit -m "feat(seeder): posts by author tier and interaction simulation with sessions and sources"
```

---

### Task 20: Seeder DB writer, demo accounts, CLI, integration test

**Files:**
- Create: `apps/seeder/src/write/db.ts`, `src/write/reset.ts`, `src/write/insert.ts`, `src/write/insert.test.ts`, `src/seed.ts`, `src/cli.ts`, `test/seed.integration.test.ts`

**Interfaces:**
- Produces:
  - `runSeed(opts: { databaseUrl: string; seed: number; scale: number; days: number; demoPassword: string; log?: (s: string) => void }): Promise<SeedSummary>` где `SeedSummary = { users: number; communities: number; friendships: number; follows: number; posts: number; events: number; likes: number; comments: number; demoUserId: number; denisUserId: number }`.
  - Демо-аккаунты добавляются после сгенерированных: `demo` (Демо Пользователь, 150 друзей `accepted` из активных regular того же города, 20 подписок на самые популярные сообщества его интересов) и `deniscoreablev` (Денис Кораблев, статус «Глажу кота», 80 друзей, 15 сообществ). Только у них индивидуальные argon2-хэши; у всех сгенерированных — один общий хэш пароля `password`, посчитанный один раз.
  - `insertChunked(sql: SQL, table: string, rows: Record<string, unknown>[], chunk: number): Promise<void>` — `INSERT INTO table ${sql(rows)}` пачками; размер пачки такой, что `rows × columns ≤ 60_000`.
  - `resetDatabase(sql)` — `TRUNCATE` всех таблиц с `RESTART IDENTITY CASCADE`, после вставки `syncSequences(sql)` — `setval` для `users`, `communities`, `posts`, `comments`, `media` на `max(id)`.
  - Счётчики: `posts.likes_count/comments_count/views_count` и `communities.members_count` пересчитываются одним `UPDATE ... FROM (SELECT ... GROUP BY)` после вставки событий.
  - CLI: `bun run seed --scale 0.01 --seed 42 --days 90 --yes`; без `--yes` спрашивает подтверждение, потому что стирает базу.

- [ ] **Step 1: Failing unit test insertChunked**

```ts
import { describe, expect, it } from 'bun:test'
import { chunkSize } from './insert'
describe('chunkSize', () => {
  it('keeps rows*cols under 60000', () => {
    expect(chunkSize(14)).toBe(4285)
    expect(chunkSize(8)).toBe(7500)
    expect(chunkSize(100)).toBe(600)
  })
})
```

- [ ] **Step 2: insert.ts, reset.ts, db.ts**

```ts
// insert.ts
import type { SQL } from 'bun'
export function chunkSize(columns: number): number { return Math.max(1, Math.floor(60_000 / columns)) }
export async function insertChunked(sql: SQL, table: string, rows: Record<string, unknown>[], log?: (s: string) => void): Promise<void> {
  if (rows.length === 0) return
  const cols = Object.keys(rows[0]!).length
  const size = chunkSize(cols)
  for (let i = 0; i < rows.length; i += size) {
    const part = rows.slice(i, i + size)
    await sql`INSERT INTO ${sql(table)} ${sql(part)}`
    if (log && (i / size) % 20 === 0) log(`${table}: ${Math.min(i + size, rows.length)}/${rows.length}`)
  }
}
```

```ts
// reset.ts
import type { SQL } from 'bun'
export async function resetDatabase(sql: SQL): Promise<void> {
  await sql`TRUNCATE events, dialog_state, messages, dialogs, likes, comments, posts, media, community_members, follows, friendships, communities, users, author_stats_daily, user_profiles_ml, friend_suggestions, model_versions RESTART IDENTITY CASCADE`
}
export async function syncSequences(sql: SQL): Promise<void> {
  for (const t of ['users', 'communities', 'posts', 'comments', 'media']) await sql.unsafe(`SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT max(id) FROM ${t}), 0) + 1, false)`)
}
export async function recomputeCounters(sql: SQL): Promise<void> {
  await sql`UPDATE posts p SET likes_count = s.n FROM (SELECT target_id, count(*)::int n FROM likes WHERE target_type='post' GROUP BY target_id) s WHERE s.target_id = p.id`
  await sql`UPDATE posts p SET comments_count = s.n FROM (SELECT post_id, count(*)::int n FROM comments GROUP BY post_id) s WHERE s.post_id = p.id`
  await sql`UPDATE posts p SET views_count = s.n FROM (SELECT post_id, count(*)::int n FROM events WHERE kind='view' GROUP BY post_id) s WHERE s.post_id = p.id`
  await sql`UPDATE communities c SET members_count = s.n FROM (SELECT community_id, count(*)::int n FROM community_members GROUP BY community_id) s WHERE s.community_id = c.id`
}
```

```ts
// db.ts
import { SQL } from 'bun'
export function openSql(url: string): SQL { return new SQL(url, { max: 4 }) }
```

- [ ] **Step 3: seed.ts (оркестрация)**

```ts
import { CORPUS } from './corpus'
import { generateCommunities } from './generate/communities'
import { simulateEvents } from './generate/events'
import { generateFollows, generateFriendships, type Friendship, type Follow, type Membership } from './generate/graph'
import { generatePosts } from './generate/posts'
import { generateUsers } from './generate/users'
import type { SeedUser } from './generate/types'
import { Rng } from './rng'
import { openSql } from './write/db'
import { insertChunked } from './write/insert'
import { recomputeCounters, resetDatabase, syncSequences } from './write/reset'

export type SeedSummary = { users: number; communities: number; friendships: number; follows: number; posts: number; events: number; likes: number; comments: number; demoUserId: number; denisUserId: number }
export type SeedOptions = { databaseUrl: string; seed: number; scale: number; days: number; demoPassword: string; log?: (s: string) => void }

export async function runSeed(o: SeedOptions): Promise<SeedSummary> {
  const log = o.log ?? (() => {})
  const cfg = { seed: o.seed, scale: o.scale, days: o.days }
  const rng = new Rng(o.seed)
  const t0 = Date.now()
  const users = generateUsers(cfg, rng.fork('users'))
  const communities = generateCommunities(cfg, rng.fork('communities'), CORPUS)
  const friendships = generateFriendships(users, rng.fork('friends'))
  const { follows, memberships } = generateFollows(users, communities, rng.fork('follows'))
  const posts = generatePosts(cfg, users, communities, CORPUS, rng.fork('posts'))
  const { events, likes, comments } = simulateEvents(cfg, users, posts, { follows, friendships }, CORPUS, rng.fork('events'), { activeShare: 0.3, sessions: 20, impressions: 20 })
  log(`generated in ${Date.now() - t0}ms: users=${users.length} posts=${posts.length} events=${events.length}`)

  const sharedHash = await Bun.password.hash('password', { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 })
  const demo = addDemoUsers(users, communities, friendships, follows, memberships, rng.fork('demo'))

  const sql = openSql(o.databaseUrl)
  try {
    await resetDatabase(sql)
    await insertChunked(sql, 'users', users.map((u) => ({
      id: u.id, login: u.login, password_hash: sharedHash, first_name: u.firstName, last_name: u.lastName, screen_name: u.screenName, status: u.status,
      birthday: u.birthday, city: u.city, is_verified: u.tier === 'star', popularity_rank: Math.round(1 / u.popularity), created_at: u.createdAt,
    })), log)
    const demoHash = await Bun.password.hash(o.demoPassword, { algorithm: 'argon2id', memoryCost: 19456, timeCost: 2 })
    await sql`UPDATE users SET password_hash = ${demoHash} WHERE login IN ('demo', 'deniscoreablev')`
    await insertChunked(sql, 'communities', communities.map((c) => ({ id: c.id, screen_name: c.screenName, name: c.name, description: c.description, topic: c.topic, is_verified: c.popularity > 0.5, created_at: c.createdAt })), log)
    await insertChunked(sql, 'friendships', friendships.map((f) => ({ user_lo: f.lo, user_hi: f.hi, status: f.status, requester_id: f.requesterId, created_at: f.createdAt, accepted_at: f.acceptedAt })), log)
    await insertChunked(sql, 'follows', follows.map((f) => ({ follower_id: f.followerId, target_type: f.targetType, target_id: f.targetId, created_at: f.createdAt })), log)
    await insertChunked(sql, 'community_members', memberships.map((m) => ({ community_id: m.communityId, user_id: m.userId, role: m.role, created_at: m.createdAt })), log)
    await insertChunked(sql, 'posts', posts.map((p) => ({ id: p.id, author_type: p.authorType, author_id: p.authorId, text: p.text, topic: p.topic, attachments: JSON.stringify(p.hasPhoto ? [{ kind: 'photo', meta: { placeholder: true, seed: p.id } }] : []), created_at: p.createdAt })), log)
    await insertChunked(sql, 'likes', likes.map((l) => ({ user_id: l.userId, target_type: 'post', target_id: l.postId, created_at: l.createdAt })), log)
    await insertChunked(sql, 'comments', comments.map((c) => ({ post_id: c.postId, author_id: c.authorId, text: c.text, created_at: c.createdAt })), log)
    await insertChunked(sql, 'events', events.map((e) => ({ user_id: e.userId, post_id: e.postId, kind: e.kind, source: e.source, position: e.position, session_id: e.sessionId, created_at: e.createdAt })), log)
    await recomputeCounters(sql)
    await syncSequences(sql)
  } finally { await sql.close() }
  log(`seeded in ${Date.now() - t0}ms`)
  return { users: users.length, communities: communities.length, friendships: friendships.length, follows: follows.length, posts: posts.length, events: events.length, likes: likes.length, comments: comments.length, demoUserId: demo.demoId, denisUserId: demo.denisId }
}

function addDemoUsers(users: SeedUser[], communities: { id: number; topic: string; popularity: number }[], friendships: Friendship[], follows: Follow[], memberships: Membership[], rng: Rng): { demoId: number; denisId: number } {
  const mk = (login: string, firstName: string, lastName: string, status: string | null, city: string, friendsN: number, clubsN: number): number => {
    const id = users.length + 1
    const interests = new Float32Array(12); interests[0] = 0.4; interests[1] = 0.4; interests[4] = 0.2
    users.push({ id, login, firstName, lastName, screenName: login, city, birthday: '1996-05-14', sex: 'male', interests, tier: 'regular', popularity: 0.001, createdAt: new Date(Date.now() - 400 * 86400_000), status })
    const pool = rng.shuffle(users.filter((u) => u.id !== id && u.tier === 'regular' && u.city === city).map((u) => u.id)).slice(0, friendsN)
    for (const other of pool) friendships.push({ lo: Math.min(id, other), hi: Math.max(id, other), status: 'accepted', requesterId: other, createdAt: new Date(Date.now() - rng.int(1, 300) * 86400_000), acceptedAt: new Date() })
    const clubs = communities.filter((c) => ['cinema', 'music', 'it'].includes(c.topic)).sort((a, b) => b.popularity - a.popularity).slice(0, clubsN)
    for (const c of clubs) { follows.push({ followerId: id, targetType: 'community', targetId: c.id, createdAt: new Date() }); memberships.push({ communityId: c.id, userId: id, role: 'member', createdAt: new Date() }) }
    return id
  }
  const demoId = mk('demo', 'Демо', 'Пользователь', null, 'Москва', 150, 20)
  const denisId = mk('deniscoreablev', 'Денис', 'Кораблев', 'Глажу кота', 'Санкт-Петербург', 80, 15)
  return { demoId, denisId }
}
```

- [ ] **Step 4: cli.ts**

```ts
import { parseArgs } from 'node:util'
import { runSeed } from './seed'

const { values } = parseArgs({ options: { scale: { type: 'string', default: '1' }, seed: { type: 'string', default: '42' }, days: { type: 'string', default: '90' }, yes: { type: 'boolean', default: false }, url: { type: 'string' } } })
const databaseUrl = values.url ?? process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL or --url required')
if (!values.yes) {
  process.stdout.write(`This will WIPE ${databaseUrl} and seed scale=${values.scale}. Continue? [y/N] `)
  const answer = (await new Promise<string>((r) => process.stdin.once('data', (d) => r(String(d))))).trim().toLowerCase()
  if (answer !== 'y') process.exit(1)
}
const summary = await runSeed({ databaseUrl, seed: Number(values.seed), scale: Number(values.scale), days: Number(values.days), demoPassword: process.env.SEED_DEMO_PASSWORD ?? 'demo1234', log: console.log })
console.table(summary)
process.exit(0)
```

- [ ] **Step 5: Интеграционный тест на маленьком масштабе**

`test/seed.integration.test.ts`:
```ts
import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'
import { runSeed } from '../src/seed'

const url = process.env.DATABASE_URL_TEST ?? 'postgres://vk:vk@localhost:5432/vk_test'
const sql = new SQL(url)
afterAll(async () => { await sql.close() })

describe('runSeed (scale 0.01)', () => {
  it('populates all tables consistently', async () => {
    const s = await runSeed({ databaseUrl: url, seed: 1, scale: 0.01, days: 30, demoPassword: 'demo1234' })
    expect(s.users).toBe(502)
    const count = async (t: string) => Number((await sql.unsafe(`SELECT count(*)::int n FROM ${t}`))[0].n)
    expect(await count('users')).toBe(s.users)
    expect(await count('communities')).toBe(s.communities)
    expect(await count('friendships')).toBe(s.friendships)
    expect(await count('follows')).toBe(s.follows)
    expect(await count('posts')).toBe(s.posts)
    expect(await count('events')).toBe(s.events)
    expect(await count('likes')).toBe(s.likes)
    expect(await count('comments')).toBe(s.comments)
    const [orphan] = await sql`SELECT count(*)::int n FROM likes l LEFT JOIN posts p ON p.id = l.target_id WHERE p.id IS NULL`
    expect(orphan.n).toBe(0)
    const [cnt] = await sql`SELECT p.likes_count, (SELECT count(*)::int FROM likes WHERE target_id = p.id) real FROM posts p ORDER BY likes_count DESC LIMIT 1`
    expect(cnt.likes_count).toBe(cnt.real)
    const [demo] = await sql`SELECT id, password_hash FROM users WHERE login = 'demo'`
    expect(demo.id).toBe(s.demoUserId)
    expect(await Bun.password.verify('demo1234', demo.password_hash)).toBe(true)
    const [df] = await sql`SELECT count(*)::int n FROM friendships WHERE (user_lo = ${s.demoUserId} OR user_hi = ${s.demoUserId}) AND status = 'accepted'`
    expect(df.n).toBeGreaterThan(20)
    const [next] = await sql`INSERT INTO users (login, password_hash, first_name, last_name) VALUES ('after_seed', 'x', 'A', 'B') RETURNING id`
    expect(next.id).toBe(s.users + 1)
  }, 120_000)
})
```

Примечание: при `scale 0.01` demo получит меньше 150 друзей (в Москве мало людей), поэтому порог в тесте 20.

- [ ] **Step 6: Запустить тесты и полный сид**

Run: `cd apps/seeder && set -a; source ../../.env; set +a; bun test && bun run typecheck`
Expected: PASS, интеграционный тест ≤ 60 с.

Run: `bun run seed --scale 1 --yes` (полные 50k, из корня `bun run seed -- --scale 1 --yes`)
Expected: таблица summary; users 50002, posts ~200–300k, events 3–6M; общее время ≤ 15 минут на ноутбуке. Если генерация упирается в память (Bun падает на events), снизить `sessions` до 12 в вызове `simulateEvents` внутри `runSeed`.

Проверка входа: `curl -s -H 'content-type: application/json' -d '{"login":"demo","password":"demo1234"}' localhost:3000/api/v1/auth/login` при запущенном API → `{"user":{...}}`.

- [ ] **Step 7: Commit**

```bash
git add apps/seeder
git commit -m "feat(seeder): batched db writer, demo accounts, cli, integration test"
```

---

### Task 21: Web app scaffold: Vite + Solid, router, Layout with ui-kit

**Files:**
- Create: `apps/web/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `index.html`, `src/app/main.tsx`, `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/Layout.tsx`, `src/app/Layout.module.css`, `src/app/Layout.test.tsx`, `src/app/theme.ts`, `src/features/feed/pages/FeedPage.tsx`

**Interfaces:**
- Produces: приложение на `http://localhost:5173`, прокси `/api` → `http://localhost:3000`; `Layout` — шапка 48px (логотип, поиск, переключатель темы, аватар), левая навигация из прототипа (Профиль, Лента, Мессенджер, Друзья, Фото, Музыка со счётчиками) с `aria-current`, центральная колонка, правая колонка `aside`; сетка на 1420 как в прототипе. `theme.ts`: `getTheme(): 'light'|'dark'|'system'`, `setTheme(t)` пишет `data-vk` на `html` и в `localStorage('vk-scheme')`. Роуты: `/feed` (FeedPage-заглушка), `/login`, `/register` (Task 22), `/` → redirect `/feed`.

- [ ] **Step 1: package.json, конфиги**

```json
{
  "name": "@vkc/web",
  "version": "0.0.1",
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
    "@solidjs/router": "^1.0.0",
    "@tanstack/solid-query": "^5.102.8",
    "@vkc/contracts": "workspace:*",
    "@vkc/ui-kit": "workspace:*",
    "solid-js": "^1.9.15"
  },
  "devDependencies": {
    "@playwright/test": "^1.58.0",
    "@solidjs/testing-library": "^0.8.10",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^26.0.0",
    "vite": "^8.2.2",
    "vite-plugin-solid": "^2.11.14",
    "vitest": "^5.0.0"
  }
}
```

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "jsxImportSource": "solid-js", "types": ["vite/client"], "paths": { "~/*": ["./src/*"] } },
  "include": ["src", "e2e", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [solid()],
  resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } } },
})
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ['development', 'browser'], alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['src/**/*.test.{ts,tsx}'], setupFiles: ['./vitest.setup.ts'], css: { modules: { classNameStrategy: 'non-scoped' } } },
})
```

`vitest.setup.ts`: `import '@testing-library/jest-dom/vitest'`.

`index.html`:
```html
<!doctype html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ВКлон</title></head>
<body><div id="root"></div><script type="module" src="/src/app/main.tsx"></script></body>
</html>
```

- [ ] **Step 2: Failing Layout test**

`src/app/Layout.test.tsx`:
```tsx
import { render } from '@solidjs/testing-library'
import { MemoryRouter, Route, createMemoryHistory } from '@solidjs/router'
import { describe, expect, it } from 'vitest'
import { Layout } from './Layout'

function mount(path: string) {
  const history = createMemoryHistory(); history.set({ value: path })
  return render(() => (
    <MemoryRouter history={history} root={(p) => <Layout>{p.children}</Layout>}>
      <Route path="/feed" component={() => <div>FEED</div>} />
      <Route path="/im" component={() => <div>IM</div>} />
    </MemoryRouter>
  ))
}
describe('Layout', () => {
  it('renders nav with six items and marks current', () => {
    const { getAllByRole, getByRole } = mount('/feed')
    const nav = getByRole('navigation')
    expect(nav.querySelectorAll('a').length).toBeGreaterThanOrEqual(6)
    expect(getByRole('link', { name: /Лента/ })).toHaveAttribute('aria-current', 'page')
    expect(getByRole('link', { name: /Мессенджер/ })).not.toHaveAttribute('aria-current')
    expect(getAllByRole('main')).toHaveLength(1)
  })
  it('renders page content in main', () => {
    const { getByRole } = mount('/im')
    expect(getByRole('main')).toHaveTextContent('IM')
  })
})
```

Если в `@solidjs/router` 1.0 нет `createMemoryHistory`/`MemoryRouter` под этими именами, свериться с `node_modules/@solidjs/router/dist/index.d.ts` и подставить актуальные (в 0.15 они назывались именно так).

- [ ] **Step 3: theme.ts, Layout, routes, App, main, FeedPage**

```ts
// theme.ts
export type Theme = 'light' | 'dark' | 'system'
const KEY = 'vk-scheme'
export function getTheme(): Theme { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system' } catch { return 'system' } }
export function setTheme(t: Theme): void {
  try { t === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, t) } catch {}
  if (t === 'system') delete document.documentElement.dataset.vk
  else document.documentElement.dataset.vk = t
}
export function applySavedTheme(): void { setTheme(getTheme()) }
```

```tsx
// Layout.tsx
import { A, useLocation } from '@solidjs/router'
import { Avatar, Counter, Icon, Tappable, type IconName } from '@vkc/ui-kit'
import { For, type JSX, createSignal } from 'solid-js'
import { getTheme, setTheme } from './theme'
import s from './Layout.module.css'

const NAV: { href: string; label: string; icon: IconName; count?: number }[] = [
  { href: '/profile', label: 'Профиль', icon: 'user_outline_28' },
  { href: '/feed', label: 'Лента', icon: 'newsfeed_outline_28' },
  { href: '/im', label: 'Мессенджер', icon: 'message_outline_28' },
  { href: '/friends', label: 'Друзья', icon: 'users_outline_28' },
  { href: '/photos', label: 'Фото', icon: 'picture_outline_28' },
  { href: '/music', label: 'Музыка', icon: 'music_outline_28' },
]

export function Layout(props: { children?: JSX.Element; aside?: JSX.Element }) {
  const loc = useLocation()
  const [theme, setT] = createSignal(getTheme())
  const toggle = () => { const next = theme() === 'dark' ? 'light' : 'dark'; setTheme(next); setT(next) }
  return (
    <div class={s.root}>
      <header class={s.header}>
        <A href="/feed" class={s.logo}><span class={s.mark}>ВК</span></A>
        <label class={s.search}><Icon name="search_outline_20" /><input placeholder="Поиск" aria-label="Поиск" /></label>
        <span class={s.grow} />
        <Tappable as="button" hoverMode="background" class={s.iconBtn} aria-label="Сменить тему" onClick={toggle}><Icon name={theme() === 'dark' ? 'sun_outline_24' : 'moon_outline_24'} /></Tappable>
        <A href="/profile" class={s.me} aria-label="Профиль"><Avatar size={32} seed="me" /></A>
      </header>
      <div class={s.body}>
        <nav class={s.nav} aria-label="Основная навигация">
          <For each={NAV}>
            {(item) => (
              <A href={item.href} class={s.navItem} aria-current={loc.pathname.startsWith(item.href) ? 'page' : undefined}>
                <Icon name={item.icon} size={22} /><span>{item.label}</span>
                {item.count ? <Counter size="s" mode="prominent">{item.count}</Counter> : null}
              </A>
            )}
          </For>
        </nav>
        <main class={s.main}>{props.children}</main>
        <aside class={s.aside}>{props.aside}</aside>
      </div>
    </div>
  )
}
```

Проверить имена иконок в `packages/ui-kit/src/icons/names.ts` (`grep -c "'newsfeed_outline_28'" …`); при отсутствии подобрать ближайшие из того же файла.

`Layout.module.css` (значения из прототипа: шапка 48, три колонки на 1420, навигация 200, aside 300):
```css
.root { min-height: 100vh; }
.header { position: sticky; top: 0; z-index: 60; height: var(--vk-size-header); background: var(--vk-header_background); box-shadow: 0 0 0 1px var(--vk-separator_secondary); display: flex; align-items: center; gap: 12px; padding: 0 16px; }
.logo { display: flex; align-items: center; color: var(--vk-text_primary); }
.mark { width: 26px; height: 26px; border-radius: 7px; background: #0077ff; display: grid; place-items: center; color: #fff; font-size: 11px; font-weight: 700; }
.search { flex: 0 1 340px; display: flex; align-items: center; gap: 8px; height: var(--vk-size-search); padding: 0 12px; border-radius: var(--vk-radius); background: var(--vk-search_field_background); color: var(--vk-text_secondary); }
.search input { flex: 1; border: 0; background: transparent; outline: 0; color: var(--vk-text_primary); font-size: 14px; }
.grow { flex: 1; }
.iconBtn { width: 36px; height: 36px; border-radius: var(--vk-radius); display: grid; place-items: center; color: var(--vk-icon_secondary); }
.me { display: flex; }
.body { max-width: 1420px; margin: 0 auto; display: grid; grid-template-columns: 200px minmax(0, 1fr) 300px; gap: 16px; padding: 16px; }
.nav { position: sticky; top: 64px; align-self: start; display: flex; flex-direction: column; gap: 2px; }
.navItem { display: flex; align-items: center; gap: 12px; height: 40px; padding: 0 12px; border-radius: var(--vk-radius); color: var(--vk-text_primary); font-size: 15px; }
.navItem:hover { background: var(--vk-state_hover); }
.navItem[aria-current='page'] { background: var(--vk-background_secondary_alpha); font-weight: 500; }
.navItem .vk-icon { color: var(--vk-icon_accent); }
.main { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.aside { position: sticky; top: 64px; align-self: start; display: flex; flex-direction: column; gap: 16px; }
@media (max-width: 1100px) { .body { grid-template-columns: 200px minmax(0, 1fr); } .aside { display: none; } }
@media (max-width: 760px) { .body { grid-template-columns: minmax(0, 1fr); } .nav { display: none; } }
```

```tsx
// routes.tsx
import { Navigate, Route } from '@solidjs/router'
import { lazy } from 'solid-js'
const FeedPage = lazy(() => import('~/features/feed/pages/FeedPage'))
const LoginPage = lazy(() => import('~/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('~/features/auth/pages/RegisterPage'))
export function AppRoutes() {
  return (
    <>
      <Route path="/" component={() => <Navigate href="/feed" />} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="*" component={() => <div>Страница не найдена</div>} />
    </>
  )
}
```
(LoginPage/RegisterPage появляются в Task 22; до этого можно временно указать FeedPage.)

```tsx
// App.tsx
import { Router } from '@solidjs/router'
import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { SnackbarHost } from '@vkc/ui-kit'
import { Layout } from './Layout'
import { AppRoutes } from './routes'
const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } })
export function App() {
  return (
    <QueryClientProvider client={qc}>
      <SnackbarHost>
        <Router root={(p) => <Layout>{p.children}</Layout>}><AppRoutes /></Router>
      </SnackbarHost>
    </QueryClientProvider>
  )
}
```

```tsx
// main.tsx
import { render } from 'solid-js/web'
import '@vkc/ui-kit/tokens.css'
import '@vkc/ui-kit/typography.css'
import spriteUrl from '@vkc/ui-kit/icons/sprite.svg?url'
import { configureIcons } from '@vkc/ui-kit'
import { App } from './App'
import { applySavedTheme } from './theme'
configureIcons({ spriteUrl })
applySavedTheme()
render(() => <App />, document.getElementById('root')!)
```

```tsx
// features/feed/pages/FeedPage.tsx
import { Group, Skeleton, Typography } from '@vkc/ui-kit'
export default function FeedPage() {
  return (
    <Group padded>
      <Typography role="title3" as="h1">Лента</Typography>
      <Typography role="paragraph" muted as="p">Лента появится в подсистеме 3. Пока здесь скелетон.</Typography>
      <Skeleton height={120} radius={12} />
    </Group>
  )
}
```

- [ ] **Step 4: Запустить тесты и dev-сервер**

Run: `cd apps/web && bun install && vitest run && bun run typecheck`
Expected: PASS (2).

Run: `bun run dev` → открыть `http://localhost:5173/feed`: шапка, навигация с иконками VK, заглушка ленты, тема переключается и переживает перезагрузку.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): solid app scaffold with router, layout on ui-kit tokens and icons, theme toggle"
```

---

### Task 22: Web auth: session store, login/register pages, guard

**Files:**
- Create: `src/shared/api/client.ts`, `src/shared/session/session.tsx`, `src/shared/session/session.test.tsx`, `src/features/auth/pages/LoginPage.tsx`, `LoginPage.test.tsx`, `src/features/auth/pages/RegisterPage.tsx`, `src/features/auth/pages/auth.module.css`, `src/features/auth/api.ts`, `src/app/RequireAuth.tsx`
- Modify: `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/Layout.tsx`

**Interfaces:**
- Produces:
  - `api = createApi(window.location.origin)` из `@vkc/contracts`; `unwrap<T>(res: { data: T | null; error: { status: number; value: unknown } | null }): T` — бросает `ApiError { status, code, message }`, для 422 из Elysia без нашего формата ставит `code='validation'`.
  - `SessionProvider` + `useSession(): { user: Accessor<UserDto | null>; status: Accessor<'loading'|'authed'|'guest'>; setUser(u: UserDto | null): void; refresh(): Promise<void>; logout(): Promise<void> }` — при монтировании вызывает `GET /me`; 401 → `guest`.
  - `authApi.login(input)`, `authApi.register(input)` → `UserDto`.
  - `RequireAuth` — обёртка роута: `loading` → скелетон, `guest` → `<Navigate href="/login" />`.
  - Страницы: `/login` (логин, пароль, кнопка «Войти», ссылка на регистрацию, ошибки под полями: `invalid_credentials` → «Неверный логин или пароль»), `/register` (логин, имя, фамилия, пароль; `login_taken` → «Логин занят», `weak_password` → «Минимум 8 символов», `invalid_login` → «3–32 символа: латиница, цифры, _ .»). После успеха `setUser` и `navigate('/feed')`. Для этих страниц Layout рендерится без навигации (проп `bare`).
  - В шапке Layout аватар берёт `seed={user()?.id}`; для гостя показывает кнопку «Войти».

- [ ] **Step 1: Failing tests session и LoginPage**

`session.test.tsx`:
```tsx
import { render, waitFor } from '@solidjs/testing-library'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const me = vi.fn()
vi.mock('~/shared/api/client', () => ({ api: { api: { v1: { me: { get: me }, auth: { logout: { post: vi.fn(async () => ({ data: null, error: null })) } } } } }, unwrap: (r: { data: unknown; error: { status: number } | null }) => { if (r.error) throw Object.assign(new Error('x'), { status: r.error.status }); return r.data } }))
import { SessionProvider, useSession } from './session'

function Probe() { const s = useSession(); return <div>{s.status()}:{s.user()?.login ?? '-'}</div> }
beforeEach(() => me.mockReset())

describe('SessionProvider', () => {
  it('resolves to authed with user from /me', async () => {
    me.mockResolvedValue({ data: { user: { id: 1, login: 'demo', firstName: 'Д', lastName: 'П', screenName: null, createdAt: '' } }, error: null })
    const { getByText } = render(() => <SessionProvider><Probe /></SessionProvider>)
    expect(getByText('loading:-')).toBeInTheDocument()
    await waitFor(() => expect(getByText('authed:demo')).toBeInTheDocument())
  })
  it('resolves to guest on 401', async () => {
    me.mockResolvedValue({ data: null, error: { status: 401, value: {} } })
    const { getByText } = render(() => <SessionProvider><Probe /></SessionProvider>)
    await waitFor(() => expect(getByText('guest:-')).toBeInTheDocument())
  })
})
```

`LoginPage.test.tsx`:
```tsx
import { fireEvent, render, waitFor } from '@solidjs/testing-library'
import { MemoryRouter, Route, createMemoryHistory } from '@solidjs/router'
import { describe, expect, it, vi } from 'vitest'

const login = vi.fn()
vi.mock('~/features/auth/api', () => ({ authApi: { login: (i: unknown) => login(i), register: vi.fn() } }))
const setUser = vi.fn()
vi.mock('~/shared/session/session', () => ({ useSession: () => ({ setUser, user: () => null, status: () => 'guest' }) }))
import LoginPage from './LoginPage'

function mount() {
  const history = createMemoryHistory(); history.set({ value: '/login' })
  return { history, ...render(() => <MemoryRouter history={history}><Route path="/login" component={LoginPage} /><Route path="/feed" component={() => <div>FEED</div>} /></MemoryRouter>) }
}
describe('LoginPage', () => {
  it('submits credentials, stores user and navigates to /feed', async () => {
    login.mockResolvedValue({ id: 1, login: 'demo' })
    const { getByLabelText, getByRole, getByText } = mount()
    fireEvent.input(getByLabelText('Логин'), { target: { value: 'demo' } })
    fireEvent.input(getByLabelText('Пароль'), { target: { value: 'demo1234' } })
    fireEvent.click(getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(getByText('FEED')).toBeInTheDocument())
    expect(login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
    expect(setUser).toHaveBeenCalledWith({ id: 1, login: 'demo' })
  })
  it('shows error for invalid credentials', async () => {
    login.mockRejectedValue(Object.assign(new Error('Wrong'), { status: 401, code: 'invalid_credentials' }))
    const { getByLabelText, getByRole, getByText } = mount()
    fireEvent.input(getByLabelText('Логин'), { target: { value: 'demo' } })
    fireEvent.input(getByLabelText('Пароль'), { target: { value: 'bad' } })
    fireEvent.click(getByRole('button', { name: 'Войти' }))
    await waitFor(() => expect(getByText('Неверный логин или пароль')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: client.ts, session.tsx, auth/api.ts**

```ts
// shared/api/client.ts
import { createApi } from '@vkc/contracts'
export const api = createApi(window.location.origin)
export class ApiError extends Error { constructor(readonly status: number, readonly code: string, message: string) { super(message) } }
export function unwrap<T>(res: { data: T | null; error: { status: number; value: unknown } | null }): T {
  if (res.error) {
    const v = res.error.value as { error?: { code?: string; message?: string } } | undefined
    throw new ApiError(res.error.status, v?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown'), v?.error?.message ?? 'Request failed')
  }
  return res.data as T
}
```

```tsx
// shared/session/session.tsx
import type { UserDto } from '@vkc/contracts'
import { type Accessor, type JSX, createContext, createSignal, onMount, useContext } from 'solid-js'
import { ApiError, api, unwrap } from '~/shared/api/client'

type Status = 'loading' | 'authed' | 'guest'
type Session = { user: Accessor<UserDto | null>; status: Accessor<Status>; setUser(u: UserDto | null): void; refresh(): Promise<void>; logout(): Promise<void> }
const Ctx = createContext<Session>()

export function SessionProvider(props: { children: JSX.Element }) {
  const [user, setUserSig] = createSignal<UserDto | null>(null)
  const [status, setStatus] = createSignal<Status>('loading')
  const setUser = (u: UserDto | null) => { setUserSig(u); setStatus(u ? 'authed' : 'guest') }
  const refresh = async () => {
    try { setUser(unwrap(await api.api.v1.me.get()).user) }
    catch (e) { if (e instanceof ApiError && e.status === 401) setUser(null); else { setUser(null); console.error(e) } }
  }
  const logout = async () => { await api.api.v1.auth.logout.post(); setUser(null) }
  onMount(() => { void refresh() })
  return <Ctx.Provider value={{ user, status, setUser, refresh, logout }}>{props.children}</Ctx.Provider>
}
export function useSession(): Session { const s = useContext(Ctx); if (!s) throw new Error('useSession outside SessionProvider'); return s }
```

```ts
// features/auth/api.ts
import { api, unwrap } from '~/shared/api/client'
export const authApi = {
  async login(input: { login: string; password: string }) { return unwrap(await api.api.v1.auth.login.post(input)).user },
  async register(input: { login: string; password: string; firstName: string; lastName: string }) { return unwrap(await api.api.v1.auth.register.post(input)).user },
}
```

- [ ] **Step 3: Страницы и guard**

```tsx
// LoginPage.tsx
import { A, useNavigate } from '@solidjs/router'
import { Button, FormItem, Group, Input, Typography } from '@vkc/ui-kit'
import { createSignal } from 'solid-js'
import { ApiError } from '~/shared/api/client'
import { useSession } from '~/shared/session/session'
import { authApi } from '../api'
import s from './auth.module.css'

const MESSAGES: Record<string, string> = { invalid_credentials: 'Неверный логин или пароль', validation: 'Заполните все поля' }
export default function LoginPage() {
  const nav = useNavigate(); const session = useSession()
  const [login, setLogin] = createSignal(''); const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | null>(null); const [busy, setBusy] = createSignal(false)
  const submit = async (e: Event) => {
    e.preventDefault(); setError(null); setBusy(true)
    try { session.setUser(await authApi.login({ login: login(), password: password() })); nav('/feed') }
    catch (err) { setError(err instanceof ApiError ? (MESSAGES[err.code] ?? err.message) : 'Что-то пошло не так') }
    finally { setBusy(false) }
  }
  return (
    <div class={s.wrap}>
      <Group padded class={s.card}>
        <Typography role="title2" as="h1">Вход</Typography>
        <form onSubmit={submit} class={s.form}>
          <FormItem top="Логин"><Input name="login" autocomplete="username" aria-label="Логин" value={login()} onInput={(e) => setLogin(e.currentTarget.value)} status={error() ? 'error' : 'default'} /></FormItem>
          <FormItem top="Пароль" bottom={error()} status={error() ? 'error' : 'default'}><Input type="password" name="password" autocomplete="current-password" aria-label="Пароль" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} status={error() ? 'error' : 'default'} /></FormItem>
          <Button type="submit" size="l" stretched loading={busy()}>Войти</Button>
        </form>
        <Typography role="footnote" muted as="p">Нет аккаунта? <A href="/register">Зарегистрироваться</A></Typography>
      </Group>
    </div>
  )
}
```

`RegisterPage.tsx`:
```tsx
import { A, useNavigate } from '@solidjs/router'
import { Button, FormItem, Group, Input, Typography } from '@vkc/ui-kit'
import { createSignal } from 'solid-js'
import { ApiError } from '~/shared/api/client'
import { useSession } from '~/shared/session/session'
import { authApi } from '../api'
import s from './auth.module.css'

const MESSAGES: Record<string, string> = { login_taken: 'Логин занят', weak_password: 'Минимум 8 символов', invalid_login: '3–32 символа: латиница, цифры, _ .', empty_name: 'Введите имя и фамилию', validation: 'Заполните все поля' }
const FIELD_OF: Record<string, 'login' | 'password' | 'form'> = { login_taken: 'login', invalid_login: 'login', weak_password: 'password' }

export default function RegisterPage() {
  const nav = useNavigate(); const session = useSession()
  const [form, setForm] = createSignal({ login: '', firstName: '', lastName: '', password: '' })
  const [error, setError] = createSignal<{ field: 'login' | 'password' | 'form'; text: string } | null>(null)
  const [busy, setBusy] = createSignal(false)
  const upd = (k: keyof ReturnType<typeof form>) => (e: InputEvent & { currentTarget: HTMLInputElement }) => setForm({ ...form(), [k]: e.currentTarget.value })
  const submit = async (e: Event) => {
    e.preventDefault(); setError(null); setBusy(true)
    try { session.setUser(await authApi.register(form())); nav('/feed') }
    catch (err) {
      if (err instanceof ApiError) setError({ field: FIELD_OF[err.code] ?? 'form', text: MESSAGES[err.code] ?? err.message })
      else setError({ field: 'form', text: 'Что-то пошло не так' })
    } finally { setBusy(false) }
  }
  const status = (f: 'login' | 'password') => (error()?.field === f ? 'error' : 'default')
  const bottom = (f: 'login' | 'password') => (error()?.field === f ? error()!.text : undefined)
  return (
    <div class={s.wrap}>
      <Group padded class={s.card}>
        <Typography role="title2" as="h1">Регистрация</Typography>
        <form onSubmit={submit} class={s.form}>
          <FormItem top="Логин" bottom={bottom('login')} status={status('login')}><Input name="login" autocomplete="username" aria-label="Логин" value={form().login} onInput={upd('login')} status={status('login')} /></FormItem>
          <FormItem top="Имя"><Input name="firstName" autocomplete="given-name" aria-label="Имя" value={form().firstName} onInput={upd('firstName')} /></FormItem>
          <FormItem top="Фамилия"><Input name="lastName" autocomplete="family-name" aria-label="Фамилия" value={form().lastName} onInput={upd('lastName')} /></FormItem>
          <FormItem top="Пароль" bottom={bottom('password')} status={status('password')}><Input type="password" name="password" autocomplete="new-password" aria-label="Пароль" value={form().password} onInput={upd('password')} status={status('password')} /></FormItem>
          {error()?.field === 'form' && <Typography role="footnote" as="p" class={s.formError}>{error()!.text}</Typography>}
          <Button type="submit" size="l" stretched loading={busy()}>Зарегистрироваться</Button>
        </form>
        <Typography role="footnote" muted as="p">Уже есть аккаунт? <A href="/login">Войти</A></Typography>
      </Group>
    </div>
  )
}
```
В `auth.module.css` добавить `.formError { color: var(--vk-text_negative); margin: 0; }`.

`auth.module.css`:
```css
.wrap { display: grid; place-items: center; min-height: calc(100vh - 120px); }
.card { width: min(100%, 400px); display: flex; flex-direction: column; gap: 12px; }
.form { display: flex; flex-direction: column; gap: 4px; }
```

```tsx
// app/RequireAuth.tsx
import { Navigate } from '@solidjs/router'
import { Skeleton } from '@vkc/ui-kit'
import { type JSX, Match, Switch } from 'solid-js'
import { useSession } from '~/shared/session/session'
export function RequireAuth(props: { children: JSX.Element }) {
  const s = useSession()
  return (
    <Switch>
      <Match when={s.status() === 'loading'}><Skeleton height={200} radius={12} /></Match>
      <Match when={s.status() === 'guest'}><Navigate href="/login" /></Match>
      <Match when={s.status() === 'authed'}>{props.children}</Match>
    </Switch>
  )
}
```

`routes.tsx`: `/feed` → `component={() => <RequireAuth><FeedPage /></RequireAuth>}`. `App.tsx`: обернуть `Router` в `SessionProvider` (внутри `QueryClientProvider`). `Layout.tsx`: получить `useSession()`; если `loc.pathname` начинается с `/login` или `/register` — рендерить `props.children` в `main` без `nav`/`aside` (класс `.bare` на `.body` с `grid-template-columns: minmax(0,1fr)`); в шапке: `authed` → `<Avatar seed={user()!.id} />` и кнопка «Выйти» (вызывает `logout()` и `navigate('/login')`), `guest` → `<Button mode="secondary" size="s" onClick={() => navigate('/login')}>Войти</Button>`. Обновить `Layout.test.tsx`: замокать `~/shared/session/session` как в LoginPage-тесте.

FeedPage: показать `Здравствуйте, {user()?.firstName}` из `useSession()` над скелетоном.

- [ ] **Step 4: Запустить и проверить вручную**

Run: `cd apps/web && vitest run && bun run typecheck`
Expected: PASS (Layout 2, session 2, LoginPage 2).

Ручная проверка с поднятым API и засеянной базой: `http://localhost:5173/feed` → редирект на `/login` → вход `demo`/`demo1234` → `/feed` с приветствием «Здравствуйте, Демо»; перезагрузка страницы сохраняет вход (cookie); «Выйти» возвращает на `/login`. Регистрация нового логина работает, повтор того же логина показывает «Логин занят».

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(web): session provider, login and register pages, auth guard"
```

---

### Task 23: Playwright e2e: register → feed, login → logout

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/auth.spec.ts`

**Interfaces:**
- Produces: `bun run test:e2e` в `apps/web` — поднимает vite dev и API (`webServer` × 2), требует запущенный compose и мигрированную БД `vk` (данные не нужны: тест регистрирует уникальный логин).

- [ ] **Step 1: playwright.config.ts**

```ts
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  webServer: [
    { command: 'bun run --cwd ../api start', url: 'http://localhost:3000/api/v1/health', reuseExistingServer: true, timeout: 30_000 },
    { command: 'bun run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 30_000 },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
```

- [ ] **Step 2: e2e/auth.spec.ts**

```ts
import { expect, test } from '@playwright/test'

const login = `e2e_${Date.now().toString(36)}`
test('register lands on feed with greeting, survives reload, logout returns to login', async ({ page }) => {
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
```

- [ ] **Step 3: Запустить**

Run: `cd apps/web && bunx playwright install chromium && set -a; source ../../.env; set +a; bun run test:e2e`
Expected: 2 passed. Второй тест зависит от первого (зарегистрированный логин), поэтому `fullyParallel` не включать; при необходимости добавить `test.describe.configure({ mode: 'serial' })`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e
git commit -m "test(web): playwright e2e for register, login, logout"
```

---

### Task 24: CI, README, final verification

**Files:**
- Create: `.github/workflows/ci.yml`, `README.md`
- Modify: `package.json` (скрипт `test:integration`, `test:unit`)

**Interfaces:**
- Produces: CI с jobs `lint-typecheck`, `unit`, `integration` (postgres+redis как services), `e2e`. README с командами запуска за 5 минут.

- [ ] **Step 1: Скрипты корня**

В `package.json` добавить:
```json
"test:unit": "bun run --filter @vkc/ui-kit test && bun run --filter @vkc/web test && bun test apps/api/src/kernel apps/api/src/modules/identity/domain apps/api/src/modules/identity/application apps/api/src/modules/boundaries.test.ts apps/seeder/src",
"test:integration": "bun test apps/api/src/db apps/api/src/modules/identity/infrastructure apps/api/src/modules/identity/presentation apps/seeder/test"
```

- [ ] **Step 2: ci.yml**

```yaml
name: ci
on: { push: { branches: [main] }, pull_request: {} }
env:
  DATABASE_URL: postgres://vk:vk@localhost:5432/vk
  DATABASE_URL_TEST: postgres://vk:vk@localhost:5432/vk_test
  REDIS_URL: redis://localhost:6379
jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: bun run test:unit
  integration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env: { POSTGRES_USER: vk, POSTGRES_PASSWORD: vk, POSTGRES_DB: vk }
        ports: ['5432:5432']
        options: --health-cmd "pg_isready -U vk" --health-interval 5s --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: psql postgres://vk:vk@localhost:5432/vk -c "CREATE DATABASE vk_test" -c "CREATE EXTENSION IF NOT EXISTS vector" && psql $DATABASE_URL_TEST -c "CREATE EXTENSION IF NOT EXISTS vector"
      - run: bun run db:migrate && bun run --filter @vkc/api db:migrate:test
      - run: bun run test:integration
  e2e:
    runs-on: ubuntu-latest
    needs: [integration]
    services:
      postgres:
        image: pgvector/pgvector:pg17
        env: { POSTGRES_USER: vk, POSTGRES_PASSWORD: vk, POSTGRES_DB: vk }
        ports: ['5432:5432']
        options: --health-cmd "pg_isready -U vk" --health-interval 5s --health-retries 10
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector"
      - run: bun run db:migrate
      - run: cd apps/web && bunx playwright install --with-deps chromium && bun run test:e2e
```

- [ ] **Step 3: README.md**

```markdown
# vk-clone

Своя соцсеть по образцу ВКонтакте: лента с ML-ранжированием, граф друзей и подписок, сообщества, мессенджер.
Спек: `docs/superpowers/specs/2026-09-05-vk-clone-architecture-design.md`.

## Быстрый старт
```bash
cp .env.example .env
bun install
bun run infra:up          # postgres+pgvector, redis, minio
bun run db:migrate
bun run seed -- --scale 0.05 --yes   # 2 500 пользователей; --scale 1 для 50 000
bun run dev:api           # http://localhost:3000/api/v1/health
bun run dev:web           # http://localhost:5173  (demo / demo1234)
```

## Структура
apps/web · apps/api · apps/seeder · packages/ui-kit · packages/contracts (см. спек, раздел 3)

## Тесты
`bun run test:unit`, `bun run test:integration` (нужна инфраструктура), `cd apps/web && bun run test:e2e`.
```

- [ ] **Step 4: Полная проверка локально**

Run из корня:
```bash
bun run lint && bun run typecheck && bun run test:unit && bun run test:integration && (cd apps/web && bun run test:e2e)
```
Expected: всё зелёное. Затем `bun run seed -- --scale 1 --yes`, вход `demo` в веб-интерфейсе.

- [ ] **Step 5: Commit**

```bash
git add .github README.md package.json
git commit -m "ci: lint, unit, integration and e2e workflows; readme quick start"
```

---

## Что сознательно оставлено следующим подсистемам

- Роуты `/profile`, `/friends`, `/im`, `/photos`, `/music` в навигации ведут на «Страница не найдена» до подсистем 2, 5, 6.
- Таблицы `media`, `albums`, `tracks`, `playlists`: `media` создана (нужна FK для аватаров), остальные добавятся с подсистемой 6.
- `posts.embedding` и `user_profiles_ml` заполняются ML-сервисом (подсистема 4); сидер оставляет их NULL/пустыми.
- Rate limiting, WebSocket, MinIO-клиент в API — подсистемы 3 и 5; контейнер MinIO поднят заранее, чтобы compose больше не менять.
