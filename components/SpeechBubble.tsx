'use client'

import { useEffect, useState } from 'react'

interface SpeechBubbleProps {
  agentName: string
  message: string
  visible: boolean
}

export default function SpeechBubble({ agentName, message, visible }: SpeechBubbleProps) {
  const [show, setShow] = useState(visible)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 4000)
      return () => clearTimeout(timer)
    } else {
      setShow(false)
    }
  }, [visible, message])

  if (!show) return null

  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 }}
    >
      <div
        className="pixel-text text-pp-text px-2 py-1 rounded"
        style={{
          background: '#12121F',
          border: '1px solid #1E1E3A',
          fontSize: '8px',
          whiteSpace: 'nowrap',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span className="text-pp-gold mr-1">{agentName}:</span>
        {message}
      </div>
      {/* Tail */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '4px solid #1E1E3A',
          margin: '0 auto',
        }}
      />
    </div>
  )
}
