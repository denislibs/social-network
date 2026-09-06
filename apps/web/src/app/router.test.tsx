import { matchRoutes } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './router'

/** `matchRoutes` resolves the route tree by path pattern without rendering anything, so this
 * verifies routing precedence directly: react-router ranks a static segment (`/edit`, `/search`)
 * above a dynamic one (`/:handle`) regardless of declaration order, but a regression that moved
 * `/:handle` above them, or a naming collision, would only show up at runtime otherwise. */
function leafPath(pathname: string): string | undefined {
  const matches = matchRoutes(routes, pathname)
  return matches?.at(-1)?.route.path
}

describe('router precedence', () => {
  it('/edit matches the static edit-profile route, not /:handle', () => {
    expect(leafPath('/edit')).toBe('/edit')
  })

  it('/search matches the static search route, not /:handle', () => {
    expect(leafPath('/search')).toBe('/search')
  })

  it('an arbitrary handle still falls through to /:handle', () => {
    expect(leafPath('/some_user')).toBe('/:handle')
  })

  it('/communities still matches its own static route', () => {
    expect(leafPath('/communities')).toBe('/communities')
  })
})
