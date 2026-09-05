import type { Topic } from '../topics'
export type TopicCorpus = {
  topic: Topic
  communities: { name: string; description: string }[]
  posts: string[]
  personalPosts: string[]
  comments: string[]
  openers: string[]
  closers: string[]
  hashtags: string[]
}
export const CORPUS_MIN = {
  communities: 60,
  posts: 120,
  personalPosts: 15,
  comments: 60,
  openers: 12,
  closers: 12,
  hashtags: 20,
} as const
