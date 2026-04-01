const RED  = '#C0392B'
const BLUE = '#1A5276'

export default function MaintenanceScreen({ message }) {
  const defaultMsg = 'The app is undergoing maintenance. Please check back shortly.'
  const displayMsg = message && message.trim() ? message : defaultMsg

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F2F5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
      }}>

        {/* Gradient header */}
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
          padding: '40px 28px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Dot texture */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}/>

          {/* Icon */}
          <div style={{
            width: 72, height: 72,
            borderRadius: 20,
            background: 'rgba(255,255,255,0.18)',
            border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 36,
            position: 'relative',
          }}>
            🔧
          </div>

          <h1 style={{
            margin: '0 0 8px',
            fontFamily: '"Bricolage Grotesque", system-ui',
            fontWeight: 800,
            fontSize: 24,
            color: 'white',
            letterSpacing: '-0.5px',
          }}>
            Under Maintenance
          </h1>

          <p style={{
            margin: 0,
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 13,
            color: 'rgba(255,255,255,0.7)',
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            CSB · Computer Science Board
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 28px 32px' }}>

          {/* Message card */}
          <div style={{
            background: '#F7F8FA',
            border: '1px solid #E4E6EB',
            borderLeft: `4px solid ${RED}`,
            borderRadius: '0 10px 10px 0',
            padding: '14px 16px',
            marginBottom: 24,
          }}>
            <p style={{
              margin: 0,
              fontFamily: '"Instrument Sans", system-ui',
              fontSize: 14.5,
              color: '#1c1e21',
              lineHeight: 1.6,
              fontWeight: 500,
            }}>
              {displayMsg}
            </p>
          </div>

          {/* Status row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: '#FFF8E1',
            borderRadius: 12,
            border: '1px solid #FFE082',
            marginBottom: 20,
          }}>
            <div style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: '#F59E0B',
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(245,158,11,0.25)',
              animation: 'pulse 2s ease-in-out infinite',
            }}/>
            <span style={{
              fontFamily: '"Instrument Sans", system-ui',
              fontWeight: 700,
              fontSize: 13,
              color: '#92400E',
            }}>
              We'll be back soon
            </span>
          </div>

          <p style={{
            margin: 0,
            textAlign: 'center',
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 12,
            color: '#BCC0C4',
            lineHeight: 1.6,
          }}>
            Contact your administrator or class moderator if this continues longer than expected.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #F0F2F5',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 22, height: 22,
            borderRadius: 6,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          </div>
          {/* Looks like plain text — secretly a link back to login */}
          <a
            href="/auth"
            style={{
              fontFamily: '"Instrument Sans", system-ui',
              fontSize: 12,
              fontWeight: 600,
              color: '#BCC0C4',
              textDecoration: 'none',
              cursor: 'default',
            }}
          >
            CSB Platform
          </a>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
