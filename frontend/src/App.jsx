import { useState, useCallback, useEffect, useRef } from 'react'
import { auth, logout } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { saveReportToFirestore } from './firebase'
import CodeInputForm from './CodeInputForm'
import ResultsPanel from './ResultsPanel'
import ChatSidebar from './ChatSidebar'
import Login from './Login'
import HistoryPanel from './HistoryPanel'

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0d0d0f;
    color: #e2e2e8;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    min-height: 100vh;
    line-height: 1.6;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #1a1a1f; }
  ::-webkit-scrollbar-thumb { background: #3a3a4a; border-radius: 3px; }

  .app-shell {
    max-width: 960px;
    margin: 0 auto;
    padding: 40px 20px 120px;
  }

  .app-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .app-header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #13131a;
    border: 1px solid #1e1e2e;
    padding: 6px 12px;
    border-radius: 30px;
  }

  .user-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
  }

  .user-email {
    font-size: 13px;
    color: #9b9baf;
  }

  .logout-btn {
    background: transparent;
    border: none;
    color: #f87171;
    font-size: 12px;
    cursor: pointer;
    font-weight: 600;
  }
  .logout-btn:hover { color: #ef4444; text-decoration: underline; }

  .history-btn {
    background: transparent;
    border: 1px solid #2a2a3e;
    color: #a78bfa;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    margin-right: 8px;
    transition: all 0.15s;
  }
  .history-btn:hover { background: rgba(99,102,241,0.1); border-color: #6366f1; }

  .app-header .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 14px;
    border-radius: 20px;
    margin-bottom: 14px;
  }

  .app-header h1 {
    font-size: clamp(26px, 5vw, 40px);
    font-weight: 800;
    background: linear-gradient(135deg, #e2e2e8 30%, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.2;
    margin-bottom: 12px;
  }

  .app-header p {
    color: #6b6b80;
    font-size: 15px;
    max-width: 520px;
    margin: 0 auto;
  }

  .feature-pills {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 18px;
  }

  .feature-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 11px;
    background: rgba(255,255,255,0.04);
    border: 1px solid #1e1e2e;
    border-radius: 20px;
    font-size: 11.5px;
    color: #6b6b80;
  }

  .card {
    background: #13131a;
    border: 1px solid #1e1e2e;
    border-radius: 16px;
    padding: 28px;
    margin-bottom: 24px;
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    padding: 14px 18px;
    color: #f87171;
    font-size: 14px;
    margin-bottom: 24px;
  }

  .loading-bar {
    height: 3px;
    background: linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa, #6366f1);
    background-size: 200% 100%;
    border-radius: 2px;
    margin-bottom: 16px;
    animation: shimmer 1.6s linear infinite;
  }

  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .loading-text {
    text-align: center;
    color: #6b6b80;
    font-size: 14px;
    margin-bottom: 20px;
    letter-spacing: 0.03em;
  }

  .new-analysis-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #13131a;
    border: 1px solid #2a2a3e;
    border-radius: 8px;
    color: #9b9baf;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 20px;
  }

  .new-analysis-btn:hover { background: #1e1e2e; color: #e2e2e8; }
`

const FEATURES = [
  { icon: '⚡', label: 'Groq AI' },
  { icon: '🐙', label: 'GitHub Import' },
  { icon: '🔧', label: 'Refactor' },
  { icon: '💬', label: 'AI Chat' },
  { icon: '⏱', label: 'Complexity' },
  { icon: '📥', label: 'Export' },
]

export default function App() {
  const [result,       setResult]       = useState(null)
  const [streamPanels, setStreamPanels] = useState({})
  const [error,        setError]        = useState(null)
  const [loading,      setLoading]      = useState(false)
  
  // Auth state
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthChecking(false)
    })
    return () => unsubscribe()
  }, [])

  const codeContext = result?.code_context || ''
  const language    = result?.language_detected || ''
  const hasResults  = result || Object.keys(streamPanels).length > 0

  // streamPanelsRef lets handleResult always read the *latest* panels
  // even though handleSubmit in CodeInputForm closed over an early version of onResult
  const streamPanelsRef = useRef({})

  // Called by CodeInputForm when a streaming panel update arrives
  const handleStreamPanel = useCallback((panelName, panelData) => {
    streamPanelsRef.current = { ...streamPanelsRef.current, [panelName]: panelData }
    setStreamPanels(prev => ({ ...prev, [panelName]: panelData }))
  }, [])

  // useCallback keeps handleResult a stable reference so CodeInputForm's
  // async handleSubmit always calls the same function (avoiding stale closures)
  const handleResult = useCallback(async (data) => {
    // Read the LATEST panels from the ref, not from the closure
    const currentStreamPanels = streamPanelsRef.current

    // Attach accumulated stream panels if this is the final result and outputs is missing
    if (data && data.status !== 'loading' && !data.outputs && Object.keys(currentStreamPanels).length > 0) {
      data.outputs = { ...currentStreamPanels }
    }

    setResult(data)

    // Only clear streamPanels and save to history if it's the FINAL result
    if (data?.status !== 'loading') {
      streamPanelsRef.current = {}
      setStreamPanels({})

      // Save to Firestore if it's a successful new analysis (not a history load)
      if (user && data && !data.id && data.status !== 'error') {
        try {
          await saveReportToFirestore(user.uid, data, currentStreamPanels)
        } catch (e) {
          console.error("Failed to save report to history", e)
        }
      }
    }
  }, [user])

  function loadHistoricalReport(reportData) {
    // Format the Firestore document back to the expected Result shape
    setResult({
      ...reportData,
      status: 'success'
    })
    setStreamPanels({})
    setShowHistory(false)
  }

  function reset() {
    setResult(null)
    streamPanelsRef.current = {}
    setStreamPanels({})
    setError(null)
  }

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b80' }}>
        Loading AI Code Intelligence...
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-top">
            <div className="badge">✨ AI Powered</div>
            <div className="user-info">
              {user.photoURL && <img src={user.photoURL} alt="User" className="user-avatar" />}
              <span className="user-email">{user.email}</span>
              <button className="history-btn" onClick={() => setShowHistory(h => !h)}>
                {showHistory ? 'Hide History' : 'View History'}
              </button>
              <button className="logout-btn" onClick={logout}>Sign Out</button>
            </div>
          </div>
          <h1>AI Code Intelligence</h1>
          <p>Analyse, document, diagram, refactor and test your code instantly with Google Gemini</p>
          <div className="feature-pills">
            {FEATURES.map(f => (
              <span key={f.label} className="feature-pill">{f.icon} {f.label}</span>
            ))}
          </div>
        </header>

        {showHistory ? (
          <HistoryPanel 
            user={user} 
            onLoadReport={loadHistoricalReport} 
            onClose={() => setShowHistory(false)} 
          />
        ) : (
          <div className="card">
            <CodeInputForm
              onResult={handleResult}
              onError={setError}
              onLoading={setLoading}
              onStreamPanel={handleStreamPanel}
            />
          </div>
        )}

        {loading && (
          <>
            <div className="loading-bar" />
            <p className="loading-text">Analysing your code with Google Gemini…</p>
          </>
        )}

        {error && (
          <div className="error-banner">
            <span>⚠</span> {error}
          </div>
        )}

        {hasResults && (
          <button className="new-analysis-btn" onClick={reset}>
            ← New Analysis
          </button>
        )}

        <ResultsPanel result={result} streamPanels={streamPanels} />

        <ChatSidebar
          code={codeContext}
          language={language}
          visible={hasResults}
        />
      </div>
    </>
  )
}
