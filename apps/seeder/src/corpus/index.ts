import type { Topic } from '../topics'
import type { TopicCorpus } from './schema'
import { cinema } from './topics/cinema'
export const CORPUS: Partial<Record<Topic, TopicCorpus>> = { cinema }
export const DIALOG_LINES: string[] = []
export type { TopicCorpus } from './schema'
