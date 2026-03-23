function Shimmer({ width, height, radius = 6, style = {} }) {
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
      borderTop: '1px solid #E4E6EB',
      borderBottom: '1px solid #E4E6EB',
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Shimmer width={40} height={40} radius={10} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <Shimmer width={120} height={12} />
          <Shimmer width={80} height={10} />
        </div>
        <Shimmer width={32} height={32} radius={7} />
      </div>

      {/* Content lines */}
      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Shimmer width="100%" height={13} />
        <Shimmer width="85%" height={13} />
        <Shimmer width="60%" height={13} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F0F2F5', margin: '12px 12px 0' }} />

      {/* Action row */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 10px 10px' }}>
        <Shimmer width="30%" height={30} radius={7} />
        <Shimmer width="30%" height={30} radius={7} />
        <Shimmer width="30%" height={30} radius={7} />
      </div>

      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}

export function SubjectSkeleton() {
  return (
    <div style={{
      background: 'white',
      borderTop: '1px solid #E4E6EB',
      borderBottom: '1px solid #E4E6EB',
      padding: '12px 12px',
      display: 'flex', alignItems: 'center', gap: 12,
      marginBottom: 6,
    }}>
      <Shimmer width={44} height={44} radius={11} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <Shimmer width="50%" height={13} />
        <Shimmer width="70%" height={11} />
      </div>
      <Shimmer width={60} height={32} radius={7} />
      <style>{`@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }`}</style>
    </div>
  )
}
