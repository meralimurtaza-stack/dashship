import { type FC, useState, useEffect } from 'react'

/**
 * GeneratingOverlay — Full-screen loading animation shown while Claude
 * generates the dashboard JSX. Captain-themed with a sailing boat animation.
 */

const MESSAGES = [
  'Captain is charting the course…',
  'Plotting your KPIs on the map…',
  'Hoisting the sails…',
  'Navigating through the data…',
  'Assembling the crew of charts…',
  'Anchoring the insights…',
  'Almost ready to set sail…',
]

const GeneratingOverlay: FC = () => {
  const [msgIndex, setMsgIndex] = useState(0)
  const [fade, setFade] = useState(true)

  // Cycle through messages every 3s with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setMsgIndex(prev => (prev + 1) % MESSAGES.length)
        setFade(true)
      }, 300)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ECEAE4',
        gap: 32,
      }}
    >
      {/* Boat animation */}
      <div style={{ position: 'relative', width: 200, height: 140 }}>
        {/* Ocean waves */}
        <svg
          viewBox="0 0 200 40"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: 200,
            height: 40,
          }}
        >
          <path
            d="M0 20 Q25 10 50 20 Q75 30 100 20 Q125 10 150 20 Q175 30 200 20 L200 40 L0 40Z"
            fill="#1C3360"
            fillOpacity={0.12}
          >
            <animate
              attributeName="d"
              dur="3s"
              repeatCount="indefinite"
              values="
                M0 20 Q25 10 50 20 Q75 30 100 20 Q125 10 150 20 Q175 30 200 20 L200 40 L0 40Z;
                M0 20 Q25 30 50 20 Q75 10 100 20 Q125 30 150 20 Q175 10 200 20 L200 40 L0 40Z;
                M0 20 Q25 10 50 20 Q75 30 100 20 Q125 10 150 20 Q175 30 200 20 L200 40 L0 40Z
              "
            />
          </path>
          <path
            d="M0 25 Q25 18 50 25 Q75 32 100 25 Q125 18 150 25 Q175 32 200 25 L200 40 L0 40Z"
            fill="#1C3360"
            fillOpacity={0.08}
          >
            <animate
              attributeName="d"
              dur="2.5s"
              repeatCount="indefinite"
              values="
                M0 25 Q25 18 50 25 Q75 32 100 25 Q125 18 150 25 Q175 32 200 25 L200 40 L0 40Z;
                M0 25 Q25 32 50 25 Q75 18 100 25 Q125 32 150 25 Q175 18 200 25 L200 40 L0 40Z;
                M0 25 Q25 18 50 25 Q75 32 100 25 Q125 18 150 25 Q175 32 200 25 L200 40 L0 40Z
              "
            />
          </path>
        </svg>

        {/* Boat */}
        <svg
          viewBox="0 0 80 90"
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 90,
          }}
        >
          {/* Mast */}
          <line x1="40" y1="8" x2="40" y2="62" stroke="#1C3360" strokeWidth="2" />

          {/* Sail */}
          <path
            d="M42 12 L42 55 L68 48Z"
            fill="#C8963E"
            fillOpacity={0.7}
          >
            <animate
              attributeName="d"
              dur="2s"
              repeatCount="indefinite"
              values="
                M42 12 L42 55 L68 48Z;
                M42 12 L42 55 L64 46Z;
                M42 12 L42 55 L68 48Z
              "
            />
          </path>

          {/* Small sail */}
          <path
            d="M38 18 L38 50 L18 44Z"
            fill="#1C3360"
            fillOpacity={0.15}
          >
            <animate
              attributeName="d"
              dur="2.2s"
              repeatCount="indefinite"
              values="
                M38 18 L38 50 L18 44Z;
                M38 18 L38 50 L22 46Z;
                M38 18 L38 50 L18 44Z
              "
            />
          </path>

          {/* Flag */}
          <path
            d="M40 8 L54 13 L40 18Z"
            fill="#C8963E"
          >
            <animate
              attributeName="d"
              dur="1.5s"
              repeatCount="indefinite"
              values="
                M40 8 L54 13 L40 18Z;
                M40 8 L52 14 L40 18Z;
                M40 8 L54 13 L40 18Z
              "
            />
          </path>

          {/* Hull */}
          <path
            d="M12 62 L68 62 L60 76 L20 76Z"
            fill="#1C3360"
          />

          {/* Hull stripe */}
          <line x1="18" y1="68" x2="62" y2="68" stroke="#C8963E" strokeWidth="1.5" strokeOpacity={0.6} />

          {/* Whole boat rocks */}
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-3 40 62;3 40 62;-3 40 62"
            dur="3s"
            repeatCount="indefinite"
          />
        </svg>
      </div>

      {/* Message */}
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 13,
            fontWeight: 500,
            color: '#1C3360',
            letterSpacing: '0.02em',
            opacity: fade ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
        >
          {MESSAGES[msgIndex]}
        </p>
        <p
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 12,
            color: '#A19D94',
            marginTop: 8,
          }}
        >
          This usually takes 15–30 seconds
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              backgroundColor: '#1C3360',
              opacity: 0.2,
              animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

export default GeneratingOverlay
