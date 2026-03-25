export interface ReplyToMessage {
  id: number
  content: string
  user: number
  user_username: string
}

export interface Message {
  id: number
  room: number
  user: number
  user_username: string
  content: string
  reply_to: number | null
  reply_to_message: ReplyToMessage | null
  edited: boolean
  created_at: string
  updated_at: string
}

export interface SendMessagePayload {
  content: string
  reply_to?: number | null
}

export interface UpdateMessagePayload {
  content: string
}