const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Неверный логин или пароль',
  login_taken: 'Логин занят',
  weak_password: 'Минимум 8 символов',
  invalid_login: '3–32 символа: латиница, цифры, _ .',
  empty_name: 'Введите имя и фамилию',
  validation: 'Заполните все поля',
}

const FIELDS: Record<string, 'login' | 'password'> = {
  login_taken: 'login',
  invalid_login: 'login',
  weak_password: 'password',
}

export function messageFor(code: string): string {
  return MESSAGES[code] ?? 'Что-то пошло не так'
}

export function fieldFor(code: string): 'login' | 'password' | 'form' {
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
