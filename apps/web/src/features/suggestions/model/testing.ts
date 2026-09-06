import { vi } from 'vitest'
import { createTestContainer } from '@/shared/di'
import { SUGGESTIONS_GATEWAY, type SuggestionsGateway } from './ports'

/** Slice-internal test helper: import relatively from tests inside `features/suggestions`. */
export function fakeSuggestionsGateway(
  overrides: Partial<SuggestionsGateway> = {},
): SuggestionsGateway {
  return {
    list: vi.fn().mockResolvedValue([]),
    hide: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

export function suggestionsTestContainer(gateway: SuggestionsGateway) {
  const c = createTestContainer()
  c.bind(SUGGESTIONS_GATEWAY).toConstantValue(gateway)
  return c
}
