import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../auth/storage'

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const token = getAccessToken()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
