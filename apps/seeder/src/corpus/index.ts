import type { Topic } from '../topics'
import { DIALOG_LINES } from './dialogs'
import type { TopicCorpus } from './schema'
import { auto } from './topics/auto'
import { cinema } from './topics/cinema'
import { city } from './topics/city'
import { fashion } from './topics/fashion'
import { food } from './topics/food'
import { games } from './topics/games'
import { itTopic } from './topics/it'
import { memes } from './topics/memes'
import { music } from './topics/music'
import { science } from './topics/science'
import { sport } from './topics/sport'
import { travel } from './topics/travel'
export const CORPUS: Record<Topic, TopicCorpus> = {
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
  fashion,
  city,
}
export type { TopicCorpus } from './schema'
export { DIALOG_LINES }
