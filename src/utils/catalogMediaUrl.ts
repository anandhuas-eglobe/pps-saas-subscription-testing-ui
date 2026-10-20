/** Use icon URLs as returned by the API (public S3/CDN HTTPS). */
export function resolveCatalogMediaUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) {
    return null
  }
  const trimmed = path.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  return trimmed
}
