import { useEffect, useCallback } from 'react'

interface ShortcutHandlers {
  onSave?: () => void
  onDelete?: () => void
  onEscape?: () => void
  onUndo?: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Cmd+S / Ctrl+S: Save
      if (isMeta && e.key === 's') {
        e.preventDefault()
        handlers.onSave?.()
        return
      }

      // Cmd+Z / Ctrl+Z: Undo
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault()
          handlers.onUndo?.()
        }
        return
      }

      // Skip remaining shortcuts if user is in an input
      if (isInput) return

      // Delete / Backspace: Remove selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handlers.onDelete?.()
        return
      }

      // Escape: Close
      if (e.key === 'Escape') {
        handlers.onEscape?.()
        return
      }
    },
    [handlers]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
