function Shimmer({ width, height, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius, flexShrink: 0,
      background: 'linear-gradient(90deg, #F0F2F5 25%, #E8EAED 50%, #F0F2F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s ease-in-out infinite',
      ...style,
    }} />
  )
}

export function PostSkeleton() {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      border: '1px solid #E4E6EB',
      overflow: 'hidden',
      marginBottom: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shimmer width={42} height={42} radius={12} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <Shimmer width={130} height={13} />
          <Shimmer width={80} height={11} />
        </div>
        <Shimmer width={34} height={34} radius={8} />
      </div>
      {/* Content */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Shimmer width="100%" height={13} />
        <Shimmer width="88%" height={13} />
        <Shimmer width="65%" height={13} />
      </div>
      {/* Divider */}
      <div style={{ height: 1, background: '#F0F2F5', margin: '14px 14px 0' }} />
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px 12px' }}>
        <Shimmer width="30%" height={32} radius={8} />
        <Shimmer width="30%" height={32} radius={8} />
        <Shimmer width="30%" height={32} radius={8} />
      </div>
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}

export function SubjectSkeleton() {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      border: '1px solid #E4E6EB',
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 6,
      boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    }}>
      <Shimmer width={44} height={44} radius={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Shimmer width="50%" height={14} />
        <Shimmer width="72%" height={11} />
      </div>
      <Shimmer width={64} height={34} radius={8} />
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}
