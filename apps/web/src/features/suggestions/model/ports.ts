import type { SuggestionDto } from '@/entities/user'
import type { ServiceIdentifier } from '@/shared/di'

export interface SuggestionsGateway {
  list(): Promise<SuggestionDto[]>
  hide(userId: number): Promise<void>
}

export const SUGGESTIONS_GATEWAY: ServiceIdentifier<SuggestionsGateway> =
  Symbol('SuggestionsGateway')
