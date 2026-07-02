import { useState, useRef, useCallback, useEffect } from 'react'

export type Mode = 'direct' | 'harness'
export type Message = { role: 'user' | 'assistant'; content: string }
export type Step =
  | { type: 'thought'; round: number; thought: string; action: string }
  | { type: 'tool_result'; tool: string; input: string; result: string }

export type InspectorState =
  | { status: 'idle' }
  | { status: 'running'; mode: Mode }
  | { status: 'done'; mode: 'direct'; model: string; elapsed: number; chars: number }
  | { status: 'done'; mode: 'harness'; sessionId: string; elapsed: number; steps: Step[] }
  | { status: 'error'; message: string }

const DIRECT_URL        = 'http://localhost:8000/direct'
const HARNESS_URL       = 'http://localhost:8000/chat'
const HARNESS_STREAM    = 'http://localhost:8000/chat-stream'
const DEFAULT_MODEL     = 'ornith:9b'
const LS_MESSAGES       = 'mach2:messages'
const LS_SESSION        = 'mach2:session'
const LS_MODE           = 'mach2:mode'

function loadMessages(): Message[] {
  try { return JSON.parse(localStorage.getItem(LS_MESSAGES) ?? '[]') } catch { return [] }
}

export function useChat() {
  const [mode, setMode]           = useState<Mode>(() => (localStorage.getItem(LS_MODE) as Mode) ?? 'direct')
  const [messages, setMessages]   = useState<Message[]>(loadMessages)
  const [loading, setLoading]     = useState(false)
  const [inspector, setInspector] = useState<InspectorState>({ status: 'idle' })
  const [steps, setSteps]         = useState<Step[]>([])

  const historyRef = useRef<Message[]>(loadMessages())
  const sessionRef = useRef(localStorage.getItem(LS_SESSION) ?? '')

  useEffect(() => {
    const finished = messages.filter(m => m.content)
    localStorage.setItem(LS_MESSAGES, JSON.stringify(finished))
  }, [messages])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (loading) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [loading])

  const appendAssistant = (content: string) =>
    setMessages(prev => {
      const next = [...prev]
      next[next.length - 1] = { role: 'assistant', content }
      return next
    })

  const send = useCallback(async (text: string) => {
    if (loading) return
    historyRef.current = [...historyRef.current, { role: 'user', content: text }]
    setMessages([...historyRef.current, { role: 'assistant', content: '' }])
    setSteps([])
    setLoading(true)
    setInspector({ status: 'running', mode })

    const t0 = performance.now()
    try {
      if (mode === 'direct') {
        const result = await fetch(DIRECT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historyRef.current, model: DEFAULT_MODEL }),
        }).then(r => { if (!r.ok) throw new Error(`Direct ${r.status}`); return r.json() })
        const answer = result.answer ?? ''
        appendAssistant(answer)
        historyRef.current = [...historyRef.current, { role: 'assistant', content: answer }]
        setInspector({ status: 'done', mode: 'direct', model: DEFAULT_MODEL, elapsed: (performance.now() - t0) / 1000, chars: answer.length })
      } else {
        const resp = await fetch(HARNESS_STREAM, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, session_id: sessionRef.current }),
        })
        if (!resp.ok) throw new Error(`Harness ${resp.status}`)

        const reader = resp.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const collectedSteps: Step[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const evt = JSON.parse(line.slice(6))

              if (evt.type === 'thought') {
                const s: Step = { type: 'thought', round: evt.round, thought: evt.thought, action: evt.action }
                collectedSteps.push(s)
                setSteps([...collectedSteps])
              } else if (evt.type === 'tool_result') {
                const s: Step = { type: 'tool_result', tool: evt.tool, input: evt.input, result: evt.result }
                collectedSteps.push(s)
                setSteps([...collectedSteps])
              } else if (evt.type === 'done') {
                const answer = evt.answer ?? ''
                sessionRef.current = evt.session_id ?? ''
                localStorage.setItem(LS_SESSION, sessionRef.current)
                appendAssistant(answer)
                historyRef.current = [...historyRef.current, { role: 'assistant', content: answer }]
                setInspector({ status: 'done', mode: 'harness', sessionId: sessionRef.current, elapsed: (performance.now() - t0) / 1000, steps: collectedSteps })
              }
            } catch { /* skip malformed event */ }
          }
        }
      }
    } catch (err) {
      appendAssistant(`⚠️ ${err}`)
      setInspector({ status: 'error', message: String(err) })
    }
    setLoading(false)
  }, [mode, loading])

  const clear = useCallback(() => {
    setMessages([])
    setSteps([])
    historyRef.current = []
    sessionRef.current = ''
    localStorage.removeItem(LS_MESSAGES)
    localStorage.removeItem(LS_SESSION)
    setInspector({ status: 'idle' })
  }, [])

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    localStorage.setItem(LS_MODE, m)
    setMessages([])
    setSteps([])
    historyRef.current = []
    sessionRef.current = ''
    localStorage.removeItem(LS_MESSAGES)
    localStorage.removeItem(LS_SESSION)
    setInspector({ status: 'idle' })
  }, [])

  return { mode, switchMode, messages, loading, inspector, steps, send, clear }
}
