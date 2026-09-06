import { describe, expect, it } from 'vitest'
import { pluralRu } from './plural'

const FORMS: [string, string, string] = ['участник', 'участника', 'участников']

describe('pluralRu', () => {
  it.each([
    [1, 'участник'],
    [21, 'участник'],
    [101, 'участник'],
    [2, 'участника'],
    [3, 'участника'],
    [4, 'участника'],
    [22, 'участника'],
    [0, 'участников'],
    [5, 'участников'],
    [11, 'участников'],
    [12, 'участников'],
    [14, 'участников'],
    [111, 'участников'],
  ])('%i -> %s', (n, want) => {
    expect(pluralRu(n, FORMS)).toBe(want)
  })
})
