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
  is_direct: boolean
  dm_user1: number | null
  dm_user2: number | null
  dm_user1_username: string | null
  dm_user2_username: string | null
}

export interface CreateRoomPayload {
  name: string
  description?: string
  visibility: 'public' | 'private'
}

export interface MessageAttachment {
  id: number
  original_name: string
  comment: string
  file_url: string
  created_at: string
}
