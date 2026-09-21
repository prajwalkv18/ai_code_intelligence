import React, { useState, useMemo, useEffect, useRef } from 'react'

export default function IntelliSenseCodeViewer({ fullCode, topologyGraph, selectedNodeId, onFocusNodeInGraph }) {
  const [activeFile, setActiveFile] = useState('')
  const [hoveredSymbol, setHoveredSymbol] = useState(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const viewerRef = useRef(null)

  // Parse multi-file blocks if present
  const parsedFiles = useMemo(() => {
    if (!fullCode) return []
    const file_header_pattern = /(?:(?:^|\n)(?:===|---|###)\s*(?:File:\s*)?([^\n\r]+?)\s*(?:===|---|###)?\s*\n)/g
    const matches = Array.from(fullCode.matchAll(file_header_pattern))

    if (matches.length > 0) {
      return matches.map((match, idx) => {
        const fname = match[1].trim()
        const startPos = match.index + match[0].length
        const endPos = matches[idx + 1] ? matches[idx + 1].index : fullCode.length
        return {
          name: fname,
          content: fullCode.slice(startPos, endPos),
        }
      })
    }
    return [{ name: 'main_code', content: fullCode }]
  }, [fullCode])

  useEffect(() => {
    if (parsedFiles.length > 0 && (!activeFile || !parsedFiles.some(f => f.name === activeFile))) {
      setActiveFile(parsedFiles[0].name)
    }
  }, [parsedFiles, activeFile])

  // Get current file content
  const currentFileContent = useMemo(() => {
    const fileObj = parsedFiles.find(f => f.name === activeFile)
    return fileObj ? fileObj.content : fullCode || ''
  }, [parsedFiles, activeFile, fullCode])

  const lines = useMemo(() => currentFileContent.split('\n'), [currentFileContent])

  // Get active node target line
  const selectedNode = useMemo(() => {
    if (!topologyGraph?.nodes || !selectedNodeId) return null
    return topologyGraph.nodes.find(n => n.id === selectedNodeId) || null
  }, [topologyGraph, selectedNodeId])

  // Auto switch file if selected node is in a different file
  useEffect(() => {
    if (selectedNode && selectedNode.file && selectedNode.file !== activeFile) {
      if (parsedFiles.some(f => f.name === selectedNode.file)) {
        setActiveFile(selectedNode.file)
      }
    }
  }, [selectedNode, activeFile, parsedFiles])

  // Scroll to line when selectedNode updates
  useEffect(() => {
    if (selectedNode && selectedNode.line && viewerRef.current) {
      const lineEl = viewerRef.current.querySelector(`#line-${selectedNode.line}`)
      if (lineEl) {
        lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [selectedNode])

  // Match symbols in a line
  const symbolMap = useMemo(() => {
    return topologyGraph?.symbol_table || {}
  }, [topologyGraph])

  const handleTokenHover = (e, tokenName) => {
    if (symbolMap[tokenName] && symbolMap[tokenName].length > 0) {
      const sym = symbolMap[tokenName][0]
      const rect = e.target.getBoundingClientRect()
      setHoveredSymbol(sym)
      setHoverPos({
        x: rect.left,
        y: rect.bottom + 6,
      })
    }
  }

  const handleTokenMouseLeave = () => {
    setHoveredSymbol(null)
  }

  return (
    <div className="intellisense-viewer-container" ref={viewerRef}>
      {/* File Selector Tabs */}
      <div className="intellisense-tabs-bar">
        <span className="file-icon">📁</span>
        <div className="file-tabs">
          {parsedFiles.map(f => (
            <button
              key={f.name}
              className={`file-tab ${activeFile === f.name ? 'active' : ''}`}
              onClick={() => setActiveFile(f.name)}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor Line Display */}
      <div className="code-editor-viewport">
        {lines.map((lineText, idx) => {
          const lineNum = idx + 1
          const isHighlighted = selectedNode && selectedNode.line === lineNum && selectedNode.file === activeFile

          return (
            <div
              key={lineNum}
              id={`line-${lineNum}`}
              className={`code-line ${isHighlighted ? 'line-highlight' : ''}`}
            >
              <span className="line-number">{lineNum}</span>
              <span className="line-text">
                {lineText.split(/(\b[A-Za-z_][A-Za-z0-9_]*\b)/).map((part, pIdx) => {
                  const isSymbol = symbolMap[part] && symbolMap[part].length > 0
                  if (isSymbol) {
                    const sym = symbolMap[part][0]
                    const symClass = sym.type === 'class' ? 'sym-class' : 'sym-fn'
                    return (
                      <span
                        key={pIdx}
                        className={`intellisense-token ${symClass}`}
                        onMouseEnter={(e) => handleTokenHover(e, part)}
                        onMouseLeave={handleTokenMouseLeave}
                        onClick={() => onFocusNodeInGraph(sym.id)}
                      >
                        {part}
                      </span>
                    )
                  }
                  return part
                })}
              </span>
            </div>
          )
        })}
      </div>

      {/* IntelliSense Hover Card */}
      {hoveredSymbol && (
        <div
          className="intellisense-hover-card"
          style={{ top: hoverPos.y, left: hoverPos.x }}
        >
          <div className="hover-card-header">
            <span className={`hover-badge ${hoveredSymbol.type}`}>
              {hoveredSymbol.type.toUpperCase()}
            </span>
            <span className="hover-name">{hoveredSymbol.name}</span>
          </div>
          <div className="hover-card-body">
            {hoveredSymbol.signature && (
              <pre className="hover-sig">{hoveredSymbol.signature}</pre>
            )}
            <div className="hover-meta">
              <span>📄 {hoveredSymbol.file}</span>
              <span>• Line {hoveredSymbol.line}</span>
            </div>
            {hoveredSymbol.docstring && (
              <p className="hover-doc">{hoveredSymbol.docstring}</p>
            )}
          </div>
          <div className="hover-card-footer" style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                onFocusNodeInGraph(hoveredSymbol.id)
                setHoveredSymbol(null)
              }}
            >
              ⚡ Focus in Topology Graph
            </button>
            <button
              style={{ background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#a78bfa' }}
              onClick={() => {
                const prompt = `Can you explain the role of the ${hoveredSymbol.type} \`${hoveredSymbol.name}\` within this codebase? What are its dependencies and how should it be used?`
                navigator.clipboard.writeText(prompt)
                alert("Prompt copied to clipboard! Open the AI Chat sidebar and paste it to analyze this specific component.")
              }}
            >
              💬 Ask AI (RAG)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
