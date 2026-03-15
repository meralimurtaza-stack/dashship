import { useState, useEffect, type FC, type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  pageKey: string
}

const PageTransition: FC<PageTransitionProps> = ({ children, pageKey }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [currentKey, setCurrentKey] = useState(pageKey)
  const [content, setContent] = useState<ReactNode>(children)

  useEffect(() => {
    if (pageKey !== currentKey) {
      // Fade out, swap, fade in
      setIsVisible(false)
      const timer = setTimeout(() => {
        setContent(children)
        setCurrentKey(pageKey)
        requestAnimationFrame(() => setIsVisible(true))
      }, 100)
      return () => clearTimeout(timer)
    } else {
      // Initial mount
      requestAnimationFrame(() => setIsVisible(true))
    }
  }, [pageKey, children, currentKey])

  return (
    <div
      className="h-full transition-opacity duration-150 ease-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {content}
    </div>
  )
}

export default PageTransition
