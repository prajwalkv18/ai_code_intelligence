import { useState } from 'react'
import CodeGraphExplorer from './CodeGraphExplorer'
import IntelliSenseCodeViewer from './IntelliSenseCodeViewer'

const styles = `
  .results-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }

  .results-title {
    font-size: 18px;
    font-weight: 700;
    color: #e2e2e8;
  }

  /* ── View Switcher Bar ────────────────────────────── */
  .view-switcher-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #0d0d12;
    padding: 4px;
    border-radius: 10px;
    border: 1px solid #1e1e2e;
    margin-bottom: 20px;
  }

  .view-switch-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #9b9baf;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .view-switch-btn:hover {
    color: #e2e2e8;
    background: rgba(255,255,255,0.04);
  }

  .view-switch-btn.active {
    background: #1e1e2e;
    color: #a78bfa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    border: 1px solid rgba(167,139,250,0.2);
  }

  /* ── Codebase Graph & IntelliSense Split View ─────── */
  .topology-workspace {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .topology-split-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    min-height: 540px;
  }

  @media (max-width: 900px) {
    .topology-split-container {
      grid-template-columns: 1fr;
    }
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .status-chip.success { background: rgba(34,197,94,0.12); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
  .status-chip.partial { background: rgba(234,179,8,0.12);  color: #facc15; border: 1px solid rgba(234,179,8,0.2); }
  .status-chip.error   { background: rgba(239,68,68,0.12);  color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
  .status-chip.loading { background: rgba(99,102,241,0.12); color: #a78bfa; border: 1px solid rgba(99,102,241,0.2); }

  .meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .meta-pill {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 13px;
    color: #9b9baf;
  }

  .meta-pill span { color: #a78bfa; font-weight: 600; }

  /* ── Export bar ─────────────────────────────────────── */
  .export-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }

  .export-bar-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #4a4a60;
    margin-right: 4px;
  }

  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 1px solid #2a2a3e;
    border-radius: 8px;
    background: #13131a;
    color: #9b9baf;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .export-btn:hover { background: #1e1e2e; color: #e2e2e8; border-color: #6366f1; }
  .export-btn.success { color: #4ade80; border-color: rgba(34,197,94,0.3); }

  /* ── AST card ────────────────────────────────────────── */
  .ast-card {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 12px;
    margin-bottom: 16px;
    overflow: hidden;
  }

  .ast-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid transparent;
    transition: background 0.15s;
  }

  .ast-header:hover { background: rgba(255,255,255,0.03); }
  .ast-header.open  { border-bottom-color: #1e1e2e; }

  .ast-header-left { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #e2e2e8; }
  .ast-chevron { color: #6b6b80; font-size: 11px; transition: transform 0.2s; }
  .ast-chevron.open { transform: rotate(90deg); }

  .ast-body {
    padding: 14px 16px;
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .ast-group { flex: 1; min-width: 140px; }
  .ast-group-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #6b6b80; margin-bottom: 6px; }
  .ast-tag {
    display: inline-block;
    background: rgba(99,102,241,0.1);
    border: 1px solid rgba(99,102,241,0.2);
    color: #a78bfa;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 5px;
    margin: 2px;
    font-family: monospace;
  }

  /* ── Outputs grid ────────────────────────────────────── */
  .outputs-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 620px) { .outputs-grid { grid-template-columns: 1fr; } }

  .output-card {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: border-color 0.3s;
  }

  .output-card.streaming {
    border-color: rgba(99,102,241,0.4);
    box-shadow: 0 0 0 1px rgba(99,102,241,0.15);
  }

  .output-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #1e1e2e;
    cursor: pointer;
    user-select: none;
    transition: background 0.15s;
  }

  .output-card-header:hover { background: rgba(255,255,255,0.02); }

  .output-card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #e2e2e8;
  }

  .output-icon { font-size: 15px; }

  .output-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
  }

  .output-badge.done    { background: rgba(34,197,94,0.12); color: #4ade80; }
  .output-badge.error   { background: rgba(239,68,68,0.12);  color: #f87171; }
  .output-badge.loading { background: rgba(99,102,241,0.12); color: #a78bfa; }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .loading-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #a78bfa;
    border-radius: 50%;
    animation: pulse-dot 1.2s ease-in-out infinite;
    margin-left: 2px;
  }

  .output-actions { display: flex; gap: 6px; align-items: center; }

  .copy-btn, .dl-btn {
    background: #1e1e2e;
    border: 1px solid #2a2a3e;
    border-radius: 6px;
    color: #9b9baf;
    font-size: 11px;
    padding: 3px 9px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-btn:hover, .dl-btn:hover { background: #2a2a3e; color: #e2e2e8; }
  .copy-btn.copied { color: #4ade80; border-color: rgba(34,197,94,0.3); }

  .output-body {
    padding: 14px 16px;
    flex: 1;
    overflow: auto;
    max-height: 380px;
  }

  .output-body pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12.5px;
    line-height: 1.75;
    color: #c9d1d9;
    margin: 0;
  }

  .output-error {
    color: #f87171;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .output-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 4px 0;
  }

  .skeleton-line {
    height: 12px;
    background: linear-gradient(90deg, #1e1e2e 25%, #2a2a3e 50%, #1e1e2e 75%);
    background-size: 200% 100%;
    border-radius: 6px;
    animation: shimmer 1.5s linear infinite;
  }

  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Markdown rendered output */
  .md h2 { font-size: 14px; font-weight: 700; color: #e2e2e8; margin: 14px 0 6px; border-bottom: 1px solid #1e1e2e; padding-bottom: 4px; }
  .md h3 { font-size: 13px; font-weight: 600; color: #a78bfa; margin: 10px 0 4px; }
  .md p  { font-size: 13px; color: #9b9baf; margin: 4px 0 8px; line-height: 1.6; }
  .md code { background: #0d0d0f; border: 1px solid #1e1e2e; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 12px; color: #a78bfa; }
  .md pre  { background: #0d0d0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 10px 14px; overflow-x: auto; margin: 8px 0; }
  .md pre code { background: none; border: none; padding: 0; color: #c9d1d9; font-size: 12.5px; line-height: 1.7; }
  .md ul { padding-left: 18px; margin: 4px 0 8px; }
  .md li { font-size: 13px; color: #9b9baf; margin: 2px 0; line-height: 1.5; }
  .md table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 8px 0; }
  .md th { background: #1e1e2e; color: #a78bfa; font-weight: 600; padding: 6px 10px; text-align: left; border: 1px solid #2a2a3e; }
  .md td { padding: 5px 10px; border: 1px solid #1e1e2e; color: #9b9baf; }
  .md tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .md strong { color: #e2e2e8; font-weight: 600; }

  .output-card.full-width { grid-column: 1 / -1; }
`

const OUTPUT_META = {
  explanation:  { label: 'Explanation',  icon: '📖', wide: false },
  diagram:      { label: 'Diagram',      icon: '🗺',  wide: false },
  api_docs:     { label: 'API Docs',     icon: '📄', wide: false },
  refactor:     { label: 'Refactor',     icon: '🔧', wide: false },
  complexity:   { label: 'Complexity',   icon: '⏱',  wide: true  },
  optimise:     { label: 'Optimise',     icon: '🚀', wide: true  },
  compliance:   { label: 'Compliance',   icon: '📋', wide: true  },
  security:     { label: 'Security',     icon: '🛡️', wide: true  },
  next_actions: { label: 'Next Actions', icon: '🎯', wide: false },
}

// Minimal Markdown → HTML renderer
function renderMarkdown(md) {
  if (!md) return ''
  const lines = md.split('\n')
  let html = ''
  let inCode = false, inTable = false, inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (line.startsWith('```')) {
      if (inList)  { html += '</ul>'; inList = false }
      if (inTable) { html += '</tbody></table>'; inTable = false }
      if (inCode)  { html += '</code></pre>'; inCode = false }
      else         { html += '<pre><code>'; inCode = true }
      continue
    }
    if (inCode) { html += escHtml(line) + '\n'; continue }

    if (line.includes('|')) {
      if (inList) { html += '</ul>'; inList = false }
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1)
      if (line.replace(/[\s|:-]/g, '') === '') continue
      if (!inTable) {
        html += '<table><thead><tr>'
        cells.forEach(c => { html += `<th>${inline(c.trim())}</th>` })
        html += '</tr></thead><tbody>'
        inTable = true
      } else {
        html += '<tr>'
        cells.forEach(c => { html += `<td>${inline(c.trim())}</td>` })
        html += '</tr>'
      }
      continue
    }
    if (inTable) { html += '</tbody></table>'; inTable = false }

    const h2 = line.match(/^##\s+(.+)/)
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { if (inList) { html += '</ul>'; inList = false } html += `<h3>${inline(h3[1])}</h3>`; continue }
    if (h2) { if (inList) { html += '</ul>'; inList = false } html += `<h2>${inline(h2[1])}</h2>`; continue }

    const li = line.match(/^\s*[-*]\s+(.+)/)
    if (li) {
      if (!inList) { html += '<ul>'; inList = true }
      html += `<li>${inline(li[1])}</li>`
      continue
    }
    if (inList && line.trim() === '') { html += '</ul>'; inList = false }

    const text = line.trim()
    if (text) html += `<p>${inline(text)}</p>`
  }

  if (inCode)  html += '</code></pre>'
  if (inTable) html += '</tbody></table>'
  if (inList)  html += '</ul>'
  return html
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function inline(s) {
  return escHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy(e) {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function DownloadButton({ filename, content }) {
  function download(e) {
    e.stopPropagation()
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button className="dl-btn" onClick={download} title={`Download ${filename}`}>⬇</button>
  )
}

function OutputCard({ name, status, content, streaming }) {
  const [open, setOpen] = useState(true)
  const meta = OUTPUT_META[name] || { label: name, icon: '◆' }
  const isLoading = streaming && status === undefined
  const badge = isLoading ? 'loading' : (status || 'loading')

  return (
    <div className={`output-card ${isLoading ? 'streaming' : ''}`}>
      <div className="output-card-header" onClick={() => setOpen(o => !o)}>
        <div className="output-card-title">
          <span className="output-icon">{meta.icon}</span>
          {meta.label}
          <span className={`output-badge ${badge}`}>
            {isLoading ? (<>waiting<span className="loading-dot" /></>) : badge}
          </span>
        </div>
        <div className="output-actions">
          {status === 'done' && content && (
            <>
              <CopyButton text={content} />
              <DownloadButton
                filename={`${name}.md`}
                content={content}
              />
            </>
          )}
          <span style={{ color: '#6b6b80', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="output-body">
          {isLoading ? (
            <div className="output-skeleton">
              {[90, 75, 85, 60, 70].map((w, i) => (
                <div key={i} className="skeleton-line" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="output-error"><span>⚠</span>{content || 'An error occurred.'}</div>
          ) : name === 'diagram' ? (
            <pre>{content}</pre>
          ) : (
            <div className="md" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
          )}
        </div>
      )}
    </div>
  )
}

function AstCard({ ast_summary }) {
  const [open, setOpen] = useState(false)
  const { classes = [], functions = [], imports = [] } = ast_summary

  return (
    <div className="ast-card" style={{ marginBottom: 20 }}>
      <div className={`ast-header ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>
        <div className="ast-header-left">
          <span>🧩</span> AST Summary
        </div>
        <span className={`ast-chevron ${open ? 'open' : ''}`}>▶</span>
      </div>
      {open && (
        <div className="ast-body">
          {classes.length > 0 && (
            <div className="ast-group">
              <div className="ast-group-label">Classes</div>
              {classes.map(c => <span key={c} className="ast-tag">{c}</span>)}
            </div>
          )}
          {functions.length > 0 && (
            <div className="ast-group">
              <div className="ast-group-label">Functions</div>
              {functions.map(f => <span key={f} className="ast-tag">{f}</span>)}
            </div>
          )}
          {imports.length > 0 && (
            <div className="ast-group">
              <div className="ast-group-label">Imports</div>
              {imports.map(i => <span key={i} className="ast-tag">{i}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExportBar({ outputs }) {
  const [status, setStatus] = useState('')

  function downloadAll() {
    const sections = Object.entries(outputs)
      .filter(([, v]) => v.status === 'done' && v.content)
      .map(([key, v]) => {
        const meta = OUTPUT_META[key] || { label: key, icon: '' }
        return `# ${meta.icon} ${meta.label}\n\n${v.content}`
      })
      .join('\n\n---\n\n')

    const blob = new Blob([sections], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ai_code_analysis.md'
    a.click()
    URL.revokeObjectURL(url)
    setStatus('saved')
    setTimeout(() => setStatus(''), 2500)
  }

  function copyAll() {
    const all = Object.entries(outputs)
      .filter(([, v]) => v.status === 'done' && v.content)
      .map(([key, v]) => {
        const meta = OUTPUT_META[key] || { label: key }
        return `=== ${meta.label.toUpperCase()} ===\n\n${v.content}`
      })
      .join('\n\n')
    navigator.clipboard.writeText(all).then(() => {
      setStatus('copied')
      setTimeout(() => setStatus(''), 2500)
    })
  }

  return (
    <div className="export-bar">
      <span className="export-bar-label">Export</span>
      <button
        className={`export-btn ${status === 'saved' ? 'success' : ''}`}
        onClick={downloadAll}
      >
        📥 {status === 'saved' ? 'Downloaded!' : 'Download Markdown'}
      </button>
      <button
        className={`export-btn ${status === 'copied' ? 'success' : ''}`}
        onClick={copyAll}
      >
        📋 {status === 'copied' ? 'Copied!' : 'Copy All'}
      </button>
    </div>
  )
}

export default function ResultsPanel({ result, streamPanels }) {
  const [activeView, setActiveView] = useState('topology') // 'topology' | 'panels'
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  if (!result && (!streamPanels || Object.keys(streamPanels).length === 0)) return null

  const meta = result || {}
  const { status, language_detected, files_analyzed, files_skipped, ast_summary, topology_graph, full_code } = meta

  // Merge: streaming panels override/supplement result.outputs
  const outputs = {
    ...Object.fromEntries(
      Object.keys(OUTPUT_META).map(k => [k, undefined])
    ),
    ...(result?.outputs || {}),
    ...(streamPanels || {}),
  }

  const panelEntries = Object.entries(outputs)
  // 'skipped' panels are excluded from completion check — they were intentionally not run
  const allDone = panelEntries.every(([, v]) => v?.status === 'done' || v?.status === 'error' || v?.status === 'skipped')
  const anyDone = panelEntries.some(([, v]) => v?.status === 'done')
  const isStreaming = streamPanels !== undefined && status === 'loading'

  const chipStatus = status || (isStreaming ? 'loading' : undefined)

  return (
    <>
      <style>{styles}</style>

      <div className="results-header">
        <div className="results-title">Analysis Results</div>
        {chipStatus && (
          <div className={`status-chip ${chipStatus}`}>
            {chipStatus === 'success' ? '✓'
             : chipStatus === 'partial' ? '⚡'
             : chipStatus === 'loading' ? '⏳'
             : '✗'} {chipStatus === 'loading' ? 'streaming…' : chipStatus}
          </div>
        )}
      </div>

      {/* Top View Selector Bar */}
      <div className="view-switcher-bar">
        <button
          className={`view-switch-btn ${activeView === 'topology' ? 'active' : ''}`}
          onClick={() => setActiveView('topology')}
        >
          🌐 Codebase Topology & IntelliSense
        </button>
        <button
          className={`view-switch-btn ${activeView === 'panels' ? 'active' : ''}`}
          onClick={() => setActiveView('panels')}
        >
          📊 AI Analysis Panels ({panelEntries.filter(([, v]) => v?.status === 'done').length}/9)
        </button>
      </div>

      <div className="meta-bar">
        {language_detected && <div className="meta-pill">Language: <span>{language_detected}</span></div>}
        {files_analyzed?.length > 0 && (
          <div className="meta-pill">Files: <span>{files_analyzed.join(', ')}</span></div>
        )}
        {files_skipped?.length > 0 && (
          <div className="meta-pill">Skipped: <span>{files_skipped.length} file{files_skipped.length > 1 ? 's' : ''}</span></div>
        )}
        {topology_graph && (
          <div className="meta-pill">Nodes: <span>{topology_graph.total_nodes}</span> • Connections: <span>{topology_graph.total_edges}</span></div>
        )}
      </div>

      {activeView === 'topology' ? (
        <div className="topology-workspace">
          <div className="topology-split-container">
            <CodeGraphExplorer
              graphData={topology_graph}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node ? node.id : null)}
            />
            <IntelliSenseCodeViewer
              fullCode={full_code}
              topologyGraph={topology_graph}
              selectedNodeId={selectedNodeId}
              onFocusNodeInGraph={(nodeId) => setSelectedNodeId(nodeId)}
            />
          </div>
        </div>
      ) : (
        <>
          {ast_summary && <AstCard ast_summary={ast_summary} />}

          {anyDone && allDone && result && (
            <ExportBar outputs={outputs} />
          )}

          <div className="outputs-grid">
            {panelEntries.map(([key, panel]) => {
              // Don't render panels that were intentionally skipped by the user
              if (panel?.status === 'skipped') return null
              const panelMeta = OUTPUT_META[key] || {}
              const isPanelWaiting = isStreaming && panel?.status === undefined
              return (
                <div key={key} style={panelMeta.wide ? { gridColumn: '1 / -1' } : {}}>
                  <OutputCard
                    name={key}
                    status={isPanelWaiting ? undefined : panel?.status}
                    content={panel?.content}
                    streaming={isPanelWaiting}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
