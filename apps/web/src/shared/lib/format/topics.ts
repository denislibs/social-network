import type { Topic } from '@vkc/contracts'

const LABELS: Record<Topic, string> = {
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
  city: 'Город',
}

export function topicLabel(topic: Topic): string {
  return LABELS[topic]
}
