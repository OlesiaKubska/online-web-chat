import { useEffect, useMemo, useRef, useState } from 'react'
import { sendPresenceHeartbeat, type PresenceHeartbeatPayload } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const SESSION_ID_KEY = 'presence_session_id'
const TAB_ID_KEY = 'presence_tab_id'
const TABS_STATE_PREFIX = 'presence_tabs_'

const HEARTBEAT_INTERVAL = 2000
const AFK_TIMEOUT = 60000
const TAB_STATE_HEARTBEAT_MS = 2000
const TAB_STATE_STALE_MS = 30000

type PresenceStatus = 'online' | 'afk'
type VisibilityState = 'visible' | 'hidden'

type TabState = {
  tabId: string
  status: PresenceStatus
  visibility: VisibilityState
  lastSeenMs: number
}

type TabsState = Record<string, TabState>

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

function getTabsStorageKey(sessionId: string): string {
  return `${TABS_STATE_PREFIX}${sessionId}`
}

function safeParseTabsState(raw: string | null): TabsState {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as TabsState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function getFreshTabs(tabs: TabsState, nowMs: number): TabsState {
  const fresh: TabsState = {}
  Object.values(tabs).forEach((tab) => {
    if (nowMs - tab.lastSeenMs <= TAB_STATE_STALE_MS) {
      fresh[tab.tabId] = tab
    }
  })
  return fresh
}

function computeGlobalStatus(tabs: TabsState): PresenceStatus {
  const values = Object.values(tabs)
  if (values.length === 0) {
    return 'afk'
  }
  const anyOnline = values.some((tab) => tab.status === 'online')
  return anyOnline ? 'online' : 'afk'
}

function electLeaderTabId(tabs: TabsState): string | null {
  const values = Object.values(tabs)
  if (values.length === 0) {
    return null
  }

  const visibleTabs = values.filter((tab) => tab.visibility === 'visible')
  const pool = visibleTabs.length > 0 ? visibleTabs : values

  const sorted = pool.sort((a, b) => a.tabId.localeCompare(b.tabId))
  return sorted[0]?.tabId ?? null
}

function postTabCloseSignal(sessionId: string, tabId: string) {
  const payload = JSON.stringify({ session_id: sessionId, tab_id: tabId })
  const endpoint = `${API_BASE_URL}/presence/tab-close/`

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
    }
  } catch {
    // Ignore best-effort beacon failures.
  }

  try {
    void fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
  } catch {
    // Ignore best-effort keepalive failures.
  }
}

export function usePresence() {
  const sessionId = useMemo(() => getOrCreateSessionId(), [])
  const tabId = useMemo(() => getOrCreateTabId(), [])
  const tabsStorageKey = useMemo(() => getTabsStorageKey(sessionId), [sessionId])

  const [status, setStatus] = useState<PresenceStatus>('online')

  const localStatusRef = useRef<PresenceStatus>('online')
  const isLeaderRef = useRef(false)
  const globalStatusRef = useRef<PresenceStatus>('online')

  const afkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const broadcastRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const sendHeartbeatNow = (presenceStatus: PresenceStatus) => {
      if (!isLeaderRef.current) {
        return
      }

      const payload: PresenceHeartbeatPayload = {
        session_id: sessionId,
        tab_id: tabId,
        status: presenceStatus,
      }

      void sendPresenceHeartbeat(payload).catch((error) => {
        console.error('Presence heartbeat failed:', error)
      })
    }

    const recomputeFromStorage = () => {
      const nowMs = Date.now()
      const tabs = safeParseTabsState(localStorage.getItem(tabsStorageKey))
      const freshTabs = getFreshTabs(tabs, nowMs)

      localStorage.setItem(tabsStorageKey, JSON.stringify(freshTabs))

      const globalStatus = computeGlobalStatus(freshTabs)
      globalStatusRef.current = globalStatus
      setStatus(globalStatus)

      const leaderTabId = electLeaderTabId(freshTabs)
      const wasLeader = isLeaderRef.current
      const isLeader = leaderTabId === tabId
      isLeaderRef.current = isLeader

      if (!wasLeader && isLeader) {
        sendHeartbeatNow(globalStatus)
      }
    }

    const upsertTabState = (sendImmediate = false) => {
      const nowMs = Date.now()
      const tabs = safeParseTabsState(localStorage.getItem(tabsStorageKey))
      const freshTabs = getFreshTabs(tabs, nowMs)

      freshTabs[tabId] = {
        tabId,
        status: localStatusRef.current,
        visibility: document.visibilityState === 'visible' ? 'visible' : 'hidden',
        lastSeenMs: nowMs,
      }

      localStorage.setItem(tabsStorageKey, JSON.stringify(freshTabs))
      broadcastRef.current?.postMessage({ type: 'presence-updated', tabId })
      recomputeFromStorage()

      if (sendImmediate) {
        sendHeartbeatNow(globalStatusRef.current)
      }
    }

    upsertTabState()

    tabsHeartbeatRef.current = setInterval(() => {
      upsertTabState()
    }, TAB_STATE_HEARTBEAT_MS)

    heartbeatIntervalRef.current = setInterval(() => {
      if (!isLeaderRef.current) {
        return
      }

      sendHeartbeatNow(globalStatusRef.current)
    }, HEARTBEAT_INTERVAL)

    const scheduleAfkTimeout = () => {
      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current)
      }

      afkTimeoutRef.current = setTimeout(() => {
        localStatusRef.current = 'afk'
        upsertTabState(true)
      }, AFK_TIMEOUT)
    }

    const handleActivity = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      const statusChanged = localStatusRef.current !== 'online'
      localStatusRef.current = 'online'
      upsertTabState(statusChanged)
      scheduleAfkTimeout()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleActivity()
      } else {
        // Hidden tabs should transition to AFK based on inactivity timeout, not immediately.
        upsertTabState()
      }
    }

    const cleanupTabState = () => {
      const nowMs = Date.now()
      const tabs = safeParseTabsState(localStorage.getItem(tabsStorageKey))
      const freshTabs = getFreshTabs(tabs, nowMs)
      delete freshTabs[tabId]

      localStorage.setItem(tabsStorageKey, JSON.stringify(freshTabs))
      broadcastRef.current?.postMessage({ type: 'presence-closed', tabId })

      postTabCloseSignal(sessionId, tabId)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === tabsStorageKey) {
        recomputeFromStorage()
      }
    }

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(`presence-${sessionId}`)
      broadcastRef.current = channel
      channel.onmessage = () => {
        recomputeFromStorage()
      }
    }

    const activityEvents: Array<keyof DocumentEventMap> = ['mousemove', 'keydown', 'click']
    activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, true)
    })

    window.addEventListener('focus', handleActivity, true)
    document.addEventListener('visibilitychange', handleVisibilityChange, true)
    window.addEventListener('beforeunload', cleanupTabState, true)
    window.addEventListener('pagehide', cleanupTabState, true)
    window.addEventListener('storage', handleStorage)

    scheduleAfkTimeout()

    return () => {
      activityEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity, true)
      })

      window.removeEventListener('focus', handleActivity, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange, true)
      window.removeEventListener('beforeunload', cleanupTabState, true)
      window.removeEventListener('pagehide', cleanupTabState, true)
      window.removeEventListener('storage', handleStorage)

      if (afkTimeoutRef.current) {
        clearTimeout(afkTimeoutRef.current)
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      if (tabsHeartbeatRef.current) {
        clearInterval(tabsHeartbeatRef.current)
      }

      broadcastRef.current?.close()
      broadcastRef.current = null

      cleanupTabState()
    }
  }, [sessionId, tabId, tabsStorageKey])

  return {
    status,
    sessionId,
    tabId,
  }
}
