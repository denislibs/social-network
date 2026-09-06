import { TOPICS } from '@vkc/contracts'
import { describe, expect, it } from 'vitest'
import { topicLabel } from './topics'

describe('topicLabel', () => {
  it('has a non-empty Russian label for every topic', () => {
    for (const topic of TOPICS) {
      expect(topicLabel(topic)).toMatch(/\S/)
    }
  })

  it('labels a couple of known topics', () => {
    expect(topicLabel('it')).toBe('IT')
    expect(topicLabel('cinema')).toBe('Кино')
  })
})
