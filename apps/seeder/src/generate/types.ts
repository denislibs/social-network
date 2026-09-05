import type { Topic } from '../topics'

/** Fixed "now" for deterministic seeding — do not use Date.now() anywhere in generators. */
export const SEED_NOW = Date.parse('2026-09-05T12:00:00Z')

export type SeedConfig = { seed: number; scale: number; days: number }
export type Tier = 'star' | 'notable' | 'regular'
export type SeedUser = {
  id: number
  login: string
  firstName: string
  lastName: string
  screenName: string | null
  city: string
  birthday: string
  sex: 'male' | 'female'
  interests: Float32Array
  tier: Tier
  popularity: number
  createdAt: Date
  status: string | null
}
export type SeedCommunity = {
  id: number
  screenName: string
  name: string
  description: string
  topic: Topic
  popularity: number
  createdAt: Date
}
