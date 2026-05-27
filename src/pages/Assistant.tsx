import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { sendMessage, onAiChunk, onAiDone, onAiError, getSettings } from '@/lib/tauri'
import type { AiMessage } from '@/types/ai'
import { cn } from '@/lib/utils'

interface DisplayMessage extends AiMessage {
  id: string
  streaming?: boolean
}

export default function Assistant() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m everytin, your Windows system assistant. I can help you install software, analyze performance issues, manage updates, and more. What can I do for you?',
    },
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for stream events
  useEffect(() => {
    let unlistenChunk: (() => void) | undefined
    let unlistenDone: (() => void) | undefined
    let unlistenError: (() => void) | undefined

    onAiChunk(({ stream_id, delta }) => {
      if (stream_id !== currentStreamId) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `stream-${stream_id}`
            ? { ...m, content: m.content + delta }
            : m,
        ),
      )
    }).then((fn) => { unlistenChunk = fn })

    onAiDone(({ stream_id }) => {
      if (stream_id !== currentStreamId) return
      setIsStreaming(false)
      setCurrentStreamId(null)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `stream-${stream_id}` ? { ...m, streaming: false } : m,
        ),
      )
    }).then((fn) => { unlistenDone = fn })

    onAiError(({ stream_id, error }) => {
      if (stream_id !== currentStreamId) return
      setIsStreaming(false)
      setCurrentStreamId(null)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === `stream-${stream_id}`
            ? { ...m, content: `Error: ${error}`, streaming: false }
            : m,
        ),
      )
    }).then((fn) => { unlistenError = fn })

    return () => {
      unlistenChunk?.()
      unlistenDone?.()
      unlistenError?.()
    }
  }, [currentStreamId])

  async function handleSend() {
    if (!input.trim() || isStreaming) return

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    }

    const history: AiMessage[] = messages
      .filter((m) => m.id !== 'welcome')
      .map(({ role, content }) => ({ role, content }))

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsStreaming(true)

    const apiKey = settings?.ai_provider === 'claude'
      ? settings.claude_api_key
      : settings?.gemini_api_key ?? ''
    const provider = settings?.ai_provider ?? 'gemini'

    try {
      const streamId = await sendMessage(userMsg.content, history, apiKey, provider)
      setCurrentStreamId(streamId)

      // Add placeholder for streaming response
      setMessages((prev) => [
        ...prev,
        {
          id: `stream-${streamId}`,
          role: 'assistant',
          content: '',
          streaming: true,
        },
      ])
    } catch (e) {
      setIsStreaming(false)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${e}`,
        },
      ])
    }
  }

  const noApiKey = !settings?.gemini_api_key && !settings?.claude_api_key

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-white flex-shrink-0">
        <img src="/logo.png" alt="everytin" className="w-8 h-8 rounded-lg" />
        <div>
          <h1 className="text-[15px] font-semibold text-[#1A1A1A]">AI Assistant</h1>
          <p className="text-[11px] text-[#9CA3AF]">
            {settings?.ai_provider === 'claude' ? 'Claude by Anthropic' : 'Gemini by Google'}
          </p>
        </div>
      </div>

      {/* No API Key Warning */}
      {noApiKey && (
        <div className="mx-6 mt-4 flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-800">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>No API key configured. Go to <strong>Settings</strong> to add your Gemini or Claude API key.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                msg.role === 'user' ? 'bg-[#F1F3F5]' : 'bg-accent',
              )}>
                {msg.role === 'user'
                  ? <User size={14} className="text-[#6B7280]" />
                  : <Bot size={14} className="text-white" />
                }
              </div>
              <div className={cn(
                'max-w-[75%] px-4 py-3 rounded-xl text-[14px] leading-relaxed',
                msg.role === 'user'
                  ? 'bg-accent text-white rounded-tr-sm'
                  : 'bg-white border border-border shadow-card text-[#1A1A1A] rounded-tl-sm',
              )}>
                {msg.content || (msg.streaming && (
                  <Loader2 size={14} className="animate-spin text-[#9CA3AF]" />
                ))}
                {msg.streaming && msg.content && (
                  <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-white flex-shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Ask me anything… e.g. 'Install Discord', 'Why is my PC slow?'"
            rows={1}
            className="flex-1 resize-none pl-4 pr-3 py-3 text-[14px] border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || noApiKey}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
              input.trim() && !isStreaming && !noApiKey
                ? 'bg-accent text-white hover:bg-accent-600'
                : 'bg-[#F1F3F5] text-[#D1D5DB]',
            )}
          >
            {isStreaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-[11px] text-[#9CA3AF] mt-2">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
