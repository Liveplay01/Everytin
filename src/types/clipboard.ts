export type ClipboardEntryType = 'text' | 'image' | 'code' | 'url'

export interface ClipboardEntry {
  id: number
  type: ClipboardEntryType
  content: string
  pinned: boolean
  created_at: string
}

export function detectContentType(content: string): ClipboardEntryType {
  if (content.startsWith('data:image/')) return 'image'
  if (/^https?:\/\//.test(content.trim())) return 'url'
  if (/[{}\[\];`]/.test(content) && content.includes('\n')) return 'code'
  return 'text'
}
