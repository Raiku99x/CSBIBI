// Shared dicebear avatar utility — single source of truth
// Previously copy-pasted across 8+ files with slightly different AVATAR_HEX arrays,
// causing inconsistent avatar colors for the same user across different views.

const AVATAR_HEX = [
  '0D7377','0A5C60','3D5166','4A6070','2D6A4F',
  '3A6EA5','2E5F8A','1A5276','2C3E50','7A5C42',
  '8A6A50','8A4A4B','7A3D3E','647A3A','596B32',
  '1A7A80','156870','3A4F70','2E4260','7A3A35',
  '6A2E2A','156A6E','0F5F63','922B21','C0392B',
]

/**
 * Returns a deterministic Dicebear initials avatar URL for a given name.
 * The colour is derived from the first character so the same user always
 * gets the same avatar colour regardless of which component renders it.
 */
export function dicebearUrl(name = '') {
  const c = (name.trim()[0] || 'A').toUpperCase()
  const hex = AVATAR_HEX[Math.max(0, c.charCodeAt(0) - 65) % AVATAR_HEX.length]
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'U')}&backgroundColor=${hex}&textColor=ffffff`
}
