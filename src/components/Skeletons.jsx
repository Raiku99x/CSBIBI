function Shimmer({ width, height, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, #F0F2F5 25%, #E4E6EB 50%, #F0F2F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      flexShrink: 0,
      ...style,
    }} />
  )
}

export function PostSkeleton() {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid #DADDE1',
      padding: 16, marginBottom: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Shimmer width={40} height={40} radius={20} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Shimmer width={120} height={13} />
          <Shimmer width={80} height={11} />
        </div>
      </div>
      {/* Lines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer width="100%" height={13} />
        <Shimmer width="80%" height={13} />
        <Shimmer width="60%" height={13} />
      </div>
      {/* Action row */}
      <div style={{ height: 1, background: '#E4E6EB', margin: '14px 0 10px' }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Shimmer width={80} height={32} radius={8} />
        <Shimmer width={80} height={32} radius={8} />
        <Shimmer width={80} height={32} radius={8} />
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}

export function SubjectSkeleton() {
  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid #DADDE1',
      padding: 16, marginBottom: 8,
      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shimmer width={40} height={40} radius={10} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Shimmer width="55%" height={14} />
          <Shimmer width="75%" height={11} />
        </div>
        <Shimmer width={56} height={32} radius={8} />
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}
