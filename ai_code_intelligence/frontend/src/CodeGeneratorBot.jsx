import { useState, useRef, useEffect } from 'react'

const styles = `
  /* ── Code Generator FAB (Bottom-Left) ─────────────────── */
  .codegen-fab {
    position: fixed;
    bottom: 28px;
    left: 28px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #06b6d4);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    box-shadow: 0 4px 24px rgba(16, 185, 129, 0.45);
    z-index: 1000;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .codegen-fab:hover {
    transform: scale(1.08) translateY(-2px);
    box-shadow: 0 8px 32px rgba(16, 185, 129, 0.6);
  }

  .codegen-fab .codegen-fab-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    background: #34d399;
    border-radius: 50%;
    border: 2px solid #0d0d0f;
    font-size: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0d0d0f;
    font-weight: 700;
  }

  /* ── Code Generator Drawer (Bottom-Left) ──────────────── */
  .codegen-drawer {
    position: fixed;
    bottom: 0;
    left: 28px;
    width: 440px;
    max-width: calc(100vw - 40px);
    height: 600px;
    max-height: 82vh;
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

  .codegen-drawer.open {
    transform: translateY(0);
  }

  .codegen-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 14px;
    border-bottom: 1px solid #1e1e2e;
    flex-shrink: 0;
  }

  .codegen-drawer-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .codegen-drawer-title h3 {
    font-size: 14px;
    font-weight: 700;
    color: #e2e2e8;
    margin: 0;
  }

  .codegen-drawer-title p {
    font-size: 11px;
    color: #34d399;
    margin: 0;
  }

  .codegen-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #06b6d4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .codegen-close-btn {
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

  .codegen-close-btn:hover { background: #2a2a3e; color: #e2e2e8; }

  /* ── Messages Area ────────────────────────────────────── */
  .codegen-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scroll-behavior: smooth;
  }

  .codegen-messages::-webkit-scrollbar { width: 4px; }
  .codegen-messages::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 2px; }

  .codegen-msg {
    display: flex;
    gap: 10px;
    max-width: 95%;
    animation: codegenFadeUp 0.2s ease;
  }

  @keyframes codegenFadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .codegen-msg.user {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .codegen-bubble {
    padding: 10px 14px;
    border-radius: 12px;
    font-size: 12.5px;
    line-height: 1.55;
    word-break: break-word;
    position: relative;
  }

  .codegen-msg.user .codegen-bubble {
    background: linear-gradient(135deg, #059669, #0d9488);
    color: #ffffff;
    border-bottom-right-radius: 3px;
  }

  .codegen-msg.model .codegen-bubble {
    background: #1a1a24;
    border: 1px solid #2a2a3e;
    color: #d1d5db;
    border-bottom-left-radius: 3px;
    width: 100%;
  }

  .codegen-bubble pre {
    background: #0d0d12;
    border: 1px solid #2a2a3e;
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    font-family: 'Fira Code', 'Consolas', monospace;
    font-size: 11.5px;
    color: #6ee7b7;
    margin: 8px 0;
    position: relative;
  }

  .codegen-copy-btn {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #1e1e2e;
    border: 1px solid #34d399;
    color: #34d399;
    border-radius: 4px;
    font-size: 10px;
    padding: 2px 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .codegen-copy-btn:hover { background: #34d399; color: #0d0d0f; }

  .codegen-bubble code {
    background: rgba(16,185,129,0.15);
    color: #34d399;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 11.5px;
  }

  .codegen-bubble p { margin-bottom: 8px; }
  .codegen-bubble p:last-child { margin-bottom: 0; }
  .codegen-bubble ul { margin: 6px 0 6px 18px; padding: 0; }
  .codegen-bubble li { margin-bottom: 4px; }

  .codegen-typing {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 0;
  }

  .codegen-typing span {
    width: 7px;
    height: 7px;
    background: #10b981;
    border-radius: 50%;
    animation: codegenBounce 1.2s ease-in-out infinite;
  }

  .codegen-typing span:nth-child(2) { animation-delay: 0.15s; }
  .codegen-typing span:nth-child(3) { animation-delay: 0.3s; }

  @keyframes codegenBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40%           { transform: translateY(-5px); opacity: 1; }
  }

  .codegen-empty {
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

  .codegen-empty-icon { font-size: 36px; }
  .codegen-empty h4 { font-size: 14px; font-weight: 600; color: #a7f3d0; margin: 0; }
  .codegen-empty p { font-size: 12px; color: #6b7280; margin: 0; max-width: 280px; }

  .codegen-suggestion-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    margin-top: 10px;
  }

  .codegen-chip {
    padding: 6px 11px;
    background: rgba(16, 185, 129, 0.08);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 20px;
    color: #34d399;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .codegen-chip:hover { background: rgba(16, 185, 129, 0.22); transform: translateY(-1px); }

  /* ── Input Area ───────────────────────────────────────── */
  .codegen-input-area {
    padding: 12px 16px 16px;
    border-top: 1px solid #1e1e2e;
    flex-shrink: 0;
  }

  .codegen-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  .codegen-input {
    flex: 1;
    background: #0d0d0f;
    border: 1px solid #1e1e2e;
    border-radius: 10px;
    padding: 10px 12px;
    color: #e2e2e8;
    font-size: 12.5px;
    font-family: inherit;
    resize: none;
    outline: none;
    min-height: 42px;
    max-height: 110px;
    line-height: 1.5;
    transition: border-color 0.15s;
  }

  .codegen-input:focus { border-color: #10b981; }
  .codegen-input::placeholder { color: #4b5563; }

  .codegen-send-btn {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: linear-gradient(135deg, #10b981, #06b6d4);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: opacity 0.15s, transform 0.1s;
    flex-shrink: 0;
  }

  .codegen-send-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.05); }
  .codegen-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .codegen-clear-btn {
    background: none;
    border: none;
    color: #4b5563;
    font-size: 11px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: color 0.15s;
    margin-top: 6px;
    display: block;
  }
  .codegen-clear-btn:hover { color: #9ca3af; }
`

const SUGGESTIONS = [
  { label: '⚡ Create REST Endpoint', prompt: 'Write complete, production-ready code to add a new REST API endpoint file for this codebase. Include full router, request/response models, and error handling in a markdown code block.' },
  { label: '🔌 Write Integration Handler', prompt: 'Write a complete integration module code file connecting this project with an external service API (e.g. payment gateway, notification webhook, or third-party service). Output code first.' },
  { label: '📦 Scaffold DB Model & Query', prompt: 'Write complete code for a database schema model and repository class with CRUD queries for this codebase. Output code first.' },
  { label: '🎨 Build React Hook & UI', prompt: 'Write a complete React component and custom hook with state management to connect with this backend code. Output code first.' },
  { label: '🛡️ Add Auth Middleware', prompt: 'Write a complete security authentication and JWT middleware code file for this codebase. Output code first.' },
]

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
      if (inList) { html += '</ul>'; inList = false }
      if (inCode) { html += '</code></pre>'; inCode = false }
      else { html += '<pre><code>'; inCode = true }
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

export default function CodeGeneratorBot({ code, language, visible }) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [history, busy])

  if (!visible) return null

  async function send(msg, displayLabel) {
    const promptText = (msg || input).trim()
    if (!promptText || busy) return

    const userMsg = { role: 'user', content: displayLabel || promptText }
    setHistory(h => [...h, userMsg])
    setInput('')
    setBusy(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code || '',
          language: language || 'unknown',
          history: history.map(m => ({ role: m.role, content: m.content })),
          prompt: promptText,
        }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'No code generated.'
      setHistory(h => [...h, { role: 'model', content: reply }])
    } catch (err) {
      setHistory(h => [...h, { role: 'model', content: `Error generating code: ${err.message}` }])
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

  function copyCode(content, idx) {
    // Extract code blocks or full content
    const codeMatches = content.match(/```(?:\w+)?\n([\s\S]*?)```/g)
    let textToCopy = content
    if (codeMatches && codeMatches.length > 0) {
      textToCopy = codeMatches.map(m => m.replace(/```(?:\w+)?\n/, '').replace(/```$/, '')).join('\n\n')
    }
    navigator.clipboard.writeText(textToCopy)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <>
      <style>{styles}</style>

      {/* Floating Action Button - Bottom-Left */}
      <button
        className="codegen-fab"
        onClick={() => setOpen(o => !o)}
        title="AI Code & Integration Generator"
        aria-label="Open Code Generator Bot"
      >
        🪄
        {history.length > 0 && (
          <span className="codegen-fab-badge">{history.length}</span>
        )}
      </button>

      {/* Slide-Up Drawer - Bottom-Left */}
      <div className={`codegen-drawer ${open ? 'open' : ''}`} role="dialog" aria-label="Code Generator Bot">
        {/* Header */}
        <div className="codegen-drawer-header">
          <div className="codegen-drawer-title">
            <div className="codegen-avatar">🪄</div>
            <div>
              <h3>AI Code Generator</h3>
              <p>Generate features & integrations</p>
            </div>
          </div>
          <button className="codegen-close-btn" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Message List */}
        <div className="codegen-messages" ref={messagesRef}>
          {history.length === 0 && (
            <div className="codegen-empty">
              <span className="codegen-empty-icon">✨</span>
              <h4>Generate New Code</h4>
              <p>Request new REST endpoints, API integrations, models, or hooks tailored to your codebase.</p>
              <div className="codegen-suggestion-chips">
                {SUGGESTIONS.map(s => (
                  <button key={s.label} className="codegen-chip" onClick={() => send(s.prompt, s.label)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((m, i) => (
            <div key={i} className={`codegen-msg ${m.role}`}>
              <div className="codegen-avatar">{m.role === 'user' ? '👤' : '🪄'}</div>
              <div className="codegen-bubble">
                {m.role === 'model' && (
                  <button 
                    className="codegen-copy-btn" 
                    onClick={() => copyCode(m.content, i)}
                  >
                    {copiedIndex === i ? '✓ Copied' : '📋 Copy Code'}
                  </button>
                )}
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
              </div>
            </div>
          ))}

          {busy && (
            <div className="codegen-msg model">
              <div className="codegen-avatar">🪄</div>
              <div className="codegen-bubble">
                <div className="codegen-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="codegen-input-area">
          <div className="codegen-input-row">
            <textarea
              className="codegen-input"
              rows={1}
              placeholder="Describe the new code or integration to generate..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="codegen-send-btn"
              onClick={() => send()}
              disabled={!input.trim() || busy}
              title="Generate code"
            >
              🚀
            </button>
          </div>
          {history.length > 0 && (
            <button className="codegen-clear-btn" onClick={() => setHistory([])}>
              Clear chat history
            </button>
          )}
        </div>
      </div>
    </>
  )
}
