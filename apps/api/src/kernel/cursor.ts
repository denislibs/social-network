import { ValidationError } from './errors'

export type CursorKey = { createdAt: Date; id: number }
export const PAGE_SIZE = 20

export function encodeCursor(k: CursorKey): string {
  return Buffer.from(`${k.createdAt.toISOString()}|${k.id}`).toString('base64url')
}

export function decodeCursor(raw: string | undefined): CursorKey | null {
  if (raw === undefined || raw === '') return null
  let text: string
  try {
    text = Buffer.from(raw, 'base64url').toString('utf8')
  } catch {
    throw new ValidationError('bad_cursor', 'Malformed cursor')
  }
  const [iso, id] = text.split('|')
  const createdAt = new Date(iso ?? '')
  const n = Number(id)
  if (!iso || Number.isNaN(createdAt.getTime()) || !Number.isInteger(n))
    throw new ValidationError('bad_cursor', 'Malformed cursor')
  return { createdAt, id: n }
}
