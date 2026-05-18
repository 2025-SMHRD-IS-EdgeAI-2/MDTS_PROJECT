import defaultAvatar from '../assets/CE.jpeg'

const PHOTO_PUBLIC_BASE = '/assets/photo/'

/**
 * Normalize raw avatar value from DB or local state and return a safe image URL.
 * 1) Prioritize explicit valid URLs and data/blob images.
 * 2) Fallback relative crew image names to /assets/photo/.
 * 3) Return default image when invalid or empty value.
 */
export function resolveAvatarUrl(rawAvatar) {
  if (typeof rawAvatar !== 'string') return defaultAvatar

  const trimmed = rawAvatar.trim()
  if (!trimmed) return defaultAvatar

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  const clean = trimmed.split('?')[0].split('#')[0]
  const normalized = clean.replace(/\\/g, '/')
  const fileName = normalized.split('/').pop()

  if (!fileName) return defaultAvatar

  if (fileName.startsWith('photo/')) {
    return `${PHOTO_PUBLIC_BASE}${fileName.slice('photo/'.length)}`
  }

  if (fileName.startsWith('assets/photo/')) {
    return `/${fileName}`
  }

  if (/^\d{1,3}$/.test(fileName)) {
    return `${PHOTO_PUBLIC_BASE}${fileName.padStart(3, '0')}.png`
  }

  if (/\.(png|jpe?g|webp|gif)$/i.test(fileName)) {
    return `${PHOTO_PUBLIC_BASE}${fileName}`
  }

  return defaultAvatar
}
