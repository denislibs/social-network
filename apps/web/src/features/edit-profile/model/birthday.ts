/** `ProfilePatch.birthday` is an ISO `YYYY-MM-DD` string; VKUI's `DateInput` works with `Date`.
 * These convert between the two using local calendar fields (never UTC), so the date the user
 * picked/typed is exactly the date that round-trips back into the input. */

export function parseBirthday(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return undefined
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatBirthday(date: Date | null | undefined): string {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
