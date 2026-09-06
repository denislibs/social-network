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
