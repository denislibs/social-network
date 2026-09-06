const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/**
 * Formats an ISO timestamp as a short Russian relative time, VK-style:
 * "только что" / "N мин назад" / "N ч назад" / "вчера" / an absolute date
 * for anything older. Uses UTC getters (not local time) so the boundary
 * between "yesterday" and a plain date doesn't shift with the viewer's
 * timezone or the machine running the tests.
 */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime()
  const diff = now - then

  if (diff < MINUTE) return 'только что'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} мин назад`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} ч назад`
  if (Math.floor(diff / DAY) === 1) return 'вчера'

  const d = new Date(then)
  const day = d.getUTCDate()
  const month = MONTHS_GENITIVE[d.getUTCMonth()]
  const nowDate = new Date(now)
  return d.getUTCFullYear() === nowDate.getUTCFullYear()
    ? `${day} ${month}`
    : `${day} ${month} ${d.getUTCFullYear()}`
}
