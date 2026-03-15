import { type FC } from 'react'

interface ContextualHintProps {
  message: string
}

const ContextualHint: FC<ContextualHintProps> = ({ message }) => {
  if (!message) return null

  return (
    <div className="h-8 flex items-center justify-center bg-ds-bg border-b border-ds-border shrink-0">
      <p className="font-mono text-[10px] text-ds-text-dim tracking-wide">
        {message}
      </p>
    </div>
  )
}

export default ContextualHint
