import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { cinema } from './topics/cinema'
import { games } from './topics/games'
import { itTopic } from './topics/it'
import { memes } from './topics/memes'
import { music } from './topics/music'
import { sport } from './topics/sport'
import { travel } from './topics/travel'
export const CORPUS: Partial<Record<Topic, TopicCorpus>> = {
  cinema,
  music,
  memes,
  games,
  it: itTopic,
  sport,
  travel,
}
export const DIALOG_LINES: string[] = []
export type { TopicCorpus } from './schema'
