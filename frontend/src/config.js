const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  '/api'

export const getAssetUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return path.startsWith('/') ? path : `/${path}`
}

export { API_BASE_URL }
