import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiJson } from '../api/client'
import { setAccessToken } from '../auth/storage'
import type { PublisherSession } from '../api/types'

export function usePublisherSession() {
  const navigate = useNavigate()
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
      setSession(null)
      if (e instanceof ApiError && e.status === 403) {
        setAccessToken(null)
        navigate('/login', { replace: true })
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    void reload()
  }, [reload])

  return { session, loading, error, reload }
}
