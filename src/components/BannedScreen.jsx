import { useAuth } from '../contexts/AuthContext'

const RED = '#C0392B'

export default function BannedScreen() {
  const { profile, signOut } = useAuth()

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
        maxWidth: 420,
        background: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.14)',
      }}>
        {/* Red header */}
        <div style={{
          background: `linear-gradient(135deg, #922B21, ${RED})`,
          padding: '36px 28px 28px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🚫</div>
          <h1 style={{
            margin: 0,
            fontFamily: '"Bricolage Grotesque", system-ui',
            fontWeight: 800, fontSize: 24, color: 'white',
          }}>
            Account Suspended
          </h1>
          <p style={{
            margin: '8px 0 0',
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 14, color: 'rgba(255,255,255,0.75)',
          }}>
            Your account has been suspended by an administrator.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px 28px' }}>
          {profile?.banned_reason && (
            <div style={{
              background: '#FFF5F5',
              border: '1px solid #F5B7B1',
              borderLeft: `3px solid ${RED}`,
              borderRadius: '0 8px 8px 0',
              padding: '12px 14px',
              marginBottom: 20,
            }}>
              <p style={{
                margin: '0 0 4px',
                fontFamily: '"Instrument Sans", system-ui',
                fontWeight: 700, fontSize: 12, color: RED,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Reason
              </p>
              <p style={{
                margin: 0,
                fontFamily: '"Instrument Sans", system-ui',
                fontSize: 14, color: '#1c1e21', lineHeight: 1.5,
              }}>
                {profile.banned_reason}
              </p>
            </div>
          )}

          <p style={{
            margin: '0 0 24px',
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 14, color: '#65676B', lineHeight: 1.6, textAlign: 'center',
          }}>
            If you believe this is a mistake, please contact an administrator or your class moderator directly.
          </p>

          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              background: RED,
              color: 'white',
              cursor: 'pointer',
              fontFamily: '"Instrument Sans", system-ui',
              fontWeight: 700, fontSize: 15,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#922B21'}
            onMouseLeave={e => e.currentTarget.style.background = RED}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
