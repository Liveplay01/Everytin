export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiStreamState {
  stream_id: string | null
  streaming: boolean
  current_text: string
}
