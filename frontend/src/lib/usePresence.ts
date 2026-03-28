import { useEffect, useRef, useState } from 'react'
import { sendPresenceHeartbeat } from './api'
import type { PresenceHeartbeatPayload } from './api'

const SESSION_ID_KEY = 'presence_session_id'
const TAB_ID_KEY = 'presence_tab_id'

const HEARTBEAT_INTERVAL = 12000 // 12 sec
const AFK_TIMEOUT = 60000 // 60 sec

type PresenceStatus = 'online' | 'afk'

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_ID_KEY, id)
  }
  return id
}

function getOrCreateTabId(): string {
  let id = sessionStorage.getItem(TAB_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(TAB_ID_KEY, id)
  }
  return id
}

export function usePresence() {
  const [status, setStatus] = useState<PresenceStatus>('online')

  // ✅ stable values (no refs → no lint errors)
  const [sessionId] = useState(() => getOrCreateSessionId())
  const [tabId] = useState(() => getOrCreateTabId())

  // ✅ refs only for timers
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const afkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ✅ latest heartbeat function (avoids stale closure)
  const sendHeartbeatRef = useRef<() => Promise<void>>(async () => {})

  // update heartbeat function when status changes
  useEffect(() => {
    sendHeartbeatRef.current = async () => {
      const payload: PresenceHeartbeatPayload = {
        session_id: sessionId,
        tab_id: tabId,
        status,
      }

      try {
        await sendPresenceHeartbeat(payload)
      } catch (error) {
        console.error('Presence heartbeat failed:', error)
      }
    }
  }, [status, sessionId, tabId])

  useEffect(() => {
    const scheduleAfkTimeout = () => {
      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current)
      }

      afkTimeoutRef.current = setTimeout(() => {
        setStatus('afk')
      }, AFK_TIMEOUT)
    }

    const handleActivity = () => {
      setStatus((prev) => (prev === 'online' ? prev : 'online'))
      scheduleAfkTimeout()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      }
    }

    // activity events
    const events: Array<keyof DocumentEventMap> = ['mousemove', 'keydown', 'click']

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    window.addEventListener('focus', handleActivity, true)
    document.addEventListener('visibilitychange', handleVisibilityChange, true)

    // initial state
    scheduleAfkTimeout()
    void sendHeartbeatRef.current()

    // heartbeat loop
    heartbeatIntervalRef.current = setInterval(() => {
      void sendHeartbeatRef.current()
    }, HEARTBEAT_INTERVAL)

    // cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })

      window.removeEventListener('focus', handleActivity, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange, true)

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current)
      }
    }
  }, [])

  return {
    status,
    sessionId,
    tabId,
  }
}