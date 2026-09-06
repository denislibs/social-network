# DI (InversifyJS) + logic-in-hooks retrofit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing code (web `apps/web`, api `apps/api`) in line with the CLAUDE.md rules added on 2026-09-06: dependency inversion through an InversifyJS container (no decorators), all frontend logic in hooks under `model/`, views in `ui/` without logic, frontend written TDD on Vitest.

**Architecture:** Frontend gets `shared/di` (container factory, `DiProvider`, `useService`, test helpers). Side-effecting collaborators (Eden HTTP client, 401 event bus, localStorage, matchMedia) become ports with `Symbol` tokens declared next to their consumers; real bindings live only in `app/composition/container.ts`. Forms, session and logout logic move into hooks (`useLoginForm`, `useRegisterForm`, `useAuthRedirect`, `useLogout`, `useSessionController`); components render VKUI from the hook result. Backend gets a kernel container built inside `buildApp(deps)`; identity ports get tokens in `application/ports.ts`, real implementations are bound in `infrastructure/identity.container.ts`, handlers resolve dependencies from the container, application tests use a container of in-memory fakes. External behaviour (HTTP contract, e2e specs) does not change.

**Tech Stack:** inversify 8.2.x (no `reflect-metadata` import, no decorators, no `experimentalDecorators`/`emitDecoratorMetadata`), React 19, Vitest 5 + RTL (`renderHook`), Bun test, Elysia 1.4.

## Global Constraints

- Only VKUI components/tokens/icons in `apps/web` (CLAUDE.md); `apps/web/src/vkui-only.test.ts` must stay green.
- Strict FSD: `app → pages → widgets → features → entities → shared`; imports into a slice only via its `index.ts`; Steiger (`bun run lint:fsd`) and oxlint FSD overrides must stay green.
- Frontend TDD on Vitest: for every task, write the failing test first, run it, watch it fail, implement, run it, watch it pass. Tests target user behaviour (roles/labels), not VKUI markup.
- Hooks in `model/`, pure functions in `lib/`/`model/`, views in `ui/` contain no `useState` with business state, no API calls, no `try/catch`.
- DI without decorators: explicit `Symbol` tokens typed as `ServiceIdentifier<T>`; bindings only `toConstantValue`, `toResolvedValue(factory, [TOKENS])`, `.inSingletonScope()` where an instance holds state. Never import `reflect-metadata`; never enable decorator compiler options.
- Real bindings only in `apps/web/src/app/composition/` and `apps/api/src/app.ts` (+ per-module `infrastructure/<module>.container.ts`). Hooks and handlers never import a singleton with side effects directly.
- `vi.mock` allowed only for VKUI/react-router and for `@/shared/api` in tests of the client itself.
- `bun run lint` (oxlint `--max-warnings=0` + Steiger + Biome), `bun run --filter @vkc/web typecheck`, `bun run test:unit`, `bun run test:integration` and `cd apps/web && bunx playwright test` (3 specs, unchanged) must pass at the end of every task that touches the respective area.
- Commits: Conventional Commits, English, trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Existing e2e file `apps/web/e2e/auth.spec.ts` must not be modified.

---

## File map

Frontend (`apps/web/src`):
- Create `shared/di/{container.ts,DiProvider.tsx,useService.ts,testing.tsx,index.ts}` + tests.
- Modify `shared/api/{client.ts,unauthorized.ts,index.ts}`; create `shared/api/ports.ts`.
- Modify `shared/lib/color-scheme/{theme.ts,useColorScheme.ts,index.ts}`; create `shared/lib/color-scheme/{ports.ts,store.ts,browser.ts}`.
- Modify `features/auth/{index.ts,api/authApi.ts,ui/LoginForm.tsx,ui/RegisterForm.tsx,ui/LogoutButton.tsx}`; create `features/auth/model/{ports.ts,useLoginForm.ts,useRegisterForm.ts,useAuthRedirect.ts,useLogout.ts}` + tests.
- Modify `entities/session/{index.ts,model/SessionProvider.tsx}`; create `entities/session/{api/sessionApi.ts,model/ports.ts,model/useSessionController.ts}` + tests.
- Modify `pages/login/ui/LoginPage.tsx`, `pages/register/ui/RegisterPage.tsx` (+ tests), `app/main.tsx`; create `app/composition/container.ts`.
- Modify `widgets/app-shell/ui/AppShell.test.tsx` (wrap with DI when needed).

Backend (`apps/api/src`):
- Create `kernel/tokens.ts`, `kernel/container.ts`.
- Modify `app.ts`, `modules/identity/index.ts`, `modules/identity/application/{ports.ts,register.ts,identity.application.test.ts}`; create `modules/identity/application/testing/container.ts`, `modules/identity/infrastructure/identity.container.ts`; modify `modules/identity/presentation/routes.ts`; extend `modules/boundaries.test.ts`.

---

### Task 1: `shared/di` — container, provider, `useService`, test helpers

**Files:**
- Create: `apps/web/src/shared/di/container.ts`, `DiProvider.tsx`, `useService.ts`, `testing.tsx`, `index.ts`
- Test: `apps/web/src/shared/di/useService.test.tsx`

**Interfaces:**
- Produces: `createContainer(): Container`; `DiProvider({ container, children })`; `useService<T>(id: ServiceIdentifier<T>): T`; `createTestContainer(): Container`; `withDi(container): ({ children }) => JSX` (wrapper for `render`/`renderHook`); re-export of `type ServiceIdentifier` and `Container` from `inversify`.

- [ ] **Step 1: Install inversify in the web workspace**

Run: `cd apps/web && bun add inversify@^8.2.3`
Expected: `apps/web/package.json` dependencies gain `"inversify": "^8.2.3"`; root `bun.lock` updated.

- [ ] **Step 2: Write the failing test**

```tsx
// apps/web/src/shared/di/useService.test.tsx
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ServiceIdentifier } from './container'
import { createTestContainer, withDi } from './testing'
import { useService } from './useService'

interface Clock {
  now(): number
}
const CLOCK: ServiceIdentifier<Clock> = Symbol('Clock')

describe('useService', () => {
  it('resolves a bound service from the nearest DiProvider', () => {
    const c = createTestContainer()
    c.bind(CLOCK).toConstantValue({ now: () => 42 })
    const { result } = renderHook(() => useService(CLOCK), { wrapper: withDi(c) })
    expect(result.current.now()).toBe(42)
  })

  it('throws a readable error outside DiProvider', () => {
    expect(() => renderHook(() => useService(CLOCK))).toThrow(/DiProvider/)
  })

  it('throws a readable error for an unbound token', () => {
    const c = createTestContainer()
    expect(() => renderHook(() => useService(CLOCK), { wrapper: withDi(c) })).toThrow(/Clock/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && bunx vitest run src/shared/di`
Expected: FAIL — cannot resolve `./testing` / `./useService`.

- [ ] **Step 4: Implement**

```ts
// apps/web/src/shared/di/container.ts
import { Container, type ServiceIdentifier } from 'inversify'

export type { ServiceIdentifier }
export { Container }

/** One container per application root; tests create their own via createTestContainer(). */
export function createContainer(): Container {
  return new Container({ defaultScope: 'Singleton' })
}
```

```tsx
// apps/web/src/shared/di/DiProvider.tsx
import { createContext, type ReactNode } from 'react'
import type { Container } from './container'

export const DiContext = createContext<Container | null>(null)

export function DiProvider({ container, children }: { container: Container; children: ReactNode }) {
  return <DiContext.Provider value={container}>{children}</DiContext.Provider>
}
```

```ts
// apps/web/src/shared/di/useService.ts
import { useContext } from 'react'
import type { ServiceIdentifier } from './container'
import { DiContext } from './DiProvider'

export function useService<T>(id: ServiceIdentifier<T>): T {
  const container = useContext(DiContext)
  if (!container) throw new Error('useService called outside DiProvider')
  if (!container.isBound(id)) throw new Error(`No binding for ${String(id)}`)
  return container.get(id)
}
```

```tsx
// apps/web/src/shared/di/testing.tsx
import type { ReactNode } from 'react'
import { type Container, createContainer } from './container'
import { DiProvider } from './DiProvider'

export function createTestContainer(): Container {
  return createContainer()
}

/** Wrapper for RTL `render`/`renderHook`: `renderHook(useX, { wrapper: withDi(container) })`. */
export function withDi(container: Container) {
  return function DiWrapper({ children }: { children: ReactNode }) {
    return <DiProvider container={container}>{children}</DiProvider>
  }
}
```

```ts
// apps/web/src/shared/di/index.ts
export { type Container, createContainer, type ServiceIdentifier } from './container'
export { DiProvider } from './DiProvider'
export { createTestContainer, withDi } from './testing'
export { useService } from './useService'
```

Note: `Symbol` descriptions must be human-readable (`Symbol('AuthGateway')`) because they appear in the unbound error.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && bunx vitest run src/shared/di`
Expected: 3 passed.

- [ ] **Step 6: Lint, typecheck, commit**

Run: `bun run lint && bun run --filter @vkc/web typecheck`
Expected: exit 0 (Steiger: `shared/di` is a segment, no slice rules apply).

```bash
git add apps/web/package.json bun.lock apps/web/src/shared/di
git commit -m "feat(web): shared/di container, DiProvider and useService"
```

---

### Task 2: `shared/api` ports — Eden client token and injectable 401 bus

**Files:**
- Create: `apps/web/src/shared/api/ports.ts`
- Modify: `apps/web/src/shared/api/unauthorized.ts`, `client.ts`, `index.ts`
- Test: `apps/web/src/shared/api/unwrap.test.ts` (new), `apps/web/src/shared/api/unauthorized.test.ts` (new)

**Interfaces:**
- Produces: `type ApiClient = ReturnType<typeof createApi>`; `API_CLIENT: ServiceIdentifier<ApiClient>`; `class UnauthorizedBus { emit(): void; on(handler: () => void): () => void }`; `UNAUTHORIZED_BUS: ServiceIdentifier<UnauthorizedBus>`; `unwrap<T>(res, opts?: { silent401?: boolean; bus?: UnauthorizedBus }): T`; `ApiError` unchanged; `createApi` re-exported from `@vkc/contracts` for composition.
- Removes: module-level `api` singleton export, `emitUnauthorized`/`onUnauthorized` free functions.

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/shared/api/unauthorized.test.ts
import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedBus } from './unauthorized'

describe('UnauthorizedBus', () => {
  it('notifies subscribers and stops after unsubscribe', () => {
    const bus = new UnauthorizedBus()
    const h = vi.fn()
    const off = bus.on(h)
    bus.emit()
    off()
    bus.emit()
    expect(h).toHaveBeenCalledTimes(1)
  })
})
```

```ts
// apps/web/src/shared/api/unwrap.test.ts
import { describe, expect, it, vi } from 'vitest'
import { ApiError, unwrap } from './client'
import { UnauthorizedBus } from './unauthorized'

const err = (status: number, code?: string) => ({
  data: null,
  error: { status, value: code ? { error: { code, message: 'm' } } : undefined },
})

describe('unwrap', () => {
  it('returns data on success', () => {
    expect(unwrap({ data: { ok: 1 }, error: null })).toEqual({ ok: 1 })
  })
  it('throws ApiError with code from body, validation for 422, unknown otherwise', () => {
    expect(() => unwrap(err(409, 'login_taken'))).toThrow(ApiError)
    expect(() => unwrap(err(422))).toThrow(expect.objectContaining({ code: 'validation' }))
    expect(() => unwrap(err(500))).toThrow(expect.objectContaining({ code: 'unknown' }))
  })
  it('emits on the given bus for 401 unless silent401', () => {
    const bus = new UnauthorizedBus()
    const h = vi.fn()
    bus.on(h)
    expect(() => unwrap(err(401), { bus })).toThrow(ApiError)
    expect(() => unwrap(err(401), { bus, silent401: true })).toThrow(ApiError)
    expect(h).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web && bunx vitest run src/shared/api`
Expected: FAIL — `UnauthorizedBus` not exported; `unwrap` ignores `bus`.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/shared/api/unauthorized.ts
export class UnauthorizedBus {
  private readonly target = new EventTarget()
  emit(): void {
    this.target.dispatchEvent(new Event('unauthorized'))
  }
  on(handler: () => void): () => void {
    this.target.addEventListener('unauthorized', handler)
    return () => this.target.removeEventListener('unauthorized', handler)
  }
}
```

```ts
// apps/web/src/shared/api/client.ts
import { createApi } from '@vkc/contracts'
import type { UnauthorizedBus } from './unauthorized'

export type ApiClient = ReturnType<typeof createApi>
export { createApi }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type EdenResult<T> = { data: T | null; error: { status: number; value: unknown } | null }

export function unwrap<T>(
  res: EdenResult<T>,
  opts: { silent401?: boolean; bus?: UnauthorizedBus } = {},
): T {
  if (res.error) {
    const body = res.error.value as { error?: { code?: string; message?: string } } | undefined
    const code = body?.error?.code ?? (res.error.status === 422 ? 'validation' : 'unknown')
    const message = body?.error?.message ?? 'Request failed'
    if (res.error.status === 401 && !opts.silent401) opts.bus?.emit()
    throw new ApiError(res.error.status, code, message)
  }
  return res.data as T
}
```

```ts
// apps/web/src/shared/api/ports.ts
import type { ServiceIdentifier } from '@/shared/di'
import type { ApiClient } from './client'
import type { UnauthorizedBus } from './unauthorized'

export const API_CLIENT: ServiceIdentifier<ApiClient> = Symbol('ApiClient')
export const UNAUTHORIZED_BUS: ServiceIdentifier<UnauthorizedBus> = Symbol('UnauthorizedBus')
```

```ts
// apps/web/src/shared/api/index.ts
export type { UserDto } from '@vkc/contracts'
export { type ApiClient, ApiError, createApi, unwrap } from './client'
export { API_CLIENT, UNAUTHORIZED_BUS } from './ports'
export { UnauthorizedBus } from './unauthorized'
```

Delete the old `api` constant and `emitUnauthorized`/`onUnauthorized`. Compilation will now fail in `features/auth/api/authApi.ts`, `entities/session/model/SessionProvider.tsx` and their tests — that is expected and is fixed in Tasks 4–5. To keep the branch green per task, in this task make the minimal temporary bridge: none. Instead, order of work: Task 2 is committed together with Tasks 4 and 5 only if typecheck cannot pass otherwise. Preferred: implement Task 2 fully, then immediately proceed to Tasks 4–5 in the same implementer session before running the full suite, committing Task 2 separately once `bunx vitest run src/shared/api` passes (Vitest per-directory) and deferring the whole-suite/typecheck gate to the end of Task 5. Record this in the report.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/web && bunx vitest run src/shared/api`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/api
git commit -m "refactor(web): injectable ApiClient token and UnauthorizedBus, unwrap takes a bus"
```

---

### Task 3: Colour scheme store behind ports (storage + system media)

**Files:**
- Create: `apps/web/src/shared/lib/color-scheme/ports.ts`, `store.ts`, `browser.ts`
- Modify: `apps/web/src/shared/lib/color-scheme/theme.ts` (keep pure fns `resolveScheme`, `nextPref`, `applyDocumentAttr`; remove `getPref`/`setPref`), `useColorScheme.ts`, `index.ts`, `apps/web/src/shared/lib/index.ts`
- Test: `apps/web/src/shared/lib/color-scheme/store.test.ts` (new), `useColorScheme.test.tsx` (rewrite to DI), `theme.test.ts` (drop storage cases)

**Interfaces:**
- Produces:
  ```ts
  export interface PrefStorage { get(): string | null; set(v: string): void; remove(): void }
  export interface SystemScheme { prefersDark(): boolean; subscribe(l: () => void): () => void }
  export const PREF_STORAGE: ServiceIdentifier<PrefStorage>
  export const SYSTEM_SCHEME: ServiceIdentifier<SystemScheme>
  export const COLOR_SCHEME_STORE: ServiceIdentifier<ColorSchemeStore>
  export class ColorSchemeStore {
    constructor(storage: PrefStorage, system: SystemScheme)
    getPref(): ColorSchemePref
    getScheme(): ColorScheme
    cycle(): void
    subscribe(l: () => void): () => void   // fires on pref change AND system change
  }
  export function createBrowserPrefStorage(key: string): PrefStorage   // localStorage, try/catch
  export function createBrowserSystemScheme(): SystemScheme            // matchMedia('(prefers-color-scheme: dark)')
  export function useColorScheme(): { pref; scheme; cycle }          // useService(COLOR_SCHEME_STORE) + useSyncExternalStore
  ```

- [ ] **Step 1: Write failing store test**

```ts
// apps/web/src/shared/lib/color-scheme/store.test.ts
import { describe, expect, it, vi } from 'vitest'
import type { PrefStorage, SystemScheme } from './ports'
import { ColorSchemeStore } from './store'

function memStorage(initial: string | null = null): PrefStorage {
  let v = initial
  return { get: () => v, set: (x) => { v = x }, remove: () => { v = null } }
}
function fakeSystem(dark: boolean) {
  const ls = new Set<() => void>()
  return {
    system: { prefersDark: () => dark, subscribe: (l: () => void) => { ls.add(l); return () => ls.delete(l) } } satisfies SystemScheme,
    flip() { dark = !dark; for (const l of ls) l() },
  }
}

describe('ColorSchemeStore', () => {
  it('starts from storage, falls back to system', () => {
    expect(new ColorSchemeStore(memStorage('dark'), fakeSystem(false).system).getScheme()).toBe('dark')
    expect(new ColorSchemeStore(memStorage(null), fakeSystem(true).system).getScheme()).toBe('dark')
    expect(new ColorSchemeStore(memStorage('garbage'), fakeSystem(false).system).getPref()).toBe('system')
  })
  it('cycles light → dark → system → light and persists', () => {
    const st = memStorage(null)
    const store = new ColorSchemeStore(st, fakeSystem(false).system)
    const l = vi.fn()
    store.subscribe(l)
    store.cycle(); expect(store.getPref()).toBe('light'); expect(st.get()).toBe('light')
    store.cycle(); expect(store.getPref()).toBe('dark'); expect(st.get()).toBe('dark')
    store.cycle(); expect(store.getPref()).toBe('system'); expect(st.get()).toBeNull()
    expect(l).toHaveBeenCalledTimes(3)
  })
  it('notifies when the system scheme changes while pref is system', () => {
    const sys = fakeSystem(false)
    const store = new ColorSchemeStore(memStorage(null), sys.system)
    const l = vi.fn()
    store.subscribe(l)
    sys.flip()
    expect(l).toHaveBeenCalledTimes(1)
    expect(store.getScheme()).toBe('dark')
  })
})
```

- [ ] **Step 2: Rewrite `useColorScheme.test.tsx` to DI**

Keep the existing behavioural cases (two consumers stay in sync through a cycle; document `colorScheme` style updated) but build them as: `const c = createTestContainer(); c.bind(COLOR_SCHEME_STORE).toConstantValue(new ColorSchemeStore(memStorage(null), fakeSystem(false).system)); renderHook(() => useColorScheme(), { wrapper: withDi(c) })`. Move `memStorage`/`fakeSystem` into `apps/web/src/shared/lib/color-scheme/testing.ts` and import them in both tests.

- [ ] **Step 3: Run to verify failure**

Run: `cd apps/web && bunx vitest run src/shared/lib/color-scheme`
Expected: FAIL — `./store`, `./ports` missing.

- [ ] **Step 4: Implement**

```ts
// ports.ts
import type { ServiceIdentifier } from '@/shared/di'
import type { ColorSchemeStore } from './store'
export interface PrefStorage { get(): string | null; set(v: string): void; remove(): void }
export interface SystemScheme { prefersDark(): boolean; subscribe(listener: () => void): () => void }
export const PREF_STORAGE: ServiceIdentifier<PrefStorage> = Symbol('PrefStorage')
export const SYSTEM_SCHEME: ServiceIdentifier<SystemScheme> = Symbol('SystemScheme')
export const COLOR_SCHEME_STORE: ServiceIdentifier<ColorSchemeStore> = Symbol('ColorSchemeStore')
```

```ts
// store.ts
import type { PrefStorage, SystemScheme } from './ports'
import { type ColorScheme, type ColorSchemePref, nextPref, resolveScheme } from './theme'

export class ColorSchemeStore {
  private pref: ColorSchemePref
  private readonly listeners = new Set<() => void>()
  constructor(
    private readonly storage: PrefStorage,
    private readonly system: SystemScheme,
  ) {
    const v = storage.get()
    this.pref = v === 'light' || v === 'dark' ? v : 'system'
    system.subscribe(() => this.notify())
  }
  getPref(): ColorSchemePref { return this.pref }
  getScheme(): ColorScheme { return resolveScheme(this.pref, this.system.prefersDark()) }
  cycle(): void {
    this.pref = nextPref(this.pref)
    if (this.pref === 'system') this.storage.remove()
    else this.storage.set(this.pref)
    this.notify()
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  private notify(): void { for (const l of this.listeners) l() }
}
```

```ts
// browser.ts
import type { PrefStorage, SystemScheme } from './ports'
export function createBrowserPrefStorage(key: string): PrefStorage {
  const safe = <T>(f: () => T, fallback: T): T => { try { return f() } catch { return fallback } }
  return {
    get: () => safe(() => localStorage.getItem(key), null),
    set: (v) => safe(() => localStorage.setItem(key, v), undefined),
    remove: () => safe(() => localStorage.removeItem(key), undefined),
  }
}
export function createBrowserSystemScheme(): SystemScheme {
  const mq = matchMedia('(prefers-color-scheme: dark)')
  return {
    prefersDark: () => mq.matches,
    subscribe: (l) => { mq.addEventListener('change', l); return () => mq.removeEventListener('change', l) },
  }
}
```

```ts
// useColorScheme.ts
import { useEffect, useSyncExternalStore } from 'react'
import { useService } from '@/shared/di'
import { COLOR_SCHEME_STORE } from './ports'
import { applyDocumentAttr, type ColorScheme, type ColorSchemePref } from './theme'

export function useColorScheme(): { pref: ColorSchemePref; scheme: ColorScheme; cycle: () => void } {
  const store = useService(COLOR_SCHEME_STORE)
  const pref = useSyncExternalStore(store.subscribe.bind(store), () => store.getPref())
  const scheme = useSyncExternalStore(store.subscribe.bind(store), () => store.getScheme())
  useEffect(() => { applyDocumentAttr(scheme) }, [scheme])
  return { pref, scheme, cycle: () => store.cycle() }
}
```

`subscribe.bind(store)` creates a new function each render; `useSyncExternalStore` resubscribes when `subscribe` identity changes. Use `useMemo(() => store.subscribe.bind(store), [store])` (or make `subscribe` an arrow-function property in the class) to keep the subscription stable. Prefer the arrow-property form: `readonly subscribe = (listener: () => void) => { … }`.

`index.ts` of `color-scheme` exports: types, `useColorScheme`, `ColorSchemeStore`, `COLOR_SCHEME_STORE`, `PREF_STORAGE`, `SYSTEM_SCHEME`, `createBrowserPrefStorage`, `createBrowserSystemScheme`, `PrefStorage`, `SystemScheme`. `shared/lib/index.ts` re-exports the same (the composition root imports from `@/shared/lib`).

- [ ] **Step 5: Run, then lint/typecheck (typecheck may still fail in `app/main.tsx` until Task 6 — acceptable; note in report), commit**

Run: `cd apps/web && bunx vitest run src/shared/lib`
Expected: all pass.

```bash
git add apps/web/src/shared/lib
git commit -m "refactor(web): ColorSchemeStore behind PrefStorage/SystemScheme ports"
```

---

### Task 4: `features/auth` — AuthGateway port, hooks, dumb views

**Files:**
- Create: `apps/web/src/features/auth/model/ports.ts`, `useLoginForm.ts`, `useRegisterForm.ts`, `useAuthRedirect.ts`, `useLogout.ts`, `apps/web/src/features/auth/testing.ts` (fake gateway + container helper; slice-internal, exported from `index.ts` under a `testing` name is NOT allowed — instead put it at `apps/web/src/features/auth/model/testing.ts` and import relatively from tests inside the slice; pages tests mock `@/features/auth` hooks via `vi.mock` as today)
- Modify: `features/auth/api/authApi.ts` → `EdenAuthGateway`, `ui/LoginForm.tsx`, `ui/RegisterForm.tsx`, `ui/LogoutButton.tsx`, `index.ts`
- Test: `model/useLoginForm.test.tsx`, `model/useRegisterForm.test.tsx`, `model/useAuthRedirect.test.tsx`, `model/useLogout.test.tsx`, rewrite `ui/LoginForm.test.tsx` and `ui/RegisterForm.test.tsx` to DI (no `vi.mock('../api/authApi')`)

**Interfaces:**
- Produces:
  ```ts
  // model/ports.ts
  export interface AuthGateway {
    login(input: { login: string; password: string }): Promise<UserDto>
    register(input: { login: string; password: string; firstName: string; lastName: string }): Promise<UserDto>
  }
  export const AUTH_GATEWAY: ServiceIdentifier<AuthGateway>
  // api/authApi.ts
  export class EdenAuthGateway implements AuthGateway { constructor(api: ApiClient, bus: UnauthorizedBus) }
  // model/useLoginForm.ts
  export function useLoginForm(onSuccess: (u: UserDto) => void): {
    values: { login: string; password: string }
    error: { field: 'login' | 'password' | 'form'; text: string } | null
    busy: boolean
    setField(field: 'login' | 'password', value: string): void
    submit(e?: { preventDefault(): void }): Promise<void>
  }
  // model/useRegisterForm.ts — same shape with fields login|firstName|lastName|password
  // model/useAuthRedirect.ts
  export function useAuthRedirect(): { onAuthenticated(u: UserDto): void; redirectTo: string }
    // reads location.state.redirect (default '/feed'), calls useSession().setUser then navigate(redirect, { replace: true })
  // model/useLogout.ts
  export function useLogout(): { logout(): Promise<void> }   // useSession().logout then navigate('/login')
  ```
- `index.ts` exports: `LoginForm`, `RegisterForm`, `LogoutButton`, `AUTH_GATEWAY`, `type AuthGateway`, `EdenAuthGateway`, `useAuthRedirect`.

- [ ] **Step 1: Failing hook tests** (write all four; example for login)

```tsx
// model/useLoginForm.test.tsx
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { createTestContainer, withDi } from '@/shared/di'
import { AUTH_GATEWAY, type AuthGateway } from './ports'
import { useLoginForm } from './useLoginForm'

const user = { id: 1, login: 'demo', firstName: 'Д', lastName: 'П', screenName: null, createdAt: '' }
function setup(gateway: Partial<AuthGateway>) {
  const c = createTestContainer()
  c.bind(AUTH_GATEWAY).toConstantValue({ login: vi.fn(), register: vi.fn(), ...gateway })
  const onSuccess = vi.fn()
  const hook = renderHook(() => useLoginForm(onSuccess), { wrapper: withDi(c) })
  return { ...hook, onSuccess, gateway: c.get(AUTH_GATEWAY) }
}

describe('useLoginForm', () => {
  it('submits trimmed values and reports success', async () => {
    const { result, onSuccess, gateway } = setup({ login: vi.fn().mockResolvedValue(user) })
    act(() => { result.current.setField('login', 'demo'); result.current.setField('password', 'demo1234') })
    await act(() => result.current.submit())
    expect(gateway.login).toHaveBeenCalledWith({ login: 'demo', password: 'demo1234' })
    expect(onSuccess).toHaveBeenCalledWith(user)
    expect(result.current.busy).toBe(false)
  })
  it('maps invalid_credentials to a form error and clears it on next edit', async () => {
    const { result } = setup({ login: vi.fn().mockRejectedValue(new ApiError(401, 'invalid_credentials', 'x')) })
    await act(() => result.current.submit())
    expect(result.current.error).toEqual({ field: 'form', text: 'Неверный логин или пароль' })
    act(() => result.current.setField('password', 'a'))
    expect(result.current.error).toBeNull()
  })
  it('is busy while the request is in flight', async () => {
    let resolve!: (u: typeof user) => void
    const { result } = setup({ login: vi.fn(() => new Promise((r) => { resolve = r })) })
    let p!: Promise<void>
    act(() => { p = result.current.submit() })
    expect(result.current.busy).toBe(true)
    await act(async () => { resolve(user); await p })
    expect(result.current.busy).toBe(false)
  })
})
```

`useRegisterForm.test.tsx`: same three cases plus `login_taken → field 'login'`, `weak_password → field 'password'`.

`useAuthRedirect.test.tsx`: `createMemoryRouter` with `/login` (probe calling `onAuthenticated(user)` on click) and `/im`; initial entry `{ pathname: '/login', state: { redirect: '/im' } }` lands on `/im`; without state lands on `/feed`; `useSession` mocked via `vi.mock('@/entities/session', () => ({ useSession: () => ({ setUser } ) }))` — allowed because the session context is provided by an entities slice and the test is about routing; assert `setUser` called with the user before navigation.

`useLogout.test.tsx`: `logout` from mocked `useSession` resolves → location becomes `/login`.

- [ ] **Step 2: Rewrite view tests to DI**

`ui/LoginForm.test.tsx` / `ui/RegisterForm.test.tsx`: remove `vi.mock('../api/authApi')`; build a test container binding `AUTH_GATEWAY` to a fake (`vi.fn()` methods) and render with `wrapper: withDi(c)`. Keep every existing assertion (labels, `aria-describedby`, `aria-invalid`, error clears on typing, busy button, `onSuccess`). Views must not need a router.

- [ ] **Step 3: Run to verify failures**

Run: `cd apps/web && bunx vitest run src/features/auth`
Expected: FAIL — hooks/ports missing; view tests fail on unbound `AuthGateway`.

- [ ] **Step 4: Implement**

```ts
// model/ports.ts
import type { ServiceIdentifier } from '@/shared/di'
import type { UserDto } from '@/shared/api'
export interface AuthGateway {
  login(input: { login: string; password: string }): Promise<UserDto>
  register(input: { login: string; password: string; firstName: string; lastName: string }): Promise<UserDto>
}
export const AUTH_GATEWAY: ServiceIdentifier<AuthGateway> = Symbol('AuthGateway')
```

```ts
// api/authApi.ts
import { type ApiClient, type UnauthorizedBus, type UserDto, unwrap } from '@/shared/api'
import type { AuthGateway } from '../model/ports'
export class EdenAuthGateway implements AuthGateway {
  constructor(private readonly api: ApiClient, private readonly bus: UnauthorizedBus) {}
  async login(input: { login: string; password: string }): Promise<UserDto> {
    return unwrap(await this.api.api.v1.auth.login.post(input), { silent401: true, bus: this.bus }).user
  }
  async register(input: { login: string; password: string; firstName: string; lastName: string }): Promise<UserDto> {
    return unwrap(await this.api.api.v1.auth.register.post(input), { bus: this.bus }).user
  }
}
```

```ts
// model/useLoginForm.ts
import { useCallback, useState } from 'react'
import type { UserDto } from '@/shared/api'
import { useService } from '@/shared/di'
import { codeOf, fieldFor, messageFor } from './errors'
import { AUTH_GATEWAY } from './ports'

export type LoginField = 'login' | 'password'
export type FieldError = { field: LoginField | 'form'; text: string }

export function useLoginForm(onSuccess: (u: UserDto) => void) {
  const auth = useService(AUTH_GATEWAY)
  const [values, setValues] = useState({ login: '', password: '' })
  const [error, setError] = useState<FieldError | null>(null)
  const [busy, setBusy] = useState(false)
  const setField = useCallback((field: LoginField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    setError(null)
  }, [])
  const submit = useCallback(
    async (e?: { preventDefault(): void }) => {
      e?.preventDefault()
      setError(null)
      setBusy(true)
      try {
        onSuccess(await auth.login(values))
      } catch (err) {
        const code = codeOf(err)
        setError({ field: fieldFor(code), text: messageFor(code) })
      } finally {
        setBusy(false)
      }
    },
    [auth, onSuccess, values],
  )
  return { values, error, busy, setField, submit }
}
```

`useRegisterForm.ts` mirrors it with four fields. `LoginForm.tsx` becomes: `const f = useLoginForm(onSuccess)` and JSX only (`onChange={(e) => f.setField('login', e.target.value)}`, `onSubmit={f.submit}`, `status`/`bottom`/`aria-*` derived inline from `f.error` — a ternary on a flag is allowed). `LogoutButton.tsx`: `const { logout } = useLogout(); <Button onClick={logout}>`.

```ts
// model/useAuthRedirect.ts
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useSession } from '@/entities/session'
import type { UserDto } from '@/shared/api'
export function useAuthRedirect() {
  const { setUser } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as { redirect?: string } | null)?.redirect ?? '/feed'
  const onAuthenticated = useCallback(
    (u: UserDto) => { setUser(u); navigate(redirectTo, { replace: true }) },
    [setUser, navigate, redirectTo],
  )
  return { onAuthenticated, redirectTo }
}
```

- [ ] **Step 5: Run feature tests, commit**

Run: `cd apps/web && bunx vitest run src/features/auth`
Expected: all pass (hooks + views).

```bash
git add apps/web/src/features/auth
git commit -m "refactor(web): auth logic in hooks behind AuthGateway port"
```

---

### Task 5: `entities/session` — SessionGateway port, `useSessionController`, thin provider

**Files:**
- Create: `apps/web/src/entities/session/model/ports.ts`, `useSessionController.ts`, `apps/web/src/entities/session/api/sessionApi.ts`
- Modify: `model/SessionProvider.tsx`, `index.ts`, `model/session.test.tsx` → rename to `model/useSessionController.test.tsx` (DI-based, no `vi.mock('@/shared/api')`)
- Keep: `ui/RequireAuth.tsx` + test, `useSession.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface SessionGateway { me(): Promise<UserDto | null>; logout(): Promise<void> }  // me(): null on 401, throws otherwise
  export const SESSION_GATEWAY: ServiceIdentifier<SessionGateway>
  export class EdenSessionGateway implements SessionGateway { constructor(api: ApiClient, bus: UnauthorizedBus) }
  export function useSessionController(): Session   // state machine: loading → authed|guest; subscribes UNAUTHORIZED_BUS; logout clears even if request fails
  ```
- `SessionProvider` = `const session = useSessionController(); return <SessionContext.Provider value={session}>`.
- `index.ts` adds `SESSION_GATEWAY`, `type SessionGateway`, `EdenSessionGateway`.

- [ ] **Step 1: Failing controller test**

Port every case from the current `session.test.tsx` (loading→authed on `me()` user; loading→guest on `me()` null; non-401 error logged and → guest; `setUser` flips; `logout` clears even when the request rejects; drops to guest when the bus emits while authed; ignores bus while guest) to `renderHook(() => useSessionController(), { wrapper: withDi(c) })` with `c.bind(SESSION_GATEWAY).toConstantValue(fakeGateway)` and `c.bind(UNAUTHORIZED_BUS).toConstantValue(new UnauthorizedBus())`. Add one `EdenSessionGateway` unit test that feeds a fake `ApiClient` object (`{ api: { v1: { me: { get }, auth: { logout: { post } } } } }` cast to `ApiClient`) and asserts `me()` returns `null` for a 401 result without emitting on the bus, and rethrows a 500 as `ApiError`.

- [ ] **Step 2: Run to verify failure**, **Step 3: Implement**

```ts
// api/sessionApi.ts
import { type ApiClient, ApiError, type UnauthorizedBus, type UserDto, unwrap } from '@/shared/api'
import type { SessionGateway } from '../model/ports'
export class EdenSessionGateway implements SessionGateway {
  constructor(private readonly api: ApiClient, private readonly bus: UnauthorizedBus) {}
  async me(): Promise<UserDto | null> {
    try {
      return unwrap(await this.api.api.v1.me.get(), { silent401: true, bus: this.bus }).user
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null
      throw e
    }
  }
  async logout(): Promise<void> {
    unwrap(await this.api.api.v1.auth.logout.post(), { silent401: true, bus: this.bus })
  }
}
```

`useSessionController.ts` = the body of today's `SessionProvider` (`sessionFor`, `useState<SessionState>`, effects) with `api` replaced by `useService(SESSION_GATEWAY)` and `onUnauthorized` by `useService(UNAUTHORIZED_BUS).on`. Effects depend on `[gateway]`/`[bus]` (stable singletons).

- [ ] **Step 4: Run entity tests; now run the whole web suite + typecheck** (Tasks 2–5 together must leave only `app/main.tsx` and pages red, which Task 6 fixes; if anything else is red, fix it here)

Run: `cd apps/web && bunx vitest run src/entities src/features src/shared`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/session
git commit -m "refactor(web): session state in useSessionController behind SessionGateway port"
```

---

### Task 6: Composition root, pages, app wiring, full green

**Files:**
- Create: `apps/web/src/app/composition/container.ts`
- Modify: `apps/web/src/app/main.tsx`, `pages/login/ui/LoginPage.tsx`, `pages/register/ui/RegisterPage.tsx`, `pages/login/ui/LoginPage.test.tsx`, `widgets/app-shell/ui/AppShell.test.tsx` (if it now needs DI for `ThemeToggle`/`LogoutButton`), `apps/web/src/vkui-only.test.ts` only if a new file pattern needs whitelisting (should not)
- Test: `apps/web/src/app/composition/container.test.ts`

**Interfaces:**
- Produces: `createAppContainer(): Container` binding `API_CLIENT` (`createApi(APP_ORIGIN)`), `UNAUTHORIZED_BUS` (singleton), `AUTH_GATEWAY` (`toResolvedValue((api, bus) => new EdenAuthGateway(api, bus), [API_CLIENT, UNAUTHORIZED_BUS])`), `SESSION_GATEWAY` (same shape), `PREF_STORAGE` (`createBrowserPrefStorage(STORAGE_KEYS.colorScheme)`), `SYSTEM_SCHEME` (`createBrowserSystemScheme()`), `COLOR_SCHEME_STORE` (`toResolvedValue((s, m) => new ColorSchemeStore(s, m), [PREF_STORAGE, SYSTEM_SCHEME])`).

- [ ] **Step 1: Failing composition test**

```ts
// app/composition/container.test.ts
import { describe, expect, it } from 'vitest'
import { AUTH_GATEWAY } from '@/features/auth'
import { SESSION_GATEWAY } from '@/entities/session'
import { API_CLIENT, UNAUTHORIZED_BUS } from '@/shared/api'
import { COLOR_SCHEME_STORE } from '@/shared/lib'
import { createAppContainer } from './container'

describe('createAppContainer', () => {
  it('resolves every application service and keeps singletons', () => {
    const c = createAppContainer()
    for (const t of [API_CLIENT, UNAUTHORIZED_BUS, AUTH_GATEWAY, SESSION_GATEWAY, COLOR_SCHEME_STORE]) {
      expect(c.get(t)).toBeDefined()
      expect(c.get(t)).toBe(c.get(t))
    }
  })
})
```

- [ ] **Step 2: Implement container + wire `main.tsx`**

`main.tsx`: `const container = createAppContainer()`; render `<DiProvider container={container}><App /></DiProvider>` inside `StrictMode`; `App` unchanged otherwise (it calls `useColorScheme`, which now resolves through DI).

Pages: `LoginPage` → `const { onAuthenticated } = useAuthRedirect(); <LoginForm onSuccess={onAuthenticated} />`; same for `RegisterPage`. Remove `useSession`/`useNavigate`/`useLocation` from pages. Update `LoginPage.test.tsx`: mock `@/features/auth` to export both `LoginForm` (button calling `onSuccess`) and `useAuthRedirect` (returning `{ onAuthenticated: spy }`); assert the spy is called with the user. The redirect behaviour itself is covered by `useAuthRedirect.test.tsx` (Task 4) and `RequireAuth.test.tsx`.

`AppShell.test.tsx`: wrap with `withDi(c)` binding `COLOR_SCHEME_STORE` to a store over fakes (import `ColorSchemeStore` from `@/shared/lib`, fakes from a local helper — do not import `shared/lib/color-scheme/testing.ts` across layers; recreate two tiny fakes inline).

- [ ] **Step 3: Full gates**

Run, all from repo root unless noted:
```bash
bun run lint
bun run --filter @vkc/web typecheck
bun run --filter @vkc/web test
cd apps/web && bunx playwright test
```
Expected: lint 0/0, typecheck 0, all Vitest files pass (count will grow vs. 53), Playwright 3 passed.

- [ ] **Step 4: Grep for leftovers**

```bash
grep -rn "from '@/shared/api'" apps/web/src | grep -v "type \|ApiError\|unwrap\|API_CLIENT\|UNAUTHORIZED_BUS\|UnauthorizedBus\|createApi\|ApiClient" 
grep -rn "localStorage\|matchMedia" apps/web/src --include='*.ts' --include='*.tsx' | grep -v "browser.ts\|\.test\.\|vitest.setup"
```
Expected: first prints nothing outside `app/composition`; second prints nothing.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "refactor(web): composition root with InversifyJS container; pages use useAuthRedirect"
```

---

### Task 7: Backend — kernel container, identity ports with tokens, container-driven wiring

**Files:**
- Create: `apps/api/src/kernel/tokens.ts`, `apps/api/src/kernel/container.ts`, `apps/api/src/modules/identity/infrastructure/identity.container.ts`, `apps/api/src/modules/identity/application/testing/container.ts`
- Modify: `apps/api/src/app.ts`, `apps/api/src/modules/identity/index.ts`, `application/ports.ts`, `application/register.ts`, `application/identity.application.test.ts`, `presentation/routes.ts`, `modules/boundaries.test.ts`
- Test: `apps/api/src/kernel/container.test.ts` (new), boundaries test extension

**Interfaces:**
- Produces:
  ```ts
  // kernel/tokens.ts
  export const KERNEL = {
    Db: Symbol('Db') as ServiceIdentifier<Db>,
    Redis: Symbol('Redis') as ServiceIdentifier<Redis>,
    CommandBus: Symbol('CommandBus') as ServiceIdentifier<CommandBus>,
    QueryBus: Symbol('QueryBus') as ServiceIdentifier<QueryBus>,
    EventBus: Symbol('EventBus') as ServiceIdentifier<EventBus>,
    Config: Symbol('AppConfig') as ServiceIdentifier<{ cookieSecure: boolean }>,
  }
  // kernel/container.ts
  export function createKernelContainer(deps: AppDeps): Container   // binds all KERNEL tokens toConstantValue
  // identity/application/ports.ts (append)
  export const IDENTITY = {
    UserRepository: Symbol('UserRepository') as ServiceIdentifier<UserRepository>,
    UserReadModel: Symbol('UserReadModel') as ServiceIdentifier<UserReadModel>,
    SessionStore: Symbol('SessionStore') as ServiceIdentifier<SessionStore>,
    PasswordHasher: Symbol('PasswordHasher') as ServiceIdentifier<PasswordHasher>,
  }
  // identity/application/register.ts
  export async function registerIdentityHandlers(c: Container): Promise<void>   // resolves IDENTITY.* and KERNEL.CommandBus/QueryBus/EventBus
  // identity/application/testing/container.ts
  export function createIdentityTestContainer(overrides?: Partial<{ hasher: PasswordHasher; events: EventBus }>): Container  // fakes + fresh buses
  // identity/infrastructure/identity.container.ts
  export function bindIdentityInfrastructure(c: Container): void   // Drizzle/Redis/Bun impls via toResolvedValue([KERNEL.Db]) etc., singleton
  // identity/index.ts
  export async function identityModule(c: Container): Promise<{ plugin: Elysia }>
  // presentation/routes.ts
  export function identityRoutes(c: Container)   // reads KERNEL.CommandBus, KERNEL.QueryBus, IDENTITY.SessionStore, KERNEL.Config
  // app.ts
  export async function buildApp(deps: AppDeps)   // signature unchanged: creates kernel container, mounts modules
  ```

- [ ] **Step 1: Install and write failing tests**

Run: `cd apps/api && bun add inversify@^8.2.3`

```ts
// apps/api/src/kernel/container.test.ts
import { describe, expect, it } from 'bun:test'
import { CommandBus } from './command-bus'
import { createKernelContainer } from './container'
import { EventBus } from './event-bus'
import { QueryBus } from './query-bus'
import { KERNEL } from './tokens'

describe('createKernelContainer', () => {
  it('exposes the provided kernel services as singletons', () => {
    const commands = new CommandBus()
    const c = createKernelContainer({
      db: {} as never, redis: {} as never, commands, queries: new QueryBus(), events: new EventBus(), cookieSecure: true,
    })
    expect(c.get(KERNEL.CommandBus)).toBe(commands)
    expect(c.get(KERNEL.Config).cookieSecure).toBe(true)
    expect(c.get(KERNEL.EventBus)).toBe(c.get(KERNEL.EventBus))
  })
})
```

Rewrite the `beforeEach` of `identity.application.test.ts` to:
```ts
const c = createIdentityTestContainer({ hasher, events })
await registerIdentityHandlers(c)
commands = c.get(KERNEL.CommandBus); queries = c.get(KERNEL.QueryBus); sessions = c.get(IDENTITY.SessionStore) as InMemorySessions
```
All assertions stay.

Boundaries test: add a case `'application layer may import inversify but no concrete adapters'` — it is covered by the existing infrastructure/presentation ban; add `'presentation does not import infrastructure'` (`hitsPath(spec, ['/infrastructure/'])` for `layerOf(f) === 'presentation'`), because with a container it becomes tempting.

- [ ] **Step 2: Run to verify failure**

Run: `bun test apps/api/src/kernel apps/api/src/modules`
Expected: FAIL — missing modules.

- [ ] **Step 3: Implement**

```ts
// kernel/container.ts
import { Container } from 'inversify'
import type { AppDeps } from '../app'
import { KERNEL } from './tokens'
export function createKernelContainer(d: AppDeps): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  c.bind(KERNEL.Db).toConstantValue(d.db)
  c.bind(KERNEL.Redis).toConstantValue(d.redis)
  c.bind(KERNEL.CommandBus).toConstantValue(d.commands)
  c.bind(KERNEL.QueryBus).toConstantValue(d.queries)
  c.bind(KERNEL.EventBus).toConstantValue(d.events)
  c.bind(KERNEL.Config).toConstantValue({ cookieSecure: d.cookieSecure })
  return c
}
```
(`AppDeps` type moves to `kernel/deps.ts` to avoid `kernel → app` import; `app.ts` re-exports it.)

```ts
// identity/infrastructure/identity.container.ts
import type { Container } from 'inversify'
import { KERNEL } from '../../../kernel/tokens'
import { IDENTITY } from '../application/ports'
import { BunPasswordHasher } from './bun-password-hasher'
import { DrizzleUserReadModel } from './drizzle-user-read-model'
import { DrizzleUserRepository } from './drizzle-user-repository'
import { RedisSessionStore } from './redis-session-store'
export function bindIdentityInfrastructure(c: Container): void {
  c.bind(IDENTITY.UserRepository).toResolvedValue((db) => new DrizzleUserRepository(db), [KERNEL.Db]).inSingletonScope()
  c.bind(IDENTITY.UserReadModel).toResolvedValue((db) => new DrizzleUserReadModel(db), [KERNEL.Db]).inSingletonScope()
  c.bind(IDENTITY.SessionStore).toResolvedValue((redis) => new RedisSessionStore(redis), [KERNEL.Redis]).inSingletonScope()
  c.bind(IDENTITY.PasswordHasher).toConstantValue(new BunPasswordHasher())
}
```

```ts
// identity/application/register.ts
export async function registerIdentityHandlers(c: Container): Promise<void> {
  const d = {
    users: c.get(IDENTITY.UserRepository),
    usersRead: c.get(IDENTITY.UserReadModel),
    sessions: c.get(IDENTITY.SessionStore),
    hasher: c.get(IDENTITY.PasswordHasher),
    commands: c.get(KERNEL.CommandBus),
    queries: c.get(KERNEL.QueryBus),
    events: c.get(KERNEL.EventBus),
  }
  const dummyHash = await d.hasher.hash(crypto.randomUUID())
  d.commands.register(RegisterUser, registerUserHandler(d))
  … (unchanged registrations)
}
```
Handler factories keep their explicit `d` parameter objects (they are pure functions of ports; that is the testable seam).

```ts
// identity/application/testing/container.ts
export function createIdentityTestContainer(o: { hasher?: PasswordHasher; events?: EventBus } = {}): Container {
  const c = new Container({ defaultScope: 'Singleton' })
  const users = new InMemoryUsers()
  c.bind(IDENTITY.UserRepository).toConstantValue(users)
  c.bind(IDENTITY.UserReadModel).toConstantValue(new InMemoryUserReadModel(users))
  c.bind(IDENTITY.SessionStore).toConstantValue(new InMemorySessions())
  c.bind(IDENTITY.PasswordHasher).toConstantValue(o.hasher ?? new FakeHasher())
  c.bind(KERNEL.CommandBus).toConstantValue(new CommandBus())
  c.bind(KERNEL.QueryBus).toConstantValue(new QueryBus())
  c.bind(KERNEL.EventBus).toConstantValue(o.events ?? new EventBus())
  return c
}
```

`identity/index.ts`: `export async function identityModule(c) { bindIdentityInfrastructure(c); await registerIdentityHandlers(c); return { plugin: identityRoutes(c) } }`. `routes.ts`: take `c: Container`, read the four services at the top. `app.ts`: `const c = createKernelContainer(deps); const identity = await identityModule(c); …` — signature of `buildApp(deps)` unchanged so `apps/api/test/helpers/app.ts` and `main.ts` compile as-is.

- [ ] **Step 4: Run all backend lanes**

```bash
bun run lint
bun test apps/api/src apps/seeder/src --path-ignore-patterns '**/*.integration.test.ts' --path-ignore-patterns '**/*.infrastructure.test.ts' --path-ignore-patterns '**/*.e2e.test.ts'
bun run test:integration
```
Expected: lint 0/0; unit 145+ pass (new container test); integration 17 pass (e2e auth unchanged).

- [ ] **Step 5: Commit**

```bash
git add apps/api bun.lock
git commit -m "refactor(api): InversifyJS kernel container; identity ports resolved through tokens"
```

---

### Task 8: Docs and closing checks

**Files:**
- Modify: `CLAUDE.md` (only if a rule needs a precise correction discovered during implementation; record any deviation), `README.md` (architecture paragraph: DI container, where bindings live, how to write a hook test with `withDi`), `docs/superpowers/specs/2026-09-06-web-react-vkui-migration-design.md` §9 (add note: DI retrofit 2026-09-06, session/auth logic moved to hooks)

- [ ] **Step 1: Update docs** as above (no code).
- [ ] **Step 2: Whole-repo gates once more** — `bun run lint && bun run test && cd apps/web && bunx playwright test`.
- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md docs
git commit -m "docs: DI container and hooks conventions after retrofit"
```
