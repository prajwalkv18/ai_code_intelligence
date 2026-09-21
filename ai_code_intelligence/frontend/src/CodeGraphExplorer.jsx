import React, { useState, useEffect, useRef, useMemo } from 'react'

const NODE_COLORS = {
  file: { bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8', text: '#38bdf8', glow: 'rgba(56, 189, 248, 0.4)' },
  class: { bg: 'rgba(192, 132, 252, 0.15)', border: '#c084fc', text: '#c084fc', glow: 'rgba(192, 132, 252, 0.4)' },
  function: { bg: 'rgba(52, 211, 153, 0.15)', border: '#34d399', text: '#34d399', glow: 'rgba(52, 211, 153, 0.4)' },
  import: { bg: 'rgba(251, 191, 36, 0.15)', border: '#fbbf24', text: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)' },
}

export default function CodeGraphExplorer({ graphData, selectedNodeId, onSelectNode }) {
  const containerRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTypeFilter, setActiveTypeFilter] = useState('all')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDraggingPan, setIsDraggingPan] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isExpanded, setIsExpanded] = useState(false)

  const nodes = useMemo(() => graphData?.nodes || [], [graphData])
  const edges = useMemo(() => graphData?.edges || [], [graphData])

  // Compute 2D node layout positions using force/hierarchical calculation
  const nodePositions = useMemo(() => {
    if (!nodes || nodes.length === 0) return {}
    
    const positions = {}
    const width = 800

    const fileNodes = nodes.filter(n => n.type === 'file')
    const classNodes = nodes.filter(n => n.type === 'class')
    const fnNodes = nodes.filter(n => n.type === 'function')
    const importNodes = nodes.filter(n => n.type === 'import')

    const fileCount = Math.max(fileNodes.length, 1)
    fileNodes.forEach((node, i) => {
      const x = (width / (fileCount + 1)) * (i + 1)
      const y = 80
      positions[node.id] = { x, y }
    })

    const classCount = Math.max(classNodes.length, 1)
    classNodes.forEach((node, i) => {
      const x = (width / (classCount + 1)) * (i + 1)
      const y = 200
      positions[node.id] = { x, y }
    })

    const fnCount = Math.max(fnNodes.length, 1)
    fnNodes.forEach((node, i) => {
      const x = (width / (fnCount + 1)) * (i + 1)
      const y = 320
      positions[node.id] = { x, y }
    })

    const importCount = Math.max(importNodes.length, 1)
    importNodes.forEach((node, i) => {
      const x = (width / (importCount + 1)) * (i + 1)
      const y = 440
      positions[node.id] = { x, y }
    })

    return positions
  }, [nodes])

  // Center pan on selected node when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId && nodePositions[selectedNodeId]) {
      const pos = nodePositions[selectedNodeId]
      setPan({
        x: 400 - pos.x * zoom,
        y: 250 - pos.y * zoom,
      })
    }
  }, [selectedNodeId, nodePositions, zoom])

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesSearch = !searchTerm || n.label.toLowerCase().includes(searchTerm.toLowerCase()) || n.file.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = activeTypeFilter === 'all' || n.type === activeTypeFilter
      return matchesSearch && matchesType
    })
  }, [nodes, searchTerm, activeTypeFilter])

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])

  const filteredEdges = useMemo(() => {
    return edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
  }, [edges, filteredNodeIds])

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'graph-bg') {
      setIsDraggingPan(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e) => {
    if (isDraggingPan) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }

  const handleMouseUp = () => {
    setIsDraggingPan(false)
  }

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  return (
    <div className={`code-graph-container ${isExpanded ? 'expanded' : ''}`} ref={containerRef}>
      {/* Control Bar */}
      <div className="graph-toolbar">
        <div className="graph-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Filter nodes (e.g., analyze, FastAPI, app.py)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')}>×</button>}
        </div>

        <div className="graph-type-filters">
          {['all', 'file', 'class', 'function', 'import'].map(type => (
            <button
              key={type}
              className={`filter-chip ${activeTypeFilter === type ? 'active' : ''} ${type}`}
              onClick={() => setActiveTypeFilter(type)}
            >
              {type === 'all' ? `All (${nodes.length})` : `${type.charAt(0).toUpperCase() + type.slice(1)}s`}
            </button>
          ))}
        </div>

        <div className="graph-zoom-controls">
          <button onClick={() => setZoom(z => Math.min(z + 0.2, 2.5))}>+</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}>-</button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          <button 
            className="expand-btn" 
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand Fullscreen"}
          >
            {isExpanded ? '⤡ Collapse' : '⤢ Expand'}
          </button>
        </div>
      </div>

      {/* SVG Interactive Canvas */}
      <div
        className="graph-canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg
          className="graph-svg"
          viewBox={`0 0 ${isExpanded ? window.innerWidth - 40 : 800} ${isExpanded ? window.innerHeight - 100 : 520}`}
          id="graph-bg"
        >
          <defs>
            <marker id="arrow-contains" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-calls" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
            <marker id="arrow-imports" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {filteredEdges.map(edge => {
              const srcPos = nodePositions[edge.source]
              const tgtPos = nodePositions[edge.target]
              if (!srcPos || !tgtPos) return null

              const isHighlighted = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)
              const markerId = edge.label === 'calls' ? 'url(#arrow-calls)' : edge.label === 'imports' ? 'url(#arrow-imports)' : 'url(#arrow-contains)'
              const strokeColor = edge.label === 'calls' ? '#34d399' : edge.label === 'imports' ? '#fbbf24' : '#38bdf8'

              return (
                <g key={edge.id}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isHighlighted ? '#a78bfa' : strokeColor}
                    strokeWidth={isHighlighted ? 2.5 : 1.2}
                    strokeOpacity={isHighlighted ? 1 : 0.4}
                    strokeDasharray={edge.label === 'imports' ? '4 3' : 'none'}
                    markerEnd={markerId}
                  />
                </g>
              )
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const pos = nodePositions[node.id] || { x: 400, y: 250 }
              const isSelected = selectedNodeId === node.id
              const colors = NODE_COLORS[node.type] || NODE_COLORS.file

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={`graph-node ${isSelected ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectNode(node)
                  }}
                  cursor="pointer"
                >
                  {/* Pulse ring when selected */}
                  {isSelected && (
                    <circle
                      r="24"
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="3"
                      opacity="0.8"
                      className="node-pulse"
                    />
                  )}

                  <rect
                    x="-65"
                    y="-18"
                    width="130"
                    height="36"
                    rx="18"
                    fill={colors.bg}
                    stroke={isSelected ? '#a78bfa' : colors.border}
                    strokeWidth={isSelected ? 2.5 : 1.2}
                  />

                  {/* Type badge icon */}
                  <text
                    x="-48"
                    y="4"
                    fontSize="11"
                    fontWeight="700"
                    fill={colors.text}
                    textAnchor="middle"
                  >
                    {node.type === 'file' ? '📄' : node.type === 'class' ? '🏛️' : node.type === 'function' ? '⚡' : '📦'}
                  </text>

                  {/* Label */}
                  <text
                    x="-32"
                    y="4"
                    fontSize="11"
                    fontWeight="600"
                    fill="#e2e2e8"
                    textAnchor="start"
                  >
                    {node.label.length > 13 ? node.label.slice(0, 12) + '…' : node.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div className="node-detail-panel">
            <div className="node-detail-header">
              <span className={`node-type-tag ${selectedNode.type}`}>
                {selectedNode.type.toUpperCase()}
              </span>
              <h4>{selectedNode.label}</h4>
              <button className="close-btn" onClick={() => onSelectNode(null)}>×</button>
            </div>
            <div className="node-detail-body">
              <p><strong>File:</strong> {selectedNode.file}</p>
              <p><strong>Line:</strong> L{selectedNode.line}</p>
              {selectedNode.details?.signature && (
                <div className="node-signature">
                  <code>{selectedNode.details.signature}</code>
                </div>
              )}
              {selectedNode.details?.docstring && (
                <div className="node-docstring">
                  <span className="doc-label">Docstring:</span>
                  <p>{selectedNode.details.docstring}</p>
                </div>
              )}
              {selectedNode.details?.params && selectedNode.details.params.length > 0 && (
                <div className="node-params">
                  <span className="doc-label">Parameters:</span>
                  <div className="param-chips">
                    {selectedNode.details.params.map(p => (
                      <span key={p} className="param-chip">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Graph Legend & Status */}
      <div className="graph-footer">
        <div className="graph-legend">
          <span><span className="dot file"></span> File</span>
          <span><span className="dot class"></span> Class</span>
          <span><span className="dot function"></span> Function</span>
          <span><span className="dot import"></span> Import</span>
        </div>
        <div className="graph-stats">
          <span>{filteredNodes.length} Nodes</span>
          <span>•</span>
          <span>{filteredEdges.length} Connections</span>
        </div>
      </div>
    </div>
  )
}
