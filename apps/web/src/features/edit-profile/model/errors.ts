export type ProfileField = 'status' | 'bio' | 'city' | 'birthday' | 'screenName' | 'form'

const MESSAGES: Record<string, string> = {
  screen_name_taken: 'Короткое имя занято',
  screen_name_reserved: '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
  invalid_screen_name: '3–32 символа: латиница, цифры, _ . ; не начинается с id/club',
  status_too_long: 'Не длиннее 140 символов',
  bio_too_long: 'Не длиннее 2000 символов',
  invalid_city: 'Выберите город из списка',
  invalid_birthday: 'Неверная дата рождения',
}

const FIELDS: Record<string, ProfileField> = {
  screen_name_taken: 'screenName',
  screen_name_reserved: 'screenName',
  invalid_screen_name: 'screenName',
  status_too_long: 'status',
  bio_too_long: 'bio',
  invalid_city: 'city',
  invalid_birthday: 'birthday',
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Что-то пошло не так'
}

export function fieldFor(code: string): ProfileField {
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
