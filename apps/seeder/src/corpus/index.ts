import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { auto } from './topics/auto'
import { cinema } from './topics/cinema'
import { food } from './topics/food'
import { games } from './topics/games'
import { itTopic } from './topics/it'
import { memes } from './topics/memes'
import { music } from './topics/music'
import { science } from './topics/science'
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
  food,
  science,
  auto,
}
export const DIALOG_LINES: string[] = []
export type { TopicCorpus } from './schema'
