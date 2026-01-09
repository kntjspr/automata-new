import React, { useState, useMemo } from 'react';
import { parseRegexToNFA, type NFAGraph, type NFATransition } from '../utils/regexParser';

interface NFAToDFAVizProps {
    pattern: string;
}

// DFA State from subset construction
interface DFAState {
    id: number;
    nfaStates: Set<number>;
    label: string;
    isAccepting: boolean;
}

// DFA Transition
interface DFATransitionEntry {
    from: number;
    to: number;
    symbol: string;
}

// Conversion step for educational display
interface ConversionStep {
    stepNumber: number;
    description: string;
    formula?: string;
    result?: string;
}

/**
 * Compute epsilon closure of a set of NFA states
 */
const computeEpsilonClosure = (states: Set<number>, transitions: NFATransition[]): Set<number> => {
    const closure = new Set(states);
    const stack = [...states];

    while (stack.length > 0) {
        const state = stack.pop()!;
        transitions
            .filter(t => t.from === state && t.isEpsilon)
            .forEach(t => {
                if (!closure.has(t.to)) {
                    closure.add(t.to);
                    stack.push(t.to);
                }
            });
    }

    return closure;
};

/**
 * Compute move(states, symbol) - set of states reachable on symbol
 */
const computeMove = (states: Set<number>, symbol: string, transitions: NFATransition[]): Set<number> => {
    const result = new Set<number>();
    states.forEach(state => {
        transitions
            .filter(t => t.from === state && t.symbol === symbol && !t.isEpsilon)
            .forEach(t => result.add(t.to));
    });
    return result;
};

/**
 * Full subset construction algorithm
 */
const subsetConstruction = (nfa: NFAGraph): {
    dfaStates: DFAState[];
    dfaTransitions: DFATransitionEntry[];
    steps: ConversionStep[];
} => {
    const steps: ConversionStep[] = [];
    const dfaStates: DFAState[] = [];
    const dfaTransitions: DFATransitionEntry[] = [];
    const stateMap = new Map<string, number>(); // NFA state set -> DFA state id

    // Get unique input symbols (non-epsilon)
    const alphabet = [...new Set(
        nfa.transitions
            .filter(t => !t.isEpsilon)
            .map(t => t.symbol)
    )].sort();

    // Step 1: Compute initial state (ε-closure of start state)
    const initialClosure = computeEpsilonClosure(new Set([nfa.startState]), nfa.transitions);
    const initialKey = [...initialClosure].sort().join(',');

    dfaStates.push({
        id: 0,
        nfaStates: initialClosure,
        label: 'D0',
        isAccepting: [...initialClosure].some(s => nfa.acceptStates.includes(s))
    });
    stateMap.set(initialKey, 0);

    steps.push({
        stepNumber: 1,
        description: 'Compute initial DFA state',
        formula: `ε-closure({q${nfa.startState}})`,
        result: `D0 = {${[...initialClosure].map(s => `q${s}`).join(', ')}}`
    });

    // Process unmarked states
    let unmarkedIndex = 0;
    let stepNum = 2;

    while (unmarkedIndex < dfaStates.length) {
        const currentDFA = dfaStates[unmarkedIndex];

        for (const symbol of alphabet) {
            // Compute move and ε-closure
            const moveResult = computeMove(currentDFA.nfaStates, symbol, nfa.transitions);
            if (moveResult.size === 0) continue;

            const closureResult = computeEpsilonClosure(moveResult, nfa.transitions);
            const key = [...closureResult].sort().join(',');

            let targetId: number;

            if (stateMap.has(key)) {
                targetId = stateMap.get(key)!;
            } else {
                targetId = dfaStates.length;
                const isAccepting = [...closureResult].some(s => nfa.acceptStates.includes(s));

                dfaStates.push({
                    id: targetId,
                    nfaStates: closureResult,
                    label: `D${targetId}`,
                    isAccepting
                });
                stateMap.set(key, targetId);

                steps.push({
                    stepNumber: stepNum++,
                    description: `From ${currentDFA.label} on '${symbol}'`,
                    formula: `ε-closure(move(${currentDFA.label}, '${symbol}'))`,
                    result: `D${targetId} = {${[...closureResult].map(s => `q${s}`).join(', ')}}${isAccepting ? ' [ACCEPT]' : ''}`
                });
            }

            dfaTransitions.push({
                from: currentDFA.id,
                to: targetId,
                symbol
            });
        }

        unmarkedIndex++;
    }

    return { dfaStates, dfaTransitions, steps };
};

/**
 * NFA to DFA Conversion Visualization Component
 */
const NFAToDFAViz: React.FC<NFAToDFAVizProps> = ({ pattern }) => {
    const [showSteps, setShowSteps] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'nfa' | 'dfa' | 'table'>('overview');

    // Parse pattern and build NFA
    const nfa = useMemo(() => parseRegexToNFA(pattern), [pattern]);

    // Perform subset construction
    const { dfaStates, dfaTransitions, steps } = useMemo(() => {
        if (!nfa) return { dfaStates: [], dfaTransitions: [], steps: [] };
        return subsetConstruction(nfa);
    }, [nfa]);

    if (!nfa || nfa.states.length === 0) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
                border: '2px dashed var(--border-color)',
                background: 'rgba(0,0,0,0.3)'
            }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔄</div>
                <div>NFA → DFA CONVERSION</div>
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    Enter a regex pattern to see the conversion
                </div>
            </div>
        );
    }

    // Simple NFA visualization
    const NFADiagram = () => {
        const width = Math.max(400, nfa.states.length * 80);
        const height = 200;
        const stateRadius = 25;

        // Position states in a line
        const statePositions = nfa.states.map((_s, i) => ({
            x: 60 + i * 70,
            y: height / 2
        }));

        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minHeight: 150 }}>
                <defs>
                    <marker id="nfa-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-cyan)" />
                    </marker>
                </defs>

                {/* Transitions */}
                {nfa.transitions.map((t, i) => {
                    const from = statePositions[t.from];
                    const to = statePositions[t.to];
                    if (!from || !to) return null;

                    const isSelfLoop = t.from === t.to;

                    if (isSelfLoop) {
                        return (
                            <g key={i}>
                                <path
                                    d={`M ${from.x} ${from.y - stateRadius} A 20 20 0 1 1 ${from.x + 20} ${from.y - stateRadius}`}
                                    fill="none"
                                    stroke={t.isEpsilon ? 'var(--accent-punk)' : 'var(--accent-cyan)'}
                                    strokeWidth="1.5"
                                    markerEnd="url(#nfa-arrow)"
                                />
                                <text x={from.x + 10} y={from.y - 50} fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
                                    {t.symbol}
                                </text>
                            </g>
                        );
                    }

                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const ux = dx / len;
                    const uy = dy / len;

                    return (
                        <g key={i}>
                            <line
                                x1={from.x + ux * stateRadius}
                                y1={from.y + uy * stateRadius}
                                x2={to.x - ux * (stateRadius + 5)}
                                y2={to.y - uy * (stateRadius + 5)}
                                stroke={t.isEpsilon ? 'var(--accent-punk)' : 'var(--accent-cyan)'}
                                strokeWidth="1.5"
                                markerEnd="url(#nfa-arrow)"
                            />
                            <text
                                x={(from.x + to.x) / 2}
                                y={(from.y + to.y) / 2 - 10}
                                fill={t.isEpsilon ? 'var(--accent-punk)' : 'var(--text-secondary)'}
                                fontSize="10"
                                textAnchor="middle"
                            >
                                {t.symbol}
                            </text>
                        </g>
                    );
                })}

                {/* States */}
                {nfa.states.map((state) => {
                    const pos = statePositions[state.id];
                    if (!pos) return null;

                    return (
                        <g key={state.id}>
                            {state.isStart && (
                                <line x1={pos.x - 45} y1={pos.y} x2={pos.x - stateRadius - 2} y2={pos.y}
                                    stroke="var(--accent-acid)" strokeWidth="2" markerEnd="url(#nfa-arrow)" />
                            )}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={stateRadius}
                                fill={state.isAccept ? 'rgba(204,255,0,0.2)' : 'rgba(0,0,0,0.5)'}
                                stroke={state.isAccept ? 'var(--accent-acid)' : 'var(--accent-cyan)'}
                                strokeWidth="2"
                            />
                            {state.isAccept && (
                                <circle cx={pos.x} cy={pos.y} r={stateRadius - 5}
                                    fill="none" stroke="var(--accent-acid)" strokeWidth="1.5" />
                            )}
                            <text x={pos.x} y={pos.y + 4} fill="white" fontSize="12" textAnchor="middle">
                                q{state.id}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    // DFA visualization
    const DFADiagram = () => {
        const width = Math.max(400, dfaStates.length * 90);
        const height = 200;
        const stateRadius = 28;

        const statePositions = dfaStates.map((_s, i) => ({
            x: 70 + i * 85,
            y: height / 2
        }));

        return (
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', minHeight: 150 }}>
                <defs>
                    <marker id="dfa-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-acid)" />
                    </marker>
                </defs>

                {/* Transitions */}
                {dfaTransitions.map((t, i) => {
                    const from = statePositions[t.from];
                    const to = statePositions[t.to];
                    if (!from || !to) return null;

                    if (t.from === t.to) {
                        return (
                            <g key={i}>
                                <path
                                    d={`M ${from.x} ${from.y - stateRadius} A 22 22 0 1 1 ${from.x + 22} ${from.y - stateRadius}`}
                                    fill="none" stroke="var(--accent-acid)" strokeWidth="2"
                                    markerEnd="url(#dfa-arrow)"
                                />
                                <text x={from.x + 11} y={from.y - 55} fill="var(--accent-acid)" fontSize="11" textAnchor="middle" fontWeight="bold">
                                    {t.symbol}
                                </text>
                            </g>
                        );
                    }

                    const dx = to.x - from.x;
                    const dy = to.y - from.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const ux = dx / len;
                    const uy = dy / len;

                    return (
                        <g key={i}>
                            <line
                                x1={from.x + ux * stateRadius}
                                y1={from.y + uy * stateRadius}
                                x2={to.x - ux * (stateRadius + 5)}
                                y2={to.y - uy * (stateRadius + 5)}
                                stroke="var(--accent-acid)" strokeWidth="2"
                                markerEnd="url(#dfa-arrow)"
                            />
                            <text
                                x={(from.x + to.x) / 2}
                                y={(from.y + to.y) / 2 - 12}
                                fill="var(--accent-acid)" fontSize="11" textAnchor="middle" fontWeight="bold"
                            >
                                {t.symbol}
                            </text>
                        </g>
                    );
                })}

                {/* States */}
                {dfaStates.map((state) => {
                    const pos = statePositions[state.id];
                    if (!pos) return null;

                    return (
                        <g key={state.id}>
                            {state.id === 0 && (
                                <line x1={pos.x - 50} y1={pos.y} x2={pos.x - stateRadius - 2} y2={pos.y}
                                    stroke="var(--accent-acid)" strokeWidth="2" markerEnd="url(#dfa-arrow)" />
                            )}
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={stateRadius}
                                fill={state.isAccepting ? 'rgba(204,255,0,0.3)' : 'rgba(0,0,0,0.5)'}
                                stroke={state.isAccepting ? 'var(--accent-acid)' : 'var(--text-muted)'}
                                strokeWidth="3"
                            />
                            {state.isAccepting && (
                                <circle cx={pos.x} cy={pos.y} r={stateRadius - 5}
                                    fill="none" stroke="var(--accent-acid)" strokeWidth="2" />
                            )}
                            <text x={pos.x} y={pos.y + 5} fill="white" fontSize="13" textAnchor="middle" fontWeight="bold">
                                {state.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };

    // Get alphabet for table
    const alphabet = [...new Set(
        nfa.transitions.filter(t => !t.isEpsilon).map(t => t.symbol)
    )].sort();

    return (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'linear-gradient(90deg, rgba(0,255,255,0.1), rgba(204,255,0,0.1))',
                border: '1px solid var(--border-color)'
            }}>
                <div>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>NFA → DFA CONVERSION</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '1rem', fontSize: '0.75rem' }}>
                        Subset Construction Algorithm
                    </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    NFA: {nfa.states.length} states → DFA: {dfaStates.length} states
                </div>
            </div>

            {/* Tab buttons */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1rem', borderBottom: '2px solid var(--border-color)' }}>
                {[
                    { id: 'overview' as const, label: 'OVERVIEW' },
                    { id: 'nfa' as const, label: 'NFA' },
                    { id: 'dfa' as const, label: 'DFA' },
                    { id: 'table' as const, label: 'TRANSITION TABLE' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '0.5rem 1rem',
                            background: activeTab === tab.id ? 'var(--accent-cyan)' : 'transparent',
                            border: 'none',
                            color: activeTab === tab.id ? 'black' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
                <div>
                    {/* Algorithm explanation toggle */}
                    <button
                        onClick={() => setShowSteps(!showSteps)}
                        style={{
                            width: '100%',
                            padding: '0.5rem 1rem',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1rem'
                        }}
                    >
                        <span style={{ transform: showSteps ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▶</span>
                        {showSteps ? 'HIDE' : 'SHOW'} ALGORITHM STEPS ({steps.length} steps)
                    </button>

                    {showSteps && (
                        <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            marginBottom: '1rem',
                            border: '1px solid var(--border-color)',
                            background: 'rgba(0,0,0,0.4)'
                        }}>
                            {steps.map(step => (
                                <div key={step.stepNumber} style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
                                        <span style={{
                                            color: 'var(--accent-cyan)',
                                            fontWeight: 'bold',
                                            minWidth: '60px'
                                        }}>
                                            Step {step.stepNumber}
                                        </span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{step.description}</span>
                                    </div>
                                    {step.formula && (
                                        <div style={{ marginTop: '0.25rem', paddingLeft: '76px', color: 'var(--accent-punk)', fontSize: '0.8rem' }}>
                                            {step.formula}
                                        </div>
                                    )}
                                    {step.result && (
                                        <div style={{ marginTop: '0.25rem', paddingLeft: '76px', color: 'var(--accent-acid)', fontWeight: 'bold' }}>
                                            → {step.result}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Side by side preview */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ border: '1px solid var(--accent-cyan)', padding: '0.5rem' }}>
                            <div style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                                NFA ({nfa.states.length} states)
                            </div>
                            <NFADiagram />
                        </div>
                        <div style={{ border: '1px solid var(--accent-acid)', padding: '0.5rem' }}>
                            <div style={{ color: 'var(--accent-acid)', fontSize: '0.75rem', marginBottom: '0.5rem', textAlign: 'center' }}>
                                DFA ({dfaStates.length} states)
                            </div>
                            <DFADiagram />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'nfa' && (
                <div style={{ border: '1px solid var(--accent-cyan)', padding: '1rem' }}>
                    <div style={{ color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
                        NFA STATES: {nfa.states.length} | TRANSITIONS: {nfa.transitions.length}
                    </div>
                    <NFADiagram />
                    <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--accent-punk)' }}>ε</span> = epsilon transition (no input consumed)
                    </div>
                </div>
            )}

            {activeTab === 'dfa' && (
                <div style={{ border: '1px solid var(--accent-acid)', padding: '1rem' }}>
                    <div style={{ color: 'var(--accent-acid)', marginBottom: '0.5rem' }}>
                        DFA STATES: {dfaStates.length} | TRANSITIONS: {dfaTransitions.length}
                    </div>
                    <DFADiagram />
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                            STATE COMPOSITION:
                        </div>
                        {dfaStates.map(s => (
                            <div key={s.id} style={{
                                padding: '0.25rem 0.5rem',
                                background: s.isAccepting ? 'rgba(204,255,0,0.1)' : 'transparent',
                                marginBottom: '2px'
                            }}>
                                <span style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>{s.label}</span>
                                <span style={{ color: 'var(--text-muted)' }}> = </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    {'{' + [...s.nfaStates].map(n => `q${n}`).join(', ') + '}'}
                                </span>
                                {s.isAccepting && <span style={{ color: 'var(--accent-acid)', marginLeft: '0.5rem' }}>[ACCEPT]</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'table' && (
                <div>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <thead>
                            <tr style={{ background: 'rgba(0,0,0,0.5)' }}>
                                <th style={{ padding: '0.5rem', textAlign: 'left', color: 'var(--accent-acid)', borderBottom: '2px solid var(--border-color)' }}>
                                    State
                                </th>
                                {alphabet.map(sym => (
                                    <th key={sym} style={{ padding: '0.5rem', textAlign: 'center', color: 'var(--accent-cyan)', borderBottom: '2px solid var(--border-color)' }}>
                                        δ(·, {sym})
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dfaStates.map(state => (
                                <tr key={state.id} style={{ background: state.isAccepting ? 'rgba(204,255,0,0.1)' : 'transparent' }}>
                                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ color: 'var(--accent-acid)', fontWeight: 'bold' }}>{state.label}</span>
                                        {state.isAccepting && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--accent-acid)' }}>✓</span>}
                                    </td>
                                    {alphabet.map(sym => {
                                        const trans = dfaTransitions.find(t => t.from === state.id && t.symbol === sym);
                                        return (
                                            <td key={sym} style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                                {trans ? dfaStates[trans.to]?.label || '-' : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default NFAToDFAViz;
