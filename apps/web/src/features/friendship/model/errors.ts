const MESSAGES: Record<string, string> = {
  self_friendship: 'Нельзя добавить себя в друзья',
  request_cooldown: 'Заявку можно повторить через сутки',
  not_addressee: 'Только адресат может ответить на заявку',
  friendship_not_found: 'Заявка уже недействительна',
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Что-то пошло не так'
}

export function codeOf(e: unknown): string {
  return typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
    ? (e as { code: string }).code
    : 'unknown'
}
