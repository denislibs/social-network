export type {
  Counters,
  HandleDto,
  Page,
  ProfileDto,
  Relation,
  SuggestionDto,
  UserCellDto,
  UserDto,
} from '@vkc/contracts'

export type ProfilePatch = {
  status?: string | null
  bio?: string | null
  city?: string | null
  birthday?: string | null
  screenName?: string | null
}
