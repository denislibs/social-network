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
apps/web · apps/api · apps/seeder · packages/ui-kit · packages/contracts (см. спек, раздел 3)

## Тесты
`bun run test:unit`, `bun run test:integration` (нужна инфраструктура), `cd apps/web && bun run test:e2e`.
