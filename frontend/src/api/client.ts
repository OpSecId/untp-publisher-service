import { apiBaseUrl } from './baseUrl'
import { getAccessToken } from '../auth/storage'

export class ApiError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<Response> {
  const { skipAuth, ...rest } = init
  const base = apiBaseUrl()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`
  const headers = new Headers(rest.headers)
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  if (rest.body && typeof rest.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(url, { ...rest, headers })
}

export async function apiJson<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const res = await apiFetch(path, init)
  const text = await res.text()
  if (!res.ok) {
    let message = res.statusText || 'Request failed'
    try {
      const j = JSON.parse(text) as { detail?: unknown }
      if (j.detail !== undefined) {
        message = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
      }
    } catch {
      /* keep message */
    }
    throw new ApiError(message, res.status, text)
  }
  if (!text) return {} as T
  return JSON.parse(text) as T
}
