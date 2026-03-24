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