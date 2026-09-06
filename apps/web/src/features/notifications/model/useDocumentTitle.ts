import { useEffect } from 'react'

/** Mirrors unread notifications in the tab title, VK-style: `(3) ВКлон`, or plain `ВКлон` at 0. */
export function useDocumentTitle(unread: number): void {
  useEffect(() => {
    document.title = unread > 0 ? `(${unread}) ВКлон` : 'ВКлон'
    return () => {
      document.title = 'ВКлон'
    }
  }, [unread])
}
