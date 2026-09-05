import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { cinema } from './topics/cinema'
import { games } from './topics/games'
import { memes } from './topics/memes'
import { music } from './topics/music'
export const CORPUS: Partial<Record<Topic, TopicCorpus>> = { cinema, music, memes, games }
export const DIALOG_LINES: string[] = []
export type { TopicCorpus } from './schema'
