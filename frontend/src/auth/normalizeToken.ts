/** Strip whitespace and optional leading `Bearer ` from pasted JWTs. */
export function normalizePortalAccessToken(raw: string): string {
  let s = raw.trim()
  if (/^bearer\s+/i.test(s)) {
    s = s.replace(/^bearer\s+/i, '').trim()
  }
  return s
}
