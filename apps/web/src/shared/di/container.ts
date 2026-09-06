import { Container, type ServiceIdentifier as InversifyServiceIdentifier } from 'inversify'

/**
 * Branded re-export of inversify's `ServiceIdentifier<T>`.
 *
 * inversify defines `ServiceIdentifier<T> = string | symbol | Newable<T> | AbstractNewable<T>`.
 * Once a `Symbol`-based token is assigned to a `const` annotated with that type
 * (e.g. `const TOKEN: ServiceIdentifier<Foo> = Symbol('Foo')`), TypeScript widens the
 * const to the full union. Passing that widened union into another generic function
 * (e.g. `useService(TOKEN)`) then fails to infer `T`, because the plain `string`/`symbol`
 * union members carry no information about it — `T` collapses to `unknown`. The optional
 * phantom field below gives inference a concrete, non-union anchor for `T`, fixing call-site
 * inference at `useService(TOKEN)` without requiring an explicit `useService<Foo>(TOKEN)`
 * everywhere. It has no runtime representation and does not change assignability: any
 * inversify `ServiceIdentifier<T>` (string, symbol, class, or abstract class) still satisfies
 * this type, and this type still satisfies inversify's own `Container` methods.
 */
export type ServiceIdentifier<T> = InversifyServiceIdentifier<T> & {
  readonly __serviceType?: (value: T) => void
}
export { Container }

/**
 * One container per application root; tests create their own via createTestContainer().
 * Default scope is Singleton, so a binding that needs a fresh instance per resolution
 * must opt out explicitly with `.inTransientScope()`.
 */
export function createContainer(): Container {
  return new Container({ defaultScope: 'Singleton' })
}
