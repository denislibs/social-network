import type { Topic } from '@vkc/contracts'

export type { Topic } from '@vkc/contracts'
export { TOPICS } from '@vkc/contracts'

export const TOPIC_TITLES: Record<Topic, string> = {
  cinema: 'Кино',
  music: 'Музыка',
  memes: 'Мемы',
  games: 'Игры',
  it: 'IT',
  sport: 'Спорт',
  travel: 'Путешествия',
  food: 'Еда',
  science: 'Наука',
  auto: 'Авто',
  fashion: 'Мода',
  city: 'Городские новости',
}
