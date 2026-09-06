import { useState } from 'react'
import type { UserCellDto } from '@/entities/user'

function matches(user: UserCellDto, needle: string): boolean {
  return `${user.firstName} ${user.lastName}`.toLowerCase().includes(needle)
}

/**
 * vk.ru's «Введите запрос» box above the friends list. It filters the pages already loaded, in
 * the browser — the friends endpoint has no search parameter, and the list is short enough that
 * narrowing what is on screen is what a user expects here. Global people search is a different
 * feature (`/search`).
 */
export function useFriendsFilter(items: UserCellDto[]): {
  query: string
  setQuery(query: string): void
  filtered: UserCellDto[]
} {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  return {
    query,
    setQuery,
    filtered: needle.length === 0 ? items : items.filter((user) => matches(user, needle)),
  }
}
