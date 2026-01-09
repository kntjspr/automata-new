import React, { useState, useMemo } from 'react';
import {
    getRNACFG,
    cfgToPDA,
    getConversionSteps,
    type CFGGrammar,
    type PDADefinition,
    type ConversionStep
} from '../utils/pdaUtils';

interface CFGToPDAVizProps { }

const CFGToPDAViz: React.FC<CFGToPDAVizProps> = () => {
    const [activeStep, setActiveStep] = useState<number | null>(null);
    const [hoveredElement, setHoveredElement] = useState<string | null>(null);

    // Get CFG, convert to PDA, and get steps
    const { grammar, pda, steps } = useMemo(() => {
        const grammar = getRNACFG();
        const pda = cfgToPDA(grammar);
        const steps = getConversionSteps(grammar);
        return { grammar, pda, steps };
    }, []);

    // PDA Visualization using SVG (similar to existing NFAViz)
    const PDADiagram = ({ pda, grammar }: { pda: PDADefinition; grammar: CFGGrammar }) => {
        const nodeRadius = 35;
        const spacing = 180;
        const startX = 100;
        const centerY = 120;
        const width = startX + (pda.states.length) * spacing + 100;
        const height = 280;

        // Position states horizontally
        const positions = new Map<string, { x: number; y: number }>();
        pda.states.forEach((state, idx) => {
            positions.set(state, { x: startX + idx * spacing, y: centerY });
        });

        return (
            <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '10px' }}>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    style={{
                        width: Math.max(width, 600),
                        height: height,
                        minWidth: '100%',
                        display: 'block'
                    }}
                >
                    <defs>
                        <marker id="arrowPDA" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="var(--accent-acid)" />
                        </marker>
                        <marker id="arrowPDAEpsilon" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="var(--accent-cyan)" />
                        </marker>
                        <marker id="arrowPDAStart" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                            <polygon points="0 0, 8 4, 0 8" fill="var(--accent-cyan)" />
                        </marker>
                        <filter id="acceptGlowPDA" x="-50%" y="-50%" width="200%" height="200%">
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
                        PDA FOR: {grammar.name}
                    </text>

                    {/* Legend */}
                    <g transform={`translate(${width - 280}, 8)`}>
                        <line x1="0" y1="5" x2="20" y2="5" stroke="var(--accent-acid)" strokeWidth="2" />
                        <text x="25" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">Input transition</text>
                        <line x1="130" y1="5" x2="150" y2="5" stroke="var(--accent-cyan)" strokeWidth="2" strokeDasharray="4,2" />
                        <text x="155" y="8" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">ε-transition</text>
                    </g>

                    {/* Start arrow */}
                    <line
                        x1={startX - 60}
                        y1={centerY}
                        x2={startX - nodeRadius - 5}
                        y2={centerY}
                        stroke="var(--accent-cyan)"
                        strokeWidth="3"
                        markerEnd="url(#arrowPDAStart)"
                    />
                    <text x={startX - 65} y={centerY - 12} fill="var(--accent-cyan)" fontSize="10" fontFamily="var(--font-mono)">
                        START
                    </text>

                    {/* Draw transitions */}
                    {pda.transitions.map((trans, idx) => {
                        const from = positions.get(trans.from);
                        const to = positions.get(trans.to);
                        if (!from || !to) return null;

                        const isEpsilon = trans.input === 'ε';
                        const isHovered = hoveredElement === `trans-${idx}`;
                        const isSelfLoop = trans.from === trans.to;

                        // Build label
                        const pushStr = trans.push.length === 0 ? 'ε' : trans.push.join('');
                        const label = `${trans.input}, ${trans.pop}→${pushStr}`;

                        if (isSelfLoop) {
                            // Self-loop on q_loop - position above state
                            const loopOffset = idx * 12; // Offset for multiple self-loops
                            return (
                                <g
                                    key={`trans-${idx}`}
                                    onMouseEnter={() => setHoveredElement(`trans-${idx}`)}
                                    onMouseLeave={() => setHoveredElement(null)}
                                    style={{ cursor: 'pointer' }}
                                    opacity={hoveredElement && !isHovered ? 0.3 : 1}
                                >
                                    <path
                                        d={`M ${from.x - 15} ${from.y - nodeRadius - 3}
                                            C ${from.x - 50} ${from.y - 80 - loopOffset}
                                              ${from.x + 50} ${from.y - 80 - loopOffset}
                                              ${from.x + 15} ${from.y - nodeRadius - 3}`}
                                        fill="none"
                                        stroke={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                        strokeWidth={isHovered ? 3 : 2}
                                        strokeDasharray={isEpsilon ? '5,3' : 'none'}
                                        markerEnd={isEpsilon ? 'url(#arrowPDAEpsilon)' : 'url(#arrowPDA)'}
                                    />
                                    {/* Label for self-loop */}
                                    {isHovered && (
                                        <>
                                            <rect
                                                x={from.x - 45}
                                                y={from.y - 95 - loopOffset}
                                                width={90}
                                                height={18}
                                                fill="black"
                                                stroke={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                                strokeWidth="1"
                                                rx="3"
                                            />
                                            <text
                                                x={from.x}
                                                y={from.y - 82 - loopOffset}
                                                textAnchor="middle"
                                                fill={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                                fontSize="10"
                                                fontWeight="bold"
                                                fontFamily="var(--font-mono)"
                                            >
                                                {label}
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        }

                        // Regular transition between states
                        const midX = (from.x + to.x) / 2;
                        const midY = (from.y + to.y) / 2 - 20;

                        return (
                            <g
                                key={`trans-${idx}`}
                                onMouseEnter={() => setHoveredElement(`trans-${idx}`)}
                                onMouseLeave={() => setHoveredElement(null)}
                                style={{ cursor: 'pointer' }}
                                opacity={hoveredElement && !isHovered ? 0.3 : 1}
                            >
                                <line
                                    x1={from.x + nodeRadius + 3}
                                    y1={from.y}
                                    x2={to.x - nodeRadius - 10}
                                    y2={to.y}
                                    stroke={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                    strokeWidth={isHovered ? 4 : 2}
                                    strokeDasharray={isEpsilon ? '5,3' : 'none'}
                                    markerEnd={isEpsilon ? 'url(#arrowPDAEpsilon)' : 'url(#arrowPDA)'}
                                />
                                <rect
                                    x={midX - 50}
                                    y={midY - 10}
                                    width={100}
                                    height={18}
                                    fill="black"
                                    stroke={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                    strokeWidth="1"
                                    rx="3"
                                />
                                <text
                                    x={midX}
                                    y={midY + 3}
                                    textAnchor="middle"
                                    fill={isEpsilon ? 'var(--accent-cyan)' : 'var(--accent-acid)'}
                                    fontSize="10"
                                    fontWeight="bold"
                                    fontFamily="var(--font-mono)"
                                >
                                    {label}
                                </text>
                            </g>
                        );
                    })}

                    {/* Draw states */}
                    {pda.states.map((state) => {
                        const pos = positions.get(state);
                        if (!pos) return null;

                        const isStart = state === pda.startState;
                        const isAccept = state === pda.acceptState;
                        const isHovered = hoveredElement === `state-${state}`;

                        return (
                            <g
                                key={`state-${state}`}
                                onMouseEnter={() => setHoveredElement(`state-${state}`)}
                                onMouseLeave={() => setHoveredElement(null)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Double circle for accept state */}
                                {isAccept && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={nodeRadius + 6}
                                        fill="none"
                                        stroke="var(--accent-acid)"
                                        strokeWidth="3"
                                        filter="url(#acceptGlowPDA)"
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
                                    y={pos.y + 5}
                                    textAnchor="middle"
                                    fill={isAccept ? 'var(--accent-acid)' : 'white'}
                                    fontSize="12"
                                    fontWeight="bold"
                                    fontFamily="var(--font-mono)"
                                >
                                    {state}
                                </text>
                                {/* State label below */}
                                <text
                                    x={pos.x}
                                    y={pos.y + nodeRadius + 20}
                                    textAnchor="middle"
                                    fill={isAccept ? 'var(--accent-acid)' : isStart ? 'var(--accent-cyan)' : 'var(--text-muted)'}
                                    fontSize="9"
                                    fontFamily="var(--font-mono)"
                                >
                                    {isAccept ? 'ACCEPT' : isStart ? 'INITIAL' : 'LOOP'}
                                </text>
                            </g>
                        );
                    })}

                    {/* Transition count */}
                    <text x={width - 150} y={height - 10} fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-mono)">
                        States: {pda.states.length} | Transitions: {pda.transitions.length}
                    </text>
                </svg>

                {/* Tooltip for hovered transition */}
                {hoveredElement?.startsWith('trans-') && (
                    <div style={{
                        position: 'absolute',
                        bottom: '15px',
                        right: '15px',
                        background: 'rgba(0, 0, 0, 0.95)',
                        border: '1px solid var(--accent-cyan)',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        color: 'white',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        zIndex: 10
                    }}>
                        {(() => {
                            const idx = parseInt(hoveredElement.split('-')[1]);
                            const trans = pda.transitions[idx];
                            if (!trans) return null;
                            return (
                                <>
                                    <div style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>
                                        {trans.description}
                                    </div>
                                    <div>
                                        {trans.from} → {trans.to}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        Read: {trans.input} | Pop: {trans.pop} | Push: {trans.push.length ? trans.push.join('') : 'ε'}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div>
                <h4 style={{
                    color: 'var(--accent-acid)',
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    textTransform: 'uppercase'
                }}>
                    CFG → PDA CONVERSION
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    Standard algorithm converting Context-Free Grammar to Pushdown Automaton
                </p>
            </div>

            {/* CFG Display */}
            <div style={{
                background: 'black',
                border: '1px solid var(--border-color)',
                padding: '1rem'
            }}>
                <div style={{
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem'
                }}>
                    CONTEXT-FREE GRAMMAR: {grammar.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        G = (V, Σ, R, S) where:
                    </div>
                    <div style={{ paddingLeft: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <div>V = {'{' + grammar.variables.join(', ') + '}'} <span style={{ color: 'var(--text-muted)' }}>(variables)</span></div>
                        <div>Σ = {'{' + grammar.terminals.join(', ') + '}'} <span style={{ color: 'var(--text-muted)' }}>(terminals)</span></div>
                        <div>S = {grammar.startSymbol} <span style={{ color: 'var(--text-muted)' }}>(start symbol)</span></div>
                        <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>Production Rules R:</div>
                        {grammar.rules.map((rule, i) => (
                            <div key={i} style={{ paddingLeft: '1rem', color: 'var(--accent-acid)' }}>
                                {rule.variable} → {rule.production.join('')}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Algorithm Steps */}
            <div>
                <div style={{
                    color: 'var(--accent-punk)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem'
                }}>
                    CONVERSION ALGORITHM
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {steps.map((step: ConversionStep) => (
                        <div
                            key={step.stepNumber}
                            onClick={() => setActiveStep(activeStep === step.stepNumber ? null : step.stepNumber)}
                            style={{
                                background: activeStep === step.stepNumber ? 'rgba(204, 255, 0, 0.05)' : 'rgba(0,0,0,0.3)',
                                border: `1px solid ${activeStep === step.stepNumber ? 'var(--accent-acid)' : 'var(--border-color)'}`,
                                padding: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{
                                    background: activeStep === step.stepNumber ? 'var(--accent-acid)' : 'var(--text-muted)',
                                    color: 'black',
                                    padding: '0.2rem 0.5rem',
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)'
                                }}>
                                    {step.stepNumber}
                                </span>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.85rem' }}>
                                    {step.title}
                                </span>
                            </div>
                            {activeStep === step.stepNumber && (
                                <div style={{ marginTop: '0.75rem', paddingLeft: '2.5rem' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>
                                        {step.description}
                                    </p>
                                    {step.formula && (
                                        <div style={{
                                            background: 'black',
                                            padding: '0.5rem',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: '0.8rem',
                                            color: 'var(--accent-cyan)',
                                            marginBottom: '0.5rem'
                                        }}>
                                            {step.formula}
                                        </div>
                                    )}
                                    <pre style={{
                                        color: 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        margin: 0,
                                        fontFamily: 'var(--font-mono)',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {step.detail}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* PDA Visualization */}
            <div>
                <div style={{
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    marginBottom: '0.5rem'
                }}>
                    RESULTING PUSHDOWN AUTOMATON
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-color)',
                    padding: '1rem',
                    position: 'relative'
                }}>
                    <PDADiagram pda={pda} grammar={grammar} />
                </div>
            </div>
        </div>
    );
};

export default CFGToPDAViz;
