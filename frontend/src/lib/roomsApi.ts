import { apiRequest } from './api'
import type { Room, CreateRoomPayload, RoomBan } from '../types/room'

export interface User {
  id: number
  username: string
  email: string
}

export interface JoinRoomResponse {
  detail: string
  joined: boolean
  created: boolean
  role: 'owner' | 'member'
}

export interface LeaveRoomResponse {
  detail: string
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me/')
}

export async function getPublicRooms(search?: string): Promise<Room[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  return apiRequest<Room[]>(`/rooms/${params}`)
}

export async function getMyRooms(): Promise<Room[]> {
  return apiRequest<Room[]>('/rooms/my/')
}

export async function getRoomById(id: number): Promise<Room> {
  return apiRequest<Room>(`/rooms/${id}/`)
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  return apiRequest<Room>('/rooms/create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function joinRoom(id: number): Promise<JoinRoomResponse> {
  return apiRequest<JoinRoomResponse>(`/rooms/${id}/join/`, {
    method: 'POST',
  })
}
export async function banRoomMember(
  roomId: number,
  userId: number,
  reason?: string
): Promise<RoomBan> {
  return apiRequest<RoomBan>(`/rooms/${roomId}/ban/${userId}/`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? '' }),
  })
}

export async function removeRoomMember(
  roomId: number,
  userId: number,
  reason?: string
): Promise<RoomBan> {
  return apiRequest<RoomBan>(`/rooms/${roomId}/members/${userId}/`, {
    method: 'DELETE',
    body: JSON.stringify({ reason: reason ?? '' }),
  })
}

export async function getRoomBannedUsers(roomId: number): Promise<RoomBan[]> {
  return apiRequest<RoomBan[]>(`/rooms/${roomId}/bans/`)
}

export async function unbanRoomUser(roomId: number, userId: number): Promise<void> {
  return apiRequest<void>(`/rooms/${roomId}/bans/${userId}/`, {
    method: 'DELETE',
  })
}

export async function deleteRoom(roomId: number): Promise<void> {
  return apiRequest<void>(`/rooms/${roomId}/`, {
    method: 'DELETE',
  })
}
export async function leaveRoom(id: number): Promise<LeaveRoomResponse> {
  return apiRequest<LeaveRoomResponse>(`/rooms/${id}/leave/`, {
    method: 'POST',
  })
}