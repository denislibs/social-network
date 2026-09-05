export const TOPICS = [
  'cinema',
  'music',
  'memes',
  'games',
  'it',
  'sport',
  'travel',
  'food',
  'science',
  'auto',
  'fashion',
  'city',
] as const
export type Topic = (typeof TOPICS)[number]
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
