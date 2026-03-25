import { apiRequest } from './api'
import type { Message, SendMessagePayload, UpdateMessagePayload } from '../types/message'

export async function getRoomMessages(
  roomId: number,
  cursor?: string
): Promise<Message[]> {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<Message[]>(`/rooms/${roomId}/messages/${params}`)
}

export async function sendMessage(
  roomId: number,
  payload: SendMessagePayload
): Promise<Message> {
  return apiRequest<Message>(`/rooms/${roomId}/messages/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function editMessage(
  messageId: number,
  payload: UpdateMessagePayload
): Promise<Message> {
  return apiRequest<Message>(`/rooms/messages/${messageId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteMessage(messageId: number): Promise<void> {
  return apiRequest<void>(`/rooms/messages/${messageId}/`, {
    method: 'DELETE',
  })
}