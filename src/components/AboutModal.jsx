import { X } from 'lucide-react'
import { APP_VERSION, APP_YEAR, APP_COHORT } from '../version'
import { useBackButton } from '../hooks/useBackButton'

const RED  = '#C0392B'
const BLUE = '#1A5276'

export default function AboutModal({ onClose }) {
  useBackButton(onClose)

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.55)',
          animation: 'fadeIn 0.18s ease',
        }}
      />

      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        width: 'calc(100% - 48px)', maxWidth: 360,
        background: 'var(--card-bg, white)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Gradient header */}
        <div style={{
          background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)`,
          padding: '28px 24px 24px',
          position: 'relative',
          textAlign: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} color="white" />
          </button>

          <div style={{
            width: 72, height: 72, borderRadius: 18,
            overflow: 'hidden', margin: '0 auto 12px',
            border: '3px solid rgba(255,255,255,0.35)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            <img src="/announce.png" alt="CSB" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <div style={{
            fontFamily: '"Bricolage Grotesque", system-ui',
            fontWeight: 800, fontSize: 32, color: 'white',
            letterSpacing: '-1px', lineHeight: 1,
          }}>CSB</div>
          <div style={{
            fontFamily: '"Instrument Sans", system-ui',
            fontWeight: 600, fontSize: 10.5,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '1.8px', textTransform: 'uppercase', marginTop: 4,
          }}>Computer Science Board</div>
        </div>

        {/* Info rows */}
        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <InfoRow label="Version" value={APP_VERSION} accent />
          <InfoRow label="Program" value={APP_COHORT} />
          <InfoRow label="Developer" value="Yaru" />
          <InfoRow label="Year" value={APP_YEAR} />

          <div style={{ height: 1, background: 'var(--border, #F0F2F5)', margin: '16px 0 14px' }} />

          <p style={{
            margin: 0, textAlign: 'center',
            fontFamily: '"Instrument Sans", system-ui',
            fontSize: 11.5, color: 'var(--text-muted, #BCC0C4)',
            lineHeight: 1.6,
          }}>
            Bug? Nah it's a Feature
            <br />All rights reserved © {APP_YEAR} Yaru
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: translate(-50%,-50%) scale(0.9) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
      `}</style>
    </>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid var(--border, #F0F2F5)',
    }}>
      <span style={{
        fontFamily: '"Instrument Sans", system-ui',
        fontWeight: 600, fontSize: 13.5,
        color: 'var(--text-secondary, #65676B)',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: '"Instrument Sans", system-ui',
        fontWeight: 700, fontSize: 13.5,
        color: accent ? '#C0392B' : 'var(--text-primary, #050505)',
      }}>
        {value}
      </span>
    </div>
  )
}
