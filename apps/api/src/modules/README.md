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
