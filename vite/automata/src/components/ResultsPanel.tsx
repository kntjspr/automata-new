import React, { useState, useMemo } from 'react';
import { type Match } from '../utils/dnaUtils';
import { parseRegexToNFA, describePattern } from '../utils/regexParser';
import MatchSimulator from './MatchSimulator';
import NFAToDFAViz from './NFAToDFAViz';

interface ResultsPanelProps {
    matches: Match[];
    sequence: string;
    pattern: string;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ matches, pattern, sequence }) => {

    // Compute KMP failure function for proper DFA visualization
    const computeFailureFunction = (pat: string): number[] => {
        const failure: number[] = new Array(pat.length).fill(0);
        let j = 0;
        for (let i = 1; i < pat.length; i++) {
            while (j > 0 && pat[i] !== pat[j]) {
                j = failure[j - 1];
            }
            if (pat[i] === pat[j]) {
                j++;
            }
            failure[i] = j;
        }
        return failure;
    };

    // Detect if pattern is a regex with special chars (alternation, quantifiers, anchors, etc)
    const isRegexPattern = (pat: string): boolean => {
        // Match: | * + ? [ ] ( ) ^ $ { }
        return /[|*+?[\]()^${}]/.test(pat);
    };


    // NFA Visualization for regex patterns - now using proper NFA construction
    const NFAViz = () => {
        const [hovered, setHovered] = useState<string | null>(null);

        // Parse the regex and build the NFA graph
        const nfaGraph = useMemo(() => parseRegexToNFA(pattern), [pattern]);

        // Get pattern description for display
        const patternParts = useMemo(() => describePattern(pattern), [pattern]);

        // If parsing failed, show a fallback
        if (!nfaGraph || nfaGraph.states.length === 0) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    border: '2px dashed var(--border-color)',
                    background: 'rgba(0,0,0,0.3)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                    <div>PATTERN PARSE ERROR</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                        Could not parse pattern: "{pattern}"
                    </div>
                </div>
            );
        }

        // Layout the NFA graph using a hierarchical layout
        const nodeRadius = 18;
        const horizontalSpacing = 80;
        const verticalSpacing = 60;
        const startX = 80;
        const startY = 60;

        // Simple layout: assign levels to states based on distance from start
        const levels = new Map<number, number>();
        const positions = new Map<number, { x: number; y: number }>();

        // BFS to assign levels
        const queue: number[] = [nfaGraph.startState];
        levels.set(nfaGraph.startState, 0);

        while (queue.length > 0) {
            const stateId = queue.shift()!;
            const level = levels.get(stateId)!;

            for (const trans of nfaGraph.transitions) {
                if (trans.from === stateId && !levels.has(trans.to)) {
                    levels.set(trans.to, level + 1);
                    queue.push(trans.to);
                }
            }
        }

        // Group states by level
        const statesByLevel = new Map<number, number[]>();
        for (const [stateId, level] of levels) {
            if (!statesByLevel.has(level)) {
                statesByLevel.set(level, []);
            }
            statesByLevel.get(level)!.push(stateId);
        }

        // Assign positions
        const maxLevel = Math.max(...levels.values(), 0);
        const maxStatesPerLevel = Math.max(...Array.from(statesByLevel.values()).map(s => s.length), 1);

        for (const [level, states] of statesByLevel) {
            const levelHeight = states.length * verticalSpacing;
            const startYLevel = startY + (maxStatesPerLevel * verticalSpacing - levelHeight) / 2;

            states.forEach((stateId, idx) => {
                positions.set(stateId, {
                    x: startX + level * horizontalSpacing,
                    y: startYLevel + idx * verticalSpacing + verticalSpacing / 2
                });
            });
        }

        // Calculate SVG dimensions
        const width = startX + (maxLevel + 2) * horizontalSpacing + 100;
        const height = startY + maxStatesPerLevel * verticalSpacing + 60;

        // Get transition path between two states
        const getTransitionPath = (fromId: number, toId: number, transIdx: number) => {
            const from = positions.get(fromId);
            const to = positions.get(toId);
            if (!from || !to) return '';

            // Check if there are multiple transitions between the same pair
            const sameTransitions = nfaGraph.transitions.filter(
                t => (t.from === fromId && t.to === toId) || (t.from === toId && t.to === fromId)
            );
            const offset = sameTransitions.length > 1 ? (transIdx % 2 === 0 ? -15 : 15) : 0;

            if (fromId === toId) {
                // Self-loop
                return `M ${from.x} ${from.y - nodeRadius} 
                        C ${from.x - 30} ${from.y - 50} 
                          ${from.x + 30} ${from.y - 50} 
                          ${from.x} ${from.y - nodeRadius}`;
            }

            // Calculate control point for curved path
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2 + offset;

            if (Math.abs(from.y - to.y) < 5) {
                // Straight horizontal line
                return `M ${from.x + nodeRadius + 2} ${from.y} L ${to.x - nodeRadius - 8} ${to.y}`;
            }

            // Curved path
            return `M ${from.x + nodeRadius} ${from.y} Q ${midX} ${midY + offset * 2} ${to.x - nodeRadius - 8} ${to.y}`;
        };

        return (
            <div style={{ position: 'relative' }}>
                <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '10px' }}>
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        style={{
                            width: Math.max(width, 650),
                            height: Math.max(height, 200),
                            minWidth: '100%',
                            display: 'block'
                        }}
                    >
                        <defs>
                            <marker id="arrowNFA" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--accent-acid)" />
                            </marker>
                            <marker id="arrowEpsilon" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--accent-cyan)" />
                            </marker>
                            <marker id="arrowStartNFA" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                                <polygon points="0 0, 8 4, 0 8" fill="var(--accent-cyan)" />
                            </marker>
                            <filter id="acceptGlowNFA" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feFlood floodColor="#ccff00" floodOpacity="0.6" />
                                <feComposite in2="blur" operator="in" />
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Title */}
                        <text x="10" y="18" fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-mono)">
                            NFA FOR PATTERN: "{pattern.length > 40 ? pattern.substring(0, 37) + '...' : pattern}"
                        </text>

                        {/* Pattern breakdown */}
                        <text x="10" y="32" fill="var(--text-secondary)" fontSize="9" fontFamily="var(--font-mono)">
                            Components: {patternParts.slice(0, 8).join(' ')}
                            {patternParts.length > 8 ? '...' : ''}
                        </text>

                        {/* Legend */}
                        <g transform={`translate(${width - 220}, 8)`}>
                            <line x1="0" y1="5" x2="20" y2="5" stroke="var(--accent-acid)" strokeWidth="2" />
                            <text x="25" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">Transition</text>
                            <line x1="100" y1="5" x2="120" y2="5" stroke="var(--accent-cyan)" strokeWidth="2" strokeDasharray="4,2" />
                            <text x="125" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">ε-move</text>
                        </g>

                        {/* Draw transitions */}
                        {nfaGraph.transitions.map((trans, idx) => {
                            const path = getTransitionPath(trans.from, trans.to, idx);
                            const from = positions.get(trans.from);
                            const to = positions.get(trans.to);
                            const isHovered = hovered === `trans-${idx}`;

                            if (!from || !to || !path) return null;

                            const midX = (from.x + to.x) / 2;
                            const midY = (from.y + to.y) / 2 - 15;

                            return (
                                <g
                                    key={`trans-${idx}`}
                                    onMouseEnter={() => setHovered(`trans-${idx}`)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{ cursor: 'pointer' }}
                                    opacity={hovered && !isHovered ? 0.3 : 1}
                                >
                                    <path
                                        d={path}
                                        fill="none"
                                        stroke={trans.isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                        strokeWidth={isHovered ? 3 : 2}
                                        strokeDasharray={trans.isEpsilon ? '5,3' : 'none'}
                                        markerEnd={trans.isEpsilon ? 'url(#arrowEpsilon)' : 'url(#arrowNFA)'}
                                    />
                                    {/* Transition label */}
                                    {trans.symbol !== 'ε' && (
                                        <>
                                            <rect
                                                x={midX - 12}
                                                y={midY - 10}
                                                width={Math.max(24, trans.symbol.length * 7)}
                                                height="16"
                                                fill="black"
                                                stroke={trans.isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                                strokeWidth="1"
                                                rx="3"
                                            />
                                            <text
                                                x={midX}
                                                y={midY + 2}
                                                textAnchor="middle"
                                                fill={trans.isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                                fontSize="10"
                                                fontWeight="bold"
                                                fontFamily="var(--font-mono)"
                                            >
                                                {trans.symbol.length > 6 ? trans.symbol.substring(0, 5) + '…' : trans.symbol}
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        })}

                        {/* Draw states */}
                        {nfaGraph.states.map((state) => {
                            const pos = positions.get(state.id);
                            if (!pos) return null;

                            const isStart = state.isStart;
                            const isAccept = state.isAccept;
                            const isHovered = hovered === `state-${state.id}`;

                            return (
                                <g key={`state-${state.id}`}>
                                    {/* Start arrow */}
                                    {isStart && (
                                        <>
                                            <line
                                                x1={pos.x - 45}
                                                y1={pos.y}
                                                x2={pos.x - nodeRadius - 5}
                                                y2={pos.y}
                                                stroke="var(--accent-cyan)"
                                                strokeWidth="2"
                                                markerEnd="url(#arrowStartNFA)"
                                            />
                                            <text
                                                x={pos.x - 48}
                                                y={pos.y - 8}
                                                fill="var(--accent-cyan)"
                                                fontSize="8"
                                                fontFamily="var(--font-mono)"
                                            >
                                                START
                                            </text>
                                        </>
                                    )}

                                    {/* State circle */}
                                    <g
                                        onMouseEnter={() => setHovered(`state-${state.id}`)}
                                        onMouseLeave={() => setHovered(null)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {/* Double circle for accept state */}
                                        {isAccept && (
                                            <circle
                                                cx={pos.x}
                                                cy={pos.y}
                                                r={nodeRadius + 5}
                                                fill="none"
                                                stroke="var(--accent-acid)"
                                                strokeWidth="2"
                                                filter="url(#acceptGlowNFA)"
                                            />
                                        )}
                                        <circle
                                            cx={pos.x}
                                            cy={pos.y}
                                            r={isHovered ? nodeRadius + 2 : nodeRadius}
                                            fill={isAccept ? 'rgba(204,255,0,0.15)' : 'rgba(0,0,0,0.9)'}
                                            stroke={isAccept ? 'var(--accent-acid)' : isStart ? 'var(--accent-cyan)' : 'var(--text-primary)'}
                                            strokeWidth={isAccept ? 3 : 2}
                                        />
                                        <text
                                            x={pos.x}
                                            y={pos.y + 4}
                                            textAnchor="middle"
                                            fill={isAccept ? 'var(--accent-acid)' : 'white'}
                                            fontSize="10"
                                            fontWeight="bold"
                                            fontFamily="var(--font-mono)"
                                        >
                                            {state.label}
                                        </text>
                                    </g>
                                </g>
                            );
                        })}

                        {/* Stats overlay */}
                        <text x={width - 120} y={height - 10} fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                            States: {nfaGraph.states.length} | δ: {nfaGraph.transitions.length}
                        </text>
                    </svg>

                    {/* Tooltip */}
                    {hovered && (
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            background: 'rgba(0, 0, 0, 0.95)',
                            border: '1px solid var(--accent-cyan)',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            color: 'white',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}>
                            {hovered.startsWith('state-') && (() => {
                                const stateId = parseInt(hovered.split('-')[1]);
                                const state = nfaGraph.states.find(s => s.id === stateId);
                                if (!state) return null;
                                return (
                                    <>
                                        <div style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>
                                            STATE {state.label}
                                            {state.isStart ? ' (START)' : ''}
                                            {state.isAccept ? ' (ACCEPT)' : ''}
                                        </div>
                                        <div>
                                            Incoming: {nfaGraph.transitions.filter(t => t.to === stateId).length} |
                                            Outgoing: {nfaGraph.transitions.filter(t => t.from === stateId).length}
                                        </div>
                                    </>
                                );
                            })()}
                            {hovered.startsWith('trans-') && (() => {
                                const transIdx = parseInt(hovered.split('-')[1]);
                                const trans = nfaGraph.transitions[transIdx];
                                if (!trans) return null;
                                return (
                                    <>
                                        <div style={{ color: trans.isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)', fontWeight: 'bold' }}>
                                            {trans.isEpsilon ? 'ε-TRANSITION' : 'TRANSITION'}
                                        </div>
                                        <div>
                                            q{trans.from} → q{trans.to}
                                            {!trans.isEpsilon && ` on '${trans.symbol}'`}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        );
    };


    // Enhanced Automaton Visualization with Failure Transitions (for simple patterns)
    const DFAViz = () => {
        const [hovered, setHovered] = useState<string | null>(null);

        const cleanPattern = pattern.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const displayPattern = cleanPattern.substring(0, 6); // Limit for visual clarity
        const states = displayPattern.length + 1;
        const failure = computeFailureFunction(displayPattern);

        // SVG dimensions
        const nodeRadius = 32;
        const spacing = 120;
        const startX = 100;
        const centerY = 100;
        const width = startX + states * spacing + 60;
        const height = 240;

        // Get failure target for state i (where to go on mismatch)
        const getFailureTarget = (stateIndex: number): number => {
            if (stateIndex === 0) return 0; // q0 loops to itself
            return failure[stateIndex - 1];
        };

        return (
            <div style={{ position: 'relative' }}>
                <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '10px' }}>
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        style={{
                            width: Math.max(width, 500),
                            height: height,
                            minWidth: '100%',
                            display: 'block'
                        }}
                    >
                        <defs>
                            {/* Success arrow (green) */}
                            <marker id="arrowSuccess" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-acid)" />
                            </marker>
                            {/* Failure arrow (red/pink) */}
                            <marker id="arrowFailure" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="var(--accent-punk)" />
                            </marker>
                            {/* Start arrow */}
                            <marker id="arrowStart" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                                <polygon points="0 0, 8 4, 0 8" fill="var(--accent-cyan)" />
                            </marker>
                            {/* Glow filter for accept state */}
                            <filter id="acceptGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feFlood floodColor="#ccff00" floodOpacity="0.6" />
                                <feComposite in2="blur" operator="in" />
                                <feMerge>
                                    <feMergeNode />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Title */}
                        <text x="10" y="18" fill="var(--text-muted)" fontSize="11" fontFamily="var(--font-mono)">
                            DFA FOR PATTERN: "{displayPattern}"
                        </text>

                        {/* Legend */}
                        <g transform={`translate(${width - 180}, 8)`}>
                            <line x1="0" y1="5" x2="20" y2="5" stroke="var(--accent-acid)" strokeWidth="2" />
                            <text x="25" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">Match</text>
                            <line x1="70" y1="5" x2="90" y2="5" stroke="var(--accent-punk)" strokeWidth="2" strokeDasharray="4,2" />
                            <text x="95" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">Fail</text>
                        </g>

                        {/* Start indicator arrow */}
                        <line
                            x1={startX - 55} y1={centerY}
                            x2={startX - nodeRadius - 5} y2={centerY}
                            stroke="var(--accent-cyan)"
                            strokeWidth="3"
                            markerEnd="url(#arrowStart)"
                        />
                        <text x={startX - 60} y={centerY - 12} fill="var(--accent-cyan)" fontSize="10" fontFamily="var(--font-mono)">
                            START
                        </text>

                        {/* Draw failure transitions (curved arrows going back) */}
                        {Array.from({ length: states }).map((_, i) => {
                            if (i === 0) return null; // q0 has self-loop handled separately

                            const failTarget = getFailureTarget(i);
                            const x1 = startX + i * spacing;
                            const x2 = startX + failTarget * spacing;
                            const y = centerY;

                            // Skip if failure goes to same state (shouldn't happen except q0)
                            if (i === failTarget) return null;

                            // Calculate curve control points
                            const midX = (x1 + x2) / 2;
                            const curveHeight = 45 + (i - failTarget) * 12; // Deeper curve for longer jumps
                            const isHovered = hovered === `fail-${i}`;
                            // Label shows what character was EXPECTED but not received
                            // From state i, we expected displayPattern[i] to advance to state i+1
                            const expectedChar = i < displayPattern.length ? displayPattern[i] : displayPattern[i - 1];
                            const labelText = `!${expectedChar}`;

                            return (
                                <g
                                    key={`fail-${i}`}
                                    onMouseEnter={() => setHovered(`fail-${i}`)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                    opacity={isHovered || !hovered ? 1 : 0.3}
                                >
                                    <path
                                        d={`M ${x1} ${y + nodeRadius + 3} 
                                            Q ${midX} ${y + nodeRadius + curveHeight} 
                                            ${x2 + nodeRadius + 8} ${y + nodeRadius + 3}`}
                                        fill="none"
                                        stroke="var(--accent-punk)"
                                        strokeWidth={isHovered ? 3 : 1.5}
                                        strokeDasharray={isHovered ? "none" : "5,3"}
                                        markerEnd="url(#arrowFailure)"
                                    />
                                    {/* Label Background */}
                                    <rect
                                        x={midX - 12}
                                        y={y + nodeRadius + curveHeight - 14}
                                        width={24}
                                        height={16}
                                        fill="#2a0a1a"
                                        stroke="var(--accent-punk)"
                                        strokeWidth="1"
                                        rx="4"
                                    />
                                    {/* Failure label */}
                                    <text
                                        x={midX}
                                        y={y + nodeRadius + curveHeight - 3}
                                        textAnchor="middle"
                                        fill="var(--accent-punk)"
                                        fontSize={isHovered ? "12" : "10"}
                                        fontWeight="bold"
                                        fontFamily="var(--font-mono)"
                                    >
                                        {labelText}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Self-loop for q0 (on any non-matching character) */}
                        <g
                            onMouseEnter={() => setHovered('fail-0')}
                            onMouseLeave={() => setHovered(null)}
                            style={{ cursor: 'pointer' }}
                            opacity={hovered === 'fail-0' || !hovered ? 1 : 0.4}
                        >
                            <path
                                d={`M ${startX - nodeRadius} ${centerY - 15}
                                    C ${startX - nodeRadius - 40} ${centerY - 60}
                                      ${startX - nodeRadius - 40} ${centerY + 60}
                                      ${startX - nodeRadius} ${centerY + 15}`}
                                fill="none"
                                stroke="var(--accent-punk)"
                                strokeWidth={hovered === 'fail-0' ? 3 : 1.5}
                                strokeDasharray="4,2"
                                markerEnd="url(#arrowFailure)"
                            />
                            <rect
                                x={startX - nodeRadius - 55}
                                y={centerY - 8}
                                width={26}
                                height={16}
                                fill="#2a0a1a"
                                stroke="var(--accent-punk)"
                                strokeWidth="1"
                                rx="4"
                            />
                            <text
                                x={startX - nodeRadius - 42}
                                y={centerY + 4}
                                textAnchor="middle"
                                fill="var(--accent-punk)"
                                fontSize="10"
                                fontWeight="bold"
                                fontFamily="var(--font-mono)"
                            >
                                {/* q0 self-loop: anything that's not the first expected character */}
                                !{displayPattern[0] || '?'}
                            </text>
                        </g>

                        {/* Draw success transitions (straight arrows going forward) */}
                        {Array.from({ length: displayPattern.length }).map((_, i) => {
                            const x1 = startX + i * spacing;
                            const x2 = startX + (i + 1) * spacing;
                            const y = centerY;
                            const isHovered = hovered === `trans-${i}`;

                            return (
                                <g
                                    key={`trans-${i}`}
                                    onMouseEnter={() => setHovered(`trans-${i}`)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{ cursor: 'pointer' }}
                                    opacity={isHovered || !hovered ? 1 : 0.3}
                                >
                                    {/* Transition line */}
                                    <line
                                        x1={x1 + nodeRadius + 3}
                                        y1={y}
                                        x2={x2 - nodeRadius - 12}
                                        y2={y}
                                        stroke="var(--accent-acid)"
                                        strokeWidth={isHovered ? 4 : 3}
                                        markerEnd="url(#arrowSuccess)"
                                    />
                                    {/* Transition label box */}
                                    <rect
                                        x={(x1 + x2) / 2 - 16}
                                        y={y - 28}
                                        width="32"
                                        height="20"
                                        fill="black"
                                        stroke="var(--accent-acid)"
                                        strokeWidth={isHovered ? 3 : 2}
                                        rx="2"
                                    />
                                    {/* Transition character */}
                                    <text
                                        x={(x1 + x2) / 2}
                                        y={y - 13}
                                        textAnchor="middle"
                                        fill="var(--accent-acid)"
                                        fontSize={isHovered ? "16" : "14"}
                                        fontWeight="bold"
                                        fontFamily="var(--font-mono)"
                                    >
                                        {displayPattern[i]}
                                    </text>
                                </g>
                            );
                        })}

                        {/* Draw states */}
                        {Array.from({ length: states }).map((_, i) => {
                            const x = startX + i * spacing;
                            const y = centerY;
                            const isStart = i === 0;
                            const isAccept = i === displayPattern.length;
                            const isHovered = hovered === `state-${i}`;

                            return (
                                <g
                                    key={`state-${i}`}
                                    onMouseEnter={() => setHovered(`state-${i}`)}
                                    onMouseLeave={() => setHovered(null)}
                                    style={{ cursor: 'pointer' }}
                                    opacity={isHovered || !hovered ? 1 : 0.6}
                                >
                                    {/* Outer circle for accept state */}
                                    {isAccept && (
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={nodeRadius + 6}
                                            fill="none"
                                            stroke="var(--accent-acid)"
                                            strokeWidth="3"
                                            filter="url(#acceptGlow)"
                                        />
                                    )}

                                    {/* Main state circle */}
                                    <circle
                                        cx={x}
                                        cy={y}
                                        r={isHovered ? nodeRadius + 2 : nodeRadius}
                                        fill={isAccept ? 'rgba(204,255,0,0.2)' : 'rgba(0,0,0,0.9)'}
                                        stroke={isAccept ? 'var(--accent-acid)' : isStart ? 'var(--accent-cyan)' : 'var(--text-primary)'}
                                        strokeWidth={isAccept ? 4 : 2}
                                        style={{ transition: 'r 0.2s' }}
                                    />

                                    {/* State label (inside circle) */}
                                    <text
                                        x={x}
                                        y={y + 5}
                                        textAnchor="middle"
                                        fill={isAccept ? 'var(--accent-acid)' : 'white'}
                                        fontSize={isHovered ? "20" : "16"}
                                        fontWeight="bold"
                                        fontFamily="var(--font-mono)"
                                    >
                                        q{i}
                                    </text>

                                    {/* State description below */}
                                    <text
                                        x={x}
                                        y={y + nodeRadius + 25}
                                        textAnchor="middle"
                                        fill={isAccept ? 'var(--accent-acid)' : isStart ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                                        fontSize="10"
                                        fontFamily="var(--font-mono)"
                                        fontWeight={isHovered ? "bold" : "normal"}
                                    >
                                        {isAccept ? 'ACCEPT' : isStart ? 'INITIAL' : `STATE_${i}`}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    {/* Tooltip Overlay */}
                    {hovered && (
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            background: 'rgba(0, 0, 0, 0.9)',
                            border: '1px solid var(--accent-cyan)',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            color: 'white',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            pointerEvents: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }}>
                            {hovered.startsWith('state-') && (
                                <>
                                    <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>STATE q{hovered.split('-')[1]}</div>
                                    <div>Prefix: "{hovered.split('-')[1] === '0' ? 'ε' : displayPattern.substring(0, parseInt(hovered.split('-')[1]))}"</div>
                                </>
                            )}
                            {hovered.startsWith('trans-') && (
                                <>
                                    <div style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>MATCH TRANSITION</div>
                                    <div>q{hovered.split('-')[1]} → q{parseInt(hovered.split('-')[1]) + 1} on '{displayPattern[parseInt(hovered.split('-')[1])]}'</div>
                                </>
                            )}
                            {hovered.startsWith('fail-') && (
                                <>
                                    <div style={{ color: 'var(--accent-punk)', fontWeight: 'bold' }}>FAILURE TRANSITION</div>
                                    <div>q{hovered.split('-')[1]} → q{getFailureTarget(parseInt(hovered.split('-')[1]))} on mismatch</div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Main AutomatonViz - chooses between NFA and DFA based on pattern type
    const AutomatonViz = () => {
        if (!pattern) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9rem',
                    border: '2px dashed var(--border-color)',
                    background: 'rgba(0,0,0,0.3)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div>
                    <div>AWAITING PATTERN INPUT</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                        Enter a pattern to visualize the automaton
                    </div>
                </div>
            );
        }

        // Use NFA visualization for patterns with alternation (|)
        if (isRegexPattern(pattern)) {
            return <NFAViz />;
        }

        // Use DFA visualization for simple patterns
        return <DFAViz />;
    };

    // DFA Statistics
    const DFAStats = () => {
        const cleanPattern = pattern ? pattern.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : '';
        const states = cleanPattern.length + 1;
        const successTransitions = cleanPattern.length;
        const failureTransitions = cleanPattern.length; // Each non-initial state has a failure link
        const alphabet = [...new Set(cleanPattern.split(''))].sort();

        if (!pattern) return null;

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '1px',
                background: 'var(--border-color)',
                border: '1px solid var(--border-color)',
                marginTop: '1rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)'
            }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>STATES</div>
                    <div style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem', fontWeight: 'bold' }}>{states}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>MATCH δ</div>
                    <div style={{ color: 'var(--accent-acid)', fontSize: '1.1rem', fontWeight: 'bold' }}>{successTransitions}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>FAIL δ</div>
                    <div style={{ color: 'var(--accent-punk)', fontSize: '1.1rem', fontWeight: 'bold' }}>{failureTransitions}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Σ</div>
                    <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 'bold' }}>{alphabet.length > 0 ? alphabet.join(',') : '-'}</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>FOUND</div>
                    <div style={{ color: matches.length > 0 ? 'var(--accent-acid)' : 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 'bold' }}>{matches.length}</div>
                </div>
            </div>
        );
    };

    // Visualization mode tabs
    type VizMode = 'automaton' | 'simulation' | 'conversion';
    const [vizMode, setVizMode] = useState<VizMode>('automaton');

    // NFA to DFA Conversion Display
    const NFAtoDFAConversion = () => {
        if (!pattern || !isRegexPattern(pattern)) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    border: '2px dashed var(--border-color)',
                    background: 'rgba(0,0,0,0.3)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                    <div>NFA → DFA CONVERSION</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                        Use a regex pattern (with |, *, +, etc.) to see NFA to DFA conversion
                    </div>
                </div>
            );
        }

        const nfaGraph = parseRegexToNFA(pattern);
        if (!nfaGraph) return null;

        // Subset construction simulation (simplified for display)
        const epsilonClosure = (states: Set<number>): Set<number> => {
            const closure = new Set(states);
            const stack = [...states];
            while (stack.length > 0) {
                const s = stack.pop()!;
                nfaGraph.transitions
                    .filter(t => t.from === s && t.isEpsilon)
                    .forEach(t => {
                        if (!closure.has(t.to)) {
                            closure.add(t.to);
                            stack.push(t.to);
                        }
                    });
            }
            return closure;
        };

        const move = (states: Set<number>, symbol: string): Set<number> => {
            const result = new Set<number>();
            states.forEach(s => {
                nfaGraph.transitions
                    .filter(t => t.from === s && t.symbol === symbol && !t.isEpsilon)
                    .forEach(t => result.add(t.to));
            });
            return result;
        };

        // Get unique symbols
        const symbols = [...new Set(
            nfaGraph.transitions
                .filter(t => !t.isEpsilon)
                .map(t => t.symbol)
        )].sort();

        // Build DFA states (simplified - first few states)
        const startClosure = epsilonClosure(new Set([nfaGraph.startState]));
        const dfaStates: { nfaStates: Set<number>; label: string }[] = [
            { nfaStates: startClosure, label: 'D0' }
        ];

        // Build a few more DFA states for display
        symbols.forEach(sym => {
            const reached = epsilonClosure(move(startClosure, sym));
            if (reached.size > 0) {
                dfaStates.push({ nfaStates: reached, label: `D${dfaStates.length}` });
            }
        });

        return (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                <div style={{
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(0,255,255,0.1)',
                    border: '1px solid var(--accent-cyan)'
                }}>
                    <strong style={{ color: 'var(--accent-cyan)' }}>Subset Construction:</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        Each DFA state = set of NFA states reachable via ε-closure
                    </span>
                </div>

                {/* Subset table */}
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: 'rgba(0,0,0,0.3)'
                }}>
                    <thead>
                        <tr style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <th style={{
                                padding: '0.5rem',
                                textAlign: 'left',
                                color: 'var(--accent-acid)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>DFA State</th>
                            <th style={{
                                padding: '0.5rem',
                                textAlign: 'left',
                                color: 'var(--accent-cyan)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>NFA States (ε-closure)</th>
                            <th style={{
                                padding: '0.5rem',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                borderBottom: '1px solid var(--border-color)'
                            }}>Accepting?</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dfaStates.map((dState, i) => {
                            const isAccepting = [...dState.nfaStates].some(s =>
                                nfaGraph.acceptStates.includes(s)
                            );
                            return (
                                <tr key={i} style={{
                                    background: isAccepting ? 'rgba(204,255,0,0.1)' : 'transparent'
                                }}>
                                    <td style={{
                                        padding: '0.5rem',
                                        color: 'var(--accent-acid)',
                                        fontWeight: 'bold'
                                    }}>{dState.label}</td>
                                    <td style={{
                                        padding: '0.5rem',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {'{'}{[...dState.nfaStates].map(s => `q${s}`).join(', ')}{'}'}
                                    </td>
                                    <td style={{
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        color: isAccepting ? 'var(--accent-acid)' : 'var(--text-muted)'
                                    }}>
                                        {isAccepting ? '✓ Yes' : 'No'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(204,255,0,0.1)',
                    border: '1px solid var(--accent-acid)',
                    fontSize: '0.75rem'
                }}>
                    <strong style={{ color: 'var(--accent-acid)' }}>Summary:</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                        NFA has {nfaGraph.states.length} states → DFA has {dfaStates.length}+ states
                        (showing first {dfaStates.length} reachable from start)
                    </span>
                </div>
            </div>
        );
    };

    return (
        <section style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem', padding: '1rem' }}>
            {/* Visualization Mode Tabs */}
            <div style={{
                display: 'flex',
                gap: '0',
                borderBottom: '2px solid var(--border-color)',
                marginBottom: '0.5rem'
            }}>
                {[
                    { id: 'automaton' as VizMode, label: '⚙️ PATTERN AUTOMATON', desc: isRegexPattern(pattern) ? 'NFA' : 'DFA' },
                    { id: 'simulation' as VizMode, label: '▶️ MATCH SIMULATION', desc: 'STEP-BY-STEP' },
                    { id: 'conversion' as VizMode, label: '🔄 NFA → DFA', desc: 'SUBSET CONST.' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setVizMode(tab.id)}
                        style={{
                            padding: '0.75rem 1rem',
                            background: vizMode === tab.id ? 'var(--accent-acid)' : 'transparent',
                            border: 'none',
                            color: vizMode === tab.id ? 'black' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: vizMode === tab.id ? 700 : 400,
                            borderBottom: vizMode === tab.id ? 'none' : '2px solid transparent',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.2rem'
                        }}
                    >
                        <span>{tab.label}</span>
                        <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>[{tab.desc}]</span>
                    </button>
                ))}
            </div>

            {/* Automaton Visualization Section */}
            {vizMode === 'automaton' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.5rem',
                        fontFamily: 'var(--font-mono)'
                    }}>
                        {pattern && (isRegexPattern(pattern) ? 'NFA WITH ε-TRANSITIONS (REGEX)' : 'DFA WITH FAILURE LINKS (KMP)')}
                    </div>

                    <div style={{
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.8) 100%)',
                        padding: '1rem',
                        border: '2px solid var(--border-color)',
                        borderRadius: '0'
                    }}>
                        <AutomatonViz />
                    </div>

                    <DFAStats />
                </div>
            )}

            {/* Match Simulation Section */}
            {vizMode === 'simulation' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <MatchSimulator
                        sequence={sequence}
                        pattern={pattern}
                        matches={matches}
                    />
                </div>
            )}

            {/* NFA to DFA Conversion Section */}
            {vizMode === 'conversion' && (
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <NFAToDFAViz pattern={pattern} />
                </div>
            )}

            {/* Match Log Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h2 style={{ fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0' }}>
                    <span style={{ color: 'var(--accent-punk)' }}></span> MATCH LOG
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>
                        [{matches.length} RESULT{matches.length !== 1 ? 'S' : ''}]
                    </span>
                </h2>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.5rem',
                    border: '1px solid var(--border-color)'
                }}>
                    {matches.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>
                            &gt; NO MATCHES DETECTED<br />
                            &gt; AWAITING SEARCH EXECUTION...<br />
                            &gt; SEQUENCE LENGTH: {sequence?.length || 0}
                        </div>
                    ) : (
                        matches.map((m, i) => (
                            <div key={i} style={{
                                marginBottom: '0.75rem',
                                borderLeft: '3px solid var(--accent-cyan)',
                                paddingLeft: '0.75rem',
                                paddingTop: '0.25rem',
                                paddingBottom: '0.25rem',
                                background: 'rgba(0,255,255,0.03)'
                            }}>
                                <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                                    MATCH_{i.toString().padStart(3, '0')}
                                </div>
                                <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <span>POS: <span style={{ color: 'white' }}>{m.start}</span>-<span style={{ color: 'white' }}>{m.end}</span></span>
                                    <span>LEN: <span style={{ color: 'white' }}>{m.end - m.start}</span></span>
                                    <span>ERR: <span style={{ color: m.distance > 0 ? 'var(--accent-punk)' : 'var(--accent-acid)' }}>{m.distance}</span></span>
                                </div>
                                <div style={{ color: 'var(--accent-acid)', wordBreak: 'break-all', marginTop: '0.25rem' }}>
                                    → {m.text}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default ResultsPanel;
