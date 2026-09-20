import { useState, useRef, useEffect } from 'react'

const styles = `
  /* ── Chat fab ─────────────────────────────────────────── */
  .chat-fab {
    position: fixed;
    bottom: 28px;
    right: 28px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 24px rgba(99,102,241,0.45);
    z-index: 1000;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .chat-fab:hover {
    transform: scale(1.08) translateY(-2px);
    box-shadow: 0 8px 32px rgba(99,102,241,0.6);
  }

  .chat-fab .chat-fab-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    background: #4ade80;
    border-radius: 50%;
    border: 2px solid #0d0d0f;
    font-size: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0d0d0f;
    font-weight: 700;
  }

  /* ── Chat drawer ──────────────────────────────────────── */
  .chat-drawer {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 400px;
    max-width: 100vw;
    height: 560px;
    max-height: 80vh;
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 20px 20px 0 0;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -8px 40px rgba(0,0,0,0.5);
    transform: translateY(100%);
    transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .chat-drawer.open {
    transform: translateY(0);
  }

  .chat-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 14px;
    border-bottom: 1px solid #1e1e2e;
    flex-shrink: 0;
  }

  .chat-drawer-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .chat-drawer-title h3 {
    font-size: 14px;
    font-weight: 700;
    color: #e2e2e8;
    margin: 0;
  }

  .chat-drawer-title p {
    font-size: 11px;
    color: #4a4a60;
    margin: 0;
  }

  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .chat-close-btn {
    background: #1e1e2e;
    border: 1px solid #2a2a3e;
    border-radius: 8px;
    color: #6b6b80;
    font-size: 14px;
    width: 30px;
    height: 30px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .chat-close-btn:hover { background: #2a2a3e; color: #e2e2e8; }

  /* ── Messages ─────────────────────────────────────────── */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }

  .chat-messages::-webkit-scrollbar { width: 4px; }
  .chat-messages::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }

  .chat-msg {
    display: flex;
    gap: 10px;
    max-width: 92%;
    animation: fadeSlideUp 0.2s ease;
  }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
  .chat-msg.model { align-self: flex-start; }

  .chat-msg-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .chat-msg.user .chat-msg-avatar { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
  .chat-msg.model .chat-msg-avatar { background: #1e1e2e; border: 1px solid #2a2a3e; }

  .chat-bubble {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.55;
  }

  .chat-msg.user .chat-bubble {
    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
    border: 1px solid rgba(99,102,241,0.25);
    color: #e2e2e8;
    border-top-right-radius: 4px;
  }

  .chat-msg.model .chat-bubble {
    background: #1a1a24;
    border: 1px solid #1e1e2e;
    color: #c9d1d9;
    border-top-left-radius: 4px;
  }

  .chat-bubble .md p   { font-size: 13px; color: #c9d1d9; margin: 4px 0; }
  .chat-bubble .md code { font-size: 11.5px; }
  .chat-bubble .md pre  { font-size: 12px; margin: 8px 0; }

  .chat-typing {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 4px 0;
  }

  .chat-typing span {
    width: 7px;
    height: 7px;
    background: #6366f1;
    border-radius: 50%;
    animation: bounce 1.2s ease-in-out infinite;
  }

  .chat-typing span:nth-child(2) { animation-delay: 0.15s; }
  .chat-typing span:nth-child(3) { animation-delay: 0.3s; }

  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }

  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #3a3a4a;
    text-align: center;
    padding: 20px;
  }

  .chat-empty-icon { font-size: 36px; }
  .chat-empty h4 { font-size: 14px; font-weight: 600; color: #4a4a60; margin: 0; }
  .chat-empty p { font-size: 12px; color: #3a3a4a; margin: 0; }

  .chat-suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-top: 8px;
  }

  .chat-chip {
    padding: 5px 10px;
    background: rgba(99,102,241,0.08);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 20px;
    color: #a78bfa;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .chat-chip:hover { background: rgba(99,102,241,0.18); }

  /* ── Input area ───────────────────────────────────────── */
  .chat-input-area {
    padding: 12px 16px 16px;
    border-top: 1px solid #1e1e2e;
    flex-shrink: 0;
  }

  .chat-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .chat-input {
    flex: 1;
    background: #0d0d0f;
    border: 1px solid #1e1e2e;
    border-radius: 10px;
    padding: 10px 12px;
    color: #e2e2e8;
    font-size: 13px;
    font-family: inherit;
    resize: none;
    outline: none;
    min-height: 40px;
    max-height: 100px;
    line-height: 1.5;
    transition: border-color 0.15s;
  }

  .chat-input:focus { border-color: #6366f1; }
  .chat-input::placeholder { color: #3a3a4a; }

  .chat-send-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: opacity 0.15s, transform 0.1s;
    flex-shrink: 0;
  }

  .chat-send-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(1.05); }
  .chat-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .chat-clear-btn {
    background: none;
    border: none;
    color: #3a3a4a;
    font-size: 11px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.15s;
    margin-top: 6px;
    display: block;
  }
  .chat-clear-btn:hover { color: #6b6b80; }
`

const SUGGESTIONS = [
  'What does this code do?',
  'Find potential bugs',
  'How can I improve performance?',
  'Explain the main function',
  'What are the dependencies?',
]

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function inline(s) {
  return escHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function renderMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inCode = false, inList = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inList)  { html += '</ul>'; inList = false }
      if (inCode)  { html += '</code></pre>'; inCode = false }
      else         { html += '<pre><code>'; inCode = true }
      continue
    }
    if (inCode) { html += escHtml(line) + '\n'; continue }

    const li = line.match(/^\s*[-*]\s+(.+)/)
    if (li) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${inline(li[1])}</li>`
      continue
    }
    if (inList && !line.trim()) { html += '</ul>'; inList = false }

    const text = line.trim()
    if (text) html += `<p>${inline(text)}</p>`
  }
  if (inCode) html += '</code></pre>'
  if (inList) html += '</ul>'
  return html
}

export default function ChatSidebar({ code, language, visible }) {
  const [open,    setOpen]    = useState(false)
  const [history, setHistory] = useState([])
  const [input,   setInput]   = useState('')
  const [busy,    setBusy]    = useState(false)
  const messagesRef = useRef(null)
  const textareaRef = useRef(null)

  // scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [history, busy])

  if (!visible) return null

  async function send(msg) {
    const message = (msg || input).trim()
    if (!message || busy) return

    const userMsg = { role: 'user', content: message }
    setHistory(h => [...h, userMsg])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:     code || '',
          language: language || 'unknown',
          history:  history.map(m => ({ role: m.role, content: m.content })),
          message,
        }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'No response received.'
      setHistory(h => [...h, { role: 'model', content: reply }])
    } catch (err) {
      setHistory(h => [...h, { role: 'model', content: `Error: ${err.message}` }])
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <style>{styles}</style>

      {/* Floating action button */}
      <button
        className="chat-fab"
        onClick={() => setOpen(o => !o)}
        title="Ask your code"
        aria-label="Open chat"
      >
        💬
        {history.length > 0 && (
          <span className="chat-fab-badge">{history.length}</span>
        )}
      </button>

      {/* Slide-up drawer */}
      <div className={`chat-drawer ${open ? 'open' : ''}`} role="dialog" aria-label="Code chat">
        {/* Header */}
        <div className="chat-drawer-header">
          <div className="chat-drawer-title">
            <div className="chat-avatar">🤖</div>
            <div>
              <h3>Ask Your Code</h3>
              <p>Powered by Google Gemini · {language || 'unknown'}</p>
            </div>
          </div>
          <button className="chat-close-btn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesRef}>
          {history.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">💡</div>
              <h4>Ask anything about your code</h4>
              <p>I have full context of the analysed code and all outputs.</p>
              <div className="chat-suggestion-chips">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    className="chat-chip"
                    onClick={() => send(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            history.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-msg-avatar">
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="chat-bubble">
                  {msg.role === 'model' ? (
                    <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))
          )}

          {busy && (
            <div className="chat-msg model">
              <div className="chat-msg-avatar">🤖</div>
              <div className="chat-bubble">
                <div className="chat-typing">
                  <span/><span/><span/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder="Ask about your code… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={busy}
            />
            <button
              className="chat-send-btn"
              onClick={() => send()}
              disabled={busy || !input.trim()}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
          {history.length > 0 && (
            <button className="chat-clear-btn" onClick={() => setHistory([])}>
              🗑 Clear conversation
            </button>
          )}
        </div>
      </div>
    </>
  )
}
