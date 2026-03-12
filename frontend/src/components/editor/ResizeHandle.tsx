import { useCallback, useRef, type FC } from 'react'

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical'
  onResize: (delta: number) => void
}

const ResizeHandle: FC<ResizeHandleProps> = ({ direction, onResize }) => {
  const startPos = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY

      const handleMove = (ev: PointerEvent) => {
        const current = direction === 'horizontal' ? ev.clientX : ev.clientY
        const delta = current - startPos.current
        startPos.current = current
        onResize(delta)
      }

      const handleUp = () => {
        el.removeEventListener('pointermove', handleMove)
        el.removeEventListener('pointerup', handleUp)
      }

      el.addEventListener('pointermove', handleMove)
      el.addEventListener('pointerup', handleUp)
    },
    [direction, onResize]
  )

  const isH = direction === 'horizontal'

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`
        shrink-0 relative group
        ${isH ? 'w-[5px] cursor-col-resize' : 'h-[5px] cursor-row-resize'}
      `}
    >
      <div
        className={`
          absolute bg-gray-200 group-hover:bg-accent group-active:bg-accent
          transition-colors duration-150
          ${isH ? 'w-px h-full left-1/2 -translate-x-1/2' : 'h-px w-full top-1/2 -translate-y-1/2'}
        `}
      />
    </div>
  )
}

export default ResizeHandle
