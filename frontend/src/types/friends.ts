export interface Friend {
  id: number
  username: string
  email: string
}

export interface FriendRequest {
  id: number
  from_user: number
  from_username: string
  to_user: number
  to_username: string
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'canceled'
  created_at: string
  updated_at: string
}

export interface SendFriendRequestPayload {
  username: string
  message?: string
}
