export interface Room {
  id: number
  name: string
  description: string | null
  visibility: 'public' | 'private'
  owner: number
  owner_username: string
  member_count: number
  joined: boolean
  my_role: 'owner' | 'admin' | 'member' | null
  created_at: string
}

export interface CreateRoomPayload {
  name: string
  description?: string
  visibility: 'public' | 'private'
}