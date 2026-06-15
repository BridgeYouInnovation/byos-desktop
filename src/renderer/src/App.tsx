import { useEffect, useState } from 'react'
import { I18nProvider } from './lib/i18n'
import { SessionProvider, useSession } from './lib/session'
import Login from './screens/Login'
import Workspace from './screens/Workspace'

function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

function Root() {
  const { loading, context } = useSession()
  const online = useOnline()

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted">Loading…</div>
    )
  }
  return context ? <Workspace online={online} /> : <Login online={online} />
}

export default function App() {
  return (
    <I18nProvider>
      <SessionProvider>
        <Root />
      </SessionProvider>
    </I18nProvider>
  )
}
