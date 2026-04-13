import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiJson } from '../api/client'
import { setAccessToken } from '../auth/storage'
import type { PublisherSession } from '../api/types'

export function usePublisherSession() {
  const navigate = useNavigate()
  const [session, setSession] = useState<PublisherSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    async (opts?: { silent?: boolean }): Promise<boolean> => {
      const silent = Boolean(opts?.silent)
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const s = await apiJson<PublisherSession>('/publisher/session')
        setSession(s)
        return true
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setSession(null)
          setAccessToken(null)
          navigate('/login', { replace: true })
          return false
        }
        if (silent) {
          const err = e instanceof Error ? e : new Error('Failed to load session')
          throw err
        }
        setSession(null)
        setError(e instanceof Error ? e.message : 'Failed to load session')
        return false
      } finally {
        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [navigate],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  return { session, loading, refreshing, error, reload }
}
