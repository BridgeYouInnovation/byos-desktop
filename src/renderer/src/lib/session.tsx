import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { TenantContextDTO } from '@core/dto'

type SessionValue = {
  loading: boolean
  context: TenantContextDTO | null
  setContext: (ctx: TenantContextDTO | null) => void
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<TenantContextDTO | null>(null)

  // Restore the persisted session on boot (works offline).
  useEffect(() => {
    window.byos.auth
      .context()
      .then(setContext)
      .finally(() => setLoading(false))
  }, [])

  const logout = useCallback(async () => {
    await window.byos.auth.logout()
    setContext(null)
  }, [])

  return (
    <SessionContext.Provider value={{ loading, context, setContext, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
