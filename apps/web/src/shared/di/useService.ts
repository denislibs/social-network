import { useContext } from 'react'
import type { ServiceIdentifier } from './container'
import { DiContext } from './DiProvider'

export function useService<T>(id: ServiceIdentifier<T>): T {
  const container = useContext(DiContext)
  if (!container) throw new Error('useService called outside DiProvider')
  if (!container.isBound(id)) throw new Error(`No binding for ${String(id)}`)
  return container.get(id)
}
