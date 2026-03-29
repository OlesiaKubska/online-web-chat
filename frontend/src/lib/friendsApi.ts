import { apiRequest } from './api'
import type { Friend, FriendRequest, SendFriendRequestPayload } from '../types/friends'

export async function getFriends(): Promise<Friend[]> {
  return apiRequest<Friend[]>('/friends/')
}

export async function getIncomingFriendRequests(): Promise<FriendRequest[]> {
  return apiRequest<FriendRequest[]>('/friends/requests/incoming/')
}

export async function getOutgoingFriendRequests(): Promise<FriendRequest[]> {
  return apiRequest<FriendRequest[]>('/friends/requests/outgoing/')
}

export async function sendFriendRequestByUsername(
  payload: SendFriendRequestPayload
): Promise<FriendRequest> {
  return apiRequest<FriendRequest>('/friends/requests/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function acceptFriendRequest(requestId: number): Promise<FriendRequest> {
  return apiRequest<FriendRequest>(`/friends/requests/${requestId}/accept/`, {
    method: 'POST',
  })
}

export async function rejectFriendRequest(requestId: number): Promise<FriendRequest> {
  return apiRequest<FriendRequest>(`/friends/requests/${requestId}/reject/`, {
    method: 'POST',
  })
}

export async function cancelFriendRequest(requestId: number): Promise<FriendRequest> {
  return apiRequest<FriendRequest>(`/friends/requests/${requestId}/cancel/`, {
    method: 'POST',
  })
}

export async function banUser(userId: number): Promise<void> {
  return apiRequest<void>(`/friends/ban/${userId}/`, {
    method: 'POST',
  })
}

export async function unbanUser(userId: number): Promise<void> {
  return apiRequest<void>(`/friends/ban/${userId}/`, {
    method: 'DELETE',
  })
}
