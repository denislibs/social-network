export type CommunityField = 'name' | 'screenName' | 'topic' | 'description' | 'form'

const MESSAGES: Record<string, string> = {
  invalid_community_name: 'От 2 до 120 символов',
  screen_name_taken: 'Короткое имя занято',
  screen_name_reserved: '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
  invalid_screen_name: '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
}

const FIELDS: Record<string, CommunityField> = {
  invalid_community_name: 'name',
  screen_name_taken: 'screenName',
  screen_name_reserved: 'screenName',
  invalid_screen_name: 'screenName',
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Что-то пошло не так'
}

export function fieldFor(code: string): CommunityField {
  return FIELDS[code] ?? 'form'
}

export function codeOf(e: unknown): string {
  return typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
    ? (e as { code: string }).code
    : 'unknown'
}
