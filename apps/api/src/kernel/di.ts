import { Container, type ServiceIdentifier as InversifyServiceIdentifier } from 'inversify'

/**
 * Branded re-export of inversify's `ServiceIdentifier<T>`.
 *
 * inversify defines `ServiceIdentifier<T> = string | symbol | Newable<T> | AbstractNewable<T>`.
 * Once a `Symbol`-based token is assigned to a `const` annotated with that type
 * (e.g. `const TOKEN: ServiceIdentifier<Foo> = Symbol('Foo')`), TypeScript widens the
 * const to the full union. Passing that widened union into another generic function
 * (e.g. `c.get(TOKEN)`) then fails to infer `T`, because the plain `string`/`symbol`
 * union members carry no information about it — `T` collapses to `unknown`. The optional
 * phantom field below gives inference a concrete, non-union anchor for `T`, fixing call-site
 * inference at `c.get(TOKEN)` without requiring an explicit `c.get<Foo>(TOKEN)` everywhere.
 * It has no runtime representation and does not change assignability: any inversify
 * `ServiceIdentifier<T>` (string, symbol, class, or abstract class) still satisfies this
 * type, and this type still satisfies inversify's own `Container` methods.
 */
export type ServiceIdentifier<T> = InversifyServiceIdentifier<T> & {
  readonly __serviceType?: (value: T) => void
}

export const token = <T>(name: string): ServiceIdentifier<T> => Symbol(name) as ServiceIdentifier<T>

export { Container }
