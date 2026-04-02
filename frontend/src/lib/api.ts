import type { MessageAttachment } from "../types/room"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function extractErrorMessage(data: unknown): string {
  if (!data) return 'Unknown error'

  if (typeof data === 'string') return data

  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>

    if (typeof obj.detail === 'string') return obj.detail

    const firstValue = Object.values(obj)[0]
    if (Array.isArray(firstValue) && typeof firstValue[0] === 'string') {
      return firstValue[0]
    }

    if (typeof firstValue === 'string') {
      return firstValue
    }
  }

  return 'Request failed'
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  const data = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(data) || `HTTP ${response.status}`
    )
  }

  return data as T
}

export interface PresenceHeartbeatPayload {
  session_id: string
  tab_id: string
  status: 'online' | 'afk'
}

export type UserPresenceStatus = 'online' | 'afk' | 'offline'

export interface PresenceHeartbeatResponse {
  user_id: number
  status: UserPresenceStatus
}

export interface UserPresenceResponse {
  user_id: number
  status: UserPresenceStatus
}

export async function sendPresenceHeartbeat(payload: PresenceHeartbeatPayload): Promise<PresenceHeartbeatResponse> {
  return apiRequest<PresenceHeartbeatResponse>('/presence/heartbeat/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getUsersPresence(userIds: number[]): Promise<UserPresenceResponse[]> {
  if (userIds.length === 0) {
    return []
  }

  const ids = Array.from(new Set(userIds)).join(',')
  return apiRequest<UserPresenceResponse[]>(`/presence/users/?ids=${encodeURIComponent(ids)}`)
}

export async function uploadMessageAttachment(
  messageId: number,
  file: File,
  comment = ''
): Promise<MessageAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('comment', comment)

  const response = await fetch(`${API_BASE_URL}/room-messages/${messageId}/attachments/`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(response.status, extractErrorMessage(data))
  }

  return data
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthUserPayload {
  id: number
  username: string
  email: string
}

export async function login(payload: LoginPayload): Promise<{ message: string; user: AuthUserPayload }> {
  return apiRequest<{ message: string; user: AuthUserPayload }>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
}

export async function register(payload: RegisterPayload): Promise<AuthUserPayload> {
  return apiRequest<AuthUserPayload>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface PasswordResetRequestResponse {
  message: string
  reset?: {
    uid: string
    token: string
  }
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResponse> {
  return apiRequest<PasswordResetRequestResponse>('/auth/password-reset/request/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export interface PasswordResetConfirmPayload {
  uid: string
  token: string
  new_password: string
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/password-reset/confirm/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface DeleteAccountPayload {
  current_password?: string
}

export async function deleteAccount(payload: DeleteAccountPayload): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/delete-account/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export interface ActiveSession {
  session_key: string
  expires_at: string
  is_current: boolean
  ip_address: string
  user_agent: string
}

export async function getActiveSessions(): Promise<ActiveSession[]> {
  return apiRequest<ActiveSession[]>('/auth/sessions/')
}

export async function revokeSession(sessionKey: string): Promise<{ message: string; revoked_current: boolean }> {
  return apiRequest<{ message: string; revoked_current: boolean }>('/auth/sessions/revoke/', {
    method: 'POST',
    body: JSON.stringify({ session_key: sessionKey }),
  })
}
