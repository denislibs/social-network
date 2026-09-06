const MESSAGES: Record<string, string> = {
  last_admin: 'Назначьте другого администратора перед выходом',
  community_not_found: 'Сообщество не найдено',
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
