import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { PublisherSession } from '../api/types'

export function usePublisherSession() {
  const [session, setSession] = useState<PublisherSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await apiJson<PublisherSession>('/publisher/session')
      setSession(s)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError('Session expired or invalid. Sign in again.')
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load session')
      }
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { session, loading, error, reload }
}
